(() => {
  'use strict';

  const STORAGE_KEY = 'teacherboard.v1';
  const HEIGHTS_KEY = 'teacherboard.pageHeights.v1';
  const nativeSetItem = Storage.prototype.setItem;

  function parse(value, fallback = null) {
    try { return JSON.parse(value); }
    catch { return fallback; }
  }

  function pageObjectsByName(pages = []) {
    const map = new Map();
    pages.forEach(page => {
      if (page?.name && Array.isArray(page.objects)) map.set(page.name, page.objects);
    });
    return map;
  }

  function mergeObjects(previous, next) {
    if (!next || !Array.isArray(next.pages)) return next;
    const previousPages = Array.isArray(previous?.pages) ? previous.pages : [];
    const byName = pageObjectsByName(previousPages);

    next.pages = next.pages.map((page, index) => {
      if (Array.isArray(page.objects)) return page;

      const sameIndex = previousPages[index];
      if (sameIndex?.name === page.name && Array.isArray(sameIndex.objects)) {
        return { ...page, objects: sameIndex.objects };
      }

      if (page?.name && byName.has(page.name)) {
        return { ...page, objects: byName.get(page.name) };
      }

      if (String(page?.name || '').endsWith(' — копія')) {
        const sourceName = String(page.name).slice(0, -' — копія'.length);
        if (byName.has(sourceName)) {
          return { ...page, objects: structuredCloneSafe(byName.get(sourceName)) };
        }
      }

      return { ...page, objects: [] };
    });
    return next;
  }

  function structuredCloneSafe(value) {
    if (typeof globalThis.structuredClone === 'function') return globalThis.structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  async function mirror(raw) {
    try {
      const storage = globalThis.TeacherBoardStorage;
      const core = globalThis.TeacherBoardCore;
      if (!storage?.saveDocument || !core?.normalizeDocument) return;
      const heights = parse(localStorage.getItem(HEIGHTS_KEY) || '[]', []);
      await storage.saveDocument(core.normalizeDocument(raw, Array.isArray(heights) ? heights : []));
    } catch (error) {
      console.warn('[TeacherBoard] Compatibility mirror failed.', error);
    }
  }

  Storage.prototype.setItem = function patchedSetItem(key, value) {
    if (this !== localStorage || key !== STORAGE_KEY) {
      return nativeSetItem.call(this, key, value);
    }

    const previous = parse(localStorage.getItem(STORAGE_KEY) || 'null', null);
    const incoming = parse(String(value), null);
    if (!incoming) return nativeSetItem.call(this, key, value);

    const merged = mergeObjects(previous, incoming);
    const serialized = JSON.stringify(merged);
    const result = nativeSetItem.call(this, key, serialized);
    window.dispatchEvent(new CustomEvent('teacherboard:storage-updated', { detail: merged }));
    queueMicrotask(() => mirror(merged));
    return result;
  };

  globalThis.TeacherBoardCompat = {
    mergeObjects,
    restoreNativeStorageSetItem() {
      Storage.prototype.setItem = nativeSetItem;
    }
  };
})();
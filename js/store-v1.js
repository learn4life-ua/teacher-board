(() => {
  'use strict';

  const DOCUMENT_KEY = 'teacherboard.v1';
  const HEIGHTS_KEY = 'teacherboard.pageHeights.v1';
  const HYDRATED_KEY = 'teacherboard.store.hydrated.v1';
  const nativeSetItem = Storage.prototype.setItem;
  const nativeRemoveItem = Storage.prototype.removeItem;
  let suppressMirror = false;

  function parse(value, fallback = null) {
    try { return JSON.parse(value); }
    catch { return fallback; }
  }

  function clone(value) {
    if (typeof globalThis.structuredClone === 'function') return globalThis.structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function readCache() {
    return parse(localStorage.getItem(DOCUMENT_KEY) || 'null', null);
  }

  function readHeights() {
    const value = parse(localStorage.getItem(HEIGHTS_KEY) || '[]', []);
    return Array.isArray(value) ? value : [];
  }

  function writeCache(documentState) {
    suppressMirror = true;
    try {
      nativeSetItem.call(localStorage, DOCUMENT_KEY, JSON.stringify(documentState));
    } finally {
      suppressMirror = false;
    }
  }

  function writeHeightsCache(heights) {
    suppressMirror = true;
    try {
      nativeSetItem.call(localStorage, HEIGHTS_KEY, JSON.stringify(Array.isArray(heights) ? heights : []));
    } finally {
      suppressMirror = false;
    }
  }

  async function persistDocument(raw) {
    const storage = globalThis.TeacherBoardStorage;
    const core = globalThis.TeacherBoardCore;
    if (!storage?.saveDocument || !core?.normalizeDocument) return raw;
    const normalized = core.normalizeDocument(raw || core.createBlankDocument(), readHeights());
    await storage.saveDocument(normalized);
    return normalized;
  }

  let writeQueue = Promise.resolve();
  function enqueuePersist(raw) {
    const snapshot = clone(raw);
    writeQueue = writeQueue
      .catch(() => {})
      .then(() => persistDocument(snapshot))
      .catch(error => console.warn('[TeacherBoard] IndexedDB save failed; local cache retained.', error));
    return writeQueue;
  }

  function publish(raw, source = 'cache') {
    window.dispatchEvent(new CustomEvent('teacherboard:storage-updated', {
      detail: { document: raw, source }
    }));
  }

  function setDocument(raw, { source = 'store' } = {}) {
    if (!raw || typeof raw !== 'object') return;
    writeCache(raw);
    enqueuePersist(raw);
    publish(raw, source);
    document.getElementById('autosaveState')?.replaceChildren(document.createTextNode('Збережено'));
  }

  function setHeights(heights) {
    writeHeightsCache(heights);
    const current = readCache();
    if (current) enqueuePersist(current);
    window.dispatchEvent(new CustomEvent('teacherboard:heights-updated', { detail: readHeights() }));
  }

  async function hydrateFromIndexedDb() {
    const storage = globalThis.TeacherBoardStorage;
    if (!storage?.loadDocument) return { source: 'cache', document: readCache() };

    try {
      const stored = await storage.loadDocument();
      if (!stored) return { source: 'cache', document: readCache() };

      const cached = readCache();
      const storedJson = JSON.stringify(stored);
      const cachedNormalized = cached && globalThis.TeacherBoardCore?.normalizeDocument
        ? globalThis.TeacherBoardCore.normalizeDocument(cached, readHeights())
        : cached;
      const cachedJson = cachedNormalized ? JSON.stringify(cachedNormalized) : '';

      // loadDocument may have returned migrated legacy data when IndexedDB was empty.
      // Persist it explicitly so IndexedDB becomes the durable source immediately.
      const persisted = await persistDocument(stored);
      writeCache(persisted || stored);
      nativeSetItem.call(sessionStorage, HYDRATED_KEY, '1');
      publish(persisted || stored, 'indexeddb');

      return {
        source: 'indexeddb',
        document: persisted || stored,
        changed: storedJson !== cachedJson
      };
    } catch (error) {
      console.warn('[TeacherBoard] IndexedDB hydration failed; using local cache.', error);
      return { source: 'cache', document: readCache(), error };
    }
  }

  const ready = hydrateFromIndexedDb();

  Storage.prototype.setItem = function teacherBoardStoreSetItem(key, value) {
    if (suppressMirror || this !== localStorage || (key !== DOCUMENT_KEY && key !== HEIGHTS_KEY)) {
      return nativeSetItem.call(this, key, value);
    }

    const result = nativeSetItem.call(this, key, value);
    if (key === DOCUMENT_KEY) {
      const parsed = parse(String(value), null);
      if (parsed) {
        enqueuePersist(parsed);
        publish(parsed, 'local-cache-write-through');
      }
    } else {
      const current = readCache();
      if (current) enqueuePersist(current);
      window.dispatchEvent(new CustomEvent('teacherboard:heights-updated', { detail: readHeights() }));
    }
    return result;
  };

  globalThis.TeacherBoardStore = {
    ready,
    getDocument: readCache,
    setDocument,
    getHeights: readHeights,
    setHeights,
    flush: () => writeQueue,
    constants: { DOCUMENT_KEY, HEIGHTS_KEY },
    restoreNativeStorage() {
      Storage.prototype.setItem = nativeSetItem;
      Storage.prototype.removeItem = nativeRemoveItem;
    }
  };
})();
const STORAGE_KEY = 'teacherboard.v2';
const LEGACY_KEY = 'teacherboard.v1';
const MIGRATION_FLAG = 'teacherboard.v2.migratedFromV1';

function id(prefix = 'm') {
  return crypto.randomUUID?.() || `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeObject(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const copy = { ...obj };
  copy.id ||= id(copy.kind || 'o');
  copy.x = Number(copy.x) || 0;
  copy.y = Number(copy.y) || 0;
  copy.w = Math.max(20, Number(copy.w) || 160);
  copy.h = Math.max(20, Number(copy.h) || 100);
  copy.rotation = Number(copy.rotation) || 0;
  return copy;
}

function migrateLegacyPage(page, index) {
  const objects = [];

  if (Array.isArray(page?.objects)) {
    page.objects.map(normalizeObject).filter(Boolean).forEach(o => objects.push(o));
  }

  if (typeof page?.image === 'string' && page.image.startsWith('data:image/')) {
    objects.unshift({
      id: id('legacyRaster'), kind: 'image', src: page.image,
      name: 'Імпорт зі старої дошки', x: 0, y: 0, w: 1600, h: 900,
      rotation: 0, legacyRaster: true, locked: true
    });
  }

  if (Array.isArray(page?.texts)) {
    page.texts.forEach(t => {
      if (!t || !String(t.text ?? '').trim()) return;
      objects.push({
        id: id('text'), kind: 'text', text: String(t.text),
        x: Number(t.x) || 220, y: Number(t.y) || 150,
        w: 420, h: 100, rotation: 0,
        color: t.color || '#245d55', fontSize: 32
      });
    });
  }

  return {
    id: page?.id || id('page'),
    name: page?.name || `Сторінка ${index + 1}`,
    background: page?.background || 'clean',
    strokes: Array.isArray(page?.strokes) ? page.strokes : [],
    objects,
    instruments: Array.isArray(page?.instruments) ? page.instruments : []
  };
}

function serializedState(state) {
  return JSON.stringify({
    tool: state.tool,
    color: state.color,
    lineWidth: state.lineWidth,
    zoom: state.zoom,
    activePage: state.activePage,
    pages: state.pages
  });
}

function migrationStorageError(error) {
  try {
    window.dispatchEvent(new CustomEvent('teacherboard:storage-error', { detail: { error, migration: true } }));
  } catch {}
}

function migrateLegacy(fallback) {
  if (localStorage.getItem(MIGRATION_FLAG) === '1') return null;
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return null;

  try {
    const legacy = JSON.parse(raw);
    if (!Array.isArray(legacy.pages) || !legacy.pages.length) return null;

    const migrated = {
      ...fallback,
      tool: 'select',
      zoom: 1,
      activePage: Math.max(0, Math.min(Number(legacy.activePage) || 0, legacy.pages.length - 1)),
      pages: legacy.pages.map(migrateLegacyPage),
      gesture: null,
      selection: null,
      history: { undo: [], redo: [] }
    };

    const nextRaw = serializedState(migrated);

    // Large v1 boards contain PNG snapshots. Avoid temporarily storing both copies,
    // but restore v1 immediately if writing v2 fails for any reason.
    localStorage.removeItem(LEGACY_KEY);
    try {
      localStorage.setItem(STORAGE_KEY, nextRaw);
      localStorage.setItem(MIGRATION_FLAG, '1');
    } catch (error) {
      localStorage.removeItem(STORAGE_KEY);
      try { localStorage.setItem(LEGACY_KEY, raw); } catch {}
      migrationStorageError(error);
      throw error;
    }

    return migrated;
  } catch {
    return null;
  }
}

export function loadState(fallback) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data.pages) && data.pages.length) {
        return { ...fallback, ...data, gesture: null, selection: null, history: { undo: [], redo: [] } };
      }
    }
  } catch {}

  return migrateLegacy(fallback) || fallback;
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, serializedState(state));
    return true;
  } catch (error) {
    try {
      window.dispatchEvent(new CustomEvent('teacherboard:storage-error', { detail: { error, migration: false } }));
    } catch {}
    return false;
  }
}

export function clearSavedState() {
  localStorage.removeItem(STORAGE_KEY);
}

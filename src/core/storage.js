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

  // Newer legacy patches already stored object-like shapes/images in page.objects.
  if (Array.isArray(page?.objects)) {
    page.objects.map(normalizeObject).filter(Boolean).forEach(o => objects.push(o));
  }

  // Original app stored all pen/shape canvas content as one PNG snapshot.
  // Preserve it as a locked-looking image object so no lesson content is lost.
  if (typeof page?.image === 'string' && page.image.startsWith('data:image/')) {
    objects.unshift({
      id: id('legacyRaster'), kind: 'image', src: page.image,
      name: 'Імпорт зі старої дошки', x: 0, y: 0, w: 1600, h: 900,
      rotation: 0, legacyRaster: true
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

function migrateLegacy(fallback) {
  if (localStorage.getItem(MIGRATION_FLAG) === '1') return null;
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
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

    localStorage.setItem(MIGRATION_FLAG, '1');
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      tool: migrated.tool,
      color: migrated.color,
      lineWidth: migrated.lineWidth,
      zoom: migrated.zoom,
      activePage: migrated.activePage,
      pages: migrated.pages
    }));
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
  const clean = {
    tool: state.tool,
    color: state.color,
    lineWidth: state.lineWidth,
    zoom: state.zoom,
    activePage: state.activePage,
    pages: state.pages
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
}

export function clearSavedState() {
  localStorage.removeItem(STORAGE_KEY);
}

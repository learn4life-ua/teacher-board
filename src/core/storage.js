const STORAGE_KEY = 'teacherboard.v2';

export function loadState(fallback) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const data = JSON.parse(raw);
    if (!Array.isArray(data.pages) || !data.pages.length) return fallback;
    return { ...fallback, ...data, gesture: null, selection: null, history: { undo: [], redo: [] } };
  } catch {
    return fallback;
  }
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

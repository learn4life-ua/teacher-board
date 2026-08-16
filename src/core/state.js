export const createState = () => ({
  tool: 'select',
  color: '#245d55',
  lineWidth: 4,
  zoom: 1,
  activePage: 0,
  pages: [createBlankPage('Сторінка 1')],
  selection: null,
  gesture: null,
  history: { undo: [], redo: [] }
});

export function createBlankPage(name = 'Нова сторінка') {
  return {
    id: crypto.randomUUID?.() || `p_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    name,
    background: 'clean',
    strokes: [],
    objects: [],
    instruments: []
  };
}

export function activePage(state) {
  const page = state.pages[state.activePage];
  if (page && !Array.isArray(page.strokes)) page.strokes = [];
  if (page && !Array.isArray(page.objects)) page.objects = [];
  if (page && !Array.isArray(page.instruments)) page.instruments = [];
  return page;
}

export function uid(prefix = 'o') {
  return crypto.randomUUID?.() || `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

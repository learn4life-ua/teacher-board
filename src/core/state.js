export const DEFAULT_PAGE_WIDTH = 1600;
export const DEFAULT_PAGE_HEIGHT = 900;
export const MOBILE_PAGE_HEIGHT = 1800;

const isPhoneViewport = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(max-width:560px)')?.matches);

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

export function createBlankPage(name = 'Нова сторінка', options = {}) {
  return {
    id: crypto.randomUUID?.() || `p_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    name,
    width: Number(options.width) || DEFAULT_PAGE_WIDTH,
    height: Number(options.height) || (isPhoneViewport() ? MOBILE_PAGE_HEIGHT : DEFAULT_PAGE_HEIGHT),
    background: 'clean',
    strokes: [],
    objects: [],
    instruments: []
  };
}

export function activePage(state) {
  const page = state.pages[state.activePage];
  if (page && !Number.isFinite(Number(page.width))) page.width = DEFAULT_PAGE_WIDTH;
  if (page && !Number.isFinite(Number(page.height))) page.height = DEFAULT_PAGE_HEIGHT;
  if (page && isPhoneViewport() && Number(page.height) < MOBILE_PAGE_HEIGHT) page.height = MOBILE_PAGE_HEIGHT;
  if (page && !Array.isArray(page.strokes)) page.strokes = [];
  if (page && !Array.isArray(page.objects)) page.objects = [];
  if (page && !Array.isArray(page.instruments)) page.instruments = [];
  return page;
}

export function uid(prefix = 'o') {
  return crypto.randomUUID?.() || `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

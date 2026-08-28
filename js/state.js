(() => {
  'use strict';

  const BOARD_WIDTH = 1600;
  const DEFAULT_PAGE_HEIGHT = 900;
  const DEFAULT_BACKGROUND = 'clean';

  function uid(prefix = 'id') {
    if (globalThis.crypto?.randomUUID) return `${prefix}_${globalThis.crypto.randomUUID()}`;
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function clampNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function normalizeBackground(value) {
    return ['clean', 'grid', 'lines', 'coords'].includes(value) ? value : DEFAULT_BACKGROUND;
  }

  function normalizeTextObject(item = {}) {
    return {
      id: item.id || uid('text'),
      type: 'text',
      x: clampNumber(item.x, 220),
      y: clampNumber(item.y, 150),
      width: clampNumber(item.width ?? item.w, 520),
      height: clampNumber(item.height ?? item.h, 90),
      text: String(item.text ?? ''),
      color: item.color || '#245d55',
      fontSize: clampNumber(item.fontSize, 28)
    };
  }

  function normalizeShapeObject(item = {}) {
    return {
      id: item.id || uid('shape'),
      type: 'shape',
      shape: item.shape || 'rect',
      x: clampNumber(item.x, 0),
      y: clampNumber(item.y, 0),
      width: clampNumber(item.width ?? item.w, 120),
      height: clampNumber(item.height ?? item.h, 90),
      color: item.color || '#245d55',
      lineWidth: clampNumber(item.lineWidth, 4)
    };
  }

  function normalizeImageObject(item = {}) {
    return {
      id: item.id || uid('image'),
      type: 'image',
      x: clampNumber(item.x, 0),
      y: clampNumber(item.y, 0),
      width: clampNumber(item.width ?? item.w, 480),
      height: clampNumber(item.height ?? item.h, 320),
      src: String(item.src ?? ''),
      alt: String(item.alt ?? 'Вставлене зображення')
    };
  }

  function normalizeCurtainObject(item = {}) {
    return {
      id: item.id || uid('curtain'),
      type: 'curtain',
      x: clampNumber(item.x, 0),
      y: clampNumber(item.y, 0),
      width: clampNumber(item.width ?? item.w, 420),
      height: clampNumber(item.height ?? item.h, 180),
      fill: item.fill || '#dfe8e3',
      opacity: Math.max(0, Math.min(1, clampNumber(item.opacity, 0.98)))
    };
  }

  function normalizeObject(item = {}) {
    const rawType = item.type || item.kind;
    if (rawType === 'text') return normalizeTextObject(item);
    if (rawType === 'image') return normalizeImageObject(item);
    if (rawType === 'curtain') return normalizeCurtainObject(item);
    return normalizeShapeObject(item);
  }

  function migrateLegacyTexts(texts = []) {
    return Array.isArray(texts) ? texts.map(normalizeTextObject) : [];
  }

  function migrateLegacyObjects(objects = []) {
    return Array.isArray(objects) ? objects.map(normalizeObject) : [];
  }

  function normalizePage(page = {}, index = 0, pageHeight = DEFAULT_PAGE_HEIGHT) {
    const legacyTexts = migrateLegacyTexts(page.texts);
    const legacyObjects = migrateLegacyObjects(page.objects);
    const normalizedObjects = Array.isArray(page.items)
      ? page.items.map(normalizeObject)
      : [...legacyObjects, ...legacyTexts];

    return {
      id: page.id || uid('page'),
      name: String(page.name || `Сторінка ${index + 1}`),
      width: BOARD_WIDTH,
      height: Math.max(DEFAULT_PAGE_HEIGHT, clampNumber(page.height ?? pageHeight, DEFAULT_PAGE_HEIGHT)),
      background: normalizeBackground(page.background),
      raster: {
        image: page.raster?.image ?? page.image ?? null
      },
      items: normalizedObjects
    };
  }

  function normalizeDocument(raw = {}, legacyHeights = []) {
    const sourcePages = Array.isArray(raw.pages) && raw.pages.length ? raw.pages : [{}];
    const pages = sourcePages.map((page, index) => normalizePage(page, index, legacyHeights[index]));
    const activePage = Math.max(0, Math.min(clampNumber(raw.activePage, 0), pages.length - 1));

    return {
      schemaVersion: 1,
      documentId: raw.documentId || uid('lesson'),
      activePage,
      pages,
      updatedAt: new Date().toISOString()
    };
  }

  function createBlankDocument() {
    return normalizeDocument({ pages: [{ name: 'Сторінка 1' }], activePage: 0 });
  }

  function getActivePage(documentState) {
    return documentState?.pages?.[documentState.activePage] || null;
  }

  function cloneDocument(documentState) {
    return typeof globalThis.structuredClone === 'function'
      ? globalThis.structuredClone(documentState)
      : JSON.parse(JSON.stringify(documentState));
  }

  globalThis.TeacherBoardCore = Object.assign(globalThis.TeacherBoardCore || {}, {
    BOARD_WIDTH,
    DEFAULT_PAGE_HEIGHT,
    createBlankDocument,
    normalizeDocument,
    normalizePage,
    normalizeObject,
    getActivePage,
    cloneDocument,
    uid
  });
})();
(() => {
  'use strict';

  const STORAGE_KEY = 'teacherboard.v1';
  const HEIGHTS_KEY = 'teacherboard.pageHeights.v1';
  const canvas = document.getElementById('boardCanvas');
  const textLayer = document.getElementById('textLayer');
  const autosaveState = document.getElementById('autosaveState');

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function readData() {
    const data = readJson(STORAGE_KEY, {});
    if (!Array.isArray(data.pages) || !data.pages.length) {
      data.pages = [{ name: 'Сторінка 1', background: 'clean', image: null, texts: [], objects: [] }];
      data.activePage = 0;
    }
    return data;
  }

  function activeIndex(data) {
    return Math.max(0, Math.min(Number(data.activePage) || 0, data.pages.length - 1));
  }

  function writeData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (autosaveState) autosaveState.textContent = 'Збережено';
  }

  function writeHeights(heights) {
    localStorage.setItem(HEIGHTS_KEY, JSON.stringify(heights));
  }

  function blankPage(index) {
    return {
      name: `Сторінка ${index + 1}`,
      background: 'clean',
      image: null,
      texts: [],
      objects: []
    };
  }

  function clearVisibleBoard() {
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
    if (textLayer) textLayer.innerHTML = '';
    document.getElementById('objectLayer')?.replaceChildren();
  }

  function clearCurrentPage(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!confirm('Очистити поточну сторінку повністю?')) return;

    const data = readData();
    const index = activeIndex(data);
    const page = data.pages[index];
    page.image = null;
    page.texts = [];
    page.objects = [];
    writeData(data);
    clearVisibleBoard();
    document.body.classList.remove('tb-has-selection');
    window.dispatchEvent(new CustomEvent('teacherboard:page-cleared', { detail: { index } }));
  }

  function addPage(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const data = readData();
    data.pages.push(blankPage(data.pages.length));
    data.activePage = data.pages.length - 1;
    const heights = readJson(HEIGHTS_KEY, []);
    heights.push(900);
    writeHeights(heights);
    writeData(data);
    location.reload();
  }

  function duplicateCurrentPage(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const data = readData();
    const index = activeIndex(data);
    const source = data.pages[index];
    const clone = typeof structuredClone === 'function'
      ? structuredClone(source)
      : JSON.parse(JSON.stringify(source));
    clone.name = `${source.name || `Сторінка ${index + 1}`} - копія`;
    data.pages.splice(index + 1, 0, clone);
    data.activePage = index + 1;

    const heights = readJson(HEIGHTS_KEY, []);
    heights.splice(index + 1, 0, heights[index] || canvas?.height || 900);
    writeHeights(heights);
    writeData(data);
    location.reload();
  }

  function bind() {
    document.getElementById('clearBtn')?.addEventListener('click', clearCurrentPage, true);
    document.getElementById('addPageBtn')?.addEventListener('click', addPage, true);
    document.getElementById('duplicatePageBtn')?.addEventListener('click', duplicateCurrentPage, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
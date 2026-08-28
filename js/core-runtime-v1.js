(() => {
  'use strict';

  const STORAGE_KEY = 'teacherboard.v1';
  const HEIGHTS_KEY = 'teacherboard.pageHeights.v1';
  const canvas = document.getElementById('boardCanvas');
  const ctx = canvas?.getContext('2d');
  const board = document.getElementById('board');
  const boardWrap = document.getElementById('boardWrap');
  const pagesEl = document.getElementById('pages');
  const autosaveState = document.getElementById('autosaveState');
  const workspace = document.querySelector('.workspace');
  const colorPicker = document.getElementById('colorPicker');
  const lineWidthSelect = document.getElementById('lineWidth');
  const laserDot = document.getElementById('laserDot');

  if (!canvas || !ctx || !board || !pagesEl) return;

  const state = {
    tool: 'pen', color: colorPicker?.value || '#245d55', lineWidth: Number(lineWidthSelect?.value) || 4,
    zoom: 1, drawing: false, last: null, autosaveTimer: null
  };

  function readData() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (Array.isArray(value.pages) && value.pages.length) return value;
    } catch {}
    return { pages: [{ name: 'Сторінка 1', background: 'clean', image: null, texts: [], objects: [] }], activePage: 0 };
  }

  function writeData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('teacherboard:storage-updated', { detail: data }));
    mirrorIndexedDb(data);
  }

  async function mirrorIndexedDb(data) {
    try {
      const storage = globalThis.TeacherBoardStorage;
      const core = globalThis.TeacherBoardCore;
      if (!storage?.saveDocument || !core?.normalizeDocument) return;
      await storage.saveDocument(core.normalizeDocument(data, readHeights()));
    } catch (error) {
      console.warn('[TeacherBoard] IndexedDB mirror failed.', error);
    }
  }

  function readHeights() {
    try {
      const value = JSON.parse(localStorage.getItem(HEIGHTS_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  }

  function activeIndex(data = readData()) {
    return Math.max(0, Math.min(Number(data.activePage) || 0, data.pages.length - 1));
  }

  function pageHeight(index = activeIndex()) {
    return readHeights()[index] || 900;
  }

  function resizeCanvasHeight(height) {
    if (canvas.height === height) return;
    canvas.height = height;
    canvas.style.height = '100%';
    board.style.height = `${height / 1600 * 100}vw`;
    board.style.maxHeight = 'none';
    board.style.minHeight = `${Math.min(height, 900)}px`;
  }

  function syncHeight() {
    resizeCanvasHeight(pageHeight());
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[ch]));
  }

  function renderPages() {
    const data = readData();
    const active = activeIndex(data);
    pagesEl.innerHTML = '';
    data.pages.forEach((page, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `page-tab${index === active ? ' active' : ''}`;
      button.setAttribute('aria-label', `Сторінка ${index + 1}: ${page.name || `Сторінка ${index + 1}`}`);
      if (index === active) button.setAttribute('aria-current', 'page');
      button.innerHTML = `<span class="page-thumb" aria-hidden="true"></span><span class="page-meta"><strong>${index + 1}</strong><span>${escapeHtml(page.name || `Сторінка ${index + 1}`)}</span></span>`;
      button.addEventListener('click', () => switchPage(index));
      pagesEl.appendChild(button);
    });
  }

  function saveRasterNow() {
    const data = readData();
    const index = activeIndex(data);
    const page = data.pages[index];
    if (!page) return;
    page.image = canvas.toDataURL('image/png');
    page.background = board.dataset.background || 'clean';
    data.activePage = index;
    writeData(data);
    if (autosaveState) autosaveState.textContent = 'Збережено';
  }

  function scheduleSave() {
    if (autosaveState) autosaveState.textContent = 'Збереження…';
    clearTimeout(state.autosaveTimer);
    state.autosaveTimer = setTimeout(saveRasterNow, 250);
  }

  function loadPage(index) {
    const data = readData();
    const page = data.pages[index];
    if (!page) return;
    resizeCanvasHeight(pageHeight(index));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    board.dataset.background = page.background || 'clean';
    syncBackgroundButtons();
    if (!page.image) return;
    const image = new Image();
    image.onload = () => ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.src = page.image;
  }

  function switchPage(index) {
    const data = readData();
    const current = activeIndex(data);
    if (index === current) return;
    const currentPage = data.pages[current];
    if (currentPage) {
      currentPage.image = canvas.toDataURL('image/png');
      currentPage.background = board.dataset.background || 'clean';
    }
    data.activePage = Math.max(0, Math.min(index, data.pages.length - 1));
    writeData(data);
    renderPages();
    loadPage(data.activePage);
  }

  function setTool(tool) {
    if (!tool || !['pen','marker','eraser','laser','arrow'].includes(tool)) return;
    state.tool = tool;
    document.querySelectorAll('.tool[data-tool]').forEach(button => button.classList.toggle('active', button.dataset.tool === tool));
    canvas.style.cursor = tool === 'eraser' ? 'cell' : tool === 'laser' ? 'none' : 'crosshair';
  }

  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
  }

  function configure(tool = state.tool) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = tool === 'marker' ? Math.max(14, state.lineWidth * 3) : tool === 'eraser' ? Math.max(18, state.lineWidth * 4) : state.lineWidth;
    ctx.strokeStyle = state.color; ctx.fillStyle = state.color;
    ctx.globalAlpha = tool === 'marker' ? .24 : 1;
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
  }

  function resetContext() { ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }

  function drawPoint(p) {
    configure(); ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1, ctx.lineWidth / 2), 0, Math.PI * 2); ctx.fill(); resetContext();
  }

  function drawSegment(a, b) {
    configure(); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); resetContext();
  }

  function drawArrow(a, b) {
    configure('pen');
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    const angle = Math.atan2(b.y - a.y, b.x - a.x), size = 18 + state.lineWidth;
    ctx.beginPath(); ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - size * Math.cos(angle - Math.PI / 6), b.y - size * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - size * Math.cos(angle + Math.PI / 6), b.y - size * Math.sin(angle + Math.PI / 6));
    ctx.stroke(); resetContext();
  }

  let arrowStart = null;
  let arrowSnapshot = null;

  function pointerDown(event) {
    if (!['pen','marker','eraser','laser','arrow'].includes(state.tool)) return;
    if (state.tool === 'laser') { showLaser(event); return; }
    const p = point(event);
    if (state.tool === 'arrow') {
      arrowStart = p;
      arrowSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      state.drawing = true;
      event.stopImmediatePropagation();
      return;
    }
    if (!['pen','marker','eraser'].includes(state.tool)) return;
    state.drawing = true; state.last = p;
    canvas.setPointerCapture?.(event.pointerId);
    drawPoint(p);
  }

  function pointerMove(event) {
    if (state.tool === 'laser') { if (event.buttons) showLaser(event); return; }
    if (!state.drawing) return;
    const p = point(event);
    if (state.tool === 'arrow' && arrowStart && arrowSnapshot) {
      event.stopImmediatePropagation();
      ctx.putImageData(arrowSnapshot, 0, 0); drawArrow(arrowStart, p); return;
    }
    if (['pen','marker','eraser'].includes(state.tool)) { drawSegment(state.last, p); state.last = p; }
  }

  function pointerUp(event) {
    if (!state.drawing) return;
    if (state.tool === 'arrow' && arrowStart && arrowSnapshot) {
      event.stopImmediatePropagation();
      ctx.putImageData(arrowSnapshot, 0, 0); drawArrow(arrowStart, point(event));
      arrowStart = null; arrowSnapshot = null;
    }
    state.drawing = false; state.last = null; scheduleSave();
  }

  function setBackground(background) {
    const data = readData();
    const page = data.pages[activeIndex(data)];
    if (!page) return;
    page.background = background;
    board.dataset.background = background;
    writeData(data);
    syncBackgroundButtons();
  }

  function syncBackgroundButtons() {
    document.querySelectorAll('#backgroundButtons button').forEach(button => button.classList.toggle('selected', button.dataset.bg === board.dataset.background));
  }

  function setZoom(next) {
    state.zoom = Math.max(.6, Math.min(1.8, Math.round(next * 10) / 10));
    board.style.transform = `scale(${state.zoom})`;
    const viewport = boardWrap?.querySelector('.board-viewport');
    if (viewport) viewport.style.paddingBottom = `${Math.max(14, (state.zoom - 1) * board.offsetHeight + 14)}px`;
    const label = document.getElementById('zoomLabel');
    if (label) label.textContent = `${Math.round(state.zoom * 100)}%`;
  }

  function toggleMathPanel() { workspace?.classList.toggle('math-closed'); }
  async function toggleFullscreen() {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    else await document.exitFullscreen?.();
  }

  function showLaser(event) {
    if (!laserDot) return;
    const rect = board.getBoundingClientRect();
    laserDot.hidden = false; laserDot.style.left = `${event.clientX - rect.left}px`; laserDot.style.top = `${event.clientY - rect.top}px`; laserDot.style.opacity = '1';
    clearTimeout(showLaser.timer);
    showLaser.timer = setTimeout(() => { laserDot.style.opacity = '0'; setTimeout(() => laserDot.hidden = true, 250); }, 700);
  }

  function bind() {
    document.querySelectorAll('.tool[data-tool]').forEach(button => {
      if (['pen','marker','eraser','laser','arrow'].includes(button.dataset.tool)) button.addEventListener('click', () => setTool(button.dataset.tool));
    });
    colorPicker?.addEventListener('input', event => state.color = event.target.value);
    lineWidthSelect?.addEventListener('change', event => state.lineWidth = Number(event.target.value));
    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerup', pointerUp);
    canvas.addEventListener('pointercancel', pointerUp);
    document.getElementById('zoomInBtn')?.addEventListener('click', () => setZoom(state.zoom + .1));
    document.getElementById('zoomOutBtn')?.addEventListener('click', () => setZoom(state.zoom - .1));
    document.getElementById('fullscreenBtn')?.addEventListener('click', toggleFullscreen);
    document.getElementById('mathToggleBtn')?.addEventListener('click', toggleMathPanel);
    document.getElementById('closeMathBtn')?.addEventListener('click', toggleMathPanel);
    document.querySelectorAll('#backgroundButtons button').forEach(button => button.addEventListener('click', () => setBackground(button.dataset.bg)));
    window.addEventListener('teacherboard:storage-updated', () => { renderPages(); syncHeight(); });
    window.addEventListener('beforeunload', saveRasterNow);
  }

  function boot() {
    const data = readData();
    if (!localStorage.getItem(STORAGE_KEY)) writeData(data);
    renderPages(); syncHeight(); loadPage(activeIndex(data)); bind(); setTool('pen');
  }

  globalThis.TeacherBoardCoreRuntime = { renderPages, loadPage, saveRasterNow, switchPage, setTool };
  boot();
})();
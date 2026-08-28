(() => {
  'use strict';

  const STORAGE_KEY = 'teacherboard.v1';
  const HEIGHTS_KEY = 'teacherboard.pageHeights.v1';
  const canvas = document.getElementById('boardCanvas');
  const board = document.getElementById('board');
  const toolbar = document.querySelector('.toolbar');
  const pagesEl = document.getElementById('pages');
  const imageInput = document.getElementById('imageInput');
  const colorPicker = document.getElementById('colorPicker');
  const lineWidth = document.getElementById('lineWidth');
  const textLayer = document.getElementById('textLayer');
  const autosaveState = document.getElementById('autosaveState');
  const renderer = globalThis.TeacherBoardObjects;

  if (!canvas || !board || !toolbar || !renderer?.renderShapeSvg) return;

  let objectLayer = null;
  let selectedId = null;
  let pendingShape = null;
  let drag = null;
  let preview = null;
  let renderTimer = null;

  const PRESETS = new Set(['number5', 'number10', 'numberBlank', 'axes', 'xyTable']);

  function readData() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
  }

  function writeData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (autosaveState) autosaveState.textContent = 'Збережено';
    mirrorToIndexedDb(data);
  }

  function legacyHeights() {
    try {
      const value = JSON.parse(localStorage.getItem(HEIGHTS_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  }

  function activeIndex(data = readData()) {
    const length = data.pages?.length || 1;
    return Math.max(0, Math.min(Number(data.activePage) || 0, length - 1));
  }

  function pageHeight(index = activeIndex()) {
    return legacyHeights()[index] || canvas.height || 900;
  }

  function currentObjects(data = readData(), index = activeIndex(data)) {
    const items = data.pages?.[index]?.objects;
    return Array.isArray(items) ? items : [];
  }

  function saveObjects(items) {
    const data = readData();
    if (!Array.isArray(data.pages) || !data.pages.length) return;
    const index = activeIndex(data);
    data.pages[index].objects = items;
    writeData(data);
  }

  async function mirrorToIndexedDb(raw) {
    try {
      const storage = globalThis.TeacherBoardStorage;
      const core = globalThis.TeacherBoardCore;
      if (!storage?.saveDocument || !core?.normalizeDocument) return;
      const normalized = core.normalizeDocument(raw, legacyHeights());
      await storage.saveDocument(normalized);
    } catch (error) {
      console.warn('[TeacherBoard] IndexedDB mirror failed.', error);
    }
  }

  function uid() {
    return globalThis.TeacherBoardCore?.uid?.('object') || `o_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function createObjectLayer() {
    document.getElementById('objectLayer')?.remove();
    objectLayer = document.createElement('div');
    objectLayer.className = 'tb-object-layer';
    objectLayer.id = 'objectLayer';
    board.appendChild(objectLayer);
    renderObjects();
  }

  function createToolbarControls() {
    document.querySelector('.tb-select-tool')?.remove();
    document.querySelector('.tb-shape-launcher')?.remove();
    document.querySelector('.tb-selected-properties')?.remove();
    document.querySelectorAll('.tb-shape-menu').forEach(el => el.remove());

    const select = document.createElement('button');
    select.type = 'button';
    select.className = 'tool tb-select-tool';
    select.dataset.tbTool = 'select';
    select.title = 'Вибір і переміщення';
    select.setAttribute('aria-label', 'Вибір і переміщення об’єктів');
    select.innerHTML = '<span aria-hidden="true">↖</span><em>Вибір</em>';
    toolbar.insertBefore(select, toolbar.firstChild);
    select.addEventListener('click', () => activateSelect());

    const shapes = document.createElement('button');
    shapes.type = 'button';
    shapes.className = 'tool tb-shape-launcher';
    shapes.title = 'Фігури';
    shapes.setAttribute('aria-label', 'Відкрити меню фігур');
    shapes.innerHTML = '<span aria-hidden="true">◇</span><em>Фігури</em>';
    const arrow = toolbar.querySelector('[data-tool="arrow"]');
    toolbar.insertBefore(shapes, arrow || toolbar.children[4]);

    const menu = buildShapeMenu();
    shapes.addEventListener('click', event => {
      event.stopPropagation();
      const rect = shapes.getBoundingClientRect();
      menu.hidden = !menu.hidden;
      if (!menu.hidden) {
        menu.style.left = `${Math.min(rect.right + 8, innerWidth - 285)}px`;
        menu.style.top = `${Math.min(Math.max(8, rect.top), Math.max(8, innerHeight - menu.offsetHeight - 8))}px`;
        menu.querySelector('button')?.focus();
      }
    });

    document.addEventListener('pointerdown', event => {
      if (!event.target.closest('.tb-shape-menu,.tb-shape-launcher')) menu.hidden = true;
    });

    document.querySelectorAll('.tool[data-tool]').forEach(button => {
      button.addEventListener('click', () => {
        pendingShape = null;
        clearPreview();
        deselect();
        document.body.classList.remove('tb-select-mode');
      });
    });

    const properties = document.createElement('div');
    properties.className = 'tb-selected-properties';
    properties.innerHTML = '<span>Об’єкт</span><button type="button" id="tbDeleteSelected" aria-label="Видалити вибраний об’єкт">✕ Видалити</button>';
    document.querySelector('.top-actions')?.appendChild(properties);
    properties.querySelector('button')?.addEventListener('click', deleteSelected);
  }

  function buildShapeMenu() {
    const menu = document.createElement('div');
    menu.className = 'tb-shape-menu';
    menu.hidden = true;
    menu.setAttribute('role', 'menu');
    menu.innerHTML = `
      <h4>Геометрія</h4>
      <div class="tb-shape-grid">
        <button type="button" data-shape="line">╱ Лінія</button>
        <button type="button" data-shape="rect">□ Прямокутник</button>
        <button type="button" data-shape="ellipse">○ Коло</button>
        <button type="button" data-shape="triangle">△ Трикутник</button>
        <button type="button" data-shape="rightTriangle">◿ Прямокутний</button>
        <button type="button" data-shape="parallelogram">▱ Паралелограм</button>
        <button type="button" data-shape="trapezoid">⏢ Трапеція</button>
        <button type="button" data-shape="rhombus">◇ Ромб</button>
        <button type="button" data-shape="angle">∠ Кут</button>
        <button type="button" data-shape="arc">⌒ Дуга</button>
      </div>
      <h4>Математика</h4>
      <div class="tb-shape-grid">
        <button type="button" data-shape="number5">→ −5…5</button>
        <button type="button" data-shape="number10">→ −10…10</button>
        <button type="button" data-shape="numberBlank">→ Порожня вісь</button>
        <button type="button" data-shape="axes">＋ Координатні осі</button>
        <button type="button" data-shape="xyTable">▦ Таблиця x/y</button>
      </div>`;
    document.body.appendChild(menu);

    menu.addEventListener('click', event => {
      const button = event.target.closest('[data-shape]');
      if (!button) return;
      event.stopPropagation();
      menu.hidden = true;
      chooseShape(button.dataset.shape);
    });
    return menu;
  }

  function chooseShape(shape) {
    if (PRESETS.has(shape)) {
      insertPreset(shape);
      return;
    }
    pendingShape = shape;
    deselect();
    document.body.classList.remove('tb-select-mode');
    document.querySelectorAll('.tool').forEach(el => el.classList.remove('active'));
    document.querySelector('.tb-shape-launcher')?.classList.add('active');
    canvas.style.cursor = 'crosshair';
  }

  function activateSelect(id = null) {
    pendingShape = null;
    clearPreview();
    document.body.classList.add('tb-select-mode');
    document.querySelectorAll('.tool').forEach(el => el.classList.remove('active'));
    document.querySelector('.tb-select-tool')?.classList.add('active');
    canvas.style.cursor = 'default';
    if (id) selectObject(id);
    else renderObjects();
  }

  function boardPoint(event) {
    const rect = board.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width * 1600,
      y: (event.clientY - rect.top) / rect.height * pageHeight()
    };
  }

  function bindShapeCreation() {
    canvas.addEventListener('pointerdown', event => {
      if (!pendingShape) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const point = boardPoint(event);
      drag = { mode: 'create', start: point };
      showPreview(point, point);
    }, true);

    canvas.addEventListener('pointermove', event => {
      if (!drag || drag.mode !== 'create' || !pendingShape) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      showPreview(drag.start, boardPoint(event));
    }, true);

    canvas.addEventListener('pointerup', event => {
      if (!drag || drag.mode !== 'create' || !pendingShape) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const a = drag.start;
      const b = boardPoint(event);
      const object = {
        id: uid(), kind: 'shape', shape: pendingShape,
        x: Math.min(a.x, b.x), y: Math.min(a.y, b.y),
        w: Math.max(60, Math.abs(b.x - a.x)), h: Math.max(50, Math.abs(b.y - a.y)),
        color: colorPicker?.value || '#245d55', lineWidth: Number(lineWidth?.value) || 4
      };
      const items = [...currentObjects(), object];
      saveObjects(items);
      pendingShape = null;
      drag = null;
      clearPreview();
      activateSelect(object.id);
    }, true);
  }

  function showPreview(a, b) {
    if (!preview) {
      preview = document.createElement('div');
      preview.className = 'tb-shape-preview';
      board.appendChild(preview);
    }
    const height = pageHeight();
    Object.assign(preview.style, {
      left: `${Math.min(a.x, b.x) / 1600 * 100}%`,
      top: `${Math.min(a.y, b.y) / height * 100}%`,
      width: `${Math.abs(b.x - a.x) / 1600 * 100}%`,
      height: `${Math.abs(b.y - a.y) / height * 100}%`
    });
  }

  function clearPreview() {
    preview?.remove();
    preview = null;
    if (drag?.mode === 'create') drag = null;
  }

  function insertPreset(shape) {
    const height = pageHeight();
    let w = 760, h = 150;
    if (shape === 'axes') { w = 520; h = 420; }
    if (shape === 'xyTable') { w = 420; h = 300; }
    const object = {
      id: uid(), kind: 'shape', shape,
      x: (1600 - w) / 2, y: Math.max(70, (height - h) / 2), w, h,
      color: colorPicker?.value || '#245d55', lineWidth: Number(lineWidth?.value) || 4
    };
    saveObjects([...currentObjects(), object]);
    activateSelect(object.id);
  }

  function renderObjects() {
    if (!objectLayer) return;
    objectLayer.innerHTML = '';
    const height = pageHeight();
    currentObjects().forEach(object => {
      const el = document.createElement('div');
      el.className = `tb-object${object.id === selectedId ? ' selected' : ''}`;
      el.dataset.id = object.id;
      Object.assign(el.style, {
        left: `${Number(object.x || 0) / 1600 * 100}%`,
        top: `${Number(object.y || 0) / height * 100}%`,
        width: `${Number(object.w || 120) / 1600 * 100}%`,
        height: `${Number(object.h || 90) / height * 100}%`,
        color: object.color || '#245d55'
      });

      if (object.kind === 'image') {
        const img = document.createElement('img');
        img.src = object.src;
        img.alt = object.alt || 'Вставлене зображення';
        el.appendChild(img);
      } else {
        el.innerHTML = renderer.renderShapeSvg({
          type: 'shape', shape: object.shape, lineWidth: object.lineWidth, color: object.color
        });
      }

      const resize = document.createElement('span');
      resize.className = 'tb-object-handle tb-resize-handle';
      resize.setAttribute('aria-hidden', 'true');
      resize.title = 'Змінити розмір';
      el.appendChild(resize);

      const remove = document.createElement('button');
      remove.className = 'tb-object-handle tb-delete-handle';
      remove.type = 'button';
      remove.textContent = '×';
      remove.title = 'Видалити';
      remove.setAttribute('aria-label', 'Видалити об’єкт');
      el.appendChild(remove);

      el.addEventListener('pointerdown', objectPointerDown);
      resize.addEventListener('pointerdown', resizePointerDown);
      remove.addEventListener('pointerdown', event => event.stopPropagation());
      remove.addEventListener('click', event => {
        event.stopPropagation();
        selectedId = object.id;
        deleteSelected();
      });
      objectLayer.appendChild(el);
    });
    document.body.classList.toggle('tb-has-selection', Boolean(selectedId));
  }

  function selectObject(id) {
    selectedId = id;
    document.body.classList.add('tb-select-mode', 'tb-has-selection');
    renderObjects();
  }

  function deselect() {
    selectedId = null;
    document.body.classList.remove('tb-has-selection');
    renderObjects();
  }

  function objectPointerDown(event) {
    if (!document.body.classList.contains('tb-select-mode')) return;
    if (event.target.closest('.tb-object-handle')) return;
    event.preventDefault();
    event.stopPropagation();
    const id = event.currentTarget.dataset.id;
    const object = currentObjects().find(item => item.id === id);
    if (!object) return;
    selectObject(id);
    drag = {
      mode: 'move', id,
      startClientX: event.clientX, startClientY: event.clientY,
      startX: Number(object.x || 0), startY: Number(object.y || 0)
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function resizePointerDown(event) {
    event.preventDefault();
    event.stopPropagation();
    const host = event.currentTarget.closest('.tb-object');
    const id = host?.dataset.id;
    const object = currentObjects().find(item => item.id === id);
    if (!object) return;
    selectObject(id);
    drag = {
      mode: 'resize', id,
      startClientX: event.clientX, startClientY: event.clientY,
      startW: Number(object.w || 120), startH: Number(object.h || 90)
    };
    host.setPointerCapture?.(event.pointerId);
  }

  function bindObjectDragging() {
    window.addEventListener('pointermove', event => {
      if (!drag || !['move', 'resize'].includes(drag.mode)) return;
      const rect = board.getBoundingClientRect();
      const scaleX = 1600 / rect.width;
      const scaleY = pageHeight() / rect.height;
      const items = currentObjects().map(item => ({ ...item }));
      const object = items.find(item => item.id === drag.id);
      if (!object) return;

      if (drag.mode === 'move') {
        object.x = Math.max(0, Math.min(1600 - Number(object.w || 0), drag.startX + (event.clientX - drag.startClientX) * scaleX));
        object.y = Math.max(0, Math.min(pageHeight() - Number(object.h || 0), drag.startY + (event.clientY - drag.startClientY) * scaleY));
      } else {
        object.w = Math.max(40, Math.min(1600 - Number(object.x || 0), drag.startW + (event.clientX - drag.startClientX) * scaleX));
        object.h = Math.max(40, Math.min(pageHeight() - Number(object.y || 0), drag.startH + (event.clientY - drag.startClientY) * scaleY));
      }
      saveObjects(items);
      renderObjects();
    });

    window.addEventListener('pointerup', () => {
      if (drag && ['move', 'resize'].includes(drag.mode)) drag = null;
    });
  }

  function deleteSelected() {
    if (!selectedId) return;
    saveObjects(currentObjects().filter(item => item.id !== selectedId));
    selectedId = null;
    renderObjects();
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  function imageSize(src) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth || 800, height: img.naturalHeight || 600 });
      img.onerror = () => resolve({ width: 800, height: 600 });
      img.src = src;
    });
  }

  async function insertImageObject(file) {
    if (!file?.type?.startsWith('image/')) return;
    const src = await fileToDataUrl(file);
    const size = await imageSize(src);
    const maxW = 760, maxH = Math.min(560, pageHeight() * 0.62);
    const scale = Math.min(maxW / size.width, maxH / size.height, 1);
    const w = Math.max(120, size.width * scale);
    const h = Math.max(90, size.height * scale);
    const object = {
      id: uid(), kind: 'image', src, alt: 'Вставлене зображення',
      x: (1600 - w) / 2, y: Math.max(40, (pageHeight() - h) / 2), w, h
    };
    saveObjects([...currentObjects(), object]);
    activateSelect(object.id);
  }

  function interceptImages() {
    imageInput?.addEventListener('change', event => {
      const file = event.target.files?.[0];
      if (!file) return;
      event.stopImmediatePropagation();
      insertImageObject(file).catch(console.error);
      imageInput.value = '';
    }, true);

    window.addEventListener('paste', event => {
      if (event.target.matches('textarea,input,[contenteditable="true"]')) return;
      const item = [...(event.clipboardData?.items || [])].find(entry => entry.type.startsWith('image/'));
      if (!item) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      insertImageObject(item.getAsFile()).catch(console.error);
    }, true);
  }

  function interceptClear() {
    document.getElementById('clearBtn')?.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!confirm('Очистити поточну сторінку повністю?')) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (textLayer) textLayer.innerHTML = '';
      const data = readData();
      if (Array.isArray(data.pages) && data.pages.length) {
        const index = activeIndex(data);
        data.pages[index].image = canvas.toDataURL('image/png');
        data.pages[index].texts = [];
        data.pages[index].objects = [];
        writeData(data);
      }
      selectedId = null;
      renderObjects();
    }, true);
  }

  function watchPages() {
    let lastIndex = activeIndex();
    const refresh = () => {
      const next = activeIndex();
      if (next !== lastIndex) {
        lastIndex = next;
        selectedId = null;
      }
      clearTimeout(renderTimer);
      renderTimer = setTimeout(renderObjects, 20);
    };
    if (pagesEl) new MutationObserver(refresh).observe(pagesEl, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    window.addEventListener('storage', refresh);
    window.addEventListener('teacherboard:page-cleared', refresh);
  }

  function bindKeyboard() {
    window.addEventListener('keydown', event => {
      if (event.target.matches('textarea,input,select,[contenteditable="true"]')) return;
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
        event.preventDefault();
        deleteSelected();
      }
      if (event.key === 'Escape') {
        pendingShape = null;
        clearPreview();
        deselect();
      }
    });
  }

  async function composePage(index) {
    const data = readData();
    const page = data.pages?.[index];
    const height = pageHeight(index);
    const out = document.createElement('canvas');
    out.width = 1600;
    out.height = height;
    const ctx = out.getContext('2d');
    drawBackground(ctx, page?.background || 'clean', out.width, out.height);

    if (page?.image) await drawImage(ctx, page.image, 0, 0, 1600, height);
    (page?.texts || []).forEach(text => drawText(ctx, text));
    for (const object of (page?.objects || [])) await drawObject(ctx, object);
    return out;
  }

  function drawBackground(ctx, type, width, height) {
    ctx.fillStyle = '#fffefa';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#e1e8e4';
    ctx.lineWidth = 1;
    if (type === 'grid' || type === 'coords') {
      const step = type === 'coords' ? 40 : 32;
      for (let x = 0; x <= width; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
      for (let y = 0; y <= height; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
    }
    if (type === 'lines') {
      for (let y = 34; y < height; y += 34) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
    }
    if (type === 'coords') {
      ctx.strokeStyle = '#9bb6ab'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(width / 2, 0); ctx.lineTo(width / 2, height); ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2); ctx.stroke();
    }
  }

  function drawImage(ctx, src, x, y, width, height) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, x, y, width, height); resolve(); };
      img.onerror = resolve;
      img.src = src;
    });
  }

  function drawText(ctx, item) {
    ctx.save();
    ctx.fillStyle = item.color || '#245d55';
    ctx.font = `${Number(item.fontSize || 28)}px system-ui`;
    ctx.textBaseline = 'top';
    String(item.text || '').split('\n').forEach((line, index) => ctx.fillText(line, Number(item.x || 0), Number(item.y || 0) + index * 34));
    ctx.restore();
  }

  async function drawObject(ctx, object) {
    if (object.kind === 'image') {
      await drawImage(ctx, object.src, Number(object.x || 0), Number(object.y || 0), Number(object.w || 100), Number(object.h || 100));
      return;
    }
    const svg = renderer.renderShapeSvg({ type: 'shape', shape: object.shape, lineWidth: object.lineWidth, color: object.color });
    const encoded = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace('<svg ', `<svg color="${object.color || '#245d55'}" `))}`;
    await drawImage(ctx, encoded, Number(object.x || 0), Number(object.y || 0), Number(object.w || 100), Number(object.h || 100));
  }

  function interceptExports() {
    document.getElementById('savePngBtn')?.addEventListener('click', async event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const index = activeIndex();
      const out = await composePage(index);
      const link = document.createElement('a');
      link.download = `TeacherBoard-${index + 1}.png`;
      link.href = out.toDataURL('image/png');
      link.click();
    }, true);

    document.getElementById('saveLessonPdfBtn')?.addEventListener('click', async event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!window.jspdf?.jsPDF) { alert('PDF-модуль ще завантажується.'); return; }
      const data = readData();
      if (!data.pages?.length) return;
      const { jsPDF } = window.jspdf;
      let pdf = null;
      for (let index = 0; index < data.pages.length; index++) {
        const out = await composePage(index);
        if (!pdf) pdf = new jsPDF({ orientation: out.height > 1600 ? 'portrait' : 'landscape', unit: 'px', format: [1600, out.height], hotfixes: ['px_scaling'] });
        else pdf.addPage([1600, out.height], out.height > 1600 ? 'portrait' : 'landscape');
        pdf.addImage(out.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 1600, out.height);
      }
      pdf.save(`TeacherBoard-заняття-${new Date().toISOString().slice(0, 10)}.pdf`);
    }, true);
  }

  function init() {
    createObjectLayer();
    createToolbarControls();
    bindShapeCreation();
    bindObjectDragging();
    interceptImages();
    interceptClear();
    watchPages();
    bindKeyboard();
    interceptExports();
    document.querySelectorAll('.toolbar [data-tool="line"],.toolbar [data-tool="rect"],.toolbar [data-tool="ellipse"]').forEach(el => el.setAttribute('aria-hidden', 'true'));
    mirrorToIndexedDb(readData());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0));
  else setTimeout(init, 0);
})();
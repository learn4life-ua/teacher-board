(() => {
  'use strict';

  const STORAGE_KEY = 'teacherboard.v1';
  const HEIGHTS_KEY = 'teacherboard.pageHeights.v1';
  const canvas = document.getElementById('boardCanvas');
  const board = document.getElementById('board');
  const toolbar = document.querySelector('.toolbar');
  const textLayer = document.getElementById('textLayer');
  const textDialog = document.getElementById('textDialog');
  const textInput = document.getElementById('textInput');
  const colorPicker = document.getElementById('colorPicker');
  const lineWidth = document.getElementById('lineWidth');
  const imageInput = document.getElementById('imageInput');
  const autosaveState = document.getElementById('autosaveState');
  const renderer = globalThis.TeacherBoardObjects;
  const historyFactory = globalThis.TeacherBoardHistory?.createHistory;

  if (!canvas || !board || !toolbar || !renderer?.renderShapeSvg) return;

  const history = historyFactory ? historyFactory({ limit: 40 }) : null;
  const PRESETS = new Set(['number5', 'number10', 'numberBlank', 'axes', 'xyTable']);
  let objectLayer = null;
  let selectedId = null;
  let pendingCreate = null;
  let drag = null;
  let preview = null;
  let textPosition = { x: 220, y: 150 };
  let textEditingId = null;

  function readData() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
  }

  function writeData(data, { record = false } = {}) {
    if (record && history) history.push(readData());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    autosaveState && (autosaveState.textContent = 'Збережено');
    renderObjects();
  }

  function heights() {
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
    return heights()[index] || canvas.height || 900;
  }

  function activePage(data = readData()) {
    return data.pages?.[activeIndex(data)] || null;
  }

  function currentObjects(data = readData()) {
    const objects = activePage(data)?.objects;
    return Array.isArray(objects) ? objects : [];
  }

  function uid(prefix = 'object') {
    return globalThis.TeacherBoardCore?.uid?.(prefix) || `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function migrateLegacyTexts() {
    const data = readData();
    if (!Array.isArray(data.pages)) return;
    let changed = false;
    data.pages.forEach(page => {
      const texts = Array.isArray(page.texts) ? page.texts : [];
      page.objects = Array.isArray(page.objects) ? page.objects : [];
      if (texts.length) {
        texts.forEach(item => page.objects.push({
          id: uid('text'), kind: 'text',
          x: Number(item.x) || 220, y: Number(item.y) || 150,
          w: Number(item.w) || 520, h: Number(item.h) || 90,
          text: String(item.text || ''), color: item.color || '#245d55', fontSize: Number(item.fontSize) || 28
        }));
        page.texts = [];
        changed = true;
      }
    });
    if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (textLayer) textLayer.innerHTML = '';
  }

  function addLayer() {
    document.getElementById('objectLayer')?.remove();
    objectLayer = document.createElement('div');
    objectLayer.className = 'tb-object-layer';
    objectLayer.id = 'objectLayer';
    board.appendChild(objectLayer);
    renderObjects();
  }

  function objectBox(object, height) {
    return {
      left: `${Number(object.x || 0) / 1600 * 100}%`,
      top: `${Number(object.y || 0) / height * 100}%`,
      width: `${Number(object.w || 120) / 1600 * 100}%`,
      height: `${Number(object.h || 90) / height * 100}%`
    };
  }

  function renderObjects() {
    if (!objectLayer) return;
    objectLayer.innerHTML = '';
    const height = pageHeight();
    currentObjects().forEach(object => {
      const el = document.createElement('div');
      el.className = `tb-object tb-object-${object.kind || 'shape'}${object.id === selectedId ? ' selected' : ''}`;
      el.dataset.id = object.id;
      Object.assign(el.style, objectBox(object, height), { color: object.color || '#245d55' });

      if (object.kind === 'image') {
        const img = document.createElement('img');
        img.src = object.src;
        img.alt = object.alt || 'Вставлене зображення';
        el.appendChild(img);
      } else if (object.kind === 'text') {
        const text = document.createElement('div');
        text.className = 'tb-object-text-content';
        text.textContent = object.text || '';
        text.style.fontSize = `${Number(object.fontSize) || 28}px`;
        text.style.color = object.color || '#245d55';
        el.appendChild(text);
        el.addEventListener('dblclick', event => { event.stopPropagation(); editTextObject(object.id); });
      } else if (object.kind === 'curtain') {
        const curtain = document.createElement('div');
        curtain.className = 'tb-curtain-content';
        curtain.style.background = object.fill || '#dfe8e3';
        curtain.style.opacity = String(object.opacity ?? .98);
        el.appendChild(curtain);
      } else {
        el.innerHTML = renderer.renderShapeSvg({ type: 'shape', shape: object.shape, lineWidth: object.lineWidth, color: object.color });
      }

      addHandles(el, object.id);
      el.addEventListener('pointerdown', objectPointerDown);
      objectLayer.appendChild(el);
    });
    document.body.classList.toggle('tb-has-selection', Boolean(selectedId));
  }

  function addHandles(el, id) {
    const resize = document.createElement('span');
    resize.className = 'tb-object-handle tb-resize-handle';
    resize.title = 'Змінити розмір';
    resize.setAttribute('aria-hidden', 'true');
    resize.addEventListener('pointerdown', resizePointerDown);
    el.appendChild(resize);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'tb-object-handle tb-delete-handle';
    remove.textContent = '×';
    remove.title = 'Видалити';
    remove.setAttribute('aria-label', 'Видалити об’єкт');
    remove.addEventListener('pointerdown', event => event.stopPropagation());
    remove.addEventListener('click', event => { event.stopPropagation(); selectedId = id; deleteSelected(); });
    el.appendChild(remove);
  }

  function createToolbarControls() {
    document.querySelector('.tb-select-tool')?.remove();
    document.querySelector('.tb-shape-launcher')?.remove();
    document.querySelector('.tb-selected-properties')?.remove();
    document.querySelectorAll('.tb-shape-menu').forEach(el => el.remove());

    const select = document.createElement('button');
    select.type = 'button';
    select.className = 'tool tb-select-tool';
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

    const props = document.createElement('div');
    props.className = 'tb-selected-properties';
    props.innerHTML = '<span>Об’єкт</span><button type="button" aria-label="Видалити вибраний об’єкт">✕ Видалити</button>';
    document.querySelector('.top-actions')?.appendChild(props);
    props.querySelector('button')?.addEventListener('click', deleteSelected);

    document.addEventListener('pointerdown', event => {
      if (!event.target.closest('.tb-shape-menu,.tb-shape-launcher')) menu.hidden = true;
    });
  }

  function buildShapeMenu() {
    const menu = document.createElement('div');
    menu.className = 'tb-shape-menu';
    menu.hidden = true;
    menu.setAttribute('role', 'menu');
    menu.innerHTML = `
      <h4>Геометрія</h4><div class="tb-shape-grid">
      <button data-shape="line">╱ Лінія</button><button data-shape="rect">□ Прямокутник</button>
      <button data-shape="ellipse">○ Коло</button><button data-shape="triangle">△ Трикутник</button>
      <button data-shape="rightTriangle">◿ Прямокутний</button><button data-shape="parallelogram">▱ Паралелограм</button>
      <button data-shape="trapezoid">⏢ Трапеція</button><button data-shape="rhombus">◇ Ромб</button>
      <button data-shape="angle">∠ Кут</button><button data-shape="arc">⌒ Дуга</button></div>
      <h4>Математика</h4><div class="tb-shape-grid">
      <button data-shape="number5">→ −5…5</button><button data-shape="number10">→ −10…10</button>
      <button data-shape="numberBlank">→ Порожня вісь</button><button data-shape="axes">＋ Координатні осі</button>
      <button data-shape="xyTable">▦ Таблиця x/y</button></div>`;
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
    if (PRESETS.has(shape)) return insertPreset(shape);
    pendingCreate = { kind: 'shape', shape };
    deselect();
    document.body.classList.remove('tb-select-mode');
    setActiveToolbar(document.querySelector('.tb-shape-launcher'));
    canvas.style.cursor = 'crosshair';
  }

  function setActiveToolbar(active) {
    document.querySelectorAll('.tool').forEach(el => el.classList.remove('active'));
    active?.classList.add('active');
  }

  function activateSelect(id = null) {
    pendingCreate = null;
    clearPreview();
    document.body.classList.add('tb-select-mode');
    setActiveToolbar(document.querySelector('.tb-select-tool'));
    canvas.style.cursor = 'default';
    if (id) selectedId = id;
    renderObjects();
  }

  function deselect() { selectedId = null; renderObjects(); }

  function boardPoint(event) {
    const rect = board.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width * 1600, y: (event.clientY - rect.top) / rect.height * pageHeight() };
  }

  function interceptLegacyTools() {
    toolbar.querySelector('[data-tool="text"]')?.addEventListener('click', () => {
      pendingCreate = { kind: 'text' };
      document.body.classList.remove('tb-select-mode');
    }, true);
    toolbar.querySelector('[data-tool="curtain"]')?.addEventListener('click', () => {
      pendingCreate = { kind: 'curtain' };
      document.body.classList.remove('tb-select-mode');
    }, true);

    canvas.addEventListener('pointerdown', event => {
      if (pendingCreate?.kind === 'text') {
        event.preventDefault(); event.stopImmediatePropagation();
        textPosition = boardPoint(event); textEditingId = null;
        textInput.value = '';
        textDialog.showModal();
        setTimeout(() => textInput.focus(), 0);
        return;
      }
      if (pendingCreate?.kind === 'curtain' || pendingCreate?.kind === 'shape') {
        event.preventDefault(); event.stopImmediatePropagation();
        const point = boardPoint(event);
        drag = { mode: 'create', start: point, create: { ...pendingCreate } };
        showPreview(point, point);
      }
    }, true);

    canvas.addEventListener('pointermove', event => {
      if (drag?.mode !== 'create') return;
      event.preventDefault(); event.stopImmediatePropagation();
      showPreview(drag.start, boardPoint(event));
    }, true);

    canvas.addEventListener('pointerup', event => {
      if (drag?.mode !== 'create') return;
      event.preventDefault(); event.stopImmediatePropagation();
      const a = drag.start, b = boardPoint(event), create = drag.create;
      const object = {
        id: uid(create.kind), kind: create.kind,
        x: Math.min(a.x, b.x), y: Math.min(a.y, b.y),
        w: Math.max(60, Math.abs(b.x - a.x)), h: Math.max(50, Math.abs(b.y - a.y))
      };
      if (create.kind === 'shape') Object.assign(object, { shape: create.shape, color: colorPicker?.value || '#245d55', lineWidth: Number(lineWidth?.value) || 4 });
      if (create.kind === 'curtain') Object.assign(object, { fill: '#dfe8e3', opacity: .98 });
      mutateObjects(items => [...items, object]);
      pendingCreate = null; drag = null; clearPreview(); activateSelect(object.id);
    }, true);
  }

  function bindTextDialog() {
    const confirm = document.getElementById('textConfirmBtn');
    confirm?.addEventListener('click', event => {
      if (!pendingCreate?.kind && !textEditingId) return;
      event.preventDefault(); event.stopImmediatePropagation();
      const value = textInput.value.trim();
      if (!value) { textDialog.close(); return; }
      if (textEditingId) {
        mutateObjects(items => items.map(item => item.id === textEditingId ? { ...item, text: value } : item));
      } else {
        const object = { id: uid('text'), kind: 'text', x: textPosition.x, y: textPosition.y, w: 520, h: 90, text: value, color: colorPicker?.value || '#245d55', fontSize: 28 };
        mutateObjects(items => [...items, object]); selectedId = object.id;
      }
      textEditingId = null; pendingCreate = null; textDialog.close(); activateSelect(selectedId);
    }, true);
  }

  function editTextObject(id) {
    const object = currentObjects().find(item => item.id === id);
    if (!object || object.kind !== 'text') return;
    textEditingId = id; pendingCreate = null; textInput.value = object.text || '';
    textDialog.showModal(); setTimeout(() => { textInput.focus(); textInput.select(); }, 0);
  }

  function showPreview(a, b) {
    if (!preview) { preview = document.createElement('div'); preview.className = 'tb-shape-preview'; board.appendChild(preview); }
    const height = pageHeight();
    Object.assign(preview.style, {
      left: `${Math.min(a.x, b.x) / 1600 * 100}%`, top: `${Math.min(a.y, b.y) / height * 100}%`,
      width: `${Math.abs(b.x - a.x) / 1600 * 100}%`, height: `${Math.abs(b.y - a.y) / height * 100}%`
    });
  }
  function clearPreview() { preview?.remove(); preview = null; if (drag?.mode === 'create') drag = null; }

  function insertPreset(shape) {
    const height = pageHeight(); let w = 760, h = 150;
    if (shape === 'axes') { w = 520; h = 420; }
    if (shape === 'xyTable') { w = 420; h = 300; }
    const object = { id: uid('shape'), kind: 'shape', shape, x: (1600 - w) / 2, y: Math.max(70, (height - h) / 2), w, h, color: colorPicker?.value || '#245d55', lineWidth: Number(lineWidth?.value) || 4 };
    mutateObjects(items => [...items, object]); activateSelect(object.id);
  }

  function mutateObjects(mutator) {
    const data = readData(); const page = activePage(data); if (!page) return;
    const before = JSON.parse(JSON.stringify(data));
    page.objects = mutator(Array.isArray(page.objects) ? page.objects : []);
    history?.push(before);
    writeData(data);
  }

  function objectPointerDown(event) {
    if (!document.body.classList.contains('tb-select-mode') || event.target.closest('.tb-object-handle')) return;
    event.preventDefault(); event.stopPropagation();
    const id = event.currentTarget.dataset.id;
    const object = currentObjects().find(item => item.id === id); if (!object) return;
    selectedId = id; renderObjects();
    drag = { mode: 'move', id, startClientX: event.clientX, startClientY: event.clientY, startX: Number(object.x || 0), startY: Number(object.y || 0), before: readData() };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function resizePointerDown(event) {
    event.preventDefault(); event.stopPropagation();
    const id = event.currentTarget.closest('.tb-object')?.dataset.id;
    const object = currentObjects().find(item => item.id === id); if (!object) return;
    selectedId = id;
    drag = { mode: 'resize', id, startClientX: event.clientX, startClientY: event.clientY, startW: Number(object.w || 120), startH: Number(object.h || 90), before: readData() };
  }

  window.addEventListener('pointermove', event => {
    if (!drag || !['move','resize'].includes(drag.mode)) return;
    const data = readData(); const page = activePage(data); const object = page?.objects?.find(item => item.id === drag.id); if (!object) return;
    const rect = board.getBoundingClientRect();
    const dx = (event.clientX - drag.startClientX) / rect.width * 1600;
    const dy = (event.clientY - drag.startClientY) / rect.height * pageHeight();
    if (drag.mode === 'move') { object.x = Math.max(0, Math.min(1600 - Number(object.w || 0), drag.startX + dx)); object.y = Math.max(0, Math.min(pageHeight() - Number(object.h || 0), drag.startY + dy)); }
    else { object.w = Math.max(40, drag.startW + dx); object.h = Math.max(35, drag.startH + dy); }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); renderObjects();
  }, { passive: true });

  window.addEventListener('pointerup', () => {
    if (!drag || !['move','resize'].includes(drag.mode)) return;
    history?.push(drag.before); drag = null; autosaveState && (autosaveState.textContent = 'Збережено');
  });

  function deleteSelected() {
    if (!selectedId) return;
    const id = selectedId; selectedId = null;
    mutateObjects(items => items.filter(item => item.id !== id));
    document.body.classList.remove('tb-has-selection');
  }

  function insertImageFile(file) {
    if (!file?.type?.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 900, maxH = Math.min(650, pageHeight() * .7), scale = Math.min(maxW / img.width, maxH / img.height, 1);
        const w = img.width * scale, h = img.height * scale;
        const object = { id: uid('image'), kind: 'image', src: reader.result, alt: 'Вставлене зображення', x: (1600 - w) / 2, y: Math.max(40, (pageHeight() - h) / 2), w, h };
        mutateObjects(items => [...items, object]); activateSelect(object.id);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function interceptImages() {
    imageInput?.addEventListener('change', event => {
      const file = event.target.files?.[0]; if (!file) return;
      event.stopImmediatePropagation(); insertImageFile(file); event.target.value = '';
    }, true);
    window.addEventListener('paste', event => {
      if (event.target.closest('textarea,input,[contenteditable="true"]')) return;
      const item = [...(event.clipboardData?.items || [])].find(entry => entry.type.startsWith('image/'));
      if (!item) return;
      event.preventDefault(); event.stopImmediatePropagation(); insertImageFile(item.getAsFile());
    }, true);
  }

  function restoreHistory(snapshot) {
    if (!snapshot) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    selectedId = null; renderObjects(); return true;
  }

  function bindSharedHistory() {
    document.getElementById('undoBtn')?.addEventListener('click', event => {
      const next = history?.undo(readData()); if (!next) return;
      event.preventDefault(); event.stopImmediatePropagation(); restoreHistory(next);
    }, true);
    document.getElementById('redoBtn')?.addEventListener('click', event => {
      const next = history?.redo(readData()); if (!next) return;
      event.preventDefault(); event.stopImmediatePropagation(); restoreHistory(next);
    }, true);
    window.addEventListener('keydown', event => {
      if (event.target.matches('textarea,input,select')) return;
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === 'z') { const next = event.shiftKey ? history?.redo(readData()) : history?.undo(readData()); if (next) { event.preventDefault(); event.stopImmediatePropagation(); restoreHistory(next); } }
      if (key === 'y') { const next = history?.redo(readData()); if (next) { event.preventDefault(); event.stopImmediatePropagation(); restoreHistory(next); } }
    }, true);
  }

  function watchStorage() {
    window.addEventListener('teacherboard:storage-updated', () => { selectedId = null; if (textLayer) textLayer.innerHTML = ''; renderObjects(); });
    new MutationObserver(() => setTimeout(renderObjects, 0)).observe(document.getElementById('pages'), { childList: true, subtree: true, attributes: true });
  }

  function init() {
    migrateLegacyTexts(); addLayer(); createToolbarControls(); interceptLegacyTools(); bindTextDialog(); interceptImages(); bindSharedHistory(); watchStorage();
    document.querySelectorAll('.toolbar [data-tool="line"],.toolbar [data-tool="rect"],.toolbar [data-tool="ellipse"]').forEach(el => el.setAttribute('aria-hidden','true'));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0));
  else setTimeout(init, 0);
})();
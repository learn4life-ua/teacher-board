(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const ICONS = {
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h9a7 7 0 0 1 7 7v2"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9h-9a7 7 0 0 0-7 7v2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    copy: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="m7 7 1 13h8l1-13"/><path d="M10 11v5M14 11v5"/>',
    maximize: '<path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/>',
    calculator: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    pen: '<path d="m4 20 4.5-1 9.8-9.8a2.1 2.1 0 0 0-3-3L5.5 16 4 20Z"/><path d="m13.5 8.5 3 3"/>',
    highlighter: '<path d="m9 11 6 6"/><path d="m5 15 9-9 4 4-9 9H5v-4Z"/><path d="M3 21h12"/>',
    eraser: '<path d="m7 21-4-4L14 6a2.8 2.8 0 0 1 4 0 2.8 2.8 0 0 1 0 4L7 21Z"/><path d="m10 10 7 7M7 21h12"/>',
    line: '<path d="M5 19 19 5"/>',
    arrow: '<path d="M5 12h14M14 7l5 5-5 5"/>',
    square: '<rect x="5" y="5" width="14" height="14" rx="1"/>',
    circle: '<circle cx="12" cy="12" r="7"/>',
    type: '<path d="M5 5h14M12 5v14M8 19h8"/>',
    curtain: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 4v16M16 4v16M8 8h8M8 16h8"/>',
    laser: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>',
    select: '<path d="m5 3 11 10-6 1 3 6-3 1-3-6-4 4 2-16Z"/>',
    shapes: '<rect x="3" y="4" width="7" height="7" rx="1"/><circle cx="17" cy="8" r="4"/><path d="m5 20 4-7 4 7H5Z"/><path d="m15 20 3-6 3 6h-6Z"/>',
    more: '<circle cx="12" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/>',
    fit: '<path d="M4 12h16M7 9l-3 3 3 3M17 9l3 3-3 3"/><path d="M12 4v16" opacity=".28"/>',
    presentation: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h5a4 4 0 0 0 4-4c0-3.3-4-6-9-6Z"/><circle cx="7.5" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="10" cy="6.5" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="7" r="1" fill="currentColor" stroke="none"/>',
    edit: '<path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13 7 4 4"/>',
    chevronDown: '<path d="m7 9 5 5 5-5"/>',
    chevronUp: '<path d="m7 15 5-5 5 5"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 17 5-5 4 4 3-3 4 4"/>',
    triangle: '<path d="M12 4 4 20h16L12 4Z"/>',
    rightTriangle: '<path d="M5 5v14h14L5 5Z"/>',
    parallelogram: '<path d="M8 5h13l-5 14H3L8 5Z"/>',
    trapezoid: '<path d="M8 5h8l5 14H3L8 5Z"/>',
    rhombus: '<path d="m12 3 8 9-8 9-8-9 8-9Z"/>',
    angle: '<path d="M5 18 18 6M5 18h14"/><path d="M10 18a5 5 0 0 1 1-3"/>',
    arc: '<path d="M4 16c3-9 13-9 16 0"/>',
    numberLine: '<path d="M3 12h18M18 9l3 3-3 3"/><path d="M7 9v6M12 9v6M17 9v6"/>',
    axes: '<path d="M4 19 20 5M12 3v18M3 12h18"/><path d="m18 3 2 2-2 2M10 5l2-2 2 2"/>',
    table: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M10 4v16M4 10h16M4 15h16"/>',
    expandDown: '<path d="M12 4v14M7 13l5 5 5-5"/><path d="M5 21h14"/>'
  };

  const SHAPE_META = {
    line: ['line', 'Лінія'],
    rect: ['square', 'Прямокутник'],
    ellipse: ['circle', 'Коло'],
    triangle: ['triangle', 'Трикутник'],
    rightTriangle: ['rightTriangle', 'Прямокутний'],
    parallelogram: ['parallelogram', 'Паралелограм'],
    trapezoid: ['trapezoid', 'Трапеція'],
    rhombus: ['rhombus', 'Ромб'],
    angle: ['angle', 'Кут'],
    arc: ['arc', 'Дуга'],
    number5: ['numberLine', '-5…5'],
    number10: ['numberLine', '-10…10'],
    numberBlank: ['numberLine', 'Порожня вісь'],
    axes: ['axes', 'Координатні осі'],
    xyTable: ['table', 'Таблиця x/y']
  };

  function svg(name) {
    const content = ICONS[name];
    if (!content) return '';
    return `<svg class="tb-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${content}</svg>`;
  }

  function replaceIconOnly(element, name) {
    if (!element || !ICONS[name]) return;
    if (element.dataset.tbIcon === name && element.querySelector(':scope > svg.tb-icon')) return;
    element.dataset.tbIcon = name;
    element.innerHTML = svg(name);
  }

  function setLabeledIcon(element, name, label, labelClass = 'tb-icon-label') {
    if (!element || !ICONS[name]) return;
    if (element.dataset.tbIcon === name && element.querySelector(':scope > svg.tb-icon') && element.textContent.trim() === label) return;
    element.dataset.tbIcon = name;
    element.innerHTML = `${svg(name)}<span class="${labelClass}"></span>`;
    element.querySelector(`.${labelClass}`)?.append(document.createTextNode(label));
  }

  function setToolIcon(element, name) {
    if (!element || !ICONS[name]) return;
    let slot = element.querySelector(':scope > span');
    if (!slot) {
      slot = document.createElement('span');
      element.prepend(slot);
    }
    if (slot.dataset.tbIcon === name && slot.querySelector('svg.tb-icon')) return;
    slot.dataset.tbIcon = name;
    slot.classList.add('tb-icon-slot');
    slot.innerHTML = svg(name);
  }

  function iconifyStatic() {
    const iconOnly = {
      undoBtn: 'undo', redoBtn: 'redo', zoomOutBtn: 'minus', zoomInBtn: 'plus',
      fullscreenBtn: 'maximize', mathToggleBtn: 'calculator', closeMathBtn: 'close',
      fitBoardBtn: 'fit', addPageBtn: 'plus'
    };
    Object.entries(iconOnly).forEach(([id, name]) => replaceIconOnly(document.getElementById(id), name));

    const labeled = [
      ['insertBtn', 'plus', 'Вставити'], ['duplicatePageBtn', 'copy', 'Дублювати'],
      ['savePngBtn', 'download', 'PNG'], ['clearBtn', 'trash', 'Очистити'],
      ['saveLessonPdfBtn', 'download', 'Заняття PDF']
    ];
    labeled.forEach(([id, name, label]) => setLabeledIcon(document.getElementById(id), name, label));
    setLabeledIcon(document.getElementById('presentationBtn'), 'presentation', 'Демонстрація', 'long-label');

    const toolIcons = {
      pen: 'pen', marker: 'highlighter', eraser: 'eraser', line: 'line', arrow: 'arrow',
      rect: 'square', ellipse: 'circle', text: 'type', curtain: 'curtain', laser: 'laser'
    };
    document.querySelectorAll('.toolbar .tool[data-tool]').forEach(button => setToolIcon(button, toolIcons[button.dataset.tool]));
    setToolIcon(document.querySelector('.tb-select-tool'), 'select');
    setToolIcon(document.querySelector('.tb-shape-launcher'), 'shapes');
  }

  function iconifyShapeMenu() {
    document.querySelectorAll('.tb-shape-menu [data-shape]').forEach(button => {
      const meta = SHAPE_META[button.dataset.shape];
      if (meta) setLabeledIcon(button, meta[0], meta[1]);
    });
  }

  function iconifyPageControls() {
    document.querySelectorAll('.page-menu-btn').forEach(button => replaceIconOnly(button, 'more'));
    const context = document.querySelector('.page-context-v1');
    setLabeledIcon(context?.querySelector('[data-act="rename"]'), 'edit', 'Перейменувати');
    setLabeledIcon(context?.querySelector('[data-act="duplicate"]'), 'copy', 'Дублювати');
    setLabeledIcon(context?.querySelector('[data-act="delete"]'), 'trash', 'Видалити');
    setLabeledIcon(document.querySelector('.extend-page'), 'expandDown', 'Продовжити сторінку вниз');

    const toggle = document.querySelector('.pagebar-toggle');
    if (toggle) replaceIconOnly(toggle, document.querySelector('.pagebar')?.classList.contains('collapsed') ? 'chevronUp' : 'chevronDown');
  }

  function iconifyObjectControls() {
    document.querySelectorAll('.tb-delete-handle').forEach(button => replaceIconOnly(button, 'close'));
    document.querySelectorAll('.tb-selected-properties button').forEach(button => setLabeledIcon(button, 'trash', 'Видалити'));
  }

  function iconifyMobile() {
    replaceIconOnly(document.querySelector('.tb-mobile-more'), 'more');
    const menu = document.getElementById('tbMobileMenu');
    const actions = {
      duplicate: ['copy', 'Дублювати сторінку'], png: ['download', 'Зберегти PNG'],
      pdf: ['download', 'Заняття PDF'], present: ['presentation', 'Демонстрація'],
      color: ['palette', 'Колір і товщина'], clear: ['trash', 'Очистити сторінку']
    };
    Object.entries(actions).forEach(([action, meta]) => setLabeledIcon(menu?.querySelector(`[data-act="${action}"]`), meta[0], meta[1]));
  }

  function iconifyLegacyQuickActions() {
    setLabeledIcon(document.getElementById('insertAxesBtn'), 'axes', 'Координатні осі');
    setLabeledIcon(document.getElementById('insertNumberLineBtn'), 'numberLine', 'Числова пряма');
    setLabeledIcon(document.getElementById('insertXYTableBtn'), 'table', 'Таблиця x / y');
  }

  function apply() {
    iconifyStatic();
    iconifyShapeMenu();
    iconifyPageControls();
    iconifyObjectControls();
    iconifyMobile();
    iconifyLegacyQuickActions();
  }

  let scheduled = false;
  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      apply();
    });
  }

  function init() {
    apply();
    new MutationObserver(scheduleApply).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  globalThis.TeacherBoardIcons = { apply, svg };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

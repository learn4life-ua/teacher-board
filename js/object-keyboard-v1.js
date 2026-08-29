(() => {
  'use strict';

  const STORAGE_KEY = 'teacherboard.v1';
  const STEP = 8;
  const LARGE_STEP = 32;

  function readData() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
  }

  function labelFor(el) {
    if (el.classList.contains('tb-object-text')) {
      const text = el.querySelector('.tb-object-text-content')?.textContent?.trim();
      return text ? `Текстовий об’єкт: ${text.slice(0, 80)}` : 'Текстовий об’єкт';
    }
    if (el.classList.contains('tb-object-image')) return 'Зображення на дошці';
    if (el.classList.contains('tb-object-curtain')) return 'Шторка на дошці';
    return 'Геометричний об’єкт на дошці';
  }

  function focusById(id) {
    requestAnimationFrame(() => {
      const next = document.querySelector(`.tb-object[data-id="${CSS.escape(id)}"]`);
      if (next) next.focus({ preventScroll: true });
    });
  }

  function moveObject(id, dx, dy) {
    const data = readData();
    const pageIndex = Math.max(0, Math.min(Number(data.activePage) || 0, (data.pages?.length || 1) - 1));
    const page = data.pages?.[pageIndex];
    if (!page || !Array.isArray(page.objects)) return false;
    const object = page.objects.find(item => item?.id === id);
    if (!object) return false;

    const maxX = Math.max(0, 1600 - (Number(object.w) || 120));
    const pageHeight = Number(page.height) || Number(document.getElementById('boardCanvas')?.height) || 900;
    const maxY = Math.max(0, pageHeight - (Number(object.h) || 90));
    const nextX = Math.max(0, Math.min(maxX, (Number(object.x) || 0) + dx));
    const nextY = Math.max(0, Math.min(maxY, (Number(object.y) || 0) + dy));
    if (nextX === Number(object.x || 0) && nextY === Number(object.y || 0)) return false;

    globalThis.TeacherBoardHistory?.checkpoint?.(data);
    object.x = nextX;
    object.y = nextY;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    focusById(id);
    return true;
  }

  function onKeyDown(event) {
    const el = event.currentTarget;
    const id = el.dataset.id;
    if (!id) return;

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      el.querySelector('.tb-delete-handle')?.click();
      return;
    }

    if (event.key === 'Enter' && el.classList.contains('tb-object-text')) {
      event.preventDefault();
      el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
      return;
    }

    const step = event.shiftKey ? LARGE_STEP : STEP;
    const directions = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step]
    };
    const delta = directions[event.key];
    if (!delta) return;
    event.preventDefault();
    moveObject(id, delta[0], delta[1]);
  }

  function enhance() {
    document.querySelectorAll('.tb-object').forEach(el => {
      el.tabIndex = 0;
      el.setAttribute('role', 'group');
      el.setAttribute('aria-label', labelFor(el));
      if (el.dataset.tbKeyboardBound === '1') return;
      el.dataset.tbKeyboardBound = '1';
      el.addEventListener('keydown', onKeyDown);
    });
  }

  function init() {
    enhance();
    const layer = document.getElementById('objectLayer');
    if (layer) new MutationObserver(enhance).observe(layer, { childList: true, subtree: true });
    new MutationObserver(() => {
      const current = document.getElementById('objectLayer');
      if (current && !current.dataset.tbKeyboardObserved) {
        current.dataset.tbKeyboardObserved = '1';
        new MutationObserver(enhance).observe(current, { childList: true, subtree: true });
      }
      enhance();
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

(() => {
  'use strict';

  const STORAGE_KEY = 'teacherboard.v1';
  const HEIGHTS_KEY = 'teacherboard.pageHeights.v1';
  const pagesEl = document.getElementById('pages');
  const board = document.getElementById('board');
  const canvas = document.getElementById('boardCanvas');
  const viewport = document.getElementById('boardViewport');
  let menuIndex = 0;

  function readData() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
  }
  function writeData(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  function readHeights() {
    try {
      const value = JSON.parse(localStorage.getItem(HEIGHTS_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  }
  function writeHeights(value) { localStorage.setItem(HEIGHTS_KEY, JSON.stringify(value)); }
  function activeIndex(data = readData()) {
    const len = data.pages?.length || 1;
    return Math.max(0, Math.min(Number(data.activePage) || 0, len - 1));
  }

  function refresh(index, { load = true } = {}) {
    const runtime = globalThis.TeacherBoardCoreRuntime;
    runtime?.renderPages?.();
    if (load) runtime?.loadPage?.(index);
    window.dispatchEvent(new CustomEvent('teacherboard:page-changed', { detail: { index } }));
  }

  function ensureMenu() {
    let menu = document.querySelector('.page-context-v1');
    if (menu) return menu;
    menu = document.createElement('div');
    menu.className = 'page-context page-context-v1';
    menu.hidden = true;
    menu.innerHTML = '<button type="button" data-act="rename">Перейменувати</button><button type="button" data-act="duplicate">Дублювати</button><button type="button" class="danger" data-act="delete">Видалити</button>';
    document.body.appendChild(menu);
    return menu;
  }

  function renamePage(index) {
    const data = readData();
    if (!data.pages?.[index]) return;
    const current = data.pages[index].name || `Сторінка ${index + 1}`;
    const name = prompt('Назва сторінки:', current);
    if (!name?.trim()) return;
    data.pages[index].name = name.trim();
    writeData(data);
    refresh(activeIndex(data), { load: false });
  }

  function duplicatePage(index) {
    const data = readData();
    if (!data.pages?.[index]) return;
    const clone = typeof structuredClone === 'function'
      ? structuredClone(data.pages[index])
      : JSON.parse(JSON.stringify(data.pages[index]));
    clone.name = `${clone.name || `Сторінка ${index + 1}`} — копія`;
    data.pages.splice(index + 1, 0, clone);
    data.activePage = index + 1;

    const heights = readHeights();
    const sourceHeight = heights[index] || data.pages[index]?.height || clone.height || 900;
    heights.splice(index + 1, 0, sourceHeight);
    clone.height = sourceHeight;
    writeHeights(heights);
    writeData(data);
    refresh(data.activePage);
  }

  function deletePage(index) {
    const data = readData();
    if (!Array.isArray(data.pages) || data.pages.length <= 1) {
      alert('Останню сторінку видалити не можна.');
      return;
    }
    if (!confirm(`Видалити сторінку ${index + 1}?`)) return;
    data.pages.splice(index, 1);
    data.activePage = Math.min(index, data.pages.length - 1);
    const heights = readHeights();
    heights.splice(index, 1);
    writeHeights(heights);
    writeData(data);
    refresh(data.activePage);
  }

  function enhancePageTabs() {
    if (!pagesEl) return;
    const menu = ensureMenu();

    [...pagesEl.querySelectorAll('.page-tab')].forEach((tab, index) => {
      let button = tab.querySelector('.page-menu-btn');
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'page-menu-btn';
        button.textContent = '⋮';
        button.addEventListener('click', event => {
          event.stopPropagation();
          menuIndex = Number(button.dataset.pageIndex) || 0;
          const rect = button.getBoundingClientRect();
          menu.style.left = `${Math.min(rect.left, innerWidth - 170)}px`;
          menu.style.top = `${Math.max(10, rect.top - 110)}px`;
          menu.hidden = false;
        });
        tab.appendChild(button);
      }
      button.dataset.pageIndex = String(index);
      button.setAttribute('aria-label', `Дії зі сторінкою ${index + 1}`);
    });

    if (!menu.dataset.bound) {
      menu.dataset.bound = '1';
      menu.addEventListener('click', event => {
        const act = event.target.closest('[data-act]')?.dataset.act;
        if (!act) return;
        menu.hidden = true;
        if (act === 'rename') renamePage(menuIndex);
        if (act === 'duplicate') duplicatePage(menuIndex);
        if (act === 'delete') deletePage(menuIndex);
      });
      document.addEventListener('pointerdown', event => {
        if (!event.target.closest('.page-context-v1,.page-menu-btn')) menu.hidden = true;
      });
    }
  }

  function resizeCanvasHeight(newHeight) {
    if (!canvas || !board) return;
    if (canvas.height === newHeight) return;
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    copy.getContext('2d').drawImage(canvas, 0, 0);
    canvas.height = newHeight;
    canvas.style.height = '100%';
    board.style.height = `${newHeight / 1600 * 100}vw`;
    board.style.aspectRatio = 'auto';
    canvas.getContext('2d').drawImage(copy, 0, 0);
  }

  function syncPageHeight() {
    const data = readData();
    const index = activeIndex(data);
    const heights = readHeights();
    const pageHeight = Number(data.pages?.[index]?.height) || Number(heights[index]) || 900;
    if (heights[index] !== pageHeight) {
      heights[index] = pageHeight;
      writeHeights(heights);
    }
    resizeCanvasHeight(pageHeight);
    if (board) {
      board.style.height = `${pageHeight / 1600 * 100}vw`;
      board.style.maxHeight = 'none';
      board.style.minHeight = `${Math.min(pageHeight, 900)}px`;
    }
  }

  function extendPage() {
    const data = readData();
    const index = activeIndex(data);
    const heights = readHeights();
    const current = Number(data.pages?.[index]?.height) || Number(heights[index]) || canvas?.height || 900;
    const next = current + 500;
    if (data.pages?.[index]) data.pages[index].height = next;
    heights[index] = next;
    writeData(data);
    writeHeights(heights);
    resizeCanvasHeight(next);
    setTimeout(() => viewport?.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' }), 50);
  }

  function addExtendButton() {
    if (!board || board.querySelector('.extend-page')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'extend-page';
    button.textContent = '＋ Продовжити сторінку вниз';
    button.setAttribute('aria-label', 'Продовжити сторінку вниз');
    button.addEventListener('click', extendPage);
    board.appendChild(button);
  }

  function init() {
    enhancePageTabs();
    addExtendButton();
    syncPageHeight();
    if (pagesEl) {
      new MutationObserver(() => {
        enhancePageTabs();
        setTimeout(syncPageHeight, 0);
      }).observe(pagesEl, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

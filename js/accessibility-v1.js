(() => {
  'use strict';

  const labels = {
    undoBtn: 'Скасувати останню дію',
    redoBtn: 'Повторити скасовану дію',
    insertBtn: 'Вставити зображення',
    duplicatePageBtn: 'Дублювати поточну сторінку',
    savePngBtn: 'Зберегти поточну сторінку як PNG',
    clearBtn: 'Очистити поточну сторінку',
    zoomOutBtn: 'Зменшити масштаб',
    zoomInBtn: 'Збільшити масштаб',
    fullscreenBtn: 'Увімкнути повноекранний режим',
    mathToggleBtn: 'Відкрити математичну панель',
    closeMathBtn: 'Закрити математичну панель',
    addPageBtn: 'Додати нову сторінку'
  };

  const toolLabels = {
    pen: 'Ручка', marker: 'Маркер', eraser: 'Гумка', line: 'Лінія', arrow: 'Стрілка',
    rect: 'Прямокутник', ellipse: 'Коло', text: 'Текст', curtain: 'Шторка', laser: 'Лазерна указка'
  };

  function labelControls() {
    Object.entries(labels).forEach(([id, label]) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.setAttribute('aria-label', label);
      if (el.tagName === 'BUTTON' && !el.getAttribute('type')) el.type = 'button';
    });

    document.querySelectorAll('.tool[data-tool]').forEach(button => {
      const tool = button.dataset.tool;
      button.setAttribute('aria-label', toolLabels[tool] || button.title || tool);
      button.setAttribute('aria-pressed', button.classList.contains('active') ? 'true' : 'false');
      if (!button.type) button.type = 'button';
    });

    document.querySelectorAll('#backgroundButtons button').forEach(button => {
      button.setAttribute('aria-pressed', button.classList.contains('selected') ? 'true' : 'false');
      button.type = 'button';
    });

    document.querySelectorAll('#symbolButtons button, .stack-actions button').forEach(button => {
      button.type = 'button';
      if (!button.getAttribute('aria-label')) button.setAttribute('aria-label', button.textContent.trim());
    });

    const color = document.getElementById('colorPicker');
    color?.setAttribute('aria-label', 'Колір інструмента');
    const width = document.getElementById('lineWidth');
    width?.setAttribute('aria-label', 'Товщина лінії');
  }

  function syncPressedStates() {
    document.querySelectorAll('.tool[data-tool]').forEach(button => {
      button.setAttribute('aria-pressed', button.classList.contains('active') ? 'true' : 'false');
    });
    document.querySelectorAll('#backgroundButtons button').forEach(button => {
      button.setAttribute('aria-pressed', button.classList.contains('selected') ? 'true' : 'false');
    });
  }

  function bindKeyboard() {
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;

      const shapeMenu = document.querySelector('.tb-shape-menu:not([hidden])');
      if (shapeMenu) {
        shapeMenu.hidden = true;
        document.querySelector('.tb-shape-launcher')?.focus();
      }

      const mobileMenu = document.querySelector('.tb-mobile-menu:not([hidden])');
      if (mobileMenu) mobileMenu.hidden = true;

      if (document.body.classList.contains('tb-select-mode')) {
        document.body.classList.remove('tb-has-selection');
      }
    });
  }

  function observeState() {
    const observer = new MutationObserver(() => syncPressedStates());
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  function init() {
    labelControls();
    bindKeyboard();
    observeState();
    new MutationObserver(labelControls).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
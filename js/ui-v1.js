(() => {
  'use strict';

  const board = document.getElementById('board');
  const boardWrap = document.getElementById('boardWrap');
  const viewport = document.getElementById('boardViewport');
  const workspace = document.querySelector('.workspace');

  function applyColor(color, button = null) {
    const picker = document.getElementById('colorPicker');
    if (picker) {
      picker.value = color;
      picker.dispatchEvent(new Event('input', { bubbles: true }));
    }
    document.querySelectorAll('.color-swatch').forEach(el => el.classList.toggle('active', el === button));
    const custom = document.getElementById('customColor');
    if (custom && custom.value !== color) custom.value = color;
  }

  function addPenControls() {
    const top = document.querySelector('.top-actions');
    if (!top || document.querySelector('.pen-controls')) return;

    const controls = document.createElement('div');
    controls.className = 'pen-controls';
    controls.innerHTML = '<span class="control-label">Перо</span><div class="color-swatches"></div><input id="customColor" type="color" value="#245d55" aria-label="Інший колір"><select id="quickWidth" aria-label="Товщина лінії"><option value="2">2</option><option value="4" selected>4</option><option value="6">6</option><option value="10">10</option></select>';

    const colors = ['#245d55','#1f2c29','#2f5f96','#a44f4a','#76528c','#c79a3b'];
    const swatches = controls.querySelector('.color-swatches');
    colors.forEach((color, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `color-swatch${index === 0 ? ' active' : ''}`;
      button.style.background = color;
      button.setAttribute('aria-label', `Колір ${color}`);
      button.addEventListener('click', () => applyColor(color, button));
      swatches.appendChild(button);
    });

    controls.querySelector('#customColor').addEventListener('input', event => applyColor(event.target.value));
    controls.querySelector('#quickWidth').addEventListener('change', event => {
      const width = document.getElementById('lineWidth');
      if (!width) return;
      width.value = event.target.value;
      width.dispatchEvent(new Event('change', { bubbles: true }));
    });
    top.appendChild(controls);
  }

  function fitBoard() {
    if (!board || !boardWrap) return;
    const rect = boardWrap.getBoundingClientRect();
    const width = board.offsetWidth || 1600;
    const height = board.offsetHeight || 900;
    const scale = Math.max(.35, Math.min(1.2, (rect.width - 24) / width, (rect.height - 24) / height));
    board.style.transform = `scale(${scale})`;
    const label = document.getElementById('zoomLabel');
    if (label) label.textContent = `${Math.round(scale * 100)}%`;
    viewport?.scrollTo({ top: 0, left: 0 });
  }

  function togglePresentation() {
    document.body.classList.toggle('presentation-mode');
    workspace?.classList.add('math-closed');
    setTimeout(fitBoard, 80);
  }

  function addTopActions() {
    const top = document.querySelector('.top-actions');
    const view = document.querySelector('.view-actions');
    if (!top || !view) return;

    if (!document.getElementById('fitBoardBtn')) {
      const fit = document.createElement('button');
      fit.type = 'button';
      fit.className = 'icon-btn fit-btn';
      fit.id = 'fitBoardBtn';
      fit.textContent = '↔';
      fit.setAttribute('aria-label', 'Підігнати дошку до екрана');
      fit.addEventListener('click', fitBoard);
      view.prepend(fit);
    }

    if (!document.getElementById('presentationBtn')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'action-btn presentation-btn';
      button.id = 'presentationBtn';
      button.innerHTML = '<span aria-hidden="true">▣</span> <span class="long-label">Демонстрація</span>';
      button.setAttribute('aria-label', 'Режим демонстрації');
      button.addEventListener('click', togglePresentation);
      top.appendChild(button);
    }

    if (!document.getElementById('saveLessonPdfBtn')) {
      const pdf = document.createElement('button');
      pdf.type = 'button';
      pdf.className = 'action-btn';
      pdf.id = 'saveLessonPdfBtn';
      pdf.textContent = '⇩ Заняття PDF';
      pdf.setAttribute('aria-label', 'Зберегти все заняття у PDF');
      top.appendChild(pdf);
    }

    if (!document.querySelector('.presentation-exit')) {
      const exit = document.createElement('button');
      exit.type = 'button';
      exit.className = 'presentation-exit';
      exit.textContent = 'Вийти з демонстрації';
      exit.addEventListener('click', togglePresentation);
      document.body.appendChild(exit);
    }
  }

  function addPagebarToggle() {
    const pagebar = document.querySelector('.pagebar');
    if (!pagebar || pagebar.querySelector('.pagebar-toggle')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pagebar-toggle';
    button.textContent = '⌄';
    button.setAttribute('aria-label', 'Згорнути панель сторінок');
    button.addEventListener('click', () => {
      pagebar.classList.toggle('collapsed');
      const collapsed = pagebar.classList.contains('collapsed');
      button.textContent = collapsed ? '⌃' : '⌄';
      button.setAttribute('aria-label', collapsed ? 'Розгорнути панель сторінок' : 'Згорнути панель сторінок');
    });
    pagebar.prepend(button);
  }

  function init() {
    addPenControls();
    addTopActions();
    addPagebarToggle();
    window.addEventListener('resize', () => {
      if (matchMedia('(max-width:680px)').matches) setTimeout(fitBoard, 80);
    }, { passive: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
(() => {
  'use strict';

  function clickShape(shape) {
    const button = document.querySelector(`.tb-shape-menu [data-shape="${shape}"]`);
    button?.click();
  }

  function openSymbol(symbol) {
    const textTool = document.querySelector('.toolbar [data-tool="text"]');
    const dialog = document.getElementById('textDialog');
    const input = document.getElementById('textInput');
    if (!textTool || !dialog || !input) return;
    textTool.click();
    input.value = symbol;
    dialog.showModal();
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }, 0);
  }

  function bind() {
    document.getElementById('insertBtn')?.addEventListener('click', () => document.getElementById('imageInput')?.click());

    document.querySelectorAll('#symbolButtons button').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        openSymbol(button.textContent || '');
      });
    });

    document.getElementById('insertAxesBtn')?.addEventListener('click', event => { event.preventDefault(); clickShape('axes'); });
    document.getElementById('insertNumberLineBtn')?.addEventListener('click', event => { event.preventDefault(); clickShape('number5'); });
    document.getElementById('insertXYTableBtn')?.addEventListener('click', event => { event.preventDefault(); clickShape('xyTable'); });

    window.addEventListener('keydown', event => {
      if (event.target.matches('textarea,input,select,[contenteditable="true"]')) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        document.getElementById('duplicatePageBtn')?.click();
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
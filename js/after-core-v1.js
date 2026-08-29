(() => {
  'use strict';

  const modules = [
    'js/pages-v1.js?v=1',
    'js/objects-runtime-v2.js?v=1'
  ];
  let started = false;

  function loadNext(index = 0) {
    if (index >= modules.length) {
      window.dispatchEvent(new CustomEvent('teacherboard:after-core-ready'));
      return;
    }

    const script = document.createElement('script');
    script.src = modules[index];
    script.async = false;
    script.onload = () => loadNext(index + 1);
    script.onerror = () => console.error(`[TeacherBoard] Failed to load ${modules[index]}`);
    document.body.appendChild(script);
  }

  function start() {
    if (started) return;
    started = true;
    loadNext();
  }

  if (document.querySelector('#pages .page-tab')) start();
  else window.addEventListener('teacherboard:core-ready', start, { once: true });
})();
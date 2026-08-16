const phone = window.matchMedia('(max-width:560px)');

function numericZoom() {
  const label = document.querySelector('#zoomLabel');
  const value = Number.parseInt(label?.textContent || '100', 10);
  return Number.isFinite(value) ? value : 100;
}

function fitPhoneBoard() {
  if (!phone.matches) return;
  const zoomOut = document.querySelector('#zoomOutBtn');
  if (!zoomOut) return;

  let guard = 10;
  while (numericZoom() > 25 && guard-- > 0) zoomOut.click();

  const boardWrap = document.querySelector('.board-wrap');
  if (boardWrap) {
    boardWrap.scrollLeft = 0;
    boardWrap.scrollTop = 0;
  }
}

requestAnimationFrame(() => requestAnimationFrame(fitPhoneBoard));

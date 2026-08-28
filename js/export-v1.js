(() => {
  'use strict';

  const STORAGE_KEY = 'teacherboard.v1';
  const HEIGHTS_KEY = 'teacherboard.pageHeights.v1';
  const liveCanvas = document.getElementById('boardCanvas');
  const board = document.getElementById('board');

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
    catch { return fallback; }
  }

  function readData() {
    return readJson(STORAGE_KEY, { pages: [], activePage: 0 });
  }

  function heights() {
    const value = readJson(HEIGHTS_KEY, []);
    return Array.isArray(value) ? value : [];
  }

  function pageHeight(index, page) {
    return Math.max(900, Number(page?.height) || Number(heights()[index]) || (index === Number(readData().activePage) ? liveCanvas?.height : 900) || 900);
  }

  function drawBackground(ctx, type, width, height) {
    ctx.fillStyle = '#fffefa';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#e1e9e4';
    ctx.lineWidth = 1;

    if (type === 'grid' || type === 'coords') {
      const step = type === 'coords' ? 40 : 32;
      for (let x = 0; x <= width; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 0; y <= height; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }
      if (type === 'coords') {
        ctx.strokeStyle = '#9bb6ab'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(width / 2, 0); ctx.lineTo(width / 2, height);
        ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2);
        ctx.stroke();
      }
    }

    if (type === 'lines') {
      for (let y = 34; y < height; y += 34) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }
    }
  }

  function loadImage(src) {
    return new Promise(resolve => {
      if (!src) return resolve(null);
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = src;
    });
  }

  function line(ctx, x1, y1, x2, y2) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  function arrowHead(ctx, x, y, angle, size) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - size * Math.cos(angle - Math.PI / 6), y - size * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(x, y);
    ctx.lineTo(x - size * Math.cos(angle + Math.PI / 6), y - size * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  }

  function drawShape(ctx, object) {
    const x = Number(object.x) || 0, y = Number(object.y) || 0;
    const w = Number(object.w) || 120, h = Number(object.h) || 90;
    const shape = object.shape || 'rect';
    ctx.save();
    ctx.strokeStyle = object.color || '#245d55';
    ctx.fillStyle = object.color || '#245d55';
    ctx.lineWidth = Math.max(1, Number(object.lineWidth) || 4);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    if (shape === 'line') line(ctx, x, y + h, x + w, y);
    else if (shape === 'rect') ctx.strokeRect(x, y, w, h);
    else if (shape === 'ellipse') { ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.stroke(); }
    else if (shape === 'triangle') { ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.stroke(); }
    else if (shape === 'rightTriangle') { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.stroke(); }
    else if (shape === 'parallelogram') { const s = w * .22; ctx.beginPath(); ctx.moveTo(x + s, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - s, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.stroke(); }
    else if (shape === 'trapezoid') { const s = w * .2; ctx.beginPath(); ctx.moveTo(x + s, y); ctx.lineTo(x + w - s, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.stroke(); }
    else if (shape === 'rhombus') { ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + h / 2); ctx.lineTo(x + w / 2, y + h); ctx.lineTo(x, y + h / 2); ctx.closePath(); ctx.stroke(); }
    else if (shape === 'angle') { ctx.beginPath(); ctx.moveTo(x + w, y + h); ctx.lineTo(x + w * .57, y + h); ctx.lineTo(x, y); ctx.stroke(); }
    else if (shape === 'arc') { ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * .7, w / 2, h * .65, 0, Math.PI, Math.PI * 2); ctx.stroke(); }
    else if (String(shape).startsWith('number')) drawNumberLine(ctx, object);
    else if (shape === 'axes') drawAxes(ctx, object);
    else if (shape === 'xyTable') drawTable(ctx, object);

    ctx.restore();
  }

  function drawNumberLine(ctx, object) {
    const x = Number(object.x) || 0, y0 = Number(object.y) || 0;
    const w = Number(object.w) || 760, h = Number(object.h) || 150;
    let min = -5, max = 5, labels = true;
    if (object.shape === 'number10') { min = -10; max = 10; }
    if (object.shape === 'numberBlank') labels = false;
    const y = y0 + h / 2;
    const left = x + 8, right = x + w - 8;
    line(ctx, left, y, right, y);
    arrowHead(ctx, right, y, 0, 16);
    const count = max - min;
    ctx.font = `${Math.max(14, h * .13)}px system-ui`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let i = 0; i <= count; i++) {
      const px = x + 18 + i * (w - 36) / count;
      line(ctx, px, y - 9, px, y + 9);
      if (labels) {
        const n = min + i;
        if (object.shape !== 'number10' || n % 2 === 0) ctx.fillText(String(n), px, y + 15);
      }
    }
  }

  function drawAxes(ctx, object) {
    const x = Number(object.x) || 0, y = Number(object.y) || 0;
    const w = Number(object.w) || 520, h = Number(object.h) || 420;
    const cx = x + w / 2, cy = y + h / 2;
    line(ctx, x + 8, cy, x + w - 8, cy);
    line(ctx, cx, y + h - 8, cx, y + 8);
    arrowHead(ctx, x + w - 8, cy, 0, 15);
    arrowHead(ctx, cx, y + 8, -Math.PI / 2, 15);
    ctx.font = `${Math.max(18, w * .04)}px system-ui`; ctx.textBaseline = 'top';
    ctx.fillText('x', x + w - 28, cy - 30); ctx.fillText('y', cx + 12, y + 10); ctx.fillText('0', cx + 8, cy + 8);
  }

  function drawTable(ctx, object) {
    const x = Number(object.x) || 0, y = Number(object.y) || 0;
    const w = Number(object.w) || 420, h = Number(object.h) || 300;
    ctx.strokeRect(x, y, w, h);
    line(ctx, x + w / 2, y, x + w / 2, y + h);
    for (let i = 1; i < 4; i++) line(ctx, x, y + i * h / 4, x + w, y + i * h / 4);
    ctx.font = `${Math.max(18, h * .1)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('x', x + w / 4, y + 8); ctx.fillText('y', x + 3 * w / 4, y + 8);
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    String(text || '').split('\n').forEach(paragraph => {
      const words = paragraph.split(/\s+/); let lineText = '';
      words.forEach(word => {
        const candidate = lineText ? `${lineText} ${word}` : word;
        if (lineText && ctx.measureText(candidate).width > maxWidth) {
          ctx.fillText(lineText, x, y); y += lineHeight; lineText = word;
        } else lineText = candidate;
      });
      ctx.fillText(lineText, x, y); y += lineHeight;
    });
  }

  async function drawObject(ctx, object) {
    if (object.kind === 'image') {
      const image = await loadImage(object.src);
      if (image) ctx.drawImage(image, Number(object.x) || 0, Number(object.y) || 0, Number(object.w) || image.width, Number(object.h) || image.height);
      return;
    }
    if (object.kind === 'text') {
      ctx.save();
      ctx.fillStyle = object.color || '#245d55';
      const size = Number(object.fontSize) || 28;
      ctx.font = `${size}px system-ui`; ctx.textBaseline = 'top';
      wrapText(ctx, object.text, Number(object.x) || 0, Number(object.y) || 0, Math.max(80, Number(object.w) || 520), size * 1.3);
      ctx.restore();
      return;
    }
    if (object.kind === 'curtain') {
      ctx.save();
      ctx.globalAlpha = Number.isFinite(Number(object.opacity)) ? Number(object.opacity) : .98;
      ctx.fillStyle = object.fill || '#dfe8e3';
      ctx.fillRect(Number(object.x) || 0, Number(object.y) || 0, Number(object.w) || 420, Number(object.h) || 180);
      ctx.restore();
      return;
    }
    drawShape(ctx, object);
  }

  async function composePage(index) {
    const data = readData();
    const page = data.pages?.[index];
    if (!page) return null;
    const height = pageHeight(index, page);
    const out = document.createElement('canvas');
    out.width = 1600; out.height = height;
    const ctx = out.getContext('2d');
    drawBackground(ctx, page.background || 'clean', out.width, out.height);

    const isActive = index === Math.max(0, Math.min(Number(data.activePage) || 0, data.pages.length - 1));
    if (isActive && liveCanvas) ctx.drawImage(liveCanvas, 0, 0, out.width, Math.min(out.height, liveCanvas.height));
    else {
      const raster = await loadImage(page.image);
      if (raster) ctx.drawImage(raster, 0, 0, out.width, Math.min(out.height, raster.height || out.height));
    }

    for (const object of Array.isArray(page.objects) ? page.objects : []) await drawObject(ctx, object);
    return out;
  }

  async function exportPng(event) {
    event.preventDefault(); event.stopImmediatePropagation();
    const data = readData();
    const index = Math.max(0, Math.min(Number(data.activePage) || 0, (data.pages?.length || 1) - 1));
    const out = await composePage(index); if (!out) return;
    const link = document.createElement('a');
    link.download = `TeacherBoard-${index + 1}.png`;
    link.href = out.toDataURL('image/png');
    link.click();
  }

  async function exportPdf(event) {
    event.preventDefault(); event.stopImmediatePropagation();
    if (!window.jspdf?.jsPDF) { alert('Модуль PDF ще завантажується. Спробуйте через кілька секунд.'); return; }
    const data = readData(); if (!data.pages?.length) return;
    const { jsPDF } = window.jspdf;
    let pdf = null;
    for (let i = 0; i < data.pages.length; i++) {
      const out = await composePage(i); if (!out) continue;
      const orientation = out.height > out.width ? 'portrait' : 'landscape';
      if (!pdf) pdf = new jsPDF({ orientation, unit: 'px', format: [out.width, out.height], hotfixes: ['px_scaling'] });
      else pdf.addPage([out.width, out.height], orientation);
      pdf.addImage(out.toDataURL('image/jpeg', .92), 'JPEG', 0, 0, out.width, out.height);
    }
    pdf?.save(`TeacherBoard-заняття-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function bind() {
    document.getElementById('savePngBtn')?.addEventListener('click', exportPng, true);
    document.getElementById('saveLessonPdfBtn')?.addEventListener('click', exportPdf, true);
  }

  globalThis.TeacherBoardExport = { composePage };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
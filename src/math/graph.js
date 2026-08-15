import { activePage, uid } from '../core/state.js';
import { pushHistory } from '../core/history.js';

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function safeExpression(expr) {
  return String(expr || 'x').trim()
    .replaceAll('^', '**')
    .replace(/\bpi\b/gi, 'Math.PI')
    .replace(/\be\b/g, 'Math.E')
    .replace(/\bsin\b/g, 'Math.sin')
    .replace(/\bcos\b/g, 'Math.cos')
    .replace(/\btan\b/g, 'Math.tan')
    .replace(/\bsqrt\b/g, 'Math.sqrt')
    .replace(/\babs\b/g, 'Math.abs')
    .replace(/\bexp\b/g, 'Math.exp')
    .replace(/\bln\b/g, 'Math.log');
}

function evaluator(expr) {
  const body = safeExpression(expr);
  if (!/^[0-9xX+\-*/().,\s*MathPIEabcdefghijklmnopqrstuvwxyz]+$/i.test(body)) throw new Error('Недопустимий вираз');
  const fn = new Function('x', `"use strict"; return (${body});`);
  return x => {
    const y = Number(fn(x));
    return Number.isFinite(y) ? y : NaN;
  };
}

export class GraphManager {
  constructor({ state, layer, onChange }) {
    this.state = state;
    this.layer = layer;
    this.onChange = onChange;
    this.drag = null;
    window.addEventListener('pointermove', e => this.pointerMove(e));
    window.addEventListener('pointerup', () => this.pointerUp());
  }

  get graphs() { return activePage(this.state).objects.filter(o => o.kind === 'graph'); }

  add(expr = 'x') {
    pushHistory(this.state);
    const graph = {
      id: uid('graph'), kind: 'graph', expression: expr,
      x: 260, y: 120, w: 760, h: 560,
      rotation: 0, color: this.state.color,
      xMin: -10, xMax: 10, yMin: -10, yMax: 10,
      majorStep: 1
    };
    activePage(this.state).objects.push(graph);
    this.state.selection = graph.id;
    this.onChange?.();
    return graph;
  }

  renderObject(graph) {
    const el = document.createElement('div');
    el.className = `scene-object graph-object${graph.id === this.state.selection ? ' selected' : ''}`;
    el.dataset.id = graph.id;
    el.style.left = `${graph.x}px`;
    el.style.top = `${graph.y}px`;
    el.style.width = `${graph.w}px`;
    el.style.height = `${graph.h}px`;
    el.innerHTML = this.svg(graph);
    return el;
  }

  svg(g) {
    const width = 800, height = 600, pad = 44;
    const xToPx = x => pad + (x - g.xMin) / (g.xMax - g.xMin) * (width - pad * 2);
    const yToPx = y => height - pad - (y - g.yMin) / (g.yMax - g.yMin) * (height - pad * 2);
    const major = Math.max(0.1, Number(g.majorStep) || 1);
    const grid = [];
    const labels = [];

    const startX = Math.ceil(g.xMin / major) * major;
    for (let x = startX; x <= g.xMax + 1e-9; x += major) {
      const px = xToPx(x);
      grid.push(`<line class="graph-grid" x1="${px}" y1="${pad}" x2="${px}" y2="${height-pad}"/>`);
      if (Math.abs(x) > 1e-9) labels.push(`<text class="graph-label" x="${px}" y="${clamp(yToPx(0)+18,pad+16,height-pad+18)}" text-anchor="middle">${Number(x.toFixed(6))}</text>`);
    }
    const startY = Math.ceil(g.yMin / major) * major;
    for (let y = startY; y <= g.yMax + 1e-9; y += major) {
      const py = yToPx(y);
      grid.push(`<line class="graph-grid" x1="${pad}" y1="${py}" x2="${width-pad}" y2="${py}"/>`);
      if (Math.abs(y) > 1e-9) labels.push(`<text class="graph-label" x="${clamp(xToPx(0)-8,pad-8,width-pad-8)}" y="${py+4}" text-anchor="end">${Number(y.toFixed(6))}</text>`);
    }

    const axisX = g.yMin <= 0 && g.yMax >= 0 ? yToPx(0) : height - pad;
    const axisY = g.xMin <= 0 && g.xMax >= 0 ? xToPx(0) : pad;

    let path = '';
    try {
      const f = evaluator(g.expression);
      let drawing = false;
      const samples = Math.max(480, Math.round(g.w));
      for (let i=0;i<=samples;i++) {
        const x = g.xMin + (g.xMax-g.xMin) * i / samples;
        const y = f(x);
        if (!Number.isFinite(y) || y < g.yMin*4 || y > g.yMax*4) { drawing = false; continue; }
        const px=xToPx(x), py=yToPx(y);
        if (py < -height || py > height*2) { drawing = false; continue; }
        path += `${drawing ? 'L' : 'M'}${px.toFixed(2)},${py.toFixed(2)} `;
        drawing = true;
      }
    } catch {}

    return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="Графік y=${String(g.expression).replaceAll('"','&quot;')}">
      <rect class="graph-bg" x="1" y="1" width="798" height="598" rx="8"/>
      ${grid.join('')}
      <line class="graph-axis" x1="${pad}" y1="${axisX}" x2="${width-pad}" y2="${axisX}"/>
      <line class="graph-axis" x1="${axisY}" y1="${height-pad}" x2="${axisY}" y2="${pad}"/>
      <path class="graph-arrow" d="M${width-pad},${axisX} l-10,-5 m10,5 l-10,5 M${axisY},${pad} l-5,10 m5,-10 l5,10"/>
      ${labels.join('')}
      <text class="graph-axis-name" x="${width-pad-6}" y="${axisX-10}" text-anchor="end">x</text>
      <text class="graph-axis-name" x="${axisY+10}" y="${pad+14}">y</text>
      <text class="graph-title" x="${pad+8}" y="${pad-12}">y = ${String(g.expression).replaceAll('&','&amp;').replaceAll('<','&lt;')}</text>
      <path class="graph-curve" style="stroke:${g.color || '#245d55'}" d="${path.trim()}"/>
    </svg>`;
  }
}

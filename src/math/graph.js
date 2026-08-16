import { activePage, uid } from '../core/state.js';
import { pushHistory } from '../core/history.js';
import { MAX_GRAPH_EXPRESSION_LENGTH, limitText } from '../core/content-limits.js';

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const MAX_GRID_LINES = 240;
const MIN_SAMPLES = 480;
const MAX_SAMPLES = 1600;
const FUNCTIONS = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  exp: Math.exp,
  ln: Math.log
};
const CONSTANTS = { pi: Math.PI, e: Math.E };

function escapeText(value){
  return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}
function escapeAttribute(value){
  return escapeText(value).replaceAll('"','&quot;').replaceAll("'",'&#39;');
}
function safeColor(value){
  const color=String(value||'').trim();
  if(/^#[0-9a-f]{3,8}$/i.test(color))return color;
  if(/^rgba?\(\s*[-\d.%\s,]+\)$/i.test(color))return color;
  if(/^hsla?\(\s*[-\d.%\s,]+\)$/i.test(color))return color;
  return '#245d55';
}

function normalizeExpression(expr) {
  const raw=String(expr||'x');
  if(raw.length>MAX_GRAPH_EXPRESSION_LENGTH)throw new Error(`Вираз задовгий: максимум ${MAX_GRAPH_EXPRESSION_LENGTH} символів`);
  return raw
    .trim()
    .toLowerCase()
    .replaceAll('π', ' pi ')
    .replaceAll('−', '-')
    .replaceAll('–', '-')
    .replaceAll('×', '*')
    .replaceAll('·', '*')
    .replaceAll('÷', '/')
    .replace(/(\d),(\d)/g, '$1.$2');
}

function tokenize(expr) {
  const source = normalizeExpression(expr);
  const tokens = [];
  let i = 0;

  while (i < source.length) {
    const ch = source[i];
    if (/\s/.test(ch)) { i += 1; continue; }

    if (/[0-9.]/.test(ch)) {
      const match = source.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
      if (!match) throw new Error('Некоректне число');
      const value = Number(match[0]);
      if (!Number.isFinite(value)) throw new Error('Некоректне число');
      tokens.push({ type: 'number', value });
      i += match[0].length;
      continue;
    }

    if (/[a-z]/.test(ch)) {
      const match = source.slice(i).match(/^[a-z]+/);
      const name = match?.[0] || '';
      if (name === 'x') tokens.push({ type: 'variable' });
      else if (Object.hasOwn(CONSTANTS, name)) tokens.push({ type: 'constant', value: CONSTANTS[name], name });
      else if (Object.hasOwn(FUNCTIONS, name)) tokens.push({ type: 'function', name });
      else throw new Error(`Невідома назва: ${name}`);
      i += name.length;
      continue;
    }

    if ('+-*/^()'.includes(ch)) {
      tokens.push({ type: ch === '(' || ch === ')' ? 'paren' : 'operator', value: ch });
      i += 1;
      continue;
    }

    throw new Error(`Недопустимий символ: ${ch}`);
  }

  if (!tokens.length) throw new Error('Порожній вираз');
  return insertImplicitMultiplication(tokens);
}

function canEndValue(token) {
  return Boolean(token && (
    ['number', 'variable', 'constant'].includes(token.type)
    || (token.type === 'paren' && token.value === ')')
  ));
}

function canStartValue(token) {
  return Boolean(token && (
    ['number', 'variable', 'constant', 'function'].includes(token.type)
    || (token.type === 'paren' && token.value === '(')
  ));
}

function insertImplicitMultiplication(tokens) {
  const result = [];
  for (const token of tokens) {
    const prev = result.at(-1);
    if (canEndValue(prev) && canStartValue(token)) result.push({ type: 'operator', value: '*' });
    result.push(token);
  }
  return result;
}

function compileExpression(expr) {
  const tokens = tokenize(expr);
  let index = 0;
  const peek = () => tokens[index];
  const take = () => tokens[index++];

  function parseExpression() { return parseAddSub(); }

  function parseAddSub() {
    let left = parseMulDiv();
    while (peek()?.type === 'operator' && ['+', '-'].includes(peek().value)) {
      const op = take().value;
      const right = parseMulDiv();
      const a = left;
      left = x => op === '+' ? a(x) + right(x) : a(x) - right(x);
    }
    return left;
  }

  function parseMulDiv() {
    let left = parseUnary();
    while (peek()?.type === 'operator' && ['*', '/'].includes(peek().value)) {
      const op = take().value;
      const right = parseUnary();
      const a = left;
      left = x => op === '*' ? a(x) * right(x) : a(x) / right(x);
    }
    return left;
  }

  function parseUnary() {
    if (peek()?.type === 'operator' && ['+', '-'].includes(peek().value)) {
      const op = take().value;
      const value = parseUnary();
      return x => op === '-' ? -value(x) : value(x);
    }
    return parsePower();
  }

  function parsePower() {
    let base = parsePrimary();
    if (peek()?.type === 'operator' && peek().value === '^') {
      take();
      const exponent = parseUnary();
      const a = base;
      base = x => a(x) ** exponent(x);
    }
    return base;
  }

  function parsePrimary() {
    const token = take();
    if (!token) throw new Error('Незавершений вираз');
    if (token.type === 'number') return () => token.value;
    if (token.type === 'variable') return x => x;
    if (token.type === 'constant') return () => token.value;

    if (token.type === 'function') {
      const open = take();
      if (open?.type !== 'paren' || open.value !== '(') throw new Error('Після функції потрібні дужки');
      const argument = parseExpression();
      const close = take();
      if (close?.type !== 'paren' || close.value !== ')') throw new Error('Не закрито дужку');
      const fn = FUNCTIONS[token.name];
      return x => fn(argument(x));
    }

    if (token.type === 'paren' && token.value === '(') {
      const value = parseExpression();
      const close = take();
      if (close?.type !== 'paren' || close.value !== ')') throw new Error('Не закрито дужку');
      return value;
    }

    throw new Error('Очікується число, x, функція або дужки');
  }

  const compiled = parseExpression();
  if (index !== tokens.length) throw new Error('Зайві символи у виразі');
  return x => {
    const y = Number(compiled(Number(x)));
    return Number.isFinite(y) ? y : NaN;
  };
}

function finite(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function adaptiveGridStep(min, max, requestedStep, maxLines = MAX_GRID_LINES) {
  const range = Math.max(1e-12, Math.abs(max - min));
  const base = Math.max(0.1, Math.abs(finite(requestedStep, 1)));
  const desired = range / base;
  const multiplier = Math.max(1, Math.ceil(desired / Math.max(1, maxLines)));
  return base * multiplier;
}

export function graphSampleCount(width) {
  return clamp(Math.round(finite(width, 760)), MIN_SAMPLES, MAX_SAMPLES);
}

export function evaluateExpression(expression, x) {
  return compileExpression(expression)(x);
}

export function createGraphObject(state, expression = 'x') {
  const safeExpression=limitText(expression,MAX_GRAPH_EXPRESSION_LENGTH,'x').trim()||'x';
  return {
    id: uid('graph'), kind: 'graph', expression:safeExpression,
    x: 260, y: 120, w: 760, h: 560,
    rotation: 0, color: state.color,
    xMin: -10, xMax: 10, yMin: -10, yMax: 10,
    majorStep: 1
  };
}

export function graphSvg(g) {
  const width = 800, height = 600, pad = 44;
  const rawXMin=finite(g.xMin,-10),rawXMax=finite(g.xMax,10),rawYMin=finite(g.yMin,-10),rawYMax=finite(g.yMax,10);
  const xMin=rawXMin, xMax=rawXMax>xMin?rawXMax:xMin+20;
  const yMin=rawYMin, yMax=rawYMax>yMin?rawYMax:yMin+20;
  const xToPx = x => pad + (x - xMin) / (xMax - xMin) * (width - pad * 2);
  const yToPx = y => height - pad - (y - yMin) / (yMax - yMin) * (height - pad * 2);
  const requestedMajor = Math.max(0.1, finite(g.majorStep,1));
  const xMajor = adaptiveGridStep(xMin,xMax,requestedMajor);
  const yMajor = adaptiveGridStep(yMin,yMax,requestedMajor);
  const grid = [];
  const labels = [];

  for (let x = Math.ceil(xMin / xMajor) * xMajor; x <= xMax + 1e-9; x += xMajor) {
    const px = xToPx(x);
    grid.push(`<line class="graph-grid" x1="${px}" y1="${pad}" x2="${px}" y2="${height-pad}"/>`);
    if (Math.abs(x) > 1e-9) labels.push(`<text class="graph-label" x="${px}" y="${clamp(yToPx(0)+18,pad+16,height-pad+18)}" text-anchor="middle">${Number(x.toFixed(6))}</text>`);
  }
  for (let y = Math.ceil(yMin / yMajor) * yMajor; y <= yMax + 1e-9; y += yMajor) {
    const py = yToPx(y);
    grid.push(`<line class="graph-grid" x1="${pad}" y1="${py}" x2="${width-pad}" y2="${py}"/>`);
    if (Math.abs(y) > 1e-9) labels.push(`<text class="graph-label" x="${clamp(xToPx(0)-8,pad-8,width-pad-8)}" y="${py+4}" text-anchor="end">${Number(y.toFixed(6))}</text>`);
  }

  const axisX = yMin <= 0 && yMax >= 0 ? yToPx(0) : height - pad;
  const axisY = xMin <= 0 && xMax >= 0 ? xToPx(0) : pad;
  let path = '';
  let error = '';

  try {
    const f = compileExpression(g.expression);
    let drawing = false;
    const samples = graphSampleCount(g.w);
    for (let i=0;i<=samples;i++) {
      const x = xMin + (xMax-xMin) * i / samples;
      const y = f(x);
      if (!Number.isFinite(y) || y < yMin*4 || y > yMax*4) { drawing = false; continue; }
      const px=xToPx(x), py=yToPx(y);
      if (py < -height || py > height*2) { drawing = false; continue; }
      path += `${drawing ? 'L' : 'M'}${px.toFixed(2)},${py.toFixed(2)} `;
      drawing = true;
    }
  } catch {
    error = 'Некоректний вираз';
  }

  const rawTitle=limitText(g.expression,MAX_GRAPH_EXPRESSION_LENGTH,'x');
  const title=escapeText(rawTitle);
  const ariaTitle=escapeAttribute(rawTitle);
  const curveColor=safeColor(g.color);
  return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="Графік y=${ariaTitle}">
    <rect class="graph-bg" x="1" y="1" width="798" height="598" rx="8"/>
    ${grid.join('')}
    <line class="graph-axis" x1="${pad}" y1="${axisX}" x2="${width-pad}" y2="${axisX}"/>
    <line class="graph-axis" x1="${axisY}" y1="${height-pad}" x2="${axisY}" y2="${pad}"/>
    <path class="graph-arrow" d="M${width-pad},${axisX} l-10,-5 m10,5 l-10,5 M${axisY},${pad} l-5,10 m5,-10 l5,10"/>
    ${labels.join('')}
    <text class="graph-axis-name" x="${width-pad-6}" y="${axisX-10}" text-anchor="end">x</text>
    <text class="graph-axis-name" x="${axisY+10}" y="${pad+14}">y</text>
    <text class="graph-title" x="${pad+8}" y="${pad-12}">y = ${title}</text>
    ${error ? `<text class="graph-error" x="400" y="300" text-anchor="middle">${error}</text>` : `<path class="graph-curve" style="stroke:${curveColor}" d="${path.trim()}"/>`}
  </svg>`;
}

export class GraphManager {
  constructor({ state, onChange }) { this.state = state; this.onChange = onChange; }
  add(expr = 'x') {
    pushHistory(this.state);
    const graph = createGraphObject(this.state, expr);
    activePage(this.state).objects.push(graph);
    this.state.selection = graph.id;
    this.onChange?.();
    return graph;
  }
}
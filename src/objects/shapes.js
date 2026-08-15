export const SHAPE_LABELS = {
  line: 'Лінія',
  rect: 'Прямокутник',
  ellipse: 'Коло',
  triangle: 'Трикутник',
  rightTriangle: 'Прямокутний трикутник',
  parallelogram: 'Паралелограм',
  trapezoid: 'Трапеція',
  rhombus: 'Ромб',
  angle: 'Кут',
  arc: 'Дуга'
};

export function shapeSvg(obj) {
  const sw = Math.max(1, Number(obj.lineWidth) || 4);
  const stroke = `stroke="currentColor" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"`;
  const wrap = body => `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${body}</svg>`;

  switch (obj.shape) {
    case 'line': return wrap(`<line x1="3" y1="97" x2="97" y2="3" ${stroke}/>`);
    case 'rect': return wrap(`<rect x="3" y="3" width="94" height="94" ${stroke}/>`);
    case 'ellipse': return wrap(`<ellipse cx="50" cy="50" rx="47" ry="47" ${stroke}/>`);
    case 'triangle': return wrap(`<path d="M50 3 L97 97 L3 97 Z" ${stroke}/>`);
    case 'rightTriangle': return wrap(`<path d="M4 4 L4 96 L96 96 Z" ${stroke}/>`);
    case 'parallelogram': return wrap(`<path d="M25 4 H97 L75 96 H3 Z" ${stroke}/>`);
    case 'trapezoid': return wrap(`<path d="M22 4 H78 L97 96 H3 Z" ${stroke}/>`);
    case 'rhombus': return wrap(`<path d="M50 3 L97 50 L50 97 L3 50 Z" ${stroke}/>`);
    case 'angle': return wrap(`<path d="M95 92 H57 L4 8" ${stroke}/><path d="M73 92 A18 18 0 0 0 47 76" ${stroke}/>`);
    case 'arc': return wrap(`<path d="M4 78 Q50 4 96 78" ${stroke}/>`);
    default: return '';
  }
}

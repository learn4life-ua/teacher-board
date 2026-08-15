export const SHAPE_LABELS = {
  line: 'Лінія', arrow: 'Стрілка', rect: 'Прямокутник', ellipse: 'Коло', triangle: 'Трикутник',
  rightTriangle: 'Прямокутний трикутник', parallelogram: 'Паралелограм', trapezoid: 'Трапеція',
  rhombus: 'Ромб', angle: 'Кут', arc: 'Дуга', axes: 'Координатні осі', numberLine: 'Числова пряма',
  xyTable: 'Таблиця x / y'
};

export function shapeSvg(obj) {
  const sw=Math.max(1,Number(obj.lineWidth)||4);
  const stroke=`stroke="currentColor" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"`;
  const wrap=body=>`<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${body}</svg>`;
  switch(obj.shape){
    case 'segment': return wrap(`<line x1="2" y1="50" x2="98" y2="50" ${stroke}/>`);
    case 'line': return wrap(`<line x1="3" y1="97" x2="97" y2="3" ${stroke}/>`);
    case 'arrow': return arrowSvg(stroke,wrap);
    case 'rect': return wrap(`<rect x="3" y="3" width="94" height="94" ${stroke}/>`);
    case 'ellipse': return wrap(`<ellipse cx="50" cy="50" rx="47" ry="47" ${stroke}/>`);
    case 'triangle': return wrap(`<path d="M50 3 L97 97 L3 97 Z" ${stroke}/>`);
    case 'rightTriangle': return wrap(`<path d="M4 4 L4 96 L96 96 Z" ${stroke}/>`);
    case 'parallelogram': return wrap(`<path d="M25 4 H97 L75 96 H3 Z" ${stroke}/>`);
    case 'trapezoid': return wrap(`<path d="M22 4 H78 L97 96 H3 Z" ${stroke}/>`);
    case 'rhombus': return wrap(`<path d="M50 3 L97 50 L50 97 L3 50 Z" ${stroke}/>`);
    case 'angle': return wrap(`<path d="M95 92 H57 L4 8" ${stroke}/><path d="M73 92 A18 18 0 0 0 47 76" ${stroke}/>`);
    case 'arc': return wrap(`<path d="M4 78 Q50 4 96 78" ${stroke}/>`);
    case 'circleArc': return circleArcSvg(obj,stroke,wrap);
    case 'axes': return axesSvg(stroke);
    case 'numberLine': return numberLineSvg(stroke);
    case 'xyTable': return xyTableSvg(stroke);
    default:return '';
  }
}

function arrowSvg(stroke,wrap){return wrap(`<line x1="5" y1="50" x2="92" y2="50" ${stroke}/><path d="M76 34 L94 50 L76 66" ${stroke}/>`);}

function circleArcSvg(obj,stroke,wrap){
  const start=(Number(obj.startDeg)||0)*Math.PI/180,end=(Number(obj.endDeg)||180)*Math.PI/180;
  const x1=50+46*Math.cos(start),y1=50-46*Math.sin(start),x2=50+46*Math.cos(end),y2=50-46*Math.sin(end);
  let delta=(Number(obj.endDeg)||180)-(Number(obj.startDeg)||0);while(delta<0)delta+=360;while(delta>360)delta-=360;
  const large=delta>180?1:0;
  return wrap(`<path d="M${x1.toFixed(2)} ${y1.toFixed(2)} A46 46 0 ${large} 0 ${x2.toFixed(2)} ${y2.toFixed(2)}" ${stroke}/>`);
}

function axesSvg(stroke){
  const ticks=[];for(let i=10;i<=90;i+=10){if(i===50)continue;const value=(i-50)/10;ticks.push(`<line x1="${i}" y1="48" x2="${i}" y2="52" ${stroke}/><line x1="48" y1="${100-i}" x2="52" y2="${100-i}" ${stroke}/><text x="${i}" y="57" text-anchor="middle" class="scale-label">${value}</text><text x="44" y="${100-i+2}" text-anchor="end" class="scale-label">${value}</text>`);}return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><marker id="tbArrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="currentColor"/></marker></defs><g opacity=".25" stroke="currentColor" stroke-width=".35">${Array.from({length:9},(_,k)=>{const p=(k+1)*10;return `<line x1="${p}" y1="5" x2="${p}" y2="95"/><line x1="5" y1="${p}" x2="95" y2="${p}"/>`;}).join('')}</g><line x1="5" y1="50" x2="96" y2="50" ${stroke} marker-end="url(#tbArrow)"/><line x1="50" y1="95" x2="50" y2="4" ${stroke} marker-end="url(#tbArrow)"/>${ticks.join('')}<text x="94" y="46" class="axis-label">x</text><text x="54" y="8" class="axis-label">y</text><text x="46" y="57" class="scale-label">0</text></svg>`;
}
function numberLineSvg(stroke){const ticks=[];for(let n=-5;n<=5;n++){const x=50+n*8.5;ticks.push(`<line x1="${x}" y1="43" x2="${x}" y2="57" ${stroke}/><text x="${x}" y="70" text-anchor="middle" class="scale-label">${n}</text>`);}return `<svg viewBox="0 0 100 100" aria-hidden="true"><line x1="4" y1="50" x2="96" y2="50" ${stroke}/>${ticks.join('')}</svg>`;}
function xyTableSvg(stroke){
  const vertical=[20,40,60,80].map(x=>`<line x1="${x}" y1="5" x2="${x}" y2="95" ${stroke}/>`).join('');
  const horizontal=[50].map(y=>`<line x1="5" y1="${y}" x2="95" y2="${y}" ${stroke}/>`).join('');
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="5" y="5" width="90" height="90" ${stroke}/>${vertical}${horizontal}<text x="12.5" y="31" text-anchor="middle" class="axis-label">x</text><text x="12.5" y="76" text-anchor="middle" class="axis-label">y</text></svg>`;
}

(() => {
  'use strict';

  function strokeAttrs(item = {}) {
    const width = Math.max(1, Number(item.lineWidth) || 4);
    return `stroke="currentColor" stroke-width="${width}" fill="none" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"`;
  }

  function geometrySvg(item, s) {
    switch (item.shape) {
      case 'line':
        return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1="2" y1="98" x2="98" y2="2" ${s}/></svg>`;
      case 'arrow':
        return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1="3" y1="97" x2="94" y2="6" ${s}/><path d="M94 6 L82 8 M94 6 L92 18" ${s}/></svg>`;
      case 'rect':
        return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x="3" y="3" width="94" height="94" ${s}/></svg>`;
      case 'ellipse':
        return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><ellipse cx="50" cy="50" rx="47" ry="47" ${s}/></svg>`;
      case 'triangle':
        return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M50 3 L97 97 L3 97 Z" ${s}/></svg>`;
      case 'rightTriangle':
        return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M4 4 L4 96 L96 96 Z" ${s}/></svg>`;
      case 'parallelogram':
        return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M25 4 H97 L75 96 H3 Z" ${s}/></svg>`;
      case 'trapezoid':
        return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M22 4 H78 L97 96 H3 Z" ${s}/></svg>`;
      case 'rhombus':
        return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M50 3 L97 50 L50 97 L3 50 Z" ${s}/></svg>`;
      case 'angle':
        return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M95 92 H57 L4 8" ${s}/><path d="M73 92 A18 18 0 0 0 47 76" ${s}/></svg>`;
      case 'arc':
        return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M4 78 Q50 4 96 78" ${s}/></svg>`;
      default:
        return '';
    }
  }

  function numberLineSvg(item, s) {
    let min = -5;
    let max = 5;
    let labels = true;

    if (item.shape === 'number10') {
      min = -10;
      max = 10;
    } else if (item.shape === 'numberBlank') {
      labels = false;
    }

    const count = max - min;
    const parts = [
      `<line x1="4" y1="50" x2="96" y2="50" ${s}/>` ,
      `<path d="M96 50 L91 46 M96 50 L91 54" ${s}/>`
    ];

    for (let i = 0; i <= count; i += 1) {
      const x = 6 + i * (88 / count);
      const value = min + i;
      parts.push(`<line x1="${x}" y1="43" x2="${x}" y2="57" ${s}/>`);

      const showLabel = labels && (item.shape !== 'number10' || value % 2 === 0);
      if (showLabel) {
        parts.push(`<text x="${x}" y="76" text-anchor="middle" font-size="${item.shape === 'number10' ? 7 : 9}" fill="currentColor" stroke="none">${value}</text>`);
      }
    }

    return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${parts.join('')}</svg>`;
  }

  function axesSvg(s) {
    return `<svg viewBox="0 0 100 100" aria-hidden="true">
      <line x1="5" y1="50" x2="95" y2="50" ${s}/>
      <line x1="50" y1="95" x2="50" y2="5" ${s}/>
      <path d="M95 50 L90 46 M95 50 L90 54 M50 5 L46 10 M50 5 L54 10" ${s}/>
      <text x="92" y="45" font-size="7" fill="currentColor" stroke="none">x</text>
      <text x="54" y="10" font-size="7" fill="currentColor" stroke="none">y</text>
      <text x="53" y="59" font-size="6" fill="currentColor" stroke="none">0</text>
    </svg>`;
  }

  function tableSvg(s) {
    return `<svg viewBox="0 0 100 70" preserveAspectRatio="none" aria-hidden="true">
      <rect x="3" y="3" width="94" height="64" ${s}/>
      <line x1="50" y1="3" x2="50" y2="67" ${s}/>
      <line x1="3" y1="20" x2="97" y2="20" ${s}/>
      <line x1="3" y1="36" x2="97" y2="36" ${s}/>
      <line x1="3" y1="52" x2="97" y2="52" ${s}/>
      <text x="25" y="15" text-anchor="middle" font-size="10" fill="currentColor" stroke="none">x</text>
      <text x="75" y="15" text-anchor="middle" font-size="10" fill="currentColor" stroke="none">y</text>
    </svg>`;
  }

  function shapeSvg(item = {}) {
    const s = strokeAttrs(item);
    if (String(item.shape).startsWith('number')) return numberLineSvg(item, s);
    if (item.shape === 'axes') return axesSvg(s);
    if (item.shape === 'xyTable') return tableSvg(s);
    return geometrySvg(item, s);
  }

  globalThis.TeacherBoardObjects = {
    shapeSvg,
    renderShapeSvg: shapeSvg
  };
})();

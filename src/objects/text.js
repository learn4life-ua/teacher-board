function safeColor(value) {
  const color=String(value||'').trim();
  if(/^#[0-9a-f]{3,8}$/i.test(color))return color;
  if(/^rgba?\(\s*[-\d.%\s,]+\)$/i.test(color))return color;
  if(/^hsla?\(\s*[-\d.%\s,]+\)$/i.test(color))return color;
  return '#18342f';
}

export function textMarkup(obj) {
  const text = String(obj.text ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('\n','<br>');
  const size = Math.max(14, Math.min(160, Number(obj.fontSize) || 32));
  const color=safeColor(obj.color);
  return `<div class="text-object-content" style="font-size:${size}px;color:${color}">${text}</div>`;
}

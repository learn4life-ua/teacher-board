export function textMarkup(obj) {
  const text = String(obj.text ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('\n','<br>');
  const size = Math.max(14, Number(obj.fontSize) || 32);
  return `<div class="text-object-content" style="font-size:${size}px;color:${obj.color || '#18342f'}">${text}</div>`;
}

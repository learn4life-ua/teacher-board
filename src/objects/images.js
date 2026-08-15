import { uid } from '../core/state.js';

export function createImageObject(src, naturalWidth = 800, naturalHeight = 600) {
  const maxW = 720, maxH = 520;
  const scale = Math.min(1, maxW / Math.max(1, naturalWidth), maxH / Math.max(1, naturalHeight));
  return {
    id: uid('image'), kind: 'image', src,
    x: 320, y: 150,
    w: Math.max(120, naturalWidth * scale),
    h: Math.max(90, naturalHeight * scale),
    rotation: 0
  };
}

export function imageMarkup(obj) {
  const safe = String(obj.src || '').replaceAll('&','&amp;').replaceAll('"','&quot;');
  return `<img class="board-image" src="${safe}" alt="Вставлене зображення" draggable="false">`;
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Не вдалося прочитати файл'));
    reader.readAsDataURL(file);
  });
}

export function readImageSize(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || 800, height: img.naturalHeight || 600 });
    img.onerror = () => reject(new Error('Не вдалося відкрити зображення'));
    img.src = src;
  });
}

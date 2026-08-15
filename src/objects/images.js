import { uid } from '../core/state.js';

const MAX_SOURCE_DIMENSION = 1600;
const TARGET_DATA_URL_LENGTH = 1_250_000;

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

function fileReaderDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Не вдалося прочитати файл'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Не вдалося відкрити зображення'));
    img.src = src;
  });
}

function webpDataUrl(canvas, quality) {
  const value = canvas.toDataURL('image/webp', quality);
  return value.startsWith('data:image/webp') ? value : canvas.toDataURL('image/jpeg', quality);
}

export async function fileToDataUrl(file) {
  const original = await fileReaderDataUrl(file);
  const img = await loadImage(original);
  const naturalWidth = img.naturalWidth || 1;
  const naturalHeight = img.naturalHeight || 1;
  const scale = Math.min(1, MAX_SOURCE_DIMENSION / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));

  // Small images are already efficient enough and keeping them untouched preserves fidelity.
  if (scale === 1 && original.length <= TARGET_DATA_URL_LENGTH) return original;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return original;
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.88;
  let optimized = webpDataUrl(canvas, quality);
  while (optimized.length > TARGET_DATA_URL_LENGTH && quality > 0.54) {
    quality -= 0.08;
    optimized = webpDataUrl(canvas, quality);
  }

  // Never replace a compact original with a larger encoded copy.
  return optimized.length < original.length ? optimized : original;
}

export function readImageSize(src) {
  return loadImage(src).then(img => ({
    width: img.naturalWidth || 800,
    height: img.naturalHeight || 600
  }));
}

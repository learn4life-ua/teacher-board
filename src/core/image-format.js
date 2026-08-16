const SAFE_IMAGE_TYPES = new Set(['image/png','image/jpeg','image/webp','image/gif','image/avif']);
const SAFE_DATA_URL = /^data:image\/(?:png|jpe?g|webp|gif|avif);/i;

export function isSafeImageType(type){return SAFE_IMAGE_TYPES.has(String(type||'').toLowerCase());}
export function isSafeImageDataUrl(src){return SAFE_DATA_URL.test(String(src||''));}

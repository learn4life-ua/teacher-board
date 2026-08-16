import { activePage, DEFAULT_PAGE_WIDTH, DEFAULT_PAGE_HEIGHT } from './state.js';

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 2;
export const ZOOM_STEP = 0.25;

export function normalizeZoom(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, numeric));
  return Math.round(clamped / ZOOM_STEP) * ZOOM_STEP;
}

export function sceneDeltaFromClient(dx, dy, zoom = 1) {
  const z = normalizeZoom(zoom) || 1;
  return { x: dx / z, y: dy / z };
}

export function sceneDeltaToLocalAxes(dx, dy, rotation = 0) {
  const rad = (Number(rotation) || 0) * Math.PI / 180;
  return {
    x: dx * Math.cos(rad) + dy * Math.sin(rad),
    y: -dx * Math.sin(rad) + dy * Math.cos(rad)
  };
}

export function scenePointFromClient({ clientX, clientY, rectLeft, rectTop, zoom = 1 }) {
  const delta = sceneDeltaFromClient(clientX - rectLeft, clientY - rectTop, zoom);
  return { x: delta.x, y: delta.y };
}

export class Scene {
  constructor({ viewport, scene, zoomLabel, state }) {
    this.viewport = viewport;
    this.scene = scene;
    this.zoomLabel = zoomLabel;
    this.state = state;
    this.lastWidth = 0;
    this.lastHeight = 0;
    this.applyZoom();
  }

  setZoom(value) {
    this.state.zoom = normalizeZoom(value);
    this.applyZoom();
  }

  size() {
    const page = activePage(this.state) || {};
    return {
      width: Math.max(320, Number(page.width) || DEFAULT_PAGE_WIDTH),
      height: Math.max(320, Number(page.height) || DEFAULT_PAGE_HEIGHT)
    };
  }

  applyDimensions() {
    const { width, height } = this.size();
    if (width === this.lastWidth && height === this.lastHeight) return;
    this.lastWidth = width;
    this.lastHeight = height;

    Object.assign(this.scene.style, { width: `${width}px`, height: `${height}px` });
    this.viewport.style.setProperty('--scene-width', `${width}px`);
    this.viewport.style.setProperty('--scene-height', `${height}px`);

    const canvas = this.scene.querySelector('canvas');
    if (canvas && (canvas.width !== width || canvas.height !== height)) {
      canvas.width = width;
      canvas.height = height;
    }
    for (const layer of this.scene.querySelectorAll('.object-layer,.instrument-layer')) {
      Object.assign(layer.style, { width: `${width}px`, height: `${height}px` });
    }
  }

  applyZoom() {
    this.applyDimensions();
    const z = normalizeZoom(this.state.zoom || 1);
    this.state.zoom = z;
    this.scene.style.transform = `scale(${z})`;
    this.scene.style.transformOrigin = 'top left';
    this.viewport.style.setProperty('--scene-zoom', z);
    if (this.zoomLabel) this.zoomLabel.textContent = `${Math.round(z * 100)}%`;
  }

  pointFromEvent(e) {
    const rect = this.scene.getBoundingClientRect();
    return scenePointFromClient({
      clientX: e.clientX,
      clientY: e.clientY,
      rectLeft: rect.left,
      rectTop: rect.top,
      zoom: this.state.zoom || 1
    });
  }
}

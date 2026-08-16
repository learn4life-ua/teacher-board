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
    this.applyZoom();
  }

  setZoom(value) {
    this.state.zoom = normalizeZoom(value);
    this.applyZoom();
  }

  applyZoom() {
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

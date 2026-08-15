export class Scene {
  constructor({ viewport, scene, zoomLabel, state }) {
    this.viewport = viewport;
    this.scene = scene;
    this.zoomLabel = zoomLabel;
    this.state = state;
    this.applyZoom();
  }

  setZoom(value) {
    this.state.zoom = Math.max(0.5, Math.min(2, Math.round(value * 10) / 10));
    this.applyZoom();
  }

  applyZoom() {
    const z = this.state.zoom || 1;
    this.scene.style.transform = `scale(${z})`;
    this.scene.style.transformOrigin = 'top left';
    this.viewport.style.setProperty('--scene-zoom', z);
    if (this.zoomLabel) this.zoomLabel.textContent = `${Math.round(z * 100)}%`;
  }

  pointFromEvent(e) {
    const rect = this.scene.getBoundingClientRect();
    const z = this.state.zoom || 1;
    return {
      x: (e.clientX - rect.left) / z,
      y: (e.clientY - rect.top) / z
    };
  }
}

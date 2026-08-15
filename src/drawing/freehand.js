import { activePage, uid } from '../core/state.js';
import { pushHistory } from '../core/history.js';

export class FreehandDrawing {
  constructor({ state, canvas, scene, onChange }) {
    this.state = state;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.scene = scene;
    this.onChange = onChange;
    this.current = null;
    this.bind();
  }

  bind() {
    this.canvas.addEventListener('pointerdown', e => this.down(e));
    this.canvas.addEventListener('pointermove', e => this.move(e));
    window.addEventListener('pointerup', e => this.up(e));
  }

  down(e) {
    if (!['pen', 'marker', 'eraser'].includes(this.state.tool)) return;
    e.preventDefault();
    pushHistory(this.state);
    const p = this.scene.pointFromEvent(e);
    this.current = {
      id: uid('stroke'),
      tool: this.state.tool,
      color: this.state.color,
      width: this.state.lineWidth,
      points: [p]
    };
    activePage(this.state).strokes.push(this.current);
    this.render();
  }

  move(e) {
    if (!this.current) return;
    this.current.points.push(this.scene.pointFromEvent(e));
    this.render();
  }

  up() {
    if (!this.current) return;
    this.current = null;
    this.onChange?.();
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const stroke of activePage(this.state).strokes) this.drawStroke(stroke);
  }

  drawStroke(stroke) {
    const pts = stroke.points || [];
    if (!pts.length) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = stroke.tool === 'marker' ? Math.max(14, stroke.width * 3) : Math.max(1, stroke.width);
    ctx.globalAlpha = stroke.tool === 'marker' ? 0.24 : 1;
    ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    if (pts.length === 1) ctx.lineTo(pts[0].x + 0.01, pts[0].y + 0.01);
    ctx.stroke();
    ctx.restore();
  }
}

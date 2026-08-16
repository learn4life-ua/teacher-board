import { activePage, uid } from '../core/state.js';
import { pushHistory } from '../core/history.js';
import { MAX_STROKES_PER_PAGE, MAX_POINTS_PER_STROKE } from '../core/content-limits.js';

const MIN_POINT_DISTANCE = 0.5;

export class FreehandDrawing {
  constructor({ state, canvas, scene, onChange }) {
    this.state = state;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.scene = scene;
    this.onChange = onChange;
    this.current = null;
    this.pointerId = null;
    this.bind();
  }

  bind() {
    this.canvas.addEventListener('pointerdown', e => this.down(e));
    this.canvas.addEventListener('pointermove', e => this.move(e));
    window.addEventListener('pointerup', e => this.up(e));
    window.addEventListener('pointercancel', e => this.up(e));
    window.addEventListener('blur', () => this.up());
  }

  matchesPointer(e) {
    return this.pointerId === null || e?.pointerId === undefined || e.pointerId === this.pointerId;
  }

  down(e) {
    if (!['pen', 'marker', 'eraser'].includes(this.state.tool) || this.current) return;
    const page=activePage(this.state);
    if(page.strokes.length>=MAX_STROKES_PER_PAGE)return;
    e.preventDefault();
    pushHistory(this.state);
    const p = this.scene.pointFromEvent(e);
    this.pointerId = e.pointerId ?? null;
    this.current = {
      id: uid('stroke'),
      tool: this.state.tool,
      color: this.state.color,
      width: this.state.lineWidth,
      points: [p]
    };
    page.strokes.push(this.current);
    this.render();
  }

  move(e) {
    if (!this.current || !this.matchesPointer(e) || this.current.points.length>=MAX_POINTS_PER_STROKE) return;
    const p=this.scene.pointFromEvent(e),last=this.current.points.at(-1);
    if(last&&Math.hypot(p.x-last.x,p.y-last.y)<MIN_POINT_DISTANCE)return;
    this.current.points.push(p);
    this.render();
  }

  up(e) {
    if (!this.current || !this.matchesPointer(e)) return;
    this.current = null;
    this.pointerId = null;
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
    const isMarker = stroke.tool === 'marker';
    const isEraser = stroke.tool === 'eraser';

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
    ctx.lineWidth = isEraser
      ? Math.max(18, stroke.width * 4)
      : isMarker
        ? Math.max(14, stroke.width * 3)
        : Math.max(1, stroke.width);
    ctx.globalAlpha = isMarker ? 0.24 : 1;
    ctx.strokeStyle = isEraser ? 'rgba(0,0,0,1)' : stroke.color;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    if (pts.length === 1) ctx.lineTo(pts[0].x + 0.01, pts[0].y + 0.01);
    ctx.stroke();
    ctx.restore();
  }
}

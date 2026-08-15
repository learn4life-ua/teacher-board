import { activePage, uid } from '../core/state.js';
import { pushHistory } from '../core/history.js';
import { shapeSvg } from './shapes.js';

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export class ObjectManager {
  constructor({ state, layer, onChange }) {
    this.state = state;
    this.layer = layer;
    this.onChange = onChange;
    this.drag = null;
    this.bindGlobalPointerEvents();
  }

  get objects() { return activePage(this.state).objects; }

  addShape(shape, box) {
    pushHistory(this.state);
    const obj = {
      id: uid('shape'), kind: 'shape', shape,
      x: box.x, y: box.y, w: Math.max(40, box.w), h: Math.max(40, box.h),
      rotation: 0, color: this.state.color, lineWidth: this.state.lineWidth
    };
    this.objects.push(obj);
    this.state.selection = obj.id;
    this.changed();
    return obj;
  }

  selected() { return this.objects.find(o => o.id === this.state.selection) || null; }

  select(id) {
    this.state.selection = id || null;
    this.render();
  }

  deleteSelected() {
    const id = this.state.selection;
    if (!id) return;
    const index = this.objects.findIndex(o => o.id === id);
    if (index < 0) return;
    pushHistory(this.state);
    this.objects.splice(index, 1);
    this.state.selection = null;
    this.changed();
  }

  updateSelected(patch) {
    const obj = this.selected();
    if (!obj) return;
    pushHistory(this.state);
    Object.assign(obj, patch);
    this.changed();
  }

  render() {
    this.layer.innerHTML = '';
    for (const obj of this.objects) this.layer.appendChild(this.createElement(obj));
  }

  createElement(obj) {
    const el = document.createElement('div');
    el.className = `scene-object${obj.id === this.state.selection ? ' selected' : ''}`;
    el.dataset.id = obj.id;
    el.style.left = `${obj.x}px`;
    el.style.top = `${obj.y}px`;
    el.style.width = `${obj.w}px`;
    el.style.height = `${obj.h}px`;
    el.style.color = obj.color || '#245d55';
    el.style.transform = `rotate(${obj.rotation || 0}deg)`;
    el.innerHTML = obj.kind === 'shape' ? shapeSvg(obj) : '';

    if (obj.id === this.state.selection) {
      el.insertAdjacentHTML('beforeend', `
        <span class="object-handle resize-handle" data-handle="resize" title="Змінити розмір"></span>
        <span class="object-handle rotate-handle" data-handle="rotate" title="Повернути">↻</span>
        <button class="object-delete" type="button" title="Видалити">×</button>`);
    }

    el.addEventListener('pointerdown', e => this.pointerDownObject(e, obj));
    el.querySelector('.object-delete')?.addEventListener('pointerdown', e => e.stopPropagation());
    el.querySelector('.object-delete')?.addEventListener('click', e => { e.stopPropagation(); this.deleteSelected(); });
    return el;
  }

  pointerDownObject(e, obj) {
    if (this.state.tool !== 'select') return;
    e.preventDefault();
    e.stopPropagation();
    this.select(obj.id);
    const handle = e.target.closest('[data-handle]')?.dataset.handle;
    pushHistory(this.state);
    this.drag = {
      mode: handle || 'move', id: obj.id,
      startX: e.clientX, startY: e.clientY,
      x: obj.x, y: obj.y, w: obj.w, h: obj.h,
      rotation: obj.rotation || 0,
      center: { x: obj.x + obj.w / 2, y: obj.y + obj.h / 2 }
    };
  }

  bindGlobalPointerEvents() {
    window.addEventListener('pointermove', e => this.pointerMove(e));
    window.addEventListener('pointerup', () => this.pointerUp());
  }

  pointerMove(e) {
    if (!this.drag) return;
    const obj = this.objects.find(o => o.id === this.drag.id);
    if (!obj) return;
    const scale = this.state.zoom || 1;
    const dx = (e.clientX - this.drag.startX) / scale;
    const dy = (e.clientY - this.drag.startY) / scale;

    if (this.drag.mode === 'move') {
      obj.x = clamp(this.drag.x + dx, -obj.w + 20, 1580);
      obj.y = clamp(this.drag.y + dy, -obj.h + 20, 880);
    } else if (this.drag.mode === 'resize') {
      obj.w = Math.max(40, this.drag.w + dx);
      obj.h = Math.max(40, this.drag.h + dy);
    } else if (this.drag.mode === 'rotate') {
      const rect = this.layer.getBoundingClientRect();
      const cx = rect.left + this.drag.center.x * scale;
      const cy = rect.top + this.drag.center.y * scale;
      obj.rotation = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI + 90;
    }
    this.render();
  }

  pointerUp() {
    if (!this.drag) return;
    this.drag = null;
    this.changed();
  }

  changed() {
    this.render();
    this.onChange?.();
  }
}

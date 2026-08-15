import { activePage, uid } from '../core/state.js';
import { pushHistory } from '../core/history.js';

export class GeometryTools {
  constructor({ state, layer, onChange }) {
    this.state = state;
    this.layer = layer;
    this.onChange = onChange;
    this.drag = null;
    window.addEventListener('pointermove', e => this.pointerMove(e));
    window.addEventListener('pointerup', () => this.pointerUp());
  }

  get items() { return activePage(this.state).instruments; }

  add(type) {
    pushHistory(this.state);
    const base = { id: uid(type), type, x: 520, y: 290, rotation: 0 };
    const item = type === 'ruler'
      ? { ...base, w: 520, h: 96 }
      : type === 'protractor'
        ? { ...base, w: 420, h: 220 }
        : { ...base, w: 260, h: 300, radius: 120 };
    this.items.push(item);
    this.render();
    this.onChange?.();
  }

  render() {
    this.layer.innerHTML = '';
    for (const item of this.items) this.layer.appendChild(this.element(item));
  }

  remove(id) {
    const i = this.items.findIndex(x => x.id === id);
    if (i < 0) return;
    pushHistory(this.state);
    this.items.splice(i, 1);
    this.render();
    this.onChange?.();
  }

  element(item) {
    const el = document.createElement('div');
    el.className = `geometry-tool geometry-${item.type}`;
    el.dataset.id = item.id;
    el.style.left = `${item.x}px`;
    el.style.top = `${item.y}px`;
    el.style.width = `${item.w}px`;
    el.style.height = `${item.h}px`;
    el.style.transform = `rotate(${item.rotation || 0}deg)`;
    el.innerHTML = `${this.svg(item)}
      <button class="geometry-close" type="button" title="Закрити">×</button>
      <span class="geometry-rotate" data-handle="rotate" title="Повернути">↻</span>
      <span class="geometry-resize" data-handle="resize" title="Змінити розмір"></span>`;
    el.addEventListener('pointerdown', e => this.pointerDown(e, item));
    el.querySelector('.geometry-close').addEventListener('pointerdown', e => e.stopPropagation());
    el.querySelector('.geometry-close').addEventListener('click', e => { e.stopPropagation(); this.remove(item.id); });
    return el;
  }

  pointerDown(e, item) {
    e.preventDefault();
    e.stopPropagation();
    const handle = e.target.closest('[data-handle]')?.dataset.handle || 'move';
    pushHistory(this.state);
    this.drag = {
      id: item.id, mode: handle,
      startX: e.clientX, startY: e.clientY,
      x: item.x, y: item.y, w: item.w, h: item.h,
      rotation: item.rotation || 0,
      centerX: item.x + item.w / 2,
      centerY: item.y + item.h / 2
    };
  }

  pointerMove(e) {
    if (!this.drag) return;
    const item = this.items.find(x => x.id === this.drag.id);
    if (!item) return;
    const z = this.state.zoom || 1;
    const dx = (e.clientX - this.drag.startX) / z;
    const dy = (e.clientY - this.drag.startY) / z;
    if (this.drag.mode === 'move') {
      item.x = this.drag.x + dx;
      item.y = this.drag.y + dy;
    } else if (this.drag.mode === 'resize') {
      item.w = Math.max(item.type === 'ruler' ? 260 : 180, this.drag.w + dx);
      item.h = item.type === 'ruler' ? Math.max(72, this.drag.h + dy * .2) : Math.max(140, this.drag.h + dy);
    } else if (this.drag.mode === 'rotate') {
      const rect = this.layer.getBoundingClientRect();
      const cx = rect.left + this.drag.centerX * z;
      const cy = rect.top + this.drag.centerY * z;
      item.rotation = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI + 90;
    }
    this.render();
  }

  pointerUp() {
    if (!this.drag) return;
    this.drag = null;
    this.onChange?.();
  }

  svg(item) {
    if (item.type === 'ruler') return this.rulerSvg();
    if (item.type === 'protractor') return this.protractorSvg();
    return this.compassSvg(item);
  }

  rulerSvg() {
    const ticks = Array.from({ length: 31 }, (_, i) => {
      const x = 4 + i * 3.06;
      const len = i % 10 === 0 ? 34 : i % 5 === 0 ? 26 : 18;
      return `<line x1="${x}" y1="8" x2="${x}" y2="${len}"/>${i % 5 === 0 ? `<text x="${x + .6}" y="47">${i}</text>` : ''}`;
    }).join('');
    return `<svg viewBox="0 0 100 55" preserveAspectRatio="none"><rect x="1" y="1" width="98" height="53" rx="3"/><g>${ticks}</g><line x1="3" y1="50" x2="97" y2="50" class="guide"/></svg>`;
  }

  protractorSvg() {
    const ticks = Array.from({ length: 19 }, (_, i) => {
      const a = Math.PI - i * Math.PI / 18;
      const x1 = 50 + Math.cos(a) * 45, y1 = 50 - Math.sin(a) * 45;
      const r2 = i % 3 === 0 ? 37 : 40;
      const x2 = 50 + Math.cos(a) * r2, y2 = 50 - Math.sin(a) * r2;
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    }).join('');
    return `<svg viewBox="0 0 100 55"><path d="M4 50 A46 46 0 0 1 96 50 L50 50 Z"/><g>${ticks}</g><line x1="4" y1="50" x2="96" y2="50" class="guide"/><circle cx="50" cy="50" r="2.5"/></svg>`;
  }

  compassSvg(item) {
    return `<svg viewBox="0 0 100 120"><circle cx="50" cy="14" r="8"/><line x1="47" y1="22" x2="28" y2="108"/><line x1="53" y1="22" x2="78" y2="108"/><circle cx="28" cy="108" r="3"/><path d="M28 108 A55 55 0 0 1 78 108" class="guide"/><line x1="50" y1="38" x2="67" y2="67"/><circle cx="67" cy="67" r="3"/></svg>`;
  }
}

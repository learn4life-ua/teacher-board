import { activePage, uid } from '../core/state.js';
import { pushHistory } from '../core/history.js';

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export class GeometryTools {
  constructor({ state, layer, objectManager, onChange }) {
    this.state = state;
    this.layer = layer;
    this.objectManager = objectManager;
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
        ? { ...base, w: 420, h: 220, angle: 60 }
        : { ...base, w: 260, h: 300, radius: 92 };
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
      ${this.actionMarkup(item)}
      <button class="geometry-close" type="button" title="Закрити">×</button>
      <span class="geometry-rotate" data-handle="rotate" title="Повернути">↻</span>
      <span class="geometry-resize" data-handle="resize" title="Змінити розмір"></span>
      ${item.type === 'protractor' ? this.angleHandleMarkup(item) : ''}`;

    el.addEventListener('pointerdown', e => this.pointerDown(e, item));
    el.querySelector('.geometry-close').addEventListener('pointerdown', e => e.stopPropagation());
    el.querySelector('.geometry-close').addEventListener('click', e => { e.stopPropagation(); this.remove(item.id); });
    el.querySelector('.geometry-action')?.addEventListener('pointerdown', e => e.stopPropagation());
    el.querySelector('.geometry-action')?.addEventListener('click', e => {
      e.stopPropagation();
      this.applyConstruction(item);
    });
    return el;
  }

  actionMarkup(item) {
    const label = item.type === 'ruler' ? 'Провести' : item.type === 'protractor' ? `Побудувати ${Math.round(item.angle || 0)}°` : 'Побудувати коло';
    return `<button class="geometry-action" type="button">${label}</button>`;
  }

  angleHandleMarkup(item) {
    const angle = clamp(Number(item.angle) || 0, 0, 180);
    const theta = angle * Math.PI / 180;
    const left = 50 + 42 * Math.cos(theta);
    const top = 90.9 - 76 * Math.sin(theta);
    return `<span class="geometry-angle" data-handle="angle" style="left:${left}%;top:${top}%" title="Кут ${Math.round(angle)}°"></span>`;
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
      if (item.type === 'compass') item.radius = Math.max(35, Math.min(item.w, item.h) * .34);
    } else if (this.drag.mode === 'rotate') {
      const rect = this.layer.getBoundingClientRect();
      const cx = rect.left + this.drag.centerX * z;
      const cy = rect.top + this.drag.centerY * z;
      item.rotation = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI + 90;
    } else if (this.drag.mode === 'angle' && item.type === 'protractor') {
      const rect = this.layer.getBoundingClientRect();
      const cx = rect.left + (item.x + item.w / 2) * z;
      const cy = rect.top + (item.y + item.h * .909) * z;
      let screenAngle = Math.atan2(cy - e.clientY, e.clientX - cx) * 180 / Math.PI;
      screenAngle += item.rotation || 0;
      while (screenAngle < 0) screenAngle += 360;
      while (screenAngle >= 360) screenAngle -= 360;
      item.angle = clamp(screenAngle <= 180 ? screenAngle : 180, 0, 180);
    }
    this.render();
  }

  pointerUp() {
    if (!this.drag) return;
    this.drag = null;
    this.onChange?.();
  }

  applyConstruction(item) {
    if (!this.objectManager) return;
    if (item.type === 'ruler') this.drawAlongRuler(item);
    else if (item.type === 'protractor') this.buildAngle(item);
    else this.buildCircle(item);
  }

  drawAlongRuler(item) {
    const a = this.localToScene(item, item.w * .04, item.h * .90);
    const b = this.localToScene(item, item.w * .96, item.h * .90);
    this.objectManager.addSegment(a, b, { color: this.state.color, lineWidth: this.state.lineWidth });
  }

  buildAngle(item) {
    const pivotLocal = { x: item.w * .5, y: item.h * .909 };
    const length = item.w * .42;
    const theta = clamp(Number(item.angle) || 0, 0, 180) * Math.PI / 180;
    const pivot = this.localToScene(item, pivotLocal.x, pivotLocal.y);
    const baseEnd = this.localToScene(item, pivotLocal.x + length, pivotLocal.y);
    const rayEnd = this.localToScene(item, pivotLocal.x + Math.cos(theta) * length, pivotLocal.y - Math.sin(theta) * length);
    this.objectManager.addSegments([
      { a: pivot, b: baseEnd },
      { a: pivot, b: rayEnd }
    ], { color: this.state.color, lineWidth: this.state.lineWidth });
  }

  buildCircle(item) {
    const center = this.localToScene(item, item.w * .28, item.h * .90);
    const radius = Math.max(35, Number(item.radius) || Math.min(item.w, item.h) * .34);
    this.objectManager.addCircle(center, radius, { color: this.state.color, lineWidth: this.state.lineWidth });
  }

  localToScene(item, lx, ly) {
    const cx = item.w / 2;
    const cy = item.h / 2;
    const x = lx - cx;
    const y = ly - cy;
    const rad = (item.rotation || 0) * Math.PI / 180;
    return {
      x: item.x + cx + x * Math.cos(rad) - y * Math.sin(rad),
      y: item.y + cy + x * Math.sin(rad) + y * Math.cos(rad)
    };
  }

  svg(item) {
    if (item.type === 'ruler') return this.rulerSvg();
    if (item.type === 'protractor') return this.protractorSvg(item);
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

  protractorSvg(item) {
    const ticks = Array.from({ length: 19 }, (_, i) => {
      const a = Math.PI - i * Math.PI / 18;
      const x1 = 50 + Math.cos(a) * 45, y1 = 50 - Math.sin(a) * 45;
      const r2 = i % 3 === 0 ? 37 : 40;
      const x2 = 50 + Math.cos(a) * r2, y2 = 50 - Math.sin(a) * r2;
      const label = i % 3 === 0 ? `<text x="${50 + Math.cos(a) * 31}" y="${50 - Math.sin(a) * 31}">${180 - i * 10}</text>` : '';
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>${label}`;
    }).join('');
    return `<svg viewBox="0 0 100 55"><path d="M4 50 A46 46 0 0 1 96 50 L50 50 Z"/><g>${ticks}</g><line x1="4" y1="50" x2="96" y2="50" class="guide"/><circle cx="50" cy="50" r="2.5"/><text x="50" y="46" text-anchor="middle" class="angle-readout">${Math.round(item.angle || 0)}°</text></svg>`;
  }

  compassSvg(item) {
    return `<svg viewBox="0 0 100 120"><circle cx="50" cy="14" r="8"/><line x1="47" y1="22" x2="28" y2="108"/><line x1="53" y1="22" x2="78" y2="108"/><circle cx="28" cy="108" r="3"/><path d="M28 108 A55 55 0 0 1 78 108" class="guide"/><line x1="50" y1="38" x2="67" y2="67"/><circle cx="67" cy="67" r="3"/></svg>`;
  }
}

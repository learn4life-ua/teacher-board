import { createState, activePage, createBlankPage } from './core/state.js';
import { loadState, saveState } from './core/storage.js';
import { undo, redo, resetHistory } from './core/history.js';
import { Scene } from './core/scene.js';
import { ObjectManager } from './objects/object-manager.js';
import { SHAPE_LABELS } from './objects/shapes.js';
import { FreehandDrawing } from './drawing/freehand.js';
import { GeometryTools } from './instruments/geometry-tools.js';

let state = loadState(createState());

const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];
const sceneEl = $('#scene');
const viewport = $('#boardViewport');
const canvas = $('#drawingCanvas');
const objectLayer = $('#objectLayer');
const instrumentLayer = $('#instrumentLayer');
const zoomLabel = $('#zoomLabel');
const pagesEl = $('#pages');
const shapeMenu = $('#shapeMenu');
const autosaveState = $('#autosaveState');

const scene = new Scene({ viewport, scene: sceneEl, zoomLabel, state });
const objectManager = new ObjectManager({ state, layer: objectLayer, onChange: commit });
const drawing = new FreehandDrawing({ state, canvas, scene, onChange: commit });
const geometryTools = new GeometryTools({ state, layer: instrumentLayer, onChange: commit });

let shapeGesture = null;

function commit() {
  autosaveState.textContent = 'Збереження…';
  saveState(state);
  autosaveState.textContent = 'Збережено';
  renderAll();
}

function setTool(tool) {
  state.tool = tool;
  if (tool !== 'select') state.selection = null;
  $$('.tool[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
  sceneEl.dataset.tool = tool;
  objectManager.render();
  shapeMenu.hidden = true;
}

function renderAll() {
  scene.applyZoom();
  sceneEl.dataset.background = activePage(state).background || 'clean';
  drawing.render();
  objectManager.render();
  geometryTools.render();
  renderPages();
  $$('.background-btn').forEach(b => b.classList.toggle('selected', b.dataset.bg === activePage(state).background));
}

function renderPages() {
  pagesEl.innerHTML = '';
  state.pages.forEach((page, i) => {
    const b = document.createElement('button');
    b.className = `page-tab${i === state.activePage ? ' active' : ''}`;
    b.textContent = `${i + 1}. ${page.name}`;
    b.addEventListener('click', () => {
      state.activePage = i;
      state.selection = null;
      resetHistory(state);
      commit();
    });
    pagesEl.appendChild(b);
  });
}

function addPage() {
  state.pages.push(createBlankPage(`Сторінка ${state.pages.length + 1}`));
  state.activePage = state.pages.length - 1;
  state.selection = null;
  resetHistory(state);
  commit();
}

function buildShapeMenu() {
  shapeMenu.innerHTML = Object.entries(SHAPE_LABELS)
    .map(([key, label]) => `<button type="button" data-shape="${key}">${label}</button>`)
    .join('');
  shapeMenu.addEventListener('click', e => {
    const b = e.target.closest('[data-shape]');
    if (!b) return;
    state.tool = `shape:${b.dataset.shape}`;
    $$('.tool').forEach(x => x.classList.remove('active'));
    $('#shapeBtn').classList.add('active');
    sceneEl.dataset.tool = 'shape';
    shapeMenu.hidden = true;
  });
}

function bindShapeDrawing() {
  sceneEl.addEventListener('pointerdown', e => {
    if (!state.tool.startsWith('shape:')) return;
    if (e.target.closest('.scene-object,.geometry-tool')) return;
    e.preventDefault();
    const p = scene.pointFromEvent(e);
    shapeGesture = { start: p, end: p };
    updateShapePreview();
  });

  sceneEl.addEventListener('pointermove', e => {
    if (!shapeGesture) return;
    shapeGesture.end = scene.pointFromEvent(e);
    updateShapePreview();
  });

  window.addEventListener('pointerup', () => {
    if (!shapeGesture) return;
    const { start, end } = shapeGesture;
    const type = state.tool.split(':')[1];
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);
    $('#shapePreview').hidden = true;
    shapeGesture = null;
    const obj = objectManager.addShape(type, { x, y, w, h });
    setTool('select');
    objectManager.select(obj.id);
  });
}

function updateShapePreview() {
  const p = $('#shapePreview');
  const { start, end } = shapeGesture;
  p.hidden = false;
  p.style.left = `${Math.min(start.x, end.x)}px`;
  p.style.top = `${Math.min(start.y, end.y)}px`;
  p.style.width = `${Math.abs(end.x - start.x)}px`;
  p.style.height = `${Math.abs(end.y - start.y)}px`;
}

function bindUi() {
  $$('.tool[data-tool]').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
  $$('.instrument-btn').forEach(b => b.addEventListener('click', () => {
    geometryTools.add(b.dataset.instrument);
    setTool('select');
  }));
  $('#shapeBtn').addEventListener('click', e => {
    e.stopPropagation();
    shapeMenu.hidden = !shapeMenu.hidden;
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('#shapeMenu') && !e.target.closest('#shapeBtn')) shapeMenu.hidden = true;
  });
  $('#colorPicker').addEventListener('input', e => {
    state.color = e.target.value;
    const selected = objectManager.selected();
    if (selected) objectManager.updateSelected({ color: state.color }); else saveState(state);
  });
  $('#lineWidth').addEventListener('change', e => {
    state.lineWidth = Number(e.target.value);
    const selected = objectManager.selected();
    if (selected) objectManager.updateSelected({ lineWidth: state.lineWidth }); else saveState(state);
  });
  $('#zoomInBtn').addEventListener('click', () => { scene.setZoom(state.zoom + .1); saveState(state); geometryTools.render(); });
  $('#zoomOutBtn').addEventListener('click', () => { scene.setZoom(state.zoom - .1); saveState(state); geometryTools.render(); });
  $('#undoBtn').addEventListener('click', () => { if (undo(state)) commit(); });
  $('#redoBtn').addEventListener('click', () => { if (redo(state)) commit(); });
  $('#deleteBtn').addEventListener('click', () => objectManager.deleteSelected());
  $('#addPageBtn').addEventListener('click', addPage);
  $$('.background-btn').forEach(b => b.addEventListener('click', () => {
    activePage(state).background = b.dataset.bg;
    commit();
  }));
  sceneEl.addEventListener('pointerdown', e => {
    if (state.tool === 'select' && !e.target.closest('.scene-object,.geometry-tool')) objectManager.select(null);
  });
  window.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey ? redo(state) : undo(state)) commit(); }
    if ((e.key === 'Delete' || e.key === 'Backspace') && state.selection) { e.preventDefault(); objectManager.deleteSelected(); }
    if (e.key === 'Escape') setTool('select');
  });
}

buildShapeMenu();
bindShapeDrawing();
bindUi();
setTool(state.tool.startsWith('shape:') ? 'select' : state.tool);
renderAll();

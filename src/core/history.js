import { activePage } from './state.js';

function snapshot(state) {
  return JSON.stringify(activePage(state));
}

export function pushHistory(state) {
  state.history.undo.push(snapshot(state));
  if (state.history.undo.length > 50) state.history.undo.shift();
  state.history.redo.length = 0;
}

export function undo(state) {
  if (!state.history.undo.length) return false;
  state.history.redo.push(snapshot(state));
  state.pages[state.activePage] = JSON.parse(state.history.undo.pop());
  state.selection = null;
  return true;
}

export function redo(state) {
  if (!state.history.redo.length) return false;
  state.history.undo.push(snapshot(state));
  state.pages[state.activePage] = JSON.parse(state.history.redo.pop());
  state.selection = null;
  return true;
}

export function resetHistory(state) {
  state.history.undo.length = 0;
  state.history.redo.length = 0;
}

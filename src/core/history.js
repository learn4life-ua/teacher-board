import { activePage } from './state.js';

export const MAX_HISTORY_SNAPSHOTS = 50;
export const MAX_HISTORY_CHARS = 12_000_000;

function snapshot(state) {
  return JSON.stringify(activePage(state));
}

function trimStack(stack) {
  while (stack.length > MAX_HISTORY_SNAPSHOTS) stack.shift();
  let total = stack.reduce((sum, item) => sum + item.length, 0);
  while (stack.length > 1 && total > MAX_HISTORY_CHARS) {
    total -= stack[0].length;
    stack.shift();
  }
}

export function pushHistory(state) {
  state.history.undo.push(snapshot(state));
  trimStack(state.history.undo);
  state.history.redo.length = 0;
}

export function undo(state) {
  if (!state.history.undo.length) return false;
  state.history.redo.push(snapshot(state));
  trimStack(state.history.redo);
  state.pages[state.activePage] = JSON.parse(state.history.undo.pop());
  state.selection = null;
  return true;
}

export function redo(state) {
  if (!state.history.redo.length) return false;
  state.history.undo.push(snapshot(state));
  trimStack(state.history.undo);
  state.pages[state.activePage] = JSON.parse(state.history.redo.pop());
  state.selection = null;
  return true;
}

export function resetHistory(state) {
  state.history.undo.length = 0;
  state.history.redo.length = 0;
}

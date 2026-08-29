(() => {
  'use strict';

  const canvas = document.getElementById('boardCanvas');
  const history = globalThis.TeacherBoardHistory;
  if (!canvas || !history?.checkpoint) return;

  let rasterGestureActive = false;

  function currentRasterTool() {
    const active = document.querySelector('.toolbar .tool.active[data-tool]');
    return active?.dataset.tool || null;
  }

  function isRasterTool(tool) {
    return ['pen', 'marker', 'eraser', 'arrow'].includes(tool);
  }

  function refreshAfterRestore() {
    const store = globalThis.TeacherBoardStore;
    const runtime = globalThis.TeacherBoardCoreRuntime;
    const data = store?.getDocument?.();
    if (!data?.pages?.length || !runtime) return;
    const index = Math.max(0, Math.min(Number(data.activePage) || 0, data.pages.length - 1));
    runtime.renderPages?.();
    runtime.loadPage?.(index);
  }

  canvas.addEventListener('pointerdown', event => {
    const tool = currentRasterTool();
    if (!isRasterTool(tool)) return;
    history.checkpoint();
    rasterGestureActive = true;
  }, true);

  window.addEventListener('pointerup', () => {
    rasterGestureActive = false;
  }, true);

  document.querySelectorAll('#backgroundButtons button').forEach(button => {
    button.addEventListener('click', () => history.checkpoint(), true);
  });

  function undo(event) {
    if (!history.undo()) return;
    event?.preventDefault?.();
    event?.stopImmediatePropagation?.();
    refreshAfterRestore();
  }

  function redo(event) {
    if (!history.redo()) return;
    event?.preventDefault?.();
    event?.stopImmediatePropagation?.();
    refreshAfterRestore();
  }

  document.getElementById('undoBtn')?.addEventListener('click', undo, true);
  document.getElementById('redoBtn')?.addEventListener('click', redo, true);

  window.addEventListener('keydown', event => {
    if (event.target.matches('textarea,input,select,[contenteditable="true"]')) return;
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    if (key === 'z') {
      event.preventDefault();
      event.stopImmediatePropagation();
      event.shiftKey ? redo() : undo();
    } else if (key === 'y') {
      event.preventDefault();
      event.stopImmediatePropagation();
      redo();
    }
  }, true);

  window.addEventListener('teacherboard:history-restored', () => {
    rasterGestureActive = false;
    refreshAfterRestore();
  });

  window.addEventListener('teacherboard:history-status', event => {
    const status = event.detail || {};
    const undoButton = document.getElementById('undoBtn');
    const redoButton = document.getElementById('redoBtn');
    if (undoButton) undoButton.disabled = !status.canUndo;
    if (redoButton) redoButton.disabled = !status.canRedo;
  });

  const initial = history.status?.() || {};
  const undoButton = document.getElementById('undoBtn');
  const redoButton = document.getElementById('redoBtn');
  if (undoButton) undoButton.disabled = !initial.canUndo;
  if (redoButton) redoButton.disabled = !initial.canRedo;
})();
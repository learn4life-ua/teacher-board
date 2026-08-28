(() => {
  'use strict';

  function clone(value) {
    if (typeof globalThis.structuredClone === 'function') return globalThis.structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function createStack({ limit = 60 } = {}) {
    const undoStack = [];
    const redoStack = [];

    function push(snapshot) {
      if (!snapshot) return;
      undoStack.push(clone(snapshot));
      if (undoStack.length > limit) undoStack.shift();
      redoStack.length = 0;
      publish();
    }

    function undo(current) {
      if (!undoStack.length) return null;
      redoStack.push(clone(current));
      const snapshot = undoStack.pop();
      publish();
      return snapshot;
    }

    function redo(current) {
      if (!redoStack.length) return null;
      undoStack.push(clone(current));
      const snapshot = redoStack.pop();
      publish();
      return snapshot;
    }

    function clear() {
      undoStack.length = 0;
      redoStack.length = 0;
      publish();
    }

    function status() {
      return {
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0,
        undoCount: undoStack.length,
        redoCount: redoStack.length
      };
    }

    function publish() {
      window.dispatchEvent(new CustomEvent('teacherboard:history-status', { detail: status() }));
    }

    return { push, undo, redo, clear, status };
  }

  const shared = createStack({ limit: 60 });

  // Backward-compatible factory: all active runtimes now receive the same chronological history.
  function createHistory() {
    return shared;
  }

  function snapshotCurrentDocument() {
    const store = globalThis.TeacherBoardStore;
    if (store?.getDocument) return clone(store.getDocument());
    try {
      return JSON.parse(localStorage.getItem('teacherboard.v1') || 'null');
    } catch {
      return null;
    }
  }

  function checkpoint(snapshot = snapshotCurrentDocument()) {
    shared.push(snapshot);
  }

  function restore(snapshot, source = 'history') {
    if (!snapshot) return false;
    const store = globalThis.TeacherBoardStore;
    if (store?.setDocument) store.setDocument(snapshot, { source });
    else localStorage.setItem('teacherboard.v1', JSON.stringify(snapshot));
    window.dispatchEvent(new CustomEvent('teacherboard:history-restored', { detail: snapshot }));
    return true;
  }

  function undo() {
    const current = snapshotCurrentDocument();
    return restore(shared.undo(current), 'history-undo');
  }

  function redo() {
    const current = snapshotCurrentDocument();
    return restore(shared.redo(current), 'history-redo');
  }

  globalThis.TeacherBoardHistory = {
    shared,
    createHistory,
    checkpoint,
    undo,
    redo,
    restore,
    status: shared.status
  };
})();
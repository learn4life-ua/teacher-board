(() => {
  'use strict';

  function createHistory({ limit = 40 } = {}) {
    const undoStack = [];
    const redoStack = [];

    function clone(value) {
      if (typeof globalThis.structuredClone === 'function') return globalThis.structuredClone(value);
      return JSON.parse(JSON.stringify(value));
    }

    function push(snapshot) {
      undoStack.push(clone(snapshot));
      if (undoStack.length > limit) undoStack.shift();
      redoStack.length = 0;
    }

    function undo(current) {
      if (!undoStack.length) return null;
      redoStack.push(clone(current));
      return undoStack.pop();
    }

    function redo(current) {
      if (!redoStack.length) return null;
      undoStack.push(clone(current));
      return redoStack.pop();
    }

    function clear() {
      undoStack.length = 0;
      redoStack.length = 0;
    }

    function status() {
      return {
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0,
        undoCount: undoStack.length,
        redoCount: redoStack.length
      };
    }

    return { push, undo, redo, clear, status };
  }

  globalThis.TeacherBoardHistory = { createHistory };
})();
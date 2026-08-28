(() => {
  'use strict';

  const DB_NAME = 'teacherboard';
  const DB_VERSION = 1;
  const STORE_DOCUMENTS = 'documents';
  const CURRENT_DOCUMENT_KEY = 'current';
  const LEGACY_STORAGE_KEY = 'teacherboard.v1';
  const LEGACY_HEIGHTS_KEY = 'teacherboard.pageHeights.v1';

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted'));
    });
  }

  async function openDatabase() {
    if (!('indexedDB' in globalThis)) throw new Error('IndexedDB is not supported');

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_DOCUMENTS)) {
          db.createObjectStore(STORE_DOCUMENTS);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function readLegacyLocalStorage() {
    let raw = null;
    let heights = [];

    try {
      raw = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || 'null');
    } catch {
      raw = null;
    }

    try {
      heights = JSON.parse(localStorage.getItem(LEGACY_HEIGHTS_KEY) || '[]');
      if (!Array.isArray(heights)) heights = [];
    } catch {
      heights = [];
    }

    return { raw, heights };
  }

  async function loadDocument() {
    const core = globalThis.TeacherBoardCore;
    if (!core?.normalizeDocument) throw new Error('TeacherBoardCore state module must be loaded first');

    try {
      const db = await openDatabase();
      const tx = db.transaction(STORE_DOCUMENTS, 'readonly');
      const stored = await requestToPromise(tx.objectStore(STORE_DOCUMENTS).get(CURRENT_DOCUMENT_KEY));
      await transactionDone(tx);
      db.close();

      if (stored) return core.normalizeDocument(stored);
    } catch (error) {
      console.warn('[TeacherBoard] IndexedDB load failed, using legacy fallback.', error);
    }

    const { raw, heights } = readLegacyLocalStorage();
    if (raw) return core.normalizeDocument(raw, heights);
    return core.createBlankDocument();
  }

  async function saveDocument(documentState) {
    const core = globalThis.TeacherBoardCore;
    if (!core?.normalizeDocument) throw new Error('TeacherBoardCore state module must be loaded first');

    const normalized = core.normalizeDocument(documentState);
    normalized.updatedAt = new Date().toISOString();

    const db = await openDatabase();
    const tx = db.transaction(STORE_DOCUMENTS, 'readwrite');
    tx.objectStore(STORE_DOCUMENTS).put(normalized, CURRENT_DOCUMENT_KEY);
    await transactionDone(tx);
    db.close();
    return normalized;
  }

  async function hasStoredDocument() {
    try {
      const db = await openDatabase();
      const tx = db.transaction(STORE_DOCUMENTS, 'readonly');
      const value = await requestToPromise(tx.objectStore(STORE_DOCUMENTS).getKey(CURRENT_DOCUMENT_KEY));
      await transactionDone(tx);
      db.close();
      return value !== undefined;
    } catch {
      return false;
    }
  }

  async function migrateLegacyDocument() {
    if (await hasStoredDocument()) return { migrated: false, reason: 'indexeddb-document-exists' };

    const { raw, heights } = readLegacyLocalStorage();
    if (!raw) return { migrated: false, reason: 'no-legacy-document' };

    const core = globalThis.TeacherBoardCore;
    const normalized = core.normalizeDocument(raw, heights);
    await saveDocument(normalized);
    return { migrated: true, document: normalized };
  }

  globalThis.TeacherBoardStorage = {
    loadDocument,
    saveDocument,
    migrateLegacyDocument,
    readLegacyLocalStorage,
    constants: {
      DB_NAME,
      DB_VERSION,
      STORE_DOCUMENTS,
      LEGACY_STORAGE_KEY,
      LEGACY_HEIGHTS_KEY
    }
  };
})();
/*
 * IndexedDB wrapper for the Imposter game.
 * Two object stores:
 *   - presets: saved game configurations (players/imposters/category/names)
 *   - history: finished-game records (scores / results log)
 *
 * All methods return Promises so callers can use async/await.
 */

const DB_NAME = 'imposter-game';
const DB_VERSION = 1;

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('presets')) {
        const s = db.createObjectStore('presets', { keyPath: 'id', autoIncrement: true });
        s.createIndex('name', 'name', { unique: false });
      }
      if (!db.objectStoreNames.contains('history')) {
        const s = db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
        s.createIndex('date', 'date', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

function tx(store, mode) {
  return openDB().then((db) => db.transaction(store, mode).objectStore(store));
}

function reqToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const DB = {
  // ---- Presets ----
  async addPreset(preset) {
    const store = await tx('presets', 'readwrite');
    return reqToPromise(store.add({ ...preset, createdAt: new Date().toISOString() }));
  },
  async getPresets() {
    const store = await tx('presets', 'readonly');
    const all = await reqToPromise(store.getAll());
    return all.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  },
  async deletePreset(id) {
    const store = await tx('presets', 'readwrite');
    return reqToPromise(store.delete(id));
  },

  // ---- History ----
  async addHistory(record) {
    const store = await tx('history', 'readwrite');
    return reqToPromise(store.add(record));
  },
  async getHistory() {
    const store = await tx('history', 'readonly');
    const all = await reqToPromise(store.getAll());
    return all.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  },
  async deleteHistory(id) {
    const store = await tx('history', 'readwrite');
    return reqToPromise(store.delete(id));
  },
  async clearHistory() {
    const store = await tx('history', 'readwrite');
    return reqToPromise(store.clear());
  },
};

window.DB = DB;

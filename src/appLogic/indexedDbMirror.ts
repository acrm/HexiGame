/**
 * indexedDbMirror — writes localStorage keys to an IndexedDB store as a mirror.
 *
 * Used to keep an IndexedDB replica of specific localStorage values for platforms
 * (e.g. Yandex Games) where localStorage may not survive cross-session or
 * cross-origin boundaries but IndexedDB does.
 *
 * Writes are fire-and-forget; failures are silently ignored.
 */

const DB_NAME = 'hexigame-mirror';
const STORE_NAME = 'kv';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

/**
 * Mirror a key/value pair to IndexedDB.
 * The call is fire-and-forget; errors are silently swallowed.
 * Transaction completion is also not awaited — this is intentional, as the
 * function is designed for best-effort background mirroring only.
 */
export function mirrorStorageSetItem(key: string, value: string): void {
  openDb()
    .then((db) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, key);
    })
    .catch(() => {
      // IndexedDB unavailable or write failed — ignore silently
    });
}

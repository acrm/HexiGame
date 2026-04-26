type KvRecord = {
  key: string;
  value: string;
  updatedAt: number;
  revision: number;
};

const DB_NAME = 'hexigame.persistence';
const DB_VERSION = 1;
const STORE_NAME = 'kv';
const MANIFEST_KEY = '__manifest__';
const WRITE_DEBOUNCE_MS = 120;

let dbPromise: Promise<IDBDatabase | null> | null = null;
const pendingWrites = new Map<string, string | null>();
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

function hasIndexedDbSupport(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  if (!hasIndexedDbSupport()) {
    dbPromise = Promise.resolve(null);
    return dbPromise;
  }

  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });

  return dbPromise;
}

function runRead<T>(db: IDBDatabase, operation: (store: IDBObjectStore, done: (value: T) => void) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    operation(store, resolve);
    tx.onerror = () => reject(tx.error);
  });
}

function runWrite(db: IDBDatabase, operation: (store: IDBObjectStore) => void): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    operation(tx.objectStore(STORE_NAME));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function getRecord(db: IDBDatabase, key: string): Promise<KvRecord | null> {
  const record = await runRead<KvRecord | null>(db, (store, done) => {
    const req = store.get(key);
    req.onsuccess = () => done((req.result as KvRecord | undefined) ?? null);
    req.onerror = () => done(null);
  });
  return record;
}

async function readManifest(db: IDBDatabase): Promise<Set<string>> {
  const record = await getRecord(db, MANIFEST_KEY);
  if (!record) return new Set<string>();
  try {
    const parsed = JSON.parse(record.value) as unknown;
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.filter((item): item is string => typeof item === 'string'));
  } catch {
    return new Set<string>();
  }
}

async function writeManifest(db: IDBDatabase, manifest: Set<string>): Promise<void> {
  const previous = await getRecord(db, MANIFEST_KEY);
  await runWrite(db, (store) => {
    store.put({
      key: MANIFEST_KEY,
      value: JSON.stringify(Array.from(manifest.values())),
      updatedAt: Date.now(),
      revision: (previous?.revision ?? 0) + 1,
    } satisfies KvRecord);
  });
}

async function flushWrite(key: string): Promise<void> {
  pendingTimers.delete(key);
  const value = pendingWrites.get(key);
  pendingWrites.delete(key);

  const db = await openDb();
  if (!db) return;

  const manifest = await readManifest(db);

  if (value == null) {
    await runWrite(db, (store) => {
      store.delete(key);
    });
    if (manifest.delete(key)) {
      await writeManifest(db, manifest);
    }
    return;
  }

  const previous = await getRecord(db, key);
  await runWrite(db, (store) => {
    store.put({
      key,
      value,
      updatedAt: Date.now(),
      revision: (previous?.revision ?? 0) + 1,
    } satisfies KvRecord);
  });

  if (!manifest.has(key)) {
    manifest.add(key);
    await writeManifest(db, manifest);
  }
}

function scheduleWrite(key: string, value: string | null): void {
  if (!hasIndexedDbSupport()) return;
  pendingWrites.set(key, value);
  if (pendingTimers.has(key)) return;

  const timer = setTimeout(() => {
    flushWrite(key).catch(() => {
      // Best effort mirror. localStorage remains fallback source.
    });
  }, WRITE_DEBOUNCE_MS);
  pendingTimers.set(key, timer);
}

export function mirrorStorageSetItem(key: string, value: string): void {
  scheduleWrite(key, value);
}

export function mirrorStorageRemoveItem(key: string): void {
  scheduleWrite(key, null);
}

export async function hydrateLocalStorageFromIndexedDb(
  storage: Pick<Storage, 'setItem'> = localStorage,
): Promise<void> {
  const db = await openDb();
  if (!db) return;

  const manifest = await readManifest(db);
  if (manifest.size === 0) return;

  for (const key of manifest) {
    const record = await getRecord(db, key);
    if (!record) continue;
    storage.setItem(key, record.value);
  }
}

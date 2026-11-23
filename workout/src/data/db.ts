import { EXERCISES } from '../domain/exercises';
import type { Exercise, Measurement, Session, Template, TemplateVersion } from '../domain/types';

export const DB_NAME = 'workout-tracker';
export const DB_VERSION = 1;
export type StoreName = 'kv' | 'exercises' | 'templates' | 'templateVersions' | 'sessions' | 'measurements';

export type Op =
  | { store: StoreName; type: 'put'; value: unknown; key?: IDBValidKey }
  | { store: StoreName; type: 'delete'; key: IDBValidKey };

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(factory: IDBFactory = indexedDB): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = factory.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('exercises')) db.createObjectStore('exercises', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('templates')) db.createObjectStore('templates', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('templateVersions')) db.createObjectStore('templateVersions', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('sessions')) {
        const s = db.createObjectStore('sessions', { keyPath: 'id' });
        s.createIndex('status', 'status');
        s.createIndex('startDate', 'startDate');
      }
      if (!db.objectStoreNames.contains('measurements')) {
        const m = db.createObjectStore('measurements', { keyPath: 'id' });
        m.createIndex('metric_date', ['metric', 'date']);
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => { dbPromise = null; reject(req.error); };
    req.onblocked = () => reject(new Error('Storage is blocked by another open copy of the app. Close other tabs and retry.'));
  });
  return dbPromise;
}

export function resetDbHandle() { dbPromise = null; }

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error('Storage transaction aborted'));
    tx.onerror = () => reject(tx.error ?? new Error('Storage error'));
  });
}
function reqP<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
}

/** Apply several writes atomically. */
export async function write(ops: Op[]): Promise<void> {
  if (!ops.length) return;
  const db = await openDb();
  const stores = [...new Set(ops.map((o) => o.store))];
  const tx = db.transaction(stores, 'readwrite');
  for (const op of ops) {
    const st = tx.objectStore(op.store);
    if (op.type === 'put') (op.key !== undefined ? st.put(op.value, op.key) : st.put(op.value));
    else st.delete(op.key);
  }
  await done(tx);
}

export interface Snapshot {
  kv: Record<string, unknown>;
  exercises: Exercise[];
  templates: Template[];
  templateVersions: TemplateVersion[];
  sessions: Session[];
  measurements: Measurement[];
}

export async function loadAll(): Promise<Snapshot> {
  const db = await openDb();
  const tx = db.transaction(['kv', 'exercises', 'templates', 'templateVersions', 'sessions', 'measurements'], 'readonly');
  const kvStore = tx.objectStore('kv');
  const [keys, values, exercises, templates, templateVersions, sessions, measurements] = await Promise.all([
    reqP(kvStore.getAllKeys()), reqP(kvStore.getAll()),
    reqP(tx.objectStore('exercises').getAll()), reqP(tx.objectStore('templates').getAll()),
    reqP(tx.objectStore('templateVersions').getAll()), reqP(tx.objectStore('sessions').getAll()),
    reqP(tx.objectStore('measurements').getAll()),
  ]);
  const kv: Record<string, unknown> = {};
  keys.forEach((k, i) => { kv[String(k)] = values[i]; });
  return { kv, exercises: exercises as Exercise[], templates: templates as Template[], templateVersions: templateVersions as TemplateVersion[], sessions: sessions as Session[], measurements: measurements as Measurement[] };
}

/** Keep stored exercise definitions in sync with the bundled library (adds new, refreshes existing). */
export async function seedExercises(): Promise<void> {
  await write(EXERCISES.map((e) => ({ store: 'exercises' as const, type: 'put' as const, value: e })));
}

/**
 * Commit a draft exactly once. Runs in one transaction: if the stored record is already completed
 * (double tap, retry after a lost response) it is returned unchanged and nothing is written.
 */
export async function commitSession(completed: Session): Promise<Session> {
  const db = await openDb();
  const tx = db.transaction(['sessions', 'kv'], 'readwrite');
  const st = tx.objectStore('sessions');
  const existing = (await reqP(st.get(completed.id))) as Session | undefined;
  let result = completed;
  if (existing && existing.status === 'completed') result = existing;
  else {
    st.put(completed);
    tx.objectStore('kv').delete('activeSessionId');
  }
  await done(tx);
  return result;
}

export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

const DB_NAME = "kiln_media";
const STORE = "blobs";
const VERSION = 1;

let dbp: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { dbp = null; reject(req.error); };
    });
  }
  return dbp;
}

export const IDB_PREFIX = "idb://";

export async function storeBlob(blob: Blob): Promise<string> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return `${IDB_PREFIX}${id}`;
}

export async function resolveMediaUrl(url: string): Promise<string> {
  if (!url || !url.startsWith(IDB_PREFIX)) return url;
  const id = url.slice(IDB_PREFIX.length);
  const db = await getDB();
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result as Blob | undefined);
    req.onerror = () => reject(req.error);
  });
  if (!blob) throw new Error("Video not found in local storage");
  return URL.createObjectURL(blob);
}

export function isIdbUrl(url?: string | null): boolean {
  return !!url && url.startsWith(IDB_PREFIX);
}

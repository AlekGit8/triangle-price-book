/**
 * Browser-side carrier for a check-my-quote upload (Oct 30, 2026).
 *
 * The uploaded document rides in IndexedDB (same origin) from
 * /check-quote to /submit so the user never re-uploads — and, crucially,
 * so it never reaches our servers unless they actually publish. If they
 * decide not to submit, there is nothing of it on our side to delete.
 *
 * One slot, fixed key: sharing a new check overwrites any previous
 * carried file. takeCarriedDoc() removes the entry once /submit picks
 * it up (the File then lives in /submit's state for the session), and
 * entries older than 24h (the extract receipt TTL) are treated as stale
 * and discarded. Every failure degrades to "no document" — the caller
 * still navigates with the prefilled fields, and the user can re-attach
 * on /submit if they want the entry verified.
 */

const DB_NAME = "tpb";
const STORE_NAME = "carried-docs";
const DOC_KEY = "carried-doc";
const TTL_MS = 24 * 3600 * 1000;

interface StoredDoc {
  file: Blob;
  name: string;
  type: string;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Store a file for the /submit handoff. Resolves to the key, or null
    when browser storage is unavailable (caller falls back to fields). */
export async function putCarriedDoc(file: File): Promise<string | null> {
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      await request(
        tx.objectStore(STORE_NAME).put(
          { file, name: file.name, type: file.type, createdAt: Date.now() } satisfies StoredDoc,
          DOC_KEY
        )
      );
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      return DOC_KEY;
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

/** Take the carried file (single-use: removed on read). Returns null
    when there is none, it is stale, or storage is unavailable. */
export async function takeCarriedDoc(key: string): Promise<File | null> {
  if (key !== DOC_KEY) return null;
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const stored = await request<StoredDoc | undefined>(store.get(DOC_KEY));
      await request(store.delete(DOC_KEY));
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      if (!stored) return null;
      if (Date.now() - stored.createdAt > TTL_MS) return null;
      if (!stored.file || typeof (stored.file as Blob).size !== "number") return null;
      // Rebuild a File (name/type don't always survive structured clone
      // intact across realms); the bytes are what verification hashes.
      return new File([stored.file], stored.name || "document", {
        type: stored.type || (stored.file as Blob).type,
      });
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

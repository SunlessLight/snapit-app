// Persists the *latest* generated result so it survives a tab close / phone lock /
// reload. "Latest only" — every save overwrites the previous one; Start Over clears it.
// There is no history list (that would be a backend concern).
//
// Two stores, by data shape:
//  - TEXT + small flags  → localStorage (`snapit:savedResult`). Synchronous on boot, so
//    App.jsx can seed aiOutput and decide the landing step before first paint.
//  - The two RESULT IMAGES (before + after) → IndexedDB Blobs. IndexedDB stores binary
//    natively (no base64 bloat) and has a far larger quota than localStorage's ~5MB,
//    which a single full-res food photo — let alone two — would blow past.

const META_KEY = 'snapit:savedResult';
const META_VERSION = 1;

const DB_NAME = 'snapit';
const DB_VERSION = 1;
const STORE = 'resultImages';
const BEFORE_KEY = 'before';
const AFTER_KEY = 'after';

// ---------- Text + flags (localStorage) ----------

export function saveResultMeta(meta) {
  try {
    localStorage.setItem(
      META_KEY,
      JSON.stringify({ version: META_VERSION, savedAt: Date.now(), ...meta })
    );
  } catch { /* storage full or disabled — degrade silently */ }
}

export function loadResultMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // A version bump invalidates old snapshots rather than risking a bad restore.
    if (parsed.version !== META_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearResultMeta() {
  try { localStorage.removeItem(META_KEY); } catch { /* ignore */ }
}

// ---------- Result images (IndexedDB) ----------

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no-indexeddb')); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Turn whatever the Results Hub resolved a src to — a blob: URL, a data: URL, a bundled
// asset URL, or an http(s) URL — into a Blob. fetch() handles all of these uniformly.
async function srcToBlob(src) {
  if (!src) return null;
  const res = await fetch(src);
  return res.blob();
}

export async function saveResultImages(beforeSrc, afterSrc) {
  try {
    const [beforeBlob, afterBlob] = await Promise.all([srcToBlob(beforeSrc), srcToBlob(afterSrc)]);
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      const store = tx.objectStore(STORE);
      store.put(beforeBlob, BEFORE_KEY);
      store.put(afterBlob, AFTER_KEY);
    });
    db.close();
  } catch { /* IDB unavailable or a fetch failed — the text snapshot still persists */ }
}

// Returns object URLs (or null) for the two stored Blobs. The caller owns these URLs and
// is responsible for revoking them (App.jsx feeds them into mediaState, which already has
// blob-URL revocation on Start Over / unmount).
export async function loadResultImages() {
  try {
    const db = await openDb();
    const read = (key) => new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
    const [beforeBlob, afterBlob] = await Promise.all([read(BEFORE_KEY), read(AFTER_KEY)]);
    db.close();
    return {
      beforeUrl: beforeBlob ? URL.createObjectURL(beforeBlob) : null,
      afterUrl: afterBlob ? URL.createObjectURL(afterBlob) : null,
    };
  } catch {
    return { beforeUrl: null, afterUrl: null };
  }
}

export async function clearResultImages() {
  try {
    const db = await openDb();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = resolve;
      tx.onerror = resolve;
      tx.objectStore(STORE).clear();
    });
    db.close();
  } catch { /* ignore */ }
}

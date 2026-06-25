// IndexedDB storage for AI-generated pixel sprites.
// Sprites are stored as base64 PNG strings, keyed by `${characterId}::${pose}`.

const DB_NAME    = 'yingling_sprites';
const STORE_NAME = 'sprites';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function key(characterId: string, pose: string) {
  return `${characterId}::${pose}`;
}

export const SpriteStore = {
  async save(characterId: string, pose: string, b64: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(b64, key(characterId, pose));
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  },

  async get(characterId: string, pose: string): Promise<string | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key(characterId, pose));
      req.onsuccess = () => resolve((req.result as string) ?? null);
      req.onerror   = () => reject(req.error);
    });
  },

  async getAll(characterId: string, poses: string[]): Promise<Record<string, string | null>> {
    const db = await openDB();
    const result: Record<string, string | null> = {};
    await Promise.all(poses.map(pose => new Promise<void>((resolve, reject) => {
      const tx  = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key(characterId, pose));
      req.onsuccess = () => { result[pose] = (req.result as string) ?? null; resolve(); };
      req.onerror   = () => reject(req.error);
    })));
    return result;
  },

  async clearAll(characterId: string, poses: string[]): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      poses.forEach(pose => store.delete(key(characterId, pose)));
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  },

  /** Check if all 9 poses are stored for a character */
  async hasAllSprites(characterId: string, poses: string[]): Promise<boolean> {
    const all = await this.getAll(characterId, poses);
    return poses.every(p => all[p] != null);
  },
};

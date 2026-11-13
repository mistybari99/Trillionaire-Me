// Saved prayer times: one small IndexedDB database of its own ("tm-prayer"), apart from the user's records. It holds public timetable
// numbers and the time of the last try, nothing personal, so it needs no consent gate and is not part of backups.
import type { AttemptRecord, PrayerCache } from "../core/prayerSource";

export interface PrayerCacheRepo {
  load(): Promise<{ cache: PrayerCache | null; attempt: AttemptRecord | null }>;
  saveCache(c: PrayerCache): Promise<void>;
  saveAttempt(a: AttemptRecord): Promise<void>;
  clear(): Promise<void>;
}

export class MemoryPrayerCache implements PrayerCacheRepo {
  cache: PrayerCache | null = null; attempt: AttemptRecord | null = null;
  async load() { return { cache: this.cache, attempt: this.attempt }; }
  async saveCache(c: PrayerCache) { this.cache = c; }
  async saveAttempt(a: AttemptRecord) { this.attempt = a; }
  async clear() { this.cache = null; this.attempt = null; }
}

const DB = "tm-prayer", STORE = "kv";
const open = (): Promise<IDBDatabase> => new Promise((res, rej) => {
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => { r.result.createObjectStore(STORE); };
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
});
const run = async <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await open();
  try { return await new Promise<T>((res, rej) => { const req = fn(db.transaction(STORE, mode).objectStore(STORE)); req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); }); }
  finally { db.close(); }
};
const isCache = (v: unknown): v is PrayerCache => { const o = v as PrayerCache | null; return !!o && o.v === 1 && typeof o.key === "string" && typeof o.fetchedAt === "string" && typeof o.days === "object" && o.days !== null; };
const isAttempt = (v: unknown): v is AttemptRecord => { const o = v as AttemptRecord | null; return !!o && typeof o.at === "string" && typeof o.key === "string"; };

export class IdbPrayerCache implements PrayerCacheRepo {
  async load() {
    try { const c = await run("readonly", (s) => s.get("cache")), a = await run("readonly", (s) => s.get("attempt")); return { cache: isCache(c) ? c : null, attempt: isAttempt(a) ? a : null }; }
    catch { return { cache: null, attempt: null }; }
  }
  async saveCache(c: PrayerCache) { try { await run("readwrite", (s) => s.put(c, "cache")); } catch { /* the local calculation still answers */ } }
  async saveAttempt(a: AttemptRecord) { try { await run("readwrite", (s) => s.put(a, "attempt")); } catch { /* ignore */ } }
  async clear() { try { await run("readwrite", (s) => s.clear()); } catch { /* ignore */ } }
}

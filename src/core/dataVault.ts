// At-rest encryption of REAL records (option C, stage 1; docs/design/at-rest-encryption.md). Pure: WebCrypto + a KV and a RecordRepo passed in. No UI, no network.
// Key format: a random 256-bit data key, wrapped by AES-GCM-256 under PBKDF2-SHA256(passphrase). The wrapper lives under "tm:secret:vault" (never in a backup,
// export, snapshot, CSV or log). Only the record `values` and `links` are sealed (AES-GCM, random 12-byte IV per write, "ns|id" as AAD); ns, id, entity,
// schemaVersion, createdAt and ownerId stay plain so the indexes work. Demo records are never sealed. Marker on a sealed record: enc = 1.
// Rule of this file: a plain copy is never removed until the sealed copy has been written, read back and opened; any doubt keeps the original.
import { PBKDF2_ITERATIONS, deriveKey, passphraseProblem } from "./cryptoBackup";
import type { KV } from "./store";
import type { RecordRepo } from "./repo";
import type { Snapshot, SnapshotRepo } from "./snapshots";
import type { TMRecord } from "./types";

export const VAULT_KEY = "tm:secret:vault";
export const VAULT_BATCH = 200;
export const DEFAULT_VAULT_ITERATIONS = PBKDF2_ITERATIONS;
const WRAP_AAD = "trillionaire-me/vault-wrap/v1";

export class VaultError extends Error {}
export class VaultPassphraseError extends VaultError {}
export class VaultDecryptError extends VaultError {}

export type VaultState = "migrating" | "on" | "disabling";
export interface VaultConfig {
  v: 1; kdf: "PBKDF2-SHA256"; iterations: number; salt: string; iv: string; wrapped: string;
  state: VaultState; /** progress marker: records sealed (or opened) so far in the current run */ done: number; total: number;
  fails: number; waitUntil: number; createdAt: string;
}

const enc = new TextEncoder(), dec = new TextDecoder();
const subtle = () => { const s = globalThis.crypto?.subtle; if (!s) throw new VaultError("This browser cannot encrypt (WebCrypto missing)."); return s; };
const b64 = (u: Uint8Array): string => { let s = ""; for (const c of u) s += String.fromCharCode(c); return btoa(s); };
const unb64 = (s: string): Uint8Array => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
const bs = (u: Uint8Array) => u as BufferSource;

/** Passphrase rules: 8+ characters, not digits only (a digits-only secret is too easy to guess offline). */
export const vaultPassphraseProblem = (p: string): "empty" | "short" | "digits" | null => {
  const base = passphraseProblem(p); if (base) return base;
  return /^\d+$/.test(p) ? "digits" : null;
};

// ---- key and wrapper ----
async function importData(raw: Uint8Array): Promise<CryptoKey> { return subtle().importKey("raw", bs(raw), "AES-GCM", false, ["encrypt", "decrypt"]); }

/** Makes a new random data key and wraps it. The returned config is not stored yet (state "migrating"). */
export async function newVault(passphrase: string, iterations = DEFAULT_VAULT_ITERATIONS, now = new Date()): Promise<{ config: VaultConfig; key: CryptoKey }> {
  if (vaultPassphraseProblem(passphrase)) throw new VaultPassphraseError("Passphrase is too weak.");
  const raw = crypto.getRandomValues(new Uint8Array(32)), salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const kek = await deriveKey(passphrase, salt, iterations);
  const wrapped = new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv: bs(iv), additionalData: bs(enc.encode(WRAP_AAD)) }, kek, bs(raw)));
  const key = await importData(raw); raw.fill(0);
  return { key, config: { v: 1, kdf: "PBKDF2-SHA256", iterations, salt: b64(salt), iv: b64(iv), wrapped: b64(wrapped), state: "migrating", done: 0, total: 0, fails: 0, waitUntil: 0, createdAt: now.toISOString() } };
}

/** Opens the wrapper. Wrong passphrase and a damaged wrapper fail the same way. */
export async function unlockVault(config: VaultConfig, passphrase: string): Promise<CryptoKey> {
  if (vaultPassphraseProblem(passphrase)) throw new VaultPassphraseError("Passphrase is too weak.");
  try {
    const kek = await deriveKey(passphrase, unb64(config.salt), config.iterations);
    const raw = new Uint8Array(await subtle().decrypt({ name: "AES-GCM", iv: bs(unb64(config.iv)), additionalData: bs(enc.encode(WRAP_AAD)) }, kek, bs(unb64(config.wrapped))));
    const key = await importData(raw); raw.fill(0); return key;
  } catch { throw new VaultPassphraseError("Wrong passphrase."); }
}

// ---- config in the per-device store ----
export function readVault(kv: KV): VaultConfig | null {
  try {
    const o = JSON.parse(kv.get(VAULT_KEY) ?? "null") as Partial<VaultConfig> | null;
    if (!o || o.v !== 1 || typeof o.salt !== "string" || typeof o.iv !== "string" || typeof o.wrapped !== "string" || !Number.isInteger(o.iterations) || (o.iterations as number) < 1) return null;
    const state: VaultState = o.state === "on" || o.state === "disabling" ? o.state : "migrating";
    return { v: 1, kdf: "PBKDF2-SHA256", iterations: o.iterations as number, salt: o.salt, iv: o.iv, wrapped: o.wrapped, state,
      done: Number.isInteger(o.done) ? (o.done as number) : 0, total: Number.isInteger(o.total) ? (o.total as number) : 0,
      fails: Number.isInteger(o.fails) ? (o.fails as number) : 0, waitUntil: typeof o.waitUntil === "number" ? o.waitUntil : 0, createdAt: typeof o.createdAt === "string" ? o.createdAt : "" };
  } catch { return null; }
}
export const writeVault = (kv: KV, c: VaultConfig): void => kv.set(VAULT_KEY, JSON.stringify(c));
export const vaultActive = (kv: KV): boolean => readVault(kv) !== null;

export type VerifyVault = { ok: true; key: CryptoKey } | { ok: false; reason: "wrong" | "wait" | "none" | "format"; waitSeconds?: number };
/** Same slowdown as the PIN lock: after 5 wrong tries in a row the phone waits 30 s, 60 s, 120 s ... (max 15 min), even for the right passphrase. Data is never touched. */
export async function verifyVaultPassphrase(kv: KV, passphrase: string, now: number): Promise<VerifyVault> {
  const c = readVault(kv); if (!c) return { ok: false, reason: "none" };
  if (c.waitUntil > now) return { ok: false, reason: "wait", waitSeconds: Math.ceil((c.waitUntil - now) / 1000) };
  if (vaultPassphraseProblem(passphrase)) return { ok: false, reason: "format" };
  try {
    const key = await unlockVault(c, passphrase);
    if (c.fails || c.waitUntil) writeVault(kv, { ...c, fails: 0, waitUntil: 0 });
    return { ok: true, key };
  } catch {
    const fails = c.fails + 1, wait = fails >= 5 ? Math.min(30 * 2 ** (fails - 5), 900) * 1000 : 0;
    writeVault(kv, { ...c, fails, waitUntil: wait ? now + wait : 0 });
    return wait ? { ok: false, reason: "wait", waitSeconds: Math.ceil(wait / 1000) } : { ok: false, reason: "wrong" };
  }
}

// ---- one record ----
export const isEncRecord = (r: TMRecord | null | undefined): r is TMRecord & { enc: 1; iv: string; ct: string } => !!r && r.enc === 1 && typeof r.iv === "string" && typeof r.ct === "string";
const recAad = (ns: string, id: string) => bs(enc.encode(`tm-vault/rec/1|${ns}|${id}`));

const HEAD = ["id", "entity", "ns", "ownerId", "schemaVersion", "createdAt"];
const payloadOf = (rec: TMRecord): Record<string, unknown> => Object.fromEntries(Object.entries(rec).filter(([k, v]) => !HEAD.includes(k) && v !== undefined));
/** Seals a real record. Demo records and already sealed records are returned as they are. */
export async function encryptRecord(key: CryptoKey, rec: TMRecord): Promise<TMRecord> {
  if (rec.ns !== "real" || isEncRecord(rec)) return rec;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv: bs(iv), additionalData: recAad(rec.ns, rec.id) }, key, bs(enc.encode(JSON.stringify(payloadOf(rec))))));
  return { id: rec.id, entity: rec.entity, ns: rec.ns, ownerId: rec.ownerId, schemaVersion: rec.schemaVersion, createdAt: rec.createdAt, values: {}, enc: 1, iv: b64(iv), ct: b64(ct) };
}
/** Opens a sealed record. Any failure (wrong key, flipped byte, record moved to another id) throws VaultDecryptError. */
export async function decryptRecord(key: CryptoKey, rec: TMRecord): Promise<TMRecord> {
  if (!isEncRecord(rec)) return rec;
  try {
    const pt = await subtle().decrypt({ name: "AES-GCM", iv: bs(unb64(rec.iv)), additionalData: recAad(rec.ns, rec.id) }, key, bs(unb64(rec.ct)));
    const p = JSON.parse(dec.decode(pt)) as Partial<TMRecord>;
    if (!p || typeof p !== "object" || !p.values) throw new Error("bad payload");
    return { ...p, id: rec.id, entity: rec.entity, ns: rec.ns, ownerId: rec.ownerId, schemaVersion: rec.schemaVersion, createdAt: rec.createdAt, values: p.values } as TMRecord;
  } catch { throw new VaultDecryptError("This entry cannot be opened."); }
}
/** A stand-in for a sealed record that cannot be opened. It lives in memory only; the ciphertext stays in storage. */
export const cantOpenStub = (rec: TMRecord): TMRecord => ({ id: rec.id, entity: rec.entity, ns: rec.ns, ownerId: rec.ownerId, schemaVersion: rec.schemaVersion, createdAt: rec.createdAt, values: {}, cantOpen: true });

// ---- in-place runs (activation and rollback) ----
export interface RunOptions { batch?: number; /** called after each batch was written and read back; a throw here stops the run (used for the power-cut tests) */ afterBatch?: (done: number, total: number) => void | Promise<void>; shouldStop?: () => boolean; /** rollback only: leave the settings (state "disabling") so the caller can finish other steps first; call finishDeactivate after */ keepConfig?: boolean }
export interface RunResult { done: number; total: number }
const sorted = (x: unknown): unknown => (Array.isArray(x) ? x.map(sorted) : x && typeof x === "object" ? Object.fromEntries(Object.entries(x as Record<string, unknown>).filter(([, v]) => v !== undefined).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => [k, sorted(v)])) : x);
const canon = (r: TMRecord) => JSON.stringify(sorted(r));

/**
 * Seals every plain real record, `batch` at a time. Each record is written, read back and opened before the next batch starts; if the read-back
 * differs, the original is put back and the run stops. Resumable: records already sealed are skipped. The state flips to "on" only when no plain real
 * record is left. A sealed record that cannot be opened is left untouched.
 */
export async function activateInPlace(repo: RecordRepo, key: CryptoKey, kv: KV, o: RunOptions = {}): Promise<RunResult> {
  const batch = Math.max(1, o.batch ?? VAULT_BATCH);
  const cfg = () => { const c = readVault(kv); if (!c) throw new VaultError("The vault settings are missing."); return c; };
  const all = await repo.list("real"); const todo = all.filter((r) => !isEncRecord(r)); const total = all.length; let done = total - todo.length;
  writeVault(kv, { ...cfg(), state: "migrating", done, total });
  for (let i = 0; i < todo.length; i += batch) {
    if (o.shouldStop?.()) throw new VaultError("stopped");
    for (const listed of todo.slice(i, i + batch)) {
      const orig = (await repo.get("real", listed.id)) ?? listed; // newest copy; a record sealed meanwhile is skipped
      if (isEncRecord(orig)) { continue; }
      await repo.put(await encryptRecord(key, orig));
      let ok = false;
      try { const back = await repo.get("real", orig.id); ok = isEncRecord(back) && canon(await decryptRecord(key, back)) === canon(orig); } catch { ok = false; }
      if (!ok) { await repo.put(orig); throw new VaultError(`Could not verify the sealed copy of ${orig.id}; the original was kept.`); }
    }
    done = Math.min(total, done + Math.min(batch, todo.length - i));
    writeVault(kv, { ...cfg(), done, total });
    await o.afterBatch?.(done, total);
  }
  const left = (await repo.list("real")).filter((r) => !isEncRecord(r)).length;
  if (left > 0) throw new VaultError("Some entries are still plain; the vault stays in 'turning on'.");
  writeVault(kv, { ...cfg(), state: "on", done: total, total });
  return { done: total, total };
}

/** Rollback: opens every sealed real record in place, batch by batch. The vault settings are removed only when none is left. A record that cannot be opened stops the run and keeps its ciphertext. */
export async function deactivateInPlace(repo: RecordRepo, key: CryptoKey, kv: KV, o: RunOptions = {}): Promise<RunResult> {
  const batch = Math.max(1, o.batch ?? VAULT_BATCH);
  const cfg = () => { const c = readVault(kv); if (!c) throw new VaultError("The vault settings are missing."); return c; };
  const all = await repo.list("real"); const todo = all.filter(isEncRecord); const total = all.length; let done = 0;
  writeVault(kv, { ...cfg(), state: "disabling", done: 0, total: todo.length });
  for (let i = 0; i < todo.length; i += batch) {
    if (o.shouldStop?.()) throw new VaultError("stopped");
    for (const sealed of todo.slice(i, i + batch)) {
      const cur = (await repo.get("real", sealed.id)) ?? sealed; if (!isEncRecord(cur)) continue;
      const plain = await decryptRecord(key, cur); // throws: ciphertext stays, config stays
      await repo.put(plain);
      const back = await repo.get("real", plain.id);
      if (!back || isEncRecord(back) || canon(back) !== canon(plain)) { await repo.put(cur); throw new VaultError(`Could not verify the opened copy of ${plain.id}; the sealed copy was kept.`); }
    }
    done = Math.min(todo.length, done + batch);
    writeVault(kv, { ...cfg(), done, total: todo.length });
    await o.afterBatch?.(done, todo.length);
  }
  if ((await repo.list("real")).some(isEncRecord)) throw new VaultError("Some entries are still sealed; the vault settings were kept.");
  if (!o.keepConfig) kv.remove(VAULT_KEY);
  return { done: todo.length, total };
}

// ---- snapshots: the real part is sealed with the data key, or left out. Never plain while the vault is on ----
interface SealedSnapshot extends Snapshot { realEnc?: { iv: string; ct: string } }
const snapAad = (id: string) => bs(enc.encode(`tm-vault/snap/1|${id}`));
async function sealPart(key: CryptoKey, s: Snapshot): Promise<SealedSnapshot> {
  const { real, ...rest } = s as SealedSnapshot; delete rest.realEnc;
  if (!real) return { ...rest, real: null };
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv: bs(iv), additionalData: snapAad(s.id) }, key, bs(enc.encode(JSON.stringify(real)))));
  return { ...rest, real: null, realEnc: { iv: b64(iv), ct: b64(ct) } };
}
async function openPart(key: CryptoKey, s: SealedSnapshot): Promise<Snapshot> {
  const { realEnc, ...rest } = s; if (!realEnc) return rest;
  try { return { ...rest, real: JSON.parse(dec.decode(await subtle().decrypt({ name: "AES-GCM", iv: bs(unb64(realEnc.iv)), additionalData: snapAad(s.id) }, key, bs(unb64(realEnc.ct))))) }; }
  catch { return { ...rest, real: null }; }
}

/** Wraps the snapshot store. While the vault is on, a snapshot's real part is sealed on the way in and opened on the way out (only with the key). Without the key it is dropped, never stored plain. */
export class VaultSnapshotRepo implements SnapshotRepo {
  constructor(private inner: SnapshotRepo, private getKey: () => CryptoKey | null, private active: () => boolean) {}
  async list(): Promise<Snapshot[]> {
    const raw = await this.inner.list(); if (!this.active()) return raw;
    const key = this.getKey();
    return Promise.all(raw.map(async (s) => ((s as SealedSnapshot).realEnc ? (key ? openPart(key, s as SealedSnapshot) : (({ realEnc: _x, ...r }: SealedSnapshot) => ({ ...r, real: null }))(s as SealedSnapshot)) : s)));
  }
  async put(s: Snapshot): Promise<void> {
    if (!this.active()) return this.inner.put(s);
    const key = this.getKey();
    await this.inner.put(key ? await sealPart(key, s) : { ...s, real: null });
  }
  delete(id: string): Promise<void> { return this.inner.delete(id); }
}
/** At activation: seals the real part of every older (plain) snapshot. Run after the records were verified. */
export async function sealSnapshots(inner: SnapshotRepo, key: CryptoKey): Promise<number> {
  let n = 0; for (const s of await inner.list()) if (s.real) { await inner.put(await sealPart(key, s)); n++; } return n;
}
/** At rollback: opens the sealed real part of every snapshot again. */
export async function openSnapshots(inner: SnapshotRepo, key: CryptoKey): Promise<number> {
  let n = 0; for (const s of await inner.list()) if ((s as SealedSnapshot).realEnc) { await inner.put(await openPart(key, s as SealedSnapshot)); n++; } return n;
}

// ---- one tab migrates at a time ----
/** Runs `fn` only if no other tab holds the lock. Returns false when another tab is busy. Without the Web Locks API it just runs (single tab). */
export async function tryExclusive(name: string, fn: () => Promise<void>): Promise<boolean> {
  const locks = (globalThis.navigator as Navigator & { locks?: LockManager } | undefined)?.locks;
  if (!locks) { await fn(); return true; }
  let ran = false;
  await locks.request(name, { ifAvailable: true }, async (lock) => { if (!lock) return; ran = true; await fn(); });
  return ran;
}

// ---- the live session: the data key lives in memory only ----
/** Holds the unlocked key for this tab. It implements what persist.ts needs. The key is valid only while the stored wrapper is the one it was opened from, so a tab that
 *  missed a "turn off, turn on again" in another tab cannot seal new writes with an old key. */
export class VaultSession {
  private k: CryptoKey | null = null; private w: string | null = null; private opaque = new Set<string>();
  constructor(private kv: KV) {}
  active(): boolean { return readVault(this.kv) !== null; }
  key(): CryptoKey | null { const c = readVault(this.kv); return this.k && c && c.wrapped === this.w ? this.k : null; }
  /** locked = the vault is on and this tab has no usable key */
  locked(): boolean { return this.active() && this.key() === null; }
  setKey(k: CryptoKey): void { this.k = k; this.w = readVault(this.kv)?.wrapped ?? null; }
  lock(): void { this.k = null; this.w = null; }
  isOpaque(k: string): boolean { return this.opaque.has(k); }
  markOpaque(k: string): void { this.opaque.add(k); }
  clearOpaque(): void { this.opaque.clear(); }
  get opaqueCount(): number { return this.opaque.size; }
}

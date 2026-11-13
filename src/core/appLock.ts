// Optional app lock (pure: WebCrypto + a KV passed in; no UI, no network). OFF by default.
// What it is: a privacy screen so a person who picks up the phone while the app is open cannot read it. It is NOT encryption of the records
// (see docs/design/at-rest-encryption.md). The PIN is stored only as a salted slow hash (PBKDF2-SHA256), under "tm:secret:" so no backup,
// snapshot, export or CSV ever reads it. Forgot-PIN never deletes data: it removes only the PIN, after a visible waiting period and a tick.
import type { KV } from "./store";

export const LOCK_KEY = "tm:secret:applock";
export const LOCK_ITERATIONS = 310_000;
export const PIN_MIN = 4;
export const PIN_MAX = 8;
/** Minutes the phone must wait after "I forgot my PIN" before the PIN can be removed. Data is never touched. */
export const RESET_WAIT_MIN = 15;
export const AUTO_CHOICES = [0, 1, 5, 15] as const;
export type AutoMinutes = (typeof AUTO_CHOICES)[number];
export const isAuto = (n: unknown): n is AutoMinutes => (AUTO_CHOICES as readonly unknown[]).includes(n);

export interface LockConfig { v: 1; salt: string; hash: string; iterations: number; auto: AutoMinutes; resetAt: number | null; fails: number; waitUntil: number }

export type PinProblem = "format" | "mismatch";
/** Digits only, 4 to 8 long. */
export const pinProblem = (pin: string, again?: string): PinProblem | null => (!/^\d+$/.test(pin) || pin.length < PIN_MIN || pin.length > PIN_MAX ? "format" : again !== undefined && again !== pin ? "mismatch" : null);

const enc = new TextEncoder();
const b64 = (u: Uint8Array): string => { let s = ""; for (const c of u) s += String.fromCharCode(c); return btoa(s); };
const unb64 = (s: string): Uint8Array => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };

export async function hashPin(pin: string, salt: Uint8Array, iterations: number): Promise<string> {
  const s = globalThis.crypto?.subtle; if (!s) throw new Error("This browser cannot protect a PIN (WebCrypto missing).");
  const base = await s.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"]);
  return b64(new Uint8Array(await s.deriveBits({ name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" }, base, 256)));
}
const same = (a: string, b: string): boolean => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };

export function readLock(kv: KV): LockConfig | null {
  try {
    const o = JSON.parse(kv.get(LOCK_KEY) ?? "null") as Partial<LockConfig> | null;
    if (!o || o.v !== 1 || typeof o.salt !== "string" || typeof o.hash !== "string" || !Number.isInteger(o.iterations) || (o.iterations as number) < 1) return null;
    return { v: 1, salt: o.salt, hash: o.hash, iterations: o.iterations as number, auto: isAuto(o.auto) ? o.auto : 0, resetAt: typeof o.resetAt === "number" ? o.resetAt : null, fails: Number.isInteger(o.fails) ? (o.fails as number) : 0, waitUntil: typeof o.waitUntil === "number" ? o.waitUntil : 0 };
  } catch { return null; }
}
const write = (kv: KV, c: LockConfig) => kv.set(LOCK_KEY, JSON.stringify(c));
export const lockEnabled = (kv: KV): boolean => readLock(kv) !== null;

export async function setPin(kv: KV, pin: string, again: string, iterations = LOCK_ITERATIONS): Promise<void> {
  const p = pinProblem(pin, again); if (p) throw new Error(p);
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const old = readLock(kv);
  write(kv, { v: 1, salt: b64(salt), hash: await hashPin(pin, salt, iterations), iterations, auto: old?.auto ?? 0, resetAt: null, fails: 0, waitUntil: 0 });
}

export type VerifyResult = { ok: true } | { ok: false; reason: "wrong" | "wait" | "none"; waitSeconds?: number };
/** After 5 wrong tries in a row the phone waits 30 s, then 60 s, 120 s ... (max 15 min). Counted per device; a right PIN resets it. */
export async function verifyPin(kv: KV, pin: string, now: number): Promise<VerifyResult> {
  const c = readLock(kv); if (!c) return { ok: false, reason: "none" };
  if (c.waitUntil > now) return { ok: false, reason: "wait", waitSeconds: Math.ceil((c.waitUntil - now) / 1000) };
  const ok = pinProblem(pin) === null && same(await hashPin(pin, unb64(c.salt), c.iterations), c.hash);
  if (ok) { write(kv, { ...c, fails: 0, waitUntil: 0, resetAt: null }); return { ok: true }; }
  const fails = c.fails + 1;
  const wait = fails >= 5 ? Math.min(30 * 2 ** (fails - 5), 900) * 1000 : 0;
  write(kv, { ...c, fails, waitUntil: wait ? now + wait : 0 });
  return wait ? { ok: false, reason: "wait", waitSeconds: Math.ceil(wait / 1000) } : { ok: false, reason: "wrong" };
}

/** Turning the lock off needs the current PIN. */
export async function removeWithPin(kv: KV, pin: string, now: number): Promise<VerifyResult> {
  const r = await verifyPin(kv, pin, now); if (r.ok) kv.remove(LOCK_KEY); return r;
}

export function setAuto(kv: KV, auto: number): void { const c = readLock(kv); if (c && isAuto(auto)) write(kv, { ...c, auto }); }

/** "I forgot my PIN": starts the waiting period. Nothing is deleted. Returns when the PIN can be removed. */
export function startForgot(kv: KV, now: number): number | null {
  const c = readLock(kv); if (!c) return null;
  const at = c.resetAt ?? now; write(kv, { ...c, resetAt: at }); return at + RESET_WAIT_MIN * 60_000;
}
export const forgotReadyAt = (kv: KV): number | null => { const c = readLock(kv); return c?.resetAt != null ? c.resetAt + RESET_WAIT_MIN * 60_000 : null; };
/** Removes only the PIN (never any record), once the waiting period is over and the person confirmed. */
export function finishForgot(kv: KV, now: number, confirmed: boolean): boolean {
  const ready = forgotReadyAt(kv); if (!confirmed || ready === null || now < ready) return false;
  kv.remove(LOCK_KEY); return true;
}

/** Should the app lock after being hidden? `auto` minutes; 0 = every time it is hidden. */
export const shouldLockAfterHide = (auto: AutoMinutes, hiddenAt: number, now: number): boolean => auto === 0 || now - hiddenAt >= auto * 60_000;

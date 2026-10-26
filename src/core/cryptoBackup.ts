// Encrypted backup (build step 4). WebCrypto only: PBKDF2-SHA256 -> AES-GCM-256, random salt and IV per backup.
// Pure functions: no UI, no network, no storage. The passphrase is never stored, logged or put in an error message.
import type { BackupFile } from "./backup";
import { BackupError, parseBackup } from "./backup";

export const PBKDF2_ITERATIONS = 600_000;
export const MIN_PASSPHRASE = 8;
const AAD = "trillionaire-me/enc-backup/v1";

export interface EncryptedBackup { app: "trillionaire-me"; kind: "encrypted-backup"; v: 1; kdf: "PBKDF2-SHA256"; iterations: number; cipher: "AES-GCM-256"; salt: string; iv: string; data: string }
/** Plain content inside the encryption: demo and real are kept apart, each with its own namespace label. */
export interface BackupBundle { demo: BackupFile; real: BackupFile | null }

export class PassphraseError extends Error {}
export class DecryptError extends BackupError {}

const enc = new TextEncoder();
const subtle = () => { const s = globalThis.crypto?.subtle; if (!s) throw new BackupError("This browser cannot encrypt (WebCrypto missing)."); return s; };
const b64 = (u: Uint8Array): string => { let s = ""; for (const c of u) s += String.fromCharCode(c); return btoa(s); };
const unb64 = (s: string): Uint8Array => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };

/** Empty or short passphrases are refused. Returns an error key-less reason or null when fine. */
export const passphraseProblem = (p: string): "empty" | "short" | null => (p.trim() === "" ? "empty" : p.length < MIN_PASSPHRASE ? "short" : null);

async function deriveKey(pass: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const base = await subtle().importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]);
  return subtle().deriveKey({ name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function encryptBackup(bundle: BackupBundle, passphrase: string, iterations = PBKDF2_ITERATIONS): Promise<EncryptedBackup> {
  if (passphraseProblem(passphrase)) throw new PassphraseError("Passphrase is empty or too short.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, iterations);
  const ct = await subtle().encrypt({ name: "AES-GCM", iv: iv as BufferSource, additionalData: enc.encode(AAD) as BufferSource }, key, enc.encode(JSON.stringify(bundle)) as BufferSource);
  return { app: "trillionaire-me", kind: "encrypted-backup", v: 1, kdf: "PBKDF2-SHA256", iterations, cipher: "AES-GCM-256", salt: b64(salt), iv: b64(iv), data: b64(new Uint8Array(ct)) };
}

/** True when the text looks like an encrypted backup envelope (used to pick the right restore path). */
export function isEncryptedBackup(text: string): boolean {
  try { const o = JSON.parse(text) as Partial<EncryptedBackup>; return o?.app === "trillionaire-me" && o.kind === "encrypted-backup"; } catch { return false; }
}

export function parseEnvelope(text: string): EncryptedBackup {
  let o: EncryptedBackup;
  try { o = JSON.parse(text) as EncryptedBackup; } catch { throw new DecryptError("This file is damaged or is not a backup."); }
  if (o?.app !== "trillionaire-me" || o.kind !== "encrypted-backup" || o.v !== 1 || o.kdf !== "PBKDF2-SHA256" || o.cipher !== "AES-GCM-256"
    || typeof o.salt !== "string" || typeof o.iv !== "string" || typeof o.data !== "string" || !Number.isInteger(o.iterations) || o.iterations < 1 || o.iterations > 10_000_000)
    throw new DecryptError("This file is damaged or is not an encrypted backup.");
  return o;
}

/** Decrypts and validates. Wrong passphrase and tampering both fail the same way (AES-GCM cannot tell them apart). Nothing is written here. */
export async function decryptBackup(text: string, passphrase: string): Promise<BackupBundle> {
  if (passphraseProblem(passphrase)) throw new PassphraseError("Passphrase is empty or too short.");
  const env = parseEnvelope(text);
  let plain: string;
  try {
    const key = await deriveKey(passphrase, unb64(env.salt), env.iterations);
    const pt = await subtle().decrypt({ name: "AES-GCM", iv: unb64(env.iv) as BufferSource, additionalData: enc.encode(AAD) as BufferSource }, key, unb64(env.data) as BufferSource);
    plain = new TextDecoder().decode(pt);
  } catch { throw new DecryptError("Wrong passphrase, or the file is damaged."); }
  let raw: { demo?: unknown; real?: unknown };
  try { raw = JSON.parse(plain); } catch { throw new DecryptError("Wrong passphrase, or the file is damaged."); }
  if (!raw || typeof raw !== "object" || !raw.demo) throw new DecryptError("The backup content is not valid.");
  const demo = parseBackup(JSON.stringify(raw.demo));
  const real = raw.real ? parseBackup(JSON.stringify(raw.real)) : null;
  // Each part must sit in its own namespace: a demo part can never become real, and the other way round.
  if (demo.ns !== "demo" || (real && real.ns !== "real")) throw new DecryptError("The backup content is not valid.");
  return { demo, real };
}

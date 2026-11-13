// The AI key. Same place as every other connection key (tm:secret:conn:aiAssistant, see connections.ts), so backup, CSV and export never read it.
// When at-rest encryption is on, the key is sealed with the data key through the existing vault functions (no new crypto).
import type { KV } from "./store";
import { checkConnectionKey, clearKey, hasKey, secretKey, type KeyProblem } from "./connections";
import { decryptRecord, encryptRecord, isEncRecord, type VaultSession } from "./dataVault";
import type { TMRecord } from "./types";
import { SCHEMA_VERSION } from "../schema/entities";

const ID = "aiAssistant" as const;
const wrap = (key: string): TMRecord => ({ id: "ai-key", entity: "ai_key", ns: "real", ownerId: "device", schemaVersion: SCHEMA_VERSION, createdAt: "1970-01-01T00:00:00.000Z", values: { key: { state: "value", value: key, label: "FACT" } } });
const parseSealed = (raw: string | null): TMRecord | null => { if (!raw || !raw.startsWith("{")) return null; try { const r = JSON.parse(raw) as TMRecord; return isEncRecord(r) ? r : null; } catch { return null; } };

export type AiKeyRead = { ok: true; key: string } | { ok: false; reason: "none" | "locked" | "unreadable" };
export type AiKeySave = { ok: true } | { ok: false; problem: KeyProblem | "locked" };

export const hasAiKey = (kv: KV): boolean => hasKey(kv, ID);
export const removeAiKey = (kv: KV): void => clearKey(kv, ID);

/** Saves a key that passed the shape check. Sealed when the vault is on; refused (nothing saved) when the vault is on but locked. */
export async function saveAiKey(kv: KV, session: VaultSession, input: string): Promise<AiKeySave> {
  const c = checkConnectionKey(input); if (!c.ok) return c;
  if (session.active()) {
    const k = session.key(); if (!k) return { ok: false, problem: "locked" };
    kv.set(secretKey(ID), JSON.stringify(await encryptRecord(k, wrap(c.value))));
  } else kv.set(secretKey(ID), c.value);
  return { ok: true };
}

export async function readAiKey(kv: KV, session: VaultSession): Promise<AiKeyRead> {
  const raw = kv.get(secretKey(ID)); if (!raw) return { ok: false, reason: "none" };
  const sealed = parseSealed(raw);
  if (!sealed) return { ok: true, key: raw };
  const k = session.key(); if (!k) return { ok: false, reason: "locked" };
  try { const v = (await decryptRecord(k, sealed)).values.key; return v?.state === "value" && typeof v.value === "string" ? { ok: true, key: v.value } : { ok: false, reason: "unreadable" }; } catch { return { ok: false, reason: "unreadable" }; }
}

/** A key saved while the vault was off is sealed once the vault is on and open. Returns true when it did. */
export async function sealAiKeyIfNeeded(kv: KV, session: VaultSession): Promise<boolean> {
  const raw = kv.get(secretKey(ID)); if (!raw || parseSealed(raw) || !session.active()) return false;
  const k = session.key(); if (!k) return false;
  kv.set(secretKey(ID), JSON.stringify(await encryptRecord(k, wrap(raw)))); return true;
}

/** Display form: dots and the last 4 characters. Locked or unreadable: dots only. */
export async function maskedAiKey(kv: KV, session: VaultSession): Promise<string | null> {
  if (!hasAiKey(kv)) return null;
  const r = await readAiKey(kv, session);
  return r.ok && r.key.length >= 8 ? `••••${r.key.slice(-4)}` : "••••••••";
}

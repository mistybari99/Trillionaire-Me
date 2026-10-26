// Connection settings per facility: owner approval flag, enabled flag, and a key/endpoint kept only on this device.
// Pure: works on the KV it is given. Fail closed: a missing or broken value means "off / not approved / no key".
// The key lives under "tm:secret:" so it can never match a record prefix ("tm:demo:" / "tm:real:") and is never read by backup or export code.
import type { KV } from "./store";
import { detectSecret } from "./safety";
import { isFacilityId, type ConnectionStatus, type FacilityId } from "./ports";

export const APPROVAL_VERSION = 1;
const approvedKey = (id: FacilityId) => `tm:ui:conn:approved:${id}`;
const enabledKey = (id: FacilityId) => `tm:ui:conn:on:${id}`;
export const secretKey = (id: FacilityId) => `tm:secret:conn:${id}`;

export const isApproved = (kv: KV, id: FacilityId): boolean => {
  try { const r = JSON.parse(kv.get(approvedKey(id)) ?? "null") as { v?: unknown; at?: unknown } | null; return r?.v === APPROVAL_VERSION && typeof r.at === "string"; } catch { return false; }
};
/** Call only after the user ticks the confirm. Records when, nothing else. */
export function grantApproval(kv: KV, id: FacilityId, nowIso: string): void { if (isFacilityId(id)) kv.set(approvedKey(id), JSON.stringify({ v: APPROVAL_VERSION, at: nowIso })); }
/** Withdrawing approval also switches the facility off. The saved key stays until the user removes it. */
export function withdrawApproval(kv: KV, id: FacilityId): void { kv.remove(approvedKey(id)); kv.remove(enabledKey(id)); }

export const isEnabled = (kv: KV, id: FacilityId): boolean => isApproved(kv, id) && kv.get(enabledKey(id)) === "1";
/** Returns false (and changes nothing) when approval is missing. */
export function setEnabled(kv: KV, id: FacilityId, on: boolean): boolean {
  if (!on) { kv.remove(enabledKey(id)); return true; }
  if (!isApproved(kv, id)) return false;
  kv.set(enabledKey(id), "1"); return true;
}

export const hasKey = (kv: KV, id: FacilityId): boolean => !!kv.get(secretKey(id));
export const readKey = (kv: KV, id: FacilityId): string | null => kv.get(secretKey(id));
export const clearKey = (kv: KV, id: FacilityId): void => kv.remove(secretKey(id));

export type KeyProblem = "empty" | "spaces" | "length" | "secret";
export type KeyCheck = { ok: true; value: string } | { ok: false; problem: KeyProblem };
const TOKEN = /^[A-Za-z0-9._~+/=:@%?&#-]+$/;

/** An API key or endpoint is one token without spaces. Cards, passwords, OTP, PIN, ID numbers, account numbers and recovery phrases are refused. */
export function checkConnectionKey(input: string): KeyCheck {
  const v = input.trim();
  if (!v) return { ok: false, problem: "empty" };
  if (/\s/.test(v)) return { ok: false, problem: "spaces" };
  if (v.length < 8 || v.length > 512) return { ok: false, problem: "length" };
  const kind = detectSecret(v);
  // A long token with letters can pass the card-number check by chance; that one kind is allowed for token-shaped keys only.
  const tokenShaped = TOKEN.test(v) && /[A-Za-z]/.test(v);
  if (kind && !(kind === "card" && tokenShaped)) return { ok: false, problem: "secret" };
  if (!tokenShaped) return { ok: false, problem: "secret" };
  return { ok: true, value: v };
}
/** Saves only a key that passed the check. */
export function saveKey(kv: KV, id: FacilityId, input: string): KeyCheck {
  const c = checkConnectionKey(input);
  if (c.ok) kv.set(secretKey(id), c.value);
  return c;
}

/** Display form: never any part of the key. */
export const MASK = "••••••••";

/** off: nothing asked. needs_approval: a key is saved but the owner approval is missing. connected: approved and switched on. */
export function connectionStatus(kv: KV, id: FacilityId): ConnectionStatus {
  if (isEnabled(kv, id)) return "connected";
  if (!isApproved(kv, id) && hasKey(kv, id)) return "needs_approval";
  return "off";
}

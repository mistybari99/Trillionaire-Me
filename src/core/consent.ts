// Real-data consent (D-B, owner approved 25 Oct 2026). Pure: reads and writes only the KV it is given.
// Fail closed: a missing, broken or unreadable value means "no consent".
import type { KV } from "./store";

export const CONSENT_KEY = "tm:consent:real:v1";
export const CONSENT_VERSION = 1;

interface ConsentRecord { v: number; at: string }

/** True only when a well-formed consent record for the current version is stored. */
export function readConsent(kv: KV): boolean {
  try {
    const raw = kv.get(CONSENT_KEY);
    if (!raw) return false;
    const rec = JSON.parse(raw) as Partial<ConsentRecord>;
    return rec.v === CONSENT_VERSION && typeof rec.at === "string";
  } catch {
    return false;
  }
}

/** Stores consent with the time it was given. Call only after the user ticks "I understand". */
export function grantConsent(kv: KV, nowIso: string): void {
  const rec: ConsentRecord = { v: CONSENT_VERSION, at: nowIso };
  kv.set(CONSENT_KEY, JSON.stringify(rec));
}

/** Removes consent. The next real entry needs a new tick. */
export function revokeConsent(kv: KV): void {
  kv.remove(CONSENT_KEY);
}

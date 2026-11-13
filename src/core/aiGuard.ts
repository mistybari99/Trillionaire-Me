// The single gate for every AI request. Nothing reaches a transport except through sendThroughGuard.
// Order of checks: 1 master switch, 2 kill switch, 3 key present (and host/model typed), 4 per-request consent, 5 spend limit,
// 6 secrets and private topics in the text, 7 real data only if ticked this time. Every refusal is plain text and never contains the key.
import type { KV } from "./store";
import { isEnabled } from "./connections";
import { detectSecret } from "./safety";
import { readAiKey, type AiKeyRead } from "./aiKey";
import { capState, recordUsage } from "./aiUsage";
import { isApiPath, isHostName, scrub, sendRaw, type AssistantCode, type AssistantProvider, type AssistantRequest, type AssistantResponse, type ProviderCredentials, type Transport } from "./assistant";
import type { VaultSession } from "./dataVault";

export const AI_KILL_KEY = "tm:ui:ai:kill";
export const AI_CONF_KEY = "tm:ui:ai:conf";
export type AiStyle = "chat" | "messages";
export interface AiConf { style: AiStyle; host: string; path: string; model: string; headers: Record<string, string> }
const EMPTY: AiConf = { style: "chat", host: "", path: "", model: "", headers: {} };

export function readConf(kv: KV): AiConf {
  try {
    const c = JSON.parse(kv.get(AI_CONF_KEY) ?? "null") as Partial<AiConf> | null; if (!c || typeof c !== "object") return { ...EMPTY };
    return { style: c.style === "messages" ? "messages" : "chat", host: typeof c.host === "string" ? c.host : "", path: typeof c.path === "string" ? c.path : "", model: typeof c.model === "string" ? c.model : "", headers: c.headers && typeof c.headers === "object" ? c.headers : {} };
  } catch { return { ...EMPTY }; }
}
/** Saves what the owner typed. A host with a scheme or slash, or a path that does not start with /, is refused. */
export function saveConf(kv: KV, c: AiConf): "ok" | "host" | "path" | "model" {
  const host = c.host.trim(), path = c.path.trim(), model = c.model.trim();
  if (!isHostName(host)) return "host";
  if (path && !isApiPath(path)) return "path";
  if (!model || model.length > 100 || /\s/.test(model)) return "model";
  kv.set(AI_CONF_KEY, JSON.stringify({ style: c.style, host, path, model, headers: c.headers })); return "ok";
}
export const confComplete = (c: AiConf): boolean => isHostName(c.host) && !!c.model;

export const isKilled = (kv: KV): boolean => kv.get(AI_KILL_KEY) === "1";
export const setKill = (kv: KV, on: boolean): void => { if (on) kv.set(AI_KILL_KEY, "1"); else kv.remove(AI_KILL_KEY); };

/** The two ticks the person gives for ONE request. They are read once and then cleared, so the next request starts unticked. */
export class RequestConsent {
  private c = false; private r = false;
  tick(confirmed: boolean, realData: boolean): void { this.c = confirmed; this.r = realData; }
  take(): { confirmed: boolean; realData: boolean } { const s = { confirmed: this.c, realData: this.r }; this.c = false; this.r = false; return s; }
}

/** Private topics never leave the phone, even when typed by hand. Matches whole words in English and Bangla. */
const NEVER_TOPIC = /(\bprayer\b|\bnamaz\b|\bsalah\b|\bquran\b|\bhealth\b|\bmedical\b|\bcontacts?\b|\bdeen\b|\bbank\b|\blocation\b|\bpassword\b|নামাজ|নামায|কুরআন|স্বাস্থ্য|কন্টাক্ট|দ্বীন|ব্যাংক|ব্যাংকের|লোকেশন|পাসওয়ার্ড)/i;
export type GuardCode = Extract<AssistantCode, "off" | "kill" | "no_key" | "config" | "no_consent" | "cap" | "secret" | "never" | "real" | "locked">;
/** Pure order check. Returns the first reason to refuse, or null. `key` is what readAiKey said. */
export function checkGuard(kv: KV, req: AssistantRequest, consent: { confirmed: boolean; realData: boolean }, key: AiKeyRead): GuardCode | null {
  if (!isEnabled(kv, "aiAssistant")) return "off";
  if (isKilled(kv)) return "kill";
  if (!key.ok) return key.reason === "locked" ? "locked" : "no_key";
  if (!confComplete(readConf(kv))) return "config";
  if (!consent.confirmed) return "no_consent";
  if (!capState(kv).ok) return "cap";
  const texts = req.messages.map((m) => m.content);
  if (texts.some((x) => detectSecret(x) !== null)) return "secret";
  if (texts.some((x) => NEVER_TOPIC.test(x))) return "never";
  const usesReal = req.includeRealData || req.messages.some((m) => m.fromRealData);
  if (usesReal && !consent.realData) return "real";
  return null;
}

export const GUARD_MESSAGES: Record<GuardCode, string> = {
  off: "AI is off.", kill: "The kill switch is on.", no_key: "No key saved.", config: "Host or model is missing.", no_consent: "Confirm this request first.",
  cap: "The limit is reached or not typed.", secret: "The text looks like a password, code or card number.", never: "Part of the text is private (prayer, health, contacts, bank or location).",
  real: "Real data was not ticked for this request.", locked: "The app is locked.",
};

export interface GuardDeps { kv: KV; vault: VaultSession; transport: Transport; providers: Record<AiStyle, AssistantProvider>; consent: RequestConsent; timeoutMs?: number }
export type GuardResult = { ok: true; value: AssistantResponse } | { ok: false; code: AssistantCode; message: string };

/** The only way to send. Consent ticks are cleared on every call, sent or refused. */
export async function sendThroughGuard(d: GuardDeps, req: AssistantRequest): Promise<GuardResult> {
  const ticks = d.consent.take();
  let key: AiKeyRead = { ok: false, reason: "none" };
  try { key = await readAiKey(d.kv, d.vault); } catch { key = { ok: false, reason: "unreadable" }; }
  const secret = key.ok ? key.key : null;
  try {
    const refuse = checkGuard(d.kv, req, ticks, key);
    if (refuse || !key.ok) { const code = refuse ?? "no_key"; return { ok: false, code, message: GUARD_MESSAGES[code as GuardCode] }; }
    const c = readConf(d.kv);
    const creds: ProviderCredentials = { apiKey: key.key, host: c.host, model: c.model, ...(c.path ? { path: c.path } : {}), extraHeaders: c.headers };
    const res = await sendRaw(d.providers[c.style], creds, req, d.transport, d.timeoutMs);
    if (res.ok) recordUsage(d.kv, res.value.usage);
    else if (res.code === "timeout" || res.code === "http" || res.code === "parse") recordUsage(d.kv, null);
    return res.ok ? res : { ok: false, code: res.code, message: scrub(res.message, secret) };
  } catch { return { ok: false, code: "blocked", message: "The request could not be made." }; }
}

// AI assistant layer (W1). Pure: no UI, no storage, no network. The network lives in an injected Transport.
// Built but OFF: nothing here sends anything. The single gate is src/core/aiGuard.ts. No vendor name, model or price is built in.
import { detectSecret } from "./safety";
import type { TMRecord } from "./types";
import { entityById } from "../schema/entities";

export const ASSISTANT_PURPOSES = ["explain", "draft", "summarize"] as const;
export type AssistantPurpose = typeof ASSISTANT_PURPOSES[number];
export interface AssistantMessage { role: "system" | "user" | "assistant"; content: string; /** true for text made from the owner's saved records */ fromRealData?: boolean }
export interface AssistantRequest { purpose: AssistantPurpose; messages: AssistantMessage[]; includeRealData: boolean }
/** Tokens the provider reported. Unknown is null, never 0. */
export interface AssistantUsage { inputTokens: number | null; outputTokens: number | null }
export interface AssistantResponse { text: string; usage: AssistantUsage }

/** Everything the owner typed to connect. There is no default for any of it. */
export interface ProviderCredentials { apiKey: string; host: string; model: string; path?: string; extraHeaders?: Record<string, string>; maxTokens?: number }
export interface HttpRequestSpec { host: string; path: string; headers: Record<string, string>; body: string }
export interface TransportResult { status: number; body: string }
export type Transport = (spec: HttpRequestSpec, signal?: AbortSignal) => Promise<TransportResult>;

export interface AssistantProvider {
  readonly id: string;
  buildRequest(req: AssistantRequest, creds: ProviderCredentials): HttpRequestSpec;
  parseResponse(raw: TransportResult): AssistantResponse;
}

export type AssistantCode = "off" | "kill" | "no_key" | "config" | "no_consent" | "cap" | "secret" | "never" | "real" | "locked" | "blocked" | "timeout" | "http" | "parse";
export class AssistantError extends Error {
  constructor(readonly code: AssistantCode, message: string) { super(message); this.name = "AssistantError"; }
}
export type AssistantResult = { ok: true; value: AssistantResponse } | { ok: false; code: AssistantCode; message: string };

/** Removes every trace of the key from a text that may leave the module (message, log, preview). */
export const scrub = (text: string, key: string | null | undefined): string => (key && key.length >= 4 ? text.split(key).join("[key]") : text);

export const isHostName = (h: string): boolean => /^(?=.{3,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(h) || /^localhost(:\d{1,5})?$/i.test(h);
export const isApiPath = (p: string): boolean => /^\/[A-Za-z0-9._~\/-]{0,200}$/.test(p) && !p.includes("//") && !p.includes("..");
const HEADER_NAME = /^[A-Za-z0-9-]{1,60}$/;
const FORBIDDEN_EXTRA = new Set(["authorization", "x-api-key", "host", "content-length", "content-type", "cookie"]);
/** Parses "Name: value" lines typed by the owner. Returns null when a line cannot be used. */
export function parseExtraHeaders(text: string): Record<string, string> | null {
  const out: Record<string, string> = {};
  for (const line of text.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const i = line.indexOf(":"); if (i < 1) return null;
    const name = line.slice(0, i).trim(), value = line.slice(i + 1).trim();
    if (!HEADER_NAME.test(name) || FORBIDDEN_EXTRA.has(name.toLowerCase()) || !value || /[\r\n]/.test(value) || value.length > 200) return null;
    out[name] = value;
  }
  return out;
}

/** What may be sent as context from saved records: titles of these kinds only. Prayer, Deen, health, money, contacts and notes never. */
export const CONTEXT_ENTITIES: readonly string[] = ["goal", "task", "habit", "risk", "north_star", "kpi"];
const TITLE_KEYS = ["goal.title", "task.title", "habit.title", "risk.title", "north_star.title", "kpi.title"];
export interface ContextLines { lines: string[]; real: boolean }
/** Short list of titles. Demo records carry the DEMO label; real records are used only when `allowReal` is true. */
export function contextFromRecords(records: TMRecord[], allowReal: boolean, max = 12): ContextLines {
  const lines: string[] = []; let real = false;
  for (const r of records) {
    if (lines.length >= max) break;
    if (r.enc === 1 || r.cantOpen || !CONTEXT_ENTITIES.includes(r.entity)) continue;
    const def = entityById(r.entity); if (!def || def.defaultPrivacy !== "personal") continue;
    if (r.ns === "real" && !allowReal) continue;
    const key = TITLE_KEYS.find((k) => r.values[k]?.state === "value"); const v = key ? r.values[key] : undefined;
    const title = v && v.state === "value" && typeof v.value === "string" ? v.value.trim().slice(0, 120) : "";
    if (!title || detectSecret(title)) continue;
    if (r.ns === "real") real = true;
    lines.push(`${r.ns === "demo" ? "[DEMO] " : ""}${r.entity}: ${title}`);
  }
  return { lines, real };
}

/** Rough size only (4 letters per token). Used for an estimate, shown only when the owner typed a price. */
export const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

/** Sends one request through a provider and an injected transport. Never throws; never puts the key in a message. */
export async function sendRaw(provider: AssistantProvider, creds: ProviderCredentials, req: AssistantRequest, transport: Transport, timeoutMs = 30000): Promise<AssistantResult> {
  const fail = (code: AssistantCode, message: string): AssistantResult => ({ ok: false, code, message: scrub(message, creds.apiKey) });
  const ctl = typeof AbortController === "undefined" ? undefined : new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const spec = provider.buildRequest(req, creds);
    const timeout = new Promise<never>((_, rej) => { timer = setTimeout(() => { ctl?.abort(); rej(new AssistantError("timeout", "No answer in time.")); }, timeoutMs); });
    const raw = await Promise.race([transport(spec, ctl?.signal), timeout]);
    if (raw.status < 200 || raw.status > 299) return fail("http", `The provider refused the request (status ${raw.status}).`);
    try { return { ok: true, value: provider.parseResponse(raw) }; } catch { return fail("parse", "The answer could not be read."); }
  } catch (e) {
    if (e instanceof AssistantError) return fail(e.code, e.message);
    return fail("blocked", "The request could not be made.");
  } finally { if (timer) clearTimeout(timer); }
}

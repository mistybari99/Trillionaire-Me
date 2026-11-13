// Spend limit, optional price and usage counter for the AI layer. Everything is typed by the owner; the app has no built-in price.
// No price typed: the limit counts requests and the cost shows Unknown (never 0). Stored on this phone under tm:ui:ai: (settings, not records).
import type { KV } from "./store";
import { estimateTokens } from "./assistant";

export const AI_CAP_KEY = "tm:ui:ai:cap";
export const AI_PRICE_KEY = "tm:ui:ai:price";
export const AI_USAGE_KEY = "tm:ui:ai:usage";

export type CapMode = "calls" | "amount";
export interface AiCap { mode: CapMode; limit: number }
export interface AiPrice { perThousandIn: number; perThousandOut: number; currency: string }
export interface AiUsage { calls: number; inputTokens: number; outputTokens: number; unknownCalls: number }
/** What the screen shows. `spend` is null when it cannot be known (no price, or the provider did not report tokens). */
export interface UsageView { calls: number; inputTokens: number | null; outputTokens: number | null; spend: number | null; currency: string | null }

const json = <T>(kv: KV, key: string): T | null => { try { const v = JSON.parse(kv.get(key) ?? "null") as T | null; return v && typeof v === "object" ? v : null; } catch { return null; } };
const pos = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;
const nonNeg = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;

export function readCap(kv: KV): AiCap | null { const c = json<AiCap>(kv, AI_CAP_KEY); return c && (c.mode === "calls" || c.mode === "amount") && pos(c.limit) ? { mode: c.mode, limit: c.limit } : null; }
/** Saves a limit the owner typed. An amount limit needs a price first. */
export function saveCap(kv: KV, mode: CapMode, limit: number): "ok" | "bad" | "needs_price" {
  if (!pos(limit) || (mode === "calls" && !Number.isInteger(limit))) return "bad";
  if (mode === "amount" && !readPrice(kv)) return "needs_price";
  kv.set(AI_CAP_KEY, JSON.stringify({ mode, limit })); return "ok";
}
export const clearCap = (kv: KV): void => kv.remove(AI_CAP_KEY);

export function readPrice(kv: KV): AiPrice | null {
  const p = json<AiPrice>(kv, AI_PRICE_KEY);
  return p && nonNeg(p.perThousandIn) && nonNeg(p.perThousandOut) && typeof p.currency === "string" ? { perThousandIn: p.perThousandIn, perThousandOut: p.perThousandOut, currency: p.currency.slice(0, 12) } : null;
}
export function savePrice(kv: KV, perThousandIn: number, perThousandOut: number, currency: string): "ok" | "bad" {
  const cur = currency.trim();
  if (!nonNeg(perThousandIn) || !nonNeg(perThousandOut) || !cur || cur.length > 12 || perThousandIn + perThousandOut <= 0) return "bad";
  kv.set(AI_PRICE_KEY, JSON.stringify({ perThousandIn, perThousandOut, currency: cur })); return "ok";
}
/** Removing the price also removes an amount limit, because that limit could no longer be checked. */
export function clearPrice(kv: KV): void { kv.remove(AI_PRICE_KEY); if (readCap(kv)?.mode === "amount") kv.remove(AI_CAP_KEY); }

export function readUsage(kv: KV): AiUsage {
  const u = json<AiUsage>(kv, AI_USAGE_KEY);
  return { calls: nonNeg(u?.calls) ? u!.calls : 0, inputTokens: nonNeg(u?.inputTokens) ? u!.inputTokens : 0, outputTokens: nonNeg(u?.outputTokens) ? u!.outputTokens : 0, unknownCalls: nonNeg(u?.unknownCalls) ? u!.unknownCalls : 0 };
}
/** Counts one request that reached the provider. Tokens null = the provider did not say, so the cost becomes Unknown (not 0). */
export function recordUsage(kv: KV, tokens: { inputTokens: number | null; outputTokens: number | null } | null): void {
  const u = readUsage(kv); u.calls += 1;
  if (tokens && tokens.inputTokens !== null && tokens.outputTokens !== null) { u.inputTokens += tokens.inputTokens; u.outputTokens += tokens.outputTokens; } else u.unknownCalls += 1;
  kv.set(AI_USAGE_KEY, JSON.stringify(u));
}
export const resetUsage = (kv: KV): void => kv.remove(AI_USAGE_KEY);

export function usageView(kv: KV): UsageView {
  const u = readUsage(kv), p = readPrice(kv);
  const tokensKnown = u.unknownCalls === 0;
  return {
    calls: u.calls,
    inputTokens: tokensKnown ? u.inputTokens : null, outputTokens: tokensKnown ? u.outputTokens : null,
    spend: p && tokensKnown ? (u.inputTokens * p.perThousandIn + u.outputTokens * p.perThousandOut) / 1000 : null,
    currency: p?.currency ?? null,
  };
}

export type CapState = { ok: true } | { ok: false; why: "missing" | "reached" | "unknown" };
/** Fail closed: no limit typed, limit reached, or an amount limit whose spend cannot be known. */
export function capState(kv: KV): CapState {
  const cap = readCap(kv); if (!cap) return { ok: false, why: "missing" };
  const v = usageView(kv);
  if (cap.mode === "calls") return v.calls >= cap.limit ? { ok: false, why: "reached" } : { ok: true };
  if (v.spend === null) return { ok: false, why: "unknown" };
  return v.spend >= cap.limit ? { ok: false, why: "reached" } : { ok: true };
}

/** Estimated cost of sending this text, only when the owner typed a price. The answer size is not known, so only the input part is counted. */
export function estimateInputCost(kv: KV, text: string): { value: number; currency: string } | null {
  const p = readPrice(kv); if (!p) return null;
  return { value: (estimateTokens(text) * p.perThousandIn) / 1000, currency: p.currency };
}

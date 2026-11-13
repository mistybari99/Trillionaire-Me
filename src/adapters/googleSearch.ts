// Google result cards for "Suggest options" (W1). A SearchProvider that asks a small proxy the owner runs on THIS app's own address.
// The search key and engine id stay on that proxy, never in the app. The base path is empty by default: with it empty, or the Web search
// switch off, or the kill switch on, the provider does not exist (googleSearchFor returns null) and the card is hidden.
// Allowed network file (tests/security_review.test.ts): it only ever asks a same-origin relative path, and only after the user taps the search button.
import type { SearchProvider } from "../core/research";
import type { KV } from "../core/store";
import { isEnabled } from "../core/connections";
import { isKilled } from "../core/aiGuard";

export const SEARCH_BASE_KEY = "tm:ui:ai:searchBase";
type Doer = (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

/** A path on this app's own address, like /api/search. No scheme, no host, no dots-up, no query. */
export const isProxyBase = (b: string): boolean => /^\/[A-Za-z0-9_~\/-]{1,100}$/.test(b) && !b.includes("//");
export const readSearchBase = (kv: KV): string => { const b = kv.get(SEARCH_BASE_KEY) ?? ""; return isProxyBase(b) ? b : ""; };
/** Empty text clears the setting (Google cards off). */
export function saveSearchBase(kv: KV, input: string): "ok" | "bad" {
  const b = input.trim(); if (!b) { kv.remove(SEARCH_BASE_KEY); return "ok"; }
  if (!isProxyBase(b)) return "bad";
  kv.set(SEARCH_BASE_KEY, b); return "ok";
}

const text = (v: unknown, max: number): string => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const webLink = (v: unknown): string => { const s = text(v, 500); return /^https?:\/\/[^\s]+$/.test(s) ? s : ""; };

export function googleSearch(base: string, doer: Doer = (u, i) => fetch(u, i)): SearchProvider {
  return {
    name: "google-proxy",
    async search(query, signal) {
      if (!isProxyBase(base)) throw new Error("search is off");
      const res = await doer(`${base}?q=${encodeURIComponent(query)}`, { signal });
      if (!res.ok) throw new Error("search failed");
      const data = (await res.json()) as { items?: { title?: unknown; snippet?: unknown; link?: unknown }[] };
      return (data.items ?? []).map((i) => ({ title: text(i.title, 200), snippet: text(i.snippet, 300), sourceName: "Google", sourceUrl: webLink(i.link) })).filter((r) => r.title && r.sourceUrl);
    },
  };
}

/** The provider for the Suggest flow, or null (hidden, refuses) unless Web search is approved and on, the kill switch is off and a base path is typed. */
export function googleSearchFor(kv: KV, doer?: Doer): SearchProvider | null {
  if (!isEnabled(kv, "webSearch") || isKilled(kv)) return null;
  const base = readSearchBase(kv); return base ? googleSearch(base, doer) : null;
}

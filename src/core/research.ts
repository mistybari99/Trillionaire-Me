// In-app research contract (TM-REQ-146, G4). The user never leaves the app: results come back as 2–3 option cards.
// Pure: the network lives in an injected provider. No call happens without an explicit click (consent).
export interface Suggestion { id: string; title: string; snippet: string; sourceName: string; sourceUrl: string; fetchedAt: string }
export interface SearchProvider { readonly name: string; search(query: string, signal?: AbortSignal): Promise<Omit<Suggestion, "fetchedAt" | "id">[]> }

export type ResearchResult =
  | { status: "options"; options: Suggestion[]; allowOwn: true }        // 2–3 options, plus "write my own"
  | { status: "too_few"; options: []; allowOwn: true }                   // <2 results → show none, never pad
  | { status: "offline"; options: Suggestion[]; allowOwn: true }         // cached/pre-filled list, stale-marked by caller
  | { status: "error"; options: []; allowOwn: true };

export interface ResearchDeps { provider: SearchProvider; online: () => boolean; now?: () => Date; cached?: (q: string) => Suggestion[] }

/** `userClicked` must come from a real click handler. Without it nothing is sent. */
export async function research(query: string, userClicked: boolean, d: ResearchDeps): Promise<ResearchResult> {
  const q = query.trim();
  if (!userClicked || !q) throw new Error("research needs an explicit click and a query");
  if (!d.online()) { const c = (d.cached?.(q) ?? []).slice(0, 3); return { status: "offline", options: c, allowOwn: true }; }
  try {
    const raw = await d.provider.search(q);
    const stamp = (d.now?.() ?? new Date()).toISOString();
    const options = raw.filter((r) => r.title && r.sourceUrl && r.sourceName).slice(0, 3)
      .map((r, i) => ({ ...r, id: `opt-${i + 1}`, fetchedAt: stamp }));
    return options.length < 2 ? { status: "too_few", options: [], allowOwn: true } : { status: "options", options, allowOwn: true };
  } catch { return { status: "error", options: [], allowOwn: true }; }
}

/** Search text is checked for secrets before it can leave the device. */
import { detectSecret } from "./safety";
export const safeQuery = (q: string): string | null => (detectSecret(q) ? null : q.trim());

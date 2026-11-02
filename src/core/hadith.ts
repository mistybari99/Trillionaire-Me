// D-D hadith reader (owner approved 2 Nov 2026): OFF by default, local bundled pack only, no network.
// Every entry must name its collection, number, source, source address and licence; text is copied verbatim by tools/hadith_import.mjs,
// never typed from memory or paraphrased. The app shows each entry as "unreviewed by a scholar" until a named reviewer signs; it is never a fatwa or a ruling.
import { latinDigits } from "../i18n/digits";
import type { KV } from "./store";

export const HADITH_CONSENT_KEY = "tm:consent:hadith:v1";
export const readHadithOn = (kv: KV): boolean => { try { const r = JSON.parse(kv.get(HADITH_CONSENT_KEY) ?? "null") as { v?: number; at?: string } | null; return !!r && r.v === 1 && typeof r.at === "string"; } catch { return false; } };
export const enableHadith = (kv: KV, nowIso: string): void => kv.set(HADITH_CONSENT_KEY, JSON.stringify({ v: 1, at: nowIso }));
export const disableHadith = (kv: KV): void => kv.remove(HADITH_CONSENT_KEY);

export const HADITH_TOPICS = ["life", "purpose", "wealth", "halal_earning", "time", "patience", "intention", "family", "knowledge", "character"] as const;
export type HadithTopic = (typeof HADITH_TOPICS)[number];

export interface HadithEntry {
  id: string; topics: HadithTopic[];
  arabic?: string; bn?: string; en?: string;
  collection: string; book?: string; number: string;
  /** the reference lines exactly as the source gives them (Arabic) */
  reference?: string;
  /** only when the source itself gives a grade */
  grade?: string; gradeBy?: string;
  source: string; sourceUrl: string; licence: string;
  /** "unreviewed" until a named reviewer signs off */
  status: "unreviewed" | "reviewed"; reviewer?: string;
}
export interface LoadResult { entries: HadithEntry[]; rejected: Array<{ id: string; why: string }> }

const nonEmpty = (x: unknown): x is string => typeof x === "string" && x.trim().length > 0;
/** Returns the reason an entry cannot be shown, or null. Provenance is mandatory; a missing licence or reference is never filled in. */
export function whyInvalid(e: unknown): string | null {
  if (typeof e !== "object" || e === null) return "not_an_object";
  const x = e as Record<string, unknown>;
  if (!nonEmpty(x.id)) return "id";
  if (!Array.isArray(x.topics) || !x.topics.length || !x.topics.every((t) => (HADITH_TOPICS as readonly string[]).includes(String(t)))) return "topics";
  if (!nonEmpty(x.arabic) && !nonEmpty(x.bn) && !nonEmpty(x.en)) return "no_text";
  for (const k of ["collection", "number", "source", "licence"]) if (!nonEmpty(x[k])) return k;
  if (!nonEmpty(x.sourceUrl) || !/^https:\/\//.test(x.sourceUrl)) return "sourceUrl";
  if (x.grade !== undefined && (!nonEmpty(x.grade) || !nonEmpty(x.gradeBy))) return "grade_needs_grader";
  if (x.status !== "unreviewed" && x.status !== "reviewed") return "status";
  if (x.status === "reviewed" && !nonEmpty(x.reviewer)) return "reviewed_without_reviewer";
  return null;
}
export function loadPack(json: unknown): LoadResult {
  const raw = (json as { entries?: unknown })?.entries;
  const out: LoadResult = { entries: [], rejected: [] }; const seen = new Set<string>();
  if (!Array.isArray(raw)) return out;
  for (const e of raw) {
    const why = whyInvalid(e); const id = String((e as { id?: unknown })?.id ?? "?");
    if (why) out.rejected.push({ id, why }); else if (seen.has(id)) out.rejected.push({ id, why: "duplicate" }); else { seen.add(id); out.entries.push(e as HadithEntry); }
  }
  return out;
}
const norm = (s: string) => latinDigits(s).toLowerCase();
export function searchHadith(entries: readonly HadithEntry[], q: string, topic: HadithTopic | null): HadithEntry[] {
  const needle = norm(q.trim());
  return entries.filter((e) => (!topic || e.topics.includes(topic)) && (!needle || norm([e.bn, e.en, e.arabic, e.collection, e.number, e.book, e.reference].filter(Boolean).join(" ")).includes(needle)));
}

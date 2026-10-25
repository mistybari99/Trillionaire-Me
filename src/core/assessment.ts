// O5 (Spec §3.1 Discover, §3.3 Path fit). Pure: no UI, no network, no AI, no personality or clinical labels.
// Unknown is never 0: a missing rating stays null, and a dimension with no answers is "not_enough_data".
import { numberOrNull, type TMRecord } from "./types";
import { PATHS, THEME_KEYWORDS, type PathEntry, type Theme } from "../library/paths";

export type Dimension = "interests" | "skills" | "strengths";
export const DIMENSIONS: readonly Dimension[] = ["interests", "skills", "strengths"];
/** rating is a self-rating 1–5 from the catalog, or null when not given. Strengths have no rating. */
export interface Item { id: string; name: string; rating: number | null }
export type Assessment = Record<Dimension, Item[]>;

const text = (r: TMRecord, key: string): string | null => {
  const v = r.values[key];
  if (!v || v.state !== "value" || typeof v.value !== "string") return null;
  const s = v.value.trim();
  return s === "" ? null : s;
};
const rating = (r: TMRecord, key: string): number | null => {
  const n = numberOrNull(r.values[key]);
  return n !== null && Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
};
const byId = (x: TMRecord, y: TMRecord) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0);

/** Reads the assessment answers from records. Items with no name are skipped; the order is by record id, so it never depends on storage order. */
export function assessmentFrom(recs: readonly TMRecord[]): Assessment {
  const sorted = [...recs].sort(byId);
  const pick = (entity: string, nameKey: string, ratingKey: string | null): Item[] =>
    sorted.filter((r) => r.entity === entity).flatMap((r) => {
      const name = text(r, nameKey);
      return name === null ? [] : [{ id: r.id, name, rating: ratingKey === null ? null : rating(r, ratingKey) }];
    });
  return {
    interests: pick("interest", "interest.topic", "interest.energy"),
    skills: pick("skill", "skill.name", "skill.level"),
    strengths: pick("strength", "strength.name", null),
  };
}

export interface DimensionScore {
  dimension: Dimension;
  /** "not_enough_data" when the user gave no item in this dimension. */
  status: "scored" | "not_enough_data";
  count: number;
  /** Items that have a rating. */
  rated: number;
  /** Mean of the given ratings as 0–100 (rating / 5). null when no rating was given: never 0. */
  level: number | null;
  names: string[];
}
export interface AssessmentLevels { dimensions: Record<Dimension, DimensionScore>; ready: number }

export function levelsOf(a: Assessment): AssessmentLevels {
  const dimensions = {} as Record<Dimension, DimensionScore>;
  for (const d of DIMENSIONS) {
    const items = a[d];
    const known = items.map((i) => i.rating).filter((r): r is number => r !== null);
    const mean = known.length ? known.reduce((s, r) => s + r, 0) / known.length : null;
    dimensions[d] = {
      dimension: d,
      status: items.length ? "scored" : "not_enough_data",
      count: items.length,
      rated: known.length,
      level: mean === null ? null : Math.round((mean / 5) * 100),
      names: items.map((i) => i.name),
    };
  }
  return { dimensions, ready: DIMENSIONS.filter((d) => dimensions[d].status === "scored").length };
}

// ---- path fit ----
export type Source = "interest" | "skill" | "strength";
/** Transparent weights: a skill says more about a path than an interest, and an interest more than a strength. */
export const SOURCE_WEIGHT: Record<Source, number> = { skill: 3, interest: 2, strength: 1 };
export const MAX_MATCHES = 3;

export interface Reason { source: Source; text: string; theme: Theme }
export interface PathMatch { path: PathEntry; weight: number; reasons: Reason[]; unknownThemes: Theme[] }
export interface PathFit {
  status: "matched" | "no_match" | "not_enough_data";
  /** Best MAX_MATCHES paths, highest weight first, library order on ties. */
  matches: PathMatch[];
  /** User items no theme keyword could place. Shown so nothing is silently dropped. */
  unmapped: string[];
}

const hit = (low: string, kw: string): boolean => (/^[a-z]/.test(kw) ? new RegExp(`(^|[^a-z])${kw}`).test(low) : low.includes(kw));
export function themesOf(s: string): Theme[] {
  const low = s.toLowerCase();
  return (Object.keys(THEME_KEYWORDS) as Theme[]).filter((th) => THEME_KEYWORDS[th].some((kw) => hit(low, kw.toLowerCase())));
}

/** Matches the user's interests, skills and strengths to the path library by theme. Pure and deterministic. */
export function pathFit(a: Assessment, library: readonly PathEntry[] = PATHS): PathFit {
  const items: { source: Source; text: string }[] = [
    ...a.skills.map((i) => ({ source: "skill" as const, text: i.name })),
    ...a.interests.map((i) => ({ source: "interest" as const, text: i.name })),
    ...a.strengths.map((i) => ({ source: "strength" as const, text: i.name })),
  ];
  if (items.length === 0) return { status: "not_enough_data", matches: [], unmapped: [] };

  // For each theme, keep the strongest source (ties keep the first in the order above).
  const best = new Map<Theme, Reason & { weight: number }>();
  const unmapped: string[] = [];
  for (const it of items) {
    const themes = themesOf(it.text);
    if (themes.length === 0) { unmapped.push(it.text); continue; }
    for (const th of themes) {
      const weight = SOURCE_WEIGHT[it.source];
      const cur = best.get(th);
      if (!cur || weight > cur.weight) best.set(th, { source: it.source, text: it.text, theme: th, weight });
    }
  }

  const scored = library.map((p, index) => {
    const hits = p.themes.filter((th) => best.has(th));
    return {
      index,
      hits: hits.length,
      match: {
        path: p,
        weight: hits.reduce((s, th) => s + best.get(th)!.weight, 0),
        reasons: hits.map((th) => { const b = best.get(th)!; return { source: b.source, text: b.text, theme: th }; }),
        unknownThemes: p.themes.filter((th) => !best.has(th)),
      } satisfies PathMatch,
    };
  }).filter((x) => x.hits > 0);
  scored.sort((x, y) => y.match.weight - x.match.weight || x.index - y.index);
  const matches = scored.slice(0, MAX_MATCHES).map((x) => x.match);
  return { status: matches.length ? "matched" : "no_match", matches, unmapped };
}

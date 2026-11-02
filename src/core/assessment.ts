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

// ---- way of working: three optional self-descriptions, shown back in the person's own words ----
export const APPROACH_FIELDS = ["approach.experience", "approach.risk_preference", "approach.learning_style"] as const;
export type Approach = Record<(typeof APPROACH_FIELDS)[number], string | null>;
/** Null for a skipped question: Unknown, never a default choice. */
export function approachFrom(recs: readonly TMRecord[]): Approach {
  const r = [...recs].sort(byId).filter((x) => x.entity === "approach").pop();
  return Object.fromEntries(APPROACH_FIELDS.map((f) => [f, r ? text(r, f) : null])) as Approach;
}

// ---- path fit ----
export type Source = "interest" | "skill" | "strength";
/** Transparent weights: a skill says more about a path than an interest, and an interest more than a strength. */
export const SOURCE_WEIGHT: Record<Source, number> = { skill: 3, interest: 2, strength: 1 };
export const MAX_MATCHES = 3;
export type Weights = Record<Source, number>;
export const WEIGHT_MIN = 1, WEIGHT_MAX = 10;

/** The user's own weights (entity `path_weights`), or the built-in ones. `custom` is true only when the user saved at least one. A weight outside 1-10 is ignored. */
export function weightsFrom(recs: readonly TMRecord[]): { weights: Weights; custom: boolean } {
  const r = [...recs].sort(byId).filter((x) => x.entity === "path_weights").pop();
  const pick = (key: string): number | null => { const n = r ? numberOrNull(r.values[key]) : null; return n !== null && Number.isInteger(n) && n >= WEIGHT_MIN && n <= WEIGHT_MAX ? n : null; };
  const s = pick("path_weights.skill"), i = pick("path_weights.interest"), g = pick("path_weights.strength");
  return { weights: { skill: s ?? SOURCE_WEIGHT.skill, interest: i ?? SOURCE_WEIGHT.interest, strength: g ?? SOURCE_WEIGHT.strength }, custom: s !== null || i !== null || g !== null };
}
/** A weight is a whole number from 1 to 10; blank means "use the built-in one" (null in the result). Invalid input is undefined. */
export function parseWeight(raw: string): number | null | undefined {
  const s = raw.trim().replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6));
  if (s === "") return null;
  const n = Number(s);
  return Number.isInteger(n) && n >= WEIGHT_MIN && n <= WEIGHT_MAX ? n : undefined;
}

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
export function pathFit(a: Assessment, library: readonly PathEntry[] = PATHS, weights: Weights = SOURCE_WEIGHT): PathFit {
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
      const weight = weights[it.source];
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

// ---------------------------------------------------------------- the user's own words on skills and resources (shown back in their own words, never rated)
export interface EvidenceRow { id: string; ns: TMRecord["ns"]; name: string; evidence: string }
/** Skills that have an example written. The example is the user's own sentence; nothing is counted from it. */
export function skillEvidence(recs: readonly TMRecord[]): EvidenceRow[] {
  return [...recs].sort(byId).filter((r) => r.entity === "skill").flatMap((r) => {
    const name = text(r, "skill.name"), ev = text(r, "skill.evidence");
    return name !== null && ev !== null ? [{ id: r.id, ns: r.ns, name, evidence: ev }] : [];
  });
}
export interface ResourceRow { id: string; ns: TMRecord["ns"]; kind: string | null; description: string | null }
/** Resources the user listed (kind and a short description). A resource with neither is skipped. */
export function resourceRows(recs: readonly TMRecord[]): ResourceRow[] {
  return [...recs].sort(byId).filter((r) => r.entity === "resource").flatMap((r) => {
    const kind = text(r, "resource.kind"), description = text(r, "resource.description");
    return kind !== null || description !== null ? [{ id: r.id, ns: r.ns, kind, description }] : [];
  });
}

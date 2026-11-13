// Goal helpers (pure): SMART parts, SWOT lists, progress and milestones. Unknown is never 0.
import type { FieldValue, TMRecord } from "./types";
import { goalProgressMode, goalWeighting, isCountedTask, manualPercent, weightedShare, type GoalWeighting } from "./overallProgress";
import { goalIdsOf } from "./taskGoals";

export const SWOT_KEYS = ["strengths", "weaknesses", "opportunities", "threats"] as const;
export type SwotKey = (typeof SWOT_KEYS)[number];
/** The four SWOT lists, each in its own catalog field. */
const SWOT_FIELDS: Record<SwotKey, string> = { strengths: "goal.swot_strengths", weaknesses: "goal.swot_weaknesses", opportunities: "goal.swot_opportunities", threats: "goal.swot_threats" };
export const swotField = (k: SwotKey): string => SWOT_FIELDS[k];
export const SWOT_MAX_ITEMS = 5;
export const SWOT_MAX_LEN = 80;

/** One item per line; blank lines dropped; at most 5 items of 80 characters. */
export function parseList(text: string): string[] {
  return text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean).slice(0, SWOT_MAX_ITEMS).map((x) => x.slice(0, SWOT_MAX_LEN));
}
/** An empty list is stored as unknown (not yet filled), never as an empty "none". */
export const listValue = (items: string[]): FieldValue => (items.length ? { state: "value", value: items, label: "FACT" } : { state: "unknown" });
export function readList(v: FieldValue | undefined): string[] | null {
  if (!v || v.state !== "value" || !Array.isArray(v.value)) return null;
  const items = v.value.filter((x): x is string => typeof x === "string" && x.trim() !== "");
  return items.length ? items : null;
}

export const SMART_PARTS = ["specific", "measurable", "achievable", "relevant", "timebound"] as const;
export type SmartPart = (typeof SMART_PARTS)[number];
/** Where each SMART part lives. Measurable, relevant and time-bound reuse existing goal fields. */
export const SMART_FIELDS: Record<SmartPart, string[]> = {
  specific: ["goal.smart_specific"], measurable: ["goal.success"], achievable: ["goal.smart_achievable"], relevant: ["goal.why"], timebound: ["goal.horizon", "goal.target_date"],
};
const hasValue = (r: TMRecord, f: string): boolean => { const v = r.values[f]; return !!v && v.state === "value" && (typeof v.value !== "string" || v.value.trim() !== ""); };
/** Which SMART parts are filled. This is a fill-in guide, not a mark of quality. */
export const smartFilled = (g: TMRecord): Record<SmartPart, boolean> =>
  Object.fromEntries(SMART_PARTS.map((p) => [p, SMART_FIELDS[p].some((f) => hasValue(g, f))])) as Record<SmartPart, boolean>;

export interface GoalProgress { id: string; title: string; done: number; total: number; /** whole percent 0..100, or null when no task is linked */ percent: number | null; /** "manual": the percent was typed by the user, not counted */ mode?: "auto" | "manual";
  /** ids of the counted steps that serve this goal (a shared step is listed under every goal it serves), and which of them are done */ ids: string[]; doneIds: string[];
  /** how this goal weighs its steps: every step equal, or by entered size (the count "5 of 8" stays a count either way) */ weighting?: GoalWeighting }
const strVal = (v: FieldValue | undefined): string | null => (v && v.state === "value" && typeof v.value === "string" ? v.value : null);

/**
 * Progress = counted steps that serve this goal, done over all of them. A step serves every goal in its list (full credit to each) and counts once per goal.
 * A step marked "no longer true" is left out (the same rule as the overall percent). Null (unknown) when no step is linked. A step is done only with a done date.
 */
export function goalProgress(recs: readonly TMRecord[]): GoalProgress[] {
  const tasks = recs.filter(isCountedTask).map((t) => ({ t, goals: goalIdsOf(t) })).filter((x) => x.goals.length);
  return recs.filter((r) => r.entity === "goal" && strVal(r.values["goal.title"]) !== null).sort((a, b) => a.id.localeCompare(b.id)).map((g) => {
    const mine = tasks.filter((x) => x.goals.includes(g.id)).map((x) => x.t);
    const doneIds = mine.filter((x) => strVal(x.values["task.done_on"]) !== null).map((x) => x.id);
    const ids = mine.map((x) => x.id);
    const done = doneIds.length;
    const title = strVal(g.values["goal.title"])!;
    const weighting = goalWeighting(g);
    const pct = !mine.length ? null : weighting === "size" ? Math.round((weightedShare(mine, "size").doneW / weightedShare(mine, "size").totalW) * 100) : Math.round((done / mine.length) * 100);
    if (goalProgressMode(g) === "manual") return { id: g.id, title, done, total: mine.length, percent: manualPercent(g), mode: "manual" as const, ids, doneIds, weighting };
    return { id: g.id, title, done, total: mine.length, percent: pct, ids, doneIds, weighting };
  });
}

/**
 * Steps counted once, how many serve more than one existing goal, and how many serve none yet. Steps only; habits are never counted.
 * This is the plain fact line that explains why the one overall percent counts a shared step once.
 */
export function linkStats(recs: readonly TMRecord[]): { steps: number; shared: number; unlinked: number } {
  const goals = new Set(recs.filter((r) => r.entity === "goal").map((r) => r.id));
  let steps = 0, shared = 0, unlinked = 0;
  for (const t of recs.filter(isCountedTask)) { steps++; const n = goalIdsOf(t).filter((x) => goals.has(x)).length; if (n > 1) shared++; if (n === 0) unlinked++; }
  return { steps, shared, unlinked };
}

/** Highest milestone reached: 25, 50, 75 or 100; null when unknown or below 25. */
export function milestoneOf(percent: number | null): 25 | 50 | 75 | 100 | null {
  if (percent === null) return null;
  return percent >= 100 ? 100 : percent >= 75 ? 75 : percent >= 50 ? 50 : percent >= 25 ? 25 : null;
}

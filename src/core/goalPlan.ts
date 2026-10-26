// Goal helpers (pure): SMART parts, SWOT lists, progress and milestones. Unknown is never 0.
import type { FieldValue, TMRecord } from "./types";
import { goalProgressMode, manualPercent } from "./overallProgress";

export const SWOT_KEYS = ["strengths", "weaknesses", "opportunities", "threats"] as const;
export type SwotKey = (typeof SWOT_KEYS)[number];
export const swotField = (k: SwotKey): string => `goal.swot_${k}`;
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

export interface GoalProgress { id: string; title: string; done: number; total: number; /** whole percent 0..100, or null when no task is linked */ percent: number | null; /** "manual": the percent was typed by the user, not counted */ mode?: "auto" | "manual" }
const strVal = (v: FieldValue | undefined): string | null => (v && v.state === "value" && typeof v.value === "string" ? v.value : null);

/** Progress = linked tasks done / linked tasks. Null (unknown) when no task is linked. A task counts as done only with a done date. */
export function goalProgress(recs: readonly TMRecord[]): GoalProgress[] {
  const tasks = recs.filter((r) => r.entity === "task" && r.links?.goal);
  return recs.filter((r) => r.entity === "goal" && strVal(r.values["goal.title"]) !== null).sort((a, b) => a.id.localeCompare(b.id)).map((g) => {
    const mine = tasks.filter((x) => x.links!.goal === g.id);
    const done = mine.filter((x) => strVal(x.values["task.done_on"]) !== null).length;
    const title = strVal(g.values["goal.title"])!;
    if (goalProgressMode(g) === "manual") return { id: g.id, title, done, total: mine.length, percent: manualPercent(g), mode: "manual" as const };
    return { id: g.id, title, done, total: mine.length, percent: mine.length ? Math.round((done / mine.length) * 100) : null };
  });
}

/** Highest milestone reached: 25, 50, 75 or 100; null when unknown or below 25. */
export function milestoneOf(percent: number | null): 25 | 50 | 75 | 100 | null {
  if (percent === null) return null;
  return percent >= 100 ? 100 : percent >= 75 ? 75 : percent >= 50 ? 50 : percent >= 25 ? 25 : null;
}

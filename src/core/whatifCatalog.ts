// Live Calculator / What-if (LIVECALC-01): the category variants. Config only: each variant is a template plus the words used in its labels.
// No numbers are stored here (no defaults, no rates, no thresholds). Pure.
import { GENERIC_TEMPLATES, TEMPLATE_IDS } from "./whatif";

export const CATEGORIES = ["reading", "time", "habits", "goals", "money", "business", "health", "deen", "work", "compare"] as const;
export type WiCategory = (typeof CATEGORIES)[number];
export type Noun = "pages" | "tasks" | "minutes" | "times" | "sessions" | "units" | "taka" | "steps" | "glasses" | "dhikr" | "fasts" | "qaza" | "blocks";
export type Per = "day" | "week" | "month" | "part";
export const NOUNS: readonly Noun[] = ["pages", "tasks", "minutes", "times", "sessions", "units", "taka", "steps", "glasses", "dhikr", "fasts", "qaza", "blocks"];
export const PERS: readonly Per[] = ["day", "week", "month", "part"];

export interface Variant { id: string; cat: WiCategory; tpl: string; unit?: Noun; per?: Per; cost?: Noun }
const v = (id: string, cat: WiCategory, tpl: string, unit?: Noun, per?: Per, cost?: Noun): Variant => ({ id, cat, tpl, ...(unit ? { unit } : {}), ...(per ? { per } : {}), ...(cost ? { cost } : {}) });

export const VARIANTS: readonly Variant[] = [
  v("r-pages", "reading", "rateTime", "pages", "day", "minutes"), v("r-total", "reading", "totalPeriod", "pages", "day"), v("r-finish", "reading", "timeToFinish", "pages", "day"), v("r-daily", "reading", "requiredPer", "pages", "day"),
  v("t-task", "time", "rateTime", "tasks", "day", "minutes"), v("t-finish", "time", "timeToFinish", "minutes", "day"), v("t-change", "time", "percentChange"),
  v("h-gap", "habits", "gap", "times", "week"), v("h-total", "habits", "totalPeriod", "times", "week"), v("h-time", "habits", "rateTime", "sessions", "week", "minutes"),
  v("g-required", "goals", "requiredPer", "units", "week"), v("g-gap", "goals", "gap", "units", "week"), v("g-finish", "goals", "timeToFinish", "units", "week"), v("g-percent", "goals", "percent"),
  v("m-save", "money", "totalPeriod", "taka", "month"), v("m-dps", "money", "compound"), v("m-fdr", "money", "fdr"), v("m-emi", "money", "emi"), v("m-payoff", "money", "payoff"),
  v("m-profit", "money", "lib:grossMargin"), v("m-discount", "money", "percent"), v("m-breakeven", "money", "lib:breakEvenUnits"), v("m-runway", "money", "timeToFinish", "taka", "month"),
  v("m-cut", "money", "percent"), v("m-budget", "money", "budget"), v("m-change", "money", "percentChange"),
  v("b-breakeven-rev", "business", "lib:breakEvenRevenue"), v("b-contrib", "business", "lib:contributionMarginPct"), v("b-cac", "business", "lib:cac"), v("b-payback", "business", "lib:payback"),
  v("b-capacity", "business", "lib:capacityUtilisation"), v("b-runway", "business", "timeToFinish", "taka", "month"), v("b-growth", "business", "percentChange"),
  v("hl-steps", "health", "totalPeriod", "steps", "day"), v("hl-water", "health", "requiredPer", "glasses", "day"), v("hl-days", "health", "timeToFinish", "steps", "day"), v("hl-change", "health", "percentChange"),
  v("d-dhikr", "deen", "requiredPer", "dhikr", "day"), v("d-split", "deen", "requiredPer", "dhikr", "part"), v("d-fasting", "deen", "gap", "fasts", "week"), v("d-qaza", "deen", "timeToFinish", "qaza", "week"), v("d-zakat", "deen", "zakat"),
  v("w-blocks", "work", "rateTime", "blocks", "day", "minutes"), v("w-capacity", "work", "lib:capacityUtilisation"), v("w-required", "work", "requiredPer", "minutes", "day"),
  v("c-ab", "compare", "compare"), v("c-pct", "compare", "percentChange"),
];
const BY_ID = new Map(VARIANTS.map((x) => [x.id, x]));
export const getVariant = (id: string): Variant | undefined => BY_ID.get(id);
export const variantsOf = (cat: WiCategory): Variant[] => VARIANTS.filter((x) => x.cat === cat);
/** Templates not used by any variant (must stay empty: every template is reachable). */
export const unusedTemplates = (): string[] => TEMPLATE_IDS.filter((t) => !VARIANTS.some((x) => x.tpl === t));
export const genericCovered = (): boolean => GENERIC_TEMPLATES.every((t) => VARIANTS.some((x) => x.tpl === t));

// ---------- notes (honest, motivating, no promise, no shame) ----------
export type NoteKey = "push" | "estimate" | "later" | "small" | "money" | "rates" | "health" | "deen" | "business" | "reading" | "work" | "compare";
/** Tone by category. The first note is the category one; the "estimate" note is always shown with a figure. */
export const CATEGORY_NOTES: Record<WiCategory, readonly NoteKey[]> = {
  reading: ["reading", "push", "later"], time: ["small", "push", "later"], habits: ["push", "small", "later"], goals: ["later", "push", "small"],
  money: ["money", "rates", "later"], business: ["business", "money", "small"], health: ["health", "small", "push"], deen: ["deen", "small", "later"],
  work: ["work", "small", "push"], compare: ["compare", "small", "later"],
};
/** Notes for a variant: its category note, then one more picked from the variant id (stable, no clock, no random). Always followed by "estimate". */
export function notesFor(variantId: string): NoteKey[] {
  const x = BY_ID.get(variantId); if (!x) return ["estimate"];
  const list = CATEGORY_NOTES[x.cat];
  const pick = [...variantId].reduce((a, c) => a + c.charCodeAt(0), 0) % (list.length - 1);
  return [list[0] as NoteKey, list[1 + pick] as NoteKey, "estimate"];
}
export const ALL_NOTES: readonly NoteKey[] = ["push", "estimate", "later", "small", "money", "rates", "health", "deen", "business", "reading", "work", "compare"];

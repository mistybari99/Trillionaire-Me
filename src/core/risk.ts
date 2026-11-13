// M15 risk register rows (demo namespace). Pure: no UI, no network.
// Unknown likelihood stays unknown (never guessed). A missing stop rule is counted, not scored.
import { addDays, validDay } from "./realityLoop";
import type { FieldValue, TMRecord } from "./types";

export type Likelihood = "low" | "medium" | "high";
const LIKELIHOODS: readonly string[] = ["low", "medium", "high"];
export interface RiskRow { id: string; text: string; likelihood: Likelihood | null; stopRule: string | null; reviewOn: string | null }
export type RiskError = "text_required" | "text_long" | "stop_rule_long" | "date_format" | "date_invalid";

const str = (v: FieldValue | undefined): string | null => (v?.state === "value" && typeof v.value === "string" && v.value.trim() ? v.value.trim() : null);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Risks sorted by review date (earliest first, no date last), then by id so the order is stable. */
export function riskRows(recs: TMRecord[]): RiskRow[] {
  const rows = recs.filter((r) => r.entity === "risk").map((r): RiskRow => {
    const lk = str(r.values["risk.likelihood"]);
    return { id: r.id, text: str(r.values["risk.text"]) ?? "", likelihood: lk && LIKELIHOODS.includes(lk) ? (lk as Likelihood) : null,
      stopRule: str(r.values["risk.stop_rule"]), reviewOn: str(r.values["risk.review_on"]) };
  });
  return rows.sort((a, b) => {
    const ka = a.reviewOn ?? "9999-99-99", kb = b.reviewOn ?? "9999-99-99";
    if (ka !== kb) return ka < kb ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** How many risks still have no written stop rule. */
export const withoutStopRule = (rows: RiskRow[]): number => rows.filter((r) => !r.stopRule).length;

/** Validates one risk before it is saved. Returns the first problem, or null. */
export function validateRisk(p: { text: string; stopRule: string; reviewOn: string }): RiskError | null {
  if (!p.text.trim()) return "text_required";
  if (p.text.trim().length > 80) return "text_long";
  if (p.stopRule.trim().length > 200) return "stop_rule_long";
  if (p.reviewOn && !DAY.test(p.reviewOn)) return "date_format";
  if (p.reviewOn) {
    const d = new Date(`${p.reviewOn}T00:00:00Z`);
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== p.reviewOn) return "date_invalid";
  }
  return null;
}

// ---------------------------------------------------------------- review-date trigger (M15)
// A risk with a review date that has come is "due": a calm prompt, never a mark. The stop rule is the user's own words; the app shows it back
// and asks whether it has happened. It is never compared with any data. A risk with no date has no trigger (Unknown, not "later").
export type RiskDue = "due" | "soon" | "later" | "none";
export const SOON_DAYS = 7;
export const REVIEW_DAYS = [7, 14, 30] as const;
export type ReviewDays = (typeof REVIEW_DAYS)[number];

export function riskDue(r: Pick<RiskRow, "reviewOn">, today: string): RiskDue {
  if (!r.reviewOn || !validDay(r.reviewOn)) return "none";
  if (r.reviewOn <= today) return "due";
  return r.reviewOn <= addDays(today, SOON_DAYS) ? "soon" : "later";
}
export const dueRisks = (rows: RiskRow[], today: string): RiskRow[] => rows.filter((r) => riskDue(r, today) === "due");

/** The risk looked at again: the next review date is today plus the chosen days. Nothing else changes. */
export function reviewedRisk(rec: TMRecord, today: string, days: ReviewDays): TMRecord {
  return { ...rec, values: { ...rec.values, "risk.review_on": { state: "value", value: addDays(today, days), label: rec.ns === "real" ? "FACT" : "DEMO" } } };
}

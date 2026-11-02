// M16 KPI targets (pure). A target is set against the user's own records for one week or for 90 days.
// Unknown is never 0 (TM-REQ-021): a measure with no record in the window is "unknown", not "0 of 5".
// A missing or invalid target is "no target"; nothing is guessed. Wording elsewhere stays neutral: a gap is "still to go", never a failure.
import { reviewSummary } from "./review";
import { weeklySummary, weekWindow } from "./weeklyReview";
import type { FieldValue, Label, TMRecord } from "./types";

export const KPI_MEASURES = ["tasks_done", "focus_minutes", "habit_checkins", "stage_passes", "own"] as const;
export type KpiMeasure = (typeof KPI_MEASURES)[number];
export const KPI_PERIODS = ["week", "days90"] as const;
export type KpiPeriod = (typeof KPI_PERIODS)[number];

export interface KpiRow { id: string; ns: TMRecord["ns"]; name: string; measure: KpiMeasure; period: KpiPeriod; target: number | null; targetLabel: Label | null; unit: string; ownActual: number | null; ownActualOn: string | null }

const val = (v: FieldValue | undefined): unknown => (v && v.state === "value" ? v.value : undefined);
const str = (v: FieldValue | undefined): string | null => { const x = val(v); return typeof x === "string" && x.trim() ? x.trim() : null; };
const numv = (v: FieldValue | undefined): number | null => { const x = val(v); return typeof x === "number" && Number.isFinite(x) ? x : null; };

/** The user's KPI records, in a stable order (period, then name, then id). An unreadable measure or period drops the record from view, never from storage. */
export function kpiRows(recs: readonly TMRecord[]): KpiRow[] {
  const out: KpiRow[] = [];
  for (const r of recs) {
    if (r.entity !== "kpi") continue;
    const measure = str(r.values["kpi.measure"]), period = str(r.values["kpi.period"]), name = str(r.values["kpi.name"]);
    if (!name || !(KPI_MEASURES as readonly string[]).includes(measure ?? "") || !(KPI_PERIODS as readonly string[]).includes(period ?? "")) continue;
    const tv = r.values["kpi.target"]; const target = numv(tv);
    out.push({ id: r.id, ns: r.ns, name, measure: measure as KpiMeasure, period: period as KpiPeriod, target: target !== null && target > 0 ? target : null,
      targetLabel: target !== null && tv?.state === "value" ? tv.label : null, unit: str(r.values["kpi.unit"]) ?? "", ownActual: numv(r.values["kpi.actual"]), ownActualOn: str(r.values["kpi.actual_on"]) });
  }
  return out.sort((a, b) => (a.period === b.period ? 0 : a.period === "week" ? -1 : 1) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

export type KpiActual =
  | { state: "value"; value: number; source: "records" | "own"; asOf: string | null }
  | { state: "unknown"; why: "no_records" | "not_entered" };

const dayOf = (iso: string): string | null => { const d = new Date(iso); return Number.isFinite(d.getTime()) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : null; };

/** What the user has done in the KPI's period, counted from their own records (or the number they typed for "own"). */
export function kpiActual(row: KpiRow, recs: readonly TMRecord[], today: string): KpiActual {
  if (row.measure === "own") return row.ownActual === null ? { state: "unknown", why: "not_entered" } : { state: "value", value: row.ownActual, source: "own", asOf: row.ownActualOn };
  let n: number | null;
  if (row.period === "week") {
    const w = weeklySummary(recs, today);
    if (row.measure === "tasks_done") n = w.tasksDone;
    else if (row.measure === "focus_minutes") n = w.focusMinutes;
    else if (row.measure === "habit_checkins") n = w.habitCheckins;
    else { const { from, to } = weekWindow(today); const c = recs.filter((r) => { if (r.entity !== "stage_pass") return false; const d = dayOf(r.createdAt); return d !== null && d >= from && d <= to; }).length; n = c > 0 ? c : null; }
  } else {
    const s = reviewSummary(recs, today);
    if (row.measure === "tasks_done") n = s.tasksDone;
    else if (row.measure === "focus_minutes") n = s.focusMinutes;
    else if (row.measure === "stage_passes") n = s.stagePasses;
    else {
      // Habit check-ins over 90 days: days with a count above 0, same rule as the weekly review.
      const { from, to } = { from: s.from, to: s.to };
      const c = recs.filter((r) => r.entity === "habit_log" && typeof val(r.values["habit_log.date"]) === "string" && String(val(r.values["habit_log.date"])) >= from && String(val(r.values["habit_log.date"])) <= to && Number(val(r.values["habit_log.count"]) ?? 0) > 0).length;
      n = c > 0 ? c : null;
    }
  }
  return n === null ? { state: "unknown", why: "no_records" } : { state: "value", value: n, source: "records", asOf: null };
}

export type KpiProgress = { state: "value"; pct: number; reached: boolean } | { state: "no_target" } | { state: "unknown" };

/** Planned against actual. Needs a target above 0 and a known actual; otherwise the reason is named, never a 0. */
export function kpiProgress(row: KpiRow, actual: KpiActual): KpiProgress {
  if (row.target === null) return { state: "no_target" };
  if (actual.state !== "value") return { state: "unknown" };
  return { state: "value", pct: Math.round((actual.value / row.target) * 100), reached: actual.value >= row.target };
}

export interface KpiStatus { row: KpiRow; actual: KpiActual; progress: KpiProgress }
export const kpiStatus = (recs: readonly TMRecord[], today: string, period?: KpiPeriod): KpiStatus[] =>
  kpiRows(recs).filter((r) => !period || r.period === period).map((row) => { const actual = kpiActual(row, recs, today); return { row, actual, progress: kpiProgress(row, actual) }; });

export interface KpiInput { name: string; target: string; unit: string }
export type KpiError = "name_required" | "name_long" | "unit_long" | "target_invalid";
/** Blank target = not set yet (allowed). A target must be a number above 0. Bangla digits and commas are accepted. */
export function parseTarget(raw: string): { state: "unknown" } | { state: "value"; value: number } | null {
  const s = raw.trim().replace(/,/g, "").replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6));
  if (s === "") return { state: "unknown" };
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? { state: "value", value: n } : null;
}
/** A number the user reports (current figure): zero or more. Blank = unknown. */
export function parseActual(raw: string): { state: "unknown" } | { state: "value"; value: number } | null {
  const s = raw.trim().replace(/,/g, "").replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6));
  if (s === "") return { state: "unknown" };
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? { state: "value", value: n } : null;
}
export function validateKpi(i: KpiInput): KpiError | null {
  if (!i.name.trim()) return "name_required";
  if (i.name.trim().length > 80) return "name_long";
  if (i.unit.trim().length > 40) return "unit_long";
  if (parseTarget(i.target) === null) return "target_invalid";
  return null;
}

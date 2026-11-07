// Chart data (step 3). Pure: records and "today" go in, plain numbers or null come out. Unknown is null, never 0.
// Callers pass only the active mode's records (allRecs()), so demo and real never mix here.
import { goalProgress } from "./goalPlan";
import { financeFrom } from "./financeInputs";
import { reviewWindow } from "./review";
import { addDays, isDone, isPlanned, parseIso, type Habit, type Log } from "./habits";
import type { FieldValue, TMRecord } from "./types";

const val = (v: FieldValue | undefined): unknown => (v && v.state === "value" ? v.value : undefined);

// ---- Money: monthly income vs spending, per scope ----
export interface FlowBar { value: number | null; /** items of this kind with an unknown amount */ unknown: number; /** items of this kind */ count: number }
export interface FlowScope { scope: "personal" | "business"; income: FlowBar; spending: FlowBar }
export function flowBars(recs: readonly TMRecord[]): FlowScope[] {
  const fv = financeFrom([...recs]); const out: FlowScope[] = [];
  for (const scope of ["personal", "business"] as const) {
    const bar = (kind: "income" | "expense"): FlowBar => {
      let sum = 0, unknown = 0, count = 0;
      for (const i of fv.items) if (i.scope === scope && i.kind === kind) {
        count++;
        if (i.amount.state === "value" && typeof i.amount.value === "number" && Number.isFinite(i.amount.value)) sum += i.amount.value; else unknown++;
      }
      return { value: count > 0 && unknown === 0 ? sum : null, unknown, count };
    };
    const income = bar("income"), spending = bar("expense");
    if (income.count + spending.count > 0) out.push({ scope, income, spending });
  }
  return out;
}

// ---- Report: one ring per goal; progress = known linked tasks done / linked tasks ----
export interface GoalRing { id: string; title: string; done: number; total: number; /** 0..1, or null when no task is linked yet */ fraction: number | null; /** whole percent, or null (unknown) */ percent: number | null }
export function goalRings(recs: readonly TMRecord[]): GoalRing[] {
  return goalProgress(recs).map((g) => ({ ...g, fraction: g.total ? g.done / g.total : null }));
}

// ---- Review: 90-day activity in 13 weekly buckets; a week with no record is "no record", not 0 ----
export interface WeekBucket { from: string; to: string; count: number | null }
export interface Activity { from: string; to: string; weeks: WeekBucket[]; total: number; enough: boolean }
export function activityBars(recs: readonly TMRecord[], today: string): Activity {
  const { from, to } = reviewWindow(today);
  const dayOf = (r: TMRecord): string | null => {
    if (r.entity === "task") { const d = val(r.values["task.done_on"]); return typeof d === "string" ? d : null; }
    if (r.entity === "focus_session") { const d = val(r.values["focus_session.date"]); return typeof d === "string" ? d : null; }
    if (r.entity === "stage_pass") { const t = Date.parse(r.createdAt); if (!Number.isFinite(t)) return null; const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
    return null;
  };
  const days = recs.map(dayOf).filter((d): d is string => d !== null && d >= from && d <= to);
  const weeks: WeekBucket[] = [];
  for (let i = 0; i < 13; i++) {
    const wf = addDays(from, i * 7); const wt = i === 12 ? to : addDays(wf, 6);
    const n = days.filter((d) => d >= wf && d <= wt).length;
    weeks.push({ from: wf, to: wt, count: n > 0 ? n : null });
  }
  return { from, to, weeks, total: days.length, enough: days.length > 0 };
}

// ---- Habits: last 14 days, planned days only; no run-count ----
export type Cell = "done" | "open" | "rest";
export interface HabitGrid { cells: Array<{ date: string; state: Cell }>; planned: number; done: number }
export function habitGrid(hb: Habit, logs: Log[], today: string): HabitGrid {
  const cells: HabitGrid["cells"] = []; let planned = 0, done = 0;
  for (let i = 13; i >= 0; i--) {
    const date = addDays(today, -i);
    if (!isPlanned(hb, date)) { cells.push({ date, state: "rest" }); continue; }
    planned++; const dn = isDone(hb, logs, date); if (dn) done++;
    cells.push({ date, state: dn ? "done" : "open" });
  }
  return { cells, planned, done };
}
export const weekdayIndex = (date: string): number => parseIso(date).getDay();

// ---- Habit grid trackers beyond 14 days: 31 days, 12 weeks, 12 months ----
// Planned days only. Days before the habit was added ("since") and future days are never counted, so nothing is a miss that was never possible.
// A period with no countable planned day is "none" (unknown), never a 0%. No run-count and no overall number.
export type GridRange = "days31" | "weeks12" | "months12";
export const GRID_RANGES: readonly GridRange[] = ["days31", "weeks12", "months12"];
export type PeriodState = "full" | "some" | "open" | "none";
export interface GridPeriod { from: string; to: string; planned: number; done: number; state: PeriodState }

const monthStart = (date: string, back: number): string => { const d = parseIso(date); return iso0(new Date(d.getFullYear(), d.getMonth() - back, 1)); };
const monthEnd = (date: string, back: number): string => { const d = parseIso(date); return iso0(new Date(d.getFullYear(), d.getMonth() - back + 1, 0)); };
const iso0 = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function habitRange(hb: Habit, logs: Log[], today: string, range: GridRange, since: string | null): GridPeriod[] {
  const spans: Array<[string, string]> = [];
  if (range === "days31") for (let i = 30; i >= 0; i--) { const d = addDays(today, -i); spans.push([d, d]); }
  else if (range === "weeks12") for (let i = 11; i >= 0; i--) { const to = addDays(today, -7 * i); spans.push([addDays(to, -6), to]); }
  else for (let i = 11; i >= 0; i--) { const end = monthEnd(today, i); spans.push([monthStart(today, i), end > today ? today : end]); }
  return spans.map(([from, to]) => {
    const start = since && since > from ? since : from;
    let planned = 0, done = 0;
    for (let d = start; d <= to && d <= today; d = addDays(d, 1)) if (isPlanned(hb, d)) { planned++; if (isDone(hb, logs, d)) done++; }
    const state: PeriodState = planned === 0 ? "none" : done === planned ? "full" : done > 0 ? "some" : "open";
    return { from, to, planned, done, state };
  });
}

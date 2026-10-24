// Turns the user's saved answers + task records into a scheduler input. Pure; every "unknown" stays unknown.
import type { PlanInput, PlanTask, CapacityMode } from "./planner";
import type { FieldValue, RecordValues, TMRecord } from "./types";

export const parseClock = (s: string): number | null => {
  const t = s.trim().replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6));
  const m = t.match(/^(\d{1,2}):([0-5]\d)$/); if (!m) return null;
  const h = Number(m[1]); return h <= 24 && !(h === 24 && m[2] !== "00") ? h * 60 + Number(m[2]) : null;
};
export const fmtClock = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

const val = (v: FieldValue | undefined) => (v && v.state === "value" ? v.value : null);
const numVal = (v: FieldValue | undefined) => { const x = val(v); return typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : null; };

export type WindowResult = { from: number; to: number } | null;
export function freeWindow(a: RecordValues): WindowResult {
  const f = val(a["constraint.free_from"]), t = val(a["constraint.free_to"]);
  if (typeof f !== "string" || typeof t !== "string") return null;
  const from = parseClock(f), to = parseClock(t);
  return from !== null && to !== null && to > from ? { from, to } : null;
}

const PRIORITY: Record<string, number> = { high: 3, normal: 2, low: 1 };

/** A plan step the scheduler may still place: not finished and not marked “no longer true” (O6). */
export const isOpenTask = (r: TMRecord): boolean => r.entity === "task" && r.values["task.done_on"]?.state !== "value" && r.values["task.not_true_on"]?.state !== "value";

export function tasksFrom(records: TMRecord[]): PlanTask[] {
  return records.filter(isOpenTask).sort((a, b) => a.id.localeCompare(b.id)).map((r) => ({
    id: r.id,
    minutes: (() => { const m = numVal(r.values["task.minutes"]); return m !== null && m > 0 ? Math.round(m) : null; })(),
    priority: PRIORITY[String(val(r.values["task.priority"]) ?? "normal")] ?? 2,
  }));
}

/** Capacity counts as known only when BOTH the weekly hours and the daily window are known — otherwise nothing is placed. */
export function buildPlanInput(answers: RecordValues, taskRecords: TMRecord[], mode: CapacityMode, startDay = 0): PlanInput {
  const hours = numVal(answers["constraint.weekly_free_hours"]); const w = freeWindow(answers);
  return {
    weeklyFreeMinutes: hours !== null && w ? Math.round(hours * 60) : null,
    blocked: [], // worship/family/rest sit outside the user's own free window by construction
    dayWindow: w ? { start: w.from, end: w.to } : undefined,
    tasks: tasksFrom(taskRecords), mode, startDay,
  };
}

export type CapacityState = "ok" | "need_hours" | "need_window";
export function capacityState(answers: RecordValues): CapacityState {
  if (numVal(answers["constraint.weekly_free_hours"]) === null) return "need_hours";
  return freeWindow(answers) ? "ok" : "need_window";
}

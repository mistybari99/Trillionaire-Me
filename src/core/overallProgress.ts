// Overall progress (pure): ONE percent from the user's own entered tasks only. No network, no UI.
// Done weight / total weight. No tasks => null (Unknown), never 0. Nothing is invented: a task without a known size
// is never counted as 0 weight (see taskWeight).
import type { FieldValue, TMRecord } from "./types";

export type ProgressMode = "equal" | "size";
export const PROGRESS_MODES: readonly ProgressMode[] = ["equal", "size"];
export const isProgressMode = (v: unknown): v is ProgressMode => v === "equal" || v === "size";

/** Size choices and the minutes they stand for in 'size' mode. Plain minutes (task.minutes) win when present. */
export const SIZE_MINUTES = { S: 15, M: 30, L: 60 } as const;
export type TaskSize = keyof typeof SIZE_MINUTES;

export interface OverallProgress {
  /** Whole percent 0..100, or null (Unknown) when there is no task to count. */
  percent: number | null;
  done: number; total: number;
  mode: ProgressMode;
  /** Tasks counted with an average weight because neither minutes nor size was entered (size mode only). */
  withoutSize: number;
}

const strVal = (v: FieldValue | undefined): string | null => (v && v.state === "value" && typeof v.value === "string" ? v.value : null);
const numVal = (v: FieldValue | undefined): number | null => (v && v.state === "value" && typeof v.value === "number" && Number.isFinite(v.value) && v.value > 0 ? v.value : null);

/** A task is part of the plan unless the user marked it "no longer true" (it stays on record, but is not counted). */
export const isCountedTask = (r: TMRecord): boolean => r.entity === "task" && r.values["task.not_true_on"]?.state !== "value";
export const isDoneTask = (r: TMRecord): boolean => r.values["task.done_on"]?.state === "value";

/** Entered size weight: minutes first, then S/M/L. null when the user entered neither. */
export function enteredWeight(r: TMRecord): number | null {
  const m = numVal(r.values["task.minutes"]); if (m !== null) return m;
  const s = strVal(r.values["task.size"]);
  return s === "S" || s === "M" || s === "L" ? SIZE_MINUTES[s] : null;
}

/**
 * Overall progress of the given records (pass the active mode's records only).
 * equal: every counted task weighs 1. size: minutes or S/M/L; a task with no entered size takes the average of the
 * known weights (or 1 when none is known), so Unknown is never treated as 0.
 */
export function overallProgress(recs: readonly TMRecord[], mode: ProgressMode = "equal"): OverallProgress {
  const tasks = recs.filter(isCountedTask);
  if (!tasks.length) return { percent: null, done: 0, total: 0, mode, withoutSize: 0 };
  const known = tasks.map(enteredWeight).filter((x): x is number => x !== null);
  const avg = known.length ? known.reduce((a, b) => a + b, 0) / known.length : 1;
  let doneW = 0, totalW = 0, done = 0, withoutSize = 0;
  for (const t of tasks) {
    let w = 1;
    if (mode === "size") { const e = enteredWeight(t); if (e === null) withoutSize++; w = e ?? avg; }
    totalW += w;
    if (isDoneTask(t)) { doneW += w; done++; }
  }
  return { percent: Math.round((doneW / totalW) * 100), done, total: tasks.length, mode, withoutSize };
}

export type ProgressTrend = "unknown" | "first" | "up" | "same" | "down";
/** Compare with the last value seen. A fall (a task was added or removed) is a plain fact, never a failure. */
export function progressTrend(prev: number | null | undefined, now: number | null): ProgressTrend {
  if (now === null) return "unknown";
  if (prev === null || prev === undefined) return "first";
  return now > prev ? "up" : now < prev ? "down" : "same";
}

// ---- per-goal progress choice ----
export type GoalProgressMode = "auto" | "manual";
/** Chosen at goal creation. Missing or unknown value = auto (counted from linked tasks). */
export function goalProgressMode(goal: TMRecord): GoalProgressMode {
  return strVal(goal.values["goal.progress_mode"]) === "manual" ? "manual" : "auto";
}
/** Manual percent typed by the user: whole 0..100, or null (Unknown) when not entered. Never 0 by default. */
export function manualPercent(goal: TMRecord): number | null {
  const v = goal.values["goal.manual_percent"];
  if (!v || v.state !== "value" || typeof v.value !== "number" || !Number.isFinite(v.value)) return null;
  return v.value < 0 || v.value > 100 ? null : Math.round(v.value);
}

/** Small memory so a fall can be explained: `from` is the value before the latest change. Pure; the UI stores it per device. */
export interface ProgressMemory { last: number | null; from: number | null }
export function nextProgressMemory(mem: ProgressMemory | null, now: number | null): ProgressMemory {
  if (!mem) return { last: now, from: null };
  if (now === mem.last) return mem;
  return { last: now, from: mem.last };
}

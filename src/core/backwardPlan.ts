// Backward planning (audit M7 / reference batch 4 #52): start from the end date and work back to today through the user's OWN steps.
// Pure. Nothing is invented: the steps, their order and the end date all come from the user. The app only spreads the dates evenly.
// Unknown stays unknown: a step the user did not place gets no date; step size is not guessed.
import type { FieldValue, Label, TMRecord } from "./types";
import { goalIdsOf } from "./taskGoals";
import { isCountedTask } from "./overallProgress";

export const PLAN_BY = "task.plan_by";
const str = (v: FieldValue | undefined): string | null => (v && v.state === "value" && typeof v.value === "string" && v.value.trim() !== "" ? v.value : null);
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const toDay = (iso: string): number => { const [y, m, d] = iso.split("-").map(Number); return Date.UTC(y!, m! - 1, d!) / 86400000; };
const fromDay = (n: number): string => { const d = new Date(n * 86400000); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`; };
export const validDay = (s: string): boolean => ISO.test(s) && fromDay(toDay(s)) === s;
export const daysBetween = (from: string, to: string): number => toDay(to) - toDay(from);

export interface OpenStep { id: string; title: string }
/** The user's own open steps for one goal: counted, linked to the goal, not done, not parked. Ordered by id (stable; the user orders them in the wizard). */
export function openSteps(recs: readonly TMRecord[], goalId: string): OpenStep[] {
  return recs.filter((r) => isCountedTask(r) && goalIdsOf(r).includes(goalId) && str(r.values["task.done_on"]) === null && str(r.values["task.parked_on"]) === null)
    .sort((a, b) => a.id.localeCompare(b.id)).map((r) => ({ id: r.id, title: str(r.values["task.title"]) ?? "" }));
}

export type WorkBack =
  | { kind: "ok"; rows: Array<{ id: string; date: string }>; days: number; shared: boolean }
  | { kind: "no-date" } | { kind: "past" } | { kind: "none" };

/**
 * `lastFirst` is the user's order: the last step first, then what must come right before it, and so on.
 * Forward, step i of n is planned by today + ceil(i * days / n); the last step lands on the end date. A date that is today or past gives "past", no date gives "no-date".
 */
export function workBack(lastFirst: readonly string[], target: string, today: string): WorkBack {
  if (!validDay(target) || !validDay(today)) return { kind: "no-date" };
  const days = daysBetween(today, target); if (days <= 0) return { kind: "past" };
  const n = lastFirst.length; if (n === 0) return { kind: "none" };
  const forward = [...lastFirst].reverse(); const base = toDay(today);
  const rows = forward.map((id, i) => ({ id, date: fromDay(base + Math.ceil(((i + 1) * days) / n)) }));
  return { kind: "ok", rows, days, shared: n > days };
}

export const planByOf = (r: TMRecord): string | null => { const v = str(r.values[PLAN_BY]); return v !== null && validDay(v) ? v : null; };

/** Copies of the placed steps with their planned date. `label` is the value label of the active namespace (DEMO or FACT). */
export function withPlanDates(recs: readonly TMRecord[], rows: ReadonlyArray<{ id: string; date: string }>, label: Label): TMRecord[] {
  const by = new Map(rows.map((x) => [x.id, x.date] as const));
  return recs.filter((r) => by.has(r.id)).map((r) => ({ ...r, values: { ...r.values, [PLAN_BY]: { state: "value", value: by.get(r.id)!, label } as FieldValue } }));
}
/** Copies with the planned date removed (the way back). Only steps of this goal that carry a date. */
export function withoutPlanDates(recs: readonly TMRecord[], goalId: string): TMRecord[] {
  return recs.filter((r) => r.entity === "task" && goalIdsOf(r).includes(goalId) && r.values[PLAN_BY] !== undefined).map((r) => { const { [PLAN_BY]: _gone, ...rest } = r.values; return { ...r, values: rest }; });
}

// Q-12 (batch 3): "Keep the last day free". The user end date stays the end date; the last step is planned one day before it.
export type BufferState = "off" | "on" | "noroom";
export interface BufferedWorkBack { plan: WorkBack; buffer: BufferState; freeDay: string | null }
/** With keepLastFree on and at least 2 days left, works back to the day before the end date. With exactly 1 day left there is no room: the plan stays on the end date. A past or missing date is not a room problem ("off"). */
export function workBackBuffered(lastFirst: readonly string[], target: string, today: string, keepLastFree: boolean): BufferedWorkBack {
  const plain = workBack(lastFirst, target, today);
  if (!keepLastFree || plain.kind === "no-date" || plain.kind === "past") return { plan: plain, buffer: "off", freeDay: null };
  if (daysBetween(today, target) < 2) return { plan: plain, buffer: "noroom", freeDay: null };
  return { plan: workBack(lastFirst, fromDay(toDay(target) - 1), today), buffer: "on", freeDay: target };
}

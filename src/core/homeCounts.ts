// Home counts (pure): the user's own tasks and goal steps. Nothing entered = Unknown (never 0). Counts only; no percent, no forecast.
// A task is done only with a done date. A goal step is a task linked to a goal the user entered.
import type { TMRecord } from "./types";

export type Count = { state: "unknown" } | { state: "value"; done: number; total: number };
const isDone = (r: TMRecord): boolean => r.values["task.done_on"]?.state === "value";
const count = (tasks: readonly TMRecord[]): Count => tasks.length ? { state: "value", done: tasks.filter(isDone).length, total: tasks.length } : { state: "unknown" };

/** All tasks the user entered in this mode. */
export const taskCount = (recs: readonly TMRecord[]): Count => count(recs.filter((r) => r.entity === "task"));

/** Tasks linked to a goal that exists in this mode. */
export function goalStepCount(recs: readonly TMRecord[]): Count {
  const goals = new Set(recs.filter((r) => r.entity === "goal").map((r) => r.id));
  return count(recs.filter((r) => r.entity === "task" && !!r.links?.goal && goals.has(r.links.goal)));
}

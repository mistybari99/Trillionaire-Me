// "Where does this step go?" (multi-goal ruling): for one step, the path of every goal it serves and what marking it done changes, in the same
// numbers the progress screens use. Pure. No advice, no ranking: facts only.
import { goalProgress } from "./goalPlan";
import { buildTree, flatten } from "./goalTree";
import { isCountedTask, overallProgress } from "./overallProgress";
import { goalIdsOf } from "./taskGoals";
import type { TMRecord } from "./types";

export interface TraceGoal { id: string; title: string; path: string[]; done: number; total: number; doneAfter: number; percentNow: number | null; percentAfter: number | null; manual: boolean }
export interface Trace { stepId: string; counted: boolean; alreadyDone: boolean; goals: TraceGoal[]; overall: { done: number; total: number; doneAfter: number } | null }

const pc = (d: number, n: number): number | null => (n ? Math.round((d / n) * 100) : null);

/** `recs` = the records of the active mode. A step marked "no longer true" is not counted anywhere, so it has no effect to show. */
export function taskTrace(recs: readonly TMRecord[], stepId: string): Trace | null {
  const step = recs.find((r) => r.id === stepId && r.entity === "task"); if (!step) return null;
  const counted = isCountedTask(step); const alreadyDone = step.values["task.done_on"]?.state === "value";
  const nodes = new Map(flatten(buildTree(recs)).map((n) => [n.id, n] as const));
  const prog = new Map(goalProgress(recs).map((p) => [p.id, p] as const));
  const pathOf = (id: string): string[] => { const out: string[] = []; let cur = nodes.get(id) ?? null; let guard = 0; while (cur && guard++ < 5) { out.unshift(cur.title); cur = cur.parentId ? nodes.get(cur.parentId) ?? null : null; } return out; };
  const goals: TraceGoal[] = goalIdsOf(step).filter((id) => nodes.has(id)).map((id) => {
    const p = prog.get(id)!; const add = counted && !alreadyDone ? 1 : 0;
    return { id, title: nodes.get(id)!.title, path: pathOf(id), done: p.done, total: p.total, doneAfter: p.done + add, percentNow: p.mode === "manual" ? p.percent : pc(p.done, p.total), percentAfter: p.mode === "manual" ? p.percent : pc(p.done + add, p.total), manual: p.mode === "manual" };
  }).sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
  const o = overallProgress(recs, "equal");
  return { stepId, counted, alreadyDone, goals, overall: counted && o.total ? { done: o.done, total: o.total, doneAfter: o.done + (alreadyDone ? 0 : 1) } : null };
}

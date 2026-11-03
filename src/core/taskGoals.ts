// Steps (tasks) and habits can serve several goals (multi-goal ruling, 3 Nov 2026: docs/design/multi-goal-final-decision.md). Pure.
// ONE reader (`goalIdsOf`) and ONE writer (`withGoals`) for the list. `links.goal` is kept for steps as a rollback mirror of the first item only:
// if the two disagree, `task.goals` wins. Nothing new reads `links.goal` for steps. Unknown (not linked yet) is never an empty "none".
import type { FieldValue, TMRecord } from "./types";

export const MAX_GOALS = 5;
export const TASK_GOALS = "task.goals";
export const HABIT_GOALS = "habit.goals";
const fieldOf = (r: TMRecord): string | null => (r.entity === "task" ? TASK_GOALS : r.entity === "habit" ? HABIT_GOALS : null);
const dedupe = (ids: readonly string[]): string[] => [...new Set(ids.filter((x) => typeof x === "string" && x !== ""))];

/** The goal ids a step or habit serves: `task.goals` when it holds a non-empty list; else the single old link for a step; else none. Deduped, in saved order. */
export function goalIdsOf(rec: TMRecord): string[] {
  const f = fieldOf(rec); const v = f ? rec.values[f] : undefined;
  if (v?.state === "value" && Array.isArray(v.value)) { const ids = dedupe(v.value as string[]); if (ids.length) return ids; }
  if (rec.entity === "task" && rec.links?.goal) return [rec.links.goal];
  return [];
}
/** Only ids whose goal exists (`goalIds` = the ids of the goals in the same namespace). Used by every sum. */
export const liveGoalIdsOf = (rec: TMRecord, goalIds: ReadonlySet<string>): string[] => goalIdsOf(rec).filter((id) => goalIds.has(id));
/** Ids that point to a goal that is gone. Kept in the data and shown, never dropped silently. */
export const danglingGoalIdsOf = (rec: TMRecord, goalIds: ReadonlySet<string>): string[] => goalIdsOf(rec).filter((id) => !goalIds.has(id));

const labelOf = (r: TMRecord): "FACT" | "DEMO" => (r.ns === "real" ? "FACT" : "DEMO");
/** The ONLY writer. Sets the list (unknown when empty) and, for a step, mirrors `links.goal` = first item (removed when empty). Returns a new record. */
export function withGoals(rec: TMRecord, ids: readonly string[]): TMRecord {
  const f = fieldOf(rec); if (!f) return rec;
  const list = dedupe(ids).slice(0, MAX_GOALS);
  const values = { ...rec.values, [f]: list.length ? ({ state: "value", value: list, label: labelOf(rec) } as FieldValue) : ({ state: "unknown" } as FieldValue) };
  if (rec.entity !== "task") return { ...rec, values };
  const links = { ...(rec.links ?? {}) }; if (list.length) links.goal = list[0]!; else delete links.goal;
  const { links: _old, ...rest } = rec;
  return Object.keys(links).length ? { ...rest, values, links } : { ...rest, values };
}
export const withTaskGoals = withGoals;

export type LinkError = "goals_max" | "goal_other_namespace";
/** Checks a new list before saving. A goal that no longer exists is NOT an error here (it only cannot be newly picked in the UI). */
export function validateLinks(recs: readonly TMRecord[], rec: TMRecord, ids: readonly string[]): LinkError | null {
  const list = dedupe(ids); if (list.length > MAX_GOALS) return "goals_max";
  const had = new Set(goalIdsOf(rec));
  for (const id of list) { if (had.has(id)) continue; const g = recs.find((r) => r.id === id && r.entity === "goal"); if (g && g.ns !== rec.ns) return "goal_other_namespace"; }
  return null;
}

export interface RemovalPreview {
  /** steps that list this goal */ steps: number;
  /** of those, steps that still serve another existing goal afterwards */ keepOther: number;
  /** of those, steps with no goal left */ unlinked: number;
  /** habits that list this goal */ habits: number;
  /** parts (sub-goals or projects) directly below this goal that move up as orphans */ partsMoveUp: number;
}
const liveGoals = (recs: readonly TMRecord[]): Set<string> => new Set(recs.filter((r) => r.entity === "goal").map((r) => r.id));
/** What deleting a goal would do, in numbers. The same rule `applyGoalRemoval` uses. */
export function previewGoalRemoval(recs: readonly TMRecord[], goalId: string): RemovalPreview {
  const live = liveGoals(recs); live.delete(goalId);
  let steps = 0, keepOther = 0, unlinked = 0, habits = 0;
  for (const r of recs) {
    if (r.entity !== "task" && r.entity !== "habit") continue;
    const ids = goalIdsOf(r); if (!ids.includes(goalId)) continue;
    if (r.entity === "habit") { habits++; continue; }
    steps++; if (ids.some((x) => x !== goalId && live.has(x))) keepOther++; else unlinked++;
  }
  return { steps, keepOther, unlinked, habits, partsMoveUp: recs.filter((r) => r.entity === "goal" && r.links?.parent === goalId).length };
}
/** The records to write when a goal is deleted: the id is taken out of every list, nothing else changes, no step or habit is deleted. Other dangling ids stay. */
export function applyGoalRemoval(recs: readonly TMRecord[], goalId: string): TMRecord[] {
  const out: TMRecord[] = [];
  for (const r of recs) {
    if (r.entity !== "task" && r.entity !== "habit") continue;
    const ids = goalIdsOf(r); if (!ids.includes(goalId)) continue;
    out.push(withGoals(r, ids.filter((x) => x !== goalId)));
  }
  return out;
}

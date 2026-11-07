// TM-REQ-009: a goal can be active, paused or retired. Paused and retired goals make no reminders; their history stays readable.
// No-deadline goals (no target date) never make a date reminder. Pure. Unknown is never 0.
import type { FieldValue, TMRecord } from "./types";
import { goalProgress } from "./goalPlan";

export const GOAL_STATUSES = ["active", "paused", "retired"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];
const str = (v: FieldValue | undefined): string | null => (v && v.state === "value" && typeof v.value === "string" ? v.value : null);

/** Missing or unknown status means active (the default for every goal made before this field existed). */
export const goalStatusOf = (g: TMRecord): GoalStatus => { const s = str(g.values["goal.status"]); return (GOAL_STATUSES as readonly string[]).includes(s ?? "") ? (s as GoalStatus) : "active"; };
export const withGoalStatus = (g: TMRecord, status: GoalStatus): TMRecord => ({ ...g, values: { ...g.values, "goal.status": { state: "value", value: status, label: g.ns === "demo" ? "DEMO" : "FACT" } } });

export interface GoalReminder { goalId: string; title: string; targetDate: string }
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Active goals whose target date has passed and that are not at 100 percent. Nothing else is ever a reminder. */
export function goalReminders(recs: readonly TMRecord[], today: string): GoalReminder[] {
  const prog = new Map(goalProgress(recs).map((p) => [p.id, p] as const));
  const out: GoalReminder[] = [];
  for (const g of recs) {
    if (g.entity !== "goal" || goalStatusOf(g) !== "active") continue;
    const p = prog.get(g.id); const date = str(g.values["goal.target_date"]);
    if (!p || !date || !DAY.test(date) || date >= today || p.percent === 100) continue;
    out.push({ goalId: g.id, title: p.title, targetDate: date });
  }
  return out.sort((a, b) => a.targetDate.localeCompare(b.targetDate) || a.goalId.localeCompare(b.goalId));
}

// "Next best action" (pure, rule-based). One suggestion from the user's own entries, always with the rule that chose it.
// No amounts, no percents, no prediction: only what the user entered. Rules run in this fixed order; the first that applies wins.
import type { TMRecord } from "./types";
import { goalProgress } from "./goalPlan";
import { isOpenTask } from "./planInputs";

export type ActionId = "add_goal" | "link_task" | "add_task" | "do_task" | "add_money" | "rate_life" | "review_plan";
export interface NextAction { id: ActionId; href: string; /** values for the title and reason text (user's own words only) */ args: Record<string, string> }

const textOf = (r: TMRecord, f: string): string => { const v = r.values[f]; return v && v.state === "value" && typeof v.value === "string" ? v.value : ""; };

export function nextBestAction(recs: readonly TMRecord[]): NextAction {
  const goals = goalProgress(recs);
  if (!goals.length) return { id: "add_goal", href: "#/diary/intake/6", args: {} };
  const unlinked = goals.find((g) => g.mode !== "manual" && g.total === 0);
  if (unlinked) return { id: "link_task", href: "#/diary/plan", args: { goal: unlinked.title } };
  const tasks = recs.filter((r) => r.entity === "task");
  if (!tasks.length) return { id: "add_task", href: "#/diary/plan", args: {} };
  const open = tasks.filter(isOpenTask).sort((a, b) => a.id.localeCompare(b.id));
  if (open.length) return { id: "do_task", href: "#/diary/plan", args: { task: textOf(open[0]!, "task.title") } };
  if (!recs.some((r) => r.entity === "finance_item")) return { id: "add_money", href: "#/diary/money", args: {} };
  if (!recs.some((r) => r.entity === "life_area")) return { id: "rate_life", href: "#/journey/wheel", args: {} };
  return { id: "review_plan", href: "#/diary/plan", args: {} };
}

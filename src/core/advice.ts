// Rule-based advice cards (Block 5). Pure: no UI, no network, no AI. Built only from the user's own entries.
// Every card carries the rule that chose it (its reason is always shown). No amounts, no percents, no prediction, no comparing:
// only counts of the user's own entries and the user's own words. Unknown stays Unknown (an unfilled amount is counted, never read as 0).
// The text each card links to comes from the built-in knowledge (topics + packs), which stays "reviewer: pending" until signed off.
import type { TMRecord } from "./types";
import { goalProgress } from "./goalPlan";
import { isOpenTask } from "./planInputs";
import { riskRows, withoutStopRule } from "./risk";

export type AdviceRule = "goal_no_task" | "many_open_tasks" | "risk_no_stop_rule" | "money_unknown" | "no_plan_window";
export interface AdviceCard {
  rule: AdviceRule;
  /** built-in topic that holds the how-to text (route: #/topic/<topic>) */
  topic: string;
  /** values for the reason text: counts and the user's own words only */
  args: Record<string, string>;
  /** the app place where the user can act on it */
  href: string;
  /** Provenance of the linked text: always built-in, general, draft until a reviewer signs off. */
  provenance: { kind: "builtin"; source: "general"; reviewer: "pending" };
}
/** Above this many open tasks the card suggests choosing fewer for today. A fixed rule threshold, not a forecast. */
export const MANY_OPEN_TASKS = 8;
export const MAX_ADVICE = 3;

const PROV = { kind: "builtin", source: "general", reviewer: "pending" } as const;

export function adviceCards(recs: readonly TMRecord[]): AdviceCard[] {
  const out: AdviceCard[] = [];
  const goals = goalProgress(recs);
  const lone = goals.find((g) => g.mode !== "manual" && g.total === 0);
  if (lone) out.push({ rule: "goal_no_task", topic: "goal-strategy", args: { goal: lone.title }, href: "#/diary/plan", provenance: PROV });
  const open = recs.filter(isOpenTask).length;
  if (open >= MANY_OPEN_TASKS) out.push({ rule: "many_open_tasks", topic: "time", args: { n: String(open) }, href: "#/diary/plan", provenance: PROV });
  const noStop = withoutStopRule(riskRows([...recs]));
  if (noStop > 0) out.push({ rule: "risk_no_stop_rule", topic: "obstacles", args: { n: String(noStop) }, href: "#/journey/risks", provenance: PROV });
  const fin = recs.filter((r) => r.entity === "finance_item");
  const unknownAmt = fin.filter((r) => r.values["finance.amount"]?.state !== "value").length;
  if (unknownAmt > 0) out.push({ rule: "money_unknown", topic: "money", args: { n: String(unknownAmt) }, href: "#/diary/money", provenance: PROV });
  return out.slice(0, MAX_ADVICE);
}

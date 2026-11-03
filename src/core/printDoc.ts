// Print / Save as PDF (M20 export, TM-REQ-153): the documents are made on this phone from the user's own records; the phone's print
// window turns them into a PDF file. Nothing is sent anywhere. Pure helpers only (no UI, no network).
// Unknown is never 0: a goal with no date, a step with no estimate and a branch with no steps say so.
import { buildTree, flatten, type GoalKind } from "./goalTree";
import { goalIdsOf } from "./taskGoals";
import type { FieldValue, TMRecord } from "./types";

export const PRINT_KINDS = ["report", "plan", "handover"] as const;
export type PrintKind = (typeof PRINT_KINDS)[number];
export const isPrintKind = (s: string | undefined): s is PrintKind => !!s && (PRINT_KINDS as readonly string[]).includes(s);

/** File name the phone offers in "Save as PDF" (it uses the page title). Latin letters only, so every phone accepts it. */
export const printFileName = (kind: PrintKind, ns: TMRecord["ns"], day: string): string => `trillionaire-me-${kind}-${ns === "real" ? "real" : "demo"}-${day}`;

const str = (v: FieldValue | undefined): string | null => (v?.state === "value" && typeof v.value === "string" && v.value.trim() ? v.value.trim() : null);
const num = (v: FieldValue | undefined): number | null => (v?.state === "value" && typeof v.value === "number" && Number.isFinite(v.value) && v.value > 0 ? v.value : null);

export interface PlanStep { id: string; title: string; minutes: number | null }
export interface PlanDocRow { id: string; title: string; kind: GoalKind; depth: number; date: string | null; percent: number | null; steps: PlanStep[] }

/** Goals as a tree (in reading order) with the steps still open under each one. */
export function planDoc(recs: readonly TMRecord[]): PlanDocRow[] {
  const open = (r: TMRecord) => r.entity === "task" && r.values["task.done_on"]?.state !== "value" && r.values["task.not_true_on"]?.state !== "value" && r.values["task.parked_on"]?.state !== "value";
  const tasks = recs.filter(open);
  const goalRec = new Map(recs.filter((r) => r.entity === "goal").map((r) => [r.id, r] as const));
  return flatten(buildTree(recs)).map((n) => ({
    id: n.id, title: n.title, kind: n.kind, depth: n.depth, date: str(goalRec.get(n.id)?.values["goal.target_date"]), percent: n.branch.percent,
    steps: tasks.filter((x) => goalIdsOf(x).includes(n.id)).sort((a, b) => (a.id < b.id ? -1 : 1)).map((x) => ({ id: x.id, title: str(x.values["task.title"]) ?? "", minutes: num(x.values["task.minutes"]) })),
  }));
}

// Batch 2 (Q-10, Q-11, Q-30): goal-page helpers. Pure; no UI, no network. Every text is the user's own; nothing is graded or invented.
// Unknown is not 0: a blank field is "Not set". Wizard answers go into the existing SMART fields; nothing is graded.
import type { FieldValue, TMRecord } from "./types";
import { SMART_FIELDS } from "./goalPlan";
import { goalIdsOf } from "./taskGoals";
import { isCountedTask } from "./overallProgress";

export const textOfField = (r: TMRecord, f: string): string => { const v: FieldValue | undefined = r.values[f]; return v && v.state === "value" && typeof v.value === "string" ? v.value.trim() : ""; };

/** Q-10: 4-field problem frame. */
export const PROBLEM_FIELDS = ["goal.problem", "goal.problem_who", "goal.problem_why", "goal.problem_outcome"] as const;
/** Q-10: 3-field Want / Feel / Do card. */
export const WFD_FIELDS = ["goal.wfd_want", "goal.wfd_feel", "goal.wfd_do"] as const;
/** Q-10: five fixed tiny-action examples (texts: keys q2.tiny.N). Fixed list, nothing generated, nothing rated. */
export const TINY_ACTIONS = [1, 2, 3, 4, 5] as const;
/** Q-11: optional worksheet fields. */
export const WORKSHEET_FIELDS = ["goal.obstacle", "goal.backup", "goal.first_action", "goal.first_when"] as const;
export const RESOURCES_FIELD = "goal.resources";

/** Fields a person fills by hand on the goal page (anything here counts as "started"). */
const STARTED_FIELDS = ["goal.why", "goal.success", "goal.smart_specific", "goal.smart_achievable", "goal.horizon", "goal.target_date", ...PROBLEM_FIELDS, ...WFD_FIELDS, ...WORKSHEET_FIELDS, RESOURCES_FIELD];

/** Q-10: a goal is "empty" when it has a title only: no worksheet text, and no step linked to it. */
export function isEmptyGoal(rec: TMRecord, recs: readonly TMRecord[]): boolean {
  if (STARTED_FIELDS.some((f) => textOfField(rec, f) !== "")) return false;
  return !recs.some((r) => r.entity === "task" && goalIdsOf(r).includes(rec.id));
}

export type TableKey = "objective" | "steps" | "success" | "time" | "resources";
export interface TableRow { key: TableKey; /** null = Not set (unknown, never 0 or a guess) */ value: string | null; /** step titles when key is "steps" */ list?: string[] }
/** Q-11: plan table, rows in a fixed order. Everything comes from the goal's own fields and its own linked open steps. */
export function planTable(rec: TMRecord, recs: readonly TMRecord[]): TableRow[] {
  const nz = (s: string): string | null => (s === "" ? null : s);
  const steps = recs.filter((r) => isCountedTask(r) && goalIdsOf(r).includes(rec.id) && textOfField(r, "task.done_on") === "" && textOfField(r, "task.parked_on") === "")
    .sort((a, b) => a.id.localeCompare(b.id)).map((r) => textOfField(r, "task.title")).filter((x) => x !== "");
  const date = textOfField(rec, "goal.target_date"), hz = textOfField(rec, "goal.horizon");
  return [
    { key: "objective", value: nz(textOfField(rec, "goal.title")) },
    { key: "steps", value: steps.length ? String(steps.length) : null, list: steps },
    { key: "success", value: nz(textOfField(rec, "goal.success")) },
    { key: "time", value: nz([date, hz].filter(Boolean).join(" · ")) },
    { key: "resources", value: nz(textOfField(rec, RESOURCES_FIELD)) },
  ];
}

/** Q-30: step-by-step wizard. Five questions, one per SMART part; each answer lands in the field the one-page form already uses. */
export const WIZARD_STEPS = [
  { part: "specific", field: SMART_FIELDS.specific[0]!, kind: "text" },
  { part: "measurable", field: SMART_FIELDS.measurable[0]!, kind: "text" },
  { part: "achievable", field: SMART_FIELDS.achievable[0]!, kind: "text" },
  { part: "relevant", field: SMART_FIELDS.relevant[0]!, kind: "text" },
  { part: "timebound", field: "goal.target_date", kind: "date" },
] as const;

/** Q-30: seven yes/no questions, Unknown allowed. Stored as one comma list in goal.smart_check, e.g. "y,n,u,u,u,u,u". */
export const CHECK_ITEMS = ["specific", "measure", "reach", "matters", "date", "first", "written"] as const;
export type CheckAnswer = "yes" | "no" | "unknown";
const CODE: Record<CheckAnswer, string> = { yes: "y", no: "n", unknown: "u" };
const BACK: Record<string, CheckAnswer> = { y: "yes", n: "no", u: "unknown" };
/** Fails closed: anything that is not exactly seven valid codes reads as "all unknown". */
export function parseCheck(raw: string): CheckAnswer[] {
  const parts = raw.split(",").map((x) => x.trim());
  if (parts.length !== CHECK_ITEMS.length || parts.some((x) => BACK[x] === undefined)) return CHECK_ITEMS.map(() => "unknown" as CheckAnswer);
  return parts.map((x) => BACK[x]!);
}
export const serializeCheck = (a: readonly CheckAnswer[]): string => CHECK_ITEMS.map((_, i) => CODE[a[i] ?? "unknown"]).join(",");
/** Counts for a calm summary line. Only counts, no pass mark. */
export function checkSummary(a: readonly CheckAnswer[]): { yes: number; no: number; unknown: number } {
  return { yes: a.filter((x) => x === "yes").length, no: a.filter((x) => x === "no").length, unknown: a.filter((x) => x === "unknown").length };
}

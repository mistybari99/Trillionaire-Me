// B9 (R6): data behind the Plan flow diagram. Pure: every value is either a real number/text from the user's own records or null (= unknown). Unknown is never turned into 0.
import type { FieldValue, RecordValues, TMRecord } from "./types";
import type { CapacityState } from "./planInputs";

export type FlowData = {
  /** constraint.weekly_free_hours, or null when not entered. A real 0 stays 0. */
  hours: number | null;
  /** Number of resource records of kind "tools", or null when none entered. */
  tools: number | null;
  /** Number of skill records with a name, or null when none entered. */
  skills: number | null;
  /** Intake answers given so far, or null when nothing was answered yet. */
  research: { answered: number; total: number } | null;
  /** Open tasks placed by the planner, or null when capacity or tasks are missing. */
  plan: { placed: number; tasks: number } | null;
  /** First goal title with a value, or null. */
  goal: string | null;
};

const val = (v: FieldValue | undefined): unknown => (v && v.state === "value" ? v.value : null);
const nonEmpty = (x: unknown): x is string => typeof x === "string" && x.trim() !== "";

export function planFlowData(recs: TMRecord[], a: RecordValues, capacity: CapacityState, placedTaskIds: ReadonlySet<string>, answered: number, total: number): FlowData {
  const hoursRaw = val(a["constraint.weekly_free_hours"]);
  const hours = typeof hoursRaw === "number" && Number.isFinite(hoursRaw) && hoursRaw >= 0 ? hoursRaw : null;
  const count = (keep: (r: TMRecord) => boolean): number | null => { const n = recs.filter(keep).length; return n > 0 ? n : null; };
  const tools = count((r) => r.entity === "resource" && val(r.values["resource.kind"]) === "tools");
  const skills = count((r) => r.entity === "skill" && nonEmpty(val(r.values["skill.name"])));
  const openTasks = recs.filter((r) => r.entity === "task" && r.values["task.done_on"]?.state !== "value").length;
  const goal = recs.filter((r) => r.entity === "goal").sort((x, y) => x.id.localeCompare(y.id))
    .map((r) => val(r.values["goal.title"])).find(nonEmpty) ?? null;
  return {
    hours,
    tools,
    skills,
    research: answered > 0 ? { answered, total } : null,
    plan: capacity === "ok" && openTasks > 0 ? { placed: placedTaskIds.size, tasks: openTasks } : null,
    goal: goal === null ? null : goal.trim(),
  };
}

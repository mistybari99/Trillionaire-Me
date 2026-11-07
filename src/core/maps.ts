// M18 visual layer, part 3 (pure): data for the drawn goal tree, the resource map and the readiness map. Own data only.
// Unknown stays unknown: nothing entered means "not entered yet", never 0; a missing fact is shown as missing, never guessed. Nothing is graded or compared; no percent across goals.
import { buildTree } from "./goalTree";
import { goalStatusOf } from "./goalStatus";
import { planByOf, validDay } from "./backwardPlan";
import { goalIdsOf } from "./taskGoals";
import { isCountedTask } from "./overallProgress";
import type { FieldValue, TMRecord } from "./types";

const str = (v: FieldValue | undefined): string | null => (v?.state === "value" && typeof v.value === "string" && v.value.trim() ? v.value.trim() : null);
const numv = (v: FieldValue | undefined): number | null => (v?.state === "value" && typeof v.value === "number" && Number.isFinite(v.value) ? v.value : null);

// ------------------------------------------------------------------ goal tree
export interface TreeDrawRow { id: string; title: string; depth: number; kind: string; /** row number of the parent in this list, null at the top */ parentRow: number | null; done: number; total: number; /** null = no step yet (unknown) */ percent: number | null; status: string }
/** The goal tree in drawing order (parents first, children under them). Retired goals are left out. */
export function treeRows(recs: readonly TMRecord[]): TreeDrawRow[] {
  const byId = new Map(recs.filter((r) => r.entity === "goal").map((g) => [g.id, g] as const)); const rows: TreeDrawRow[] = []; const rowOf = new Map<string, number>();
  const walk = (n: ReturnType<typeof buildTree>[number], parent: number | null) => {
    const rec = byId.get(n.id); const status = rec ? goalStatusOf(rec) : "active"; if (status === "retired") return;
    rowOf.set(n.id, rows.length); rows.push({ id: n.id, title: n.title, depth: n.depth, kind: n.kind, parentRow: parent, done: n.branch.done, total: n.branch.total, percent: n.branch.percent, status });
    for (const c of n.children) walk(c, rowOf.get(n.id)!);
  };
  for (const r of buildTree(recs)) walk(r, null);
  return rows;
}

// ------------------------------------------------------------------ resource map
export const RESOURCE_AREAS = ["money", "people", "tools", "space", "skills", "time", "other"] as const;
export type ResourceAreaId = (typeof RESOURCE_AREAS)[number];
export interface ResourceArea { area: ResourceAreaId; /** number of own entries; null = nothing entered yet (unknown, not zero) */ count: number | null; items: string[]; /** time area: typed free hours per week, or null */ hours: number | null; href: string }
const HREF: Record<ResourceAreaId, string> = { money: "#/diary/money", people: "#/diary/team", tools: "#/diary/intake/5", space: "#/diary/intake/5", skills: "#/diary/intake/3", time: "#/diary/plan", other: "#/diary/intake/5" };
/** What the person has to work with, from their own entries: resources by kind, money lines, team roles, skills and the free hours they typed. */
export function resourceMap(recs: readonly TMRecord[]): ResourceArea[] {
  const kindOfRes = (r: TMRecord) => str(r.values["resource.kind"]);
  const resItems = (k: string) => recs.filter((r) => r.entity === "resource" && kindOfRes(r) === k).map((r) => str(r.values["resource.description"]) ?? "").filter(Boolean);
  const resCount = (k: string) => recs.filter((r) => r.entity === "resource" && kindOfRes(r) === k).length;
  const money = recs.filter((r) => r.entity === "finance_item").map((r) => str(r.values["finance.label"]) ?? "").filter(Boolean);
  const moneyLines = recs.filter((r) => r.entity === "finance_item").length;
  const roles = recs.filter((r) => r.entity === "team_role").map((r) => str(r.values["team_role.role"]) ?? "").filter(Boolean);
  const rolesCount = recs.filter((r) => r.entity === "team_role").length;
  const skills = recs.filter((r) => r.entity === "skill").map((r) => str(r.values["skill.name"]) ?? "").filter(Boolean);
  const skillCount = recs.filter((r) => r.entity === "skill").length;
  const hours = recs.filter((r) => r.entity === "constraint").map((r) => numv(r.values["constraint.weekly_free_hours"])).find((x) => x !== null) ?? null;
  const n = (x: number): number | null => (x > 0 ? x : null);
  const out: Record<ResourceAreaId, Omit<ResourceArea, "area" | "href">> = {
    money: { count: n(resCount("money") + moneyLines), items: [...resItems("money"), ...money], hours: null },
    people: { count: n(resCount("people") + rolesCount), items: [...resItems("people"), ...roles], hours: null },
    tools: { count: n(resCount("tools")), items: resItems("tools"), hours: null },
    space: { count: n(resCount("space")), items: resItems("space"), hours: null },
    skills: { count: n(skillCount), items: skills, hours: null },
    time: { count: hours === null ? null : 1, items: [], hours },
    other: { count: n(resCount("other")), items: resItems("other"), hours: null },
  };
  return RESOURCE_AREAS.map((a) => ({ area: a, href: HREF[a], ...out[a] }));
}

// ------------------------------------------------------------------ readiness map (known / missing / old / conflict)
export const READY_FACTS = ["date", "measure", "steps", "time"] as const;
export type ReadyFact = (typeof READY_FACTS)[number];
export type Ready = "known" | "missing" | "stale" | "conflict";
export interface ReadyCell { status: Ready; /** short reason key for the text version */ why: "none" | "date_passed" | "later_than_parent" | "step_after_end" | "step_date_passed" }
export interface ReadinessRow { id: string; title: string; cells: Record<ReadyFact, ReadyCell> }
const cell = (status: Ready, why: ReadyCell["why"] = "none"): ReadyCell => ({ status, why });

/**
 * One row per active goal, four facts each. Known = entered. Missing = not entered. Old = the end date or a planned step date has passed and the goal is not finished.
 * Conflict = two of the person's own dates disagree (a sub-goal ends after its parent, or a step is planned after the goal's end date).
 */
export function readinessMap(recs: readonly TMRecord[], today: string): ReadinessRow[] {
  const goals = recs.filter((r) => r.entity === "goal" && str(r.values["goal.title"]) && goalStatusOf(r) === "active").sort((a, b) => a.id.localeCompare(b.id));
  const byId = new Map(recs.filter((r) => r.entity === "goal").map((g) => [g.id, g] as const));
  const dateOf = (g: TMRecord): string | null => { const d = str(g.values["goal.target_date"]); return d && validDay(d) ? d : null; };
  const hours = recs.some((r) => r.entity === "constraint" && numv(r.values["constraint.weekly_free_hours"]) !== null);
  return goals.map((g) => {
    const date = dateOf(g); const parent = g.links?.parent ? byId.get(g.links.parent) : undefined; const pDate = parent ? dateOf(parent) : null;
    const mySteps = recs.filter((r) => isCountedTask(r) && goalIdsOf(r).includes(g.id));
    const planned = mySteps.map((r) => ({ r, by: planByOf(r) })).filter((x): x is { r: TMRecord; by: string } => x.by !== null && str(x.r.values["task.done_on"]) === null);
    const dateCell = date === null ? cell("missing") : pDate !== null && date > pDate ? cell("conflict", "later_than_parent") : planned.some((x) => x.by > date) ? cell("conflict", "step_after_end") : date < today ? cell("stale", "date_passed") : cell("known");
    const stepsCell = mySteps.length === 0 ? cell("missing") : planned.some((x) => x.by < today) ? cell("stale", "step_date_passed") : cell("known");
    return { id: g.id, title: str(g.values["goal.title"])!, cells: { date: dateCell, measure: str(g.values["goal.success"]) !== null ? cell("known") : cell("missing"), steps: stepsCell, time: hours ? cell("known") : cell("missing") } };
  });
}

// M06 goal tree (pure): Goal -> Sub-goal -> Project, with the steps (tasks) below. A child sits under a parent of a higher level only,
// so a loop is impossible. Progress of a branch pools the steps of the whole branch: done steps over all steps. No step anywhere means Unknown, never 0.
// A goal whose progress mode is "I will enter it myself" keeps its own percent. Overall progress elsewhere keeps counting each step once, on its own goal.
import { goalProgress } from "./goalPlan";
import type { FieldValue, TMRecord } from "./types";

export const GOAL_KINDS = ["goal", "subgoal", "project"] as const;
export type GoalKind = (typeof GOAL_KINDS)[number];
const LEVEL_ORDER: Record<GoalKind, number> = { goal: 0, subgoal: 1, project: 2 };
const str = (v: FieldValue | undefined): string | null => (v?.state === "value" && typeof v.value === "string" && v.value.trim() ? v.value.trim() : null);
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** A goal with no (or an unreadable, or "task") level counts as a top-level goal. */
export function kindOf(g: TMRecord): GoalKind {
  const k = str(g.values["goal.kind"]);
  return (GOAL_KINDS as readonly string[]).includes(k ?? "") ? (k as GoalKind) : "goal";
}
/** A parent must be of a higher level than its child. */
export const canBeChild = (child: GoalKind, parent: GoalKind): boolean => LEVEL_ORDER[parent] < LEVEL_ORDER[child];

export interface TreeNode {
  id: string; title: string; kind: GoalKind; ns: TMRecord["ns"];
  /** the parent that exists and is of a higher level; null at the top */
  parentId: string | null;
  /** a sub-goal or project whose parent is missing or no longer fits: shown at the top, with a note */
  orphan: boolean;
  depth: number; children: TreeNode[];
  metricLabel: string | null;
  /** own steps, then the whole branch (this goal and everything below it) */
  own: { done: number; total: number };
  /** the distinct steps of this goal and everything below it (a step shared by two parts of one branch is listed once), and which are done */
  stepIds: string[]; doneIds: string[];
  branch: { done: number; total: number; percent: number | null };
  /** "manual": the user's own percent for this goal (the branch figure is not used) */
  mode: "auto" | "manual"; manualPercent: number | null;
}

export function buildTree(recs: readonly TMRecord[]): TreeNode[] {
  const goals = recs.filter((r) => r.entity === "goal" && str(r.values["goal.title"])).sort((a, b) => cmp(a.id, b.id));
  const prog = new Map(goalProgress(recs).map((p) => [p.id, p] as const));
  const byId = new Map(goals.map((g) => [g.id, g] as const));
  const nodes = new Map<string, TreeNode>();
  for (const g of goals) {
    const kind = kindOf(g); const p = prog.get(g.id)!; const pid = g.links?.parent ?? null; const par = pid ? byId.get(pid) : undefined;
    const ok = !!par && canBeChild(kind, kindOf(par));
    nodes.set(g.id, { id: g.id, title: str(g.values["goal.title"])!, kind, ns: g.ns, parentId: ok ? pid : null, orphan: kind !== "goal" && !ok, depth: 0, children: [],
      metricLabel: str(g.values["goal.metric_label"]), own: { done: p.done, total: p.total }, stepIds: [...p.ids], doneIds: [...p.doneIds], branch: { done: p.done, total: p.total, percent: null },
      mode: p.mode === "manual" ? "manual" : "auto", manualPercent: p.mode === "manual" ? p.percent : null });
  }
  const roots: TreeNode[] = [];
  for (const n of nodes.values()) (n.parentId ? nodes.get(n.parentId)!.children : roots).push(n);
  const order = (a: TreeNode, b: TreeNode) => cmp(a.title.toLowerCase(), b.title.toLowerCase()) || cmp(a.id, b.id);
  const walk = (n: TreeNode, depth: number): void => {
    n.depth = depth; n.children.sort(order);
    // The branch is the UNION of step ids, so a step linked to a project and to its parent goal, or to two sub-goals, counts once in the branch.
    const all = new Set(n.stepIds), done = new Set(n.doneIds);
    for (const c of n.children) { walk(c, depth + 1); c.stepIds.forEach((x) => all.add(x)); c.doneIds.forEach((x) => done.add(x)); }
    n.stepIds = [...all]; n.doneIds = [...done]; n.branch.done = done.size; n.branch.total = all.size;
    n.branch.percent = n.mode === "manual" ? n.manualPercent : n.branch.total ? Math.round((n.branch.done / n.branch.total) * 100) : null;
  };
  roots.sort(order); for (const r of roots) walk(r, 0);
  return roots;
}
export function flatten(roots: readonly TreeNode[]): TreeNode[] { const out: TreeNode[] = []; const go = (n: TreeNode) => { out.push(n); n.children.forEach(go); }; roots.forEach(go); return out; }
export const nodeById = (roots: readonly TreeNode[], id: string): TreeNode | null => flatten(roots).find((n) => n.id === id) ?? null;

/** Goals a new or edited goal of this level may sit under: strictly higher level, never itself. */
export function eligibleParents(recs: readonly TMRecord[], kind: GoalKind, selfId: string | null = null): Array<{ id: string; title: string; kind: GoalKind }> {
  return flatten(buildTree(recs)).filter((n) => n.id !== selfId && canBeChild(kind, n.kind)).map((n) => ({ id: n.id, title: n.title, kind: n.kind }));
}

export type PlaceError = "title_required" | "title_long" | "parent_required" | "parent_invalid" | "children_conflict" | "metric_long";
/** Checks a level and a parent before saving. A goal that already has parts cannot move to a level that would not fit them. */
export function validatePlace(recs: readonly TMRecord[], p: { kind: GoalKind; parentId: string | null; selfId?: string | null }): PlaceError | null {
  if (p.kind !== "goal") {
    if (!p.parentId) return "parent_required";
    if (!eligibleParents(recs, p.kind, p.selfId ?? null).some((x) => x.id === p.parentId)) return "parent_invalid";
  }
  if (p.selfId) { const n = nodeById(buildTree(recs), p.selfId); if (n && n.children.some((c) => !canBeChild(c.kind, p.kind))) return "children_conflict"; }
  return null;
}
export function validateGoalText(p: { title: string; metric: string }): PlaceError | null {
  if (!p.title.trim()) return "title_required";
  if (p.title.trim().length > 120) return "title_long";
  if (p.metric.trim().length > 80) return "metric_long";
  return null;
}

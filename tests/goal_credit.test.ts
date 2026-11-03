// Multi-goal step 4: full credit to every linked goal, the one overall percent counts each step once, branch roll-up uses a set union.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { goalProgress, linkStats } from "../src/core/goalPlan";
import { buildTree, nodeById } from "../src/core/goalTree";
import { overallProgress } from "../src/core/overallProgress";
import { goalStepCount } from "../src/core/homeCounts";
import { universeData } from "../src/core/goalUniverse";
import { taskBoard } from "../src/core/boards";
import { planDoc } from "../src/core/printDoc";
import { withGoals } from "../src/core/taskGoals";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" } as FieldValue);
const base = (id: string, entity: string, vals: Record<string, FieldValue>, over: Partial<TMRecord> = {}): TMRecord => ({ id, entity, ns: "demo", ownerId: "u", schemaVersion: 2, createdAt: "2026-11-01T00:00:00Z", values: vals, ...over });
const goal = (id: string, parent?: string, kind = "goal", area?: string) => base(id, "goal", { "goal.title": v(id), ...(kind !== "goal" ? { "goal.kind": v(kind) } : {}), ...(area ? { "goal.area": v(area) } : {}) }, parent ? { links: { parent } } : {});
const step = (id: string, goals: string[], done = false, extra: Record<string, FieldValue> = {}) => withGoals(base(id, "task", { "task.title": v(id), ...(done ? { "task.done_on": v("2026-11-02") } : {}), ...extra }), goals);
const pct = (recs: TMRecord[], id: string) => goalProgress(recs).find((g) => g.id === id)!.percent;

const worked = [goal("A"), goal("B"), goal("C"), step("t1", ["A"], true), step("t2", ["A", "B"], true), step("t3", ["B"]), step("t4", ["A", "B", "C"]), step("t5", ["C"], true), step("t6", [])];

describe("the worked example from the ruling, number for number", () => {
  it("A 67, B 33, C 50; overall 3 of 6 = 50; fact line 6 steps, 2 shared, 1 not linked", () => {
    expect([pct(worked, "A"), pct(worked, "B"), pct(worked, "C")]).toEqual([67, 33, 50]);
    expect(overallProgress(worked)).toMatchObject({ percent: 50, done: 3, total: 6 });
    expect(linkStats(worked)).toEqual({ steps: 6, shared: 2, unlinked: 1 });
  });
  it("finishing t4 moves three goals at once and the overall once: A 100, B 67, C 100, overall 4 of 6 = 67", () => {
    const after = worked.map((r) => (r.id === "t4" ? withGoals({ ...r, values: { ...r.values, "task.done_on": v("2026-11-03") } }, ["A", "B", "C"]) : r));
    expect([pct(after, "A"), pct(after, "B"), pct(after, "C")]).toEqual([100, 67, 100]); expect(overallProgress(after)).toMatchObject({ percent: 67, done: 4, total: 6 });
  });
});

describe("overall never changes with links", () => {
  it("random links added, removed and shared never change the overall percent, in equal and size mode", () => {
    let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
    const goals = ["A", "B", "C", "D"].map((g) => goal(g));
    const plain = Array.from({ length: 12 }, (_, i) => base(`s${i}`, "task", { "task.title": v(`s${i}`), ...(i % 3 === 0 ? { "task.done_on": v("2026-11-02") } : {}), ...(i % 2 ? { "task.minutes": v(10 + i) } : {}) }));
    const eq = overallProgress([...goals, ...plain], "equal"), sz = overallProgress([...goals, ...plain], "size");
    for (let round = 0; round < 25; round++) {
      const linked = plain.map((t) => withGoals(t, ["A", "B", "C", "D"].filter(() => rnd() < 0.5)));
      expect(overallProgress([...goals, ...linked], "equal")).toEqual(eq); expect(overallProgress([...goals, ...linked], "size")).toEqual(sz);
    }
  });
});

describe("goal percent rules", () => {
  it("a step marked no longer true leaves every goal's count (the same rule as the overall); a goal with no step is unknown, not 0", () => {
    const recs = [goal("A"), goal("B"), step("t1", ["A", "B"], true), step("t2", ["A", "B"], false, { "task.not_true_on": v("2026-11-02") })];
    expect(goalProgress(recs).map((g) => [g.id, g.done, g.total])).toEqual([["A", 1, 1], ["B", 1, 1]]);
    expect(pct([goal("Z")], "Z")).toBeNull();
  });
  it("an old step with only links.goal still counts for that goal", () => {
    const old = base("o", "task", { "task.title": v("o") }, { links: { goal: "A" } }); expect(goalProgress([goal("A"), old])[0]).toMatchObject({ total: 1, done: 0 });
  });
  it("a dangling id is ignored by the maths", () => { expect(goalProgress([goal("A"), step("t", ["A", "gone"], true)])[0]).toMatchObject({ done: 1, total: 1 }); expect(linkStats([goal("A"), step("t", ["gone"])])).toEqual({ steps: 1, shared: 0, unlinked: 1 }); });
});

describe("branch roll-up is a set union", () => {
  const tree = [goal("R"), goal("S1", "R", "subgoal"), goal("S2", "R", "subgoal"), goal("P", "S1", "project"),
    step("x", ["S1", "S2"], true), step("y", ["P", "S1", "R"]), step("z", ["P"], true)];
  it("a step on two sub-goals counts once in the root; a step on a project and its parents counts once", () => {
    const roots = buildTree(tree); const r = nodeById(roots, "R")!;
    expect(r.branch).toMatchObject({ done: 2, total: 3, percent: 67 }); expect(r.stepIds.sort()).toEqual(["x", "y", "z"]);
    expect(nodeById(roots, "S1")!.branch).toMatchObject({ done: 2, total: 3 }); expect(nodeById(roots, "S2")!.branch).toMatchObject({ done: 1, total: 1 }); expect(nodeById(roots, "P")!.branch).toMatchObject({ done: 1, total: 2 });
  });
  it("unshared data gives the old numbers", () => {
    const plain = [goal("R"), goal("S", "R", "subgoal"), step("a", ["R"], true), step("b", ["S"])]; const r = nodeById(buildTree(plain), "R")!;
    expect(r.own).toEqual({ done: 1, total: 1 }); expect(r.branch).toMatchObject({ done: 1, total: 2, percent: 50 });
  });
});

describe("other readers dedupe by step", () => {
  it("home goal-step count counts a shared step once", () => { expect(goalStepCount([goal("A"), goal("B"), step("t", ["A", "B"], true)])).toEqual({ state: "value", done: 1, total: 1 }); });
  it("universe area totals count a step shared by two goals of one area once", () => {
    const u = universeData([goal("A", undefined, "goal", "business"), goal("B", undefined, "goal", "business"), step("t", ["A", "B"], true), step("u", ["B"])]);
    const biz = u.nodes.find((n) => n.area === "business")!; expect(biz).toMatchObject({ goals: 2, tasks: 2, done: 1 });
  });
  it("the task board lists every goal a step serves; the plan document prints the step under each goal", () => {
    const recs = [goal("A"), goal("B"), step("t", ["B", "A"])];
    expect(taskBoard(recs).columns.open[0]!.goals.map((g) => g.id)).toEqual(["A", "B"]);
    const doc = planDoc(recs); expect(doc.find((d) => d.id === "A")!.steps.map((s) => s.id)).toEqual(["t"]); expect(doc.find((d) => d.id === "B")!.steps.map((s) => s.id)).toEqual(["t"]);
  });
});

describe("allow-list: who may read links.goal", () => {
  const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = `${d}/${f}`; return statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") ? [p] : []; });
  it("only the list helpers, the migration, notes, knowledge and onboarding read it (steps go through goalIdsOf)", () => {
    const allowed = new Set(["src/core/taskGoals.ts", "src/core/migrate.ts", "src/core/knowledge.ts", "src/ui/notesUi.ts", "src/ui/onboardUi.ts", "src/core/realityLoop.ts", "src/schema/entities.ts"]);
    const bad = walk("src").filter((f) => !allowed.has(f) && /links\??\.goal\b/.test(readFileSync(f, "utf8")));
    expect(bad).toEqual([]);
  });
});

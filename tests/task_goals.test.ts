// Multi-goal step 3: the one reader and the one writer for the goal list, the mirror, and the delete-goal preview.
import { describe, expect, it } from "vitest";
import { MAX_GOALS, applyGoalRemoval, danglingGoalIdsOf, goalIdsOf, liveGoalIdsOf, previewGoalRemoval, validateLinks, withGoals } from "../src/core/taskGoals";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" } as FieldValue);
const rec = (id: string, entity: string, over: Partial<TMRecord> = {}, vals: Record<string, FieldValue> = {}): TMRecord => ({ id, entity, ns: "demo", ownerId: "u", schemaVersion: 2, createdAt: "2026-11-01T00:00:00Z", values: { ...vals }, ...over });
const task = (id: string, goals?: string[], link?: string) => rec(id, "task", link ? { links: { goal: link } } : {}, goals ? { "task.goals": v(goals) } : {});
const goal = (id: string, parent?: string, ns: "demo" | "real" = "demo") => rec(id, "goal", { ns, ...(parent ? { links: { parent } } : {}) }, { "goal.title": v(id) });

describe("reader", () => {
  it("task.goals wins when it holds a list; the old link is the fallback; neither means none", () => {
    expect(goalIdsOf(task("t", ["A", "B"], "Z"))).toEqual(["A", "B"]);
    expect(goalIdsOf(task("t", undefined, "A"))).toEqual(["A"]);
    expect(goalIdsOf(task("t"))).toEqual([]);
    expect(goalIdsOf({ ...task("t", undefined, "A"), values: { "task.goals": { state: "unknown" } } })).toEqual(["A"]); // unknown list falls back, never invents
    expect(goalIdsOf(task("t", ["A", "A", "B", ""]))).toEqual(["A", "B"]);
    expect(goalIdsOf(rec("h", "habit", {}, { "habit.goals": v(["A"]) }))).toEqual(["A"]);
    expect(goalIdsOf(rec("g", "goal"))).toEqual([]);
  });
  it("live and dangling ids split by whether the goal exists", () => {
    const t = task("t", ["A", "X"]); const live = new Set(["A", "B"]);
    expect(liveGoalIdsOf(t, live)).toEqual(["A"]); expect(danglingGoalIdsOf(t, live)).toEqual(["X"]);
  });
});

describe("writer and mirror", () => {
  it("sets the list and mirrors links.goal to the first item; keeps other links", () => {
    const t = withGoals(rec("t", "task", { links: { role: "r1", goal: "old" } }), ["B", "A"]);
    expect(t.values["task.goals"]).toEqual({ state: "value", value: ["B", "A"], label: "DEMO" }); expect(t.links).toEqual({ role: "r1", goal: "B" });
  });
  it("an empty list is unknown (not none) and removes the mirror, keeping other links; no links at all removes the key", () => {
    const t = withGoals(rec("t", "task", { links: { role: "r1", goal: "A" } }), []); expect(t.values["task.goals"]).toEqual({ state: "unknown" }); expect(t.links).toEqual({ role: "r1" });
    expect(withGoals(task("t", ["A"], "A"), []).links).toBeUndefined();
  });
  it("dedupes, caps at 5, uses FACT for real, and leaves habits without a mirror; other entities are returned as they are", () => {
    expect((withGoals(task("t"), ["a", "b", "c", "d", "e", "f", "a"]).values["task.goals"] as { value: string[] }).value).toEqual(["a", "b", "c", "d", "e"]); expect(MAX_GOALS).toBe(5);
    expect(withGoals({ ...task("t"), ns: "real" }, ["a"]).values["task.goals"]).toMatchObject({ label: "FACT" });
    const h = withGoals(rec("h", "habit"), ["A"]); expect(h.values["habit.goals"]).toMatchObject({ value: ["A"] }); expect(h.links).toBeUndefined();
    const g = goal("g"); expect(withGoals(g, ["A"])).toBe(g);
  });
  it("if an older build changed only links.goal, the list still wins and the next save rewrites the mirror", () => {
    const drift = task("t", ["A", "B"], "Z"); expect(goalIdsOf(drift)).toEqual(["A", "B"]); expect(withGoals(drift, goalIdsOf(drift)).links).toEqual({ goal: "A" });
  });
});

describe("validation", () => {
  it("more than 5 is refused; a goal of the other namespace cannot be newly added; a missing goal is not an error", () => {
    const recs = [goal("A"), goal("R", undefined, "real")]; const t = task("t");
    expect(validateLinks(recs, t, ["a", "b", "c", "d", "e", "f"])).toBe("goals_max"); expect(validateLinks(recs, t, ["A"])).toBeNull();
    expect(validateLinks(recs, t, ["R"])).toBe("goal_other_namespace"); expect(validateLinks(recs, t, ["gone"])).toBeNull();
    expect(validateLinks(recs, { ...t, values: { "task.goals": v(["R"]) } }, ["R"])).toBeNull(); // already there: not a new pick
  });
});

describe("deleting a goal", () => {
  const recs = [goal("A"), goal("B"), goal("A1", "A"), task("t1", ["A"]), task("t2", ["A", "B"]), task("t3", ["A", "gone"]), task("t4", ["B"]), rec("h1", "habit", {}, { "habit.goals": v(["A"]) })];
  it("the preview counts steps, steps that keep another goal, steps left with none, habits and parts that move up", () => {
    expect(previewGoalRemoval(recs, "A")).toEqual({ steps: 3, keepOther: 1, unlinked: 2, habits: 1, partsMoveUp: 1 });
    expect(previewGoalRemoval(recs, "B")).toEqual({ steps: 2, keepOther: 1, unlinked: 1, habits: 0, partsMoveUp: 0 });
  });
  it("applying removes only that id, deletes nothing, keeps other (even dangling) ids, and matches the preview", () => {
    const out = applyGoalRemoval(recs, "A"); expect(out.map((r) => r.id).sort()).toEqual(["h1", "t1", "t2", "t3"]);
    const by = Object.fromEntries(out.map((r) => [r.id, r])); expect(goalIdsOf(by.t2!)).toEqual(["B"]); expect(goalIdsOf(by.t3!)).toEqual(["gone"]); expect(goalIdsOf(by.t1!)).toEqual([]); expect(by.t1!.values["task.goals"]).toEqual({ state: "unknown" });
    expect(goalIdsOf(by.h1!)).toEqual([]); expect(by.t2!.links).toEqual({ goal: "B" });
    const unlinked = out.filter((r) => r.entity === "task" && goalIdsOf(r).filter((x) => x !== "gone").length === 0).length; expect(unlinked).toBe(previewGoalRemoval(recs, "A").unlinked);
  });
});

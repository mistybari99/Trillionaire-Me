// Multi-goal steps 8 and 9: deleting a goal never deletes a step; the preview equals the result; dangling ids stay visible; plan snapshot v2.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { store } from "../src/ui/state";
import { goalIdsOf, previewGoalRemoval, withGoals } from "../src/core/taskGoals";
import { impactOf, optionsFor, parseSnapshot, planChange, planDiff, snapshotOf, versionRows } from "../src/core/realityLoop";
import { recordsAfterGoalDelete } from "../src/ui/goalDelete";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" } as FieldValue);
const rec = (id: string, entity: string, vals: Record<string, unknown>, over: Partial<TMRecord> = {}): TMRecord => ({ id, entity, ns: "demo", ownerId: "demo-user", schemaVersion: 2, createdAt: "2026-11-01T00:00:00Z", values: Object.fromEntries(Object.entries(vals).map(([k, x]) => [k, v(x)])), ...over });
const goal = (id: string, title: string, over: Partial<TMRecord> = {}) => rec(id, "goal", { "goal.title": title }, over);
const step = (id: string, goals: string[], extra: Record<string, unknown> = {}) => withGoals(rec(id, "task", { "task.title": `Step ${id}`, "task.priority": "normal", ...extra }), goals);
const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const go = (h: string) => { location.hash = h; render(); };
const seed = () => { for (const r of [goal("a", "Shop"), goal("b", "Learn"), goal("a1", "Stock", { links: { parent: "a" } }), step("t1", ["a"]), step("t2", ["a", "b"]), step("t3", ["b"]), step("t4", ["a", "gone"])]) store.demo.put(r); };

beforeEach(() => {
  localStorage.clear(); store.demo.clear(); store.real.clear();
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
});

describe("delete a goal (step 8)", () => {
  it("the page shows a preview in numbers first; nothing changes until the confirm", () => {
    seed(); go("#/journey/goal/a"); const pv = previewGoalRemoval(store.demo.list(), "a");
    expect(q("[data-del-panel]").hasAttribute("hidden")).toBe(true); q<HTMLButtonElement>("[data-act=goal-delete-open]").click(); expect(q("[data-del-panel]").hasAttribute("hidden")).toBe(false);
    expect(q("[data-del-preview]").textContent).toBe(`${pv.steps} steps lose this goal · ${pv.keepOther} keep another goal · ${pv.unlinked} become not linked · ${pv.partsMoveUp} parts move up`);
    expect(pv).toMatchObject({ steps: 3, keepOther: 1, unlinked: 2, partsMoveUp: 1 }); expect(store.demo.get("a")).not.toBeNull();
    q<HTMLButtonElement>("[data-act=goal-delete-cancel]").click(); expect(store.demo.get("a")).not.toBeNull();
  });
  it("confirm removes only the goal: every step stays, the id leaves every list, a part becomes an orphan, a plan version and a log line are written", () => {
    seed(); const stepsBefore = store.demo.list().filter((r) => r.entity === "task").length; go("#/journey/goal/a"); q<HTMLButtonElement>("[data-act=goal-delete-open]").click(); q<HTMLButtonElement>("[data-act=goal-delete-confirm]").click();
    expect(store.demo.get("a")).toBeNull(); expect(store.demo.list().filter((r) => r.entity === "task").length).toBe(stepsBefore);
    expect(goalIdsOf(store.demo.get("t1")!)).toEqual([]); expect(goalIdsOf(store.demo.get("t2")!)).toEqual(["b"]); expect(goalIdsOf(store.demo.get("t4")!)).toEqual(["gone"]); // other dangling ids are not touched
    expect(store.demo.get("t1")!.values["task.goals"]).toEqual({ state: "unknown" }); expect(store.demo.get("t2")!.links).toEqual({ goal: "b" });
    expect(store.demo.get("a1")).not.toBeNull(); expect(location.hash).toBe("#/journey/goals");
    const ver = versionRows(store.demo.list())[0]!; expect(ver.option).toBe("goal_delete"); expect(ver.diff!.some((d) => d.kind === "goal" && d.id === "a")).toBe(true);
    expect(store.demo.list().some((r) => r.entity === "journey_log" && JSON.stringify(r.values).includes("Goal deleted: Shop"))).toBe(true);
  });
  it("recordsAfterGoalDelete is the same rule as the preview", () => {
    seed(); const recs = store.demo.list(); const after = recordsAfterGoalDelete(recs, "a"); expect(after.some((r) => r.id === "a")).toBe(false);
    const live = new Set(after.filter((r) => r.entity === "goal").map((r) => r.id)); expect(after.filter((r) => r.entity === "task" && goalIdsOf(r).filter((x) => live.has(x)).length === 0).length).toBe(previewGoalRemoval(recs, "a").unlinked);
  });
  it("a dangling id (partial restore) is kept, shown in words, and removable with one tap", () => {
    seed(); go("#/diary/plan"); const d = q("[data-dangling=t4]"); expect(d.textContent).toContain("a goal that was removed");
    expect(goalIdsOf(store.demo.get("t4")!)).toEqual(["a", "gone"]); q<HTMLButtonElement>("[data-dangling=t4] [data-act=remove-dangling]").click();
    expect(goalIdsOf(store.demo.get("t4")!)).toEqual(["a"]); render(); expect(app().querySelector("[data-dangling=t4]")).toBeNull();
  });
  it("Bangla confirm text exists", () => { seed(); localStorage.setItem("tm:ui:lang", "bn"); go("#/journey/goal/a"); expect(q("[data-goal-delete]").textContent).toContain("এই লক্ষ্য ডিলিট করুন"); });
});

describe("plan snapshot v2 (step 9)", () => {
  const recs = [goal("a", "Shop"), goal("b", "Learn"), step("t1", ["a"]), step("t2", ["a", "b"])];
  it("a new snapshot is version 2 with the goals of each step, and round-trips", () => {
    const s = snapshotOf(recs, "normal"); expect(s.v).toBe(2); expect(s.tasks.find((t) => t.id === "t2")!.goalIds).toEqual(["a", "b"]);
    expect(parseSnapshot(JSON.stringify(s))).toEqual(s);
  });
  it("version 1 snapshots still read, with goals unknown; a v1 side never makes a 'link removed' row", () => {
    const v1 = JSON.stringify({ v: 1, mode: "normal", goals: [{ id: "a", title: "Shop", status: "active", date: null }], tasks: [{ id: "t2", title: "Step t2", state: "open" }] });
    const old = parseSnapshot(v1)!; expect(old.v).toBe(1); expect(old.tasks[0]!.goalIds).toBeUndefined();
    expect(planDiff(old, snapshotOf(recs, "normal")).filter((r) => r.field === "link")).toEqual([]);
  });
  it("two v2 snapshots with different links give a link row naming goals; equal links give none", () => {
    const a = snapshotOf(recs, "normal"), b = snapshotOf([goal("a", "Shop"), goal("b", "Learn"), step("t1", ["a"]), step("t2", ["a"])], "normal");
    expect(planDiff(a, b).filter((r) => r.field === "link").map((r) => [r.id, r.from, r.to])).toEqual([["t2", "a,b", "a"]]); expect(planDiff(a, a)).toEqual([]);
  });
  it("impact scoped to goal B finds a step that also helps B and names the other goal; reduce-scope still adds no step", () => {
    const imp = impactOf(recs, { kind: "time_less", goalId: "b" }); expect(imp.tasks.map((t) => t.id)).toEqual(["t2"]); expect(imp.alsoHelps).toEqual([{ id: "a", title: "Shop" }]);
    const opts = optionsFor(imp, "normal"); expect(opts.length).toBeLessThanOrEqual(3);
    const ch = planChange(recs, imp, "reduce_scope", { today: "2026-11-03", days: 7, mode: "normal" }); expect(ch.puts.every((r) => recs.some((x) => x.id === r.id))).toBe(true);
  });
  it("the impact text on screen names the other goals", () => {
    for (const r of recs) store.demo.put(r); go("#/journey/reality"); expect(app().textContent).not.toContain("undefined");
  });
});

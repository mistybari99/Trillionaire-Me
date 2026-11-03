// Multi-goal step 7: "Where does this go?" shows the same numbers the screens show, and nothing else.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { store } from "../src/ui/state";
import { taskTrace } from "../src/core/taskTrace";
import { goalProgress } from "../src/core/goalPlan";
import { overallProgress } from "../src/core/overallProgress";
import { withGoals } from "../src/core/taskGoals";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" } as FieldValue);
const rec = (id: string, entity: string, vals: Record<string, unknown>, over: Partial<TMRecord> = {}): TMRecord => ({ id, entity, ns: "demo", ownerId: "demo-user", schemaVersion: 2, createdAt: "2026-11-01T00:00:00Z", values: Object.fromEntries(Object.entries(vals).map(([k, x]) => [k, v(x)])), ...over });
const goal = (id: string, title: string, extra: Record<string, unknown> = {}, over: Partial<TMRecord> = {}) => rec(id, "goal", { "goal.title": title, ...extra }, over);
const step = (id: string, goals: string[], done = false, extra: Record<string, unknown> = {}) => withGoals(rec(id, "task", { "task.title": `Step ${id}`, ...(done ? { "task.done_on": "2026-11-02" } : {}), ...extra }), goals);
const base = [goal("a", "Shop"), goal("b", "Learn"), goal("s", "Stock", { "goal.kind": "subgoal" }, { links: { parent: "a" } }), step("x1", ["a"], true), step("x2", ["a"]), step("y1", ["b"], true), step("t", ["s", "b"]), step("u", [])];

describe("taskTrace", () => {
  it("paths, and the numbers before and after, equal the real result after marking the step done", () => {
    const tr = taskTrace(base, "t")!; expect(tr.goals.map((g) => g.path.join(" > "))).toEqual(["Learn", "Shop > Stock"]);
    const after = base.map((r) => (r.id === "t" ? { ...r, values: { ...r.values, "task.done_on": v("2026-11-03") } } : r));
    const real = Object.fromEntries(goalProgress(after).map((g) => [g.id, g])); const was = Object.fromEntries(goalProgress(base).map((g) => [g.id, g]));
    for (const g of tr.goals) { expect(g.done).toBe(was[g.id]!.done); expect(g.total).toBe(was[g.id]!.total); expect(g.doneAfter).toBe(real[g.id]!.done); expect(g.percentAfter).toBe(real[g.id]!.percent); }
    expect(tr.overall).toEqual({ done: overallProgress(base).done, total: overallProgress(base).total, doneAfter: overallProgress(after).done });
  });
  it("a done step, an unlinked step, a no-longer-true step and a manual goal are told plainly; a missing step gives null", () => {
    expect(taskTrace(base, "x1")).toMatchObject({ alreadyDone: true, goals: [{ done: 1, doneAfter: 1 }] });
    expect(taskTrace(base, "u")).toMatchObject({ goals: [], counted: true });
    expect(taskTrace([...base, step("n", ["a"], false, { "task.not_true_on": "2026-11-01" })], "n")).toMatchObject({ counted: false, overall: null });
    const manual = [goal("m", "Typed", { "goal.progress_mode": "manual", "goal.manual_percent": 40 }), step("k", ["m"])]; expect(taskTrace(manual, "k")!.goals[0]).toMatchObject({ manual: true, percentNow: 40, percentAfter: 40 });
    expect(taskTrace(base, "nope")).toBeNull();
  });
});

describe("in the edit sheet", () => {
  const app = () => document.getElementById("app")!;
  beforeEach(() => { localStorage.clear(); store.demo.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); for (const r of base) store.demo.put(r); });
  it("shows the path and the change for every goal, the overall counted once, and no advice words", () => {
    location.hash = "#/diary/plan"; render(); const sec = app().querySelector('[data-where-goes="t"]')!;
    expect(sec.querySelector("[data-where-goal=b]")!.textContent).toBe("Learn: 1 of 1 steps becomes 2 of 2 steps.".replace("1 of 1 steps becomes 2 of 2", "1 of 2 steps becomes 2 of 2"));
    expect(sec.querySelector("[data-where-goal=s]")!.textContent).toBe("Shop > Stock: 0 of 1 steps becomes 1 of 1 steps.");
    expect(sec.querySelector("[data-where-overall]")!.textContent).toBe("Overall: 2 of 5 steps becomes 3 of 5, counted once.");
    expect(sec.textContent).not.toMatch(/should|better|behind|ahead|best/i);
    expect(app().querySelector('[data-where-goes="u"] [data-where-none]')).not.toBeNull();
  });
  it("Bangla has the section", () => { localStorage.setItem("tm:ui:lang", "bn"); location.hash = "#/diary/plan"; render(); expect(app().querySelector('[data-where-goes="t"]')!.textContent).toContain("এটি কোথায় যায়?"); });
});

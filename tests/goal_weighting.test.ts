// Per-goal weighting (owner rule, 3 Nov 2026): equal or by size, chosen when a goal is made. The overall percent counts each step once and does not follow it.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { prefs, store } from "../src/ui/state";
import { goalProgress } from "../src/core/goalPlan";
import { buildTree, nodeById } from "../src/core/goalTree";
import { goalWeighting, overallProgress } from "../src/core/overallProgress";
import { withGoals } from "../src/core/taskGoals";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" } as FieldValue);
const rec = (id: string, entity: string, vals: Record<string, unknown>, over: Partial<TMRecord> = {}): TMRecord => ({ id, entity, ns: "demo", ownerId: "demo-user", schemaVersion: 2, createdAt: "2026-11-01T00:00:00Z", values: Object.fromEntries(Object.entries(vals).map(([k, x]) => [k, v(x)])), ...over });
const goal = (id: string, w?: "equal" | "size", extra: Record<string, unknown> = {}, over: Partial<TMRecord> = {}) => rec(id, "goal", { "goal.title": id, ...(w ? { "goal.weighting": w } : {}), ...extra }, over);
const step = (id: string, goals: string[], minutes: number | null, done: boolean) => withGoals(rec(id, "task", { "task.title": id, ...(minutes ? { "task.minutes": minutes } : {}), ...(done ? { "task.done_on": "2026-11-02" } : {}) }), goals);
const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const go = (h: string) => { location.hash = h; render(); };

// one 10-minute step done, one 90-minute step open
const steps = [step("s", ["A", "B"], 10, true), step("l", ["A", "B"], 90, false)];

describe("maths", () => {
  it("equal keeps today's count figure; size weighs by minutes; the count 5-of-8 style stays a count", () => {
    const [a, b] = goalProgress([goal("A", "equal"), goal("B", "size"), ...steps]);
    expect(a).toMatchObject({ percent: 50, done: 1, total: 2, weighting: "equal" }); expect(b).toMatchObject({ percent: 10, done: 1, total: 2, weighting: "size" });
  });
  it("a goal without the field behaves exactly as before (equal)", () => { expect(goalWeighting(goal("A"))).toBe("equal"); expect(goalProgress([goal("A"), ...steps])[0]).toMatchObject({ percent: 50 }); });
  it("a step with no entered size takes the average of the others (never zero); no step is unknown", () => {
    const g = [goal("A", "size"), step("a", ["A"], 20, true), step("b", ["A"], null, false)]; expect(goalProgress(g)[0]!.percent).toBe(50); // b weighs 20
    expect(goalProgress([goal("A", "size")])[0]!.percent).toBeNull();
  });
  it("the overall percent is the same whatever the goals choose (each step once, device mode decides)", () => {
    const eq = [goal("A", "equal"), goal("B", "equal"), ...steps], sz = [goal("A", "size"), goal("B", "size"), ...steps], mix = [goal("A", "size"), goal("B", "equal"), ...steps];
    for (const mode of ["equal", "size"] as const) { expect(overallProgress(sz, mode)).toEqual(overallProgress(eq, mode)); expect(overallProgress(mix, mode)).toEqual(overallProgress(eq, mode)); }
    expect(overallProgress(eq, "equal")).toMatchObject({ percent: 50, done: 1, total: 2 }); expect(overallProgress(eq, "size")).toMatchObject({ percent: 10 });
  });
  it("a branch uses its own goal's weighting over the union of steps", () => {
    const recs = [goal("R", "size"), goal("S", "equal", { "goal.kind": "subgoal" }, { links: { parent: "R" } }), step("s", ["S"], 10, true), step("l", ["R"], 90, false)];
    const t = buildTree(recs); expect(nodeById(t, "R")!.branch).toMatchObject({ done: 1, total: 2, percent: 10 }); expect(nodeById(t, "S")!.branch.percent).toBe(100);
  });
});

describe("on screen", () => {
  beforeEach(() => {
    localStorage.clear(); store.demo.clear(); store.real.clear();
    document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
  });
  const submitNew = (title: string) => { (q("#gn-title") as HTMLInputElement).value = title; q<HTMLFormElement>("form[data-form=goal-new]").dispatchEvent(new Event("submit", { cancelable: true, bubbles: true })); };
  it("the new-goal form starts on the device setting and saves the choice with the goal", () => {
    go("#/journey/goals"); expect((q("#gn-weight") as HTMLSelectElement).value).toBe("equal"); submitNew("Shop");
    prefs.progressMode = "size"; go("#/journey/goals"); expect((q("#gn-weight") as HTMLSelectElement).value).toBe("size"); submitNew("Learn");
    const goals = store.demo.list().filter((r) => r.entity === "goal"); expect(goals.map((g) => goalWeighting(g)).sort()).toEqual(["equal", "size"]);
    expect(goals.every((g) => g.values["goal.weighting"]?.state === "value")).toBe(true);
  });
  it("the goal page can change it for an existing goal, and the overall percent does not move", () => {
    store.demo.put(goal("A")); for (const s of steps) store.demo.put({ ...s, links: { goal: "A" }, values: { ...s.values, "task.goals": v(["A"]) } });
    go("#/journey/goals"); const before = q("[data-overall=journey]").getAttribute("data-percent");
    go("#/journey/goal/A"); expect(q("[data-goal-progress]").getAttribute("data-goal-progress")).toBe("50"); q<HTMLButtonElement>("[data-goal-weight=size]").click();
    expect(goalWeighting(store.demo.get("A")!)).toBe("size"); render(); expect(q("[data-goal-progress]").getAttribute("data-goal-progress")).toBe("10");
    go("#/journey/goals"); expect(q("[data-overall=journey]").getAttribute("data-percent")).toBe(before);
    expect(app().textContent).not.toContain("undefined");
  });
  it("Bangla note exists", () => { localStorage.setItem("tm:ui:lang", "bn"); store.demo.put(goal("A")); go("#/journey/goal/A"); expect(q("[data-goal-weighting]").textContent).toContain("মোট শতাংশ আলাদা"); });
});

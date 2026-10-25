// M06 dependency: "do this after" places a task later in the week than its prerequisite. Pure planner rules.
import { beforeEach, describe, expect, it } from "vitest";
import { schedule, type PlanInput } from "../src/core/planner";
import { render } from "../src/app";
import { store } from "../src/ui/state";

const base = (over: Partial<PlanInput>): PlanInput => ({ weeklyFreeMinutes: 600, blocked: [], tasks: [], mode: "normal", startDay: 0, ...over });
const abs = (p: { day: number; start: number }) => p.day * 1440 + p.start;

describe("dependency: a task waits for its prerequisite", () => {
  it("the dependent is placed after the prerequisite ends, even when it has higher priority", () => {
    const p = schedule(base({ tasks: [{ id: "a", minutes: 60, priority: 1 }, { id: "b", minutes: 30, priority: 3, after: "a" }] }));
    const a = p.placements.find((x) => x.taskId === "a")!, b = p.placements.find((x) => x.taskId === "b")!;
    expect(a).toBeDefined(); expect(b).toBeDefined();
    expect(abs(b)).toBeGreaterThanOrEqual(a.day * 1440 + a.end);
  });
  it("when the day is full before the prerequisite, the dependent goes to a later day", () => {
    const blocked = [{ day: 0, start: 6 * 60, end: 21 * 60 }];
    const p = schedule(base({ blocked, tasks: [{ id: "a", minutes: 60, priority: 2 }, { id: "b", minutes: 30, priority: 2, after: "a" }] }));
    const a = p.placements.find((x) => x.taskId === "a")!, b = p.placements.find((x) => x.taskId === "b")!;
    expect(a.day).toBe(0); expect(a.start).toBe(21 * 60);
    expect(b.day).toBe(1); expect(b.start).toBe(6 * 60);
  });
  it("a prerequisite that needs an estimate leaves the dependent waiting (no guessed time)", () => {
    const p = schedule(base({ tasks: [{ id: "a", minutes: null, priority: 2 }, { id: "b", minutes: 30, priority: 2, after: "a" }] }));
    expect(p.placements).toEqual([]);
    expect(p.deferred).toEqual(expect.arrayContaining([{ taskId: "a", reason: "needs_estimate" }, { taskId: "b", reason: "waiting_for_prerequisite" }]));
  });
  it("a prerequisite with no room leaves the dependent waiting", () => {
    const p = schedule(base({ weeklyFreeMinutes: 30, tasks: [{ id: "a", minutes: 60, priority: 2 }, { id: "b", minutes: 20, priority: 3, after: "a" }] }));
    expect(p.deferred.find((d) => d.taskId === "a")!.reason).toBe("no_room");
    expect(p.deferred.find((d) => d.taskId === "b")!.reason).toBe("waiting_for_prerequisite");
  });
  it("a cycle places nothing and does not loop forever", () => {
    const p = schedule(base({ tasks: [{ id: "a", minutes: 30, priority: 2, after: "b" }, { id: "b", minutes: 30, priority: 2, after: "a" }] }));
    expect(p.placements).toEqual([]);
    expect(p.deferred.map((d) => d.taskId).sort()).toEqual(["a", "b"]);
  });
  it("a missing prerequisite id is ignored (the task is planned normally)", () => {
    const p = schedule(base({ tasks: [{ id: "b", minutes: 30, priority: 2, after: "gone" }] }));
    expect(p.placements.map((x) => x.taskId)).toEqual(["b"]);
  });
  it("same input gives the same plan (deterministic)", () => {
    const input = base({ tasks: [{ id: "a", minutes: 45, priority: 1 }, { id: "b", minutes: 30, priority: 3, after: "a" }, { id: "c", minutes: 20, priority: 2 }] });
    expect(schedule(input)).toEqual(schedule(input));
  });
  it("tasks without a dependency are placed exactly as before", () => {
    const p = schedule(base({ tasks: [{ id: "x", minutes: 60, priority: 2 }, { id: "y", minutes: 30, priority: 2 }] }));
    expect(p.placements).toEqual([
      { taskId: "x", day: 0, start: 360, end: 420 },
      { taskId: "y", day: 0, start: 420, end: 450 },
    ]);
  });
});

describe("dependency on the Plan screen", () => {
  beforeEach(() => { localStorage.clear(); store.demo.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); });
  it("saving a task with 'do this after' stores the link and shows it on the row", () => {
    location.hash = "#/diary/plan"; render();
    const setv = (id: string, v: string) => { (document.getElementById(id) as HTMLInputElement | HTMLSelectElement).value = v; };
    setv("pt-title", "Buy stock"); setv("pt-min", "30");
    document.querySelector<HTMLFormElement>("form[data-form=task]")!.dispatchEvent(new Event("submit", { cancelable: true }));
    const first = store.demo.list().find((r) => r.entity === "task")!;
    location.hash = "#/diary/plan"; render();
    setv("pt-title", "Sell stock"); setv("pt-min", "20"); setv("pt-after", first.id);
    document.querySelector<HTMLFormElement>("form[data-form=task]")!.dispatchEvent(new Event("submit", { cancelable: true }));
    const second = store.demo.list().filter((r) => r.entity === "task").find((r) => r.id !== first.id)!;
    expect(second.links).toEqual({ after: first.id });
    render();
    expect(document.querySelector(`[data-after="${first.id}"]`)!.textContent).toMatch(/After: Buy stock/);
  });
});

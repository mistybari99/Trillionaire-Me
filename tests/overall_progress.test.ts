// Overall progress (pure core): empty, all done, add lowers, size weights, manual, trend, memory.
import { describe, expect, it } from "vitest";
import { goalProgressMode, manualPercent, nextProgressMemory, overallProgress, progressTrend } from "../src/core/overallProgress";
import { goalProgress } from "../src/core/goalPlan";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (value: unknown): FieldValue => ({ state: "value", value, label: "DEMO" });
const task = (id: string, o: { done?: boolean; minutes?: number; size?: string; gone?: boolean; goal?: string } = {}): TMRecord => ({
  id, entity: "task", ns: "demo", ownerId: "me", schemaVersion: 1, createdAt: "2026-10-26T00:00:00.000Z",
  values: { "task.title": v(id), ...(o.done ? { "task.done_on": v("2026-10-26") } : {}), ...(o.minutes ? { "task.minutes": v(o.minutes) } : {}), ...(o.size ? { "task.size": v(o.size) } : {}), ...(o.gone ? { "task.not_true_on": v("2026-10-26") } : {}) },
  ...(o.goal ? { links: { goal: o.goal } } : {}),
});
const goal = (id: string, extra: Record<string, FieldValue> = {}): TMRecord => ({ id, entity: "goal", ns: "demo", ownerId: "me", schemaVersion: 1, createdAt: "2026-10-26T00:00:00.000Z", values: { "goal.title": v(id), ...extra } });

describe("overallProgress equal mode", () => {
  it("no tasks is Unknown (null), never 0", () => {
    expect(overallProgress([], "equal").percent).toBeNull();
    expect(overallProgress([goal("g")], "equal").percent).toBeNull();
    expect(overallProgress([task("a", { gone: true })], "equal").percent).toBeNull();
  });
  it("tasks but none done is a real 0", () => { expect(overallProgress([task("a"), task("b")]).percent).toBe(0); });
  it("all done is 100", () => { expect(overallProgress([task("a", { done: true }), task("b", { done: true })]).percent).toBe(100); });
  it("half done is 50, counts reported", () => { expect(overallProgress([task("a", { done: true }), task("b")])).toMatchObject({ percent: 50, done: 1, total: 2 }); });
  it("adding a task lowers the percent; removing it restores it", () => {
    const base = [task("a", { done: true }), task("b", { done: true })];
    expect(overallProgress(base).percent).toBe(100);
    expect(overallProgress([...base, task("c")]).percent).toBe(67);
    expect(overallProgress(base).percent).toBe(100);
  });
  it("editing a task to done raises it; a 'no longer true' task is not counted", () => {
    expect(overallProgress([task("a"), task("b")]).percent).toBe(0);
    expect(overallProgress([task("a", { done: true }), task("b")]).percent).toBe(50);
    expect(overallProgress([task("a", { done: true }), task("b", { gone: true })]).percent).toBe(100);
  });
  it("ignores minutes in equal mode", () => { expect(overallProgress([task("a", { done: true, minutes: 10 }), task("b", { minutes: 90 })], "equal").percent).toBe(50); });
});

describe("overallProgress size mode", () => {
  it("minutes weigh tasks", () => { expect(overallProgress([task("a", { done: true, minutes: 30 }), task("b", { minutes: 90 })], "size").percent).toBe(25); });
  it("S/M/L weigh tasks (15/30/60)", () => {
    expect(overallProgress([task("a", { done: true, size: "S" }), task("b", { size: "L" })], "size").percent).toBe(20);
    expect(overallProgress([task("a", { done: true, size: "L" }), task("b", { size: "S" }), task("c", { size: "M" })], "size").percent).toBe(57);
  });
  it("minutes win over size when both are entered", () => { expect(overallProgress([task("a", { done: true, minutes: 10, size: "L" }), task("b", { minutes: 10 })], "size").percent).toBe(50); });
  it("a task with no size takes the average weight, never 0; it is reported", () => {
    const r = overallProgress([task("a", { done: true, minutes: 20 }), task("b", { minutes: 60 }), task("c")], "size");
    expect(r.withoutSize).toBe(1); expect(r.percent).toBe(Math.round((20 / (20 + 60 + 40)) * 100));
  });
  it("no size anywhere behaves like equal", () => { expect(overallProgress([task("a", { done: true }), task("b")], "size").percent).toBe(50); });
  it("no tasks is still Unknown", () => { expect(overallProgress([], "size").percent).toBeNull(); });
});

describe("per-goal manual or auto", () => {
  it("default is auto; manual is read from the goal", () => {
    expect(goalProgressMode(goal("g"))).toBe("auto");
    expect(goalProgressMode(goal("g", { "goal.progress_mode": v("manual") }))).toBe("manual");
    expect(goalProgressMode(goal("g", { "goal.progress_mode": v("weird") }))).toBe("auto");
  });
  it("manual percent: whole 0..100, empty or bad is Unknown (null), 0 stays 0", () => {
    expect(manualPercent(goal("g"))).toBeNull();
    expect(manualPercent(goal("g", { "goal.manual_percent": v(40.4) }))).toBe(40);
    expect(manualPercent(goal("g", { "goal.manual_percent": v(0) }))).toBe(0);
    expect(manualPercent(goal("g", { "goal.manual_percent": v(150) }))).toBeNull();
    expect(manualPercent(goal("g", { "goal.manual_percent": { state: "unknown" } }))).toBeNull();
  });
  it("goalProgress: auto counts linked tasks, manual shows the typed percent regardless of tasks", () => {
    const recs = [goal("ga"), goal("gm", { "goal.progress_mode": v("manual"), "goal.manual_percent": v(70) }), goal("gu", { "goal.progress_mode": v("manual") }),
      task("t1", { done: true, goal: "ga" }), task("t2", { goal: "ga" }), task("t3", { goal: "gm" })];
    const by = Object.fromEntries(goalProgress(recs).map((g) => [g.id, g]));
    expect(by.ga!.percent).toBe(50); expect(by.gm).toMatchObject({ percent: 70, mode: "manual" }); expect(by.gu!.percent).toBeNull();
  });
  it("overall counts the user's tasks only, not manual percents", () => {
    const recs = [goal("gm", { "goal.progress_mode": v("manual"), "goal.manual_percent": v(90) }), task("t1", { goal: "gm" })];
    expect(overallProgress(recs).percent).toBe(0);
  });
});

describe("trend and memory", () => {
  it("trend words", () => {
    expect(progressTrend(null, null)).toBe("unknown"); expect(progressTrend(undefined, 40)).toBe("first");
    expect(progressTrend(40, 60)).toBe("up"); expect(progressTrend(60, 60)).toBe("same"); expect(progressTrend(100, 67)).toBe("down");
  });
  it("memory keeps the previous value until the percent changes again", () => {
    let m = nextProgressMemory(null, 100); expect(m).toEqual({ last: 100, from: null });
    m = nextProgressMemory(m, 100); expect(m).toEqual({ last: 100, from: null });
    m = nextProgressMemory(m, 67); expect(m).toEqual({ last: 67, from: 100 }); expect(progressTrend(m.from, 67)).toBe("down");
    m = nextProgressMemory(m, 67); expect(progressTrend(m.from, 67)).toBe("down");
  });
});

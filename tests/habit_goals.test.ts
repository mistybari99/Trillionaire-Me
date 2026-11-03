// Multi-goal step 11: habits are traced to goals, shown on the goal page, and never enter a percent.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { store } from "../src/ui/state";
import { habitLines } from "../src/core/habitGoals";
import { goalProgress } from "../src/core/goalPlan";
import { overallProgress } from "../src/core/overallProgress";
import { goalIdsOf, withGoals } from "../src/core/taskGoals";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" } as FieldValue);
const rec = (id: string, entity: string, vals: Record<string, unknown>, over: Partial<TMRecord> = {}): TMRecord => ({ id, entity, ns: "demo", ownerId: "demo-user", schemaVersion: 2, createdAt: "2026-11-01T00:00:00Z", values: Object.fromEntries(Object.entries(vals).map(([k, x]) => [k, v(x)])), ...over });
const iso = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const log = (id: string, habit: string, daysAgo: number) => rec(id, "habit_log", { "habit_log.date": iso(daysAgo), "habit_log.count": 1 }, { links: { habit } });
const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const go = (h: string) => { location.hash = h; render(); };

beforeEach(() => {
  localStorage.clear(); store.demo.clear(); store.real.clear();
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
  store.demo.put(rec("g", "goal", { "goal.title": "Health" })); store.demo.put(rec("g2", "goal", { "goal.title": "Shop" }));
});
const walk = () => withGoals(rec("h1", "habit", { "habit.title": "Walk 20 min", "habit.days": "0,1,2,3,4,5,6", "habit.days_per_week": 7 }), ["g"]);

describe("habit lines", () => {
  it("count planned days of the last 7 with a check-in; no check-in ever is 'not started', not 0 of 7", () => {
    const d = new Date(); const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expect(habitLines([walk()], new Set(["g"]), today)).toEqual([{ id: "h1", title: "Walk 20 min", planned: 7, done: 0, started: false }]);
    expect(habitLines([walk(), log("l1", "h1", 0), log("l2", "h1", 2), log("l3", "h1", 30)], new Set(["g"]), today)[0]).toMatchObject({ planned: 7, done: 2, started: true });
    expect(habitLines([walk()], new Set(["g2"]), today)).toEqual([]);
  });
  it("habits never enter any percent", () => {
    const base = [rec("g", "goal", { "goal.title": "Health" }), withGoals(rec("t", "task", { "task.title": "x" }), ["g"])];
    const a = goalProgress(base), o = overallProgress(base); const withHabit = [...base, walk(), log("l1", "h1", 0)];
    expect(goalProgress(withHabit)).toEqual(a); expect(overallProgress(withHabit)).toEqual(o);
  });
});

describe("on screen", () => {
  it("the habit form has the picker; saving links the habit; the card shows chips; the goal page shows the line", () => {
    go("#/habits"); (q("#hb-name") as HTMLInputElement).value = "Walk"; q<HTMLButtonElement>("[data-goal-picker=habit-new] [data-goal-chip=g]").click();
    q<HTMLFormElement>("form[data-form=habit]").dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    const h1 = store.demo.list().find((r) => r.entity === "habit")!; expect(goalIdsOf(h1)).toEqual(["g"]); expect(h1.links).toBeUndefined();
    render(); expect(q(`[data-habit-goals="${h1.id}"] [data-goal-chip-link=g]`).textContent).toBe("Health");
    go("#/journey/goal/g"); expect(q("[data-goal-habit]").textContent).toBe("Habit: Walk, no check-ins yet");
  });
  it("a card can change its goals; check-ins show the week line on the goal page", () => {
    store.demo.put(walk()); store.demo.put(log("l1", "h1", 0)); go("#/habits");
    const pick = q(`[data-habit-goals=h1] [data-goal-picker=habit-h1]`); (pick.querySelector("[data-goal-chip=g2]") as HTMLButtonElement).click(); q<HTMLButtonElement>("[data-act=habit-goals-save]").click();
    expect(goalIdsOf(store.demo.get("h1")!)).toEqual(["g", "g2"]);
    go("#/journey/goal/g2"); expect(q("[data-goal-habit=h1]").textContent).toMatch(/^Habit: Walk 20 min, 1 of 7 planned days this week$/);
  });
  it("Bangla text exists", () => { localStorage.setItem("tm:ui:lang", "bn"); store.demo.put(walk()); go("#/journey/goal/g"); expect(q("[data-goal-habit]").textContent).toContain("এখনো কোনো চেক-ইন নেই"); });
});

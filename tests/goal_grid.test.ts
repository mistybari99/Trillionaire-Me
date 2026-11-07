// Q-34: weekly and monthly grid (31 days, 12 weeks, 12 months) for goals, reusing the habit grid periods. No streak; a period with no entry is blank, not 0.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { gridSpans, goalGrid, habitRange } from "../src/core/chartData";
import { consentKv, prefs, store } from "../src/ui/state";
import { revokeConsent } from "../src/core/consent";
import type { FieldValue, TMRecord } from "../src/core/types";

const TODAY = "2026-10-31";
const NOW = "2026-10-26T10:00:00.000Z";
const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" } as FieldValue);
const goal = (id: string): TMRecord => ({ id, entity: "goal", ns: "demo", ownerId: "demo-user", schemaVersion: 2, createdAt: NOW, values: { "goal.title": v(id) } });
const task = (id: string, goals: string[], done?: string): TMRecord => ({ id, entity: "task", ns: "demo", ownerId: "demo-user", schemaVersion: 2, createdAt: NOW, values: { "task.title": v(id), "task.goals": v(goals), ...(done ? { "task.done_on": v(done) } : {}) } });

describe("core", () => {
  it("uses the same periods as the habit grid", () => {
    for (const r of ["days31", "weeks12", "months12"] as const) {
      const spans = gridSpans(TODAY, r); expect(spans.map(([f, t]) => ({ from: f, to: t }))).toEqual(habitRange({ id: "h", title: "x", days: [0, 1, 2, 3, 4, 5, 6], target: null, unit: "" }, [], TODAY, r, null).map(({ from, to }) => ({ from, to })));
    }
    expect(gridSpans(TODAY, "days31")).toHaveLength(31); expect(gridSpans(TODAY, "weeks12")).toHaveLength(12); expect(gridSpans(TODAY, "months12")).toHaveLength(12);
  });
  it("a period with a finished step is done; every other period is blank (none), never 0 or a miss", () => {
    const recs = [task("a", ["g"], "2026-10-30"), task("b", ["g"], "2026-10-30"), task("c", ["g"])];
    const [row] = goalGrid([{ id: "g", title: "G", stepIds: ["a", "b", "c"] }], recs, TODAY, "days31");
    expect(row!.periods).toHaveLength(31); expect(row!.periods[29]).toMatchObject({ count: 2, state: "done" }); expect(row!.periods[30]).toMatchObject({ count: 0, state: "none" });
    const w = goalGrid([{ id: "g", title: "G", stepIds: ["a", "b", "c"] }], recs, TODAY, "weeks12")[0]!; expect(w.periods[11]!.state).toBe("done"); expect(w.periods[10]!.state).toBe("none");
    const m = goalGrid([{ id: "g", title: "G", stepIds: ["a"] }], recs, TODAY, "months12")[0]!; expect(m.periods[11]).toMatchObject({ count: 1, state: "done" });
  });
  it("a done date in the future or a step of another goal is not counted", () => {
    const recs = [task("a", ["g"], "2026-11-15"), task("z", ["h"], "2026-10-30")];
    expect(goalGrid([{ id: "g", title: "G", stepIds: ["a"] }], recs, TODAY, "days31")[0]!.periods.every((p) => p.state === "none")).toBe(true);
  });
});

const app = () => document.getElementById("app")!;
const go = (hash: string) => { location.hash = hash; render(); };
const dayStr = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
beforeEach(() => { localStorage.clear(); store.demo.clear(); store.real.clear(); revokeConsent(consentKv); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); prefs.habitGrid = "days31"; });

describe("Goals screen", () => {
  it("no goal: no grid card; with a goal: the grid, a range bar, a text equivalent, no streak words", () => {
    go("#/journey/goals"); expect(app().querySelector("[data-chart=goal-grid]")).toBeNull();
    store.demo.put(goal("g1")); store.demo.put(task("t1", ["g1"], dayStr(-1)));
    go("#/journey/goals"); const card = app().querySelector("[data-chart=goal-grid]")!; expect(card).not.toBeNull();
    expect(card.querySelectorAll("[data-period]")).toHaveLength(31); expect(card.querySelectorAll("[data-period][data-state=full]")).toHaveLength(1);
    expect(card.querySelector("[data-chart-text=goal-grid] li")).not.toBeNull(); expect(card.querySelector("[data-chart-summary=goal-grid]")!.textContent).toMatch(/1 of 31/);
    expect(card.textContent!.toLowerCase()).not.toMatch(/score|rank|miss|best run/);
  });
  it("12 weeks and 12 months from the range bar", () => {
    store.demo.put(goal("g1")); go("#/journey/goals");
    (app().querySelector("[data-chart=goal-grid] [data-range=weeks12]") as HTMLElement).click(); render();
    expect(app().querySelectorAll("[data-chart=goal-grid] [data-period]")).toHaveLength(12);
    (app().querySelector("[data-chart=goal-grid] [data-range=months12]") as HTMLElement).click(); render();
    expect(app().querySelectorAll("[data-chart=goal-grid] [data-period]")).toHaveLength(12); expect(app().querySelectorAll("[data-chart=goal-grid] [data-period][data-state=full]")).toHaveLength(0);
  });
});

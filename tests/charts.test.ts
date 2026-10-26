// Step 3: inline SVG charts with text equivalents. Unknown is never drawn as zero; demo and real never mix.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { store, consentKv } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import type { FieldValue, Namespace, TMRecord } from "../src/core/types";
import { activityBars, flowBars, goalRings, habitGrid } from "../src/core/chartData";
import { addDays, todayIso } from "../src/core/habits";

const NOW = "2026-10-25T00:00:00.000Z";
const mk = (ns: Namespace, id: string, entity: string, values: Record<string, unknown>, links?: Record<string, string>, createdAt = NOW): TMRecord => {
  const label = ns === "demo" ? "DEMO" : "FACT"; const vals: Record<string, FieldValue> = {};
  for (const [k, x] of Object.entries(values)) vals[k] = (x === null ? { state: "unknown" } : { state: "value", value: x, label }) as FieldValue;
  return { id, entity, ns, ownerId: ns === "demo" ? "demo-user" : "owner", schemaVersion: 1, createdAt, values: vals, ...(links ? { links } : {}) };
};
const fin = (ns: Namespace, id: string, kind: string, amount: number | null, scope = "personal") => mk(ns, id, "finance_item", { "finance.kind": kind, "finance.scope": scope, "finance.label": id, "finance.amount": amount, "finance.period": "monthly" });
const T = todayIso();
const go = (hash: string) => { location.hash = hash; render(); };
const app = () => document.getElementById("app")!;
const chart = (k: string) => app().querySelector(`[data-chart=${k}]`);
const lines = (k: string) => [...chart(k)!.querySelectorAll("[data-chart-text] li")].map((l) => l.textContent);

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear();
  document.body.innerHTML = '<div id="app"></div>';
  localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, NOW);
});

describe("pure chart data", () => {
  it("unknown amount gives null, never 0; no lines gives no scope", () => {
    const r = flowBars([fin("demo", "a", "income", 1000), fin("demo", "b", "expense", null), fin("demo", "c", "expense", 200)]);
    expect(r).toHaveLength(1); expect(r[0]!.income.value).toBe(1000); expect(r[0]!.spending.value).toBeNull(); expect(r[0]!.spending.unknown).toBe(1);
    expect(flowBars([])).toEqual([]);
  });
  it("goal ring: no linked task is null, not 0", () => {
    const g = mk("demo", "g1", "goal", { "goal.title": "G" }); const g2 = mk("demo", "g2", "goal", { "goal.title": "H" });
    const r = goalRings([g, g2, mk("demo", "t1", "task", { "task.title": "x", "task.done_on": "2026-10-01" }, { goal: "g1" }), mk("demo", "t2", "task", { "task.title": "y" }, { goal: "g1" })]);
    expect(r[0]).toMatchObject({ done: 1, total: 2, fraction: 0.5 }); expect(r[1]!.fraction).toBeNull();
  });
  it("activity: empty weeks are null; no records means not enough", () => {
    expect(activityBars([], T).enough).toBe(false);
    const a = activityBars([mk("demo", "t", "task", { "task.done_on": T })], T);
    expect(a.enough).toBe(true); expect(a.weeks).toHaveLength(13); expect(a.weeks.at(-1)!.count).toBe(1); expect(a.weeks[0]!.count).toBeNull();
  });
  it("habit grid: 14 cells, only planned days count, no streak field", () => {
    const hb = { id: "h", title: "H", days: [0, 1, 2, 3, 4, 5, 6], target: null, unit: "" };
    const g = habitGrid(hb, [{ habitId: "h", date: T, count: 1 }], T);
    expect(g.cells).toHaveLength(14); expect(g.planned).toBe(14); expect(g.done).toBe(1);
    const none = habitGrid({ ...hb, days: [] }, [], T); expect(none.planned).toBe(0); expect(none.cells.every((c) => c.state === "rest")).toBe(true);
    expect(Object.keys(g)).not.toContain("streak");
  });
});

describe("Money chart", () => {
  it("none: message, no svg", () => { go("#/diary/money"); expect(chart("money")!.hasAttribute("data-chart-empty")).toBe(true); expect(chart("money")!.querySelector("svg")).toBeNull(); });
  it("data: bars, title, hidden summary and text match", () => {
    store.demo.put(fin("demo", "pay", "income", 5000)); store.demo.put(fin("demo", "rent", "expense", 2000)); go("#/diary/money");
    const c = chart("money")!; expect(c.querySelector("svg title")!.textContent).toBe("Monthly income and spending");
    expect(c.querySelectorAll("rect[data-bar]")).toHaveLength(2);
    expect(c.querySelector(".sr-only")!.textContent).toContain("income BDT 5,000, spending BDT 2,000");
    expect(lines("money")![0]).toContain("BDT 5,000"); expect(c.querySelector("details summary")!.textContent).toBe("Show as text");
  });
  it("partial: unknown spending shows an unknown mark and no zero bar or zero text", () => {
    store.demo.put(fin("demo", "pay", "income", 5000)); store.demo.put(fin("demo", "x", "expense", null)); go("#/diary/money");
    const c = chart("money")!; expect(c.querySelectorAll("rect[data-bar]")).toHaveLength(1); expect(c.querySelector("[data-unknown]")).not.toBeNull();
    expect(lines("money")![0]).toContain("spending unknown"); expect(lines("money")![0]).not.toMatch(/spending BDT 0/);
  });
  it("mode isolation: real lines never reach the demo chart", () => {
    store.demo.put(fin("demo", "pay", "income", 5000)); store.real.put(fin("real", "pay2", "income", 77777)); go("#/diary/money");
    expect(chart("money")!.textContent).not.toContain("77,777");
    localStorage.setItem("tm:ui:dataMode", "real"); go("#/diary/money"); expect(chart("money")!.textContent).toContain("77,777"); expect(chart("money")!.textContent).not.toContain("5,000");
  });
});

describe("Report goal rings", () => {
  it("none, partial and full", () => {
    go("#/journey/report"); expect(chart("goals")!.hasAttribute("data-chart-empty")).toBe(true);
    store.demo.put(mk("demo", "g1", "goal", { "goal.title": "Save" })); store.demo.put(mk("demo", "g2", "goal", { "goal.title": "Learn" }));
    store.demo.put(mk("demo", "t1", "task", { "task.title": "a", "task.done_on": "2026-10-20" }, { goal: "g1" })); store.demo.put(mk("demo", "t2", "task", { "task.title": "b" }, { goal: "g1" }));
    go("#/journey/report");
    expect(chart("goals")!.querySelectorAll("[data-ring]")).toHaveLength(1);
    expect(app().querySelector("[data-goal-ring=g2] [data-unknown]")).not.toBeNull();
    expect(lines("goals")).toEqual(["Save: 1 of 2 linked tasks done.", "Learn: no linked tasks yet, so progress is unknown."]);
    expect(chart("goals")!.querySelector(".sr-only")!.textContent).toContain("Save: 1 of 2");
  });
  it("mode isolation", () => {
    store.real.put(mk("real", "g9", "goal", { "goal.title": "RealGoal" })); go("#/journey/report");
    expect(chart("goals")!.textContent).not.toContain("RealGoal");
  });
});

describe("Review activity chart", () => {
  it("none shows 'not enough data' instead of an empty chart", () => {
    go("#/journey/review"); const c = chart("activity")!; expect(c.hasAttribute("data-chart-empty")).toBe(true); expect(c.querySelector("svg")).toBeNull(); expect(c.textContent).toContain("Not enough data");
  });
  it("data: bars for weeks with records, dashes (not zero bars) for the rest, text matches", () => {
    store.demo.put(mk("demo", "t", "task", { "task.title": "a", "task.done_on": T })); store.demo.put(mk("demo", "f", "focus_session", { "focus_session.date": T, "focus_session.minutes": null }));
    go("#/journey/review"); const c = chart("activity")!;
    expect(c.querySelectorAll("rect[data-week]")).toHaveLength(1); expect(c.querySelectorAll("[data-week-empty]")).toHaveLength(12);
    const ls = lines("activity")!; expect(ls).toHaveLength(13); expect(ls.at(-1)).toMatch(/: 2$/); expect(ls[0]).toMatch(/no record$/);
    expect(c.querySelector(".sr-only")!.textContent).toContain("2 items");
  });
  it("mode isolation", () => {
    store.real.put(mk("real", "t", "task", { "task.title": "a", "task.done_on": T })); go("#/journey/review");
    expect(chart("activity")!.hasAttribute("data-chart-empty")).toBe(true);
  });
});

describe("Habits 14-day grid", () => {
  const hab = (ns: Namespace, id: string, days: string) => mk(ns, id, "habit", { "habit.title": `Walk ${ns}`, "habit.days": days });
  it("planned days only, text matches, no streak wording", () => {
    store.demo.put(hab("demo", "h1", "0,1,2,3,4,5,6"));
    store.demo.put(mk("demo", "hl1", "habit_log", { "habit_log.date": T, "habit_log.count": 1 }, { habit: "h1" }));
    store.demo.put(mk("demo", "hl2", "habit_log", { "habit_log.date": addDays(T, -1), "habit_log.count": 1 }, { habit: "h1" }));
    go("#/habits"); const c = chart("habit")!;
    expect(c.querySelectorAll("[data-cell]")).toHaveLength(14); expect(c.querySelectorAll("[data-state=done]")).toHaveLength(2);
    expect(c.querySelector(".sr-only")!.textContent).toContain("2 of 14 planned days"); expect(lines("habit")).toHaveLength(14);
    expect(c.textContent!.toLowerCase()).not.toMatch(/streak|rank|grade|fail|missed/);
  });
  it("no planned days: message, no grid", () => {
    store.demo.put(hab("demo", "h2", "")); go("#/habits"); expect(chart("habit")!.hasAttribute("data-chart-empty")).toBe(true);
  });
  it("mode isolation", () => {
    store.demo.put(hab("demo", "h1", "0,1,2,3,4,5,6")); store.real.put(hab("real", "h2", "0,1,2,3,4,5,6")); go("#/habits");
    expect(app().textContent).not.toContain("Walk real");
  });
});

describe("Bangla", () => {
  it("titles and text option are in Bangla with Latin digits", () => {
    localStorage.setItem("tm:ui:lang", "bn"); store.demo.put(fin("demo", "pay", "income", 5000)); go("#/diary/money");
    const c = chart("money")!; expect(c.textContent).toContain("মাসিক আয় ও খরচ"); expect(c.querySelector("summary")!.textContent).toBe("লেখা আকারে দেখুন");
    expect(c.textContent).not.toMatch(/[০-৯]/);
    go("#/journey/review"); expect(chart("activity")!.textContent).toContain("তথ্য এখনো নেই");
  });
});

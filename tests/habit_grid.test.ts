// Habit grid trackers beyond 14 days: planned days only, nothing before the habit existed, unknown never 0, text equivalent, no streak.
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { habitRange } from "../src/core/chartData";
import type { Habit, Log } from "../src/core/habits";
import { store, consentKv } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import type { FieldValue, Namespace, TMRecord } from "../src/core/types";

const TODAY = "2026-10-31"; // Saturday
const daily: Habit = { id: "h", title: "Walk", days: [0, 1, 2, 3, 4, 5, 6], target: null, unit: "" };
const log = (date: string): Log => ({ habitId: "h", date, count: 1 });

describe("habitRange (core)", () => {
  it("31 days: 31 single-day periods ending today", () => {
    const p = habitRange(daily, [], TODAY, "days31", null);
    expect(p).toHaveLength(31); expect(p[30]).toMatchObject({ from: TODAY, to: TODAY }); expect(p[0]!.from).toBe("2026-10-01");
  });
  it("marked day is full, unmarked planned day is open", () => {
    const p = habitRange(daily, [log("2026-10-30")], TODAY, "days31", null);
    expect(p[29]!.state).toBe("full"); expect(p[28]!.state).toBe("open");
  });
  it("days not planned are 'none' (unknown), not a miss", () => {
    const weekdays: Habit = { ...daily, days: [1, 2, 3, 4, 5] };
    const p = habitRange(weekdays, [], TODAY, "days31", null);
    expect(p[30]!.state).toBe("none"); // Saturday
    expect(p[29]!.state).toBe("open"); // Friday
  });
  it("12 weeks: 12 periods of 7 days; partial marking is 'some'; ratio is from planned days only", () => {
    const p = habitRange(daily, [log("2026-10-30"), log("2026-10-31")], TODAY, "weeks12", null);
    expect(p).toHaveLength(12); expect(p[11]).toMatchObject({ planned: 7, done: 2, state: "some" });
    expect(p[10]).toMatchObject({ planned: 7, done: 0, state: "open" });
  });
  it("12 months: current month stops at today", () => {
    const p = habitRange(daily, [], TODAY, "months12", null);
    expect(p).toHaveLength(12); expect(p[11]).toMatchObject({ from: "2026-10-01", to: TODAY, planned: 31 }); expect(p[0]!.from).toBe("2025-11-01");
  });
  it("days before the habit was added are not counted (since)", () => {
    const p = habitRange(daily, [], TODAY, "weeks12", "2026-10-29");
    expect(p[11]).toMatchObject({ planned: 3, done: 0 }); expect(p[10]).toMatchObject({ planned: 0, state: "none" });
  });
  it("no streak or best field exists", () => { expect(Object.keys(habitRange(daily, [], TODAY, "days31", null)[0]!)).toEqual(["from", "to", "planned", "done", "state"]); });
});

const mk = (ns: Namespace, id: string, entity: string, values: Record<string, unknown>, createdAt: string, links?: Record<string, string>): TMRecord => {
  const vals: Record<string, FieldValue> = {};
  for (const [k, x] of Object.entries(values)) vals[k] = { state: "value", value: x, label: ns === "demo" ? "DEMO" : "FACT" } as FieldValue;
  return { id, entity, ns, ownerId: "o", schemaVersion: 1, createdAt, values: vals, ...(links ? { links } : {}) };
};

describe("habit long view (screen)", () => {
  const onHash = () => render();
  beforeEach(() => {
    window.addEventListener("hashchange", onHash);
    localStorage.clear(); store.demo.clear(); store.real.clear();
    document.body.innerHTML = '<div id="app"></div>';
    localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "real"); grantConsent(consentKv, "2026-10-25T00:00:00.000Z");
  });
  afterEach(() => window.removeEventListener("hashchange", onHash));
  const go = () => { location.hash = "#/habits"; render(); };
  const app = () => document.getElementById("app")!;
  it("no habits: empty note, no grid, range chooser still there", () => {
    go();
    expect(app().querySelector('[data-chart="habit-grid"][data-chart-empty]')).not.toBeNull(); expect(app().querySelector("[data-habit-long]")).toBeNull();
    expect(app().querySelectorAll("[data-grid-range] button").length).toBe(3);
  });
  it("one habit: 31 squares by default, switch to 12 weeks and 12 months, choice kept, text equivalent present", () => {
    store.real.put(mk("real", "habit-1", "habit", { "habit.title": "Walk", "habit.days": "0,1,2,3,4,5,6" }, "2026-01-01T00:00:00.000Z"));
    go();
    expect(app().querySelectorAll('[data-habit-long] [data-period]').length).toBe(31);
    (app().querySelector('[data-range="weeks12"]') as HTMLElement).click();
    expect(app().querySelectorAll('[data-habit-long] [data-period]').length).toBe(12);
    (app().querySelector('[data-range="months12"]') as HTMLElement).click();
    expect(app().querySelector("[data-habit-long]")!.getAttribute("data-habit-long")).toBe("months12");
    expect(app().querySelectorAll('[data-chart-text="habit-grid"] li').length).toBe(12);
    expect(app().querySelector('[data-chart-summary="habit-grid"]')!.textContent).toMatch(/Walk/);
    expect(localStorage.getItem("tm:ui:habitGrid")).toBe("months12");
  });
  it("demo habits do not appear in real mode; no streak, best or red wording", () => {
    store.demo.put(mk("demo", "habit-d", "habit", { "habit.title": "Demo walk", "habit.days": "0,1,2,3,4,5,6" }, "2026-01-01T00:00:00.000Z"));
    go();
    expect(app().querySelector('[data-chart="habit-grid"]')!.textContent).not.toContain("Demo walk");
    expect(app().querySelector('[data-chart="habit-grid"]')!.textContent).not.toMatch(/streak|best|score|failed|missed/i);
  });
  it("bn and mix render with Latin digits", () => {
    store.real.put(mk("real", "habit-1", "habit", { "habit.title": "Walk", "habit.days": "0,1,2,3,4,5,6" }, "2026-01-01T00:00:00.000Z"));
    for (const l of ["bn", "mix"]) { localStorage.setItem("tm:ui:lang", l); go(); expect(app().querySelector('[data-chart="habit-grid"]')!.textContent).not.toMatch(/[০-৯]/); }
  });
});

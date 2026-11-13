// TM-REQ-009: paused and retired goals give no reminders; their history stays readable; no-deadline goals are fine.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { goalReminders, goalStatusOf, withGoalStatus } from "../src/core/goalStatus";
import { store, consentKv } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import type { FieldValue, Namespace, TMRecord } from "../src/core/types";

const NOW = "2026-10-01T00:00:00.000Z";
const mk = (ns: Namespace, id: string, entity: string, values: Record<string, unknown>, links?: Record<string, string>): TMRecord => {
  const vals: Record<string, FieldValue> = {};
  for (const [k, x] of Object.entries(values)) vals[k] = { state: "value", value: x, label: ns === "demo" ? "DEMO" : "FACT" } as FieldValue;
  return { id, entity, ns, ownerId: "o", schemaVersion: 1, createdAt: NOW, values: vals, ...(links ? { links } : {}) };
};
const goal = (id: string, extra: Record<string, unknown> = {}, ns: Namespace = "demo") => mk(ns, id, "goal", { "goal.title": `Goal ${id}`, "goal.target_date": "2026-01-15", ...extra });
const TODAY = "2026-10-31";

describe("TM-TST-009 paused and retired goals give no reminders", () => {
  it("0 reminders for 20 paused/retired goals with passed dates; the same goals active do remind", () => {
    const recs: TMRecord[] = [];
    for (let i = 0; i < 20; i++) recs.push(goal(`g${i}`, { "goal.status": i % 2 ? "paused" : "retired", "goal.target_date": `2026-0${1 + (i % 9)}-1${i % 9}` }));
    expect(goalReminders(recs, TODAY)).toEqual([]);
    const active = recs.map((r) => withGoalStatus(r, "active"));
    expect(goalReminders(active, TODAY).length).toBe(20);
  });
  it("no status means active; unknown status values fall back to active", () => {
    expect(goalStatusOf(goal("a"))).toBe("active");
    expect(goalStatusOf({ ...goal("a"), values: { ...goal("a").values, "goal.status": { state: "unknown" } } })).toBe("active");
    expect(goalStatusOf(goal("a", { "goal.status": "banana" }))).toBe("active");
  });
  it("no-deadline, future-dated, today-dated and finished goals make no reminder", () => {
    const done = mk("demo", "tk", "task", { "task.title": "x", "task.done_on": "2026-02-01" }, { goal: "gd" });
    const recs = [goal("n", { "goal.target_date": undefined }), goal("f", { "goal.target_date": "2026-12-01" }), goal("t", { "goal.target_date": TODAY }), goal("gd"), done];
    delete (recs[0] as TMRecord).values["goal.target_date"];
    expect(goalReminders(recs, TODAY)).toEqual([]);
  });
  it("tasks and other records never become goal reminders; order is by date", () => {
    const r = goalReminders([goal("b", { "goal.target_date": "2026-03-01" }), goal("a", { "goal.target_date": "2026-02-01" }), mk("demo", "tk", "task", { "task.title": "x", "task.done_on": "2026-02-01" })], TODAY);
    expect(r.map((x) => x.goalId)).toEqual(["a", "b"]);
  });
});

describe("goal status in the app", () => {
  beforeEach(() => {
    localStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>';
    localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, NOW);
  });
  const go = (h: string) => { location.hash = h; render(); };
  it("Today shows a calm reminder for an active goal and none after it is paused; the goal page stays readable", () => {
    store.demo.put(goal("g1"));
    go("#/today");
    const card = document.querySelector("[data-goal-reminder=g1]")!;
    expect(card).not.toBeNull(); expect(card.textContent).toMatch(/pause it/); expect(card.textContent).not.toMatch(/fail|late|behind|overdue/i);
    go("#/journey/goal/g1");
    document.querySelector<HTMLButtonElement>("[data-goal-status=paused]")!.click();
    expect(goalStatusOf(store.demo.get("g1")!)).toBe("paused");
    go("#/today"); expect(document.querySelector("[data-goal-reminders]")).toBeNull();
    go("#/journey/goal/g1");
    expect(document.querySelector("h1")!.textContent).toBe("Goal g1");
    expect(document.querySelector("[data-goal-progress]")).not.toBeNull();
    expect(document.querySelector("[data-goal-status=paused]")!.getAttribute("aria-pressed")).toBe("true");
  });
  it("demo goals never remind in real mode", () => {
    store.demo.put(goal("g1")); localStorage.setItem("tm:ui:dataMode", "real");
    go("#/today"); expect(document.querySelector("[data-goal-reminder]")).toBeNull();
  });
  it("Bangla text uses Latin digits", () => {
    localStorage.setItem("tm:ui:lang", "bn"); store.demo.put(goal("g1")); go("#/today");
    expect(document.querySelector("[data-goal-reminder=g1]")!.textContent).toContain("2026-01-15");
    expect(document.querySelector("[data-goal-reminders]")!.textContent).not.toMatch(/[০-৯]/);
  });
});

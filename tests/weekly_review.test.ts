// Weekly review: own records only, last 7 days, Unknown when empty, neutral wording, demo/real never mixed.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { weeklySummary, weekWindow } from "../src/core/weeklyReview";
import { store, consentKv } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import type { FieldValue, Namespace, TMRecord } from "../src/core/types";

const NOW = "2026-10-25T00:00:00.000Z";
const mk = (ns: Namespace, id: string, entity: string, values: Record<string, unknown>, createdAt = NOW): TMRecord => {
  const vals: Record<string, FieldValue> = {};
  for (const [k, x] of Object.entries(values)) vals[k] = { state: "value", value: x, label: ns === "demo" ? "DEMO" : "FACT" } as FieldValue;
  return { id, entity, ns, ownerId: "o", schemaVersion: 1, createdAt, values: vals };
};
const TODAY = "2026-10-31";

describe("weekly review core", () => {
  it("window is 7 days, today included", () => { expect(weekWindow(TODAY)).toEqual({ from: "2026-10-25", to: TODAY }); });
  it("empty records give Unknown (null), never 0", () => {
    const w = weeklySummary([], TODAY);
    expect(w).toMatchObject({ tasksDone: null, focusMinutes: null, habitCheckins: null, journeyNotes: null, stillOpen: null, focusUnknown: 0 });
  });
  it("counts only the window; unknown focus minutes are not counted as 0", () => {
    const recs = [
      mk("demo", "t1", "task", { "task.done_on": "2026-10-26" }), mk("demo", "t2", "task", { "task.done_on": "2026-10-20" }), mk("demo", "t3", "task", { "task.title": "x" }),
      mk("demo", "f1", "focus_session", { "focus_session.date": "2026-10-30", "focus_session.minutes": 25 }),
      mk("demo", "f2", "focus_session", { "focus_session.date": "2026-10-30" }),
      mk("demo", "h1", "habit_log", { "habit_log.date": "2026-10-31", "habit_log.count": 1 }),
    ];
    const w = weeklySummary(recs, TODAY);
    expect(w.tasksDone).toBe(1); expect(w.focusMinutes).toBe(25); expect(w.focusUnknown).toBe(1); expect(w.habitCheckins).toBe(1); expect(w.stillOpen).toBe(1);
  });
  it("a task only with minutes unknown gives focusMinutes null", () => {
    expect(weeklySummary([mk("demo", "f", "focus_session", { "focus_session.date": "2026-10-30" })], TODAY).focusMinutes).toBeNull();
  });
});

describe("weekly review screen", () => {
  beforeEach(() => {
    localStorage.clear(); store.demo.clear(); store.real.clear();
    document.body.innerHTML = '<div id="app"></div>';
    localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "real"); grantConsent(consentKv, NOW);
  });
  const go = () => { location.hash = "#/journey/week"; render(); };
  it("real mode with no records shows Unknown text, no zero and no score words", () => {
    go();
    const app = document.getElementById("app")!;
    expect(app.querySelectorAll("[data-week-empty]").length).toBe(5);
    expect(app.textContent).not.toMatch(/\b0 (finished|minutes|check-ins|notes|open)\b/);
    expect(app.querySelector("main")!.textContent!.toLowerCase()).not.toMatch(/score|streak|rank|grade|failed|behind|bad/);
  });
  it("demo records never show in real mode", () => {
    const today = new Date(); const d = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    store.demo.put(mk("demo", "dt", "task", { "task.done_on": d }));
    go();
    expect(document.querySelector("[data-week=tasks] [data-week-empty]")).not.toBeNull();
  });
  it("compact view and Bangla render with Latin digits", () => {
    localStorage.setItem("tm:ui:view:weekly", "compact"); localStorage.setItem("tm:ui:lang", "bn"); go();
    expect(document.querySelector("table[data-view=compact]")).not.toBeNull();
    expect(document.getElementById("app")!.textContent).toContain("সাপ্তাহিক রিভিউ");
    expect(document.getElementById("app")!.textContent).not.toMatch(/[০-৯]/);
  });
});

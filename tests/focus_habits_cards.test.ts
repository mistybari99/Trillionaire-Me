import { describe, expect, it } from "vitest";
import * as F from "../src/core/focus";
import * as H from "../src/core/habits";
import * as C from "../src/core/cards";
import * as habitsModule from "../src/core/habits";

describe("focus timer maths", () => {
  const t0 = 1_000_000;
  it("counts down, pauses without losing time, resumes", () => {
    let s = F.start("focus", 25, t0);
    expect(F.remainingMs(s, t0 + 5 * 60_000)).toBe(20 * 60_000);
    s = F.pause(s, t0 + 5 * 60_000); expect(F.remainingMs(s, t0 + 60 * 60_000)).toBe(20 * 60_000); // paused: time stands still
    s = F.resume(s, t0 + 60 * 60_000); expect(F.remainingMs(s, t0 + 61 * 60_000)).toBe(19 * 60_000);
  });
  it("finishes exactly at the end; never negative", () => { const s = F.start("focus", 10, t0); expect(F.isFinished(s, t0 + 10 * 60_000 - 1)).toBe(false); expect(F.isFinished(s, t0 + 10 * 60_000)).toBe(true); expect(F.remainingMs(s, t0 + 99 * 60_000)).toBe(0); });
  it("±5 min keeps elapsed time and respects the cap", () => {
    const s = F.start("focus", 25, t0); const a = F.adjust(s, -50, t0 + 10 * 60_000); expect(a.minutes).toBe(11); // never below elapsed+1
    expect(F.adjust(s, 500, t0).minutes).toBe(F.MAX_MINUTES);
  });
  it("records whole focused minutes only for focus phases", () => {
    const s = F.start("focus", 25, t0); expect(F.focusedMinutes(s, t0 + 7.9 * 60_000)).toBe(7); expect(F.focusedMinutes(s, t0 + 90 * 60_000)).toBe(25);
    expect(F.focusedMinutes(F.start("rest", 5, t0), t0 + 4 * 60_000)).toBe(0);
  });
  it("rejects silly durations", () => { for (const m of [0, -5, 121, NaN]) expect(() => F.start("focus", m, t0)).toThrow(); });
  it("formats mm:ss", () => { expect(F.fmt(25 * 60_000)).toBe("25:00"); expect(F.fmt(61_000)).toBe("01:01"); expect(F.fmt(0)).toBe("00:00"); });
});

describe("habits: consistency without run-counts", () => {
  const daily: H.Habit = { id: "h", title: "Read", days: [0, 1, 2, 3, 4, 5, 6], target: null, unit: "" };
  const today = "2026-10-24"; // Saturday
  const log = (date: string, count = 1): H.Log => ({ habitId: "h", date, count });
  it("x of y planned days; future days never count; no planned days → unknown, not 0%", () => {
    const logs = [log("2026-10-20"), log("2026-10-22"), log("2026-10-24")];
    expect(H.consistency(daily, logs, "2026-10-18", "2026-10-31", today)).toEqual({ done: 3, planned: 7, pct: 43 });
    expect(H.consistency({ ...daily, days: [] }, logs, "2026-10-18", today, today).pct).toBeNull();
  });
  it("weekday frequency respected", () => {
    const mwf = { ...daily, days: [1, 3, 5] }; expect(H.isPlanned(mwf, "2026-10-23")).toBe(true); /* Fri */ expect(H.isPlanned(mwf, "2026-10-24")).toBe(false);
  });
  it("measured habits are done only when the target is reached", () => {
    const water = { ...daily, target: 8, unit: "glasses" }; expect(H.isDone(water, [log(today, 4)], today)).toBe(false); expect(H.isDone(water, [log(today, 8)], today)).toBe(true); expect(H.countOn(water, [log(today, 4)], today)).toBe(4);
  });
  it("restart plan appears after two missed planned days and is just an offer", () => {
    expect(H.restartPlan(daily, [], today)).toBe("smallest_version"); expect(H.restartPlan(daily, [log("2026-10-23")], today)).toBe("none");
    expect(H.restartPlan({ ...daily, days: [] }, [], today)).toBe("none");
  });
  it("backfill: past and today only", () => { expect(H.canLog("2026-10-20", today)).toBe(true); expect(H.canLog("2026-10-25", today)).toBe(false); });
  it("the module offers no run-count or 'best' or single-score function", () => { expect(Object.keys(habitsModule).join(" ")).not.toMatch(/streak|best|score|rank/i); });
});

describe("flashcards: calm 5-box schedule", () => {
  const today = "2026-10-24";
  it("correct answers climb and space out; a miss returns to box 1 for tomorrow", () => {
    let c = C.newCard("a", "q", "a", today); const due: string[] = [];
    for (let i = 0; i < 5; i++) { c = C.review(c, true, today); due.push(c.due); }
    expect(c.box).toBe(5); expect(due).toEqual(["2026-10-26", "2026-10-28", "2026-11-01", "2026-11-09", "2026-11-09"]);
    const m = C.review(c, false, today); expect(m.box).toBe(1); expect(m.due).toBe("2026-10-25");
  });
  it("due list only includes due cards; new cards are due now", () => {
    const a = C.newCard("a", "q", "a", today), b = { ...C.newCard("b", "q", "a", today), due: "2026-10-30" };
    expect(C.dueCards([a, b], today).map((x) => x.id)).toEqual(["a"]); expect(C.byBox([a, b])).toEqual([2, 0, 0, 0, 0]);
  });
});

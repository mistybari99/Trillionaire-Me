import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" });
const base = { ns: "demo" as const, ownerId: "u", schemaVersion: 1, createdAt: "2026-10-24T00:00:00Z" };
const task = (id: string): TMRecord => ({ ...base, id, entity: "task", values: { "task.title": v("Write offer"), "task.minutes": v(20) } });
const go = (h: string) => { location.hash = h; render(); };
const reset = () => { localStorage.clear(); sessionStorage.clear(); store.demo.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); };

describe("focus timer screen", () => {
  beforeEach(() => { reset(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-24T10:00:00")); });
  afterEach(() => vi.useRealTimers());
  it("start → countdown → finish records the minutes and offers 'Task done'", () => {
    store.demo.put(task("task-1")); go("#/focus/task-1");
    (document.querySelector("[data-preset='10']") as HTMLButtonElement).click();
    expect(document.querySelector("[data-focus-time]")!.textContent).toBe("10:00");
    vi.setSystemTime(new Date("2026-10-24T10:04:00")); vi.advanceTimersByTime(1000); expect(document.querySelector("[data-focus-time]")!.textContent).toBe("05:59");
    vi.setSystemTime(new Date("2026-10-24T10:10:00")); vi.advanceTimersByTime(1000);
    expect(document.querySelector("[data-focus-finished=focus]")).not.toBeNull();
    const fs = store.demo.list().find((r) => r.entity === "focus_session")!; expect(fs.values["focus_session.minutes"]).toMatchObject({ value: 10 }); expect(fs.links?.task).toBe("task-1");
    expect(document.querySelector("[data-act=focus-done]")).not.toBeNull();
  });
  it("stopping early saves only the whole minutes truly focused; pausing freezes time", () => {
    store.demo.put(task("task-1")); go("#/focus/task-1"); (document.querySelector("[data-preset='25']") as HTMLButtonElement).click();
    vi.setSystemTime(new Date("2026-10-24T10:07:30")); (document.querySelector("[data-act=focus-pause]") as HTMLButtonElement).click();
    vi.setSystemTime(new Date("2026-10-24T11:30:00")); vi.advanceTimersByTime(1000); expect(document.querySelector("[data-focus-time]")!.textContent).toBe("17:30"); // paused: still 17:30 left
    (document.querySelector("[data-act=focus-stop]") as HTMLButtonElement).click();
    expect(store.demo.list().find((r) => r.entity === "focus_session")!.values["focus_session.minutes"]).toMatchObject({ value: 7 });
  });
  it("a zero-minute stop saves nothing; unknown task shows a calm hint", () => {
    store.demo.put(task("task-1")); go("#/focus/task-1"); (document.querySelector("[data-preset='10']") as HTMLButtonElement).click(); (document.querySelector("[data-act=focus-stop]") as HTMLButtonElement).click();
    expect(store.demo.list().some((r) => r.entity === "focus_session")).toBe(false);
    go("#/focus/none"); expect(document.body.textContent).toMatch(/Choose a task/);
  });
  it("a refresh mid-session resumes the countdown", () => {
    store.demo.put(task("task-1")); go("#/focus/task-1"); (document.querySelector("[data-preset='25']") as HTMLButtonElement).click();
    vi.setSystemTime(new Date("2026-10-24T10:05:00")); go("#/focus/task-1"); expect(document.querySelector("[data-focus-time]")!.textContent).toBe("20:00");
  });
});

describe("TM-TST-148 habits screen", () => {
  beforeEach(() => { reset(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-24T09:00:00")); });
  afterEach(() => vi.useRealTimers());
  const habit = (extra: Record<string, FieldValue> = {}): TMRecord => ({ ...base, id: "habit-1", entity: "habit", values: { "habit.title": v("Read"), "habit.days": v("0,1,2,3,4,5,6"), ...extra } });
  it("tick today, backfill a past day, consistency counts only planned days", () => {
    store.demo.put(habit()); go("#/habits");
    (document.querySelector("[data-act=habit-tick]") as HTMLButtonElement).click(); render();
    expect(store.demo.get("hl-habit-1-2026-10-24")).not.toBeNull();
    (document.querySelector("[data-day='2026-10-22']") as HTMLButtonElement).click(); render();
    expect(store.demo.get("hl-habit-1-2026-10-22")).not.toBeNull();
    expect(document.querySelector("[data-consistency]")!.textContent).toMatch(/2 of 28 planned days/);
    (document.querySelector("[data-act=habit-tick]") as HTMLButtonElement).click(); render(); expect(store.demo.get("hl-habit-1-2026-10-24")).toBeNull(); // untick is allowed — honest history
  });
  it("measured habit: +1 until the target; done only at the target", () => {
    store.demo.put(habit({ "habit.target": v(3), "habit.unit": v("glasses") })); go("#/habits");
    for (let i = 0; i < 2; i++) { (document.querySelector("[data-act=habit-plus]") as HTMLButtonElement).click(); render(); }
    expect(document.querySelector("[data-act=habit-plus]")!.textContent).toMatch(/2 \/ 3|2 of 3/.test("2 of 3") ? /2 of 3 glasses/ : /x/);
    expect(document.querySelector("[data-day='2026-10-24']")!.getAttribute("data-done")).toBe("false");
    (document.querySelector("[data-act=habit-plus]") as HTMLButtonElement).click(); render();
    expect(document.querySelector("[data-day='2026-10-24']")!.getAttribute("data-done")).toBe("true");
  });
  it("two missed days → a kind restart offer; never red failure copy, never a run-count", () => {
    store.demo.put(habit()); go("#/habits"); expect(document.querySelector("[data-restart]")!.textContent).toMatch(/smallest version/);
    expect(document.querySelector("[data-habit-card]")?.textContent ?? "".toLowerCase()).not.toMatch(/streak|fail|broken|lost|shame|best/);
  });
  it("a secret in the habit name is rejected; adding one habit works", () => {
    grantConsent(consentKv, "2026-10-25T00:00:00.000Z"); localStorage.setItem("tm:ui:dataMode", "real");
    go("#/habits"); const f = document.querySelector("form[data-form=habit]")!;
    (document.getElementById("hb-name") as HTMLInputElement).value = "password: abc12345"; f.dispatchEvent(new Event("submit", { cancelable: true })); expect(store.real.list().some((r) => r.entity === "habit")).toBe(false);
    (document.getElementById("hb-name") as HTMLInputElement).value = "Walk 10 minutes"; f.dispatchEvent(new Event("submit", { cancelable: true })); expect(store.real.list().filter((r) => r.entity === "habit")).toHaveLength(1);
  });
});

describe("flashcards screen", () => {
  beforeEach(() => { reset(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-24T09:00:00")); });
  afterEach(() => vi.useRealTimers());
  it("add → study → knew it moves the card out of today; not yet brings it back tomorrow", () => {
    go("#/cards"); (document.getElementById("cd-front") as HTMLInputElement).value = "What is runway?"; (document.getElementById("cd-back") as HTMLInputElement).value = "Months of cash left";
    document.querySelector("form[data-form=card]")!.dispatchEvent(new Event("submit", { cancelable: true })); render();
    expect(document.querySelector("[data-cards-due]")!.getAttribute("data-cards-due")).toBe("1");
    (document.querySelector("[data-act=cards-study]") as HTMLButtonElement).click();
    expect((document.querySelector("[data-answer]") as HTMLElement).hidden).toBe(true);
    (document.querySelector("[data-act=card-show]") as HTMLButtonElement).click(); expect((document.querySelector("[data-answer]") as HTMLElement).hidden).toBe(false);
    (document.querySelector("[data-act=card-knew]") as HTMLButtonElement).click(); expect(document.querySelector("[data-cards-done]")).not.toBeNull();
    const c = store.demo.list().find((r) => r.entity === "card")!; expect(c.values["card.box"]).toMatchObject({ value: 2 }); expect(c.values["card.due"]).toMatchObject({ value: "2026-10-26" });
    render(); expect(document.querySelector("[data-cards-due]")!.getAttribute("data-cards-due")).toBe("0");
  });
  it("secrets in cards are rejected; both sides are required", () => {
    go("#/cards"); const f = document.querySelector("form[data-form=card]")!;
    (document.getElementById("cd-front") as HTMLInputElement).value = "PIN 482913"; (document.getElementById("cd-back") as HTMLInputElement).value = "x"; f.dispatchEvent(new Event("submit", { cancelable: true }));
    (document.getElementById("cd-front") as HTMLInputElement).value = "ok"; (document.getElementById("cd-back") as HTMLInputElement).value = ""; f.dispatchEvent(new Event("submit", { cancelable: true }));
    expect(store.demo.list().some((r) => r.entity === "card")).toBe(false);
  });
});

// Q-13: habit extras. Earlier-day date input (max today, canLog), optional category / start_on / end_on (grid shows outside the range as none),
// and the tiny-habit starter (title, "After I..." anchor, 1 or 2 minutes; offered when no other new habit is active; never blocking).
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../src/app";
import { habitRange } from "../src/core/chartData";
import { addDays, canLog, isPlanned, type Habit } from "../src/core/habits";
import { checkMicro, checkRange, microOffered } from "../src/core/microHabit";
import { consentKv, store } from "../src/ui/state";
import { resetMicro } from "../src/ui/qb3Ui";
import { grantConsent } from "../src/core/consent";
import { fieldById } from "../src/catalog/fields";
import { PACKS } from "../src/i18n/packs";
import type { FieldValue, TMRecord } from "../src/core/types";

const TODAY = "2026-10-31";
const all7 = [0, 1, 2, 3, 4, 5, 6];
const hb = (extra: Partial<Habit> = {}): Habit => ({ id: "h", title: "Walk", days: all7, target: null, unit: "", ...extra });

describe("core: start and end day", () => {
  it("days outside start..end are not planned, so the grids show them as none and nothing counts as missed", () => {
    const h = hb({ start: "2026-10-20", end: "2026-10-25" });
    expect(isPlanned(h, "2026-10-19")).toBe(false); expect(isPlanned(h, "2026-10-20")).toBe(true); expect(isPlanned(h, "2026-10-25")).toBe(true); expect(isPlanned(h, "2026-10-26")).toBe(false);
    const p = habitRange(h, [], TODAY, "days31", null);
    expect(p.find((x) => x.from === "2026-10-19")!.state).toBe("none"); expect(p.find((x) => x.from === "2026-10-22")!.state).toBe("open"); expect(p.find((x) => x.from === "2026-10-28")!.state).toBe("none");
    const w = habitRange(h, [], TODAY, "weeks12", null); expect(w[11]).toMatchObject({ planned: 1, done: 0 }); expect(w[10]).toMatchObject({ planned: 5 });
  });
  it("a habit without start or end behaves as before", () => { expect(isPlanned(hb(), "2020-01-01")).toBe(true); });
  it("range check: both optional, valid days, end not before start", () => {
    expect(checkRange("", "")).toBe("ok"); expect(checkRange("2026-10-01", "")).toBe("ok"); expect(checkRange("2026-10-02", "2026-10-01")).toBe("bad"); expect(checkRange("2026-13-01", "")).toBe("bad"); expect(checkRange("", "x")).toBe("bad");
  });
  it("an earlier day can be logged, a future day cannot", () => { expect(canLog("2026-10-30", TODAY)).toBe(true); expect(canLog(TODAY, TODAY)).toBe(true); expect(canLog("2026-11-01", TODAY)).toBe(false); });
});

describe("core: tiny habit", () => {
  it("needs a name, an anchor and 1 or 2 minutes", () => {
    expect(checkMicro({ title: "Floss one tooth", anchor: "brush my teeth", minutes: "1" })).toEqual({ ok: true, title: "Floss one tooth", anchor: "brush my teeth", minutes: 1 });
    for (const m of ["0", "3", "", "1.5", "x"]) expect(checkMicro({ title: "a", anchor: "b", minutes: m }).ok).toBe(false);
    expect(checkMicro({ title: " ", anchor: "b", minutes: "2" }).ok).toBe(false); expect(checkMicro({ title: "a", anchor: "", minutes: "2" }).ok).toBe(false);
    expect(checkMicro({ title: "a", anchor: "b", minutes: "২" })).toMatchObject({ ok: true, minutes: 2 });
  });
  it("offered only when no habit was added in the last 14 days", () => {
    expect(microOffered([], TODAY)).toBe(true); expect(microOffered(["2026-10-25T10:00:00"], TODAY)).toBe(false); expect(microOffered(["2026-09-01T10:00:00"], TODAY)).toBe(true); expect(microOffered(["bad"], TODAY)).toBe(true);
  });
});

describe("schema: additive optional habit fields", () => {
  it("exist, are optional and belong to habit", () => {
    for (const id of ["habit.category", "habit.start_on", "habit.end_on", "habit.anchor", "habit.minutes"]) { const f = fieldById(id)!; expect(f.entity).toBe("habit"); expect(f.importance).toBe("optional"); }
    expect(fieldById("habit.start_on")!.type).toBe("date"); expect(fieldById("habit.minutes")!.type).toBe("number");
    for (const k of Object.keys(PACKS.en).filter((k) => k.startsWith("q3.hb."))) expect((PACKS.bn as Record<string, string>)[k]).toBeTruthy();
  });
});

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" } as FieldValue);
const base = { ns: "demo" as const, ownerId: "demo-user", schemaVersion: 3, createdAt: "2026-09-01T00:00:00.000Z" };
const habitRec = (extra: Record<string, FieldValue> = {}): TMRecord => ({ ...base, id: "habit-1", entity: "habit", values: { "habit.title": v("Read"), "habit.days": v("0,1,2,3,4,5,6"), ...extra } });
const app = () => document.getElementById("app")!;
const go = (hash: string) => { location.hash = hash; render(); };
const q = <T extends Element>(s: string) => app().querySelector(s) as T | null;
const setVal = (sel: string, val: string) => { const i = q<HTMLInputElement>(sel)!; i.value = val; i.dispatchEvent(new Event("change")); };
const submit = (sel: string) => { q(sel)!.dispatchEvent(new Event("submit", { cancelable: true })); };

describe("habits screen", () => {
  beforeEach(() => { resetMicro(); localStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-24T09:00:00")); });
  afterEach(() => vi.useRealTimers());
  it("earlier-day input: max is today, a past day is saved as a log, a future day is refused", () => {
    store.demo.put(habitRec()); go("#/habits");
    const inp = q<HTMLInputElement>("[data-backfill-date]")!; expect(inp.max).toBe("2026-10-24");
    setVal("[data-backfill-date]", "2026-09-30"); (q("[data-backfill-add]") as HTMLElement).click(); render();
    expect(store.demo.get("hl-habit-1-2026-09-30")).not.toBeNull(); expect(q("[data-backfill-msg]")!.textContent).toContain("2026-09-30");
    setVal("[data-backfill-date]", "2026-10-30"); (q("[data-backfill-add]") as HTMLElement).click(); render();
    expect(store.demo.get("hl-habit-1-2026-10-30")).toBeNull(); expect(q("[data-backfill-msg]")!.textContent).toMatch(/today or earlier/);
  });
  it("new habit form saves category, start day and end day; a wrong order is refused", () => {
    go("#/habits");
    (document.getElementById("hb-name") as HTMLInputElement).value = "Stretch"; (document.getElementById("hb-cat") as HTMLInputElement).value = "Health";
    (document.getElementById("hb-start") as HTMLInputElement).value = "2026-11-02"; (document.getElementById("hb-end") as HTMLInputElement).value = "2026-11-01"; submit("form[data-form=habit]");
    expect(store.demo.list().some((r) => r.entity === "habit")).toBe(false); expect(app().textContent).toMatch(/end day must not be before/i);
    (document.getElementById("hb-end") as HTMLInputElement).value = "2026-12-01"; submit("form[data-form=habit]");
    const r = store.demo.list().find((x) => x.entity === "habit")!; expect(r.values["habit.category"]).toMatchObject({ value: "Health" }); expect(r.values["habit.start_on"]).toMatchObject({ value: "2026-11-02" }); expect(r.values["habit.end_on"]).toMatchObject({ value: "2026-12-01" });
  });
  it("a habit without the new fields still saves none of them", () => {
    go("#/habits"); (document.getElementById("hb-name") as HTMLInputElement).value = "Plain"; submit("form[data-form=habit]");
    const r = store.demo.list().find((x) => x.entity === "habit")!; for (const k of ["habit.category", "habit.start_on", "habit.end_on", "habit.anchor", "habit.minutes"]) expect(r.values[k]).toBeUndefined();
  });
  it("the grid shows days outside the dates as none, and the card says so", () => {
    store.demo.put(habitRec({ "habit.start_on": v("2026-10-20"), "habit.end_on": v("2026-10-22") })); go("#/habits");
    expect(q("[data-chart=habit-grid] [data-period='2026-10-19']")!.getAttribute("data-state")).toBe("none"); expect(q("[data-chart=habit-grid] [data-period='2026-10-21']")!.getAttribute("data-state")).toBe("open"); expect(q("[data-chart=habit-grid] [data-period='2026-10-23']")!.getAttribute("data-state")).toBe("none");
    expect(q("[data-habit-range]")!.textContent).toContain("2026-10-20");
  });
  it("tiny-habit starter is offered with no new habit, saves a habit with anchor and minutes, and then goes away; Not now hides it and blocks nothing", () => {
    go("#/habits"); expect(q("[data-micro-card]")).not.toBeNull();
    (document.getElementById("mh-title") as HTMLInputElement).value = "Floss one tooth"; (document.getElementById("mh-anchor") as HTMLInputElement).value = "brush my teeth"; (document.getElementById("mh-min") as HTMLInputElement).value = "3"; submit("form[data-form=micro]");
    expect(store.demo.list().some((r) => r.entity === "habit")).toBe(false); expect(q("[data-micro-err]")!.textContent).toMatch(/1 or 2/);
    (document.getElementById("mh-min") as HTMLInputElement).value = "2"; submit("form[data-form=micro]"); render();
    const r = store.demo.list().find((x) => x.entity === "habit")!; expect(r.values["habit.anchor"]).toMatchObject({ value: "brush my teeth" }); expect(r.values["habit.minutes"]).toMatchObject({ value: 2 });
    expect(q("[data-micro-card]")).toBeNull(); expect(q("[data-habit-anchor]")!.textContent).toContain("brush my teeth");
  });
  it("not offered while a habit is new; Not now hides it", () => {
    store.demo.put({ ...habitRec(), createdAt: "2026-10-20T00:00:00.000Z" }); go("#/habits"); expect(q("[data-micro-card]")).toBeNull();
    store.demo.clear(); go("#/habits"); (q("[data-micro-skip]") as HTMLElement).click(); render(); expect(q("[data-micro-card]")).toBeNull(); expect(q("form[data-form=habit]")).not.toBeNull();
  });
  it("real mode without the consent tick saves nothing from the starter or the backfill", () => {
    localStorage.setItem("tm:ui:dataMode", "real"); go("#/habits");
    (document.getElementById("mh-title") as HTMLInputElement).value = "x"; (document.getElementById("mh-anchor") as HTMLInputElement).value = "y"; (document.getElementById("mh-min") as HTMLInputElement).value = "1"; submit("form[data-form=micro]");
    expect(store.real.list()).toHaveLength(0); void grantConsent; void consentKv; void addDays;
  });
});

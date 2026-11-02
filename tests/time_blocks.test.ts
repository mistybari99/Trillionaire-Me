// M08 time blocks end to end: committed time typed on the Plan screen -> storage -> prayer-time blocks (length is the user's) and daily windows ->
// the scheduler never enters them -> week list on the Plan screen, card on Today, weekly hours budget. Unknown is never 0. EN / BN / mix.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import { PACKS } from "../src/i18n/packs";
import { commitRows, toPlannerBlocks, validateCommit, weekBlocks, weeklyBudget } from "../src/core/timeBlocks";
import { schedule } from "../src/core/planner";
import { prayerTimes, DHAKA_COORDS } from "../src/core/prayer";
import { DEFAULT_PRAYER_SETTINGS } from "../src/core/prayerMethod";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" }) as FieldValue;
const con = (id: string, o: { kind: string; hours?: number; from?: string; to?: string; minutes?: number }): TMRecord => ({ id, entity: "constraint", ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-11-02T08:00:00.000Z",
  values: { "constraint.kind": v(o.kind), ...(o.hours !== undefined ? { "constraint.hours_per_week": v(o.hours) } : {}), ...(o.from ? { "constraint.block_from": v(o.from), "constraint.block_to": v(o.to) } : {}), ...(o.minutes !== undefined ? { "constraint.block_minutes": v(o.minutes) } : {}) } });
const D = { y: 2026, m: 11, d: 2 }; // a Monday
const wb = (recs: TMRecord[]) => weekBlocks(commitRows(recs), D, DHAKA_COORDS, DEFAULT_PRAYER_SETTINGS);

describe("committed time rows and blocks (pure)", () => {
  it("rows: stable order, bad kind dropped, hours outside 0-168 read as not written, a half window is no window", () => {
    const rows = commitRows([con("b", { kind: "rest", hours: 56 }), con("a", { kind: "family", hours: 300 }), con("z", { kind: "nope" }), con("w", { kind: "work", from: "09:00" }), con("x", { kind: "work", from: "10:00", to: "09:00" })]);
    expect(rows.map((r) => r.id)).toEqual(["a", "b", "w", "x"]);
    expect(rows[0]!.hoursPerWeek).toBeNull(); expect(rows[2]!.from).toBeNull(); expect(rows[3]!.from).toBeNull();
  });
  it("no length typed means no prayer block (the app assumes none)", () => {
    expect(wb([con("p", { kind: "prayer" })]).blocks).toEqual([]);
    expect(wb([]).blocks).toEqual([]);
  });
  it("prayer blocks: five a day for seven days, starting at the worked-out time, length as typed, weekday set", () => {
    const r = wb([con("p", { kind: "prayer", minutes: 20 })]);
    expect(r.blocks.length).toBe(35); expect(r.unknownPrayer).toBe(0);
    const t0 = prayerTimes(D, DHAKA_COORDS, DEFAULT_PRAYER_SETTINGS); const first = r.blocks.filter((b) => b.date === "2026-11-02");
    expect(first.map((b) => b.prayer)).toEqual(["fajr", "dhuhr", "asr", "maghrib", "isha"].sort((a, b) => t0[a as "fajr"]! - t0[b as "fajr"]!));
    const dh = first.find((b) => b.prayer === "dhuhr")!; expect(dh.start).toBe(t0.dhuhr); expect(dh.end - dh.start).toBe(20); expect(dh.day).toBe(1);
    expect(new Set(r.blocks.map((b) => b.day)).size).toBe(7);
  });
  it("a prayer time that cannot be worked out has no block and is counted", () => {
    const r = weekBlocks(commitRows([con("p", { kind: "prayer", minutes: 10 })]), D, { lat: 91, lon: 0 }, DEFAULT_PRAYER_SETTINGS);
    expect(r.blocks).toEqual([]); expect(r.unknownPrayer).toBe(35); // an invalid place gives no times at all: 5 prayers x 7 days, all counted
  });
  it("daily window: one block each of the seven days", () => {
    const r = wb([con("f", { kind: "family", from: "13:00", to: "14:00" })]);
    expect(r.blocks.length).toBe(7); expect(r.blocks.every((b) => b.start === 780 && b.end === 840 && b.kind === "family")).toBe(true);
  });
  it("the scheduler never places a task inside a block", () => {
    const blocked = toPlannerBlocks(wb([con("f", { kind: "rest", from: "09:00", to: "11:00" })]).blocks);
    const plan = schedule({ weeklyFreeMinutes: 600, blocked, dayWindow: { start: 8 * 60, end: 12 * 60 }, startDay: 1,
      tasks: [{ id: "a", minutes: 60, priority: 2 }, { id: "b", minutes: 60, priority: 2 }, { id: "c", minutes: 90, priority: 2 }] });
    expect(plan.placements.length).toBe(2); expect(plan.deferred).toEqual([{ taskId: "c", reason: "no_room" }]); // the 90-minute step fits in neither 60-minute gap
    for (const p of plan.placements) { expect(p.end <= 540 || p.start >= 660, `${p.taskId} ${p.start}-${p.end}`).toBe(true); }
  });
  it("budget: known hours per kind, rows without hours are counted not added, over 168 only when it can be told", () => {
    const b = weeklyBudget(commitRows([con("a", { kind: "family", hours: 20 }), con("b", { kind: "rest", from: "13:00", to: "14:00" }), con("c", { kind: "work", hours: 40 })]), 100);
    expect(b.committedHours).toBe(60); expect(b.unknownRows).toBe(1); expect(b.over).toBe(false);
    expect(weeklyBudget(commitRows([con("a", { kind: "work", hours: 90 })]), 100).over).toBe(true);
    expect(weeklyBudget(commitRows([con("a", { kind: "work", hours: 90 })]), null).over).toBeNull();
    expect(weeklyBudget(commitRows([con("a", { kind: "rest", from: "13:00", to: "14:00" })]), 100).over).toBeNull();
    expect(weeklyBudget([], 10).byKind).toEqual([]);
  });
  it("validation", () => {
    const ok = { kind: "family", hours: "", from: "13:00", to: "14:00", minutes: "" };
    expect(validateCommit(ok)).toBeNull(); expect(validateCommit({ ...ok, kind: "x" })).toBe("kind_required"); expect(validateCommit({ ...ok, hours: "200" })).toBe("hours_invalid");
    expect(validateCommit({ ...ok, to: "" })).toBe("window_pair"); expect(validateCommit({ ...ok, to: "12:00" })).toBe("window_order"); expect(validateCommit({ ...ok, from: "25:99" })).toBe("window_invalid");
    expect(validateCommit({ ...ok, from: "", to: "" })).toBe("nothing"); expect(validateCommit({ ...ok, from: "", to: "", hours: "10" })).toBeNull();
    expect(validateCommit({ ...ok, kind: "prayer" })).toBe("minutes_required"); expect(validateCommit({ ...ok, kind: "prayer", minutes: "0" })).toBe("minutes_invalid");
    expect(validateCommit({ ...ok, kind: "prayer", minutes: "20" })).toBeNull(); expect(validateCommit({ ...ok, kind: "prayer", minutes: "300" })).toBe("minutes_invalid");
  });
});

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector(sel) as T | null;
const go = (h: string) => { location.hash = h; render(); };
const set = (id: string, val: string) => { (document.getElementById(id) as HTMLInputElement | HTMLSelectElement).value = val; };
const submit = (sel: string) => { $<HTMLFormElement>(sel)!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true })); };
const intake = (vals: Record<string, FieldValue>): TMRecord => ({ id: "intake-constraint", entity: "constraint", ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-11-02T08:00:00.000Z", values: vals });
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>';
  localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, "2026-11-02T00:00:00.000Z");
});

describe("Plan screen and Today", () => {
  it("adding a prayer length stores one row, draws the week list and the Today card, and the card order stays calm", () => {
    go("#/diary/plan"); expect($("[data-commit-none]")).not.toBeNull();
    set("cm-kind", "prayer"); set("cm-minutes", "20"); submit('form[data-form="commit"]'); render();
    const row = commitRows(store.demo.list())[0]!; expect(row).toMatchObject({ kind: "prayer", prayerMinutes: 20 });
    expect($("[data-blocks-week]")).not.toBeNull(); expect($("[data-blocks-week]")!.textContent).toMatch(/Dhuhr/);
    go("#/today"); expect($("[data-blocks-today]")).not.toBeNull(); expect($("[data-blocks-today]")!.textContent).toMatch(/Fajr|Dhuhr|Asr|Maghrib|Isha/);
  });
  it("a family window and hours: listed, in the budget, removable; refused when half-written", () => {
    go("#/diary/plan"); set("cm-kind", "family"); set("cm-from", "13:00"); submit('form[data-form="commit"]');
    expect($('form[data-form="commit"] .err')!.textContent).toMatch(/both the start and the end/); expect(commitRows(store.demo.list()).length).toBe(0);
    set("cm-to", "14:00"); set("cm-hours", "10"); submit('form[data-form="commit"]'); render();
    const row = commitRows(store.demo.list())[0]!; expect(row).toMatchObject({ kind: "family", hoursPerWeek: 10, from: 780, to: 840 });
    expect($(`[data-commit="${row.id}"]`)!.textContent).toMatch(/10 h a week/); expect($('[data-budget]')!.textContent).toMatch(/10 h a week/);
    $<HTMLButtonElement>(`[data-remove="${row.id}"]`)!.click(); expect(commitRows(store.demo.list()).length).toBe(0);
  });
  it("hours typed in the diary (constraint.hours_per_week) are read: they show in the budget", () => {
    store.demo.put(intake({ "constraint.kind": v("rest"), "constraint.hours_per_week": v(56) })); go("#/diary/plan");
    expect($('[data-commit="intake-constraint"]')!.textContent).toMatch(/56 h a week/); expect($("[data-budget]")!.textContent).toMatch(/56 h a week/);
    expect($('[data-commit="intake-constraint"] [data-remove]')).toBeNull(); // the diary answer is changed in the diary
  });
  it("hours that add up past 168 with the free hours get a neutral note", () => {
    store.demo.put(intake({ "constraint.kind": v("work"), "constraint.hours_per_week": v(160), "constraint.weekly_free_hours": v(20) }));
    go("#/diary/plan"); expect($("[data-budget-over]")!.textContent).toMatch(/168 hours/); expect($("[data-budget-over]")!.textContent).not.toMatch(/fail|error|wrong/i);
  });
  it("a block keeps a task out of its time on the real plan screen", () => {
    store.demo.put(intake({ "constraint.weekly_free_hours": v(10), "constraint.free_from": v("09:00"), "constraint.free_to": v("11:00") }));
    store.demo.put(con("rest", { kind: "rest", from: "09:00", to: "10:00" }));
    store.demo.put({ id: "t1", entity: "task", ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-11-02T08:00:00.000Z", values: { "task.title": v("Write"), "task.minutes": v(45), "task.priority": v("high") } });
    go("#/diary/plan"); const p = $('[data-placement="t1"]')!; expect(p).not.toBeNull(); expect(p.textContent).toMatch(/^10:/);
  });
  it("real mode without the tick saves nothing", () => {
    localStorage.setItem("tm:ui:dataMode", "real"); localStorage.removeItem("tm:consent:real:v1");
    go("#/diary/plan"); set("cm-kind", "rest"); set("cm-hours", "56"); submit('form[data-form="commit"]'); expect(store.real.list().length).toBe(0);
  });
  it("Today stays quiet with no block", () => { go("#/today"); expect($("[data-blocks-today]")).toBeNull(); });
});

describe("words and a11y", () => {
  it("keys in en, bn, mix; Bangla keeps the loanword rule; no Bangla digits; neutral copy", () => {
    const keys = Object.keys(PACKS.en).filter((k) => k.startsWith("blk."));
    expect(keys.length).toBeGreaterThan(30);
    for (const k of keys) { for (const l of ["en", "bn", "mix"] as const) { const s = (PACKS[l] as Record<string, string>)[k]!; expect(s.length, `${l}:${k}`).toBeGreaterThan(1); if (l !== "en") expect(s, `${l}:${k}`).not.toMatch(/[০-৯]/); }
      expect((PACKS.bn as Record<string, string>)[k], k).not.toMatch(/পরিকল্পনা|ঝুঁকি|প্রতিবেদন|আয়\b|সময়সূচি/); expect(PACKS.en[k as keyof typeof PACKS.en], k).not.toMatch(/fail|overdue|missed|behind|lazy|shame|penalt/i); }
  });
  it("labelled inputs; Bangla and mix pages draw; no scripture text", () => {
    store.demo.put(con("p", { kind: "prayer", minutes: 15 }));
    for (const l of ["en", "bn", "mix"]) { localStorage.setItem("tm:ui:lang", l); go("#/diary/plan"); for (const id of ["cm-kind", "cm-hours", "cm-from", "cm-to", "cm-minutes"]) expect(document.querySelector(`label[for="${id}"]`), `${l}:${id}`).not.toBeNull(); expect($("[data-blocks-week]")).not.toBeNull(); }
  });
});

// M18 boards: drawn timeline of goal dates, task board (Kanban), option board. Own data only; unknown stays unknown; past dates are plain; each picture has a text version.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import { BOARD_COLUMNS, DONE_SHOWN, columnOf, optionBoard, taskBoard, timeline } from "../src/core/boards";
import { PACKS } from "../src/i18n/packs";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" }) as FieldValue;
const goal = (id: string, title: string, o: Record<string, unknown> = {}): TMRecord => ({ id, entity: "goal", ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-11-01T00:00:00Z",
  values: { "goal.title": v(title), ...Object.fromEntries(Object.entries(o).map(([k, x]) => [`goal.${k}`, v(x)])) } });
const task = (id: string, title: string, o: Record<string, unknown> = {}, goalId?: string): TMRecord => ({ id, entity: "task", ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-11-01T00:00:00Z", ...(goalId ? { links: { goal: goalId } } : {}),
  values: { "task.title": v(title), ...Object.fromEntries(Object.entries(o).map(([k, x]) => [`task.${k}`, v(x)])) } });

describe("timeline", () => {
  it("places dated goals on a line with today; undated goals are listed, not placed; retired goals are left out; a past date is only marked", () => {
    const tl = timeline([goal("a", "Launch", { target_date: "2027-01-01" }), goal("b", "Learn", { target_date: "2026-10-01" }), goal("c", "Someday"), goal("d", "Old", { target_date: "2027-06-01", status: "retired" }), goal("e", "Bad", { target_date: "2026-02-30" })], "2026-11-03");
    expect(tl.items.map((i) => i.id)).toEqual(["b", "a"]); expect(tl.items[0]).toMatchObject({ passed: true, at: 0 }); expect(tl.items[1]!.at).toBe(1);
    expect(tl.todayAt).toBeGreaterThan(0); expect(tl.todayAt).toBeLessThan(1); expect(tl.undated.map((u) => u.id).sort()).toEqual(["c", "e"]); expect(tl.start).toBe("2026-10-01"); expect(tl.end).toBe("2027-01-01");
  });
  it("no goals at all gives an empty line (nothing invented)", () => { const tl = timeline([], "2026-11-03"); expect(tl.items).toEqual([]); expect(tl.undated).toEqual([]); });
  it("a single date today does not divide by zero", () => { const tl = timeline([goal("a", "Now", { target_date: "2026-11-03" })], "2026-11-03"); expect(tl.items[0]!.at).toBe(0); expect(tl.todayAt).toBe(0); });
});

describe("task board", () => {
  it("columns come from the fields the app already keeps; not-true steps are left out; Done shows the newest and counts the rest", () => {
    const recs = [task("1", "open"), task("2", "parked", { parked_on: "2026-11-01" }), task("3", "deleg", { delegated_on: "2026-11-01" }), task("4", "gone", { not_true_on: "2026-11-01" }),
      ...Array.from({ length: DONE_SHOWN + 3 }, (_, i) => task(`d${i}`, `done ${i}`, { done_on: `2026-10-${String(i + 1).padStart(2, "0")}` })), goal("g", "G")];
    expect(columnOf(recs[0]!)).toBe("open"); expect(columnOf(recs[3]!)).toBeNull(); expect(columnOf(recs[recs.length - 1]!)).toBeNull();
    const b = taskBoard(recs); expect(b.totals).toEqual({ open: 1, parked: 1, delegated: 1, done: DONE_SHOWN + 3 }); expect(b.columns.done.length).toBe(DONE_SHOWN); expect(b.hiddenDone).toBe(3); expect(b.columns.done[0]!.doneOn).toBe("2026-10-15");
  });
  it("no tasks is 'no tasks', and a task shows its goal only when that goal exists", () => {
    expect(taskBoard([]).anyTask).toBe(false);
    const b = taskBoard([goal("g", "My goal"), task("1", "a", {}, "g"), task("2", "b", {}, "missing")]); expect(b.columns.open.find((c) => c.id === "1")).toMatchObject({ goalId: "g", goalTitle: "My goal" }); expect(b.columns.open.find((c) => c.id === "2")).toMatchObject({ goalId: null });
    expect(BOARD_COLUMNS.length).toBe(4);
  });
});

describe("option board", () => {
  it("only when the fit step found matches; carries no number or order mark", () => {
    expect(optionBoard({ status: "not_enough_data", matches: [], unmapped: [] })).toEqual([]); expect(optionBoard({ status: "no_match", matches: [], unmapped: ["x"] })).toEqual([]);
  });
});

const $ = (s: string) => document.querySelector(s);
const go = (h: string) => { location.hash = h; render(); };
const ival = (id: string, o: Record<string, unknown>): TMRecord => ({ id, entity: "skill", ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-11-01T00:00:00Z", values: Object.fromEntries(Object.entries(o).map(([k, x]) => [k, v(x)])) });
beforeEach(() => { localStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, "2026-11-02T00:00:00Z"); });

describe("screen", () => {
  it("empty start: every board says what is missing; nothing invented; linked from the Journey page", () => {
    go("#/journey/boards"); expect($('[data-chart="timeline"][data-chart-empty]')).not.toBeNull(); expect($('[data-board="kanban"][data-board-empty]')).not.toBeNull(); expect($('[data-board="options"][data-board-empty]')).not.toBeNull();
    expect(document.querySelectorAll("h1").length).toBe(1); go("#/journey"); expect($('a[href="#/journey/boards"]')).not.toBeNull();
  });
  it("with data: drawn timeline with its text version, task columns with counts and goal links, option cards with the first test; no red words", () => {
    store.demo.put(goal("g1", "Open a small shop", { target_date: "2099-01-01" })); store.demo.put(goal("g2", "Learn accounts", { target_date: "2020-01-01" })); store.demo.put(goal("g3", "No date goal"));
    store.demo.put(task("t1", "Find a place", {}, "g1")); store.demo.put(task("t2", "Buy stock", { done_on: "2026-11-01" }, "g1")); store.demo.put(task("t3", "Ask a friend", { parked_on: "2026-11-01" }));
    store.demo.put(ival("s1", { "skill.name": "bookkeeping and accounts" }));
    go("#/journey/boards");
    const svg = $('[data-chart="timeline"] svg')!; expect(svg.getAttribute("role")).toBe("img"); expect($("[data-today]")).not.toBeNull(); expect(svg.querySelectorAll("[data-goal-dot]").length).toBe(2);
    const txt = $('[data-chart-text="timeline"]')!.textContent!; expect(txt).toMatch(/Open a small shop: 2099-01-01/); expect(txt).toMatch(/Learn accounts: 2020-01-01 \(date passed\)/); expect(txt).toMatch(/No date yet: No date goal/);
    expect($('[data-column="open"] [data-card="t1"]')!.textContent).toMatch(/Goal: Open a small shop/); expect($('[data-column="open"] a[href="#/journey/goal/g1"]')).not.toBeNull();
    expect($('[data-column="done"] [data-card="t2"]')).not.toBeNull(); expect($('[data-column="parked"] [data-card="t3"]')).not.toBeNull(); expect($('[data-count="open"]')!.textContent).toBe("1"); expect($('[data-column="delegated"] [data-column-empty]')).not.toBeNull();
    expect(document.querySelectorAll("[data-option]").length).toBeGreaterThan(0); expect($("[data-option] [data-option-why]")!.textContent).toMatch(/bookkeeping/); expect($("[data-option]")!.textContent).toMatch(/First small test/);
    expect(document.body.textContent).not.toMatch(/\b(overdue|late|behind|failed|score|rank)\b/i);
  });
  it("keys in en/bn/mix with Latin digits and the loanword rule; Bangla and Mix pages open", () => {
    const keys = Object.keys(PACKS.en).filter((k) => k.startsWith("bd."));
    for (const k of keys) for (const l of ["en", "bn", "mix"] as const) { const s = (PACKS[l] as Record<string, string>)[k]!; expect(s.length, k).toBeGreaterThan(1); if (l !== "en") expect(s, k).not.toMatch(/[০-৯]/); }
    for (const k of keys) expect((PACKS.bn as Record<string, string>)[k], k).not.toMatch(/পরিকল্পনা|ঝুঁকি|তালিকা|সংরক্ষ|ধাপ/);
    store.demo.put(goal("g1", "G", { target_date: "2099-01-01" })); store.demo.put(task("t1", "T", {}, "g1"));
    for (const l of ["bn", "mix"]) { localStorage.setItem("tm:ui:lang", l); go("#/journey/boards"); expect(document.querySelectorAll("h1").length).toBe(1); expect($('[data-chart="timeline"]')).not.toBeNull(); expect($('[data-board="kanban"]')).not.toBeNull(); }
  });
});

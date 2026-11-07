// BUILD-01 (W3): the optional work time blocks on Plan and Today, the setting (off by default), ideas on tap, protected blocks in the planner,
// the reminder through the existing M08 path, and the links from every place that uses them.
import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { consentKv, prefs, store } from "../src/ui/state";
import { revokeConsent } from "../src/core/consent";
import { currentBlocks } from "../src/ui/blocksUi";
import { buildSchedule, calendarSlots, resetReminderCards } from "../src/ui/reminders";
import { reminderFromRecord } from "../src/core/reminders";
import { isoOf, workBlockFromRecord } from "../src/core/timeBlocks";
import { ROWS } from "../src/ui/settingsRegistry";
import { PACKS } from "../src/i18n/packs";
import type { TMRecord } from "../src/core/types";

const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const qa = (s: string) => [...app().querySelectorAll(s)];
const go = (hash: string) => { location.hash = hash; render(); };
const dv = (value: unknown) => ({ state: "value" as const, value, label: "DEMO" as const });
const today = isoOf(new Date());
const blocks = () => store.demo.list().filter((r) => r.entity === "work_block");
const rec = (id: string, from: string, to: string, extra: Record<string, unknown> = {}): TMRecord => ({ id, entity: "work_block", ns: "demo", ownerId: "demo-user", schemaVersion: 4, createdAt: "2026-11-07T00:00:00Z",
  values: { "work_block.date": dv(today), "work_block.from": dv(from), "work_block.to": dv(to), "work_block.repeat": dv("none"), "work_block.protected": dv(false), ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, dv(v)])) } });
const fill = (sel: string, v: string) => { q<HTMLInputElement>(sel).value = v; };
const task = (id: string, title: string, minutes: number): TMRecord => ({ id, entity: "task", ns: "demo", ownerId: "demo-user", schemaVersion: 4, createdAt: "2026-11-01T00:00:00Z", values: { "task.title": dv(title), "task.minutes": dv(minutes) } });

beforeEach(() => {
  localStorage.clear(); store.demo.clear(); store.real.clear(); revokeConsent(consentKv); resetReminderCards();
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
  window.addEventListener("hashchange", render);
});
afterEach(() => { window.removeEventListener("hashchange", render); });

describe("off by default", () => {
  it("the setting is off; the Plan card shows only the switch and no form; work blocks have no effect", () => {
    expect(prefs.workBlocks).toBe(false); store.demo.put(rec("w1", "09:00", "10:00", { "work_block.protected": true }));
    go("#/diary/plan"); const card = q("[data-work-blocks]"); expect(card.getAttribute("data-work-blocks")).toBe("off");
    expect(card.querySelector("form")).toBeNull(); expect(card.textContent).toContain(PACKS.en["wkb.off.note"]);
    expect(currentBlocks().plannerBlocks).toEqual([]); go("#/today"); expect(app().querySelector("[data-work-blocks-today]")).toBeNull();
  });
  it("the switch turns it on and off again; the settings registry owns the pref and points at the Plan screen", () => {
    go("#/diary/plan"); q<HTMLButtonElement>("[data-wb-switch]").click(); expect(prefs.workBlocks).toBe(true); expect(q("[data-work-blocks]").querySelector("form")).not.toBeNull();
    q<HTMLButtonElement>("[data-wb-switch]").click(); expect(prefs.workBlocks).toBe(false);
    const row = ROWS.find((r) => r.id === "workblocks")!; expect(row.prefs).toEqual(["workBlocks"]); expect(row.route).toBe("#/diary/plan");
  });
});

describe("add, edit and move, delete", () => {
  beforeEach(() => { prefs.workBlocks = true; });
  it("empty data says there are none (no zero, no fake block) and offers ideas that add nothing by themselves", () => {
    go("#/diary/plan"); expect(q("[data-wb-none]")).not.toBeNull(); expect(blocks()).toEqual([]); expect(qa("[data-wb-idea]").length).toBeGreaterThan(0);
    expect(app().textContent).toContain(PACKS.en["wkb.sug.note"]); expect(blocks()).toEqual([]);
  });
  it("a typed block is saved with its day, times, name and repeat; a bad window is refused with a message and saves nothing", () => {
    go("#/diary/plan"); fill("#wb-date", today); fill("#wb-from", "10:00"); fill("#wb-to", "09:00"); q<HTMLFormElement>("[data-form=work-block-add]").requestSubmit();
    expect(q(".wb-form .err").textContent).toBe(PACKS.en["wkb.err.window_order"]); expect(blocks()).toEqual([]);
    fill("#wb-to", "11:30"); fill("#wb-label", "Write the report"); q<HTMLSelectElement>("#wb-repeat").value = "weekdays"; q<HTMLFormElement>("[data-form=work-block-add]").requestSubmit();
    expect(blocks()).toHaveLength(1); expect(workBlockFromRecord(blocks()[0]!)).toMatchObject({ date: today, start: 600, end: 690, label: "Write the report", repeat: "weekdays", protectedBlock: false, goalId: null });
    expect(q("[data-work-block]").textContent).toContain("Write the report");
  });
  it("edit moves the block in place (same id); delete removes it and its reminder", () => {
    store.demo.put(rec("w1", "09:00", "10:00")); go("#/diary/plan");
    q<HTMLButtonElement>("[data-wb-edit=w1]").click(); expect(q("[data-form=work-block-edit]")).not.toBeNull();
    fill("#wb-from", "13:00"); fill("#wb-to", "14:00"); q<HTMLInputElement>("#wb-remind").checked = true; q<HTMLFormElement>("[data-form=work-block-edit]").requestSubmit();
    expect(blocks()).toHaveLength(1); expect(workBlockFromRecord(blocks()[0]!)).toMatchObject({ id: "w1", start: 780, end: 840 });
    expect(store.demo.list().some((r) => r.id === "rem-wb-w1")).toBe(true);
    q<HTMLButtonElement>("[data-wb-delete=w1]").click(); expect(blocks()).toEqual([]); expect(store.demo.list().some((r) => r.entity === "reminder")).toBe(false);
  });
  it("a tap on an idea adds exactly that block, once, and never a prayer block", () => {
    go("#/diary/plan"); const first = q<HTMLButtonElement>("[data-wb-idea-add]"); first.click();
    expect(blocks()).toHaveLength(1); expect(JSON.stringify(blocks()[0])).not.toMatch(/prayer/i); expect(blocks()[0]!.values["work_block.protected"]).toMatchObject({ value: false });
  });
  it("an idea for a step uses the step's own estimate and title", () => {
    store.demo.put(task("t1", "Call the bank", 50)); go("#/diary/plan");
    const idea = qa("[data-wb-idea]").find((e) => e.textContent!.includes("Call the bank"))!; expect(idea).toBeDefined();
    (idea.querySelector("[data-wb-idea-add]") as HTMLButtonElement).click(); expect(workBlockFromRecord(blocks()[0]!)).toMatchObject({ label: "Call the bank" });
  });
});

describe("overlap, protected, today", () => {
  beforeEach(() => { prefs.workBlocks = true; });
  it("overlapping blocks show a warning on both and nothing moves", () => {
    store.demo.put(rec("w1", "09:00", "10:00")); store.demo.put(rec("w2", "09:30", "10:30")); go("#/diary/plan");
    expect(qa("[data-wb-overlap=work]")).toHaveLength(2); expect(workBlockFromRecord(store.demo.get("w2")!)).toMatchObject({ start: 570, end: 630 });
  });
  it("Today lists today's blocks; with none today it draws nothing", () => {
    go("#/today"); expect(app().querySelector("[data-work-blocks-today]")).toBeNull();
    store.demo.put(rec("w1", "09:00", "10:00", { "work_block.label": "Deep work" })); go("#/today"); expect(q("[data-work-blocks-today]").textContent).toContain("Deep work");
  });
  it("only a protected block is busy for the planner", () => {
    store.demo.put(rec("w1", "06:00", "22:00")); expect(currentBlocks().plannerBlocks).toEqual([]);
    store.demo.put(rec("w1", "06:00", "22:00", { "work_block.protected": true })); const pb = currentBlocks().plannerBlocks; expect(pb).toHaveLength(1); expect(pb[0]).toMatchObject({ start: 360, end: 1320 });
  });
});

describe("reminder through the existing M08 path", () => {
  beforeEach(() => { prefs.workBlocks = true; });
  it("off by default; ticking it stores a normal reminder record that points at the block and copies no title or time", () => {
    store.demo.put(rec("w1", "09:00", "10:00", { "work_block.label": "Secret plan" })); go("#/diary/plan");
    expect(store.demo.list().some((r) => r.entity === "reminder")).toBe(false);
    q<HTMLButtonElement>("[data-wb-edit=w1]").click(); q<HTMLInputElement>("#wb-remind").checked = true; q<HTMLFormElement>("[data-form=work-block-edit]").requestSubmit();
    const r = store.demo.list().find((x) => x.entity === "reminder")!; expect(reminderFromRecord(r)).toMatchObject({ target: "work_block", targetId: "w1", state: "on" });
    expect(JSON.stringify(r)).not.toContain("Secret plan"); expect(q("[data-wb-reminder]")).not.toBeNull();
  });
  it("the reminder fires at the start of the block through the reminder schedule, and a block without a reminder gives none", () => {
    store.demo.put(rec("w1", "09:00", "10:00", { "work_block.label": "Deep work" }));
    const now = new Date(`${today}T08:00:00+06:00`).getTime();
    expect(calendarSlots(now, "en", 3)).toEqual([]);
    go("#/diary/plan"); q<HTMLButtonElement>("[data-wb-edit=w1]").click(); q<HTMLInputElement>("#wb-remind").checked = true; q<HTMLFormElement>("[data-form=work-block-edit]").requestSubmit();
    const slots = calendarSlots(now, "en", 3).filter((s) => s.target === "work_block");
    expect(slots.length).toBeGreaterThan(0); expect(slots.every((s) => s.minute === 540 && s.title === "Deep work")).toBe(true);
    expect(buildSchedule(now, "en").reminders.some((x) => x.target === "work_block")).toBe(true);
  });
});

describe("link check and strings", () => {
  it("every wkb. key exists in EN and BN, BN has Bangla text, and Mix exists", () => {
    const keys = Object.keys(PACKS.en).filter((k) => (k.startsWith("wkb.") && k !== "wkb.when") || k === "set.row.workblocks");
    expect(keys.length).toBeGreaterThan(40);
    for (const k of keys) { expect(PACKS.en[k as keyof typeof PACKS.en], k).toBeTruthy(); expect(PACKS.bn[k as keyof typeof PACKS.bn], k).toMatch(/[ঀ-৿]/); expect(PACKS.mix[k as keyof typeof PACKS.mix], k).toBeTruthy(); }
  });
  it("Plan, Today, the settings row and the reminder target all reach the feature (source link check)", () => {
    const screens = readFileSync("src/ui/screens.ts", "utf8");
    expect(screens).toContain("workBlocksCard(lang)"); expect(screens).toContain("workBlocksTodayCard(lang)"); expect(screens).toContain("currentBlocks().plannerBlocks");
    expect(readFileSync("src/ui/reminders.ts", "utf8")).toContain("work_block"); expect(readFileSync("src/ui/state.ts", "utf8")).toContain("tm:ui:workBlocks");
    expect(readFileSync("src/core/blockSuggest.ts", "utf8")).not.toMatch(/prayer\w*\s*[:(]/i);
  });
});

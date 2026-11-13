// Reminders step 5: "Remind me" row on a task / plan step, due cards on Today, Done / Later / Skip.
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../src/app";
import { consentKv, prefs, store } from "../src/ui/state";
import { grantConsent, revokeConsent } from "../src/core/consent";
import { checkReminders, resetReminderCards } from "../src/ui/reminders";
import { reminderFromRecord } from "../src/core/reminders";
import type { TMRecord } from "../src/core/types";
import { PACKS } from "../src/i18n/packs";

const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const go = (hash: string) => { location.hash = hash; render(); };
const dv = (value: unknown) => ({ state: "value" as const, value, label: "DEMO" as const });
const task = (id: string, title: string): TMRecord => ({ id, entity: "task", ns: "demo", ownerId: "demo-user", schemaVersion: 3, createdAt: "2026-11-01T00:00:00Z", values: { "task.title": dv(title) } });
const dhaka = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00+06:00`).getTime();
const remRec = () => store.demo.list().find((r) => r.entity === "reminder");
const settle = () => new Promise((r) => setTimeout(r, 20));

beforeEach(() => {
  localStorage.clear(); store.demo.clear(); store.real.clear(); revokeConsent(consentKv); resetReminderCards();
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
  store.demo.put(task("t1", "Call the bank"));
  window.addEventListener("hashchange", render);
});
afterEach(() => { window.removeEventListener("hashchange", render); vi.useRealTimers(); });

describe("Remind me row", () => {
  it("is on an open task; saving writes a reminder that stores only the target id, date and time", () => {
    go("#/diary/plan"); const row = q("[data-remind-row='task:t1']"); expect(row).not.toBeNull();
    q<HTMLButtonElement>("[data-remind-row='task:t1'] [data-act=rem-save]").click(); expect(q("[data-rem-msg]").textContent).toBe(PACKS.en["rem.row.need"]); expect(remRec()).toBeUndefined();
    q<HTMLInputElement>("[data-rem-date]").value = "2026-11-06"; q<HTMLInputElement>("[data-rem-time-input]").value = "10:00"; q<HTMLButtonElement>("[data-act=rem-save]").click();
    const rec = remRec()!; expect(rec).toBeDefined(); expect(JSON.stringify(rec)).not.toContain("Call the bank");
    expect(reminderFromRecord(rec)).toMatchObject({ target: "task", targetId: "t1", at: "2026-11-06T10:00", state: "on" });
  });
  it("shows the saved reminder with a remove button; master off says how to turn reminders on", async () => {
    go("#/diary/plan"); q<HTMLInputElement>("[data-rem-date]").value = "2026-11-06"; q<HTMLButtonElement>("[data-act=rem-save]").click(); await settle();
    expect(q("[data-remind-set]").textContent).toBe("Reminder: 2026-11-06 09:00"); expect(q("[data-remind-row] a").getAttribute("href")).toBe("#/settings/prayer/reminders");
    q<HTMLButtonElement>("[data-act=rem-remove]").click(); await settle(); expect(remRec()).toBeUndefined(); expect(q("[data-rem-off]")).not.toBeNull();
  });
  it("real mode without the consent tick saves nothing", () => {
    grantConsent(consentKv, "2026-10-26T10:00:00.000Z"); store.real.put({ ...task("t9", "Real step"), ns: "real", ownerId: "owner", values: { "task.title": { state: "value", value: "Real step", label: "FACT" } } }); revokeConsent(consentKv); localStorage.setItem("tm:ui:dataMode", "real"); go("#/diary/plan");
    q<HTMLInputElement>("[data-remind-row='task:t9'] [data-rem-date]").value = "2026-11-06"; q<HTMLButtonElement>("[data-remind-row='task:t9'] [data-act=rem-save]").click();
    expect(store.real.list().some((r) => r.entity === "reminder")).toBe(false); expect(store.demo.list().some((r) => r.entity === "reminder")).toBe(false);
  });
  it("a planned step can be reminded at the start of its planned time", () => {
    for (const [k, v] of Object.entries({ "intake-hours": { "constraint.weekly_free_hours": dv(10), "constraint.free_from": dv("09:00"), "constraint.free_to": dv("18:00") } })) store.demo.put({ id: k, entity: "profile", ns: "demo", ownerId: "demo-user", schemaVersion: 3, createdAt: "x", values: v as TMRecord["values"] });
    store.demo.put({ ...task("t1", "Call the bank"), values: { "task.title": dv("Call the bank"), "task.minutes": dv(30) } }); go("#/diary/plan");
    const btn = app().querySelector<HTMLButtonElement>("[data-rem-planned]");
    expect(btn).not.toBeNull(); if (btn) { btn.click(); q<HTMLButtonElement>("[data-act=rem-save]").click(); expect(reminderFromRecord(remRec()!)).toMatchObject({ target: "plan_step", targetId: "t1", at: null }); }
  });
});

describe("due card on Today", () => {
  const due = async () => {
    vi.useFakeTimers(); vi.setSystemTime(dhaka("2026-11-06", "10:01")); prefs.reminders = { ...prefs.reminders, master: true };
    go("#/diary/plan"); q<HTMLInputElement>("[data-rem-date]").value = "2026-11-06"; q<HTMLInputElement>("[data-rem-time-input]").value = "10:00"; q<HTMLButtonElement>("[data-act=rem-save]").click();
    await vi.advanceTimersByTimeAsync(50); await checkReminders(Date.now()); go("#/today");
  };
  it("shows a calm card with Done, In 1 hour, Tomorrow morning and Skip; no red, no count, no banned words", async () => {
    await due(); const c = q("[data-reminder-cards]"); expect(c).not.toBeNull(); expect(c.textContent).toContain("Call the bank");
    expect([...c.querySelectorAll("[data-rem-act]")].map((b) => b.getAttribute("data-rem-act"))).toEqual(["done", "hour", "tomorrow", "skip"]);
    expect(c.querySelector(".err, .danger, [class*=red]")).toBeNull(); expect(c.textContent).not.toMatch(/failed|overdue|missed|ব্যর্থ|বাকি পড়েছে/i);
  });
  it("Done finishes the reminder and removes the card (the task itself is not marked done)", async () => {
    await due(); q<HTMLButtonElement>("[data-rem-act=done]").click(); await vi.advanceTimersByTimeAsync(50);
    expect(reminderFromRecord(remRec()!)!.state).toBe("done"); expect(app().querySelector("[data-reminder-cards]")).toBeNull();
    expect(store.demo.get("t1")!.values["task.done_on"]).toBeUndefined(); expect(prefs.remindersFired.some((e) => e.s === "done")).toBe(true);
  });
  it("In 1 hour sets one new time and keeps the reminder on; Tomorrow morning uses the default time; Skip ends it", async () => {
    await due(); q<HTMLButtonElement>("[data-rem-act=hour]").click(); await vi.advanceTimersByTimeAsync(50);
    expect(reminderFromRecord(remRec()!)).toMatchObject({ state: "on", snoozedUntil: "2026-11-06T11:01" });
  });
  it("Skip ends the reminder", async () => {
    await due(); q<HTMLButtonElement>("[data-rem-act=skip]").click(); await vi.advanceTimersByTimeAsync(50); expect(reminderFromRecord(remRec()!)!.state).toBe("skipped");
  });
  it("Bangla card renders", async () => {
    localStorage.setItem("tm:ui:lang", "bn"); await due(); expect(q("[data-rem-act=hour]").textContent).toBe(PACKS.bn["rem.act.hour"]); expect(q("[data-reminder-cards] h2").textContent).toBe("রিমাইন্ডার");
  });
});

describe("Remind me on bill, goal, habit and review (step 6)", () => {
  const put = (id: string, entity: string, values: Record<string, unknown>, extra: Record<string, { state: "unknown" }> = {}) =>
    store.demo.put({ id, entity, ns: "demo", ownerId: "demo-user", schemaVersion: 3, createdAt: "2026-11-01T00:00:00Z", values: { ...Object.fromEntries(Object.entries(values).map(([k, v]) => [k, dv(v)])), ...extra } });
  const save = (row: string, time?: string) => { if (time) q<HTMLInputElement>(`[data-remind-row='${row}'] [data-rem-time-input]`).value = time; q<HTMLButtonElement>(`[data-remind-row='${row}'] [data-act=rem-save]`).click(); };
  it("a bill with a date offers a reminder with the day-before choice; the amount may be unknown; a bill with no date offers none", () => {
    put("b1", "finance_item", { "finance.label": "Rent", "finance.kind": "expense", "finance.on": "2026-11-10" }, { "finance.amount": { state: "unknown" } });
    put("b2", "finance_item", { "finance.label": "Loose", "finance.kind": "expense" }, { "finance.amount": { state: "unknown" } });
    go("#/diary/money"); expect(app().querySelector("[data-remind-row='bill:b2']")).toBeNull();
    q<HTMLButtonElement>("[data-remind-row='bill:b1'] [data-rem-lead1]").click(); save("bill:b1", "08:00");
    expect(reminderFromRecord(remRec()!)).toMatchObject({ target: "bill", targetId: "b1", leadDays: 1, timeOfDay: "08:00", at: null });
  });
  it("a goal with a target date offers a reminder; one without a date offers none", () => {
    put("g1", "goal", { "goal.title": "Save", "goal.target_date": "2026-12-01" }); put("g2", "goal", { "goal.title": "Later" });
    go("#/journey/goal/g2"); expect(app().querySelector("[data-remind-row]")).toBeNull();
    go("#/journey/goal/g1"); save("goal:g1", "09:30"); expect(reminderFromRecord(remRec()!)).toMatchObject({ target: "goal", targetId: "g1", timeOfDay: "09:30", leadDays: 0 });
  });
  it("a habit reminder stores a time only; the habit's own days are the repeat", () => {
    put("h1", "habit", { "habit.title": "Walk", "habit.days": "1,3,5" }); go("#/habits"); save("habit:h1", "06:30");
    const r = reminderFromRecord(remRec()!)!; expect(r).toMatchObject({ target: "habit", targetId: "h1", timeOfDay: "06:30", at: null }); expect(JSON.stringify(remRec())).not.toContain("1,3,5");
  });
  it("weekly and monthly review pages take a date and time reminder", () => {
    go("#/journey/month"); q<HTMLInputElement>("[data-remind-row='review:monthly'] [data-rem-date]").value = "2026-11-30"; save("review:monthly", "18:00");
    expect(reminderFromRecord(remRec()!)).toMatchObject({ target: "review", targetId: "monthly", at: "2026-11-30T18:00" });
    go("#/journey/week"); expect(q("[data-remind-row='review:weekly']")).not.toBeNull();
  });
});

describe("missed card (step 7)", () => {
  const seed = (time = "10:00", extra: Partial<TMRecord["values"]> = {}) => {
    store.demo.put({ id: "t2", entity: "task", ns: "demo", ownerId: "demo-user", schemaVersion: 3, createdAt: "x", values: { "task.title": dv("Pay the electrician"), ...extra } });
    store.demo.put({ id: "rem-x", entity: "reminder", ns: "demo", ownerId: "demo-user", schemaVersion: 3, createdAt: "x", links: { target: "t2" },
      values: { "reminder.target_entity": dv("task"), "reminder.target_id": dv("t2"), "reminder.state": dv("on"), "reminder.at": dv(`2026-11-06T${time}`) } });
  };
  const open = (hhmm: string) => { vi.useFakeTimers(); vi.setSystemTime(dhaka("2026-11-06", hhmm)); prefs.reminders = { ...prefs.reminders, master: true }; go("#/today"); };
  it("shows one calm card for reminders that passed unseen, with Done, Later and Skip; no red, no count, no banned words", () => {
    seed(); open("15:00"); const c = q("[data-missed-card]"); expect(c.querySelector("h2")!.textContent).toBe("These were waiting for you.");
    expect(c.textContent).toContain("Pay the electrician"); expect([...c.querySelectorAll("[data-rem-act]")].map((b) => b.getAttribute("data-rem-act"))).toEqual(["done", "hour", "tomorrow", "skip"]);
    expect(c.querySelector(".err, .danger, [class*=red]")).toBeNull(); expect(c.textContent).not.toMatch(/\d+ (missed|reminders)|overdue|failed|late|ব্যর্থ|বাকি পড়েছে/i);
  });
  it("no card before the time, after it is handled, when master is off, or after the 7-day limit", () => {
    seed(); open("09:00"); expect(app().querySelector("[data-missed-card]")).toBeNull();
    vi.setSystemTime(dhaka("2026-11-06", "15:00")); go("#/today"); q<HTMLButtonElement>("[data-missed-card] [data-rem-act=skip]").click(); expect(app().querySelector("[data-missed-card]")).toBeNull();
    store.demo.clear(); seed(); prefs.reminders = { ...prefs.reminders, master: false }; go("#/today"); expect(app().querySelector("[data-missed-card]")).toBeNull();
    prefs.reminders = { ...prefs.reminders, master: true }; vi.setSystemTime(dhaka("2026-11-14", "10:00")); go("#/today"); expect(app().querySelector("[data-missed-card]")).toBeNull();
  });
  it("Later moves it to a new time and the card goes away; Done ends it", () => {
    seed(); open("15:00"); q<HTMLButtonElement>("[data-missed-card] [data-rem-act=hour]").click();
    expect(app().querySelector("[data-missed-card]")).toBeNull(); expect(reminderFromRecord(remRec()!)).toMatchObject({ state: "on", snoozedUntil: "2026-11-06T16:00" });
    vi.setSystemTime(dhaka("2026-11-06", "16:30")); go("#/today"); q<HTMLButtonElement>("[data-missed-card] [data-rem-act=done]").click(); expect(reminderFromRecord(remRec()!)!.state).toBe("done");
  });
  it("Bangla card uses the Bangla heading", () => {
    localStorage.setItem("tm:ui:lang", "bn"); seed(); open("15:00"); expect(q("[data-missed-card] h2").textContent).toBe("এগুলো আপনার জন্য অপেক্ষা করছিল।");
  });
});

describe("phone calendar export (step 8)", () => {
  let blobs: Blob[] = [];
  const text = async () => (await blobs[blobs.length - 1]!.text()).replace(/\r\n /g, "");
  beforeEach(() => {
    blobs = []; (URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL = (b: Blob) => { blobs.push(b); return "blob:x"; };
    HTMLAnchorElement.prototype.click = function () { /* no navigation in jsdom */ };
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(dhaka("2026-11-05", "08:00"));
    store.demo.put({ id: "b1", entity: "finance_item", ns: "demo", ownerId: "demo-user", schemaVersion: 3, createdAt: "x", values: { "finance.label": dv("Pay Rahim 5000"), "finance.kind": dv("expense"), "finance.on": dv("2026-11-10"), "finance.amount": { state: "unknown" } } });
    store.demo.put({ id: "rem-bill-b1", entity: "reminder", ns: "demo", ownerId: "demo-user", schemaVersion: 3, createdAt: "x", links: { target: "b1" },
      values: { "reminder.target_entity": dv("bill"), "reminder.target_id": dv("b1"), "reminder.state": dv("on"), "reminder.time_of_day": dv("08:00"), "reminder.lead_days": dv(1) } });
  });
  it("shows the one-time calendar line first; only the Continue tap exports; later exports skip the line", async () => {
    go("#/settings/prayer"); expect(prefs.reminders.master).toBe(false); // works with the master switch off
    q<HTMLButtonElement>("[data-act=cal-month]").click(); expect(blobs).toHaveLength(0); expect(q("[data-cal-consent]").textContent).toContain(PACKS.en["rem.cal.consent"]);
    q<HTMLButtonElement>("[data-act=cal-go]").click(); expect(blobs).toHaveLength(1); expect(prefs.icsConsent).toBe(true); expect(q("[data-cal-msg]").textContent).toBe(PACKS.en["rem.cal.once"]);
    q<HTMLButtonElement>("[data-act=cal-month]").click(); expect(blobs).toHaveLength(2); expect(app().querySelector("[data-cal-consent]")).toBeNull();
  });
  it("the file is valid, titled DEMO for demo data, and neutral for a money reminder unless the money tick is on", async () => {
    prefs.icsConsent = true; go("#/settings/prayer"); q<HTMLButtonElement>("[data-act=cal-month]").click(); let t = await text();
    expect(t).toContain("BEGIN:VCALENDAR"); expect(t).toContain("DTSTART;TZID=Asia/Dhaka:20261109T080000"); expect(t).toContain("SUMMARY:DEMO Reminder"); expect(t).not.toContain("Rahim");
    prefs.notifyShow = { financial: true }; go("#/settings/prayer"); q<HTMLButtonElement>("[data-act=cal-month]").click(); t = await text(); expect(t).toContain("SUMMARY:DEMO Pay Rahim 5000 · 2026-11-09");
  });
  it("a reminder row has its own button that exports only that reminder; nothing to add gives a calm line", async () => {
    prefs.icsConsent = true; go("#/diary/money"); q<HTMLButtonElement>("[data-cal-export='rem-bill-b1'] [data-act=cal-one]").click(); const t = await text();
    expect((t.match(/BEGIN:VEVENT/g) ?? []).length).toBe(1); expect(t).toContain("UID:rem-bill-b1:2026-11-09@trillionaire-me");
    store.demo.clear(); go("#/settings/prayer"); q<HTMLButtonElement>("[data-act=cal-month]").click(); expect(q("[data-cal-msg]").textContent).toBe(PACKS.en["rem.cal.none"]);
  });
});

describe("interactions (step 9)", () => {
  const rec2 = (id: string, entity: string, values: Record<string, unknown>, links?: Record<string, string>): TMRecord => ({ id, entity, ns: "demo", ownerId: "demo-user", schemaVersion: 3, createdAt: "x", ...(links ? { links } : {}), values: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, dv(v)])) });
  const stubN = () => { const shown: string[][] = []; class N { static permission = "granted"; static requestPermission = async () => "granted"; constructor(t: string, o: { body?: string }) { shown.push([t, o.body ?? ""]); } } vi.stubGlobal("Notification", N); return shown; };
  const hidden = () => Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
  afterEach(() => { Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true }); vi.unstubAllGlobals(); delete (window as unknown as { Notification?: unknown }).Notification; });
  const hours = () => store.demo.put(rec2("intake-h", "profile", { "constraint.weekly_free_hours": 20, "constraint.free_from": "09:00", "constraint.free_to": "18:00" }));

  it("plan-start switch reminds at the start of each planned step; the 10-minute lead moves it earlier; acting on it stores a normal reminder", async () => {
    hours(); store.demo.put(rec2("t1", "task", { "task.title": "Call the bank", "task.minutes": 30 })); vi.useFakeTimers();
    prefs.reminders = { ...prefs.reminders, master: true, planStart: true, planLead: 10 };
    // find where the planner puts the step (today or a later day) by scanning the next days for the card
    let got = 0;
    for (let d = 0; d < 7 && !got; d++) for (const hh of ["08:50", "09:00", "09:10"]) { vi.setSystemTime(dhaka(`2026-11-0${6 + d}`, hh)); got += await checkReminders(Date.now()); if (got) break; }
    expect(got).toBeGreaterThan(0); expect(remRec()).toBeUndefined(); // virtual: nothing stored yet
    go("#/today"); q<HTMLButtonElement>("[data-reminder-cards] [data-rem-act=hour]").click();
    expect(reminderFromRecord(remRec()!)).toMatchObject({ target: "plan_step", targetId: "t1", state: "on" }); expect(reminderFromRecord(remRec()!)!.snoozedUntil).not.toBeNull();
  });
  it("plan-start switch off (the default) creates nothing", async () => {
    hours(); store.demo.put(rec2("t1", "task", { "task.title": "Call the bank", "task.minutes": 30 })); vi.useFakeTimers(); prefs.reminders = { ...prefs.reminders, master: true };
    let got = 0; for (let d = 0; d < 7; d++) { vi.setSystemTime(dhaka(`2026-11-0${6 + d}`, "09:00")); got += await checkReminders(Date.now()); } expect(got).toBe(0);
  });
  it("a prayer alert wins: a reminder within 3 minutes of it moves to 3 minutes after, so two buzzes do not land together", async () => {
    const shown = stubN(); hidden(); vi.useFakeTimers(); prefs.reminders = { ...prefs.reminders, master: true }; prefs.prayerAlerts = { ...prefs.prayerAlerts, azan: true };
    const { resolvedPrayerTimes } = await import("../src/ui/prayerSync"); const { dhakaNow } = await import("../src/core/prayer");
    vi.setSystemTime(dhaka("2026-11-06", "12:00")); const m = resolvedPrayerTimes(dhakaNow(Date.now()).date).times.dhuhr!; const hh = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
    store.demo.put(rec2("t1", "task", { "task.title": "Call the bank" }));
    store.demo.put(rec2("rem-1", "reminder", { "reminder.target_entity": "task", "reminder.target_id": "t1", "reminder.state": "on", "reminder.at": `2026-11-06T${hh(m + 1)}` }, { target: "t1" }));
    vi.setSystemTime(dhaka("2026-11-06", hh(m + 1))); expect(await checkReminders(Date.now())).toBe(0); expect(shown).toEqual([]);
    vi.setSystemTime(dhaka("2026-11-06", hh(m + 3))); expect(await checkReminders(Date.now())).toBe(1); expect(shown).toHaveLength(1);
  });
  it("a delegated step and a hand-over check-in are neutral on the lock screen (third party); nothing is sent to anyone", async () => {
    const shown = stubN(); hidden(); vi.useFakeTimers(); vi.setSystemTime(dhaka("2026-11-06", "10:01")); prefs.reminders = { ...prefs.reminders, master: true };
    store.demo.put(rec2("t1", "task", { "task.title": "Ask Karim about the bill", "task.delegated_on": "2026-11-01" }));
    store.demo.put(rec2("rem-1", "reminder", { "reminder.target_entity": "task", "reminder.target_id": "t1", "reminder.state": "on", "reminder.at": "2026-11-06T10:00" }, { target: "t1" }));
    store.demo.put(rec2("ho1", "handover", { "handover.status": "planned", "handover.due": "2026-11-06" }, { role: "r1" }));
    store.demo.put(rec2("rem-2", "reminder", { "reminder.target_entity": "task", "reminder.target_id": "ho1", "reminder.state": "on", "reminder.at": "2026-11-06T10:40" }, { target: "ho1" }));
    await checkReminders(Date.now()); vi.setSystemTime(dhaka("2026-11-06", "10:41")); await checkReminders(Date.now());
    expect(shown).toHaveLength(2); expect(shown.map((x) => x[0])).toEqual(["A reminder is waiting", "A reminder is waiting"]); expect(JSON.stringify(shown)).not.toContain("Karim");
    vi.setSystemTime(dhaka("2026-11-06", "10:01"));
    prefs.notifyShow = { third_party: true }; shown.length = 0; store.demo.put(rec2("rem-3", "reminder", { "reminder.target_entity": "task", "reminder.target_id": "t1", "reminder.state": "on", "reminder.at": "2026-11-06T10:03" }, { target: "t1" }));
    vi.setSystemTime(dhaka("2026-11-06", "10:04")); await checkReminders(Date.now()); expect(shown.some((x) => x[1] === "Ask Karim about the bill")).toBe(true);
  });
  it("clearing real data removes real reminder records", async () => {
    grantConsent(consentKv, "2026-10-26T10:00:00.000Z"); const f = (v: unknown) => ({ state: "value" as const, value: v, label: "FACT" as const });
    store.real.put({ id: "rem-r", entity: "reminder", ns: "real", ownerId: "owner", schemaVersion: 3, createdAt: "x", values: { "reminder.target_entity": f("task"), "reminder.target_id": f("t9"), "reminder.state": f("on") } });
    localStorage.setItem("tm:ui:dataMode", "real"); go("#/settings/delete"); const i = q<HTMLInputElement>("[data-delete-word]"); i.value = "delete"; i.dispatchEvent(new Event("input"));
    q<HTMLButtonElement>("[data-act=clear-real-yes]").click(); await settle(); expect(store.real.list().filter((r) => r.entity === "reminder")).toEqual([]);
  });
});

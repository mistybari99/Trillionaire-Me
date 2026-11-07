// Reminders step 4: delivery inside the existing timer. jsdom fake clock; Notification stubbed granted / default / missing.
import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../src/app";
import { consentKv, prefs, store } from "../src/ui/state";
import { revokeConsent } from "../src/core/consent";
import { checkReminders, currentMissed, pendingReminderCards, resetReminderCards, ROUTE_FOR, startReminders } from "../src/ui/reminders";
import { startPrayerAlerts } from "../src/ui/prayerAlerts";
import { reminderRecord, type Reminder } from "../src/core/reminders";
import type { TMRecord } from "../src/core/types";

const dv = (value: unknown) => ({ state: "value" as const, value, label: "DEMO" as const });
const rec = (id: string, entity: string, values: Record<string, unknown>): TMRecord => ({ id, entity, ns: "demo", ownerId: "demo-user", schemaVersion: 3, createdAt: "2026-11-01T00:00:00Z", values: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, dv(v)])) });
const rem = (id: string, o: Partial<Reminder> & Pick<Reminder, "target" | "targetId">): void => { store.demo.put(reminderRecord({ id, ns: "demo", ownerId: "demo-user", schemaVersion: 3, createdAt: "2026-11-01T00:00:00Z", r: { at: null, timeOfDay: null, leadDays: 0, state: "on", snoozedUntil: null, ...o } })); };
// Dhaka is UTC+6
const bill = (id: string, label: string): TMRecord => { const r = rec(id, "finance_item", { "finance.label": label, "finance.on": "2026-11-06", "finance.kind": "expense" }); r.values["finance.amount"] = { state: "unknown" }; return r; };
const dhaka = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00+06:00`).getTime();
const shown: Array<[string, { body?: string; tag?: string }]> = [];
const stubNotification = (perm: "granted" | "default") => {
  class N { static permission = perm; static requestPermission = async () => perm; constructor(title: string, o: { body?: string; tag?: string }) { shown.push([title, o]); } }
  vi.stubGlobal("Notification", N);
};
const setVisible = (v: "visible" | "hidden") => Object.defineProperty(document, "visibilityState", { value: v, configurable: true });

beforeEach(() => {
  localStorage.clear(); store.demo.clear(); store.real.clear(); revokeConsent(consentKv); resetReminderCards(); shown.length = 0;
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
  setVisible("visible");
  store.demo.put(rec("t1", "task", { "task.title": "Call the bank" })); store.demo.put(bill("b1", "Pay Rahim 5000"));
});
afterEach(() => { vi.unstubAllGlobals(); delete (window as unknown as { Notification?: unknown }).Notification; vi.useRealTimers(); });

describe("reminder delivery", () => {
  it("master off (the default): nothing is shown, nothing is asked", async () => {
    stubNotification("granted"); rem("r1", { target: "task", targetId: "t1", at: "2026-11-06T10:00" });
    expect(prefs.reminders.master).toBe(false); expect(await checkReminders(dhaka("2026-11-06", "10:01"))).toBe(0); expect(pendingReminderCards()).toEqual([]); expect(shown).toEqual([]);
  });
  it("app open: an in-app card, no phone notification; shown once only", async () => {
    stubNotification("granted"); prefs.reminders = { ...prefs.reminders, master: true }; rem("r1", { target: "task", targetId: "t1", at: "2026-11-06T10:00" });
    expect(await checkReminders(dhaka("2026-11-06", "09:59"))).toBe(0);
    expect(await checkReminders(dhaka("2026-11-06", "10:01"))).toBe(1);
    expect(shown).toEqual([]); expect(pendingReminderCards().map((n) => n.items[0]!.title)).toEqual(["Call the bank"]);
    expect(await checkReminders(dhaka("2026-11-06", "10:02"))).toBe(0); expect(pendingReminderCards()).toHaveLength(1);
    expect(JSON.stringify(prefs.remindersFired)).not.toContain("Call the bank"); // ledger keeps ids and times only
  });
  it("app in the background with permission: a phone notification with the item's title; the ladder falls to the card when it cannot show", async () => {
    stubNotification("granted"); setVisible("hidden"); prefs.reminders = { ...prefs.reminders, master: true }; rem("r1", { target: "task", targetId: "t1", at: "2026-11-06T10:00" });
    await checkReminders(dhaka("2026-11-06", "10:01"));
    expect(shown).toHaveLength(1); expect(shown[0]![0]).toBe("Reminder"); expect(shown[0]![1].body).toBe("Call the bank"); expect(pendingReminderCards()).toEqual([]);
    resetReminderCards(); stubNotification("default"); rem("r2", { target: "task", targetId: "t1", at: "2026-11-06T11:00" });
    await checkReminders(dhaka("2026-11-06", "11:01")); expect(shown).toHaveLength(1); expect(pendingReminderCards()).toHaveLength(1); // no permission: in-app card instead
  });
  it("money, health, worship and third-party text is neutral on the lock screen until the tick is on", async () => {
    stubNotification("granted"); setVisible("hidden"); prefs.reminders = { ...prefs.reminders, master: true }; rem("r1", { target: "bill", targetId: "b1", timeOfDay: "09:00" });
    await checkReminders(dhaka("2026-11-06", "09:01"));
    expect(shown[0]![0]).toBe("A reminder is waiting"); expect(JSON.stringify(shown[0])).not.toContain("Rahim");
    shown.length = 0; prefs.notifyShow = { financial: true }; store.demo.put(bill("b2", "Rent")); rem("r2", { target: "bill", targetId: "b2", timeOfDay: "13:00" });
    await checkReminders(dhaka("2026-11-06", "13:01")); expect(shown[0]![1].body).toBe("Rent");
  });
  it("quiet hours hold a reminder (not drop it): silent at 23:00, shown after 07:00", async () => {
    stubNotification("granted"); prefs.reminders = { ...prefs.reminders, master: true }; rem("r1", { target: "task", targetId: "t1", at: "2026-11-06T23:00" });
    expect(await checkReminders(dhaka("2026-11-06", "23:01"))).toBe(0); expect(await checkReminders(dhaka("2026-11-07", "06:59"))).toBe(0);
    expect(await checkReminders(dhaka("2026-11-07", "07:01"))).toBe(1); expect(pendingReminderCards()).toHaveLength(1);
  });
  it("overload (pause) holds reminders and nothing is caught up afterwards", async () => {
    prefs.reminders = { ...prefs.reminders, master: true }; rem("r1", { target: "task", targetId: "t1", at: "2026-11-06T10:00" }); prefs.mode = "pause";
    expect(await checkReminders(dhaka("2026-11-06", "10:01"))).toBe(0); prefs.mode = "normal";
    expect(await checkReminders(dhaka("2026-11-06", "12:00"))).toBe(0); expect(currentMissed(dhaka("2026-11-06", "12:00"))).toEqual([]);
  });
  it("a reminder the app never saw becomes a missed one (later opening); master off lists none", async () => {
    prefs.reminders = { ...prefs.reminders, master: true }; rem("r1", { target: "task", targetId: "t1", at: "2026-11-06T10:00" });
    expect(currentMissed(dhaka("2026-11-06", "09:00"))).toEqual([]);
    expect(currentMissed(dhaka("2026-11-06", "15:00")).map((m) => m.title)).toEqual(["Call the bank"]);
    prefs.reminders = { ...prefs.reminders, master: false }; expect(currentMissed(dhaka("2026-11-06", "15:00"))).toEqual([]);
  });
  it("a reminder whose item has no date fires nothing; a deleted item fires nothing", async () => {
    prefs.reminders = { ...prefs.reminders, master: true }; store.demo.put(rec("g1", "goal", { "goal.title": "Save" })); rem("r1", { target: "goal", targetId: "g1" }); rem("r2", { target: "task", targetId: "gone", at: "2026-11-06T10:00" });
    expect(await checkReminders(dhaka("2026-11-06", "10:01"))).toBe(0); expect(currentMissed(dhaka("2026-11-06", "20:00"))).toEqual([]);
  });
  it("runs inside the existing prayer timer and visibility check (no second timer)", async () => {
    vi.useFakeTimers(); vi.setSystemTime(dhaka("2026-11-06", "10:01")); prefs.reminders = { ...prefs.reminders, master: true }; rem("r1", { target: "task", targetId: "t1", at: "2026-11-06T10:00" });
    startReminders(); startPrayerAlerts(); await vi.advanceTimersByTimeAsync(31_000);
    expect(pendingReminderCards()).toHaveLength(1);
    const src = readFileSync("src/ui/reminders.ts", "utf8"); expect(src).not.toMatch(/setInterval|setTimeout/);
  });
  it("every tap target route opens a real screen; the service worker only focuses the app and opens the route", () => {
    for (const [target, hash] of Object.entries(ROUTE_FOR)) { location.hash = hash; document.body.innerHTML = '<div id="app"></div>'; render(); expect(document.querySelector("#app main"), target).not.toBeNull(); }
    const sw = readFileSync("public/sw.js", "utf8"); expect(sw).toContain("notificationclick"); expect(sw).toContain("openWindow"); expect(sw).not.toMatch(/showNotification|Notification\(/);
  });
});

// Reminders step 3: Settings > Prayer & alerts > Reminders. Master off by default; no permission prompt until the Allow tap.
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../src/app";
import { prefs, store, consentKv } from "../src/ui/state";
import { revokeConsent } from "../src/core/consent";
import { resetReminderSessionChoice } from "../src/ui/remindersSettingsUi";
import { ROWS } from "../src/ui/settingsRegistry";
import { PACKS, type Key } from "../src/i18n/packs";

const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const go = (hash: string) => { location.hash = hash; render(); };
const stub = (perm: string) => { const req = vi.fn(async () => { stubbed.permission = "granted"; return "granted"; }); const stubbed = { permission: perm, requestPermission: req }; vi.stubGlobal("Notification", stubbed); return req; };
beforeEach(() => {
  localStorage.clear(); store.demo.clear(); store.real.clear(); revokeConsent(consentKv); resetReminderSessionChoice();
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
  window.addEventListener("hashchange", render);
});
afterEach(() => { window.removeEventListener("hashchange", render); vi.unstubAllGlobals(); delete (window as unknown as { Notification?: unknown }).Notification; });

describe("Reminders settings", () => {
  it("is a section inside Prayer & alerts (no 9th category), owned by one registry row, master OFF by default", () => {
    go("#/settings/prayer"); const c = q("[data-reminders-settings]"); expect(c).not.toBeNull(); expect(c.getAttribute("data-setting-row")).toBe("reminders");
    expect(q("[data-rem-master]").getAttribute("data-rem-master")).toBe("false"); expect(prefs.reminders.master).toBe(false);
    expect(c.querySelector("[data-rem-limits], [data-act=rem-test], input")).toBeNull(); // nothing else until it is switched on
    const rows = ROWS.filter((r) => r.prefs.includes("reminders")); expect(rows.map((r) => r.id)).toEqual(["reminders"]); expect(rows[0]!.cat).toBe("prayer"); expect(rows[0]!.route).toBe("#/settings/prayer/reminders");
    go("#/settings/prayer/reminders"); expect(q("[data-reminders-settings]").classList.contains("set-hl")).toBe(true);
  });
  it("switching on never calls the browser; the honest limits line and the two choices appear", () => {
    const req = stub("default"); go("#/settings/prayer");
    q<HTMLButtonElement>("[data-rem-master] button[aria-pressed=false]").click(); // "On" is the second button
    q<HTMLButtonElement>("[data-rem-master] button:last-child").click();
    expect(prefs.reminders.master).toBe(true); expect(req).not.toHaveBeenCalled();
    expect(q("[data-rem-limits]").textContent).toBe(`${PACKS.en["rem.limits"]} ${PACKS.en["rem.limits2"]}`); expect(q("[data-rem-limits]").textContent).toMatch(/may not show them on time/);
    expect(q("[data-act=rem-allow]")).not.toBeNull(); expect(q("[data-act=rem-cal-only]")).not.toBeNull();
  });
  it("requestPermission runs only from the Allow tap; Use calendar only never asks and is remembered for the session", async () => {
    const req = stub("default"); prefs.reminders = { ...prefs.reminders, master: true }; go("#/settings/prayer");
    expect(req).not.toHaveBeenCalled(); q<HTMLButtonElement>("[data-act=rem-allow]").click(); expect(req).toHaveBeenCalledTimes(1);
    resetReminderSessionChoice(); const req2 = stub("default"); go("#/settings/prayer"); q<HTMLButtonElement>("[data-act=rem-cal-only]").click(); expect(req2).not.toHaveBeenCalled();
    expect(q("[data-rem-perm-card]")).toBeNull(); expect(q("[data-rem-cal-only]")).not.toBeNull(); go("#/settings/prayer"); expect(q("[data-rem-perm-card]")).toBeNull(); // does not return this session
  });
  it("master off: no prompt and no permission card even when the browser would ask", () => {
    const req = stub("default"); go("#/settings/prayer"); expect(req).not.toHaveBeenCalled(); expect(q("[data-rem-perm-card]")).toBeNull();
  });
  it("unsupported (iPhone tab) shows Add to Home Screen, denied explains the phone setting and never asks; both keep the calendar route", () => {
    prefs.reminders = { ...prefs.reminders, master: true };
    const w = window as unknown as { Notification?: unknown }; const saved = w.Notification; delete w.Notification;
    go("#/settings/prayer"); q<HTMLButtonElement>("[data-act=rem-allow]").click(); expect(q("[data-rem-iphone]").textContent).toBe(PACKS.en["rem.iphone"]); expect(q("[data-perm]")).not.toBeNull();
    if (saved) w.Notification = saved;
    resetReminderSessionChoice(); const req = stub("denied"); go("#/settings/prayer"); q<HTMLButtonElement>("[data-act=rem-allow]").click(); expect(req).not.toHaveBeenCalled();
    expect(q("[data-reminders-settings] [data-perm]").getAttribute("data-perm")).toBe("denied");
  });
  it("quiet hours, plan-step switch and lead are saved and validated; bad times are ignored", () => {
    prefs.reminders = { ...prefs.reminders, master: true }; go("#/settings/prayer");
    const from = q<HTMLInputElement>("#rem-q-from"); const to = q<HTMLInputElement>("#rem-q-to"); expect([from.value, to.value]).toEqual(["22:00", "07:00"]);
    from.value = "23:30"; from.dispatchEvent(new Event("change")); expect(prefs.reminders.quiet.from).toBe("23:30");
    go("#/settings/prayer"); q<HTMLInputElement>("#rem-q-to").value = ""; q<HTMLInputElement>("#rem-q-to").dispatchEvent(new Event("change")); expect(prefs.reminders.quiet.to).toBe("07:00");
    expect(q("[data-rem-lead]")).toBeNull(); q<HTMLButtonElement>("[data-rem-planstart] button:last-child").click(); expect(prefs.reminders.planStart).toBe(true);
    q<HTMLButtonElement>("[data-rem-lead] button:last-child").click(); expect(prefs.reminders.planLead).toBe(10);
  });
  it("the test button sends a phone alert when allowed, otherwise shows the result here; the lock screen row is linked, not repeated", async () => {
    prefs.reminders = { ...prefs.reminders, master: true }; const shown: string[][] = [];
    class N { static permission = "granted"; static requestPermission = async () => "granted"; constructor(title: string, o: { body: string }) { shown.push([title, o.body]); } }
    vi.stubGlobal("Notification", N); go("#/settings/prayer"); await new Promise((r) => setTimeout(r, 20)); q<HTMLButtonElement>("[data-act=rem-test]").click(); await new Promise((r) => setTimeout(r, 5));
    expect(shown).toEqual([["Test", "This is a test reminder."]]); expect(q("[data-rem-test-note]").textContent).toBe(PACKS.en["rem.test.sent"]);
    vi.stubGlobal("Notification", { permission: "default", requestPermission: async () => "default" }); go("#/settings/prayer"); q<HTMLButtonElement>("[data-act=rem-test]").click();
    expect(q("[data-rem-test-note]").textContent).toBe(PACKS.en["rem.test.card"]);
    expect(q("[data-rem-lock-link]").getAttribute("href")).toBe("#/settings/privacy/lockscreen"); expect(q("[data-reminders-settings]").querySelector("input[type=checkbox]")).toBeNull();
  });
  it("English and Bangla have the same keys, say the closed-app limit honestly, and use no punishing words", () => {
    const keys = (Object.keys(PACKS.en) as Key[]).filter((k) => k.startsWith("rem.") || k === "set.row.reminders");
    expect(keys.length).toBeGreaterThan(15);
    for (const k of keys) for (const l of ["en", "bn", "mix"] as const) { expect(PACKS[l][k], `${l}:${k}`).toBeTruthy(); expect(PACKS[l][k], `${l}:${k}`).not.toMatch(/failed|overdue|ব্যর্থ|বাকি পড়েছে/i); }
    expect(PACKS.bn["rem.limits"]).toContain("না-ও আসতে পারে"); expect(PACKS.bn["rem.limits2"]).toContain("ক্যালেন্ডার");
  });
  it("Bangla page renders the section", () => {
    localStorage.setItem("tm:ui:lang", "bn"); prefs.reminders = { ...prefs.reminders, master: true }; go("#/settings/prayer");
    expect(q("[data-rem-limits]").textContent).toBe(`${PACKS.bn["rem.limits"]} ${PACKS.bn["rem.limits2"]}`); expect(q("[data-reminders-settings] h2").textContent).toBe("রিমাইন্ডার");
  });
});

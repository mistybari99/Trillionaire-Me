// Settings redesign PR 3e: Prayer & alerts page. Method, place (namespace-aware, gated), alerts, notification permission line.
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../src/app";
import { consentKv, prefs, store } from "../src/ui/state";
import { grantConsent, revokeConsent } from "../src/core/consent";
import { DHAKA_COORDS } from "../src/core/prayer";
import { StoreError } from "../src/core/store";

const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const go = (hash: string) => { location.hash = hash; render(); };
beforeEach(() => {
  localStorage.clear(); store.demo.clear(); store.real.clear(); revokeConsent(consentKv);
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
});
afterEach(() => vi.unstubAllGlobals());

describe("Prayer & alerts page", () => {
  it("holds method, place and alerts; Deen keeps times and one link row to Prayer settings", () => {
    go("#/settings/prayer"); for (const sel of ["[data-prayer-method-card]", "[data-form=prayer-place]", "[data-pre-alert]", "[data-azan-alert]", "[data-alert-prayers]"]) expect(q(sel), sel).not.toBeNull();
    go("#/deen"); expect(app().querySelector("[data-prayer-method-card], [data-form=prayer-place], [data-pre-alert]")).toBeNull();
    expect(q("[data-prayer-link]").getAttribute("href")).toBe("#/settings/prayer"); expect(q("[data-prayer-link]").textContent).toMatch(/Alerts: Off/); expect(q("[data-prayer-times]")).not.toBeNull();
  });
  it("the place is tagged with its namespace; a real place needs the permission gate", () => {
    go("#/settings/prayer"); expect(q("[data-prayer-settings] .badge").getAttribute("data-ns")).toBe("demo");
    localStorage.setItem("tm:ui:dataMode", "real"); go("#/settings/prayer"); expect(q("[data-prayer-settings] .badge").getAttribute("data-ns")).toBe("real"); expect(q("[data-consent-prompt]")).not.toBeNull();
    expect(q("[data-consent-prompt] a").getAttribute("href")).toBe("#/settings/privacy/consent");
  });
  it("Clear real data forgets the real place and keeps the demo place", async () => {
    grantConsent(consentKv, "2026-10-26T10:00:00.000Z"); localStorage.setItem("tm:ui:dataMode", "real"); prefs.prayerCoords = { lat: 24.1, lon: 90.2 }; localStorage.setItem("tm:ui:dataMode", "demo"); prefs.prayerCoords = { lat: 23.9, lon: 90.1 };
    localStorage.setItem("tm:ui:dataMode", "real"); go("#/settings/delete"); const i = q<HTMLInputElement>("[data-delete-word]"); i.value = "delete"; i.dispatchEvent(new Event("input")); q<HTMLButtonElement>("[data-act=clear-real-yes]").click(); await new Promise((r) => setTimeout(r, 50));
    expect(localStorage.getItem("tm:ui:prayerCoords:real")).toBeNull(); expect(JSON.parse(localStorage.getItem("tm:ui:prayerCoords")!)).toEqual({ lat: 23.9, lon: 90.1 }); void DHAKA_COORDS; void StoreError;
  });
  it("the phone's notification permission is shown as a plain line: unsupported, not asked, granted, denied", () => {
    const w = window as unknown as { Notification?: unknown }; const saved = w.Notification; delete w.Notification; go("#/settings/prayer"); expect(q("[data-perm]").getAttribute("data-perm")).toBe("unsupported");
    for (const [perm, shown] of [["default", "ask"], ["granted", "granted"], ["denied", "denied"]] as const) {
      vi.stubGlobal("Notification", { permission: perm, requestPermission: async () => perm }); go("#/settings/prayer"); expect(q("[data-perm]").getAttribute("data-perm"), perm).toBe(shown);
    }
    if (saved) w.Notification = saved;
  });
  it("alerts default off; an alert switch is stored under the same key as before", () => {
    vi.stubGlobal("Notification", { permission: "granted", requestPermission: async () => "granted" });
    go("#/settings/prayer"); expect(prefs.prayerAlerts.azan).toBe(false); q<HTMLElement>("[data-azan-alert] button:last-child").click(); expect(prefs.prayerAlerts.azan).toBe(true); expect(localStorage.getItem("tm:ui:prayerAlerts")).toContain('"azan":true');
  });
});

// M13 Hijri date and Ramadan view: calculated on the phone, labelled approximate, Unknown when the browser has no calendar.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../src/app";
import { store } from "../src/ui/state";
import { HIJRI_MONTHS_BN, HIJRI_MONTHS_EN, hijriOf, ramadanView } from "../src/core/hijri";
import { PACKS } from "../src/i18n/packs";

const app = () => document.getElementById("app")!;
beforeEach(() => { localStorage.clear(); store.demo.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); vi.useRealTimers(); });

describe("pure", () => {
  it("works out a Hijri date for a Dhaka date, and month names have 12 entries each", () => {
    expect(hijriOf({ y: 2026, m: 11, d: 3 })).toEqual({ y: 1448, m: 5, d: 23 });
    expect(HIJRI_MONTHS_EN.length).toBe(12); expect(HIJRI_MONTHS_BN.length).toBe(12); expect(HIJRI_MONTHS_EN[8]).toBe("Ramadan"); expect(HIJRI_MONTHS_BN[8]).toBe("রমজান");
  });
  it("before Ramadan: counts forward day by day to the first day; in Ramadan: which day and when it ends", () => {
    const v = ramadanView({ y: 2026, m: 11, d: 3 }); expect(v.state).toBe("upcoming");
    if (v.state === "upcoming") { expect(v.inDays).toBeGreaterThan(60); expect(v.inDays).toBeLessThan(400); expect(hijriOf({ y: +v.startsAround.slice(0, 4), m: +v.startsAround.slice(5, 7), d: +v.startsAround.slice(8) })).toMatchObject({ m: 9, d: 1 }); }
    const r = ramadanView({ y: 2026, m: 2, d: 25 }); expect(r.state).toBe("during");
    if (r.state === "during") { expect(r.day).toBeGreaterThanOrEqual(1); expect(r.endsInDays).toBeGreaterThan(0); }
  });
  it("Unknown, never a guess, when the browser has no such calendar", async () => {
    vi.resetModules(); const orig = Intl.DateTimeFormat;
    (Intl as { DateTimeFormat: unknown }).DateTimeFormat = class { constructor() { throw new RangeError("no calendar"); } };
    try { const m = await import("../src/core/hijri"); expect(m.hijriOf({ y: 2026, m: 11, d: 3 })).toBeNull(); expect(m.ramadanView({ y: 2026, m: 11, d: 3 })).toEqual({ state: "unknown" }); }
    finally { (Intl as { DateTimeFormat: unknown }).DateTimeFormat = orig; vi.resetModules(); }
  });
});

describe("on the Deen page", () => {
  it("shows the calculated date, the Ramadan line, the approximate note and no ruling, in English, Bangla and Mix", () => {
    for (const lang of ["en", "bn", "mix"]) {
      localStorage.setItem("tm:ui:lang", lang); location.hash = "#/deen"; render();
      const c = app().querySelector("[data-hijri-card]")!; expect(c, lang).not.toBeNull(); expect(c.querySelector("[data-hijri=today]")).not.toBeNull(); expect(c.querySelector("[data-ramadan]")).not.toBeNull();
      expect(c.textContent).toMatch(lang === "en" ? /calculated/i : /হিসাব/); expect(c.querySelector(".err, [role=alert]")).toBeNull();
    }
    for (const l of ["en", "bn", "mix"] as const) for (const k of Object.keys(PACKS.en).filter((k) => k.startsWith("deen.hijri."))) expect((PACKS[l] as Record<string, string>)[k]).toBeTruthy();
    expect(PACKS.en["deen.hijri.official"]).toMatch(/not a ruling/);
  });
});

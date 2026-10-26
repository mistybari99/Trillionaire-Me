// M13 prayer times: formula, Dhaka clock, input parsing, alert logic, one-tap marks and the Deen UI.
// Reference values come from tools/prayer_reference.py (pyephem ephemeris, same method angles), not from this code.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DHAKA_COORDS, DHAKA_UTC_OFFSET_MIN, PRAYER_KEYS, dhakaNow, parseCoord, prayerClock, prayerTimes, validCoords, type PrayerKey } from "../src/core/prayer";
import { DEFAULT_PRAYER_SETTINGS, parsePrayerSettings } from "../src/core/prayerMethod";
import { DEFAULT_ALERT_PREFS, alertSlots, dueSlots, parseAlertPrefs } from "../src/core/prayerAlerts";
import { markedOn, prayerLogId, prayerLogRecord } from "../src/core/prayerLog";
import { Store, MemoryKV } from "../src/core/store";
import { buildNotification, NEUTRAL_TITLE, DEFAULT_NOTIFY_PREFS } from "../src/core/notify";
import { PACKS, type Key } from "../src/i18n/packs";
import { render } from "../src/app";
import { store, prefs } from "../src/ui/state";
import { checkPrayerAlerts, inAppReminders } from "../src/ui/prayerAlerts";

const toMin = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h! * 60 + m!; };
const dhaka = (y: number, m: number, d: number) => ({ y, m, d });

// Reference table: tools/prayer_reference.py (method "mwl" here), Dhaka 23.8103 N 90.4125 E, Fajr 18, Isha 17, Maghrib -0.833, Asr factor 1.
const REF: Array<[string, Record<PrayerKey, string>]> = [
  ["2026-01-15", { fajr: "05:23", dhuhr: "12:08", asr: "15:12", maghrib: "17:33", isha: "18:47" }],
  ["2026-03-20", { fajr: "04:47", dhuhr: "12:06", asr: "15:32", maghrib: "18:09", isha: "19:20" }],
  ["2026-06-21", { fajr: "03:44", dhuhr: "12:00", asr: "15:18", maghrib: "18:48", isha: "20:11" }],
  ["2026-10-24", { fajr: "04:44", dhuhr: "11:42", asr: "14:59", maghrib: "17:25", isha: "18:37" }],
  ["2026-12-21", { fajr: "05:15", dhuhr: "11:56", asr: "14:56", maghrib: "17:16", isha: "18:33" }],
];

describe("M13 prayer times: Dhaka clock", () => {
  it("Dhaka is UTC+6 (fixed offset, no daylight saving)", () => {
    expect(DHAKA_UTC_OFFSET_MIN).toBe(360);
    // 18:30 UTC on 24 Oct is 00:30 on 25 Oct in Dhaka.
    expect(dhakaNow(Date.UTC(2026, 9, 24, 18, 30))).toEqual({ date: dhaka(2026, 10, 25), minute: 30 });
    // 17:59 UTC on 24 Oct is 23:59 on 24 Oct in Dhaka.
    expect(dhakaNow(Date.UTC(2026, 9, 24, 17, 59))).toEqual({ date: dhaka(2026, 10, 24), minute: 23 * 60 + 59 });
  });
  it("default place is Dhaka 23.8103 N, 90.4125 E", () => {
    expect(DHAKA_COORDS).toEqual({ lat: 23.8103, lon: 90.4125 });
  });
});

describe("M13 prayer-time settings: method, Asr rule, offsets, no location", () => {
  const d = dhaka(2026, 10, 24);
  it("default is Karachi (18/18), standard Asr, no offsets; Fajr equals MWL, Isha is a few minutes later", () => {
    expect(DEFAULT_PRAYER_SETTINGS).toEqual({ method: "karachi", asr: "standard", offsets: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 } });
    const k = prayerTimes(d, DHAKA_COORDS), m = prayerTimes(d, DHAKA_COORDS, { ...DEFAULT_PRAYER_SETTINGS, method: "mwl" });
    expect(k.fajr).toBe(m.fajr); expect(k.isha! - m.isha!).toBeGreaterThanOrEqual(2); expect(k.isha! - m.isha!).toBeLessThanOrEqual(6);
  });
  it("Hanafi Asr is later than standard Asr; other prayers do not move", () => {
    const s = prayerTimes(d, DHAKA_COORDS), h = prayerTimes(d, DHAKA_COORDS, { ...DEFAULT_PRAYER_SETTINGS, asr: "hanafi" });
    expect(h.asr! - s.asr!).toBeGreaterThan(30); expect(h.fajr).toBe(s.fajr); expect(h.isha).toBe(s.isha);
  });
  it("each method changes the twilight prayers in the expected direction", () => {
    const at = (method: "karachi" | "mwl" | "egypt" | "isna") => prayerTimes(d, DHAKA_COORDS, { ...DEFAULT_PRAYER_SETTINGS, method });
    expect(at("isna").fajr!).toBeGreaterThan(at("karachi").fajr!); expect(at("egypt").fajr!).toBeLessThan(at("karachi").fajr!);
  });
  it("per-prayer minute offset moves only that prayer; null stays null", () => {
    const base = prayerTimes(d, DHAKA_COORDS), o = prayerTimes(d, DHAKA_COORDS, { ...DEFAULT_PRAYER_SETTINGS, offsets: { ...DEFAULT_PRAYER_SETTINGS.offsets, maghrib: 3, fajr: -2 } });
    expect(o.maghrib).toBe(base.maghrib! + 3); expect(o.fajr).toBe(base.fajr! - 2); expect(o.dhuhr).toBe(base.dhuhr);
    const polar = prayerTimes(dhaka(2026, 6, 21), { lat: 80, lon: 90 }, { ...DEFAULT_PRAYER_SETTINGS, offsets: { ...DEFAULT_PRAYER_SETTINGS.offsets, isha: 5 } });
    expect(polar.isha).toBeNull();
  });
  it("no usable location gives Unknown (null) for every prayer, never a guessed time", () => {
    for (const bad of [{ lat: NaN, lon: 90 }, { lat: 95, lon: 0 }, null, undefined] as never[]) expect(Object.values(prayerTimes(d, bad))).toEqual([null, null, null, null, null]);
  });
  it("stored settings are read safely: junk falls back to the default, offsets stay within 30 minutes", () => {
    expect(parsePrayerSettings(null)).toEqual(DEFAULT_PRAYER_SETTINGS);
    expect(parsePrayerSettings({ method: "x", asr: "y", offsets: { fajr: 99, isha: 1.5, asr: "3", dhuhr: -30, maghrib: 7 } })).toEqual({ method: "karachi", asr: "standard", offsets: { fajr: 0, dhuhr: -30, asr: 0, maghrib: 7, isha: 0 } });
    expect(parsePrayerSettings({ method: "mwl", asr: "hanafi" })).toMatchObject({ method: "mwl", asr: "hanafi" });
  });
});

describe("M13 prayer times: formula against reference values (±2 minutes)", () => {
  for (const [date, want] of REF) {
    it(`Dhaka ${date} matches the reference within 2 minutes`, () => {
      const [y, m, d] = date.split("-").map(Number) as [number, number, number];
      const got = prayerTimes(dhaka(y, m, d), DHAKA_COORDS, { ...DEFAULT_PRAYER_SETTINGS, method: "mwl" });
      for (const k of PRAYER_KEYS) {
        expect(got[k], `${date} ${k}`).not.toBeNull();
        expect(Math.abs(got[k]! - toMin(want[k])), `${date} ${k}: got ${prayerClock(got[k])} want ${want[k]}`).toBeLessThanOrEqual(2);
      }
    });
  }
  it("order is always Fajr < Dhuhr < Asr < Maghrib < Isha", () => {
    for (const [date] of REF) {
      const [y, m, d] = date.split("-").map(Number) as [number, number, number];
      const t = prayerTimes(dhaka(y, m, d), DHAKA_COORDS);
      expect(t.fajr! < t.dhuhr! && t.dhuhr! < t.asr! && t.asr! < t.maghrib! && t.maghrib! < t.isha!).toBe(true);
    }
  });
  it("no time is 0 by accident: an event that does not happen is null, never 00:00 (unknown is not zero)", () => {
    // 66.5 N on 21 June: the sun never sinks 17 or 18 degrees, so Fajr and Isha do not exist.
    const t = prayerTimes(dhaka(2026, 6, 21), { lat: 66.5, lon: 25 });
    expect(t.fajr).toBeNull();
    expect(t.isha).toBeNull();
    expect(prayerClock(t.fajr)).toBeNull();
  });
  it("prayerClock writes HH:MM with Latin digits", () => {
    expect(prayerClock(toMin("04:05"))).toBe("04:05");
    expect(prayerClock(0)).toBe("00:00");
    expect(prayerClock(null)).toBeNull();
  });
});

describe("M13 place input", () => {
  it("accepts Latin and Bangla digits, comma decimals, and rejects out-of-range or junk", () => {
    expect(parseCoord("23.8103", 90)).toBe(23.8103);
    expect(parseCoord("২৩.৮১০৩", 90)).toBe(23.8103);
    expect(parseCoord("22,3569", 90)).toBe(22.3569);
    expect(parseCoord("-33.5", 90)).toBe(-33.5);
    for (const bad of ["91", "-90.5", "", "abc", "23.8.1", "1e3", "NaN"]) expect(parseCoord(bad, 90), bad).toBeNull();
    expect(parseCoord("180.0", 180)).toBe(180);
    expect(parseCoord("181", 180)).toBeNull();
  });
  it("validCoords refuses anything that is not a real place", () => {
    expect(validCoords({ lat: 23.8, lon: 90.4 })).toBe(true);
    expect(validCoords({ lat: 95, lon: 0 })).toBe(false);
    expect(validCoords({ lat: "23", lon: 90 })).toBe(false);
    expect(validCoords(null)).toBe(false);
  });
});

describe("M13 alerts: settings and due logic", () => {
  it("both alerts are off by default; minutes default to 10", () => {
    expect(DEFAULT_ALERT_PREFS).toEqual({ preAlert: false, preMinutes: 10, azan: false });
    expect(parseAlertPrefs(null)).toEqual({ preAlert: false, preMinutes: 10, azan: false });
    expect(parseAlertPrefs({ preAlert: "yes", preMinutes: 7.5, azan: 1 })).toEqual({ preAlert: false, preMinutes: 10, azan: false });
    expect(parseAlertPrefs({ preAlert: true, preMinutes: 15, azan: true })).toEqual({ preAlert: true, preMinutes: 15, azan: true });
    expect(parseAlertPrefs({ preMinutes: 0 }).preMinutes).toBe(10);
    expect(parseAlertPrefs({ preMinutes: 61 }).preMinutes).toBe(10);
  });
  const times = { fajr: 282, dhuhr: 712, asr: 900, maghrib: 1046, isha: 1118 } as const;
  it("no slots when both alerts are off", () => {
    expect(alertSlots("2026-10-24", times, DEFAULT_ALERT_PREFS)).toEqual([]);
  });
  it("pre-alert fires N minutes before; azan at the time; a null prayer gets nothing", () => {
    const slots = alertSlots("2026-10-24", { ...times, asr: null }, { preAlert: true, preMinutes: 10, azan: true });
    expect(slots.find((s) => s.id === "2026-10-24-pre-fajr")?.minute).toBe(272);
    expect(slots.find((s) => s.id === "2026-10-24-azan-fajr")?.minute).toBe(282);
    expect(slots.some((s) => s.prayer === "asr")).toBe(false);
  });
  it("each slot fires once, inside its window, and a late start still fires within the window", () => {
    const slots = alertSlots("2026-10-24", times, { preAlert: true, preMinutes: 10, azan: false });
    const fajrPre = slots.find((s) => s.id === "2026-10-24-pre-fajr")!;
    expect(dueSlots(271, slots, new Set())).toEqual([]);
    expect(dueSlots(272, slots, new Set())).toEqual([fajrPre]);
    expect(dueSlots(276, slots, new Set())).toEqual([fajrPre]);
    expect(dueSlots(277, slots, new Set())).toEqual([]);
    expect(dueSlots(272, slots, new Set([fajrPre.id]))).toEqual([]);
  });
});

describe("M13 prayer marks (prayer_log)", () => {
  it("a mark is one record per prayer per day, DEMO-labelled, in the demo namespace; undo removes it", () => {
    const s = new Store(new MemoryKV());
    const rec = prayerLogRecord("2026-10-24", "fajr", "2026-10-24T04:50:00Z");
    expect(rec.id).toBe(prayerLogId("2026-10-24", "fajr"));
    expect(rec.entity).toBe("prayer_log");
    expect(rec.ns).toBe("demo");
    s.demo.put(rec);
    expect([...markedOn(s.demo.list(), "2026-10-24")]).toEqual(["fajr"]);
    expect(markedOn(s.demo.list(), "2026-10-25").size).toBe(0);
    s.demo.delete(rec.id);
    expect(markedOn(s.demo.list(), "2026-10-24").size).toBe(0);
  });
  it("the mark holds no prayer text, score or count: only the date and the prayer link", () => {
    const rec = prayerLogRecord("2026-10-24", "isha", "2026-10-24T13:00:00Z");
    expect(Object.keys(rec.values)).toEqual(["prayer_log.date"]);
    expect(rec.links).toEqual({ prayer: "isha" });
  });
});

describe("M13 copy", () => {
  const keys = Object.keys(PACKS.en).filter((k) => /^deen\.(prayer|set|alert)\./.test(k)) as Key[];
  it("every prayer key exists in English and Bangla", () => {
    expect(keys.length).toBeGreaterThan(30);
    for (const k of keys) { expect(PACKS.en[k], k).toBeTruthy(); expect(PACKS.bn[k], k).toBeTruthy(); }
  });
  it("lock-screen text for a prayer alert stays neutral unless 'show details' is on for worship", () => {
    const item = { title: { bn: "নামাজের সতর্কবার্তা", en: "Prayer reminder" }, body: { bn: "ফজর আরও ১০ মিনিট বাকি", en: "Fajr in 10 minutes" }, privacy: "worship" as const };
    expect(buildNotification(item, DEFAULT_NOTIFY_PREFS)).toEqual({ title: NEUTRAL_TITLE, body: expect.any(Object) });
    expect(buildNotification(item, DEFAULT_NOTIFY_PREFS).body.en).not.toMatch(/Fajr/);
    expect(buildNotification(item, { worship: true }).body.en).toBe("Fajr in 10 minutes");
  });
});

describe("M13 Deen screen and alerts (UI)", () => {
  const reset = () => { localStorage.clear(); store.demo.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); };
  // 2026-10-24 10:00 in Dhaka = 04:00 UTC. Fajr is 04:44 Dhaka.
  beforeEach(() => { reset(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-24T04:00:00Z")); window.addEventListener("hashchange", render); });
  afterEach(() => { window.removeEventListener("hashchange", render); vi.useRealTimers(); });

  it("one tap marks a prayer, a second tap undoes it, and no score or streak text appears", () => {
    location.hash = "#/deen"; render();
    const btn = () => document.querySelector("[data-act=prayer-mark][data-prayer=fajr]") as HTMLButtonElement;
    expect(btn().getAttribute("aria-pressed")).toBe("false");
    btn().click();
    expect(store.demo.get(prayerLogId("2026-10-24", "fajr"))).not.toBeNull();
    expect(document.querySelector("[data-act=prayer-mark][data-prayer=fajr]")!.getAttribute("aria-pressed")).toBe("true");
    (document.querySelector("[data-act=prayer-mark][data-prayer=fajr]") as HTMLButtonElement).click();
    expect(store.demo.get(prayerLogId("2026-10-24", "fajr"))).toBeNull();
    const text = document.querySelector("[data-prayer-times]")!.textContent ?? "";
    expect(text).toContain("04:44");
    expect(text).not.toMatch(/streak|score|rank|missed|shame|points/i);
  });

  it("method card: shows the verify note, saves method, Hanafi Asr and an offset, and the times change", () => {
    location.hash = "#/deen"; render();
    expect(document.querySelector("[data-prayer-verify]")!.textContent).toMatch(/Verify with your local timetable/);
    expect(document.querySelector("[data-prayer-method]")!.textContent).toMatch(/Karachi/);
    const asrBefore = document.querySelector("[data-prayer-time=asr]")!.textContent;
    const sel = document.querySelector("[data-prayer-asr-select]") as HTMLSelectElement; sel.value = "hanafi"; sel.dispatchEvent(new Event("change"));
    expect(prefs.prayerSettings.asr).toBe("hanafi");
    expect(document.querySelector("[data-prayer-time=asr]")!.textContent).not.toBe(asrBefore);
    const fajrBefore = prayerTimes({ y: 2026, m: 10, d: 24 }, DHAKA_COORDS).fajr!;
    const off = document.querySelector("[data-prayer-offset=fajr]") as HTMLInputElement; off.value = "4"; off.dispatchEvent(new Event("change"));
    expect(document.querySelector("[data-prayer-time=fajr]")!.textContent).toBe(prayerClock(fajrBefore + 4));
    const m = document.querySelector("[data-prayer-method-select]") as HTMLSelectElement; m.value = "mwl"; m.dispatchEvent(new Event("change"));
    expect(prefs.prayerSettings.method).toBe("mwl");
    (document.querySelector("[data-act=prayer-method-reset]") as HTMLButtonElement).click();
    expect(prefs.prayerSettings).toEqual(DEFAULT_PRAYER_SETTINGS);
  });
  it("method settings are not personal data: no consent prompt is needed to change them", () => {
    location.hash = "#/deen"; render();
    expect(document.querySelector("[data-prayer-method-card] [data-consent]")).toBeNull();
  });
  it("a passed prayer that is not marked shows neutral text only", () => {
    vi.setSystemTime(new Date("2026-10-24T08:00:00Z")); // 14:00 Dhaka: Fajr, Dhuhr passed
    location.hash = "#/deen"; render();
    expect(document.querySelector("[data-prayer-pending=fajr]")!.textContent).toBe("Not marked yet today");
    expect(document.querySelector("[data-prayer-pending=asr]")).toBeNull();
  });

  it("settings: alerts default off, the place can be changed by typing coordinates, bad input is refused", () => {
    location.hash = "#/deen"; render();
    expect(document.querySelector("[data-pre-alert=false]")).not.toBeNull();
    expect(document.querySelector("[data-azan-alert=false]")).not.toBeNull();
    (document.getElementById("pr-lat") as HTMLInputElement).value = "22.3569";
    (document.getElementById("pr-lon") as HTMLInputElement).value = "91.7832";
    (document.querySelector("[data-form=prayer-place]") as HTMLFormElement).dispatchEvent(new Event("submit", { cancelable: true }));
    expect(prefs.prayerCoords).toEqual({ lat: 22.3569, lon: 91.7832 });
    (document.getElementById("pr-lat") as HTMLInputElement).value = "123";
    (document.querySelector("[data-form=prayer-place]") as HTMLFormElement).dispatchEvent(new Event("submit", { cancelable: true }));
    expect(prefs.prayerCoords).toEqual({ lat: 22.3569, lon: 91.7832 });
    expect(document.querySelector("[role=alert]")!.textContent).toMatch(/Latitude must be/);
  });

  it("without notification permission, a due pre-alert shows an in-app card once", async () => {
    prefs.prayerAlerts = { preAlert: true, preMinutes: 10, azan: false };
    vi.setSystemTime(new Date(Date.UTC(2026, 9, 23, 22, 35))); // 04:35 Dhaka on 24 Oct: Fajr is 04:44, so the 10-minute pre-alert (due at 04:34) is in its window
    await checkPrayerAlerts();
    await checkPrayerAlerts();
    const cards = inAppReminders().filter((r) => r.id === "2026-10-24-pre-fajr");
    expect(cards.length).toBe(1);
    expect(cards[0]!.text.en).toBe("Fajr in 10 minutes");
  });
});

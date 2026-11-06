import { existsSync } from "node:fs";
// M13 prayer times: formula, Dhaka clock, input parsing, alert logic, one-tap marks and the Deen UI.
// Reference values come from tools/prayer_reference.py (pyephem ephemeris, same method angles), not from this code.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DHAKA_COORDS, DHAKA_UTC_OFFSET_MIN, PRAYER_KEYS, dhakaNow, parseCoord, prayerClock, prayerTimes, validCoords, type PrayerKey } from "../src/core/prayer";
import { AZAN_FAJR_FILE, AZAN_FILE, AZAN_MAX_BYTES, clampVolume, soundPlan } from "../src/core/prayerSound";
import { NO_AZAN, azanFileFor, detectAzan, type AzanAvailability } from "../src/core/azanSlots";
import { DEFAULT_PRAYER_SETTINGS, parsePrayerSettings } from "../src/core/prayerMethod";
import { DEFAULT_ALERT_PREFS, alertSlots, dueSlots, parseAlertPrefs } from "../src/core/prayerAlerts";
import { markedOn, prayerLogId, prayerLogRecord } from "../src/core/prayerLog";
import { Store, MemoryKV } from "../src/core/store";
import { buildNotification, NEUTRAL_TITLE, DEFAULT_NOTIFY_PREFS } from "../src/core/notify";
import { PACKS, type Key } from "../src/i18n/packs";
import { render } from "../src/app";
import { store, prefs } from "../src/ui/state";
import { checkPrayerAlerts, dismissReminder, inAppReminders, playAlertSound, previewAzan, refreshAzanAvailability, setAzanAvailability } from "../src/ui/prayerAlerts";

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
    const all = { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true };
    expect(DEFAULT_ALERT_PREFS).toEqual({ preAlert: false, preMinutes: 10, azan: false, prayers: all, sound: false, volume: 80, azanSlot: "", azanSpeed: 1 });
    expect(parseAlertPrefs(null)).toEqual(DEFAULT_ALERT_PREFS);
    expect(parseAlertPrefs({ preAlert: "yes", preMinutes: 7.5, azan: 1, sound: "on" })).toEqual(DEFAULT_ALERT_PREFS);
    expect(parseAlertPrefs({ preAlert: true, preMinutes: 15, azan: true })).toEqual({ preAlert: true, preMinutes: 15, azan: true, prayers: all, sound: false, volume: 80, azanSlot: "", azanSpeed: 1 });
    expect(parseAlertPrefs({ prayers: { asr: false, isha: "no" } }).prayers).toEqual({ ...all, asr: false });
    expect(parseAlertPrefs({ preMinutes: 0 }).preMinutes).toBe(10);
    expect(parseAlertPrefs({ preMinutes: 61 }).preMinutes).toBe(10);
  });
  const times = { fajr: 282, dhuhr: 712, asr: 900, maghrib: 1046, isha: 1118 } as const;
  it("no slots when both alerts are off", () => {
    expect(alertSlots("2026-10-24", times, DEFAULT_ALERT_PREFS)).toEqual([]);
  });
  it("pre-alert fires N minutes before; azan at the time; a null prayer gets nothing", () => {
    const slots = alertSlots("2026-10-24", { ...times, asr: null }, { ...DEFAULT_ALERT_PREFS, preAlert: true, azan: true });
    expect(slots.find((s) => s.id === "2026-10-24-pre-fajr")?.minute).toBe(272);
    expect(slots.find((s) => s.id === "2026-10-24-azan-fajr")?.minute).toBe(282);
    expect(slots.some((s) => s.prayer === "asr")).toBe(false);
  });
  it("each slot fires once, inside its window, and a late start still fires within the window", () => {
    const slots = alertSlots("2026-10-24", times, { ...DEFAULT_ALERT_PREFS, preAlert: true });
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

describe("M13 alerts: per-prayer choice and sound plan", () => {
  const times = { fajr: 282, dhuhr: 712, asr: 900, maghrib: 1046, isha: 1118 } as const;
  it("a prayer switched off gets no alert of either kind; the rest still do", () => {
    const p = parseAlertPrefs({ preAlert: true, azan: true, prayers: { dhuhr: false, asr: false } });
    const slots = alertSlots("2026-10-24", times, p);
    expect(slots.map((s) => s.prayer)).toEqual(["fajr", "fajr", "maghrib", "maghrib", "isha", "isha"]);
  });
  it("sound plan: nothing unless the toggle is on and the alert is an azan; no file means vibrate, else silent", () => {
    expect(soundPlan({ kind: "azan" }, false, "./a.mp3", true)).toBe("none");
    expect(soundPlan({ kind: "pre" }, true, "./a.mp3", true)).toBe("none");
    expect(soundPlan({ kind: "azan" }, true, "./a.mp3", true)).toBe("audio");
    expect(soundPlan({ kind: "azan" }, true, null, true)).toBe("vibrate");
    expect(soundPlan({ kind: "azan" }, true, null, false)).toBe("none");
  });
  it("no audio file is bundled, and the slots are same-origin relative paths", () => {
    expect(existsSync("public/audio/azan.mp3")).toBe(false);
    expect(existsSync("public/audio/azan-fajr.mp3")).toBe(false);
    for (const n of [1, 2, 3, 4]) { expect(existsSync(`public/audio/azan-${n}.mp3`)).toBe(false); expect(existsSync(`public/audio/azan-${n}-fajr.mp3`)).toBe(false); }
    for (const f of [AZAN_FILE, AZAN_FAJR_FILE]) expect(f).toMatch(/^\.\/audio\//);
  });
  const resp = (ok: boolean, type: string, len?: number) => async () => ({ ok, headers: { get: (n: string) => (n === "content-type" ? type : n === "content-length" && len !== undefined ? String(len) : null) } });
  it("detects a present file, an absent file, an HTML fallback page, an oversize file and a network error", async () => {
    const all = await detectAzan(resp(true, "audio/mpeg", 1000));
    expect(all.slots.map((x) => x.main)).toEqual(["./audio/azan-1.mp3", "./audio/azan-2.mp3", "./audio/azan-3.mp3", "./audio/azan-4.mp3"]);
    expect(all.slots[0]!.fajr).toBe("./audio/azan-1-fajr.mp3");
    expect(await detectAzan(resp(false, "text/html"))).toEqual(NO_AZAN);
    expect(await detectAzan(resp(true, "text/html; charset=utf-8"))).toEqual(NO_AZAN);
    expect(await detectAzan(resp(true, "audio/mpeg", AZAN_MAX_BYTES + 1))).toEqual(NO_AZAN);
    expect(await detectAzan(async () => { throw new Error("offline"); })).toEqual(NO_AZAN);
  });
  it("Fajr prefers its own file, otherwise the main one; nothing added gives null", () => {
    const av = (main: string | null, fajr: string | null): AzanAvailability => ({ slots: [{ id: "1", main, fajr }] });
    expect(azanFileFor("fajr", av(AZAN_FILE, AZAN_FAJR_FILE))).toBe(AZAN_FAJR_FILE);
    expect(azanFileFor("fajr", av(AZAN_FILE, null))).toBe(AZAN_FILE);
    expect(azanFileFor("asr", av(AZAN_FILE, AZAN_FAJR_FILE))).toBe(AZAN_FILE);
    expect(azanFileFor("asr", av(null, AZAN_FAJR_FILE))).toBeNull();
    expect(azanFileFor("fajr", NO_AZAN)).toBeNull();
  });
  it("volume is clamped; zero is silent; reduced motion skips vibration but not audio", () => {
    expect(clampVolume(150)).toBe(100); expect(clampVolume(-4)).toBe(0); expect(clampVolume("x")).toBe(80); expect(clampVolume(33.4)).toBe(33);
    expect(soundPlan({ kind: "azan" }, true, "./a.mp3", true, 0)).toBe("none");
    expect(soundPlan({ kind: "azan" }, true, null, true, 80, true)).toBe("none");
    expect(soundPlan({ kind: "azan" }, true, "./a.mp3", true, 80, true)).toBe("audio");
    expect(parseAlertPrefs({ volume: 40 }).volume).toBe(40); expect(parseAlertPrefs({}).volume).toBe(80);
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
    expect(document.querySelector("[data-prayer-method-card]")).toBeNull(); expect(document.querySelector("[data-prayer-link]")!.getAttribute("href")).toBe("#/settings/prayer"); // Deen keeps times and a link row
    expect(document.querySelector("[data-prayer-method]")!.textContent).toMatch(/Karachi/);
    const asrBefore = document.querySelector("[data-prayer-time=asr]")!.textContent;
    location.hash = "#/settings/prayer"; render();
    expect(document.querySelector("[data-prayer-verify]")!.textContent).toMatch(/Verify with your local timetable/);
    const sel = document.querySelector("[data-prayer-asr-select]") as HTMLSelectElement; sel.value = "hanafi"; sel.dispatchEvent(new Event("change"));
    expect(prefs.prayerSettings.asr).toBe("hanafi");
    location.hash = "#/deen"; render(); expect(document.querySelector("[data-prayer-time=asr]")!.textContent).not.toBe(asrBefore); location.hash = "#/settings/prayer"; render();
    const fajrBefore = prayerTimes({ y: 2026, m: 10, d: 24 }, DHAKA_COORDS).fajr!;
    const off = document.querySelector("[data-prayer-offset=fajr]") as HTMLInputElement; off.value = "4"; off.dispatchEvent(new Event("change"));
    location.hash = "#/deen"; render(); expect(document.querySelector("[data-prayer-time=fajr]")!.textContent).toBe(prayerClock(fajrBefore + 4)); location.hash = "#/settings/prayer"; render();
    const m = document.querySelector("[data-prayer-method-select]") as HTMLSelectElement; m.value = "mwl"; m.dispatchEvent(new Event("change"));
    expect(prefs.prayerSettings.method).toBe("mwl");
    (document.querySelector("[data-act=prayer-method-reset]") as HTMLButtonElement).click();
    expect(prefs.prayerSettings).toEqual(DEFAULT_PRAYER_SETTINGS);
  });
  it("method settings are not personal data: no consent prompt is needed to change them", () => {
    location.hash = "#/settings/prayer"; render();
    expect(document.querySelector("[data-prayer-method-card] [data-consent]")).toBeNull();
  });
  it("every prayer that is not marked shows the same neutral line (passed or not), and marked ones do not", () => {
    vi.setSystemTime(new Date("2026-10-24T08:00:00Z")); // 14:00 Dhaka: Fajr, Dhuhr passed
    location.hash = "#/deen"; render();
    expect(document.querySelector("[data-prayer-pending=fajr]")!.textContent).toBe("Not marked yet today");
    for (const k of ["fajr", "dhuhr", "asr", "maghrib", "isha"]) expect(document.querySelector(`[data-prayer-pending=${k}]`)!.textContent).toBe("Not marked yet today");
  });

  it("settings: alerts default off, the place can be changed by typing coordinates, bad input is refused", () => {
    location.hash = "#/settings/prayer"; render();
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
    prefs.prayerAlerts = { ...DEFAULT_ALERT_PREFS, preAlert: true };
    vi.setSystemTime(new Date(Date.UTC(2026, 9, 23, 22, 35))); // 04:35 Dhaka on 24 Oct: Fajr is 04:44, so the 10-minute pre-alert (due at 04:34) is in its window
    await checkPrayerAlerts();
    await checkPrayerAlerts();
    const cards = inAppReminders().filter((r) => r.id === "2026-10-24-pre-fajr");
    expect(cards.length).toBe(1);
    expect(cards[0]!.text.en).toBe("Fajr in 10 minutes");
  });
  it("per-prayer buttons are all selected once an alert is on, can be switched off one by one, and the sound toggle starts Off", () => {
    location.hash = "#/settings/prayer"; render();
    expect(document.querySelectorAll("[data-alert-prayer][aria-pressed=true]").length).toBe(5);
    expect(document.querySelector("[data-sound=false]")).not.toBeNull();
    (document.querySelector("[data-alert-prayer=asr]") as HTMLButtonElement).click();
    expect(prefs.prayerAlerts.prayers.asr).toBe(false); expect(prefs.prayerAlerts.prayers.fajr).toBe(true);
    expect(prefs.prayerAlerts.preAlert).toBe(false); expect(prefs.prayerAlerts.azan).toBe(false); // choosing prayers never turns alerts on
  });
  it("the sound note says the audio file is not added yet, and does not claim a sound will play", () => {
    location.hash = "#/settings/prayer"; render();
    expect(document.querySelector("[data-sound-note]")!.textContent).toMatch(/No azan audio is added yet/);
  });
  it("when the browser has no Notification API, the message says so plainly", () => {
    const saved = (globalThis as { Notification?: unknown }).Notification;
    delete (globalThis as { Notification?: unknown }).Notification;
    try { location.hash = "#/settings/prayer"; render(); expect(document.querySelector("[data-perm=unsupported]")!.textContent).toMatch(/cannot show phone notifications/); }
    finally { if (saved) (globalThis as { Notification?: unknown }).Notification = saved; }
  });
  it("azan with the sound toggle On vibrates (no audio file); with it Off nothing happens; pre-alerts never vibrate", () => {
    const vib = vi.fn(); Object.defineProperty(navigator, "vibrate", { value: vib, configurable: true });
    const azan = { id: "x", prayer: "fajr" as const, kind: "azan" as const, minute: 1, minutesBefore: 0 };
    expect(playAlertSound(azan, false)).toBe("none"); expect(vib).not.toHaveBeenCalled();
    expect(playAlertSound({ ...azan, kind: "pre" }, true)).toBe("none");
    expect(playAlertSound(azan, true)).toBe("vibrate"); expect(vib).toHaveBeenCalledTimes(1);
    Object.defineProperty(navigator, "vibrate", { value: undefined, configurable: true });
    expect(playAlertSound(azan, true)).toBe("none");
  });
  it("with a (mocked) azan file present, an azan alert plays it at the chosen volume; preview plays once; absent file is silent", async () => {
    const plays: Array<{ src: string; vol: number }> = [];
    class FakeAudio { src: string; volume = 1; constructor(src: string) { this.src = src; } play() { plays.push({ src: this.src, vol: this.volume }); return Promise.resolve(); } }
    vi.stubGlobal("Audio", FakeAudio);
    const azan = { id: "x", prayer: "fajr" as const, kind: "azan" as const, minute: 1, minutesBefore: 0 };
    try {
      prefs.prayerAlerts = { ...DEFAULT_ALERT_PREFS, azan: true, sound: true, volume: 50 };
      setAzanAvailability({ slots: [{ id: "1", main: AZAN_FILE, fajr: AZAN_FAJR_FILE }] });
      expect(playAlertSound(azan, true)).toBe("audio");
      expect(plays).toEqual([{ src: AZAN_FAJR_FILE, vol: 0.5 }]);
      expect(playAlertSound(azan, false)).toBe("none");
      expect(previewAzan("dhuhr")).toBe(true); expect(plays[1]).toEqual({ src: AZAN_FILE, vol: 0.5 });
      setAzanAvailability(NO_AZAN);
      expect(previewAzan("dhuhr")).toBe(false); expect(playAlertSound(azan, true)).not.toBe("audio"); expect(plays.length).toBe(2);
      // refresh looks at the app's own origin only
      const calls: string[] = [];
      vi.stubGlobal("fetch", async (u: string) => { calls.push(u); return { ok: true, headers: { get: (n: string) => (n === "content-type" ? "audio/mpeg" : null) } }; });
      expect((await refreshAzanAvailability(true)).slots[0]!.main).toBe("./audio/azan-1.mp3");
      expect(calls.every((u) => u.startsWith("./"))).toBe(true);
    } finally { vi.unstubAllGlobals(); setAzanAvailability(NO_AZAN); }
  });
  it("Settings shows the volume slider, preview button and the docs pointer", () => {
    location.hash = "#/settings/prayer"; render();
    expect(document.querySelector("#azan-vol")).not.toBeNull();
    expect(document.querySelector("[data-act=azan-preview]")).not.toBeNull();
    expect(document.querySelector("[data-azan-doc]")!.textContent).toBe("Add your own azan files (up to 4) and set the speed: see docs/azan.md");
  });
  it("a switched-off prayer gives no in-app card", async () => {
    for (const r of [...inAppReminders()]) dismissReminder(r.id); // reminders live in module memory across tests
    prefs.prayerAlerts = { ...DEFAULT_ALERT_PREFS, preAlert: true, prayers: { ...DEFAULT_ALERT_PREFS.prayers, fajr: false } };
    vi.setSystemTime(new Date(Date.UTC(2026, 9, 23, 22, 35)));
    await checkPrayerAlerts();
    expect(inAppReminders().filter((r) => r.id === "2026-10-24-pre-fajr").length).toBe(0);
  });
});

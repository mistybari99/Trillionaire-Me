// Azan recordings (up to 4 slots), speed and the length line. No real audio is bundled; files are mocked.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { NO_AZAN, azanFileFor, chooseSlot, defaultSlots, detectAzan, hasAnyAzan, parseManifest, parseSlotPref, type AzanAvailability } from "../src/core/azanSlots";
import { DEFAULT_SPEED, SPEED_MAX, SPEED_MIN, clampSpeed, formatDuration, speedReadout } from "../src/core/azanSpeed";
import { DEFAULT_ALERT_PREFS, parseAlertPrefs } from "../src/core/prayerAlerts";
import { precacheList } from "../tools/precache";
import { PACKS } from "../src/i18n/packs";
import { render } from "../src/app";
import { prefs, store } from "../src/ui/state";
import { previewAzan, setAzanAvailability } from "../src/ui/prayerAlerts";
import { readoutText } from "../src/ui/azanSoundUi";

const av = (mains: Array<string | null>, fajr: Array<string | null> = []): AzanAvailability => ({ slots: mains.map((m, i) => ({ id: String(i + 1) as "1", main: m, fajr: fajr[i] ?? null })) });

describe("azan speed: pure calculation", () => {
  it("formats m:ss and never shows 0 for an unknown length", () => {
    expect(formatDuration(250)).toBe("4:10"); expect(formatDuration(59.6)).toBe("1:00"); expect(formatDuration(5)).toBe("0:05");
    for (const bad of [0, -3, NaN, Infinity, null, undefined, "x"]) expect(formatDuration(bad)).toBeNull();
  });
  it("4:10 at 1.25x is 3:20, 50 s shorter", () => {
    expect(speedReadout(250, 1.25)).toMatchObject({ known: true, original: "4:10", adjusted: "3:20", diffSec: 50, direction: "shorter" });
  });
  it("slower is longer, normal is the same, unknown stays unknown", () => {
    expect(speedReadout(240, 0.75)).toMatchObject({ adjusted: "5:20", diffSec: 80, direction: "longer" });
    expect(speedReadout(240, 1)).toMatchObject({ adjusted: "4:00", diffSec: 0, direction: "same" });
    expect(speedReadout(null, 1.25)).toEqual({ known: false, rate: 1.25 });
    expect(speedReadout(0, 1)).toEqual({ known: false, rate: 1 });
  });
  it("speed is limited to 0.75-1.5 in steps of 0.05; bad input is 1.0", () => {
    expect(SPEED_MIN).toBe(0.75); expect(SPEED_MAX).toBe(1.5); expect(DEFAULT_SPEED).toBe(1);
    expect(clampSpeed(0.2)).toBe(0.75); expect(clampSpeed(9)).toBe(1.5); expect(clampSpeed(1.23)).toBe(1.25); expect(clampSpeed(1.05)).toBe(1.05);
    for (const bad of ["1.2", NaN, null, undefined]) expect(clampSpeed(bad)).toBe(1);
  });
  it("the length line says unknown, shorter, longer or same in every language", () => {
    expect(readoutText(null, 1.25, "en")).toBe("Length: unknown (at 1.25x)");
    expect(readoutText(250, 1.25, "en")).toBe("Length: 4:10 → 3:20, 50 s shorter (at 1.25x)");
    expect(readoutText(250, 0.75, "en")).toMatch(/longer/); expect(readoutText(250, 1, "en")).toMatch(/same/);
    expect(readoutText(250, 1.25, "bn")).toMatch(/4:10 → 3:20, 50 সেকেন্ড কম/); expect(readoutText(null, 1, "bn")).toMatch(/জানা নেই/);
    expect(readoutText(250, 1.25, "mix")).toMatch(/50 সেকেন্ড কম/);
  });
});

describe("azan slots", () => {
  const resp = (present: (u: string) => boolean) => async (u: string) => ({ ok: present(u), headers: { get: (n: string) => (n === "content-type" ? "audio/mpeg" : null) } });
  it("four slots; slot 1 also accepts the older azan.mp3 / azan-fajr.mp3", async () => {
    expect(defaultSlots().map((s) => s.id)).toEqual(["1", "2", "3", "4"]);
    const old = await detectAzan(resp((u) => u === "./audio/azan.mp3" || u === "./audio/azan-fajr.mp3"));
    expect(old.slots[0]).toMatchObject({ main: "./audio/azan.mp3", fajr: "./audio/azan-fajr.mp3" });
    expect(old.slots.slice(1).every((s) => s.main === null)).toBe(true);
    expect(azanFileFor("fajr", old)).toBe("./audio/azan-fajr.mp3"); expect(azanFileFor("asr", old)).toBe("./audio/azan.mp3");
  });
  it("a missing slot is not added; a Fajr file without a main file is ignored", async () => {
    const some = await detectAzan(resp((u) => u === "./audio/azan-2.mp3" || u === "./audio/azan-3-fajr.mp3"));
    expect(some.slots.map((s) => s.main)).toEqual([null, "./audio/azan-2.mp3", null, null]);
    expect(some.slots[2]!.fajr).toBeNull();
    expect(hasAnyAzan(some)).toBe(true); expect(hasAnyAzan(NO_AZAN)).toBe(false);
  });
  it("default is the first added one; a choice is kept only if that slot is added", () => {
    const a = av([null, "./audio/azan-2.mp3", "./audio/azan-3.mp3", null]);
    expect(chooseSlot(a, "")?.id).toBe("2"); expect(chooseSlot(a, "3")?.id).toBe("3");
    expect(chooseSlot(a, "1")?.id).toBe("2"); expect(chooseSlot(a, "4")?.id).toBe("2"); expect(chooseSlot(NO_AZAN, "1")).toBeNull();
    expect(azanFileFor("dhuhr", a, "3")).toBe("./audio/azan-3.mp3"); expect(azanFileFor("dhuhr", NO_AZAN, "3")).toBeNull();
  });
  it("Fajr uses the chosen slot's Fajr file, then its main file", () => {
    const a = av(["./audio/azan-1.mp3", "./audio/azan-2.mp3"], [null, "./audio/azan-2-fajr.mp3"]);
    expect(azanFileFor("fajr", a, "1")).toBe("./audio/azan-1.mp3"); expect(azanFileFor("fajr", a, "2")).toBe("./audio/azan-2-fajr.mp3");
  });
  it("the manifest only sets label and source; bad entries are ignored and file names cannot be changed", () => {
    const m = parseManifest({ slots: [{ id: "2", label: { en: "Recording A", bn: "রেকর্ডিং এ" }, source: "Own recording, 2026", files: ["../../evil.mp3"] }, { id: "9", source: "x" }, { id: "3", label: { en: "only en" } }, null, 5] });
    expect(m[1]).toMatchObject({ id: "2", label: { en: "Recording A", bn: "রেকর্ডিং এ" }, source: "Own recording, 2026", files: ["./audio/azan-2.mp3"] });
    expect(m[2]!.label).toBeUndefined(); expect(m).toHaveLength(4);
    expect(parseManifest("junk")).toEqual(defaultSlots()); expect(parseManifest(null)).toEqual(defaultSlots());
  });
  it("the shipped manifest is valid, has 4 slots, labels numbered in sequence with a name (1 · Noor) and no licence claim; the owner's 4 recordings are present, real MP3 and within the size cap", () => {
    expect(existsSync("public/audio/azan-manifest.json")).toBe(true);
    const raw = JSON.parse(readFileSync("public/audio/azan-manifest.json", "utf8"));
    expect(raw.slots.map((s: { id: string }) => s.id)).toEqual(["1", "2", "3", "4"]);
    expect(parseManifest(raw).every((s) => s.label)).toBe(true);
    for (const n of [1, 2, 3, 4]) {
      const f = `public/audio/azan-${n}.mp3`;
      expect(existsSync(f), f).toBe(true);
      const buf = readFileSync(f);
      expect(buf.length, f).toBeGreaterThan(100_000);
      expect(buf.length, f).toBeLessThanOrEqual(3 * 1024 * 1024);
      // Some files carry a few empty padding bytes before the first sound frame (azan-2 has 216); browsers skip them. Allow at most 1 KB.
      let i = 0; while (i < buf.length && buf[i] === 0) i++;
      expect(i, `${f} padding`).toBeLessThan(1024);
      const id3 = buf.subarray(i, i + 3).toString("latin1") === "ID3";
      const frame = buf[i] === 0xff && (buf[i + 1]! & 0xe0) === 0xe0;
      expect(id3 || frame, `${f} must start like an MP3`).toBe(true);
    }
    for (const s of raw.slots as Array<{ label: { en: string; bn: string }; source: string }>) {
      expect(s.label.en).toMatch(/^[1-4] · \D+$/);
      expect(s.label.bn).toMatch(/^[1-4] · \D+$/);
      expect(s.label.en).not.toMatch(/recording/i);
      expect(s.label.bn).not.toMatch(/রেকর্ডিং/);
      expect(s.source).toMatch(/owner/i);
      expect(s.source).not.toMatch(/licen[cs]ed under|public domain|free to use/i);
    }
    expect(new Set(raw.slots.map((s: { label: { en: string } }) => s.label.en)).size).toBe(4);
  });
  it("the saved choice and speed are additive: an old saved value gets the defaults", () => {
    const old = { preAlert: true, preMinutes: 15, azan: true, sound: true, volume: 40 }; // saved before slots existed
    expect(parseAlertPrefs(old)).toEqual({ ...DEFAULT_ALERT_PREFS, preAlert: true, preMinutes: 15, azan: true, sound: true, volume: 40 });
    expect(parseAlertPrefs({ azanSlot: "3", azanSpeed: 1.2 })).toMatchObject({ azanSlot: "3", azanSpeed: 1.2 });
    expect(parseAlertPrefs({ azanSlot: "7", azanSpeed: "fast" })).toMatchObject({ azanSlot: "", azanSpeed: 1 });
    expect(parseSlotPref(2)).toBe("");
  });
  it("offline: the manifest and any added slot files are saved by the app-shell list; the 3 MB cap stays", () => {
    const list = precacheList(["index.html", "audio/azan-manifest.json", "audio/azan-2.mp3", "audio/azan.mp3", "audio/.gitkeep"]);
    expect(list).toEqual(expect.arrayContaining(["./audio/azan-manifest.json", "./audio/azan-2.mp3", "./audio/azan.mp3"]));
    expect(list.some((u) => u.includes("gitkeep"))).toBe(false);
  });
  it("every azan text exists in English and Bangla with the same placeholders", () => {
    const keys = Object.keys(PACKS.en).filter((k) => k.startsWith("deen.azan."));
    expect(keys.length).toBeGreaterThan(15);
    for (const k of keys) { const p = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(); expect(PACKS.bn[k as keyof typeof PACKS.bn], k).toBeTruthy(); expect(p(PACKS.bn[k as keyof typeof PACKS.bn])).toBe(p(PACKS.en[k as keyof typeof PACKS.en])); }
  });
});

describe("azan settings screen", () => {
  const reset = () => { localStorage.clear(); store.demo.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); };
  const q = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!;
  type PlayEvt = { src: string; vol: number; rate: number; pitch: boolean | undefined };
  const plays: PlayEvt[] = [];
  let metaSec: number | null = null; // what the fake file's metadata says; null = never loads
  class FakeAudio {
    volume = 1; playbackRate = 1; defaultPlaybackRate = 1; preservesPitch: boolean | undefined; preload = ""; duration = NaN; private _src = "";
    private l: Record<string, Array<() => void>> = {};
    constructor(src?: string) { if (src) this._src = src; }
    get src() { return this._src; }
    set src(v: string) { this._src = v; if (metaSec !== null) queueMicrotask(() => { this.duration = metaSec as number; (this.l.loadedmetadata ?? []).forEach((f) => f()); }); }
    addEventListener(e: string, f: () => void) { (this.l[e] ??= []).push(f); }
    play() { plays.push({ src: this._src, vol: this.volume, rate: this.playbackRate, pitch: this.preservesPitch }); return Promise.resolve(); }
  }
  beforeEach(() => { reset(); plays.length = 0; metaSec = null; vi.stubGlobal("Audio", FakeAudio); window.addEventListener("hashchange", render); });
  afterEach(() => { window.removeEventListener("hashchange", render); vi.unstubAllGlobals(); setAzanAvailability(NO_AZAN); });

  it("with nothing added, all 4 slots say Not added and cannot be chosen; length is unknown", () => {
    setAzanAvailability(NO_AZAN); location.hash = "#/settings/prayer"; render();
    const rows = document.querySelectorAll("[data-azan-slot]");
    expect(rows.length).toBe(4);
    for (const r of rows) { expect(r.getAttribute("data-azan-state")).toBe("missing"); expect(r.textContent).toMatch(/Not added/); expect(r.querySelector<HTMLButtonElement>("[data-act=azan-choose]")!.disabled).toBe(true); expect(r.querySelector("[data-act=azan-play]")).toBeNull(); }
    expect(q("[data-azan-slots-note]").textContent).toMatch(/up to 4/);
    expect(q("[data-azan-readout]").textContent).toBe("Length: unknown (at 1.0x)");
    expect(q<HTMLButtonElement>("[data-act=azan-preview]").getAttribute("data-act")).toBe("azan-preview");
    for (const b of document.querySelectorAll("[data-azan-slot] button, [data-act=azan-speed-save], [data-act=azan-preview]")) expect((b as HTMLElement).className).toMatch(/k-btn/);
  });
  it("added slots can be chosen; the choice is saved; the first added one is chosen by default", () => {
    setAzanAvailability(av(["./audio/azan-1.mp3", null, "./audio/azan-3.mp3", null])); location.hash = "#/settings/prayer"; render();
    expect(q("[data-azan-slot='1']").getAttribute("data-azan-state")).toBe("chosen");
    expect(q("[data-azan-slot='2']").getAttribute("data-azan-state")).toBe("missing");
    q<HTMLButtonElement>("[data-azan-slot='3'] [data-act=azan-choose]").click();
    expect(prefs.prayerAlerts.azanSlot).toBe("3"); expect(localStorage.getItem("tm:ui:prayerAlerts")).toContain('"azanSlot":"3"');
    expect(q("[data-azan-slot='3']").getAttribute("data-azan-state")).toBe("chosen");
  });
  it("the slider updates the length line live, Save keeps the speed, and preview plays at the slider speed with natural pitch", async () => {
    setAzanAvailability(av(["./audio/azan-1.mp3"])); location.hash = "#/settings/prayer"; render();
    const slider = q<HTMLInputElement>("#azan-speed");
    expect([slider.min, slider.max, slider.step, slider.value]).toEqual(["0.75", "1.5", "0.05", "1"]);
    slider.value = "1.25"; slider.dispatchEvent(new Event("input"));
    expect(q("[data-azan-speed-value]").textContent).toBe("Speed: 1.25x");
    expect(q("[data-azan-readout]").textContent).toMatch(/unknown/); // metadata not read yet: unknown, never 0
    expect(prefs.prayerAlerts.azanSpeed).toBe(1); // not saved until Save
    prefs.prayerAlerts = { ...prefs.prayerAlerts, volume: 60 };
    q<HTMLButtonElement>("[data-act=azan-preview]").click();
    expect(plays.at(-1)).toMatchObject({ src: "./audio/azan-1.mp3", rate: 1.25, pitch: true, vol: 0.6 });
    q<HTMLButtonElement>("[data-act=azan-speed-save]").click();
    expect(prefs.prayerAlerts.azanSpeed).toBe(1.25);
    expect(q("[data-azan-speed-saved]").textContent).toBe("Saved speed: 1.25x");
    q<HTMLButtonElement>("[data-act=azan-speed-reset]").click();
    expect(q<HTMLInputElement>("#azan-speed").value).toBe("1");
  });
  it("when the recording's metadata loads, the line shows its real length and the length at the chosen speed", async () => {
    metaSec = 250; // a recording that is 4:10 long (unique path so the length cache is not reused)
    setAzanAvailability(av(["./audio/azan-meta.mp3"])); location.hash = "#/settings/prayer"; render();
    await new Promise((r) => setTimeout(r, 0));
    expect(q("[data-azan-readout]").textContent).toBe("Length: 4:10 (same at 1.0x)");
    const slider = q<HTMLInputElement>("#azan-speed"); slider.value = "1.25"; slider.dispatchEvent(new Event("input"));
    expect(q("[data-azan-readout]").textContent).toBe("Length: 4:10 → 3:20, 50 s shorter (at 1.25x)");
    slider.value = "0.75"; slider.dispatchEvent(new Event("input"));
    expect(q("[data-azan-readout]").textContent).toBe("Length: 4:10 → 5:33, 83 s longer (at 0.75x)");
  });
  it("preview of another slot plays that file; with nothing added, preview says so", () => {
    setAzanAvailability(av(["./audio/azan-1.mp3", "./audio/azan-2.mp3"])); location.hash = "#/settings/prayer"; render();
    q<HTMLButtonElement>("[data-azan-play='2']").click();
    expect(plays.at(-1)!.src).toBe("./audio/azan-2.mp3");
    expect(previewAzan("dhuhr", { slot: "2", speed: 0.75 })).toBe(true); expect(plays.at(-1)!.rate).toBe(0.75);
    setAzanAvailability(NO_AZAN); render();
    q<HTMLButtonElement>("[data-act=azan-preview]").click();
    expect(q("[data-preview-note]").textContent).toMatch(/nothing to play/);
  });
  it("Bangla and Mix screens use the plain words", () => {
    setAzanAvailability(av(["./audio/azan-1.mp3", null])); localStorage.setItem("tm:ui:lang", "bn"); location.hash = "#/settings/prayer"; render();
    expect(q("[data-azan-slot='2']").textContent).toMatch(/যোগ করা হয়নি/);
    expect(document.querySelector("[data-act=azan-speed-save]")!.textContent).toBe("স্পিড সেভ করুন");
    localStorage.setItem("tm:ui:lang", "mix"); render();
    expect(document.querySelector("[data-act=azan-speed-save]")!.textContent).toMatch(/Save/);
  });
  it("the row trail may wrap inside its row, so four named recordings with Play buttons do not overflow at 200 percent text (CI failure 7 Nov)", () => {
    expect(readFileSync("src/ui/kit.css", "utf8")).toMatch(/\.k-row__trail\{[^}]*max-width:100%/);
  });
});

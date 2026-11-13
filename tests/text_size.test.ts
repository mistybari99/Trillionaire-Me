// Text size (owner report 3 Nov 2026: choosing 125/150/200 % changed nothing). Root cause: type sizes were written in px, which ignore the
// root font size that the Text size slider sets. Sizes are now rem, so they scale. The browser check is TEXTSIZE in tools/e2e.mjs.
import "fake-indexeddb/auto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../src/app";
import { applyPrefs, prefs, setScaleLocked, store } from "../src/ui/state";
import { PACKS } from "../src/i18n/packs";

const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = `${d}/${f}`; return statSync(p).isDirectory() ? walk(p) : [p]; });
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); store.demo.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); document.documentElement.style.fontSize = ""; });
afterEach(() => { vi.restoreAllMocks(); setScaleLocked(false); sessionStorage.clear(); });

describe("type sizes scale with the Text size setting", () => {
  it("no stylesheet or inline style fixes a font size in px (rem or em only)", () => {
    const files = walk("src").filter((f) => /\.(css|ts)$/.test(f)); const bad: string[] = [];
    for (const f of files) {
      const s = readFileSync(f, "utf8");
      for (const m of s.matchAll(/font-size\s*:\s*[\d.]+px|[{;"'\s]font\s*:\s*[^;}"'`]*?\b[\d.]+px/g)) bad.push(`${f}: ${m[0].trim()}`);
      for (const m of s.matchAll(/fontSize\s*=\s*[`"'][\d.]+px/g)) bad.push(`${f}: ${m[0]}`);
    }
    expect(bad).toEqual([]);
  });
  it("the page start reads the saved size and applies it before the first draw", () => {
    expect(readFileSync("src/main.ts", "utf8")).toMatch(/applyPrefs\(\);\s*\n\s*\nconst onRoute/);
    for (const n of [50, 63, 75, 100, 117, 137, 150]) { localStorage.setItem("tm:ui:scale", String(n)); applyPrefs(); expect(document.documentElement.style.fontSize).toBe(`${n}%`); }
    for (const [saved, expected] of [["200", 150], ["25", 50], ["50", 50], ["NaN", 100], ["Infinity", 100], ["-1", 100], ["0", 100], ["", 100], ["117.6", 118]] as const) {
      localStorage.setItem("tm:ui:scale", saved); applyPrefs(); expect(document.documentElement.style.fontSize).toBe(`${expected}%`);
    }
    localStorage.removeItem("tm:ui:scale"); applyPrefs(); expect(prefs.scale).toBe(100);
  });
  it("live dragging updates and saves arbitrary integer sizes without replacing the focused slider", () => {
    location.hash = "#/settings"; render();
    const slider = document.querySelector<HTMLInputElement>("[data-scale=slider]")!;
    expect([slider.type, slider.min, slider.max, slider.step]).toEqual(["range", "50", "150", "1"]);
    slider.focus();
    for (const n of [50, 63, 75, 117, 137, 150]) {
      slider.value = String(n); slider.dispatchEvent(new Event("input", { bubbles: true }));
      expect(localStorage.getItem("tm:ui:scale")).toBe(String(n)); expect(document.documentElement.style.fontSize).toBe(`${n}%`);
      expect(document.querySelector("[data-scale=slider]")).toBe(slider); expect(document.activeElement).toBe(slider);
      expect(slider.getAttribute("aria-valuetext")).toBe(`${n}%`); expect(document.querySelector(".text-size-readout output")!.textContent).toBe(`${n}%`);
    }
    slider.value = "113"; slider.dispatchEvent(new Event("input")); render();
    expect(document.querySelector<HTMLInputElement>("[data-scale=slider]")!.value).toBe("113");
  });
  it("normalizes programmatic writes to the supported range", () => {
    for (const [value, expected] of [[200, 150], [25, 50], [50, 50], [117.6, 118], [NaN, 100]] as const) { prefs.scale = value; expect(localStorage.getItem("tm:ui:scale")).toBe(String(expected)); }
  });
  it("locks the precise size across routes and restores focus and the same control after unlock", () => {
    localStorage.setItem("tm:ui:scale", "113"); location.hash = "#/settings"; render();
    const lock = document.querySelector<HTMLButtonElement>("[data-scale-lock]")!;
    expect(prefs.scaleLocked).toBe(false); expect(lock.getAttribute("aria-pressed")).toBe("false");
    lock.focus(); lock.click();
    const lockedButton = document.querySelector<HTMLButtonElement>("[data-scale-lock]")!;
    const locked = document.querySelector<HTMLInputElement>("[data-scale=slider]")!;
    expect(document.activeElement).toBe(lockedButton); expect(lockedButton.getAttribute("aria-pressed")).toBe("true");
    expect(prefs.scaleLocked).toBe(true); expect(localStorage.getItem("tm:ui:scaleLocked")).toBe("on"); expect(locked.disabled).toBe(true);
    locked.value = "50"; locked.dispatchEvent(new Event("input", { bubbles: true }));
    expect(prefs.scale).toBe(113); expect(locked.value).toBe("113"); expect(document.documentElement.style.fontSize).toBe("113%");
    location.hash = "#/today"; render(); location.hash = "#/settings/home/textsize"; render();
    expect(document.querySelector<HTMLInputElement>("[data-scale=slider]")!.disabled).toBe(true);
    document.querySelector<HTMLButtonElement>("[data-scale-lock]")!.click();
    expect(document.activeElement).toBe(document.querySelector("[data-scale-lock]"));
    expect(prefs.scaleLocked).toBe(false); expect(localStorage.getItem("tm:ui:scaleLocked")).toBe("off");
    const open = document.querySelector<HTMLInputElement>("[data-scale=slider]")!; expect(open.disabled).toBe(false); expect(open.value).toBe("113");
  });
  it("uses a page-session fallback after a rejected device save and resolves contradictory persisted states", () => {
    localStorage.setItem("tm:ui:scale", "137"); localStorage.setItem("tm:ui:scaleLocked", "off"); location.hash = "#/settings"; render();
    const real = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      if (this === localStorage && key === "tm:ui:scaleLocked") throw new DOMException("blocked", "QuotaExceededError");
      return real.call(this, key, value);
    });
    document.querySelector<HTMLButtonElement>("[data-scale-lock]")!.click();
    expect(prefs.scaleLocked).toBe(true); expect(sessionStorage.getItem("tm:session:ui:scaleLocked")).toBe("on");
    expect(localStorage.getItem("tm:ui:scaleLocked")).toBe("off"); expect(document.querySelector<HTMLInputElement>("[data-scale=slider]")!.disabled).toBe(true);
    expect(document.querySelector("[data-scale-lock-error]")?.getAttribute("role")).toBe("alert");
    sessionStorage.clear(); expect(prefs.scaleLocked).toBe(false);
  });
  it("falls back in memory when both storage APIs reject writes, and durable success clears the session override", () => {
    const real = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      if (key.includes("scaleLocked")) throw new DOMException("blocked", "SecurityError");
      return real.call(this, key, value);
    });
    expect(setScaleLocked(true)).toEqual({ saved: false }); expect(prefs.scaleLocked).toBe(true);
    vi.restoreAllMocks(); expect(setScaleLocked(false)).toEqual({ saved: true });
    expect(prefs.scaleLocked).toBe(false); expect(sessionStorage.getItem("tm:session:ui:scaleLocked")).toBeNull();
  });
  it("has named lock actions and state descriptions in English, Bangla and Mix", () => {
    for (const lang of ["en", "bn", "mix"] as const) {
      setScaleLocked(false); localStorage.setItem("tm:ui:lang", lang); location.hash = "#/settings"; render();
      const open = document.querySelector<HTMLButtonElement>("[data-scale-lock]")!;
      expect(open.getAttribute("aria-label")).toBe(PACKS[lang]["set.textsize.lock"]); expect(open.getAttribute("aria-pressed")).toBe("false");
      expect(document.querySelector("[data-scale=slider]")!.getAttribute("aria-describedby")).toBe("text-size-lock-state");
      open.click();
      const closed = document.querySelector<HTMLButtonElement>("[data-scale-lock]")!;
      expect(closed.getAttribute("aria-label")).toBe(PACKS[lang]["set.textsize.unlock"]); expect(closed.getAttribute("aria-pressed")).toBe("true");
      expect(document.querySelector("[data-scale-lock-state]")!.textContent).toBe(PACKS[lang]["set.textsize.locked"]);
    }
  });
});

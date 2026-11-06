// Text size (owner report 3 Nov 2026: choosing 125/150/200 % changed nothing). Root cause: type sizes were written in px, which ignore the
// root font size that the Text size slider sets. Sizes are now rem, so they scale. The browser check is TEXTSIZE in tools/e2e.mjs.
import "fake-indexeddb/auto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { applyPrefs, prefs, store } from "../src/ui/state";

const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = `${d}/${f}`; return statSync(p).isDirectory() ? walk(p) : [p]; });
beforeEach(() => { localStorage.clear(); store.demo.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); document.documentElement.style.fontSize = ""; });

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
    for (const n of [75, 83, 100, 117, 137, 150]) { localStorage.setItem("tm:ui:scale", String(n)); applyPrefs(); expect(document.documentElement.style.fontSize).toBe(`${n}%`); }
    for (const [saved, expected] of [["200", 150], ["50", 75], ["NaN", 100], ["Infinity", 100], ["-1", 100], ["0", 100], ["", 100], ["117.6", 118]] as const) {
      localStorage.setItem("tm:ui:scale", saved); applyPrefs(); expect(document.documentElement.style.fontSize).toBe(`${expected}%`);
    }
    localStorage.removeItem("tm:ui:scale"); applyPrefs(); expect(prefs.scale).toBe(100);
  });
  it("live dragging updates and saves arbitrary integer sizes without replacing the focused slider", () => {
    location.hash = "#/settings"; render();
    const slider = document.querySelector<HTMLInputElement>("[data-scale=slider]")!;
    expect([slider.type, slider.min, slider.max, slider.step]).toEqual(["range", "75", "150", "1"]);
    slider.focus();
    for (const n of [75, 83, 117, 137, 150]) {
      slider.value = String(n); slider.dispatchEvent(new Event("input", { bubbles: true }));
      expect(localStorage.getItem("tm:ui:scale")).toBe(String(n)); expect(document.documentElement.style.fontSize).toBe(`${n}%`);
      expect(document.querySelector("[data-scale=slider]")).toBe(slider); expect(document.activeElement).toBe(slider);
      expect(slider.getAttribute("aria-valuetext")).toBe(`${n}%`); expect(document.querySelector(".text-size-readout output")!.textContent).toBe(`${n}%`);
    }
    slider.value = "113"; slider.dispatchEvent(new Event("input")); render();
    expect(document.querySelector<HTMLInputElement>("[data-scale=slider]")!.value).toBe("113");
  });
  it("normalizes programmatic writes to the supported range", () => {
    for (const [value, expected] of [[200, 150], [25, 75], [117.6, 118], [NaN, 100]] as const) { prefs.scale = value; expect(localStorage.getItem("tm:ui:scale")).toBe(String(expected)); }
  });
});

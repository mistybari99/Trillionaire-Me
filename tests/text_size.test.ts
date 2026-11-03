// Text size (owner report 3 Nov 2026: choosing 125/150/200 % changed nothing). Root cause: type sizes were written in px, which ignore the
// root font size that the Text size buttons set. Sizes are now rem, so they scale. The browser check is TEXTSIZE in tools/e2e.mjs.
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
    for (const n of [100, 125, 150, 200]) { localStorage.setItem("tm:ui:scale", String(n)); applyPrefs(); expect(document.documentElement.style.fontSize).toBe(`${n}%`); }
    localStorage.setItem("tm:ui:scale", "175"); applyPrefs(); expect(document.documentElement.style.fontSize).toBe("100%"); // unknown value falls back
  });
  it("the Settings buttons set it and the key is the same one older versions saved (no migration needed)", () => {
    localStorage.setItem("tm:ui:scale", "150"); expect(prefs.scale).toBe(150);
    location.hash = "#/settings"; render(); for (const n of [125, 200, 100]) { (document.querySelector(`[data-scale="${n}"]`) as HTMLButtonElement).click(); expect(localStorage.getItem("tm:ui:scale")).toBe(String(n)); expect(document.documentElement.style.fontSize).toBe(`${n}%`); }
  });
});

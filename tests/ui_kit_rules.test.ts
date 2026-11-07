// UI kit rules (docs/design/ui-polish-spec.md section 5): over every route, in EN and BN:
//  - no chip/tag/badge inside p, label or headings (a labelled value `.val` is the one documented exception: TM-REQ-006 needs its source label next to the figure)
//  - each disclaimer text at most once per route
//  - no inline style attribute beyond a shrinking allowlist
//  - every var(--x) in the CSS is defined; every @keyframes sits under a motion guard
import "fake-indexeddb/auto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { preloadLazy } from "../src/ui/lazy";
import { allPaths } from "./helpers_paths";
import { consentKv, store } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import { DESIGNS } from "../src/ui/themes";
import { PACKS } from "../src/i18n/packs";

beforeAll(async () => { await preloadLazy(); });
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear(); grantConsent(consentKv, "2026-11-02T00:00:00.000Z"); localStorage.setItem("tm:ui:dataMode", "demo"); });

const draw = (path: string, lang: string) => { document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", lang); location.hash = "#" + path; render(); };

describe("kit rules over every route", () => {
  for (const lang of ["en", "bn"] as const) {
    it(`no chip inside a sentence, label or heading (${lang})`, () => {
      const bad: string[] = [];
      for (const path of allPaths()) {
        draw(path, lang);
        for (const c of document.querySelectorAll("main .chip, main .tag, main .badge, main .k-chip")) {
          if (c.closest(".val")) continue;
          if (c.closest("p, label, h1, h2, h3")) bad.push(`${path}: ${(c.textContent ?? "").slice(0, 20)}`);
        }
      }
      expect(bad).toEqual([]);
    }, 90_000);
    it(`each disclaimer appears at most once per route (${lang})`, () => {
      const dict = PACKS[lang] as Record<string, string>; const texts = ["noGuarantee", "advice", "noFatwa"].map((k) => dict[`disclaimer.${k}`]!);
      const bad: string[] = [];
      for (const path of allPaths()) {
        draw(path, lang); const html = document.body.textContent ?? "";
        for (const tx of texts) if (tx && html.split(tx).length - 1 > 1) bad.push(`${path}: ${tx.slice(0, 25)}`);
      }
      expect(bad).toEqual([]);
    }, 90_000);
  }
});

const srcFiles = (): string[] => { const out: string[] = []; const walk = (d: string) => { for (const n of readdirSync(d)) { const f = join(d, n); statSync(f).isDirectory() ? walk(f) : /\.ts$/.test(n) && out.push(f); } }; walk("src/ui"); return out; };
describe("CSS and source hygiene", () => {
  it("inline style attributes only shrink (allowlist 42, target 0)", () => {
    const n = srcFiles().reduce((a, f) => a + (readFileSync(f, "utf8").match(/style: "/g)?.length ?? 0), 0);
    expect(n).toBeLessThanOrEqual(42);
  });
  const css = readFileSync("src/ui/styles.css", "utf8") + readFileSync("src/ui/kit.css", "utf8");
  it("every var(--x) used in the CSS is defined in the base tokens or by a look", () => {
    const defined = new Set<string>([...css.matchAll(/--([\w-]+)\s*:/g)].map((m) => m[1]!));
    for (const d of DESIGNS) for (const m of (d.extraCss ?? "").matchAll(/--([\w-]+)\s*:/g)) defined.add(m[1]!);
    for (const d of DESIGNS) for (const k of Object.keys({ ...(d.light ?? {}) })) defined.add(k);
    const used = [...css.matchAll(/var\(--([\w-]+)/g)].map((m) => m[1]!);
    const undef = [...new Set(used.filter((u) => !defined.has(u)))].filter((u) => !["i", "gap"].includes(u));
    expect(undef).toEqual([]);
  });
  it("kit keyframes are only started inside a motion guard", () => {
    const kit = readFileSync("src/ui/kit.css", "utf8");
    for (const m of kit.matchAll(/animation:\s*(\w+)/g)) {
      const at = kit.lastIndexOf("@media", m.index!); expect(kit.slice(at, m.index!)).toMatch(/prefers-reduced-motion:no-preference/);
    }
  });
});

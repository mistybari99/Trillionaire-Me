// Accessibility pass over all 4 Design versions (Light/Futuristic, Ink & Paper, Emerald/Obsidian, Classic/Broadsheet):
// contrast (incl. translucent cards and gradient buttons), focus ring, 44 px targets, reduced motion, token-only colours.
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { DESIGNS, applyDesign } from "../src/ui/themes";
import { render } from "../src/app";

const CSS = readFileSync("src/ui/styles.css", "utf8");
type Tok = Record<string, string>;
const hex = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
const toHex = (c: number[]) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
const mix = (a: string, b: string, pa: number) => { const x = hex(a), y = hex(b); return toHex(x.map((v, i) => v * pa + y[i]! * (1 - pa))); };
const lum = (h: string) => { const c = hex(h).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!; };
const cr = (a: string, b: string) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const baseTokens = (sel: RegExp): Tok => { const m = CSS.match(sel)!; const o: Tok = {}; for (const d of m[1]!.matchAll(/--([\w-]+)\s*:\s*(#[0-9A-Fa-f]{6})/g)) o[d[1]!] = d[2]!; return o; };
const LOOKS: Array<{ id: string; modes: Array<[string, Tok]>; css: string }> = DESIGNS.map((d) => ({
  id: d.id, css: d.extraCss ?? "",
  modes: d.light && d.dark ? [["light", d.light as Tok], ["dark", d.dark as Tok]] : [["light", baseTokens(/:root\{([^}]*)\}/)], ["dark", baseTokens(/:root\[data-theme="dark"\]\{([^}]*)\}/)]],
}));

describe("four looks are all covered", () => { it("4 versions", () => { expect(LOOKS.map((l) => l.id).sort()).toEqual(["broadsheet", "emerald-obsidian", "ink-paper", "light-futuristic"]); }); });

describe("contrast", () => {
  for (const L of LOOKS) for (const [mode, t] of L.modes) {
    it(`${L.id} ${mode}: text on tinted surfaces (demo background, selected controls) >= 4.5`, () => {
      expect(cr(t.ink!, t["demo-bg"]!), "ink/demo-bg").toBeGreaterThanOrEqual(4.5);
      expect(cr(t.muted!, t.paper!), "muted/paper").toBeGreaterThanOrEqual(4.5);
      expect(cr(t["on-primary"]!, t.primary!), "button").toBeGreaterThanOrEqual(4.5);
    });
  }
  it("Light/Futuristic: text stays >= 4.5 on the translucent card over the page glow, and on both stops of the button gradient", () => {
    const L = LOOKS.find((l) => l.id === "light-futuristic")!;
    for (const [mode, t] of L.modes) {
      const glow = mix(t.ember!, mix(t.primary!, t.paper!, 0.16), 0.12); // worst case: both glows stacked on the page colour
      const card = mix(t.card!, glow, 0.86);
      for (const f of ["ink", "muted", "primary", "ember", "moss", "danger"]) expect(cr(t[f]!, card), `${mode} ${f}/card-over-glow`).toBeGreaterThanOrEqual(4.5);
      const end = mix(t.primary!, t.ink!, 0.7);
      expect(cr(t["on-primary"]!, t.primary!), `${mode} button start`).toBeGreaterThanOrEqual(4.5);
      expect(cr(t["on-primary"]!, end), `${mode} button end`).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("Emerald/Obsidian: a card border mixed from ember and rule is decoration only, the control borders still use rule (>= 3)", () => {
    const L = LOOKS.find((l) => l.id === "emerald-obsidian")!;
    for (const [mode, t] of L.modes) expect(cr(t.rule!, t.paper!), mode).toBeGreaterThanOrEqual(3);
  });
});

describe("focus ring", () => {
  const rule = CSS.match(/\.cta:focus-visible[^{]*\{([^}]*)\}/)![1]!;
  it("the shared focus rule draws a 3 px outline from the accent token", () => {
    expect(rule).toMatch(/outline:\s*3px\s+solid\s+var\(--ember\)/);
  });
  for (const L of LOOKS) {
    it(`${L.id}: accent ring is >= 3:1 on page and card in light and dark; the look never removes the outline`, () => {
      for (const [mode, t] of L.modes) for (const bg of ["paper", "card"]) expect(cr(t.ember!, t[bg]!), `${mode} ember/${bg}`).toBeGreaterThanOrEqual(3);
      expect(L.css).not.toMatch(/outline\s*:\s*(none|0)/);
    });
  }
});

describe("44 px targets", () => {
  for (const L of LOOKS) {
    it(`${L.id}: the look sets no control height, min-height or width under 44 px`, () => {
      for (const m of L.css.matchAll(/(?:^|[;{\s])(min-height|height|min-width|width)\s*:\s*(\d+)px/g)) expect(Number(m[2]), `${m[1]}:${m[2]}px`).toBeGreaterThanOrEqual(44);
    });
  }
  it("shared rules: buttons, links in lists, inputs and selects are at least 44 px tall", () => {
    for (const sel of ["button", ".btn", ".cta", "input", "select"]) {
      const re = new RegExp(`(?:^|[},\\s])${sel.replace(".", "\\.")}[^{}]*\\{[^}]*min-height:\\s*(\\d+)px`, "m");
      const m = CSS.match(re); expect(m, sel).not.toBeNull(); expect(Number(m![1]), sel).toBeGreaterThanOrEqual(44);
    }
  });
});

describe("reduced motion", () => {
  it("global guard exists", () => { expect(CSS).toMatch(/@media \(prefers-reduced-motion:reduce\)\{\*\{animation:none!important;transition:none!important\}\}/); });
  for (const L of LOOKS) {
    it(`${L.id}: every animation or transition in the look is inside a no-preference block`, () => {
      const outside = L.css.replace(/@media \(prefers-reduced-motion:no-preference\)\{[\s\S]*\}\s*$/, "");
      expect(outside).not.toMatch(/animation|transition/);
    });
  }
});

describe("rendered screens use tokens for colour in every look", () => {
  beforeEach(() => { localStorage.clear(); document.body.innerHTML = '<div id="app"></div>'; });
  for (const L of LOOKS) {
    it(`${L.id}: no hard-coded colour in inline styles on the main screens`, () => {
      const bad: string[] = [];
      for (const route of ["#/today", "#/journey", "#/diary/money", "#/deen", "#/settings", "#/settings/connections", "#/habits"]) {
        applyDesign(L.id); location.hash = route; render();
        for (const el of document.querySelectorAll("[style]")) { if (el.closest(".design-sw")) continue; // decorative preview of each look, hidden from assistive tech
           const st = el.getAttribute("style") ?? ""; if (/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(st) || /\b(color|background(-color)?)\s*:\s*(red|green|blue|white|black)\b/.test(st)) bad.push(`${route}: ${st}`); }
      }
      expect(bad).toEqual([]);
    });
  }
});

describe("calm / ghost / plain-link fixes found by the screenshot matrix (3 Nov 2026)", () => {
  it("Light/Futuristic gradient buttons never apply to ghost buttons (ghost text is ink, so it would sit on the indigo gradient)", () => {
    const css = DESIGNS.find((d) => d.id === "light-futuristic")!.extraCss!;
    expect(css).toMatch(/\.btn:not\(\.ghost\)\{background:linear-gradient/);
    expect(css).not.toMatch(/\.btn\{background:linear-gradient/);
  });
  it("plain links (no class) use the primary token, so they are readable in dark mode in every look", () => {
    expect(CSS).toMatch(/main a:where\(:not\(\[class\]\),\[class=""\]\)\{color:var\(--primary\)/);
    for (const L of LOOKS) for (const [mode, t] of L.modes) for (const bg of ["paper", "card"]) expect(cr(t.primary!, t[bg]!), `${L.id} ${mode} primary/${bg}`).toBeGreaterThanOrEqual(4.5);
  });
  it("a long tag wraps inside the screen instead of widening the page (found at 200 % text on Capability status)", () => { expect(CSS.match(/^\.tag\{([^}]*)\}/m)![1]).toMatch(/white-space:normal;max-width:100%/); });
  it("the bottom tab labels keep every word whole and grow with the text size; when they no longer fit in one row the bar wraps into two rows instead of breaking words", () => {
    const rule = CSS.match(/^\.tab\{([^}]*)\}/m)![1]!; const nav = CSS.match(/^nav\{([^}]*)\}/m)![1]!;
    expect(rule).toMatch(/font-size:0\.8125rem/); expect(rule).toMatch(/overflow-wrap:normal/); expect(rule).toMatch(/min-width:max-content/); expect(nav).toMatch(/flex-wrap:wrap/);
    expect(CSS).toMatch(/body\{[^}]*padding:16px 16px max\(96px,8rem\)/);
  });});

describe("calm prompt colour (--calm, plan tracker AU-23): every look, light and dark, contrast >= 4.5 and never the danger colour", () => {
  for (const L of LOOKS) for (const [mode, t] of L.modes) {
    it(`${L.id} ${mode}: --calm is defined and readable on page, card and the demo background`, () => {
      expect(t.calm, "calm token").toMatch(/^#[0-9A-Fa-f]{6}$/); expect(t.calm!.toLowerCase()).not.toBe(t.danger!.toLowerCase());
      for (const bg of ["paper", "card", "demo-bg"]) expect(cr(t.calm!, t[bg]!), `${mode} calm/${bg}`).toBeGreaterThanOrEqual(4.5);
      if (L.id === "light-futuristic") { const glow = mix(t.ember!, mix(t.primary!, t.paper!, 0.16), 0.12); expect(cr(t.calm!, mix(t.card!, glow, 0.86)), `${mode} calm/card-over-glow`).toBeGreaterThanOrEqual(4.5); }
    });
  }
  it("the .need class uses the calm token and a border (not colour alone); .err keeps the danger token", () => {
    expect(CSS).toMatch(/\.need\{color:var\(--calm\)[^}]*border-inline-start:3px solid var\(--calm\)/); expect(CSS).toMatch(/\.err\{color:var\(--danger\)/);
  });
  it("the 'please tick' and 'write something first' prompts use .need; no tick prompt is drawn in the danger style", () => {
    const files = ["connectionsUi", "consentGate", "healthUi", "hadithUi", "prayerSyncUi", "modeUi"].map((f) => readFileSync(`src/ui/${f}.ts`, "utf8")).join("\n");
    expect(files).not.toMatch(/class: "err"[^)]*needTick/); expect(files).not.toMatch(/class: "err"[^)]*needConsent/);
    expect((files.match(/class: "need"/g) ?? []).length).toBeGreaterThanOrEqual(8);
  });
});

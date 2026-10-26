// Design version chooser: registry, persistence, default unchanged, token contrast, chooser UI.
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_DESIGN, DESIGNS, applyDesign, designCss, designOf, isDesignId, type Design } from "../src/ui/themes";
import { PACKS } from "../src/i18n/packs";
import { applyPrefs, prefs } from "../src/ui/state";
import { render } from "../src/app";

// Same WCAG formula as tests/a11y.test.ts (not imported, so that file's suites do not run twice).
const lum = (hex: string) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!; };
const contrast = (a: string, b: string) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

const CSS = readFileSync("src/ui/styles.css", "utf8");
beforeEach(() => { localStorage.clear(); document.documentElement.removeAttribute("data-design"); document.getElementById("tm-design-css")?.remove(); });

describe("registry", () => {
  it("has classic (default) and light-futuristic with unique ids", () => {
    expect(DESIGNS.map((d) => d.id)).toEqual(["classic", "light-futuristic"]);
    expect(new Set(DESIGNS.map((d) => d.id)).size).toBe(DESIGNS.length);
    expect(DEFAULT_DESIGN).toBe("classic");
  });
  it("every entry has labels in en, bn and mix with no digits", () => {
    for (const d of DESIGNS) for (const l of ["en", "bn", "mix"] as const) for (const k of [d.label, d.desc]) { expect(PACKS[l][k], `${l} ${k}`).toBeTruthy(); expect(PACKS[l][k]).not.toMatch(/[0-9০-৯]/); }
  });
  it("adding a version is adding one entry: a new entry yields its own CSS", () => {
    const extra: Design = { ...DESIGNS[1]!, id: "demo-x" };
    const css = designCss([...DESIGNS, extra]);
    expect(css).toContain('data-design="demo-x"'); expect(css).toContain('data-design="light-futuristic"');
  });
  it("classic adds no CSS (zero visual change)", () => { expect(designCss([DESIGNS[0]!])).toBe(""); expect(designCss()).not.toContain('"classic"'); });
  it("unknown ids fall back to classic", () => { expect(isDesignId("nope")).toBe(false); expect(designOf("nope").id).toBe("classic"); });
});

describe("persistence and apply", () => {
  it("default is classic; classic base tokens in styles.css are unchanged", () => {
    expect(prefs.design).toBe("classic");
    expect(CSS).toContain("--paper:#F5F1E8; --card:#FBF8F1; --ink:#14181F;");
  });
  it("saves under tm:ui:design and ignores bad values", () => {
    prefs.design = "light-futuristic"; expect(localStorage.getItem("tm:ui:design")).toBe("light-futuristic"); expect(prefs.design).toBe("light-futuristic");
    localStorage.setItem("tm:ui:design", "junk"); expect(prefs.design).toBe("classic");
    prefs.design = "junk"; expect(prefs.design).toBe("classic");
  });
  it("applyPrefs sets data-design and injects the CSS once, dark follows phone", () => {
    prefs.design = "light-futuristic"; applyPrefs(); applyPrefs();
    expect(document.documentElement.dataset.design).toBe("light-futuristic");
    expect(document.querySelectorAll("#tm-design-css").length).toBe(1);
    const css = document.getElementById("tm-design-css")!.textContent!;
    expect(css).toMatch(/prefers-color-scheme:dark\)\{:root\[data-design="light-futuristic"\]\[data-theme="auto"\]/);
    expect(document.documentElement.dataset.theme).toBe("auto");
    applyDesign("classic"); expect(document.documentElement.dataset.design).toBe("classic");
  });
  it("extra CSS keeps motion behind no-preference", () => {
    for (const d of DESIGNS) { const x = (d.extraCss ?? "").replace(/@media \(prefers-reduced-motion:no-preference\)\{[\s\S]*\}$/, ""); expect(x).not.toMatch(/animation:|transition:/); }
  });
});

describe("token contrast (AA)", () => {
  const TEXT: Array<[string, string]> = [["ink", "paper"], ["ink", "card"], ["muted", "paper"], ["muted", "card"], ["ember", "paper"], ["ember", "card"], ["primary", "paper"], ["primary", "card"], ["moss", "paper"], ["moss", "card"], ["danger", "paper"], ["danger", "card"], ["demo", "demo-bg"], ["demo", "paper"], ["demo", "card"], ["on-primary", "primary"], ["paper", "moss"]];
  const UI: Array<[string, string]> = [["rule", "paper"], ["rule", "card"], ["ember", "paper"], ["ember", "card"], ["ink", "card"], ["ink", "paper"]];
  for (const d of DESIGNS.filter((x) => x.light && x.dark)) for (const [mode, t] of [["light", d.light!], ["dark", d.dark!]] as const) {
    it(`${d.id} ${mode}: text >= 4.5 and UI >= 3`, () => {
      for (const [f, b] of TEXT) expect(contrast(t[f as keyof typeof t], t[b as keyof typeof t]), `${f}/${b}`).toBeGreaterThanOrEqual(4.5);
      for (const [f, b] of UI) expect(contrast(t[f as keyof typeof t], t[b as keyof typeof t]), `${f}/${b}`).toBeGreaterThanOrEqual(3);
    });
  }
});

describe("chooser UI (More)", () => {
  const boot = () => { document.body.innerHTML = '<div id="app"></div>'; location.hash = "#/more"; render(); };
  it("shows one radio card per version, classic checked, 44px-class rule, switch persists", () => {
    boot();
    const radios = [...document.querySelectorAll<HTMLInputElement>('[data-design-pick] input[type=radio]')];
    expect(radios.map((r) => r.value)).toEqual(DESIGNS.map((d) => d.id));
    expect(radios[0]!.checked).toBe(true);
    expect(CSS).toMatch(/\.design-opt\{[^}]*min-height:56px/);
    radios[1]!.checked = true; radios[1]!.dispatchEvent(new Event("change"));
    expect(prefs.design).toBe("light-futuristic");
    expect(document.documentElement.dataset.design).toBe("light-futuristic");
    expect(document.querySelector<HTMLInputElement>('[data-design-opt="light-futuristic"] input')!.checked).toBe(true);
  });
});

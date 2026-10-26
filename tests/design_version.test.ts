// Design version chooser: registry, persistence, default unchanged, token contrast, chooser UI.
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_DESIGN, DESIGNS, applyDesign, designCss, designOf, isDesignId, migrateDesignId, type Design } from "../src/ui/themes";
import { PACKS } from "../src/i18n/packs";
import { applyPrefs, prefs } from "../src/ui/state";
import { render } from "../src/app";

// Same WCAG formula as tests/a11y.test.ts (not imported, so that file's suites do not run twice).
const lum = (hex: string) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!; };
const contrast = (a: string, b: string) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

const CSS = readFileSync("src/ui/styles.css", "utf8");
beforeEach(() => { localStorage.clear(); document.documentElement.removeAttribute("data-design"); document.getElementById("tm-design-css")?.remove(); });

describe("registry", () => {
  it("has light-futuristic (default), ink-paper, emerald-obsidian and broadsheet with unique ids", () => {
    expect(DESIGNS.map((d) => d.id)).toEqual(["light-futuristic", "ink-paper", "emerald-obsidian", "broadsheet"]);
    expect(new Set(DESIGNS.map((d) => d.id)).size).toBe(DESIGNS.length);
    expect(DEFAULT_DESIGN).toBe("light-futuristic");
  });
  it("broadsheet is shown as Classic in every language mode", () => {
    const bs = DESIGNS.find((d) => d.id === "broadsheet")!;
    expect(PACKS.en[bs.label]).toBe("Classic"); expect(PACKS.bn[bs.label]).toBe("ক্লাসিক"); expect(PACKS.mix[bs.label]).toBeTruthy();
  });
  it("every entry has labels in en, bn and mix with no digits", () => {
    for (const d of DESIGNS) for (const l of ["en", "bn", "mix"] as const) for (const k of [d.label, d.desc]) { expect(PACKS[l][k], `${l} ${k}`).toBeTruthy(); expect(PACKS[l][k]).not.toMatch(/[0-9০-৯]/); }
  });
  it("adding a version is adding one entry: a new entry yields its own CSS", () => {
    const extra: Design = { ...DESIGNS[0]!, id: "demo-x" };
    const css = designCss([...DESIGNS, extra]);
    expect(css).toContain('data-design="demo-x"'); expect(css).toContain('data-design="light-futuristic"');
  });
  it("ink-paper adds no CSS (it is the base look)", () => { expect(designCss([DESIGNS.find((d) => d.id === "ink-paper")!])).toBe(""); expect(designCss()).not.toContain('"ink-paper"'); });
  it("unknown ids fall back to the default; old 'classic' migrates to ink-paper", () => { expect(isDesignId("nope")).toBe(false); expect(designOf("nope").id).toBe("light-futuristic"); expect(migrateDesignId("classic")).toBe("ink-paper"); expect(migrateDesignId("nope")).toBe("light-futuristic"); expect(migrateDesignId(null)).toBe("light-futuristic"); });
  it("every tokened version has bundled fonts only (no network url) and 44px targets from base CSS", () => { for (const d of DESIGNS) expect(d.extraCss ?? "").not.toMatch(/https?:|@import|url\(/); expect(CSS).toMatch(/\.seg button\{min-height:44px/); expect(CSS).toMatch(/\.cta,\.btn\{[^}]*min-height:(4[4-9]|[5-9]\d)px/); });
});

describe("persistence and apply", () => {
  it("default is light-futuristic; ink-paper base tokens in styles.css are unchanged", () => {
    expect(prefs.design).toBe("light-futuristic");
    expect(CSS).toContain("--paper:#F5F1E8; --card:#FBF8F1; --ink:#14181F;");
  });
  it("saves under tm:ui:design and ignores bad values", () => {
    prefs.design = "emerald-obsidian"; expect(localStorage.getItem("tm:ui:design")).toBe("emerald-obsidian"); expect(prefs.design).toBe("emerald-obsidian");
    localStorage.setItem("tm:ui:design", "junk"); expect(prefs.design).toBe("light-futuristic");
    prefs.design = "junk"; expect(prefs.design).toBe("light-futuristic");
  });
  it("migrates the saved value 'classic' to 'ink-paper' and writes it back", () => {
    localStorage.setItem("tm:ui:design", "classic"); expect(prefs.design).toBe("ink-paper"); expect(localStorage.getItem("tm:ui:design")).toBe("ink-paper");
  });
  it("applyPrefs sets data-design and injects the CSS once, dark follows phone", () => {
    prefs.design = "light-futuristic"; applyPrefs(); applyPrefs();
    expect(document.documentElement.dataset.design).toBe("light-futuristic");
    expect(document.querySelectorAll("#tm-design-css").length).toBe(1);
    const css = document.getElementById("tm-design-css")!.textContent!;
    expect(css).toMatch(/prefers-color-scheme:dark\)\{:root\[data-design="light-futuristic"\]\[data-theme="auto"\]/);
    expect(document.documentElement.dataset.theme).toBe("auto");
    applyDesign("ink-paper"); expect(document.documentElement.dataset.design).toBe("ink-paper");
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
  it("shows one radio card per version, default checked, 44px-class rule, switch persists", () => {
    boot();
    const radios = [...document.querySelectorAll<HTMLInputElement>('[data-design-pick] input[type=radio]')];
    expect(radios.map((r) => r.value)).toEqual(DESIGNS.map((d) => d.id));
    expect(radios[0]!.checked).toBe(true); expect(radios[0]!.value).toBe("light-futuristic");
    expect(CSS).toMatch(/\.design-opt\{[^}]*min-height:56px/);
    radios[2]!.checked = true; radios[2]!.dispatchEvent(new Event("change"));
    expect(prefs.design).toBe("emerald-obsidian");
    expect(document.documentElement.dataset.design).toBe("emerald-obsidian");
    expect(document.querySelector<HTMLInputElement>('[data-design-opt="emerald-obsidian"] input')!.checked).toBe(true);
  });
});

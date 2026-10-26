// Language icon in the top bar: on every route, three choices, persists, keyboard, accessible name.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ROUTES, render, renderApp } from "../src/app";
import { PACKS } from "../src/i18n/packs";
import { prefs } from "../src/ui/state";

const SAMPLE = ["/journey/horizon", "/more/library", "/more/rules", "/today", "/journey", "/journey/risks", "/journey/history", "/journey/northstar", "/diary/ventures", "/diary/team", "/diary", "/diary/intake/1", "/diary/intake/2", "/diary/intake/3", "/diary/intake/4", "/diary/intake/5", "/diary/intake/6", "/diary/intake/7", "/diary/plan", "/diary/money", "/journey/log", "/journey/report", "/journey/wheel", "/journey/goals", "/journey/goal/g1", "/journey/review", "/capture", "/stuck", "/topics", "/topic/procrastination", "/reward", "/journey/art", "/habits", "/cards", "/focus/none", "/deen", "/more", "/more/status", "/more/fields", "/more/glossary", "/more/safety", "/more/data"];
const q = <T extends Element>(s: string) => document.querySelector(s) as T;
const open = () => q<HTMLButtonElement>('[data-act="lang-open"]');
const boot = (hash: string) => { document.body.innerHTML = '<div id="app"></div>'; location.hash = "#" + hash; render(); };
const onHash = () => renderApp();

describe("language icon menu", () => {
  beforeEach(() => { localStorage.clear(); window.addEventListener("hashchange", onHash); });
  afterEach(() => { window.removeEventListener("hashchange", onHash); document.body.innerHTML = ""; });

  it("exists on every route in ROUTES", () => {
    localStorage.setItem("tm:ui:dataModeChoice", "demo");
    for (const [re] of ROUTES) {
      const p = SAMPLE.find((x) => re.test(x));
      expect(p, String(re)).toBeDefined();
      boot(p!); expect(open(), p).not.toBeNull();
    }
  });

  it("is on the first-run choice and its consent step", () => {
    localStorage.removeItem("tm:ui:dataModeChoice");
    document.body.innerHTML = '<div id="app"></div>'; renderApp();
    expect(q('[data-first="demo"]')).not.toBeNull(); expect(open()).not.toBeNull();
    q<HTMLButtonElement>('[data-act="first-real"]').click();
    expect(q('[data-first="real-confirm"]')).not.toBeNull(); expect(open()).not.toBeNull();
  });

  it("sits in the top bar after the online badge and demo badge, icon only", () => {
    localStorage.setItem("tm:ui:dataModeChoice", "demo"); boot("/today");
    const kids = [...q(".top .right").children];
    expect(kids.map((k) => k.className.split(" ")[0])).toEqual(["net", "badge", "lang-wrap"]);
    expect(open().textContent).toBe(""); expect(open().querySelector("svg")).not.toBeNull();
  });

  it("accessible name comes from i18n in en, bn and mix", () => {
    localStorage.setItem("tm:ui:dataModeChoice", "demo");
    for (const l of ["en", "bn", "mix"] as const) {
      localStorage.setItem("tm:ui:lang", l); boot("/today");
      expect(open().getAttribute("aria-label")).toBe(PACKS[l]["lang.menu"]);
      expect(PACKS[l]["lang.menu"].length).toBeGreaterThan(0);
    }
    expect(PACKS.en["lang.menu"]).toBe("Language");
  });

  it("menu lists English, বাংলা, Mix; current is marked; choosing changes language, persists, keeps the route", () => {
    localStorage.setItem("tm:ui:dataModeChoice", "demo"); localStorage.setItem("tm:ui:lang", "bn"); boot("/more");
    open().click();
    const items = [...document.querySelectorAll<HTMLButtonElement>(".lang-item")];
    expect(items.map((i) => i.textContent)).toEqual(["English", "✓বাংলা", "Mix"]);
    expect(items[1]!.getAttribute("aria-pressed")).toBe("true");
    items[0]!.click();
    expect(prefs.lang).toBe("en"); expect(localStorage.getItem("tm:ui:lang")).toBe("en");
    expect(location.hash).toBe("#/more"); expect(document.documentElement.lang).toBe("en");
    expect(open().getAttribute("aria-label")).toBe("Language");
    expect(document.activeElement).toBe(open());
    open().click(); document.querySelector<HTMLButtonElement>('.lang-item[data-lang="mix"]')!.click();
    expect(localStorage.getItem("tm:ui:lang")).toBe("mix");
  });

  it("Esc closes the menu and returns focus to the icon", () => {
    localStorage.setItem("tm:ui:dataModeChoice", "demo"); boot("/today");
    open().click();
    expect(q<HTMLElement>(".lang-menu").hidden).toBe(false); expect(open().getAttribute("aria-expanded")).toBe("true");
    (document.activeElement as HTMLElement).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(q<HTMLElement>(".lang-menu").hidden).toBe(true); expect(open().getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(open());
  });

  it("CSS: 44px target, focus ring covers buttons, nothing animates", () => {
    const css = readFileSync("src/ui/styles.css", "utf8");
    expect(css).toMatch(/\.lang-btn\{min-width:44px;min-height:44px/);
    expect(css).toMatch(/button:focus-visible/);
    expect(css).toMatch(/prefers-reduced-motion:reduce\)\{\*\{animation:none!important;transition:none!important/);
    expect(css.match(/\.lang-[^{]*\{[^}]*(animation|transition)/)).toBeNull();
  });
});

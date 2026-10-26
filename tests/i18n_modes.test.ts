// Language modes: English, Bangla and Mix (Bangla sentences with common English words kept).
import { beforeEach, describe, expect, it } from "vitest";
import { PACKS, COMMON_ENGLISH_KEYS, MIX_TERMS, type Key } from "../src/i18n/packs";
import { LOCALES, LOCALE_ORDER, isLocale, intlLocale } from "../src/i18n/registry";
import { prefs } from "../src/ui/state";
import { render } from "../src/app";
import { t, setStrict } from "../src/i18n/t";

const en = PACKS.en as Record<string, string>, bn = PACKS.bn as Record<string, string>, mix = PACKS.mix as Record<string, string>;
const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();

describe("TM-TST-161 language modes: parity across en / bn / mix", () => {
  it("every key exists in all three packs, none empty, placeholders match", () => {
    const keys = Object.keys(en).sort();
    expect(Object.keys(bn).sort()).toEqual(keys);
    expect(Object.keys(mix).sort()).toEqual(keys);
    for (const k of keys) {
      for (const p of [en, bn, mix]) expect(p[k]!.trim(), k).not.toBe("");
      expect(ph(mix[k]!), k).toBe(ph(en[k]!));
      expect(ph(bn[k]!), k).toBe(ph(en[k]!));
    }
  });

  it("common English keys are English in Mix", () => {
    for (const k of COMMON_ENGLISH_KEYS) expect(mix[k], k).toBe(en[k]);
  });

  it("Mix differs from Bangla for keys where Bangla is not already English", () => {
    for (const k of COMMON_ENGLISH_KEYS) if (bn[k] !== en[k]) expect(mix[k], k).not.toBe(bn[k]);
    const changed = Object.keys(bn).filter((k) => mix[k] !== bn[k]);
    expect(changed.length).toBeGreaterThanOrEqual(20);
  });

  it("listed English words replace whole Bangla words (Stage, Goal, Journey, Diary)", () => {
    expect(mix["home.stage"]).toBe("Stage");
    expect(mix["stage.progress"]).toBe("Stage {now} / {total}");
    expect(mix["nav.journey"]).toBe("Journey");
    expect(MIX_TERMS.map(([, e]) => e)).toEqual(expect.arrayContaining(["Stage", "Goal", "Demo", "Backup", "Online"]));
  });

  it("Bangla script is kept on non-common keys in the Bangla pack", () => {
    for (const k of Object.keys(bn)) if (!COMMON_ENGLISH_KEYS.has(k)) expect(LOCALES.bn.scripts.test(bn[k]!), k).toBe(true);
  });

  it("Mix uses Latin digits and falls back to English for missing keys", () => {
    expect(intlLocale("mix")).toBe("bn-BD"); // words (weekday names) stay Bangla
    expect(intlLocale("en")).toBe("en-US");
    setStrict(false);
    expect(t("home.stage" as Key, "mix")).toBe("Stage");
    setStrict(true);
  });

  it("the switch offers English, Bangla and Mix in that order", () => {
    expect(LOCALE_ORDER).toEqual(["en", "bn", "mix"]);
    expect(LOCALE_ORDER.map((l) => LOCALES[l].endonym)).toEqual(["English", "বাংলা", "Mix"]);
  });
});

describe("language preference: persists and falls back safely", () => {
  beforeEach(() => localStorage.clear());

  it("defaults to Bangla when nothing is stored", () => {
    expect(prefs.lang).toBe("bn");
  });

  it("unknown or tricky values fall back to Bangla, never crash", () => {
    for (const v of ["xx", "", "constructor", "__proto__", "toString", "MIX"]) {
      localStorage.setItem("tm:ui:lang", v);
      expect(prefs.lang, v).toBe("bn");
    }
    expect(isLocale("constructor")).toBe(false);
  });

  it("each of the three modes is stored and read back", () => {
    for (const l of ["en", "bn", "mix"] as const) {
      prefs.lang = l;
      expect(localStorage.getItem("tm:ui:lang")).toBe(l);
      expect(prefs.lang).toBe(l);
    }
  });
});

describe("language switch on More persists the choice", () => {
  beforeEach(() => { localStorage.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); });

  it("renders three options and saving Mix keeps it after a fresh render", () => {
    location.hash = "#/more"; render();
    const buttons = [...document.querySelectorAll(".seg button")].filter((b) => ["English", "বাংলা", "Mix"].includes(b.textContent ?? ""));
    expect(buttons.map((b) => b.textContent)).toEqual(["English", "বাংলা", "Mix"]);
    buttons.find((b) => b.textContent === "Mix")!.click();
    expect(localStorage.getItem("tm:ui:lang")).toBe("mix");
    expect(document.documentElement.lang).toBe("bn");
    // a fresh render (as after a reload) still shows Mix as the selected option
    document.body.innerHTML = '<div id="app"></div>'; location.hash = "#/more"; render();
    const pressed = [...document.querySelectorAll(".seg button[aria-pressed='true']")].map((b) => b.textContent).filter((x) => ["English", "বাংলা", "Mix"].includes(x ?? ""));
    expect(pressed).toEqual(["Mix"]);
  });
});

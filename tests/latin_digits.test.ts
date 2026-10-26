// Numbers always show with Latin digits (0–9) in Bangla and Mix, on every screen (owner feedback: Bangla digits hard to read).
import { beforeEach, describe, expect, it } from "vitest";
import { PACKS } from "../src/i18n/packs";
import { latinDigits } from "../src/i18n/digits";
import { fmtNumber, t, tb } from "../src/i18n/t";
import { render } from "../src/app";
import { prefs } from "../src/ui/state";

const BN_DIGIT = /[০-৯]/;
const ROUTES = ["#/today", "#/journey", "#/journey/universe", "#/diary", "#/diary/plan", "#/diary/money", "#/capture", "#/stuck", "#/topics", "#/topic/he1", "#/reward", "#/habits", "#/focus/t1", "#/deen", "#/more", "#/more/status", "#/more/fields", "#/more/glossary", "#/more/safety", "#/more/data", "#/journey/review", "#/journey/report", "#/journey/art"];

describe("Latin digits in Bangla and Mix", () => {
  beforeEach(() => { localStorage.clear(); document.body.innerHTML = '<div id="app"></div>'; });

  it("latinDigits converts Bangla digits and leaves everything else alone", () => {
    expect(latinDigits("১০ মিনিট · ২০২৬-১০-২৪ · 5 টাকা")).toBe("10 মিনিট · 2026-10-24 · 5 টাকা");
  });

  it("no Bangla digit is left in any Bangla or Mix string", () => {
    for (const lang of ["bn", "mix"] as const) for (const [k, v] of Object.entries(PACKS[lang])) expect(BN_DIGIT.test(v), `${lang}:${k}`).toBe(false);
  });

  it("t() and tb() return Latin digits; formatted numbers use Latin digits in every mode", () => {
    expect(t("task.minutes", "bn", { n: 15 })).toBe("15 মিনিট");
    expect(t("stage.progress", "mix", { now: 3, total: 8 })).toBe("Stage 3 / 8");
    expect(tb({ bn: "৫০০০ টাকা", en: "5000 BDT" }, "bn")).toBe("5000 টাকা");
    for (const lang of ["en", "bn", "mix"] as const) expect(fmtNumber(1234567, lang)).toBe("1,234,567");
  });

  it("notifications in Bangla and Mix use Latin digits", async () => {
    const { notifyText } = await import("../src/core/notify");
    expect(notifyText({ bn: "আজ ৩টি কাজ", en: "3 tasks today" }, "bn")).toBe("আজ 3টি কাজ");
    expect(notifyText({ bn: "আজ ৩টি কাজ", en: "3 tasks today" }, "mix")).toBe("আজ 3টি কাজ");
  });

  for (const lang of ["bn", "mix", "en"] as const) {
    it(`every screen in ${lang} shows no Bangla digit`, () => {
      localStorage.setItem("tm:ui:lang", lang);
      for (const hash of ROUTES) {
        document.body.innerHTML = '<div id="app"></div>';
        location.hash = hash; render();
        const text = document.body.textContent ?? "";
        expect(BN_DIGIT.test(text), `${lang} ${hash}`).toBe(false);
      }
      expect(prefs.lang).toBe(lang);
    });
  }
});

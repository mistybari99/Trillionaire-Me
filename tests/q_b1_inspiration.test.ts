// Q-05: Motivation/Discipline compare tip, Inspiration page (#/diary/inspiration), chooser coverage on five more screens.
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { ROUTES, render } from "../src/app";
import { VIEW_SCREENS, screenView, store, consentKv } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import { PACKS } from "../src/i18n/packs";
import { INSPIRATIONS } from "../src/library/inspiration";
import { TIPS, labels } from "../src/library/topics";
import { preloadLazy } from "../src/ui/lazy";

const app = () => document.getElementById("app")!;
const go = (h: string) => { location.hash = h; render(); };
const setup = (lang: string) => { localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", lang); localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, "2026-11-02T00:00:00.000Z"); };
const JUDGING = /\b(shame\w*|guilt\w*|fail\w*|grade\w*|rank\w*|streak\w*|score\w*|lazy|overdue|behind|punish\w*|weak)\b/i;

describe("Q-05 compare tip", () => {
  it("is a 2-column matrix tip under the habits topic with 4 labels (Motivation | Discipline per row), no judging words", () => {
    const tip = TIPS.find((x) => x.id === "ha3")!; expect(tip.topic).toBe("habits"); expect(tip.diagram.type).toBe("matrix");
    for (const l of ["en", "bn"] as const) { const L = labels(tip.diagram, l); expect(L.length).toBe(4); }
    const en = labels(tip.diagram, "en"); expect(en[0]).toMatch(/^Motivation/); expect(en[1]).toMatch(/^Discipline/); expect(en[2]).toMatch(/^Motivation/); expect(en[3]).toMatch(/^Discipline/);
    expect(JSON.stringify(tip)).not.toMatch(JUDGING);
  });
  for (const lang of ["en", "bn", "mix"] as const) {
    it(`the habits topic page shows it (${lang})`, () => {
      setup(lang); go("#/topic/habits");
      expect(app().querySelector("[data-tip=ha3] [data-diagram=matrix]")).not.toBeNull();
      expect(app().querySelector("[data-tip=ha3] a[href='#/diary/inspiration']")).not.toBeNull();
    });
  }
});

describe("Q-05 Inspiration page", () => {
  it("the route exists and the Today inspiration card links to it", () => {
    expect(ROUTES.some(([re]) => re.test("/diary/inspiration"))).toBe(true);
    setup("en"); go("#/today"); expect(app().querySelector("aside.inspire a[href='#/diary/inspiration']")).not.toBeNull();
  });
  for (const lang of ["en", "bn", "mix"] as const) {
    it(`lists the 4 themes with every line, plus the compare card (${lang})`, () => {
      setup(lang); go("#/diary/inspiration");
      expect(app().querySelector("h1")!.textContent).toBe(PACKS[lang]["qb1.insp.h"]);
      const themes = [...app().querySelectorAll("[data-theme-card]")].map((e) => e.getAttribute("data-theme-card")); expect(themes).toEqual(["motivation", "discipline", "patience", "care"]);
      expect(app().querySelectorAll("[data-theme-card] li").length).toBe(INSPIRATIONS.length);
      expect(app().querySelector("[data-card=motivation_discipline] [data-diagram=matrix]")).not.toBeNull();
      expect(app().textContent).not.toMatch(JUDGING);
      if (lang !== "en") expect(app().textContent).toMatch(/[ঀ-৿]/);
    });
  }
});

describe("Q-05 chooser coverage: Deen, Stuck, Topics, North Star, Capture", () => {
  const SCREENS: Array<[string, string]> = [["deen", "#/deen"], ["stuck", "#/stuck"], ["topics", "#/topics"], ["northstar", "#/journey/northstar"], ["capture", "#/capture"]];
  it("all five are in the list and default to full", () => { for (const [s] of SCREENS) { expect(VIEW_SCREENS as readonly string[]).toContain(s); expect(screenView(s as never)).toBe("full"); } expect(VIEW_SCREENS.length).toBe(23); });
  for (const [screen, hash] of SCREENS) {
    it(`${screen}: chooser present, compact persists, bad value falls back`, async () => {
      await preloadLazy(); setup("en"); go(hash);
      expect(app().querySelector(`[data-view-bar=${screen}]`)).not.toBeNull();
      app().querySelector<HTMLButtonElement>(`[data-view-bar=${screen}] [data-view-opt=compact]`)!.click();
      expect(localStorage.getItem(`tm:ui:view:${screen}`)).toBe("compact");
      go(hash); expect(app().querySelector("[data-view=compact]")).not.toBeNull();
      localStorage.setItem(`tm:ui:view:${screen}`, "grid"); go(hash); expect(app().querySelector("[data-view=compact]")).toBeNull();
    });
  }
  it("the Look page names every screen in all three languages", () => {
    for (const s of ["deen", "stuck", "topics", "northstar", "capture"]) for (const l of ["en", "bn", "mix"] as const) expect(PACKS[l][`look.screen.${s}` as keyof typeof PACKS.en].length).toBeGreaterThan(1);
    setup("bn"); go("#/settings/look"); expect(app().querySelectorAll("[data-look-screen]").length).toBe(VIEW_SCREENS.length);
  });
});

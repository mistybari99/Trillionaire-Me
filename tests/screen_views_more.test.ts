// Detailed / Compact chooser on the list and card screens added after the first seven dashboards.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { screenView, store, VIEW_SCREENS, consentKv, type ViewScreen } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";

const NOW = "2026-10-25T00:00:00.000Z";
const SCREENS: Array<[ViewScreen, string]> = [
  ["log", "#/journey/log"], ["goals", "#/journey/goals"], ["risks", "#/journey/risks"], ["ventures", "#/diary/ventures"], ["team", "#/diary/team"],
  ["history", "#/journey/history"], ["cards", "#/cards"], ["library", "#/more/library"], ["rules", "#/more/rules"], ["wheel", "#/journey/wheel"],
];
const go = (hash: string) => { location.hash = hash; render(); };
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear();
  document.body.innerHTML = '<div id="app"></div>';
  localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
  grantConsent(consentKv, NOW);
});
describe("Detailed/Compact chooser on more screens", () => {
  it("all ten screens use the tm:ui:view:<screen> pref key and default to full", () => {
    for (const [s] of SCREENS) { expect(VIEW_SCREENS).toContain(s); expect(screenView(s)).toBe("full"); }
  });
  for (const [screen, hash] of SCREENS) {
    it(`${screen}: chooser present, compact persists and survives re-render, bad value falls back`, () => {
      go(hash);
      const app = document.getElementById("app")!;
      const bar = app.querySelector(`[data-view-bar=${screen}]`);
      expect(bar).not.toBeNull();
      expect(bar!.querySelector("[data-view-opt=full]")!.getAttribute("aria-pressed")).toBe("true");
      expect(app.querySelector("[data-view=compact]")).toBeNull();
      app.querySelector<HTMLButtonElement>(`[data-view-bar=${screen}] [data-view-opt=compact]`)!.click();
      expect(localStorage.getItem(`tm:ui:view:${screen}`)).toBe("compact");
      go(hash);
      expect(app.querySelector("main[data-view=compact]")).not.toBeNull();
      expect(app.querySelector(`[data-view-bar=${screen}] [data-view-opt=compact]`)!.getAttribute("aria-pressed")).toBe("true");
      localStorage.setItem(`tm:ui:view:${screen}`, "grid");
      go(hash);
      expect(app.querySelector("[data-view=compact]")).toBeNull();
    });
  }
  it("Bangla labels, Latin digits, buttons are real buttons", () => {
    localStorage.setItem("tm:ui:lang", "bn"); go("#/journey/goals");
    const bar = document.querySelector("[data-view-bar=goals]")!;
    expect(bar.textContent).toContain("বিস্তারিত"); expect(bar.textContent).not.toMatch(/[০-৯]/);
    expect(bar.querySelectorAll("button[type=button]").length).toBe(2);
  });
});

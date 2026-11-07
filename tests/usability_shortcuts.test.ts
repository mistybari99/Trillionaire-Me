import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { today, journey } from "../src/ui/screens";
import { consentKv, store } from "../src/ui/state";
import { revokeConsent } from "../src/core/consent";
import { PACKS } from "../src/i18n/packs";

const before = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
const mount = (screen: () => HTMLElement) => { const el = screen(); document.body.replaceChildren(el); return el; };
const routes = (el: Element) => [...el.querySelectorAll("a")].map((a) => a.getAttribute("href"));

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear(); revokeConsent(consentKv);
  localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
});

describe("Useful workspace shortcuts", () => {
  it("keeps five stable, localized navigation entries before daily work in every data mode", () => {
    for (const mode of ["demo", "real"]) for (const locale of ["en", "bn", "mix"] as const) {
      localStorage.setItem("tm:ui:dataMode", mode); localStorage.setItem("tm:ui:lang", locale);
      const el = mount(today); const tools = el.querySelector('[data-shortcuts="today"]')!;
      expect(routes(tools)).toEqual(["#/diary/plan", "#/journey/goals", "#/diary/money", "#/capture", "#/habits"]);
      expect(before(el.querySelector("[data-workspace-header]")!, tools)).toBe(true);
      expect(before(tools, el.querySelector(".action-desk-agenda")!)).toBe(true);
      expect([...tools.querySelectorAll("a")].map((a) => a.textContent)).toEqual([
        PACKS[locale]["plan.title"], PACKS[locale]["goals.link"], PACKS[locale]["money.title"], PACKS[locale]["capture.link"], PACKS[locale]["habits.link"],
      ]);
      expect(tools.querySelector("button")).toBeNull();
      expect(el.querySelectorAll('a[href="#/capture"]')).toHaveLength(1);
    }
  });

  it("keeps withdrawn-consent guidance before the shortcut row and preserves other daily entries", () => {
    localStorage.setItem("tm:ui:dataMode", "real");
    const el = mount(today);
    expect(before(el.querySelector("[data-paused]")!, el.querySelector("[data-shortcuts]")!)).toBe(true);
    expect(el.querySelector('a[href="#/habits"]')).not.toBeNull();
    expect(el.querySelector('a[href="#/stuck"]')).not.toBeNull();
    expect(el.querySelector("[data-workspace-header]")?.querySelectorAll("h1")).toHaveLength(1);
    expect(el.querySelector("[data-empty-real]")).not.toBeNull();
    // Keep the existing conditional intake entry; empty real mode has its setup recommendation.
    localStorage.setItem("tm:ui:dataMode", "demo");
    expect(mount(today).querySelector('a[href="#/diary/intake"]')).not.toBeNull();
  });

  it("promotes five Journey entries while preserving a single Goals launch, Wheel and the remaining tools", () => {
    const el = mount(journey); const tools = el.querySelector('[data-shortcuts="journey"]')!;
    expect(routes(tools)).toEqual(["#/journey/goals", "#/journey/boards", "#/journey/horizon", "#/journey/week", "#/journey/report"]);
    expect(el.querySelectorAll('a[href="#/journey/goals"]')).toHaveLength(1);
    expect(before(el.querySelector(".journey-stage-strip")!, tools)).toBe(true);
    expect(before(tools, el.querySelector("[data-journey-goals]")!)).toBe(true);
    expect(el.querySelector('[data-journey-goals] a[href="#/journey/wheel"]')).not.toBeNull();
    expect(el.querySelectorAll(".journey-tools a")).toHaveLength(14);
    expect(el.querySelector("[data-act=pass-stage]")).not.toBeNull();
  });
});

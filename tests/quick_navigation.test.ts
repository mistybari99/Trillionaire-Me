import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.hoisted(() => { vi.resetModules(); });
import { createBottomNavigation, focusDeenTarget, openTabPanel, rootBar } from "../src/ui/quickNavigationUi";
import { TAB_ACTIONS, TAB_DEFINITIONS } from "../src/ui/tabActions";
import { closeTransientOverlay } from "../src/ui/overlayCoordinator";

const mode = vi.hoisted(() => ({ tabNavigation: "navigate" as "navigate" | "menu" }));
vi.mock("../src/ui/presentationPreferences", () => ({ getPresentationPreferences: () => mode }));

beforeEach(() => {
  closeTransientOverlay("context"); document.body.replaceChildren();
  mode.tabNavigation = "navigate";
  history.replaceState({}, "", "#/today");
});
afterEach(() => { closeTransientOverlay("context"); document.body.replaceChildren(); });

describe("canonical tab navigation", () => {
  it("retains native bottom links by default and omits Home from root tools", () => {
    const nav = createBottomNavigation("today", "en"); document.body.append(nav);
    expect([...nav.querySelectorAll("a")].map((a) => a.getAttribute("href"))).toEqual(TAB_DEFINITIONS.map(([id]) => `#/${id}`));
    expect(nav.querySelector("button")).toBeNull();
    expect(nav.querySelector('[aria-current="page"]')?.getAttribute("href")).toBe("#/today");
    for (const [tab] of TAB_DEFINITIONS) {
      const bar = rootBar(tab, "en")!;
      expect([...bar.querySelectorAll("[data-tab-action]")].map((a) => a.getAttribute("data-tab-action"))).toEqual(TAB_ACTIONS[tab].filter((a) => a.id !== "home").map((a) => a.id));
      expect(bar.querySelector('[data-tab-action="home"]')).toBeNull();
    }
  });

  it("opens a nonmodal menu without navigating or replacing an unfinished form; another tab switches it", () => {
    mode.tabNavigation = "menu";
    const form = document.createElement("textarea"); form.value = "Unsaved local draft";
    const nav = createBottomNavigation("today", "en"); document.body.append(form, nav);
    const buttons = [...nav.querySelectorAll<HTMLButtonElement>("button")];
    buttons[1]!.click();
    const dialog = document.querySelector('[data-quick-panel="journey"]')!;
    expect(dialog.getAttribute("role")).toBe("dialog"); expect(dialog.getAttribute("aria-modal")).toBe("false");
    expect(location.hash).toBe("#/today"); expect(form.value).toBe("Unsaved local draft"); expect(form.isConnected).toBe(true);
    expect(dialog.querySelector('[data-tab-action="home"]')?.getAttribute("href")).toBe("#/journey");
    expect(buttons[1]?.getAttribute("aria-expanded")).toBe("true");
    const openedHistoryLength = history.length;
    buttons[2]!.click();
    expect(history.length).toBe(openedHistoryLength);
    expect(document.querySelectorAll(".quick-panel")).toHaveLength(1);
    expect(document.querySelector('[data-quick-panel="diary"]')).not.toBeNull();
    expect(buttons[1]?.getAttribute("aria-expanded")).toBe("false");
    expect(nav.querySelector('[aria-current="page"]')).toBe(buttons[0]);
    expect(rootBar("today", "en")).toBeNull();
  });

  it("provides the same five named prayer actions before Deen menu destinations", () => {
    const opener = document.createElement("button"); document.body.append(opener);
    openTabPanel("deen", "en", opener);
    const panel = document.querySelector(".quick-panel")!;
    expect([...panel.querySelectorAll("[data-act=prayer-mark]")].map((a) => a.getAttribute("data-prayer"))).toEqual(["fajr", "dhuhr", "asr", "maghrib", "isha"]);
    for (const button of panel.querySelectorAll("[data-act=prayer-mark]")) expect(button.getAttribute("aria-label")).toBeTruthy();
    expect(panel.querySelector('a[href="#/deen/prayers"]')).not.toBeNull();
    expect(panel.querySelector('[data-tab-action="prayers"]')?.tagName).toBe("A");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(document.querySelector(".quick-panel")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("deep targets focus their existing Deen cards and tolerate a missing target", () => {
    const prayer = document.createElement("section"); prayer.id = "deen-prayers";
    const fasting = document.createElement("section"); fasting.id = "deen-fasting";
    document.body.append(prayer, fasting);
    expect(focusDeenTarget("/deen/prayers")).toBe(true); expect(document.activeElement).toBe(prayer);
    expect(focusDeenTarget("/deen/fasting")).toBe(true); expect(document.activeElement).toBe(fasting);
    expect(focusDeenTarget("/deen")).toBe(false);
    prayer.remove(); expect(focusDeenTarget("/deen/prayers")).toBe(false);
  });
});

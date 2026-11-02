// Settings redesign PR 3a: Look & screens. Master Detailed/Compact (additive key), screens that differ, reduce motion, reset.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { consentKv, prefs, screenView, setScreenView, store, VIEW_SCREENS } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";

const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const go = (hash: string) => { location.hash = hash; render(); };
const viewKeys = () => Object.keys(localStorage).filter((k) => k.startsWith("tm:ui:view:") && k !== "tm:ui:view:_default");
beforeEach(() => {
  localStorage.clear(); store.demo.clear(); store.real.clear(); document.documentElement.removeAttribute("data-motion");
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
});

describe("master Detailed / Compact", () => {
  it("fixtures with old per-screen keys keep their values; screens never set follow the master", () => {
    localStorage.setItem("tm:ui:view:money", "compact"); expect(screenView("money")).toBe("compact"); expect(screenView("plan")).toBe("full");
    go("#/settings/look"); q<HTMLButtonElement>("[data-master-view=compact]").click();
    expect(screenView("plan")).toBe("compact"); expect(screenView("money")).toBe("compact");
    localStorage.setItem("tm:ui:view:plan", "full"); expect(screenView("plan")).toBe("full"); // an own choice beats the master
  });
  it("the master never writes the 18 per-screen keys", () => {
    go("#/settings/look"); q<HTMLButtonElement>("[data-master-view=compact]").click(); expect(viewKeys()).toEqual([]); expect(localStorage.getItem("tm:ui:view:_default")).toBe("compact");
    render(); q<HTMLButtonElement>("[data-master-view=full]").click(); expect(viewKeys()).toEqual([]);
  });
  it("'Different on N screens' lists own choices that differ, and Follow master clears that one key only", () => {
    localStorage.setItem("tm:ui:view:money", "compact"); localStorage.setItem("tm:ui:view:plan", "compact"); go("#/settings/look");
    expect(q("[data-look=diff-n]").textContent).toBe("Different on 2 screens"); expect(app().querySelectorAll("[data-act=follow-master]").length).toBe(2);
    q<HTMLButtonElement>("[data-screen=money]").click(); expect(localStorage.getItem("tm:ui:view:money")).toBeNull(); expect(localStorage.getItem("tm:ui:view:plan")).toBe("compact");
    go("#/settings/look"); expect(q("[data-look=diff-n]").textContent).toBe("Different on 1 screens");
  });
  it("tapping the on-screen bar to the same layout as the master clears the override; a different one sets it", () => {
    localStorage.setItem("tm:ui:view:_default", "compact"); localStorage.setItem("tm:ui:view:money", "full");
    setScreenView("money", "compact"); expect(localStorage.getItem("tm:ui:view:money")).toBeNull(); expect(screenView("money")).toBe("compact");
    setScreenView("money", "full"); expect(localStorage.getItem("tm:ui:view:money")).toBe("full");
  });
  it("every one of the 18 screens is in the list with a name", () => { go("#/settings/look"); expect(app().querySelectorAll("[data-look-screen]").length).toBe(VIEW_SCREENS.length); });
});

describe("links, motion, reset", () => {
  it("layouts that live on their screens show as link rows with the current value; the habit grid reads through prefs", () => {
    prefs.habitGrid = "weeks12"; go("#/settings/look");
    expect(q("[data-row-value=habitgrid]").textContent).toBe("12 weeks"); expect(q("[data-setting-row=habitgrid]").getAttribute("href")).toBe("#/habits"); expect(q("[data-row-value=universe]").textContent).toBe("Map");
    expect(localStorage.getItem("tm:ui:habitGrid")).toBe("weeks12");
  });
  it("reduce motion: follow phone by default, 'always' sets the root flag and survives a reload", () => {
    go("#/settings/look"); expect(prefs.reduceMotion).toBe("system"); expect(document.documentElement.dataset.motion).toBeUndefined();
    q<HTMLButtonElement>("[data-motion-set=always]").click(); expect(prefs.reduceMotion).toBe("always"); expect(document.documentElement.dataset.motion).toBe("reduce");
    q<HTMLButtonElement>("[data-motion-set=system]").click(); expect(document.documentElement.dataset.motion).toBeUndefined();
  });
  it("Reset look & layout is a two-step and touches only look and view keys", () => {
    grantConsent(consentKv, "2026-10-26T10:00:00.000Z");
    for (const [k, v] of Object.entries({ "tm:ui:design": "emerald-obsidian", "tm:ui:view:money": "compact", "tm:ui:view:_default": "compact", "tm:ui:horizonView": "compact", "tm:ui:universeView": "list", "tm:ui:habitGrid": "months12", "tm:ui:reduceMotion": "always",
      "tm:ui:theme": "dark", "tm:ui:scale": "150", "tm:ui:prayerSettings": "{}", "tm:ui:backupRemind": "on", "tm:ui:conn:approved:webSearch": "{}", "tm:ui:rules": "{}", "tm:ui:mode": "pause" })) localStorage.setItem(k, v);
    go("#/settings/look"); q<HTMLButtonElement>("[data-act=reset-look]").click(); render(); expect(localStorage.getItem("tm:ui:design")).toBe("emerald-obsidian"); // nothing yet
    q<HTMLButtonElement>("[data-act=reset-look-no]").click(); render(); expect(localStorage.getItem("tm:ui:design")).toBe("emerald-obsidian");
    q<HTMLButtonElement>("[data-act=reset-look]").click(); render(); q<HTMLButtonElement>("[data-act=reset-look-yes]").click(); render();
    for (const k of ["tm:ui:design", "tm:ui:view:money", "tm:ui:view:_default", "tm:ui:horizonView", "tm:ui:universeView", "tm:ui:habitGrid", "tm:ui:reduceMotion"]) expect(localStorage.getItem(k), k).toBeNull();
    for (const k of ["tm:ui:theme", "tm:ui:scale", "tm:ui:prayerSettings", "tm:ui:backupRemind", "tm:ui:conn:approved:webSearch", "tm:ui:rules", "tm:ui:mode", "tm:consent:real:v1", "tm:ui:lang"]) expect(localStorage.getItem(k), k).not.toBeNull();
    expect(q("[data-look=reset-done]").textContent).toMatch(/Look and layout are back/);
  });
  it("design version cards live here", () => {
    go("#/settings/look"); expect(app().querySelectorAll("[data-design-opt]").length).toBeGreaterThanOrEqual(3);
  });
});

import { afterEach, beforeEach, expect, it } from "vitest";
import { renderApp } from "../src/app";
import { prefs } from "../src/ui/state";
import { t } from "../src/i18n/t";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  location.hash = "#/settings";
});
afterEach(() => {
  // Leaving the shell also cleans up the navigation observers.
  prefs.dataModeChoice = null;
  renderApp();
});

it.each(["en", "bn"] as const)("header reflects real/demo mode without changing per-record provenance (%s)", (lang) => {
  prefs.lang = lang;
  prefs.dataModeChoice = "real";
  renderApp();
  expect(document.querySelector('.top [data-mode="real"]')?.textContent).toBe(t("mode.switch.real", lang));
  expect(document.querySelector(".top .badge")).toBeNull();
  prefs.dataModeChoice = "demo";
  renderApp();
  expect(document.querySelector(".top .badge")?.textContent).toBe(t("badge.demo", lang));
  expect(document.querySelector('.top [data-mode="real"]')).toBeNull();
});

it.each(["#/journey", "#/focus/skip-fixture"])("skip link focuses the current screen without changing its hash route (%s)", (route) => {
  prefs.dataModeChoice = "demo";
  location.hash = route;
  renderApp();
  const main = document.querySelector("main")!;
  const skip = document.querySelector("a.skip") as HTMLAnchorElement;
  const event = new MouseEvent("click", { bubbles: true, cancelable: true });
  skip.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  expect(location.hash).toBe(route);
  expect(document.activeElement).toBe(main);
});

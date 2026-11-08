// W5b: floating quick-action head. Off by default; shares TAB_ACTIONS; never covers controls; keyboard operable.
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ROUTES } from "../src/app";
import { ROWS } from "../src/ui/settingsRegistry";
import { PRESENTATION_DEFAULTS, setPresentationPreference, resetPresentationPreferences } from "../src/ui/presentationPreferences";
import { TAB_ACTIONS, HEAD_ACTIONS } from "../src/ui/tabActions";
import { clampPos, freeSpot, fromFractions, toFractions, loadFraction, mountFloatingHead, unmountFloatingHead, overlaps, headLabel, HEAD_SIZE, type Rect } from "../src/ui/floatingHead";
import { closeTransientOverlay } from "../src/ui/overlayCoordinator";
import { t } from "../src/i18n/t";

const AREA: Rect = { left: 4, top: 8, right: 356, bottom: 660 };
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
beforeEach(() => {
  localStorage.clear(); resetPresentationPreferences(); document.body.innerHTML = '<div id="app"><main><h1>x</h1><input id="f"><button class="btn" id="p">Save</button></main></div>';
  Object.defineProperty(window, "innerWidth", { value: 360, configurable: true }); Object.defineProperty(window, "innerHeight", { value: 740, configurable: true });
});
afterEach(() => { unmountFloatingHead(); closeTransientOverlay("replace"); });
const head = () => document.querySelector<HTMLElement>("[data-floating-head]");
const bubble = () => document.querySelector<HTMLButtonElement>(".floating-head-btn")!;
const on = () => { setPresentationPreference("floatingHead", "on"); mountFloatingHead("en"); };

describe("setting and default", () => {
  it("is off by default with a settings-registry row that owns the pref key and the position key", () => {
    expect(PRESENTATION_DEFAULTS.floatingHead).toBe("off");
    mountFloatingHead("en"); expect(head()).toBeNull();
    const row = ROWS.find((r) => r.id === "floatinghead")!; expect(row.cat).toBe("look"); expect(row.keys).toEqual(["tm:ui:floatingHead", "tm:ui:headPos"]);
  });
  it("turning it on shows the head, turning it off removes it", () => {
    on(); expect(head()).not.toBeNull();
    setPresentationPreference("floatingHead", "off"); expect(head()).toBeNull();
  });
});

describe("shared action list", () => {
  it("Capture, prayer mark and Today are the very same TAB_ACTIONS entries; Stuck is added once; order is fixed", () => {
    expect(HEAD_ACTIONS.map((a) => a.id)).toEqual(["capture", "prayers", "stuck", "home"]);
    expect(HEAD_ACTIONS[0]).toBe(TAB_ACTIONS.today.find((a) => a.id === "capture"));
    expect(HEAD_ACTIONS[1]).toBe(TAB_ACTIONS.deen.find((a) => a.quickPrayer));
    expect(HEAD_ACTIONS[3]).toBe(TAB_ACTIONS.today.find((a) => a.id === "home"));
  });
  it("every target is a route the router matches (link check)", () => {
    for (const a of HEAD_ACTIONS) expect(ROUTES.some(([re]) => re.test(a.href.slice(1))), a.href).toBe(true);
  });
  it("labels exist in EN, BN and Mix", () => { for (const a of HEAD_ACTIONS) for (const l of ["en", "bn", "mix"] as const) expect(t(headLabel(a), l), `${a.id} ${l}`).toBeTruthy(); });
});

describe("geometry", () => {
  it("clamps inside the area and above the bottom bar", () => {
    expect(clampPos({ x: -50, y: -50 }, AREA)).toEqual({ x: 4, y: 8 });
    expect(clampPos({ x: 999, y: 999 }, AREA)).toEqual({ x: 356 - HEAD_SIZE, y: 660 - HEAD_SIZE });
  });
  it("fractions round-trip", () => { const p = { x: 120, y: 300 }; expect(fromFractions(toFractions(p, AREA), AREA)).toEqual(p); });
  it("moves away from a primary button and never overlaps an obstacle", () => {
    const button: Rect = { left: 20, top: 560, right: 340, bottom: 606 };
    const spot = freeSpot({ x: 300, y: 570 }, AREA, [button])!;
    expect(spot).not.toBeNull(); expect(overlaps({ left: spot.x, top: spot.y, right: spot.x + HEAD_SIZE, bottom: spot.y + HEAD_SIZE }, button)).toBe(false);
  });
  it("returns null (the head hides) when nothing is free", () => { expect(freeSpot({ x: 300, y: 300 }, AREA, [{ left: 0, top: 0, right: 360, bottom: 740 }])).toBeNull(); });
  it("a bad saved position falls back to the default and is clamped", () => {
    localStorage.setItem("tm:ui:headPos", "{\"fx\":9,\"fy\":-1}"); expect(loadFraction()).toEqual({ fx: 1, fy: 0.6 });
    localStorage.setItem("tm:ui:headPos", "not json"); expect(loadFraction()).toEqual({ fx: 1, fy: 0.6 });
  });
});

describe("menu and keyboard", () => {
  it("the bubble is a 48 px button with an aria-label; Enter/click opens a role=menu with the four actions; Esc closes and returns focus", () => {
    on(); const b = bubble(); expect(b.getAttribute("aria-label")).toContain(t("head.label", "en")); expect(b.getAttribute("aria-haspopup")).toBe("menu"); expect(b.getAttribute("aria-expanded")).toBe("false");
    b.focus(); b.click();
    const menu = document.querySelector<HTMLElement>('[role="menu"]')!; expect(menu).not.toBeNull(); expect(b.getAttribute("aria-expanded")).toBe("true");
    const items = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')]; expect(items.map((i) => i.dataset.headAction)).toEqual(["capture", "prayers", "stuck", "home"]);
    expect(document.activeElement).toBe(items[0]);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(document.querySelector('[role="menu"]')).toBeNull(); expect(document.activeElement).toBe(b); expect(b.getAttribute("aria-expanded")).toBe("false");
  });
  it("arrow keys move between items and wrap", () => {
    on(); bubble().click(); const items = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    items[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })); expect(document.activeElement).toBe(items[1]);
    items[1]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true })); items[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    expect(document.activeElement).toBe(items[items.length - 1]);
  });
  it("arrow keys on the closed bubble move it and the position is saved", () => {
    on(); const b = bubble(); const before = head()!.style.transform;
    b.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true }));
    expect(head()!.style.transform).not.toBe(before); expect(JSON.parse(localStorage.getItem("tm:ui:headPos")!)).toMatchObject({ fy: expect.any(Number), fx: expect.any(Number) });
  });
  it("the prayer entry embeds the same one-tap marks as Deen (buttons, no counts)", () => {
    on(); bubble().click(); const p = document.querySelector<HTMLElement>('[data-head-action="prayers"]')!;
    expect(p.getAttribute("aria-expanded")).toBe("false"); p.click(); expect(p.getAttribute("aria-expanded")).toBe("true");
    const box = document.getElementById("tm-head-prayer")!; expect(box.hidden).toBe(false);
    expect(box.querySelectorAll("button[data-prayer]").length).toBe(5); expect(box.textContent).not.toMatch(/streak|score|rank|\d+\s*\/\s*5/i);
    p.click(); expect(box.hidden).toBe(true);
  });
  it("a link inside the menu closes it", () => { on(); bubble().click(); document.querySelector<HTMLElement>('[data-head-action="stuck"]')!.click(); expect(document.querySelector('[role="menu"]')).toBeNull(); });
});

describe("keyboard open, scroll and reset", () => {
  it("hides while a text field has focus and returns afterwards", async () => {
    on(); expect(head()!.hidden).toBe(false);
    const f = document.getElementById("f") as HTMLInputElement; f.focus(); f.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    expect(head()!.hidden).toBe(true); expect(head()!.dataset.state).toBe("keyboard");
    f.blur(); f.dispatchEvent(new FocusEvent("focusout", { bubbles: true })); await tick(5); expect(head()!.hidden).toBe(false);
  });
  it("hides while the page scrolls and returns when it settles", async () => {
    on(); window.dispatchEvent(new Event("scroll")); expect(head()!.hidden).toBe(true); await tick(220); expect(head()!.hidden).toBe(false);
  });
  it("reset look clears the saved position", () => { on(); localStorage.setItem("tm:ui:headPos", "{\"fx\":0.2,\"fy\":0.2}"); resetPresentationPreferences(); expect(localStorage.getItem("tm:ui:headPos")).toBeNull(); });
});

describe("files", () => {
  const css = readFileSync("src/ui/floatingHead.css", "utf8");
  it("48 px target, motion only when allowed, no looping animation", () => {
    expect(css).toMatch(/width:48px;height:48px;min-height:48px/); expect(css).not.toMatch(/animation|infinite/);
    const outside = css.replace(/@media \(prefers-reduced-motion:no-preference\)\{[^}]*\{[^}]*\}\}/, ""); expect(outside).not.toMatch(/transition/);
  });
  it("is mounted by the app after each screen draw and removed on lock", () => {
    const app = readFileSync("src/app.ts", "utf8"); expect(app).toContain("mountFloatingHead(lang)"); expect(app).toContain("unmountFloatingHead()");
  });
});

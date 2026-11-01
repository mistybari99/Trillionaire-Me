// Goal funnel hero (Journey) and horizon arc (Horizon): own counts only, Unknown shown as "Not set" (never 0), text equivalent, reduced motion.
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { render } from "../src/app";
import { arcMarker, funnelBands } from "../src/core/horizon";
import { store, consentKv } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import type { FieldValue, Namespace, TMRecord } from "../src/core/types";

const NOW = "2026-10-25T00:00:00.000Z";
const mk = (ns: Namespace, id: string, entity: string, values: Record<string, unknown>): TMRecord => {
  const vals: Record<string, FieldValue> = {};
  for (const [k, x] of Object.entries(values)) vals[k] = { state: "value", value: x, label: ns === "demo" ? "DEMO" : "FACT" } as FieldValue;
  return { id, entity, ns, ownerId: "o", schemaVersion: 1, createdAt: NOW, values: vals };
};
const G = (id: string, horizon?: string) => ({ id, title: id, ...(horizon ? { horizon } : {}) });

describe("funnel and arc (core)", () => {
  it("no goals: every goal band is unknown (null), never 0", () => {
    const b = funnelBands([], null);
    expect(b.map((x) => x.level)).toEqual(["dream", "five_year", "one_year", "month", "week", "today", "now"]);
    expect(b.every((x) => x.count === null)).toBe(true);
  });
  it("counts goals per horizon; unplaced goals count only in the dream band", () => {
    const b = funnelBands([G("a", "month"), G("b", "month"), G("c", "today"), G("d")], 3);
    const by = Object.fromEntries(b.map((x) => [x.level, x.count]));
    expect(by).toMatchObject({ dream: 4, five_year: 0, month: 2, today: 1, now: 3 });
  });
  it("arc marker is the nearest horizon with a goal, or null", () => {
    expect(arcMarker([])).toBeNull(); expect(arcMarker([G("a")])).toBeNull();
    expect(arcMarker([G("a", "one_year"), G("b", "month")])).toBe("month");
    expect(arcMarker([G("a", "five_year"), G("b", "today")])).toBe("today");
  });
});

describe("funnel and arc (screens)", () => {
  const onHash = () => render();
  beforeEach(() => {
    window.addEventListener("hashchange", onHash);
    localStorage.clear(); store.demo.clear(); store.real.clear();
    document.body.innerHTML = '<div id="app"></div>';
    localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "real"); grantConsent(consentKv, NOW);
  });
  afterEach(() => window.removeEventListener("hashchange", onHash));
  const go = (p: string) => { location.hash = p; render(); };
  const app = () => document.getElementById("app")!;
  it("Journey shows the funnel with all bands dashed and 'Not set' text when empty", () => {
    go("#/journey");
    expect(app().querySelector("[data-goal-funnel-box]")).not.toBeNull();
    expect(app().querySelectorAll(".gfun-band").length).toBe(7); expect(app().querySelectorAll(".gfun-band.on").length).toBe(0);
    expect(app().querySelector('[data-goal-funnel-text] [data-level="month"]')!.textContent).toContain("Not set");
    expect(app().querySelector(".gfun")!.getAttribute("aria-label")).toMatch(/Goal funnel/);
  });
  it("own goal fills the bands; demo goal never counts in real mode", () => {
    store.real.put(mk("real", "g1", "goal", { "goal.title": "Save", "goal.horizon": "month" }));
    store.demo.put(mk("demo", "g2", "goal", { "goal.title": "Demo goal", "goal.horizon": "week" }));
    go("#/journey");
    expect(app().querySelector('[data-goal-funnel-text] [data-level="dream"]')!.textContent).toContain("1");
    expect(app().querySelector('[data-goal-funnel-text] [data-level="week"]')!.textContent).toContain("0");
    expect(app().querySelector('[data-goal-funnel-text] [data-level="now"]')!.textContent).toContain("Not set");
  });
  it("Horizon screen shows the arc with a marker on the nearest horizon and a text line", () => {
    store.real.put(mk("real", "g1", "goal", { "goal.title": "Save", "goal.horizon": "one_year" }));
    go("#/journey/horizon");
    expect(app().querySelector(".harc")!.getAttribute("data-arc-marker")).toBe("one_year");
    expect(app().querySelector("[data-arc-text]")!.textContent).toMatch(/1 year/);
  });
  it("Horizon arc with no goals has no marker and says so", () => {
    go("#/journey/horizon");
    expect(app().querySelector(".harc")!.getAttribute("data-arc-marker")).toBe("none");
    expect(app().querySelector("[data-arc-text]")!.textContent).toMatch(/No goal/);
  });
  it("renders in bn and mix with Latin digits", () => {
    store.real.put(mk("real", "g1", "goal", { "goal.title": "Save", "goal.horizon": "month" }));
    for (const l of ["bn", "mix"]) { localStorage.setItem("tm:ui:lang", l); go("#/journey"); expect(app().querySelector(".gfun")).not.toBeNull(); expect(app().querySelector("[data-goal-funnel-box]")!.textContent).not.toMatch(/[০-৯]/); }
  });
  it("animations have a reduced-motion switch-off", () => {
    const css = readFileSync("src/ui/styles.css", "utf8");
    expect(css).toMatch(/prefers-reduced-motion:reduce\)\{\.gfun \.gfun-band,\.harc \.harc-stop\.now circle\{animation:none!important/);
  });
});

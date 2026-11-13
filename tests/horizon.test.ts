import { describe, it, expect, beforeEach } from "vitest";
import { groupByHorizon, HORIZONS } from "../src/core/horizon";
import { horizonScreen } from "../src/ui/screens";
import { prefs, store } from "../src/ui/state";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" });
const goal = (id: string, title: string, horizon?: string): TMRecord => ({
  id, entity: "goal", ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-10-24T00:00:00Z",
  values: { "goal.title": v(title), ...(horizon ? { "goal.horizon": v(horizon) } : {}) },
});
const goalIds = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>("[data-goal]")].map((e) => e.dataset.goal!).sort();

describe("horizon template chooser (R3)", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("tm:ui:lang", "en");
    store.demo.clear();
    document.body.innerHTML = '<div id="app"></div>';
  });
  it("defaults to the stack view, and an unknown stored value also falls back to stack", () => {
    expect(prefs.horizonView).toBe("stack");
    localStorage.setItem("tm:ui:horizonView", "rank");
    expect(prefs.horizonView).toBe("stack");
    localStorage.setItem("tm:ui:horizonView", "compact");
    expect(prefs.horizonView).toBe("compact");
  });
  it("stack and compact views show the same goal ids, and the toggle marks the active view", () => {
    store.demo.put(goal("g-1", "Income", "one_year"));
    store.demo.put(goal("g-2", "Walk", "today"));
    store.demo.put(goal("g-3", "No level yet"));
    const expected = ["g-1", "g-2", "g-3"];

    prefs.horizonView = "stack";
    const stack = horizonScreen();
    document.body.appendChild(stack);
    expect(stack.querySelector("[data-view=stack]")).not.toBeNull();
    expect(stack.querySelector("[data-view=stack] [data-goal='g-1']")).not.toBeNull();
    expect(goalIds(stack)).toEqual(expected);
    expect(stack.querySelector("[data-horizon='unset'] [data-goal='g-3']")).not.toBeNull();
    expect(stack.querySelector("button[data-view='stack']")?.getAttribute("aria-pressed")).toBe("true");

    prefs.horizonView = "compact";
    const compact = horizonScreen();
    expect(compact.querySelector("ul.horizon-compact")).not.toBeNull();
    expect(goalIds(compact)).toEqual(expected);
    expect(compact.querySelectorAll("li[data-goal]")).toHaveLength(3);
    expect(compact.querySelector("li[data-goal='g-1']")?.getAttribute("data-line")).toBe("one_year");
    expect(compact.querySelector("li[data-goal='g-3']")?.getAttribute("data-line")).toBe("unset");
    expect(compact.querySelector("button[data-view='compact']")?.getAttribute("aria-pressed")).toBe("true");
  });
});

describe("TM-TST-158 horizon view (R2): goals placed from stored data", () => {
  it("places each goal on its horizon and keeps unset goals separate", () => {
    const g = groupByHorizon([
      { id: "a", title: "Income", horizon: "one_year", why: "Stability" },
      { id: "b", title: "Walk", horizon: "today" },
      { id: "c", title: "No level yet" },
      { id: "d", title: "Odd", horizon: "decade" },
    ]);
    expect(g.byHorizon.one_year.map((x) => x.id)).toEqual(["a"]);
    expect(g.byHorizon.today.map((x) => x.id)).toEqual(["b"]);
    expect(g.unset.map((x) => x.id)).toEqual(["c", "d"]);
    expect(HORIZONS).toHaveLength(5);
  });
  it("empty horizons are empty arrays, not zero counts", () => {
    expect(groupByHorizon([]).byHorizon.month).toEqual([]);
  });
});

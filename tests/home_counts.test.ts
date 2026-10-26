// Home count cards: Tasks and Goal steps from the user's own entries; Unknown when none; DEMO tag; no mixing of demo and real.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { store, consentKv } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import type { FieldValue, Namespace, TMRecord } from "../src/core/types";
import { goalStepCount, taskCount } from "../src/core/homeCounts";
import { PACKS, type Key } from "../src/i18n/packs";

const NOW = "2026-10-26T00:00:00.000Z";
const mk = (ns: Namespace, id: string, entity: string, values: Record<string, unknown>, links?: Record<string, string>): TMRecord => {
  const label = ns === "demo" ? "DEMO" : "FACT"; const vals: Record<string, FieldValue> = {};
  for (const [k, x] of Object.entries(values)) vals[k] = (x === null ? { state: "unknown" } : { state: "value", value: x, label }) as FieldValue;
  return { id, entity, ns, ownerId: ns === "demo" ? "demo-user" : "owner", schemaVersion: 1, createdAt: NOW, values: vals, ...(links ? { links } : {}) };
};
const app = () => document.getElementById("app")!;
const go = (hash: string) => { location.hash = hash; render(); };

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear();
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, NOW);
});

describe("Home count cards", () => {
  const card = (id: string) => app().querySelector(`[data-home-card=${id}]`)!;
  it("pure: nothing entered is Unknown, never 0; steps need an existing goal", () => {
    expect(taskCount([])).toEqual({ state: "unknown" }); expect(goalStepCount([])).toEqual({ state: "unknown" });
    const recs = [mk("demo", "g", "goal", { "goal.title": "G" }), mk("demo", "a", "task", {}, { goal: "g" }), mk("demo", "b", "task", { "task.done_on": "2026-10-01" }, { goal: "g" }), mk("demo", "c", "task", {}), mk("demo", "d", "task", {}, { goal: "gone" })];
    expect(taskCount(recs)).toEqual({ state: "value", done: 1, total: 4 }); expect(goalStepCount(recs)).toEqual({ state: "value", done: 1, total: 2 });
  });
  it("Today: empty start shows Unknown for both cards and a DEMO tag", () => {
    go("#/today");
    for (const id of ["tasks", "steps"]) { expect(card(id).getAttribute("data-home-card")).toBe(id); expect(card(id).querySelector("[data-state=unknown]")).not.toBeNull(); expect(card(id).textContent).toContain("Unknown"); expect(card(id).textContent).not.toMatch(/\b0 of\b/); }
    expect(app().querySelector("[data-home-counts] .badge")).not.toBeNull();
  });
  it("Today: own entries are counted, demo and real are not mixed", () => {
    store.demo.put(mk("demo", "g", "goal", { "goal.title": "G" })); store.demo.put(mk("demo", "a", "task", { "task.title": "A", "task.done_on": "2026-10-01" }, { goal: "g" })); store.demo.put(mk("demo", "b", "task", { "task.title": "B" }));
    store.real.put(mk("real", "r", "task", { "task.title": "R" }));
    go("#/today");
    expect(card("tasks").textContent).toContain("1 of 2 done"); expect(card("steps").textContent).toContain("1 of 1 done");
  });
  it("same keys exist in English and Bangla", () => {
    for (const k of ["home.cnt.tasks", "home.cnt.steps", "home.cnt.of", "home.cnt.unknown"] as Key[]) { expect(PACKS.en[k]).toBeTruthy(); expect(PACKS.bn[k]).toBeTruthy(); expect(PACKS.mix[k]).toBeTruthy(); }
  });
});


// SMART funnel visual.
import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { store, consentKv } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import type { FieldValue, Namespace, TMRecord } from "../src/core/types";
import { PACKS } from "../src/i18n/packs";
import { smartFunnel } from "../src/ui/smartFunnel";

const NOW = "2026-10-26T00:00:00.000Z";
const mk = (ns: Namespace, id: string, entity: string, values: Record<string, unknown>, links?: Record<string, string>): TMRecord => {
  const label = ns === "demo" ? "DEMO" : "FACT"; const vals: Record<string, FieldValue> = {};
  for (const [k, x] of Object.entries(values)) vals[k] = (x === null ? { state: "unknown" } : { state: "value", value: x, label }) as FieldValue;
  return { id, entity, ns, ownerId: ns === "demo" ? "demo-user" : "owner", schemaVersion: 1, createdAt: NOW, values: vals, ...(links ? { links } : {}) };
};
const app = () => document.getElementById("app")!;
const go = (hash: string) => { location.hash = hash; render(); };
const CSS = readFileSync("src/ui/styles.css", "utf8");

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear();
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, NOW);
});

describe("SMART funnel", () => {
  const none = { specific: false, measurable: false, achievable: false, relevant: false, timebound: false };
  it("draws five bands narrowing to Committed goal, with a text equivalent, in all three language modes", () => {
    for (const lang of ["en", "bn", "mix"] as const) {
      const el = smartFunnel({ ...none, specific: true }, lang); const svg = el.querySelector("svg")!;
      expect(svg.getAttribute("role")).toBe("img"); expect(svg.getAttribute("aria-label")).toBeTruthy();
      const widths = [...svg.querySelectorAll(".sfun-band path")].map((p) => { const m = p.getAttribute("d")!.match(/^M([\d.]+) [\d.]+H([\d.]+)/)!; return Number(m[2]) - Number(m[1]); });
      expect(widths).toHaveLength(5); for (let i = 1; i < 5; i++) expect(widths[i]!).toBeLessThan(widths[i - 1]!);
      expect(svg.querySelector('[data-band=goal]')!.textContent).toBe(PACKS[lang]["smart.f.goal"]);
      expect(el.querySelectorAll("[data-smart-funnel-text] li")).toHaveLength(6);
      expect(el.querySelectorAll(".sfun-band.on")).toHaveLength(1);
    }
  });
  it("shows on the goal page next to the guide and updates after saving; goal band is solid only when all five are filled", () => {
    store.demo.put(mk("demo", "g1", "goal", { "goal.title": "Save" })); go("#/journey/goal/g1");
    expect(app().querySelector("[data-smart-funnel='0']")).not.toBeNull(); expect(app().querySelector(".sfun-goal.on")).toBeNull();
    const set = (s: string, v: string) => { (app().querySelector(s) as HTMLInputElement).value = v; };
    set("#sm-s", "a"); set("#sm-m", "b"); set("#sm-a", "c"); set("#sm-r", "d"); set("#sm-h", "one_year");
    (app().querySelector("[data-form=smart]") as HTMLFormElement).dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    expect(app().querySelector("[data-smart-funnel='5']")).not.toBeNull(); expect(app().querySelector(".sfun-goal.on")).not.toBeNull();
    expect(app().querySelector("[data-smart-funnel-summary]")!.textContent).toContain("5 of 5");
  });
  it("uses tokens only (no hard-coded colour) and its animation is off under reduced motion", () => {
    const block = CSS.slice(CSS.indexOf("/* SMART funnel")); expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(block).toMatch(/prefers-reduced-motion:no-preference\)\{\.sfun/); expect(block).toMatch(/prefers-reduced-motion:reduce\)\{\.sfun[^}]*animation:none/);
  });
});


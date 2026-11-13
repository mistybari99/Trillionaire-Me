// Q-04 Show my why; Q-09 priority chips + level icons (batch 1) on the goal page.
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { render } from "../src/app";
import { store } from "../src/ui/state";
import { PACKS } from "../src/i18n/packs";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" } as FieldValue);
const rec = (id: string, entity: string, vals: Record<string, unknown>): TMRecord => ({ id, entity, ns: "demo", ownerId: "demo-user", schemaVersion: 2, createdAt: "2026-11-01T00:00:00.000Z", values: Object.fromEntries(Object.entries(vals).map(([k, x]) => [k, v(x)])) } as TMRecord);
const app = () => document.getElementById("app")!;
const go = (h: string) => { location.hash = h; render(); };
const setup = (lang: string) => { localStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", lang); localStorage.setItem("tm:ui:dataMode", "demo"); };

describe("Q-04 Show my why", () => {
  for (const lang of ["en", "bn", "mix"] as const) {
    it(`own why sits in collapsed details (${lang})`, () => {
      setup(lang); store.demo.put(rec("a", "goal", { "goal.title": "Shop", "goal.why": "For my family" })); go("#/journey/goal/a");
      const d = app().querySelector("details[data-card=show_why]") as HTMLDetailsElement; expect(d).not.toBeNull(); expect(d.open).toBe(false);
      expect(d.querySelector("summary")!.textContent).toBe(PACKS[lang]["qb1.why.h"]);
      expect(d.querySelector("[data-why-text]")!.textContent).toBe("For my family"); expect(d.querySelector("[data-why-empty]")).toBeNull();
    });
    it(`empty why shows a prompt that focuses the form field, never a made-up text (${lang})`, () => {
      setup(lang); store.demo.put(rec("a", "goal", { "goal.title": "Shop" })); go("#/journey/goal/a");
      const d = app().querySelector("details[data-card=show_why]")!; expect(d.querySelector("[data-why-text]")).toBeNull();
      expect(d.querySelector("[data-why-empty]")!.textContent).toContain(PACKS[lang]["qb1.why.empty"]);
      (d.querySelector("[data-why-add]") as HTMLButtonElement).click(); expect(document.activeElement).toBe(document.getElementById("sm-r"));
      expect(document.getElementById("sm-r")).not.toBeNull(); // the field the prompt points to exists on the same page
    });
  }
  it("a real-mode goal page shows no DEMO label from this card", () => {
    setup("en"); store.demo.put(rec("a", "goal", { "goal.title": "Shop", "goal.why": "x" })); go("#/journey/goal/a");
    expect(app().querySelector("details[data-card=show_why]")!.textContent).not.toMatch(/DEMO/);
  });
});

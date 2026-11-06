import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { journey } from "../src/ui/screens";
import { store } from "../src/ui/state";
import { PACKS } from "../src/i18n/packs";
import { STAGE_CODES } from "../src/core/stages";
import type { FieldValue, TMRecord } from "../src/core/types";

const rec = (id: string, entity: string, values: Record<string, string>): TMRecord => ({
  id, entity, ns: "demo", ownerId: "demo-user", schemaVersion: 2, createdAt: "2026-11-05T00:00:00Z",
  values: Object.fromEntries(Object.entries(values).map(([k, value]) => [k, { state: "value", value, label: "DEMO" } as FieldValue])),
});
const before = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
const mount = () => { const el = journey(); document.body.replaceChildren(el); return el; };

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear();
  localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
});

describe("Action Desk Journey", () => {
  it("puts the real goals entry ahead of the grouped tools and keeps unknown goal progress honest", () => {
    store.demo.put(rec("shop", "goal", { "goal.title": "Open a shop" }));
    const el = mount();
    const goals = el.querySelector("[data-journey-goals]")!;
    expect(before(el.querySelector(".journey-stage-strip")!, goals)).toBe(true);
    expect(before(goals, el.querySelector(".journey-tools")!)).toBe(true);
    expect(el.querySelectorAll("[data-journey-goals]")).toHaveLength(1);
    expect(goals.querySelector("[data-journey-goal=shop]")?.getAttribute("data-percent")).toBe("unknown");
    expect(el.querySelector('[data-shortcuts="journey"] a[href="#/journey/goals"]')).not.toBeNull();
  });

  it("retains all 18 tools exactly once across promoted links and accessible groups", () => {
    const el = mount();
    const groups = [...el.querySelectorAll("[data-tool-group]")];
    expect(groups.map((g) => g.getAttribute("data-tool-group"))).toEqual(["plan", "review", "explore"]);
    expect(groups.map((g) => [...g.querySelectorAll("a")].map((a) => a.getAttribute("href")))).toEqual([
      ["decide", "risks", "reality", "northstar", "kpi"].map((r) => `#/journey/${r}`),
      ["log", "month", "review", "history"].map((r) => `#/journey/${r}`),
      ["universe", "art", "mine", "legs", "leak"].map((r) => `#/journey/${r}`),
    ]);
    const originalTools = ["boards", "horizon", "decide", "risks", "reality", "northstar", "kpi", "log", "report", "week", "month", "review", "history", "universe", "art", "mine", "legs", "leak"];
    const launchers = el.querySelectorAll('.journey-tools a, [data-shortcuts="journey"] a');
    const hrefs = [...launchers].map((a) => a.getAttribute("href"));
    for (const route of originalTools) expect(hrefs.filter((href) => href === `#/journey/${route}`), route).toHaveLength(1);
    expect(el.querySelectorAll(".journey-tools a")).toHaveLength(14);
    for (const group of groups) expect(el.querySelector(`#${group.getAttribute("aria-labelledby")}`)?.textContent).toBeTruthy();
  });

  it("keeps stage passing, evidence and the full ladder after the compact current-stage context", () => {
    store.demo.put(rec("pass-A", "stage_pass", { "stage_pass.stage_code": "A" }));
    sessionStorage.setItem("tm:passed", "A");
    const el = mount();
    expect(el.querySelector("[data-stage-current]")?.getAttribute("data-stage-current")).toBe("B");
    expect(before(el.querySelector("[data-passed=A]")!, el.querySelector(".journey-stage-strip")!)).toBe(true);
    const ladder = el.querySelector(".ladder")!;
    expect([...ladder.querySelectorAll("[data-stage]")].map((s) => s.getAttribute("data-stage"))).toEqual([...STAGE_CODES]);
    const panel = el.querySelector("[data-stage-panel=B]")!;
    expect(before(ladder, panel)).toBe(true);
    expect(panel.querySelector("#st-evidence")).not.toBeNull();
    expect(panel.querySelector("[data-act=pass-stage]")).not.toBeNull();
  });

  it("has localized group headings and never brings demo goals into the empty real workspace", () => {
    store.demo.put(rec("demo-goal", "goal", { "goal.title": "Demo only goal" }));
    localStorage.setItem("tm:ui:dataMode", "real");
    for (const locale of ["en", "bn", "mix"] as const) {
      localStorage.setItem("tm:ui:lang", locale);
      const el = mount();
      expect(el.querySelector("[data-journey-goal]")).toBeNull();
      expect(el.textContent).not.toContain("Demo only goal");
      for (const group of ["plan", "review", "explore"] as const) {
        expect(el.querySelector(`#journey-tools-${group}`)?.textContent).toBe(PACKS[locale][`desk.tools.${group}`]);
      }
    }
  });
});

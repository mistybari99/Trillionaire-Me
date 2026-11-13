import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { today } from "../src/ui/screens";
import { goalScreen } from "../src/ui/lifeUi";
import { consentKv, prefs, store } from "../src/ui/state";
import { grantConsent, revokeConsent } from "../src/core/consent";
import type { Namespace, TMRecord } from "../src/core/types";

const rec = (id: string, entity: string, values: Record<string, unknown>, ns: Namespace = "demo", links?: Record<string, string>): TMRecord => ({
  id, entity, ns, ownerId: "synthetic", schemaVersion: 3, createdAt: "2026-11-05T00:00:00Z",
  values: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { state: "value", value, label: ns === "demo" ? "DEMO" : "FACT" }])), ...(links ? { links } : {}),
});
const before = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
const mount = () => { const el = today(); document.body.replaceChildren(el); return el; };
function populate() {
  store.demo.put(rec("intake-constraint", "constraint", { "constraint.weekly_free_hours": 40, "constraint.free_from": "06:00", "constraint.free_to": "22:00" }));
  store.demo.put(rec("goal", "goal", { "goal.title": "A useful goal with a complete readable title" }));
  store.demo.put(rec("a-low", "task", { "task.title": "First by ID", "task.minutes": 20, "task.priority": "low" }, "demo", { goal: "goal" }));
  store.demo.put(rec("z-high", "task", { "task.title": "First by plan", "task.minutes": 20, "task.priority": "high" }, "demo", { goal: "goal" }));
}
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear(); revokeConsent(consentKv);
  localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
});

describe("Action Desk daily work", () => {
  it.each(["full", "compact"])("keeps planner order with one recommended task and its reason in %s view", (view) => {
    populate(); localStorage.setItem("tm:ui:view:today", view); const el = mount();
    expect([...el.querySelectorAll("[data-placement]")].map(r => r.getAttribute("data-placement"))).toEqual(["z-high", "a-low"]);
    expect(el.querySelectorAll("[data-next-action]")).toHaveLength(1);
    const selected = el.querySelector('[data-recommended-task="a-low"]')!;
    expect(selected.querySelector("[data-next-reason]")?.textContent).toBeTruthy();
    expect(selected.querySelector("[data-goal-chip-link]")?.textContent).toBe("A useful goal with a complete readable title");
    expect(selected.querySelectorAll('[data-act="task-done"]')).toHaveLength(1);
    expect(el.querySelectorAll('[data-act="task-done"][data-task-id="a-low"]')).toHaveLength(1);
    expect(before(el.querySelector(".action-desk-agenda")!, el.querySelector("[data-home-counts]")!)).toBe(true);
    expect(before(el.querySelector(".action-desk-agenda")!, el.querySelector(".inspire")!)).toBe(true);
  });
  it("does not invent a placement or duplicate completion controls when the recommendation cannot be scheduled", () => {
    populate(); prefs.mode = "pause"; const el = mount();
    expect(el.querySelector("[data-placement]")).toBeNull();
    expect(el.querySelectorAll('[data-next-action="do_task"]')).toHaveLength(1);
    expect(el.querySelector('[data-act="next-go"]')?.getAttribute("href")).toBe("#/diary/plan");
    expect(el.querySelector('[data-act="task-done"]')).toBeNull();
    expect(el.querySelector('[data-next-reason]')?.textContent).toBeTruthy();
  });
  it("keeps the real namespace empty and puts withdrawn-consent guidance before the agenda", () => {
    populate(); localStorage.setItem("tm:ui:dataMode", "real");
    for (const lang of ["en", "bn", "mix"]) {
      localStorage.setItem("tm:ui:lang", lang); const el = mount();
      expect(el.textContent).not.toContain("First by plan"); expect(el.querySelector("[data-empty-real]")).not.toBeNull();
      expect(el.querySelectorAll("[data-home-summary]")).toHaveLength(1);
      expect(el.querySelectorAll('[data-act="next-go"]')).toHaveLength(1);
      expect(el.querySelector('a.cta[href="#/diary/intake"]')).toBeNull();
    }
    grantConsent(consentKv, "2026-11-05T00:00:00Z");
    store.real.put(rec("real-goal", "goal", { "goal.title": "Synthetic real-mode fixture" }, "real")); revokeConsent(consentKv);
    const el = mount(); const paused = el.querySelector('[data-paused]');
    expect(paused).not.toBeNull(); expect(before(paused!, el.querySelector(".action-desk-agenda")!)).toBe(true);
  });
  it("shows goal status/parent before progress, preserves forms and leaves destructive controls last", () => {
    store.demo.put(rec("parent", "goal", { "goal.title": "Parent goal" }));
    store.demo.put(rec("child", "goal", { "goal.title": "Child goal", "goal.kind": "subgoal", "goal.status": "paused" }, "demo", { parent: "parent" }));
    const el = goalScreen("child"); document.body.replaceChildren(el);
    const header = el.querySelector("[data-goal-context]")!;
    expect(header.textContent).toContain("Paused"); expect(header.querySelector('a[href="#/journey/goal/parent"]')).not.toBeNull();
    expect(before(header, el.querySelector("[data-goal-progress]")!)).toBe(true);
    expect(el.querySelector('[data-form="smart"]')).not.toBeNull(); expect(el.querySelector('[data-form="swot"]')).not.toBeNull();
    expect(el.lastElementChild?.querySelector('[data-act="goal-delete"]') ?? el.lastElementChild?.matches('[data-goal-delete]')).toBeTruthy();
  });
});

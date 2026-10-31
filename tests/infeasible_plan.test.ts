// TM-REQ-015: a plan needing more hours than the weekly capacity is flagged before scheduling.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { feasibility, type PlanInput } from "../src/core/planner";
import { store, consentKv } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import type { FieldValue, TMRecord } from "../src/core/types";

let seed = 15;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

describe("TM-TST-015 infeasible plan flag", () => {
  it("20 of 20 plans needing more than the weekly capacity are flagged, before any scheduling", () => {
    for (let i = 0; i < 20; i++) {
      const cap = 60 + Math.floor(rnd() * 600);
      const tasks = Array.from({ length: 2 + Math.floor(rnd() * 6) }, (_, k) => ({ id: `t${k}`, minutes: 30 + Math.floor(rnd() * 120), priority: 2 }));
      const need = tasks.reduce((a, x) => a + x.minutes, 0);
      const inp: PlanInput = { weeklyFreeMinutes: Math.min(cap, need - 1), blocked: [], tasks };
      const f = feasibility(inp);
      expect(f.state, `case ${i}`).toBe("infeasible");
      if (f.state !== "unknown") { expect(f.neededMinutes).toBe(need); expect(f.neededMinutes).toBeGreaterThan(f.capacityMinutes); }
    }
  });
  it("fits are not flagged; unknown capacity is unknown (never ok); unknown estimates are not counted as 0", () => {
    expect(feasibility({ weeklyFreeMinutes: 100, blocked: [], tasks: [{ id: "a", minutes: 100, priority: 2 }] }).state).toBe("ok");
    expect(feasibility({ weeklyFreeMinutes: null, blocked: [], tasks: [{ id: "a", minutes: 100, priority: 2 }] }).state).toBe("unknown");
    const f = feasibility({ weeklyFreeMinutes: 100, blocked: [], tasks: [{ id: "a", minutes: 50, priority: 2 }, { id: "b", minutes: null, priority: 2 }] });
    expect(f.state).toBe("ok"); expect(f.unknownEstimates).toBe(1); if (f.state !== "unknown") expect(f.neededMinutes).toBe(50);
  });
  it("pause mode cannot be infeasible", () => {
    expect(feasibility({ weeklyFreeMinutes: 10, blocked: [], mode: "pause", tasks: [{ id: "a", minutes: 500, priority: 2 }] }).state).toBe("ok");
  });
});

describe("infeasible flag on the plan screen", () => {
  const mk = (id: string, entity: string, values: Record<string, unknown>): TMRecord => {
    const vals: Record<string, FieldValue> = {}; for (const [k, x] of Object.entries(values)) vals[k] = { state: "value", value: x, label: "DEMO" } as FieldValue;
    return { id, entity, ns: "demo", ownerId: "demo-user", schemaVersion: 1, createdAt: "2026-10-25T00:00:00.000Z", values: vals };
  };
  beforeEach(() => {
    localStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>';
    localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, "2026-10-25T00:00:00.000Z");
    store.demo.put(mk("intake-constraint", "constraint", { "constraint.weekly_free_hours": 1, "constraint.free_from": "08:00", "constraint.free_to": "20:00" }));
  });
  const go = () => { location.hash = "#/diary/plan"; render(); };
  it("shows calm wording and removes nothing", () => {
    store.demo.put(mk("t1", "task", { "task.title": "Big", "task.minutes": 500, "task.priority": "normal" }));
    go();
    const n = document.querySelector("[data-infeasible]")!;
    expect(n).not.toBeNull(); expect(n.textContent).toMatch(/Nothing is removed/); expect(n.textContent).not.toMatch(/fail|behind|bad|overdue/i);
    expect(document.querySelector("[data-task=t1]")).not.toBeNull();
  });
  it("does not show when the steps fit or capacity is unknown", () => {
    store.demo.put(mk("t1", "task", { "task.title": "Small", "task.minutes": 20, "task.priority": "normal" }));
    go(); expect(document.querySelector("[data-infeasible]")).toBeNull();
    store.demo.delete("intake-constraint"); go(); expect(document.querySelector("[data-infeasible]")).toBeNull();
  });
});

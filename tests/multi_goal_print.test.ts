// Multi-goal step 10: print/PDF, report and hand-over show shared links; goal names stay off the hand-over unless ticked.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { store } from "../src/ui/state";
import { planDoc } from "../src/core/printDoc";
import { goalProgress } from "../src/core/goalPlan";
import { withGoals } from "../src/core/taskGoals";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" } as FieldValue);
const rec = (id: string, entity: string, vals: Record<string, unknown>, over: Partial<TMRecord> = {}): TMRecord => ({ id, entity, ns: "demo", ownerId: "demo-user", schemaVersion: 2, createdAt: "2026-11-01T00:00:00Z", values: Object.fromEntries(Object.entries(vals).map(([k, x]) => [k, v(x)])), ...over });
const goal = (id: string, title: string) => rec(id, "goal", { "goal.title": title });
const step = (id: string, goals: string[], extra: Record<string, unknown> = {}, over: Partial<TMRecord> = {}) => { const r = withGoals(rec(id, "task", { "task.title": `Step ${id}`, ...extra }, over), goals); return over.links ? { ...r, links: { ...over.links, ...(r.links ?? {}) } } : r; };
const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const go = (h: string) => { location.hash = h; render(); };

beforeEach(() => {
  localStorage.clear(); store.demo.clear(); store.real.clear();
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
  for (const r of [goal("a", "Shop"), goal("b", "Health"), step("t1", ["a", "b"], { "task.minutes": 20 }), step("t2", ["a"])]) store.demo.put(r);
});

describe("plan document", () => {
  it("a shared step is listed under each goal it serves, with the other goals named; goals sorted by title", () => {
    const doc = planDoc(store.demo.list()); expect(doc.map((d) => d.id)).toEqual(["b", "a"]);
    expect(doc.find((d) => d.id === "a")!.steps.map((s) => [s.id, s.also])).toEqual([["t1", ["Health"]], ["t2", []]]); expect(doc.find((d) => d.id === "b")!.steps.map((s) => [s.id, s.also])).toEqual([["t1", ["Shop"]]]);
  });
  it("the print page shows the overall once on top, '(also: ...)' per shared step, and the counted-once note", () => {
    go("#/journey/print/plan"); expect(app().querySelectorAll("[data-print-overall]").length).toBe(1); expect(q("[data-print-overall]").getAttribute("data-print-overall")).toBe("0");
    expect(q('[data-print-goal=a] [data-print-step=t1]').textContent).toContain("(also: Health)"); expect(q('[data-print-goal=b] [data-print-step=t1]').textContent).toContain("(also: Shop)");
    expect(q("[data-print-once]").textContent).toBe("Shared steps count once in the total.");
  });
  it("Bangla note exists", () => { localStorage.setItem("tm:ui:lang", "bn"); go("#/journey/print/plan"); expect(q("[data-print-once]").textContent).toContain("একবারই"); });
});

describe("report", () => {
  it("shows the counted-once fact line", () => { go("#/journey/report"); expect(q("[data-link-stats=report]").textContent).toContain("2 steps counted once · 1 help more than one goal · 0 not linked to a goal yet."); });
});

describe("hand-over", () => {
  const role = rec("r1", "team_role", { "team_role.role": "Cashier", "team_role.holder": "me" });
  it("prints only 'serves N goals' by default; goal names appear only after the tick", () => {
    store.demo.put(role); store.demo.put(step("t3", ["a", "b"], {}, { links: { role: "r1" } })); go("#/journey/print/handover");
    const li = q("[data-print-step=t3]"); expect(li.textContent).toContain("serves 2 goals"); expect(li.textContent).not.toMatch(/Shop|Health/);
    const box = q<HTMLInputElement>("[data-act=ho-goal-names]"); box.checked = true; box.dispatchEvent(new Event("change")); render();
    expect(q("[data-print-step=t3]").textContent).toContain("serves: Health, Shop");
    q<HTMLInputElement>("[data-act=ho-goal-names]").checked = false; q<HTMLInputElement>("[data-act=ho-goal-names]").dispatchEvent(new Event("change")); render(); expect(q("[data-print-step=t3]").textContent).not.toMatch(/Shop|Health/);
  });
  it("giving the step to someone keeps its goal links; when it is done, every linked goal moves", () => {
    store.demo.put(role); const t = step("t3", ["a", "b"], {}, { links: { role: "r1" } }); store.demo.put(t);
    expect(store.demo.get("t3")!.links).toMatchObject({ role: "r1", goal: "a" });
    store.demo.put({ ...t, values: { ...t.values, "task.done_on": v("2026-11-03") } });
    const p = Object.fromEntries(goalProgress(store.demo.list()).map((g) => [g.id, g])); expect(p.a!.done).toBe(1); expect(p.b!.done).toBe(1);
  });
});

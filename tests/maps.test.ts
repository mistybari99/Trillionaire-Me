// M18 remaining boards (plan tracker G3-01): drawn goal tree, resource map, readiness map, plan-change board. Own data only, Unknown stays unknown,
// every drawing has a text equivalent, en / bn / mix, shapes (not only colour), nothing scored, no red copy.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { revokeConsent } from "../src/core/consent";
import { readinessMap, resourceMap, treeRows } from "../src/core/maps";
import { planChange, impactOf, snapshotOf, versionRecord, type PlanChange } from "../src/core/realityLoop";
import { MODULES, buildLabel } from "../src/modules/capability";
import { PACKS } from "../src/i18n/packs";
import type { FieldValue, TMRecord } from "../src/core/types";

const NOW = "2026-10-26T10:00:00.000Z";
const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" } as FieldValue);
const rec = (id: string, entity: string, vals: Record<string, unknown>, links?: Record<string, string>): TMRecord => ({ id, entity, ns: "demo", ownerId: "demo-user", schemaVersion: 2, createdAt: NOW, values: Object.fromEntries(Object.entries(vals).map(([k, x]) => [k, v(x)])), ...(links ? { links } : {}) });
const goal = (id: string, vals: Record<string, unknown> = {}, links?: Record<string, string>) => rec(id, "goal", { "goal.title": id, ...vals }, links);
const task = (id: string, goals: string[], vals: Record<string, unknown> = {}) => rec(id, "task", { "task.title": `step ${id}`, "task.goals": goals, ...vals });

describe("goal tree rows", () => {
  it("parents first, children under them with the parent's row; steps pooled; no step is Unknown (null), not 0; retired goals left out", () => {
    const recs = [goal("a"), goal("b", { "goal.kind": "subgoal" }, { parent: "a" }), goal("c", { "goal.status": "retired" }), task("t1", ["a"], { "task.done_on": "2026-10-01" }), task("t2", ["b"])];
    const rows = treeRows(recs); expect(rows.map((r) => [r.id, r.depth, r.parentRow])).toEqual([["a", 0, null], ["b", 1, 0]]);
    expect(rows[0]).toMatchObject({ done: 1, total: 2, percent: 50 }); expect(treeRows([goal("x")])[0]).toMatchObject({ total: 0, percent: null });
  });
});
describe("resource map", () => {
  it("nothing entered is null (unknown), never 0; entries are counted by their own kind; free hours come only from what was typed", () => {
    const empty = resourceMap([]); expect(empty.map((a) => a.count)).toEqual([null, null, null, null, null, null, null]); expect(empty.find((a) => a.area === "time")!.hours).toBeNull();
    const m = resourceMap([rec("r1", "resource", { "resource.kind": "tools", "resource.description": "A laptop" }), rec("r2", "resource", { "resource.kind": "money" }), rec("f1", "finance_item", { "finance.label": "Savings" }),
      rec("s1", "skill", { "skill.name": "Sewing" }), rec("tr", "team_role", { "team_role.role": "Cutter" }), rec("c1", "constraint", { "constraint.weekly_free_hours": 9 })]);
    const by = Object.fromEntries(m.map((a) => [a.area, a])); expect(by.tools).toMatchObject({ count: 1, items: ["A laptop"] }); expect(by.money!.count).toBe(2); expect(by.people).toMatchObject({ count: 1, items: ["Cutter"] });
    expect(by.skills!.items).toEqual(["Sewing"]); expect(by.time).toMatchObject({ count: 1, hours: 9 }); expect(by.space!.count).toBeNull();
  });
});
describe("readiness map", () => {
  const today = "2026-11-03";
  it("known / missing / old / dates disagree, from the person's own entries only", () => {
    const recs = [goal("g1", { "goal.target_date": "2027-01-01", "goal.success": "6000" }), goal("g2"), goal("g3", { "goal.target_date": "2026-10-01" }), goal("p", { "goal.target_date": "2027-01-01" }),
      goal("ch", { "goal.kind": "subgoal", "goal.target_date": "2027-03-01" }, { parent: "p" }), goal("g5", { "goal.target_date": "2026-12-01" }),
      task("t1", ["g1"]), task("t2", ["g5"], { "task.plan_by": "2026-12-10" }), task("t3", ["g3"], { "task.plan_by": "2026-09-20" })];
    const m = Object.fromEntries(readinessMap(recs, today).map((r) => [r.id, r.cells]));
    expect(m.g1).toMatchObject({ date: { status: "known" }, measure: { status: "known" }, steps: { status: "known" }, time: { status: "missing" } });
    expect(m.g2).toMatchObject({ date: { status: "missing" }, measure: { status: "missing" }, steps: { status: "missing" } });
    expect(m.g3!.date).toMatchObject({ status: "stale", why: "date_passed" }); expect(m.g3!.steps).toMatchObject({ status: "stale", why: "step_date_passed" });
    expect(m.ch!.date).toMatchObject({ status: "conflict", why: "later_than_parent" }); expect(m.g5!.date).toMatchObject({ status: "conflict", why: "step_after_end" });
    const withTime = readinessMap([...recs, rec("c", "constraint", { "constraint.weekly_free_hours": 5 })], today); expect(withTime.every((r) => r.cells.time.status === "known")).toBe(true);
  });
  it("only active goals are listed; paused and retired are left out", () => { expect(readinessMap([goal("a", { "goal.status": "paused" }), goal("b", { "goal.status": "retired" }), goal("c")], today).map((r) => r.id)).toEqual(["c"]); });
});

const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const go = (hash: string) => { location.hash = hash; render(); };
beforeEach(() => { localStorage.clear(); store.demo.clear(); store.real.clear(); revokeConsent(consentKv); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); });

describe("boards page", () => {
  it("empty start: each new board says what is missing, in plain words, with no zero and no red", () => {
    go("#/journey/boards"); for (const k of ["goaltree", "readiness", "plandiff"]) expect(q(`[data-chart=${k}]`).getAttribute("data-chart-empty")).toBe("1");
    expect(q("[data-chart=resourcemap]")).not.toBeNull(); expect(app().querySelectorAll("[data-node]").length).toBe(7); expect([...app().querySelectorAll("[data-node]")].every((n) => n.getAttribute("data-known") === "0")).toBe(true);
    expect(q("[data-chart=resourcemap]").textContent).toMatch(/Not entered yet/); expect(app().querySelector(".err")).toBeNull();
  });
  it("goal tree: an SVG node and a label per goal, edges for children, and the same content as a written list", () => {
    store.demo.put(goal("a")); store.demo.put(goal("b", { "goal.kind": "subgoal" }, { parent: "a" })); store.demo.put(task("t1", ["a"], { "task.done_on": "2026-10-01" })); go("#/journey/boards");
    const c = q("[data-chart=goaltree]"); expect(c.querySelector("svg title")!.textContent).toBe("Goal tree"); expect(c.querySelectorAll("[data-tree-node]").length).toBe(2); expect(c.querySelectorAll("[data-edge]").length).toBe(1);
    const lines = [...c.querySelectorAll("[data-chart-text] li")].map((l) => l.textContent); expect(lines[0]).toBe("a: 1 of 1 steps done"); expect(lines[1]).toBe("· b: no steps yet");
  });
  it("resource map: known areas are drawn as filled nodes, unknown ones dashed and offered a link to add; text version lists every area", () => {
    store.demo.put(rec("s1", "skill", { "skill.name": "Sewing" })); go("#/journey/boards"); const c = q("[data-chart=resourcemap]");
    expect(c.querySelector("[data-node=skills]")!.getAttribute("data-known")).toBe("1"); expect(c.querySelector("[data-node=tools]")!.getAttribute("data-known")).toBe("0");
    expect(c.querySelector("[data-rm-add=tools] a")!.getAttribute("href")).toBe("#/diary/intake/5"); expect(c.querySelectorAll("[data-chart-text] li").length).toBe(7);
    expect(c.querySelector("[data-chart-text]")!.textContent).toMatch(/Skills: 1 entries \(Sewing\)/);
  });
  it("readiness map: four different shapes for the four states, a legend, and a written line per goal", () => {
    store.demo.put(goal("g1", { "goal.target_date": "2099-01-01", "goal.success": "x" })); store.demo.put(goal("g2", { "goal.target_date": "2020-01-01" })); store.demo.put(goal("p", { "goal.target_date": "2098-01-01" }));
    store.demo.put(goal("ch", { "goal.kind": "subgoal", "goal.target_date": "2099-06-01" }, { parent: "p" })); store.demo.put(task("t1", ["g1"])); go("#/journey/boards"); const c = q("[data-chart=readiness]");
    const shapes = new Set([...c.querySelectorAll("[data-cell]")].map((e) => e.getAttribute("data-shape"))); expect([...shapes].sort()).toEqual(["diamond", "disc", "ring", "triangle"]);
    expect(c.querySelector('[data-cell="g1:date:known"]')).not.toBeNull(); expect(c.querySelector('[data-cell="g2:date:stale"]')).not.toBeNull(); expect(c.querySelector('[data-cell="ch:date:conflict"]')).not.toBeNull();
    expect(c.querySelectorAll("[data-legend-item]").length).toBe(4); expect(c.querySelector("[data-rd-legend]")!.textContent).toMatch(/Known = entered/); const text = c.querySelector("[data-chart-text]")!.textContent!; expect(text).toMatch(/g2: End date: Old \(The end date has passed\.\)/); expect(text).toMatch(/End date: Dates disagree \(It ends after its parent goal\.\)/);
  });
  it("plan changes: a saved plan version is drawn before -> after with the same rows as the written diff", () => {
    const g = goal("g1", { "goal.target_date": "2026-12-01" }); const t1 = task("t1", ["g1"]); const recs = [g, t1]; recs.forEach((r) => store.demo.put(r));
    const ev = rec("ev1", "reality_event", { "reality_event.kind": "time_less", "reality_event.status": "open" }, { goal: "g1" });
    const imp = impactOf(recs, { kind: "time_less", goalId: "g1" }); const ch: PlanChange = planChange(recs, imp, "move_dates", { today: "2026-11-03", days: 14, mode: "normal" });
    const before = snapshotOf(recs, "normal"); const after = snapshotOf(recs.map((r) => ch.puts.find((p) => p.id === r.id) ?? r), "normal");
    store.demo.put(ev); store.demo.put(versionRecord({ id: "pv1", number: 1, option: "move_dates", on: "2026-11-03", eventId: "ev1", before, after, createdAt: NOW }));
    go("#/journey/boards"); const c = q("[data-chart=plandiff]");
    if (c.getAttribute("data-chart-empty")) throw new Error("plan version was not read");
    expect(c.querySelector("[data-pd-version='1']")).not.toBeNull(); expect(c.querySelector("[data-pd-from='0']")!.textContent).toBe("2026-12-01"); expect(c.querySelector("[data-pd-to='0']")!.textContent).toBe("2026-12-15");
    expect(c.querySelector("[data-chart-text]")!.textContent).toMatch(/2026-12-01/);
  });
  for (const lang of ["bn", "mix"]) it(`the new boards read in ${lang} with Latin digits`, () => {
    localStorage.setItem("tm:ui:lang", lang); store.demo.put(goal("a", { "goal.target_date": "2099-01-01" })); store.demo.put(task("t1", ["a"])); go("#/journey/boards");
    for (const k of ["goaltree", "resourcemap", "readiness", "plandiff"]) expect(q(`[data-chart=${k}] h2`).textContent).toMatch(/[ঀ-৿]/); expect(app().textContent).not.toMatch(/[০-৯]/);
  });
  it("every bd.gt/rm/rd/pd key exists in en and bn; no score, rank or red wording", () => {
    const keys = Object.keys(PACKS.en).filter((k) => /^bd\.(gt|rm|rd|pd)\./.test(k)); expect(keys.length).toBeGreaterThan(40);
    for (const k of keys) { expect(PACKS.bn[k as keyof typeof PACKS.bn], k).toMatch(/[ঀ-৿]/); expect(PACKS.en[k as keyof typeof PACKS.en], k).not.toMatch(/\b(score|rank|streak|grade|fail|behind|overdue|late)\b/i); }
  });
  it("M18 is now complete in the capability list", () => { expect(buildLabel(MODULES.find((m) => m.id === "M18")!)).toBe("complete"); });
});

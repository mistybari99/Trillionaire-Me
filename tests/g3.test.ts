import { describe, expect, it } from "vitest";
import { schedule, todaysActions, type Block, type PlanTask } from "../src/core/planner";
import { add, mergeTasks, orphans, remove, rootGoal, splitTask, TreeError, type Tree } from "../src/core/goals";
import { monthlyCashFlow, netWorth, runwayMonths, type FinItem } from "../src/core/finance";
import type { FieldValue } from "../src/core/types";

function rng(seed: number) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
const overlap = (a: { start: number; end: number }, b: { start: number; end: number }) => a.start < b.end && b.start < a.end;

describe("TM-TST-003 hard constraints are never violated (100 generated plans)", () => {
  it("no task lands inside prayer/family/rest, never over capacity, unknown minutes never placed", () => {
    const r = rng(3);
    for (let n = 0; n < 100; n++) {
      const blocked: Block[] = Array.from({ length: 1 + Math.floor(r() * 12) }, () => { const s = 360 + Math.floor(r() * 900); return { day: Math.floor(r() * 7), start: s, end: s + 15 + Math.floor(r() * 180) }; });
      const tasks: PlanTask[] = Array.from({ length: 1 + Math.floor(r() * 15) }, (_, i) => ({ id: `t${i}`, minutes: r() < 0.15 ? null : 5 + Math.floor(r() * 120), priority: Math.floor(r() * 5) }));
      const cap = Math.floor(r() * 1500);
      const p = schedule({ weeklyFreeMinutes: cap, blocked, tasks });
      for (const pl of p.placements) {
        for (const b of blocked.filter((x) => x.day === pl.day)) expect(overlap(pl, b)).toBe(false);
        expect(tasks.find((t) => t.id === pl.taskId)!.minutes).not.toBeNull();
        expect(pl.end - pl.start).toBe(tasks.find((t) => t.id === pl.taskId)!.minutes);
      }
      for (let i = 0; i < p.placements.length; i++) for (let j = i + 1; j < p.placements.length; j++) if (p.placements[i]!.day === p.placements[j]!.day) expect(overlap(p.placements[i]!, p.placements[j]!)).toBe(false);
      expect(p.usedMinutes).toBeLessThanOrEqual(cap);
      expect(p.placements.length + p.deferred.length).toBe(tasks.length); // nothing silently dropped
      expect(JSON.stringify(schedule({ weeklyFreeMinutes: cap, blocked, tasks }))).toBe(JSON.stringify(p)); // deterministic
    }
  });
  it("unknown capacity places nothing (never assumes 0 or unlimited) and says why", () => {
    const p = schedule({ weeklyFreeMinutes: null, blocked: [], tasks: [{ id: "a", minutes: 10, priority: 1 }] });
    expect(p.placements).toEqual([]); expect(p.deferred[0]!.reason).toBe("unknown_capacity");
  });
  it("unknown task time is 'needs_estimate', not scheduled as 0 minutes", () => {
    const p = schedule({ weeklyFreeMinutes: 600, blocked: [], tasks: [{ id: "a", minutes: null, priority: 9 }, { id: "b", minutes: 30, priority: 1 }] });
    expect(p.placements.map((x) => x.taskId)).toEqual(["b"]); expect(p.deferred).toEqual([{ taskId: "a", reason: "needs_estimate" }]);
  });
  it("overload modes never add work: minimum_week ⊆ normal, pause = nothing", () => {
    const r = rng(9);
    for (let n = 0; n < 50; n++) {
      const tasks: PlanTask[] = Array.from({ length: 10 }, (_, i) => ({ id: `t${i}`, minutes: 10 + Math.floor(r() * 60), priority: Math.floor(r() * 5) }));
      const base = { weeklyFreeMinutes: 1200, blocked: [] as Block[], tasks };
      const normal = schedule(base).placements.length, minw = schedule({ ...base, mode: "minimum_week" }).placements.length;
      expect(minw).toBeLessThanOrEqual(Math.min(3, normal)); expect(schedule({ ...base, mode: "pause" }).placements).toEqual([]);
    }
  });
  it("the week starts on the chosen day, so today's tasks come first", () => {
    for (const sd of [0, 3, 6]) {
      const p = schedule({ weeklyFreeMinutes: 600, blocked: [], tasks: [{ id: "a", minutes: 30, priority: 1 }], startDay: sd });
      expect(p.placements[0]!.day).toBe(sd);
    }
  });
  it("Home shows at most 3 actions for a day", () => {
    const tasks = Array.from({ length: 12 }, (_, i) => ({ id: `t${i}`, minutes: 20, priority: i }));
    expect(todaysActions(schedule({ weeklyFreeMinutes: 5000, blocked: [], tasks }), 0).length).toBeLessThanOrEqual(3);
  });
});

describe("TM-TST-037 goal hierarchy keeps links valid", () => {
  const base = (): Tree => {
    let t: Tree = {};
    t = add(t, { id: "g", kind: "goal", parent: null, title: "G" }); t = add(t, { id: "s", kind: "subgoal", parent: "g", title: "S" });
    t = add(t, { id: "p", kind: "project", parent: "s", title: "P" }); t = add(t, { id: "t1", kind: "task", parent: "p", title: "T1" });
    return add(t, { id: "t2", kind: "task", parent: "p", title: "T2" });
  };
  it("rejects illegal parents", () => {
    const t = base();
    expect(() => add(t, { id: "x", kind: "goal", parent: "g", title: "" })).toThrow(TreeError);
    expect(() => add(t, { id: "x", kind: "subgoal", parent: "p", title: "" })).toThrow(TreeError);
    expect(() => add(t, { id: "x", kind: "task", parent: null, title: "" })).toThrow(TreeError);
    expect(() => add(t, { id: "t1", kind: "task", parent: "p", title: "" })).toThrow(/duplicate/);
  });
  it("every task reaches a goal; split/merge/delete never orphan (200 random ops)", () => {
    const r = rng(37); let t = base(); let id = 100;
    for (let i = 0; i < 200; i++) {
      const tasks = Object.values(t).filter((n) => n.kind === "task"); const pick = tasks[Math.floor(r() * tasks.length)];
      const op = r();
      try {
        if (op < 0.3 && pick) t = splitTask(t, pick.id, [`n${id++}`, `n${id++}`]);
        else if (op < 0.5 && tasks.length >= 2) { const a = tasks[0]!, same = tasks.filter((x) => x.parent === a.parent); if (same.length >= 2) t = mergeTasks(t, same.slice(0, 2).map((x) => x.id), `m${id++}`); }
        else if (op < 0.7 && pick) t = remove(t, pick.id);
        else if (op < 0.85) { const ps = Object.values(t).filter((n) => n.kind === "project"); if (ps.length) t = add(t, { id: `k${id++}`, kind: "task", parent: ps[Math.floor(r() * ps.length)]!.id, title: "x" }); }
        else { const ps = Object.values(t).filter((n) => n.kind === "project" || n.kind === "subgoal"); const q = ps[Math.floor(r() * ps.length)]; if (q) t = remove(t, q.id); }
      } catch (e) { expect(e).toBeInstanceOf(TreeError); }
      expect(orphans(t)).toEqual([]);
      for (const n of Object.values(t)) if (n.kind === "task") expect(rootGoal(t, n.id)).toBe("g");
    }
  });
  it("deleting a project re-attaches its tasks upward", () => {
    const t = remove(base(), "p"); expect(t["t1"]!.parent).toBe("s"); expect(rootGoal(t, "t1")).toBe("g");
  });
});

describe("TM-TST-021/022/023 finance never treats unknown as 0", () => {
  const v = (n: number): FieldValue => ({ state: "value", value: n, label: "DEMO" });
  const items: FinItem[] = [
    { kind: "asset", scope: "personal", amount: v(100) }, { kind: "liability", scope: "personal", amount: v(30) },
    { kind: "asset", scope: "business", amount: v(5000) }, { kind: "income", scope: "personal", amount: v(50) }, { kind: "expense", scope: "personal", amount: v(80) },
  ];
  it("net worth and flow are computed per scope, personal and business never mixed", () => {
    expect(netWorth(items, "personal")).toEqual({ ok: true, value: 70, label: "ESTIMATE" });
    expect(netWorth(items, "business")).toEqual({ ok: true, value: 5000, label: "ESTIMATE" });
    expect(monthlyCashFlow(items, "personal")).toEqual({ ok: true, value: -30, label: "ESTIMATE" });
  });
  it("any unknown input makes the result unknown (1000 random cases)", () => {
    const r = rng(22);
    for (let i = 0; i < 1000; i++) {
      const list: FinItem[] = Array.from({ length: 1 + Math.floor(r() * 6) }, () => ({ kind: (["asset", "liability"] as const)[Math.floor(r() * 2)]!, scope: "personal" as const, amount: r() < 0.3 ? ({ state: ["unknown", "later", "not_applicable", "prefer_not"][Math.floor(r() * 4)] } as FieldValue) : v(Math.floor(r() * 1000)) }));
      const unknowns = list.filter((x) => x.amount.state !== "value").length;
      const res = netWorth(list, "personal");
      if (unknowns) expect(res.ok).toBe(false); else expect(res.ok).toBe(true);
    }
  });
  it("runway: unknown cash/flow → unknown; non-negative flow → no end date, not 'infinite'; real zero stays zero", () => {
    expect(runwayMonths({ state: "unknown" }, { ok: true, value: -10, label: "ESTIMATE" }).ok).toBe(false);
    expect(runwayMonths(v(100), { ok: false, reason: "unknown_inputs", missing: 1 }).ok).toBe(false);
    expect(runwayMonths(v(100), { ok: true, value: 5, label: "ESTIMATE" })).toEqual({ ok: true, value: null, label: "ESTIMATE" });
    expect(runwayMonths(v(300), { ok: true, value: -100, label: "ESTIMATE" })).toEqual({ ok: true, value: 3, label: "ESTIMATE" });
    expect(runwayMonths(v(0), { ok: true, value: -100, label: "ESTIMATE" })).toEqual({ ok: true, value: 0, label: "ESTIMATE" });
  });
});

// TM-REQ-040: scheduler never overlaps hard blocks (200 random plans); a manual override needs explicit confirmation and is logged.
import { describe, expect, it } from "vitest";
import { schedule, type Block, type PlanInput, type Placement } from "../src/core/planner";
import { overlapsOf, overrideLogRecord, placeByHand } from "../src/core/override";

let seed = 40;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

describe("TM-TST-040 hard constraints and logged override", () => {
  it("0 placements overlap hard blocks across 200 random plans, and none overlap each other", () => {
    for (let i = 0; i < 200; i++) {
      const blocked: Block[] = Array.from({ length: 3 + Math.floor(rnd() * 12) }, () => { const s = Math.floor(rnd() * 20) * 60; return { day: Math.floor(rnd() * 7), start: s, end: s + 30 + Math.floor(rnd() * 120) }; });
      const tasks = Array.from({ length: 1 + Math.floor(rnd() * 10) }, (_, k) => ({ id: `t${k}`, minutes: 15 + Math.floor(rnd() * 180), priority: 1 + Math.floor(rnd() * 3) }));
      const inp: PlanInput = { weeklyFreeMinutes: 600 + Math.floor(rnd() * 3000), blocked, tasks, startDay: Math.floor(rnd() * 7) };
      const plan = schedule(inp);
      for (const p of plan.placements) expect(overlapsOf(p, blocked), `plan ${i}`).toEqual([]);
      const ps = [...plan.placements].sort((a, b) => a.day - b.day || a.start - b.start);
      for (let k = 1; k < ps.length; k++) if (ps[k]!.day === ps[k - 1]!.day) expect(ps[k]!.start).toBeGreaterThanOrEqual(ps[k - 1]!.end);
    }
  });
  const blocked: Block[] = [{ day: 1, start: 12 * 60, end: 13 * 60 }];
  const empty = { placements: [], deferred: [{ taskId: "a", reason: "no_room" as const }], usedMinutes: 0 };
  const onBlock: Placement = { taskId: "a", day: 1, start: 12 * 60 + 15, end: 12 * 60 + 45 };
  it("an overlap without confirmation is refused and nothing changes", () => {
    const r = placeByHand(empty, onBlock, blocked, { confirmOverride: false, at: "2026-10-31T00:00:00.000Z" });
    expect(r).toMatchObject({ ok: false, reason: "needs_confirmation" }); expect(empty.placements.length).toBe(0);
  });
  it("an overlap with explicit confirmation is placed and produces exactly one log entry that names the block", () => {
    const r = placeByHand(empty, onBlock, blocked, { confirmOverride: true, at: "2026-10-31T00:00:00.000Z" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.plan.placements).toEqual([onBlock]); expect(r.plan.deferred).toEqual([]); expect(r.log).not.toBeNull();
      expect(r.log!.overlaps).toEqual(blocked);
      const rec = overrideLogRecord(r.log!, { id: "ov-1", text: "Placed on a protected time by choice.", ns: "real", ownerId: "owner" });
      expect(rec.entity).toBe("journey_log"); expect(rec.ns).toBe("real"); expect(rec.links).toEqual({ task: "a" });
    }
  });
  it("a slot outside every block needs no confirmation and writes no log; bad and repeated slots are refused", () => {
    const free: Placement = { taskId: "a", day: 1, start: 14 * 60, end: 15 * 60 };
    const r = placeByHand(empty, free, blocked, { confirmOverride: false, at: "x" });
    expect(r.ok && r.log === null).toBe(true);
    expect(placeByHand(empty, { ...free, end: free.start }, blocked, { confirmOverride: true, at: "x" })).toMatchObject({ ok: false, reason: "bad_slot" });
    if (r.ok) expect(placeByHand(r.plan, free, blocked, { confirmOverride: true, at: "x" })).toMatchObject({ ok: false, reason: "already_placed" });
  });
});

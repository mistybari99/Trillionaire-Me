import { describe, expect, it } from "vitest";
import { Outbox, applyAll, applyOp, emptyState, type SetFieldOp } from "../src/core/sync";
import type { FieldValue } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" });
const op = (i: number, device: string, ts: number, value: FieldValue, field = "profile.display_name", ns: "demo" | "real" = "demo"): SetFieldOp =>
  ({ opId: `${device}-${i}`, ns, recordId: "r1", entity: "profile", fieldId: field, value, ts, device });
function rng(seed: number) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
const canon = (x: unknown): unknown => Array.isArray(x) ? x.map(canon) : x && typeof x === "object" ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b)).map(([k, y]) => [k, canon(y)])) : x;
const final = (s: ReturnType<typeof emptyState>) => JSON.stringify(canon(s.records)); // key order is not state

describe("G2 sync: duplicate replay, interruption, ordering", () => {
  const ops = [op(1, "A", 10, v("a1")), op(2, "B", 20, v("b1")), op(3, "A", 30, v("a2")), op(4, "A", 15, v("x"), "profile.birth_year")];
  it("duplicate replay changes nothing", () => {
    const once = applyAll(emptyState(), ops);
    expect(final(applyAll(once, ops))).toBe(final(once));
    expect(applyAll(once, ops).conflicts).toEqual(once.conflicts);
  });
  it("any order gives the same final state (100 shuffles)", () => {
    const base = final(applyAll(emptyState(), ops)); const r = rng(5);
    for (let i = 0; i < 100; i++) { const sh = [...ops].sort(() => r() - 0.5); expect(final(applyAll(emptyState(), sh))).toBe(base); }
  });
  it("interrupted flush then resume equals an uninterrupted run", () => {
    const ob = new Outbox(); ops.forEach((o) => ob.enqueue(o));
    let server = emptyState();
    server = applyAll(server, ob.pending().slice(0, 2)); // connection drops after 2 ops, ack never arrives
    const restored = Outbox.from(ob.toJSON());           // app restarts, outbox survives
    server = applyAll(server, restored.pending());       // replays all, including the 2 already applied
    restored.ack(restored.pending().map((o) => o.opId));
    expect(restored.pending().length).toBe(0);
    expect(final(server)).toBe(final(applyAll(emptyState(), ops)));
  });
  it("enqueue is idempotent", () => { const ob = new Outbox(); ob.enqueue(ops[0]!); ob.enqueue(ops[0]!); expect(ob.pending().length).toBe(1); });
});

describe("G2 sync: conflicts are recorded, never silent", () => {
  it("two devices editing the same field: later wins, loser is kept in conflicts", () => {
    const s = applyAll(emptyState(), [op(1, "A", 10, v("mine")), op(2, "B", 20, v("theirs"))]);
    expect(s.records["demo:r1"]!.values["profile.display_name"]).toEqual(v("theirs"));
    expect(s.conflicts).toHaveLength(1); expect(s.conflicts[0]!.dropped).toEqual(v("mine"));
  });
  it("same device editing twice is not a conflict", () => {
    expect(applyAll(emptyState(), [op(1, "A", 10, v("x")), op(2, "A", 20, v("y"))]).conflicts).toEqual([]);
  });
  it("an 'unknown' answer is kept as unknown, never turned into 0/empty", () => {
    const s = applyAll(emptyState(), [op(1, "A", 10, { state: "unknown" }, "profile.birth_year")]);
    expect(s.records["demo:r1"]!.values["profile.birth_year"]).toEqual({ state: "unknown" });
  });
});

describe("G2 sync: isolation holds", () => {
  it("ops can not write real data while real is locked, nor DEMO values into real", () => {
    expect(() => applyOp(emptyState(), op(1, "A", 1, { state: "value", value: "x", label: "FACT" }, "profile.display_name", "real"))).toThrow(/locked/);
    expect(() => applyOp(emptyState(), op(2, "A", 1, v("x"), "profile.display_name", "real"), true)).toThrow(/DEMO/);
  });
  it("demo and real ops of the same record id never mix", () => {
    const s = applyAll(emptyState(), [op(1, "A", 1, v("d"))]);
    expect(Object.keys(s.records)).toEqual(["demo:r1"]);
  });
});

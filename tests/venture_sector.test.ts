// BUILD-02 phase C (core): the business type saved on a venture. Numbers below are invented test fixtures, not data.
import { describe, expect, it } from "vitest";
import { ALL_FAMILIES } from "../src/core/sectors";
import { MONTH_IDS, SECTOR_FIELDS, breakEvenLink, clearAnswers, readSectorData, sectorSummary, sectorValues, ventureSectorView, withAnswer, withCheck, withCustom, withSector } from "../src/core/ventureSector";
import type { TMRecord } from "../src/core/types";

const v = (x: unknown) => ({ state: "value" as const, value: x, label: "DEMO" as const });
const rec = (vals: Record<string, unknown>): TMRecord => ({ id: "v1", entity: "venture", ns: "demo", ownerId: "demo-user", schemaVersion: 5, createdAt: "2026-11-01T00:00:00.000Z",
  values: Object.fromEntries(Object.entries(vals).map(([k, x]) => [k, typeof x === "object" && x !== null && "state" in (x as object) ? x : v(x)])) as TMRecord["values"] });
const retail = (inputs: Record<string, number>, extra: Record<string, unknown> = {}) => rec({ "venture.name": "Test fixture, not data", [SECTOR_FIELDS.id]: "retail", [SECTOR_FIELDS.inputs]: JSON.stringify(inputs), ...extra });

describe("venture sector: reading", () => {
  it("a venture with no sector values has no type: nothing is invented", () => {
    const view = ventureSectorView(rec({ "venture.name": "Test fixture, not data" }));
    expect(view.sectorId).toBeNull(); expect(view.family).toBeNull(); expect(view.removed).toBe(false);
    expect(view.inputs).toEqual([]); expect(view.results).toEqual([]); expect(sectorSummary(rec({}))).toBeNull();
  });
  it("blank or skipped answers are Unknown (null); a typed 0 stays 0", () => {
    const view = ventureSectorView(retail({ price: 0, varCost: 30 }));
    const by = (id: string) => view.inputs.find((i) => i.input.id === id)!.value;
    expect(by("price")).toBe(0); expect(by("varCost")).toBe(30); expect(by("fixed")).toBeNull();
    expect(view.results.find((r) => r.id === "unitMargin")!.value).toBe(-30); // a real 0 price is a number
    expect(view.results.find((r) => r.id === "breakEvenSales")!.value).toBeNull();
    expect(view.results.find((r) => r.id === "breakEvenSales")!.missing).toEqual(["fixed"]);
  });
  it("hand-computed worked example: price 50, buying cost 30, fixed 4000", () => {
    const view = ventureSectorView(retail({ price: 50, varCost: 30, fixed: 4000 }));
    const r = (id: string) => view.results.find((x) => x.id === id)!.value;
    expect(r("unitMargin")).toBe(20); expect(r("marginPct")).toBe(40); expect(r("breakEvenItems")).toBe(200); expect(r("breakEvenSales")).toBe(10000);
    expect(r("grossMarginMonth")).toBeNull(); expect(r("stockDays")).toBeNull(); // needs figures the person has not given
  });
  it("garbage in the saved text is Unknown, never a crash and never 0", () => {
    for (const bad of ["{not json", "[1,2]", "7", "null", "ZQ12X", ""]) {
      const view = ventureSectorView(rec({ [SECTOR_FIELDS.id]: "retail", [SECTOR_FIELDS.inputs]: bad, [SECTOR_FIELDS.checks]: bad, [SECTOR_FIELDS.custom]: bad }));
      expect(view.inputs.every((i) => i.value === null)).toBe(true); expect(view.results.every((r) => r.value === null)).toBe(true);
    }
    const d = readSectorData(rec({ [SECTOR_FIELDS.inputs]: JSON.stringify({ price: "12", varCost: null, fixed: 5, nan: "x" }) }));
    expect(d.inputs).toEqual({ fixed: 5 });
    expect(readSectorData(rec({ [SECTOR_FIELDS.inputs]: { state: "unknown" } })).inputs).toEqual({});
  });
  it("an unknown or removed family keeps its answers and shows Unknown", () => {
    const view = ventureSectorView(rec({ [SECTOR_FIELDS.id]: "no-such-family", [SECTOR_FIELDS.inputs]: JSON.stringify({ price: 9 }) }));
    expect(view.removed).toBe(true); expect(view.family).toBeNull(); expect(view.results).toEqual([]);
    expect(view.sectorId).toBe("no-such-family"); expect(view.data.inputs).toEqual({ price: 9 }); expect(view.spare).toEqual({ price: 9 });
  });
  it("answers kept from another type show as spare and still count when this family uses the same id", () => {
    const view = ventureSectorView(retail({ price: 5, zzOld: 3 }));
    expect(view.spare).toEqual({ zzOld: 3 }); expect(view.inputs.find((i) => i.input.id === "price")!.value).toBe(5);
  });
  it("seasonal families offer twelve months; the spread needs all twelve", () => {
    const part = ventureSectorView(retail({ jan: 10, feb: 20 }));
    expect(part.months.map((m) => m.id)).toEqual([...MONTH_IDS]);
    expect(part.results.find((r) => r.id === "season-seasonalitySpread")!.value).toBeNull();
    const all = Object.fromEntries(MONTH_IDS.map((m, i) => [m, 100 + i * 10]));
    const full = ventureSectorView(retail(all));
    expect(full.results.find((r) => r.id === "season-seasonalitySpread")!.value).toBe(110);
    expect(full.spare).toEqual({});
  });
  it("no family uses a month name as an input id", () => {
    for (const f of ALL_FAMILIES) for (const i of f.inputs) expect(MONTH_IDS as readonly string[], `${f.id}.${i.id}`).not.toContain(i.id);
  });
  it("custom: the person's own inputs and formula are calculated; a broken definition shows an empty custom type", () => {
    const def = { inputs: [{ id: "a1", label: "Sales", unit: "money", perPeriod: true }, { id: "a2", label: "Costs", unit: "money", perPeriod: true }], formulas: [{ id: "f1", name: "Left over", expr: "a1 - a2" }] };
    const ok = ventureSectorView(rec({ [SECTOR_FIELDS.id]: "custom", [SECTOR_FIELDS.custom]: JSON.stringify(def), [SECTOR_FIELDS.inputs]: JSON.stringify({ a1: 100, a2: 0 }) }));
    expect(ok.results.map((r) => [r.id, r.value])).toEqual([["f1", 100]]);
    const half = ventureSectorView(rec({ [SECTOR_FIELDS.id]: "custom", [SECTOR_FIELDS.custom]: JSON.stringify(def), [SECTOR_FIELDS.inputs]: JSON.stringify({ a1: 100 }) }));
    expect(half.results[0]!.value).toBeNull(); expect(half.results[0]!.missing).toEqual(["a2"]);
    const bad = ventureSectorView(rec({ [SECTOR_FIELDS.id]: "custom", [SECTOR_FIELDS.custom]: JSON.stringify({ ...def, formulas: [{ id: "f1", name: "x", expr: "a1 + zz" }] }) }));
    expect(bad.family?.id).toBe("custom"); expect(bad.inputs).toEqual([]); expect(bad.results).toEqual([]);
    const notEval = ventureSectorView(rec({ [SECTOR_FIELDS.id]: "custom", [SECTOR_FIELDS.custom]: JSON.stringify({ ...def, formulas: [{ id: "f1", name: "x", expr: "a1.constructor" }] }) }));
    expect(notEval.results).toEqual([]);
  });
});

describe("venture sector: writing", () => {
  it("round trip: answers, ticks and the type survive sectorValues -> readSectorData", () => {
    let d = readSectorData(rec({}));
    d = withSector(d, "retail"); d = withAnswer(d, "price", 0); d = withAnswer(d, "varCost", 12.5); d = withCheck(d, "q", 2, true); d = withCheck(d, "r", 0, true); d = withCheck(d, "q", 2, true);
    const back = readSectorData({ values: sectorValues(d, "DEMO") });
    expect(back).toEqual({ sectorId: "retail", inputs: { price: 0, varCost: 12.5 }, custom: null, checks: { q: [2], r: [0] } });
    expect(withCheck(back, "q", 2, false).checks.q).toEqual([]);
  });
  it("a blank answer removes the value (Unknown again); empty parts are stored as unknown, not as 0 or an empty list", () => {
    let d = withAnswer(withSector(readSectorData(rec({})), "retail"), "price", 5);
    d = withAnswer(d, "price", null);
    const vals = sectorValues(d, "DEMO");
    expect(vals[SECTOR_FIELDS.inputs]).toEqual({ state: "unknown" }); expect(vals[SECTOR_FIELDS.checks]).toEqual({ state: "unknown" }); expect(vals[SECTOR_FIELDS.custom]).toEqual({ state: "unknown" });
    expect(sectorValues(withSector(d, null), "DEMO")[SECTOR_FIELDS.id]).toEqual({ state: "unknown" });
  });
  it("changing the type keeps the old answers; clearing is a separate, explicit step", () => {
    const d = withAnswer(withSector(readSectorData(rec({})), "retail"), "price", 5);
    const moved = withSector(d, "food-service");
    expect(moved.inputs).toEqual({ price: 5 }); expect(clearAnswers(moved).inputs).toEqual({});
    expect(withCustom(moved, { inputs: [], formulas: [] }).custom).toEqual({ inputs: [], formulas: [] });
  });
  it("labels follow the mode: FACT values are written as typed", () => {
    const vals = sectorValues(withSector(readSectorData(rec({})), "retail"), "FACT");
    expect(vals[SECTOR_FIELDS.id]).toMatchObject({ state: "value", value: "retail", label: "FACT" });
  });
});

describe("venture sector: links", () => {
  const view = (inputs: Record<string, number>) => ventureSectorView(retail(inputs));
  it("break-even vs income needs both numbers, otherwise names what is missing", () => {
    expect(breakEvenLink(view({ price: 50, varCost: 30, fixed: 4000 }), 12000)).toEqual({ state: "value", breakEven: 10000, income: 12000 });
    expect(breakEvenLink(view({ price: 50, varCost: 30, fixed: 4000 }), null)).toEqual({ state: "unknown", needs: ["income"] });
    expect(breakEvenLink(view({ price: 50 }), 0)).toEqual({ state: "unknown", needs: ["breakEven"] }); // income typed as 0 is a number
    expect(breakEvenLink(view({}), null)).toEqual({ state: "unknown", needs: ["breakEven", "income"] });
    expect(breakEvenLink(ventureSectorView(rec({})), 5)).toEqual({ state: "none" });
  });
  it("summary: the type name and the first calculation that has a number; none when no type", () => {
    expect(sectorSummary(retail({}))!.first).toBeNull();
    const s = sectorSummary(retail({ price: 50, varCost: 30 }))!;
    expect(s.family.en).toBe("Retail shop"); expect(s.first).toMatchObject({ value: 20 });
  });
});

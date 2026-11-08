// BUILD-02 phase A: the sector formula engine, shared library, registry and custom family.
// All numbers below are invented neutral TEST FIXTURES with hand-computed answers. They are not shipped and are not benchmarks.
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { evaluate, evaluateText, ExprError, identifiers, inferKind, parse, UnitError } from "../src/core/sectors/engine";
import { LIB_FORMULAS, expandLib, getLibFormula } from "../src/core/sectors/formulas";
import {
  ALL_FAMILIES, CUSTOM_ID, buildCustomFamily, evaluateFamily, getFamily, listFamilies, resolvedFormulas, searchFamilies,
  validateCustomDef, validateFamily, validateRegistry,
} from "../src/core/sectors";
import type { SectorFamily } from "../src/core/sectors";

const lib = (id: string, values: Record<string, number | null>, map?: Record<string, string>) => {
  const f = getLibFormula(id); if (!f) throw new Error(id);
  const m = map ?? Object.fromEntries(f.params.map((p) => [p.id, p.id]));
  return evaluate(parse((expandLib(f, m) as { expr: string }).expr), values);
};

describe("engine: arithmetic by hand", () => {
  it("precedence, parentheses, unary minus, functions", () => {
    expect(evaluateText("2 + 3 * 4", {})).toBe(14);
    expect(evaluateText("(2 + 3) * 4", {})).toBe(20);
    expect(evaluateText("-a + 10", { a: 4 })).toBe(6);
    expect(evaluateText("10 - 4 - 3", {})).toBe(3);
    expect(evaluateText("12 / 4 / 3", {})).toBe(1);
    expect(evaluateText("max(a, b, 7) - min(a, b)", { a: 2, b: 5 })).toBe(5);
    expect(evaluateText("abs(a - b)", { a: 2, b: 5 })).toBe(3);
    expect(evaluateText("1.5 * 4", {})).toBe(6);
  });
  it("identifiers lists each input once", () => expect(identifiers(parse("a * b + a - max(c, b)"))).toEqual(["a", "b", "c"]));
});

describe("engine: Unknown, never 0", () => {
  it("any missing, null, NaN or Infinity input gives null", () => {
    expect(evaluateText("a + b", { a: 1 })).toBeNull();
    expect(evaluateText("a + b", { a: 1, b: null })).toBeNull();
    expect(evaluateText("a + b", { a: 1, b: undefined })).toBeNull();
    expect(evaluateText("a + b", { a: 1, b: NaN })).toBeNull();
    expect(evaluateText("a + b", { a: 1, b: Infinity })).toBeNull();
  });
  it("a real 0 is a number, not Unknown", () => {
    expect(evaluateText("a + b", { a: 0, b: 0 })).toBe(0);
    expect(evaluateText("a * b", { a: 0, b: 5 })).toBe(0);
  });
  it("an unused-looking branch still needs its input (no partial answer)", () => {
    expect(evaluateText("a * 0 + b * 0", { a: 1 })).toBeNull();
    expect(evaluateText("max(a, b)", { a: 1 })).toBeNull();
  });
  it("division by zero is Unknown, also inside a larger expression", () => {
    expect(evaluateText("a / b", { a: 5, b: 0 })).toBeNull();
    expect(evaluateText("1 / 0", {})).toBeNull();
    expect(evaluateText("10 + a / (b - b)", { a: 1, b: 3 })).toBeNull();
  });
  it("no default values: names that are not inputs are Unknown", () => {
    expect(evaluateText("constructor + 1", {})).toBeNull();
    expect(evaluateText("toString", {})).toBeNull();
  });
});

describe("engine: parser safety (only the expression grammar)", () => {
  const bad = [
    "", "   ", "1 +", "* 2", "(1", "1)", "a b", "1 2", "a.b", "a[0]", "a;b", "a = b", "a == b", "a ? b : c", "a ** 2", "a % 2", "a, b",
    "'x'", "\"x\"", "`x`", "alert(1)", "process.exit(1)", "Function('x')()", "constructor('x')()", "eval(1)", "min(a)", "abs(a, b)", "max()",
    "1e5", "0x10", "1_000", ".5", "5.", "a\tb", "a\nb", "a & b", "a | b", "!a", "~a", "{}", "[1]", "a => a", "import('x')", "a //c", "a /* c */",
    "০১", "a + b",
  ];
  for (const s of bad) it(`rejects ${JSON.stringify(s)}`, () => expect(() => parse(s)).toThrow(ExprError));
  it("rejects very long and very deep input", () => {
    expect(() => parse("1+".repeat(400) + "1")).toThrow(ExprError);
    expect(() => parse("(".repeat(100) + "1" + ")".repeat(100))).toThrow(ExprError);
    expect(() => parse("-".repeat(100) + "1")).toThrow(ExprError);
  });
  it("the engine source has no eval or Function", () => {
    const src = readFileSync("src/core/sectors/engine.ts", "utf8").split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
    expect(/\beval\s*\(|new Function|\bFunction\s*\(/.test(src)).toBe(false);
  });
});

describe("engine: unit-kind validation", () => {
  const kinds = { price: "money", cost: "money", n: "qty", people: "count", d: "days", pct: "percent", rate: "rate" } as const;
  const k = (s: string) => inferKind(parse(s), kinds);
  it("accepts sensible unit maths", () => {
    expect(k("price - cost")).toBe("money");
    expect(k("price * n")).toBe("money");
    expect(k("price / n")).toBe("money");
    expect(k("price / cost")).toBe("scalar");
    expect(k("pct / 100")).toBe("scalar");
    expect(k("price * (pct / 100)")).toBe("money");
    expect(k("price / cost * 100")).toBe("scalar");
    expect(k("price / cost * d")).toBe("days");
    expect(k("max(price, cost)")).toBe("money");
  });
  it("rejects a unit mismatch", () => {
    expect(() => k("price + n")).toThrow(UnitError);
    expect(() => k("price - d")).toThrow(UnitError);
    expect(() => k("n * d")).toThrow(UnitError);
    expect(() => k("n / price")).toThrow(UnitError);
    expect(() => k("max(price, n)")).toThrow(UnitError);
    expect(() => k("missing + 1")).toThrow(UnitError);
  });
});

describe("shared library: hand-computed worked examples (test fixtures)", () => {
  it("every library formula parses, its params are all used, and its declared result fits its units", () => {
    for (const f of LIB_FORMULAS) {
      const node = parse(f.expr);
      expect(identifiers(node).sort(), f.id).toEqual(f.params.map((p) => p.id).sort());
      const got = inferKind(node, Object.fromEntries(f.params.map((p) => [p.id, p.unit])));
      const fits = got === f.result || (got === "scalar" && ["ratio", "percent", "count", "qty", "rate"].includes(f.result));
      expect(fits, `${f.id}: ${got} vs ${f.result}`).toBe(true);
      expect(f.name.en && /[ঀ-৿]/.test(f.name.bn), f.id).toBeTruthy();
      for (const p of f.params) expect(p.label.en && /[ঀ-৿]/.test(p.label.bn), `${f.id}.${p.id}`).toBeTruthy();
    }
  });
  it("margins and break-even: price 50, cost 30, fixed 2000", () => {
    const v = { price: 50, varCost: 30, fixed: 2000 };
    expect(lib("contributionMargin", v)).toBe(20);
    expect(lib("contributionMarginPct", v)).toBeCloseTo(40, 9);
    expect(lib("breakEvenUnits", v)).toBe(100);
    expect(lib("breakEvenRevenue", v)).toBeCloseTo(5000, 9);
    expect(lib("grossMargin", { revenue: 1000, cogs: 600 })).toBeCloseTo(40, 9);
  });
  it("margin equal to price 0 or cost: Unknown", () => {
    expect(lib("breakEvenUnits", { price: 30, varCost: 30, fixed: 2000 })).toBeNull();
    expect(lib("contributionMarginPct", { price: 0, varCost: 5 })).toBeNull();
    expect(lib("grossMargin", { revenue: 0, cogs: 5 })).toBeNull();
  });
  it("working-capital days over a 30 day period", () => {
    expect(lib("receivableDays", { receivables: 300, revenue: 900, periodDays: 30 })).toBeCloseTo(10, 9);
    expect(lib("inventoryDays", { inventory: 200, cogs: 400, periodDays: 30 })).toBeCloseTo(15, 9);
    expect(lib("payableDays", { payables: 100, cogs: 400, periodDays: 30 })).toBeCloseTo(7.5, 9);
    expect(lib("cashConversion", { receivables: 300, inventory: 200, payables: 100, revenue: 900, cogs: 400, periodDays: 30 })).toBeCloseTo(17.5, 9);
    expect(lib("cashConversion", { receivables: 300, inventory: 200, payables: null, revenue: 900, cogs: 400, periodDays: 30 })).toBeNull();
  });
  it("customer maths: CAC 1000/20 = 50, LTV 40/(10/100) = 400, payback 6000/1000 = 6", () => {
    expect(lib("cac", { marketingSpend: 1000, newCustomers: 20 })).toBe(50);
    expect(lib("cac", { marketingSpend: 1000, newCustomers: 0 })).toBeNull();
    expect(lib("ltv", { marginPerPeriod: 40, churnPct: 10 })).toBeCloseTo(400, 9);
    expect(lib("ltv", { marginPerPeriod: 40, churnPct: 0 })).toBeNull();
    expect(lib("ltv", { marginPerPeriod: 40, churnPct: null })).toBeNull();
    expect(lib("payback", { investment: 6000, profitPerPeriod: 1000 })).toBe(6);
    expect(lib("payback", { investment: 6000, profitPerPeriod: 0 })).toBeNull();
  });
  it("capacity, yield, loss, occupancy, load", () => {
    expect(lib("capacityUtilisation", { used: 30, capacity: 40 })).toBeCloseTo(75, 9);
    expect(lib("yieldRate", { outputQty: 90, inputQty: 100 })).toBeCloseTo(90, 9);
    expect(lib("lossRate", { outputQty: 90, inputQty: 100 })).toBeCloseTo(10, 9);
    expect(lib("occupancy", { occupiedUnits: 12, availableUnits: 20 })).toBeCloseTo(60, 9);
    expect(lib("loadFactor", { usedLoad: 15, availableLoad: 20 })).toBeCloseTo(75, 9);
    expect(lib("revenuePerCapacity", { revenue: 9000, capacityUnits: 30 })).toBe(300);
  });
  it("seasonality spread from the user's twelve months: best 120, weakest 80", () => {
    const months = { jan: 100, feb: 80, mar: 120, apr: 100, may: 100, jun: 100, jul: 100, aug: 100, sep: 100, oct: 100, nov: 100, dec: 100 };
    expect(lib("seasonalitySpread", months)).toBe(40);
    expect(lib("seasonalitySpreadPct", months)).toBeCloseTo(33.333333, 5);
    expect(lib("seasonalitySpread", { ...months, jul: null })).toBeNull();
  });
  it("expandLib needs a full map and renames whole words only", () => {
    const f = getLibFormula("contributionMargin")!;
    expect(expandLib(f, { price: "salePrice" })).toBeNull();
    expect(expandLib(f, { price: "salePrice", varCost: "buyCost" })).toEqual({ expr: "salePrice - buyCost", needs: ["salePrice", "buyCost"] });
    const s = getLibFormula("seasonalitySpread")!;
    const m = Object.fromEntries(s.params.map((p) => [p.id, `x${p.id}`]));
    expect((expandLib(s, m) as { expr: string }).expr).toContain("max(xjan");
  });
});

describe("registry", () => {
  it("lists the families present, custom last, unique ids", () => {
    const ids = listFamilies().map((f) => f.id);
    expect(ids).toEqual(expect.arrayContaining(["retail", "food-service", CUSTOM_ID]));
    expect(ids[ids.length - 1]).toBe(CUSTOM_ID);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("every family passes the validator (ids, bilingual text, counts, units, needs)", () => expect(validateRegistry()).toEqual([]));
  it("lookup by id", () => {
    expect(getFamily("retail")?.name.en).toBe("Retail shop");
    expect(getFamily("nope")).toBeUndefined();
  });
  it("search by alias, English and Bangla, name, and empty query", () => {
    expect(searchFamilies("GROCERY").map((f) => f.id)).toContain("retail");
    expect(searchFamilies("মুদি").map((f) => f.id)).toContain("retail");
    expect(searchFamilies("cafe").map((f) => f.id)).toEqual(["food-service"]);
    expect(searchFamilies("চায়ের দোকান").map((f) => f.id)).toContain("food-service");
    expect(searchFamilies("zzzz")).toEqual([]);
    expect(searchFamilies("").length).toBe(ALL_FAMILIES.length);
  });
  it("the validator catches bad families", () => {
    const base = getFamily("retail") as SectorFamily;
    const probs = (f: SectorFamily) => validateFamily(f).join(" | ");
    expect(probs({ ...base, inputs: base.inputs.slice(0, 3) })).toMatch(/at least 5 inputs/);
    expect(probs({ ...base, formulas: base.formulas.slice(0, 2) })).toMatch(/at least 3 formulas/);
    expect(probs({ ...base, name: { en: "x", bn: "x" } })).toMatch(/name needs EN and BN/);
    expect(probs({ ...base, formulas: [...base.formulas, { id: "bad", name: { en: "b", bn: "খ" }, expr: "price + periodDays", needs: ["price", "periodDays"], result: "money" }] })).toMatch(/cannot add money and days/);
    expect(probs({ ...base, formulas: [...base.formulas, { id: "bad", name: { en: "b", bn: "খ" }, expr: "price - varCost", needs: ["price"], result: "money" }] })).toMatch(/needs\[\] must list/);
    expect(probs({ ...base, formulas: [...base.formulas, { id: "bad", name: { en: "b", bn: "খ" }, expr: "ghost * 2", needs: ["ghost"], result: "money" }] })).toMatch(/unknown input ghost/);
    expect(probs({ ...base, formulas: [...base.formulas, { id: "bad", use: "nope", map: {} }] })).toMatch(/unknown library formula/);
    expect(probs({ ...base, formulas: [...base.formulas, { id: "bad", name: { en: "b", bn: "খ" }, expr: "price / varCost", needs: ["price", "varCost"], result: "money" }] })).toMatch(/result kind money does not match/);
    expect(probs({ ...base, formulas: [...base.formulas, { id: "bad", name: { en: "b", bn: "খ" }, expr: "price; 1", needs: ["price"], result: "money" }] })).toMatch(/unexpected character/);
    expect(probs({ ...base, aliases: { en: ["Shop", "a", "b", "c", "d"], bn: ["দোকান", "ক", "খ", "গ"] } })).toMatch(/lower-case/);
    expect(probs({ ...base, questions: base.questions.slice(0, 2) })).toMatch(/at least 3 questions/);
    expect(probs({ ...base, risks: [] })).toMatch(/at least 3 risks/);
    expect(probs({ ...base, aliases: { en: ["a"], bn: ["ক"] } })).toMatch(/at least 5 English aliases/);
    expect(validateRegistry([base, base]).join()).toMatch(/family id twice/);
  });
  it("evaluateFamily: worked example for retail (fixture) and Unknown for the rest", () => {
    const r = getFamily("retail") as SectorFamily;
    const out = evaluateFamily(r, { price: 50, varCost: 30, fixed: 2000, revenue: 1000, cogs: 600 });
    expect(out.unitMargin).toBe(20);
    expect(out.marginPct).toBeCloseTo(40, 9);
    expect(out.breakEvenItems).toBe(100);
    expect(out.breakEvenSales).toBeCloseTo(5000, 9);
    expect(out.grossMarginMonth).toBeCloseTo(40, 9);
    expect(out.stockDays).toBeNull(); // inventory and period days not given
    expect(out.cashDays).toBeNull();
    expect(out.salesPerSpace).toBeNull();
    expect(Object.keys(out).sort()).toEqual(r.formulas.map((f) => f.id).sort());
    expect(Object.values(evaluateFamily(r, {})).every((v) => v === null)).toBe(true);
  });
  it("evaluateFamily: worked example for food service (fixture)", () => {
    const f = getFamily("food-service") as SectorFamily;
    const out = evaluateFamily(f, { price: 200, varCost: 80, fixed: 6000, revenue: 10000, foodCost: 3500, staffCost: 2500, seatsSold: 600, seatsAvailable: 800, wasteQty: 5, totalQty: 100 });
    expect(out.plateMargin).toBe(120);
    expect(out.platePct).toBeCloseTo(60, 9);
    expect(out.breakEvenPlates).toBe(50);
    expect(out.seatUse).toBeCloseTo(75, 9);
    expect(out.salesPerSeat).toBeCloseTo(12.5, 9);
    expect(out.foodCostPct).toBeCloseTo(35, 9);
    expect(out.staffCostPct).toBeCloseTo(25, 9);
    expect(out.wastePct).toBeCloseTo(5, 9);
    expect(evaluateFamily(f, { revenue: 0, foodCost: 5 }).foodCostPct).toBeNull(); expect(out.monthProfit).toBe(10000 - 3500 - 2500 - 6000 + 0); // division by zero
  });
  it("a bad formula gives Unknown instead of throwing", () => {
    const bad: SectorFamily = { ...(getFamily("retail") as SectorFamily), formulas: [{ id: "x", use: "nope", map: {} }, { id: "y", name: { en: "y", bn: "খ" }, expr: "1 +", needs: [], result: "money" }] };
    expect(evaluateFamily(bad, { price: 1 })).toEqual({ x: null, y: null });
  });
  it("resolvedFormulas expands library formulas and keeps their library id", () => {
    const rs = resolvedFormulas(getFamily("retail") as SectorFamily);
    expect(rs.find((f) => f.id === "unitMargin")).toMatchObject({ expr: "price - varCost", lib: "contributionMargin", result: "money" });
  });
});

describe("data files: no shipped numbers or benchmarks", () => {
  const dir = "src/core/sectors/families";
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));
  it("there is a data file for every family except custom", () => {
    expect(files.length).toBe(ALL_FAMILIES.filter((f) => !f.custom).length);
    expect(files.length).toBeGreaterThanOrEqual(2);
  });
  for (const f of files) {
    it(`${f} has no digits and no percent or currency signs`, () => {
      const body = readFileSync(`${dir}/${f}`, "utf8").split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
      expect(body.match(/[0-9০-৯]/g) ?? []).toEqual([]);
      expect(body.match(/[%৳$]/g) ?? []).toEqual([]);
    });
  }
  it("no sector text rates a sector (good, bad, best, typical, average margin)", () => {
    for (const f of ALL_FAMILIES) for (const t of [f.summary, ...f.questions, ...f.risks]) expect(/\b(typical|industry average|benchmark|good margin|bad margin|best sector)\b/i.test(t.en), `${f.id}: ${t.en}`).toBe(false);
  });
});

describe("custom family", () => {
  const def = {
    inputs: [
      { id: "fee", label: "Fee per job", unit: "money" as const },
      { id: "cost", label: "Cost per job", unit: "money" as const },
      { id: "jobs", label: "Jobs per month", unit: "qty" as const, perPeriod: true },
      { id: "rent", label: "Rent per month", unit: "money" as const, perPeriod: true },
    ],
    formulas: [
      { id: "profit", name: "Profit per month", expr: "(fee - cost) * jobs - rent" },
      { id: "jobsNeeded", name: "Jobs to cover rent", expr: "lib:breakEvenUnits", map: { fixed: "rent", price: "fee", varCost: "cost" } },
    ],
  };
  it("is registered, flagged custom, and exempt from the minimum counts", () => {
    const c = getFamily(CUSTOM_ID) as SectorFamily;
    expect(c.custom).toBe(true);
    expect(validateFamily(c)).toEqual([]);
    expect(searchFamilies("কাস্টম").map((f) => f.id)).toContain(CUSTOM_ID);
    expect(searchFamilies("my own").map((f) => f.id)).toContain(CUSTOM_ID);
  });
  it("a valid user definition builds a family that evaluates by hand: (60-40)*10-100 = 100; 100/(60-40) = 5", () => {
    expect(validateCustomDef(def)).toEqual([]);
    const fam = buildCustomFamily(def) as SectorFamily;
    expect(fam).not.toBeNull();
    expect(fam.id).toBe(CUSTOM_ID);
    expect(validateFamily({ ...fam, inputs: fam.inputs })).toEqual([]);
    expect(evaluateFamily(fam, { fee: 60, cost: 40, jobs: 10, rent: 100 })).toEqual({ profit: 100, jobsNeeded: 5 });
    expect(evaluateFamily(fam, { fee: 60, cost: 40, jobs: 10 })).toEqual({ profit: null, jobsNeeded: null }); // rent unknown
    expect(evaluateFamily(fam, { fee: 40, cost: 40, jobs: 10, rent: 100 }).jobsNeeded).toBeNull(); // no margin
  });
  it("the result kind comes from the units (money here, a plain number for a ratio)", () => {
    const fam = buildCustomFamily({ ...def, formulas: [...def.formulas, { id: "ratio", name: "Fee over cost", expr: "fee / cost" }] }) as SectorFamily;
    const rs = resolvedFormulas(fam);
    expect(rs.find((f) => f.id === "profit")?.result).toBe("money");
    expect(rs.find((f) => f.id === "ratio")?.result).toBe("ratio");
  });
  it("rejects unsafe or wrong definitions", () => {
    const withF = (expr: string, map?: Record<string, string>) => ({ ...def, formulas: [{ id: "f", name: "F", expr, map }] });
    expect(validateCustomDef(withF("fee + jobs")).join()).toMatch(/cannot add money and qty/);
    expect(validateCustomDef(withF("fee * ghost")).join()).toMatch(/not one of your inputs/);
    expect(validateCustomDef(withF("process.exit(1)")).join()).toMatch(/formula "f"/);
    expect(validateCustomDef(withF("fee; cost")).join()).toMatch(/unexpected character/);
    expect(validateCustomDef(withF("lib:nope")).join()).toMatch(/unknown or incomplete/);
    expect(validateCustomDef(withF("lib:breakEvenUnits", { fixed: "rent" })).join()).toMatch(/unknown or incomplete/);
    expect(validateCustomDef({ ...def, inputs: [{ id: "Bad id", label: "x", unit: "money" }] }).join()).toMatch(/not allowed/);
    expect(validateCustomDef({ ...def, inputs: [...def.inputs, { id: "fee", label: "x", unit: "money" }] }).join()).toMatch(/used twice/);
    expect(validateCustomDef({ ...def, inputs: [{ id: "max", label: "x", unit: "money" }] }).join()).toMatch(/not allowed/);
    expect(validateCustomDef({ ...def, inputs: [{ id: "a", label: " ", unit: "money" }] }).join()).toMatch(/needs a label/);
    expect(buildCustomFamily(withF("fee + jobs"))).toBeNull();
  });
});

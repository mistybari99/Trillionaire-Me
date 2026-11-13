// LIVECALC-01: the what-if engine, catalog and prefill. Golden figures are worked by hand in the comments.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compareWhatIf, emiOf, fdrFigures, futureValue, GENERIC_TEMPLATES, getTemplate, parseInput, payoffMonths, runWhatIf, TEMPLATE_IDS } from "../src/core/whatif";
import { ALL_NOTES, CATEGORIES, genericCovered, getVariant, notesFor, unusedTemplates, VARIANTS, variantsOf } from "../src/core/whatifCatalog";
import { PREFILL_FIELDS, PREFILL_ROUTES, prefillFor } from "../src/core/whatifPrefill";
import { fieldById } from "../src/catalog/fields";
import type { FieldValue, TMRecord } from "../src/core/types";

const val = (r: ReturnType<typeof runWhatIf>, id: string): number | null => { const o = r.outputs.find((x) => x.id === id); return o && o.calc.ok ? o.calc.value : null; };
const miss = (r: ReturnType<typeof runWhatIf>, id: string): string[] => r.outputs.find((x) => x.id === id)!.missing;

describe("golden: the owner example", () => {
  it("10 pages a day at 3 minutes a page is 30 minutes", () => { expect(val(runWhatIf("rateTime", { units: "10", unitCost: "3" }), "total")).toBe(30); });
  it("20 days at 10 pages is 200 pages", () => { expect(val(runWhatIf("totalPeriod", { perPeriod: "10", periods: "20" }), "total")).toBe(200); });
  it("what if 2 minutes a page: 15 pages in 30 minutes, 300 pages in 20 days", () => {
    const r = runWhatIf("rateTime", { total: "30", unitCost: "2" }, "units");
    expect(r.target).toBe("units"); expect(val(r, "units")).toBe(15);
    expect(val(runWhatIf("totalPeriod", { perPeriod: "15", periods: "20" }), "total")).toBe(300);
  });
  it("break-even 30000 / (100 - 60) = 750 units, with the shared library formula", () => {
    expect(val(runWhatIf("lib:breakEvenUnits", { fixed: "30000", price: "100", varCost: "60" }), "result")).toBe(750);
  });
  it("required per day: 60000 over 30 days is 2000", () => { expect(val(runWhatIf("requiredPer", { target: "60000", periods: "30" }), "perPeriod")).toBe(2000); });
  it("time to finish rounds up: 250 at 100 a day is 3 days; 200 at 100 is exactly 2", () => {
    expect(val(runWhatIf("timeToFinish", { remaining: "250", rate: "100" }), "periods")).toBe(3);
    expect(val(runWhatIf("timeToFinish", { remaining: "200", rate: "100" }), "periods")).toBe(2);
  });
});

describe("golden: FDR (simple interest, tax on the interest only)", () => {
  // 1,000,000 at 8% a year: interest 80,000. Tax 10% = 8,000, net 72,000 a year, 6,000 a month. Tax 15% = 12,000, net 68,000, 5,666.67 a month.
  it("tax 10%", () => {
    const r = runWhatIf("fdr", { deposit: "1000000", ratePct: "8", tax: "10" });
    expect(val(r, "grossYear")).toBe(80000); expect(val(r, "taxYear")).toBe(8000); expect(val(r, "netYear")).toBe(72000); expect(val(r, "netMonth")).toBe(6000);
  });
  it("tax 15%", () => {
    const r = runWhatIf("fdr", { deposit: "1,000,000", ratePct: "8", tax: "15" });
    expect(val(r, "taxYear")).toBe(12000); expect(val(r, "netYear")).toBe(68000); expect(val(r, "netMonth")).toBeCloseTo(5666.6667, 3);
  });
  it("tax is taken from the interest, never from the deposit", () => {
    const f = fdrFigures(500000, 6, 10, 0, null);
    expect(f.grossYear).toBe(30000); expect(f.taxYear).toBe(3000); expect(f.netYear).toBe(27000);
  });
  it("only an excise amount the person typed is taken off; blank means not counted", () => {
    const r = runWhatIf("fdr", { deposit: "1000000", ratePct: "8", tax: "10", excise: "2000" });
    expect(val(r, "netYear")).toBe(70000); expect(r.flags).toContain("excise_typed");
    expect(runWhatIf("fdr", { deposit: "1000000", ratePct: "8", tax: "10" }).flags).toContain("excise_not_counted");
  });
  it("tenure 12 months and tenure 0", () => {
    expect(val(runWhatIf("fdr", { deposit: "1000000", ratePct: "8", tax: "10", tenureMonths: "12" }), "netTotal")).toBeCloseTo(72000, 6);
    expect(val(runWhatIf("fdr", { deposit: "1000000", ratePct: "8", tax: "10", tenureMonths: "0" }), "netTotal")).toBe(0);
  });
  it("no tax chosen: the interest before tax is known, the net is Unknown (never 0)", () => {
    const r = runWhatIf("fdr", { deposit: "1000000", ratePct: "8" });
    expect(val(r, "grossYear")).toBe(80000); expect(val(r, "netMonth")).toBeNull(); expect(miss(r, "netMonth")).toEqual(["tax"]);
  });
  it("a tax other than the two choices is invalid", () => { expect(runWhatIf("fdr", { deposit: "1000", ratePct: "8", tax: "12" }).invalid).toEqual(["tax"]); });
  it("no bank rate is shipped: nothing known without typed numbers", () => {
    const r = runWhatIf("fdr", {}); for (const o of r.outputs) expect(o.calc.ok).toBe(false);
  });
});

describe("golden: other templates", () => {
  it("compound with and without a monthly add: 1000 at 10% for 2 periods = 1210; add 100 each = 1420; rate 0 = simple; 0 periods = start", () => {
    expect(futureValue(1000, 10, 2)).toBeCloseTo(1210, 6); expect(futureValue(1000, 10, 2, 100)).toBeCloseTo(1420, 6);
    expect(futureValue(1000, 0, 3, 100)).toBe(1300); expect(futureValue(1000, 10, 0, 100)).toBe(1000);
    const r = runWhatIf("compound", { principal: "1000", ratePct: "10", periods: "2", contribution: "100" });
    expect(val(r, "fv")).toBeCloseTo(1420, 6); expect(val(r, "contributed")).toBe(1200); expect(val(r, "gain")).toBeCloseTo(220, 6);
  });
  it("EMI: 12000 for 12 months is 1000 at 0%, 1066.19 at 12% a year", () => {
    expect(emiOf(12000, 0, 12)).toBe(1000); expect(emiOf(12000, 12, 12)).toBeCloseTo(1066.19, 2); expect(emiOf(12000, 12, 0)).toBeNull();
    const r = runWhatIf("emi", { principal: "12000", ratePct: "0", months: "12" }); expect(val(r, "totalPaid")).toBe(12000); expect(val(r, "interestTotal")).toBe(0);
  });
  it("payoff: 4 months at 0%; 11 months at 12% with 100 a month on 1000; never if the payment does not cover the interest", () => {
    expect(payoffMonths(1000, 0, 300)).toBe(4); expect(payoffMonths(1000, 12, 100)).toBe(11); expect(payoffMonths(1000, 12, 10)).toBeNull();
    expect(runWhatIf("payoff", { balance: "1000", ratePct: "12", payment: "10" }).flags).toContain("payment_below_interest");
  });
  it("percent, solve the base and the percent; percent change; budget; compare", () => {
    const p = runWhatIf("percent", { base: "200", pct: "15" }); expect(val(p, "part")).toBe(30); expect(val(p, "rest")).toBe(170);
    expect(val(runWhatIf("percent", { part: "30", base: "200" }, "pct"), "pct")).toBe(15);
    expect(val(runWhatIf("percentChange", { from: "50", to: "75" }), "change")).toBe(50);
    expect(val(runWhatIf("percentChange", { from: "50", change: "-20" }, "to"), "to")).toBe(40);
    const b = runWhatIf("budget", { income: "50000", spend: "42000" }); expect(val(b, "left")).toBe(8000); expect(val(b, "savePct")).toBe(16);
    expect(val(runWhatIf("budget", { income: "1000", spend: "1200" }), "left")).toBe(-200);
    const c = runWhatIf("compare", { a: "100", b: "120" }); expect(val(c, "delta")).toBe(20); expect(val(c, "deltaPct")).toBe(20);
  });
  it("gap closer: no shame, never negative", () => {
    expect(val(runWhatIf("gap", { target: "100", done: "40", periodsLeft: "6" }), "perPeriod")).toBe(10);
    const done = runWhatIf("gap", { target: "100", done: "120", periodsLeft: "6" }); expect(val(done, "perPeriod")).toBe(0); expect(done.flags).toContain("already_there");
  });
  it("zakat-style percent uses only the typed wealth, nisab and rate", () => {
    expect(val(runWhatIf("zakat", { wealth: "100000", nisab: "50000", ratePct: "2.5" }), "amount")).toBe(2500);
    const below = runWhatIf("zakat", { wealth: "10", nisab: "50", ratePct: "2.5" }); expect(val(below, "amount")).toBe(0); expect(below.flags).toContain("below_nisab");
    expect(val(runWhatIf("zakat", { wealth: "100000", nisab: "", ratePct: "2.5" }), "amount")).toBeNull();
  });
  it("library formulas: margin and CAC", () => {
    expect(val(runWhatIf("lib:grossMargin", { revenue: "200", cogs: "150" }), "result")).toBe(25);
    expect(val(runWhatIf("lib:cac", { marketingSpend: "5000", newCustomers: "10" }), "result")).toBe(500);
  });
});

describe("compare mode: now against what-if", () => {
  it("shows the change and the percent change", () => {
    const c = compareWhatIf("rateTime", { units: "10", unitCost: "3" }, { units: "10", unitCost: "2" });
    const row = c.rows[0]!; expect(row.delta).toBe(-10); expect(row.deltaPct).toBeCloseTo(-33.3333, 3);
  });
  it("no change figure when either side is Unknown, no percent when the base is 0", () => {
    expect(compareWhatIf("rateTime", { units: "10" }, { units: "10", unitCost: "2" }).rows[0]!.delta).toBeNull();
    const z = compareWhatIf("totalPeriod", { perPeriod: "0", periods: "5" }, { perPeriod: "3", periods: "5" }).rows[0]!; expect(z.delta).toBe(15); expect(z.deltaPct).toBeNull();
  });
});

describe("Unknown, division by zero, negatives, overflow, digits", () => {
  it("a blank box is Unknown, never 0", () => {
    const r = runWhatIf("rateTime", { units: "10", unitCost: "" }); expect(r.outputs[0]!.calc.ok).toBe(false); expect(miss(r, "total")).toEqual(["unitCost"]);
    const none = runWhatIf("requiredPer", {}); expect(none.outputs[0]!.calc).toMatchObject({ ok: false, reason: "unknown_inputs", missing: 2 });
  });
  it("division by zero is Unknown", () => {
    expect(runWhatIf("requiredPer", { target: "100", periods: "0" }).outputs[0]!.calc.ok).toBe(false);
    expect(runWhatIf("rateTime", { total: "30", unitCost: "0" }, "units").outputs[0]!.calc.ok).toBe(false);
    expect(runWhatIf("percent", { part: "5", base: "0" }, "pct").outputs[0]!.calc.ok).toBe(false);
    expect(runWhatIf("lib:cac", { marketingSpend: "100", newCustomers: "0" }).outputs[0]!.calc.ok).toBe(false);
  });
  it("negative where not allowed, text and numbers above a trillion are invalid, not 0", () => {
    expect(runWhatIf("rateTime", { units: "-5", unitCost: "3" }).invalid).toEqual(["units"]);
    expect(runWhatIf("rateTime", { units: "abc", unitCost: "3" }).invalid).toEqual(["units"]);
    expect(runWhatIf("rateTime", { units: "1e13", unitCost: "3" }).invalid).toEqual(["units"]);
    expect(runWhatIf("rateTime", { units: "9999999999999", unitCost: "3" }).outputs[0]!.calc.ok).toBe(false);
    expect(runWhatIf("budget", { income: "1000", left: "-200" }, "spend").outputs[0]!.calc.ok).toBe(true);
  });
  it("overflow is Unknown", () => {
    expect(runWhatIf("compound", { principal: "1000000000000", ratePct: "1000000000000", periods: "1000000000000" }).outputs[0]!.calc.ok).toBe(false);
    expect(runWhatIf("rateTime", { units: "1000000000000", unitCost: "1000000000000" }).outputs[0]!.calc.ok).toBe(true);
  });
  it("Latin and Bangla digits, commas and a currency sign are accepted", () => {
    expect(parseInput("১০")).toEqual({ state: "value", value: 10 }); expect(parseInput("১,০০০")).toEqual({ state: "value", value: 1000 }); expect(parseInput("৳৫০")).toEqual({ state: "value", value: 50 });
    expect(parseInput("2.5%")).toEqual({ state: "value", value: 2.5 }); expect(parseInput("  ")).toEqual({ state: "unknown" }); expect(parseInput(null)).toEqual({ state: "unknown" });
    expect(val(runWhatIf("rateTime", { units: "১০", unitCost: "৩" }), "total")).toBe(30);
  });
  it("solving for a field that cannot be solved falls back to the default output", () => { expect(runWhatIf("emi", { principal: "1200", ratePct: "0", months: "12" }, "months").target).toBe("emi"); });
});

describe("catalog and links", () => {
  it("all nine generic templates are used, every template is used by some calculator, every calculator points to a real template", () => {
    expect(GENERIC_TEMPLATES.length).toBe(10); expect(genericCovered()).toBe(true); expect(unusedTemplates()).toEqual([]);
    for (const v of VARIANTS) expect(TEMPLATE_IDS, v.id).toContain(v.tpl);
    expect(new Set(VARIANTS.map((v) => v.id)).size).toBe(VARIANTS.length);
  });
  it("every category has its own what-if calculators (Reading, Time, Habits, Goals, Money, Business, Health, Deen, Work blocks, Compare)", () => {
    expect(CATEGORIES.length).toBe(10); for (const c of CATEGORIES) expect(variantsOf(c).length, c).toBeGreaterThan(0);
    for (const id of ["m-fdr", "m-dps", "m-emi", "m-payoff", "m-profit", "m-discount", "m-breakeven", "m-runway", "m-cut", "m-save", "d-dhikr", "d-split", "d-fasting", "d-qaza", "d-zakat", "h-gap", "c-ab", "w-blocks"]) expect(getVariant(id), id).toBeDefined();
  });
  it("every note exists for every variant, at least 8 distinct notes, the estimate note always last", () => {
    expect(ALL_NOTES.length).toBeGreaterThanOrEqual(8);
    for (const v of VARIANTS) { const n = notesFor(v.id); expect(n.length).toBe(3); expect(n[2]).toBe("estimate"); for (const k of n) expect(ALL_NOTES).toContain(k); }
  });
  it("every template output has an id the engine can compute", () => {
    for (const id of TEMPLATE_IDS) { const t = getTemplate(id)!; for (const o of [t.defaultOut, ...t.extras, ...t.solvable]) expect(t.defs[o] ?? t.fields.find((f) => f.id === o), `${id}.${o}`).toBeDefined(); }
  });
});

describe("the core files are pure: no UI, no network, no clock", () => {
  for (const f of ["whatif", "whatifCatalog", "whatifPrefill"]) {
    it(`${f}.ts`, () => {
      const src = readFileSync(`src/core/${f}.ts`, "utf8");
      expect(/Date\.now|new Date\(|fetch\(|XMLHttpRequest|localStorage|document\.|window\.|from "\.\.\/ui|from "\.\.\/adapters/.test(src)).toBe(false);
    });
  }
});

describe("prefill from the screen: only real catalog fields, active mode, Unknown stays Unknown", () => {
  const dv = (v: FieldValue["state"] extends never ? never : unknown): FieldValue => ({ state: "value", value: v as never, label: "DEMO" });
  const rec = (id: string, entity: string, values: Record<string, unknown>, ns: "demo" | "real" = "demo"): TMRecord => ({ id, entity, ns, ownerId: ns === "real" ? "owner" : "demo-user", schemaVersion: 5, createdAt: "2026-11-01T00:00:00.000Z", values: Object.fromEntries(Object.entries(values).map(([k, x]) => [k, dv(x)])) });
  const ctx = { ns: "demo" as const, today: "2026-11-13", healthConsent: true };
  it("every field the adapter reads is a real catalog field", () => { for (const f of PREFILL_FIELDS) expect(fieldById(f), f).toBeDefined(); });
  it("every prefill variant exists and is offered on at least one real route", () => {
    for (const id of Object.keys(PREFILL_ROUTES)) expect(getVariant(id), id).toBeDefined();
  });
  it("habits: minutes and days a week; a missing number is left out, not 0", () => {
    const s = prefillFor("/habits", [rec("h1", "habit", { "habit.minutes": 20, "habit.days_per_week": 5 })], ctx);
    expect(s[0]).toMatchObject({ variant: "h-time", values: { unitCost: 20, units: 5 } });
    expect(prefillFor("/habits", [rec("h1", "habit", { "habit.minutes": 20 })], ctx)[0]!.values).toEqual({ unitCost: 20 });
    expect(prefillFor("/habits", [rec("h1", "habit", { "habit.title": "x" })], ctx)).toEqual([]);
  });
  it("only the records of the active mode are used", () => {
    expect(prefillFor("/habits", [rec("h1", "habit", { "habit.minutes": 20 }, "real")], ctx)).toEqual([]);
    expect(prefillFor("/habits", [rec("h1", "habit", { "habit.minutes": 20 }, "real")], { ...ctx, ns: "real" })).toHaveLength(1);
  });
  it("tasks: open task minutes add up; done tasks are left out", () => {
    const s = prefillFor("/today", [rec("t1", "task", { "task.minutes": 30 }), rec("t2", "task", { "task.minutes": 45 }), rec("t3", "task", { "task.minutes": 99, "task.done_on": "2026-11-12" })], ctx);
    expect(s[0]).toMatchObject({ variant: "t-finish", values: { remaining: 75 } });
  });
  it("money: monthly personal income and spend; unknown stays out", () => {
    const fi = (id: string, kind: string, amount: unknown) => rec(id, "finance_item", { "finance.kind": kind, "finance.scope": "personal", "finance.label": id, "finance.amount": amount, "finance.period": "monthly" });
    const s = prefillFor("/diary/money", [fi("a", "income", 50000), fi("b", "expense", 30000)], ctx);
    expect(s[0]).toMatchObject({ variant: "m-budget", values: { income: 50000, spend: 30000 } });
    const u = prefillFor("/diary/money", [fi("a", "income", 50000), { ...fi("b", "expense", 1), values: { ...fi("b", "expense", 1).values, "finance.amount": { state: "unknown" } } }], ctx);
    expect(u[0]!.values).toEqual({ income: 50000 });
  });
  it("ventures, goals, deen, health and work blocks", () => {
    expect(prefillFor("/diary/ventures", [rec("v1", "venture", { "venture.sector_inputs": JSON.stringify({ price: 100, varCost: 60, fixed: 30000, other: "x" }) })], ctx)[0]).toMatchObject({ variant: "m-breakeven", values: { fixed: 30000, price: 100, varCost: 60 } });
    expect(prefillFor("/journey/goals", [rec("n1", "north_star", { "north_star.target": 60, "north_star.current": 20 })], ctx)[0]).toMatchObject({ variant: "g-gap", values: { target: 60, done: 20 } });
    expect(prefillFor("/deen/plans", [rec("zakat-current", "zakat_snapshot", { "zakat_snapshot.wealth": 100000, "zakat_snapshot.nisab": 50000 })], ctx)[0]).toMatchObject({ variant: "d-zakat", values: { wealth: 100000, nisab: 50000 } });
    expect(prefillFor("/diary/plan", [rec("w1", "work_block", { "work_block.date": "2026-11-13", "work_block.from": "09:00", "work_block.to": "10:30" })], ctx)[0]).toMatchObject({ variant: "w-blocks", values: { unitCost: 90 } });
    const hrec = rec("he1", "health_entry", { "health_entry.date": "2026-11-12", "health_entry.kind": "walking", "health_entry.value": 4000 });
    expect(prefillFor("/diary/health", [hrec], ctx)[0]).toMatchObject({ variant: "hl-steps", values: { perPeriod: 4000 } });
    expect(prefillFor("/diary/health", [hrec], { ...ctx, healthConsent: false })).toEqual([]);
  });
  it("every suggestion only fills fields that exist in its calculator", () => {
    const all: TMRecord[] = [rec("h1", "habit", { "habit.minutes": 20, "habit.days_per_week": 5 }), rec("t1", "task", { "task.minutes": 30 }), rec("n1", "north_star", { "north_star.target": 60, "north_star.current": 20 }),
      rec("v1", "venture", { "venture.sector_inputs": JSON.stringify({ price: 1, varCost: 1, fixed: 1 }) }), rec("zakat-current", "zakat_snapshot", { "zakat_snapshot.wealth": 1, "zakat_snapshot.nisab": 1, "zakat_snapshot.rate": 2.5 }),
      rec("he1", "health_entry", { "health_entry.date": "2026-11-12", "health_entry.kind": "water", "health_entry.value": 6 }), rec("w1", "work_block", { "work_block.date": "2026-11-13", "work_block.from": "09:00", "work_block.to": "10:00" })];
    for (const path of ["/habits", "/today", "/diary/plan", "/journey/goals", "/diary/money", "/diary/ventures", "/diary/health", "/deen/plans"]) for (const s of prefillFor(path, all, ctx)) {
      const tpl = getTemplate(getVariant(s.variant)!.tpl)!; for (const k of Object.keys(s.values)) expect(tpl.fields.map((f) => f.id), `${s.variant}.${k}`).toContain(k);
      for (const f of s.fields) expect(fieldById(f), f).toBeDefined();
    }
  });
});

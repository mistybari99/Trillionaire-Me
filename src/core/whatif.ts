// Live Calculator / What-if (LIVECALC-01). Pure: no UI, no network, no clock. Every number comes from the person.
// A template is a small set of variables; any ONE can be the unknown ("solve for"). A blank box is Unknown, never 0.
// Reuses the safe expression engine (sectors/engine.ts), the shared formula library (LIB_FORMULAS), the finance Calc contract and zakatFigure.
import { evaluate, parse, type Node } from "./sectors/engine";
import { LIB_FORMULAS, getLibFormula } from "./sectors/formulas";
import { CALC_LABEL, type Calc } from "./finance";
import { zakatFigure } from "./deenPlans";
import type { Values } from "./sectors/types";

export const MAX_INPUT = 1e12;
export type Raw = Record<string, string | number | null | undefined>;

// ---------- input parsing ----------
export type Parsed = { state: "unknown" } | { state: "value"; value: number } | { state: "invalid" };
/** Latin and Bangla digits, commas and a currency sign are accepted. Blank = Unknown. Not a number, too large, or negative where not allowed = invalid. */
export function parseInput(raw: string | number | null | undefined, allowNegative = false): Parsed {
  if (raw === null || raw === undefined) return { state: "unknown" };
  if (typeof raw === "number") return Number.isFinite(raw) && Math.abs(raw) <= MAX_INPUT && (allowNegative || raw >= 0) ? { state: "value", value: raw } : { state: "invalid" };
  const s = raw.trim().replace(/[,৳$\s]/g, "").replace(/%$/, "").replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6));
  if (s === "") return { state: "unknown" };
  if (!/^-?\d*\.?\d+$|^-?\d+\.$/.test(s)) return { state: "invalid" };
  const n = Number(s);
  if (!Number.isFinite(n) || Math.abs(n) > MAX_INPUT || (!allowNegative && n < 0)) return { state: "invalid" };
  return { state: "value", value: n };
}

// ---------- templates ----------
export interface WField { id: string; neg?: boolean; optional?: boolean; choices?: readonly number[] }
interface Def { needs: string[]; fn: (v: Values) => number | null }
export interface WTemplate {
  id: string;
  fields: WField[];
  /** variable that is computed when nothing else is chosen */
  defaultOut: string;
  /** fields that can be the unknown (solve for) */
  solvable: string[];
  /** extra outputs shown beside the target */
  extras: string[];
  defs: Record<string, Def>;
  flags?: (v: Values, out: Record<string, number | null>) => string[];
}

const cache = new Map<string, Node>();
const ex = (needs: string[], expr: string, ceil = false): Def => {
  let n = cache.get(expr); if (!n) { n = parse(expr); cache.set(expr, n); }
  const node = n;
  return { needs, fn: (v) => { const r = evaluate(node, v); return r === null ? null : ceil ? Math.ceil(r - 1e-9) : r; } };
};
const finite = (n: number): number | null => (Number.isFinite(n) ? n : null);
const nv = (v: Values, k: string): number | null => (typeof v[k] === "number" ? (v[k] as number) : null);

const triple = (id: string, a: string, b: string, c: string, defaultOut: string, ceilVar?: string): WTemplate => ({
  id, fields: [{ id: a }, { id: b }, { id: c }], defaultOut, solvable: [a, b, c], extras: [],
  defs: { [c]: ex([a, b], `${a} * ${b}`, ceilVar === c), [a]: ex([c, b], `${c} / ${b}`, ceilVar === a), [b]: ex([c, a], `${c} / ${a}`, ceilVar === b) },
});

const pow = (base: number, n: number): number | null => finite(Math.pow(base, n));
/** Future value of a start amount plus an optional amount added each period, at a rate per period (percent). Zero periods = the start amount. */
export function futureValue(principal: number, ratePct: number, periods: number, contribution = 0): number | null {
  if (periods === 0) return principal;
  const r = ratePct / 100;
  if (r === 0) return finite(principal + contribution * periods);
  const g = pow(1 + r, periods); if (g === null) return null;
  return finite(principal * g + contribution * ((g - 1) / r));
}
/** Monthly instalment for a loan: rate is the yearly percent the person types. Zero rate = even split. Zero months = Unknown. */
export function emiOf(principal: number, yearlyPct: number, months: number): number | null {
  if (months <= 0) return null;
  const r = yearlyPct / 1200;
  if (r === 0) return finite(principal / months);
  const g = pow(1 + r, months); if (g === null) return null;
  return finite(principal * r * g / (g - 1));
}
/** Months to clear a loan with a fixed monthly payment, rounded up. Unknown when the payment does not even cover the monthly interest. */
export function payoffMonths(balance: number, yearlyPct: number, payment: number): number | null {
  if (payment <= 0) return null;
  const r = yearlyPct / 1200;
  if (r === 0) return Math.ceil(balance / payment - 1e-9);
  if (payment <= balance * r) return null;
  return finite(Math.ceil(-Math.log(1 - (balance * r) / payment) / Math.log(1 + r) - 1e-9));
}
/** Simple interest on a deposit. Tax is charged on the interest only. Excise duty is NOT calculated here; only an amount the person typed is taken off. */
export function fdrFigures(deposit: number, ratePct: number, taxPct: number, excise: number, tenureMonths: number | null) {
  const grossYear = deposit * ratePct / 100;
  const taxYear = grossYear * taxPct / 100;
  const netYear = grossYear - taxYear - excise;
  return { grossYear, taxYear, netYear, netMonth: netYear / 12, netTotal: tenureMonths === null ? null : netYear / 12 * tenureMonths };
}

const T: WTemplate[] = [
  triple("rateTime", "units", "unitCost", "total", "total"),
  triple("totalPeriod", "perPeriod", "periods", "total", "total"),
  { ...triple("requiredPer", "perPeriod", "periods", "target", "perPeriod"), fields: [{ id: "target" }, { id: "periods" }, { id: "perPeriod" }] },
  {
    id: "timeToFinish", fields: [{ id: "remaining" }, { id: "rate" }, { id: "periods" }], defaultOut: "periods", solvable: ["periods", "rate", "remaining"], extras: [],
    defs: { periods: ex(["remaining", "rate"], "remaining / rate", true), rate: ex(["remaining", "periods"], "remaining / periods"), remaining: ex(["rate", "periods"], "rate * periods") },
  },
  {
    id: "percent", fields: [{ id: "base" }, { id: "pct" }, { id: "part" }], defaultOut: "part", solvable: ["part", "pct", "base"], extras: ["rest"],
    defs: { part: ex(["base", "pct"], "base * pct / 100"), pct: ex(["part", "base"], "part / base * 100"), base: ex(["part", "pct"], "part / pct * 100"), rest: ex(["base", "part"], "base - part") },
  },
  {
    id: "percentChange", fields: [{ id: "from" }, { id: "to" }, { id: "change", neg: true }], defaultOut: "change", solvable: ["change", "to", "from"], extras: [],
    defs: { change: ex(["from", "to"], "(to - from) / from * 100"), to: ex(["from", "change"], "from * (1 + change / 100)"), from: ex(["to", "change"], "to / (1 + change / 100)") },
  },
  {
    id: "compound", fields: [{ id: "principal" }, { id: "ratePct" }, { id: "periods" }, { id: "contribution", optional: true }], defaultOut: "fv", solvable: [], extras: ["contributed", "gain"],
    defs: {
      fv: { needs: ["principal", "ratePct", "periods"], fn: (v) => futureValue(v.principal as number, v.ratePct as number, v.periods as number, typeof v.contribution === "number" ? v.contribution : 0) },
      contributed: { needs: ["principal", "periods"], fn: (v) => finite((v.principal as number) + (typeof v.contribution === "number" ? v.contribution : 0) * (v.periods as number)) },
      gain: { needs: ["fv", "principal", "periods"], fn: (v) => finite((v.fv as number) - (v.principal as number) - (typeof v.contribution === "number" ? v.contribution : 0) * (v.periods as number)) },
    },
  },
  {
    id: "compare", fields: [{ id: "a" }, { id: "b" }, { id: "delta", neg: true }], defaultOut: "delta", solvable: ["delta", "b", "a"], extras: ["deltaPct"],
    defs: { delta: ex(["a", "b"], "b - a"), b: ex(["a", "delta"], "a + delta"), a: ex(["b", "delta"], "b - delta"), deltaPct: ex(["a", "delta"], "delta / a * 100") },
  },
  {
    id: "budget", fields: [{ id: "income" }, { id: "spend" }, { id: "left", neg: true }], defaultOut: "left", solvable: ["left", "spend", "income"], extras: ["savePct"],
    defs: { left: ex(["income", "spend"], "income - spend"), spend: ex(["income", "left"], "income - left"), income: ex(["spend", "left"], "spend + left"), savePct: ex(["income", "left"], "left / income * 100") },
  },
  {
    id: "emi", fields: [{ id: "principal" }, { id: "ratePct" }, { id: "months" }], defaultOut: "emi", solvable: [], extras: ["totalPaid", "interestTotal"],
    defs: {
      emi: { needs: ["principal", "ratePct", "months"], fn: (v) => emiOf(v.principal as number, v.ratePct as number, v.months as number) },
      totalPaid: { needs: ["emi", "months"], fn: (v) => finite((v.emi as number) * (v.months as number)) },
      interestTotal: { needs: ["emi", "months", "principal"], fn: (v) => finite((v.emi as number) * (v.months as number) - (v.principal as number)) },
    },
  },
  {
    id: "payoff", fields: [{ id: "balance" }, { id: "ratePct" }, { id: "payment" }], defaultOut: "months", solvable: [], extras: [],
    defs: { months: { needs: ["balance", "ratePct", "payment"], fn: (v) => payoffMonths(v.balance as number, v.ratePct as number, v.payment as number) } },
    flags: (v, out) => (nv(v, "balance") !== null && nv(v, "ratePct") !== null && (nv(v, "payment") ?? 0) > 0 && out.months === null ? ["payment_below_interest"] : []),
  },
  {
    id: "gap", fields: [{ id: "target" }, { id: "done" }, { id: "periodsLeft" }, { id: "perPeriod" }], defaultOut: "perPeriod", solvable: ["perPeriod", "periodsLeft"], extras: ["remaining"],
    defs: { perPeriod: ex(["target", "done", "periodsLeft"], "max(target - done, 0) / periodsLeft"), periodsLeft: ex(["target", "done", "perPeriod"], "max(target - done, 0) / perPeriod", true), remaining: ex(["target", "done"], "max(target - done, 0)") },
    flags: (v) => (nv(v, "target") !== null && nv(v, "done") !== null && (nv(v, "done") as number) >= (nv(v, "target") as number) ? ["already_there"] : []),
  },
  {
    id: "zakat", fields: [{ id: "wealth" }, { id: "nisab" }, { id: "ratePct" }], defaultOut: "amount", solvable: [], extras: [],
    defs: { amount: { needs: ["wealth", "nisab", "ratePct"], fn: (v) => { const z = zakatFigure(v.wealth as number, v.nisab as number, v.ratePct as number); return z.state === "figure" ? z.amount : z.state === "below" ? 0 : null; } } },
    flags: (v) => (nv(v, "wealth") !== null && nv(v, "nisab") !== null && (nv(v, "wealth") as number) < (nv(v, "nisab") as number) ? ["below_nisab"] : []),
  },
  {
    id: "fdr", fields: [{ id: "deposit" }, { id: "ratePct" }, { id: "tax", choices: [10, 15] }, { id: "excise", optional: true }, { id: "tenureMonths", optional: true }],
    defaultOut: "netMonth", solvable: [], extras: ["netYear", "grossYear", "taxYear", "netTotal"],
    defs: {
      netMonth: { needs: ["deposit", "ratePct", "tax"], fn: (v) => finite(fdrFigures(v.deposit as number, v.ratePct as number, v.tax as number, typeof v.excise === "number" ? v.excise : 0, null).netMonth) },
      netYear: { needs: ["deposit", "ratePct", "tax"], fn: (v) => finite(fdrFigures(v.deposit as number, v.ratePct as number, v.tax as number, typeof v.excise === "number" ? v.excise : 0, null).netYear) },
      grossYear: { needs: ["deposit", "ratePct"], fn: (v) => finite((v.deposit as number) * (v.ratePct as number) / 100) },
      taxYear: { needs: ["deposit", "ratePct", "tax"], fn: (v) => finite((v.deposit as number) * (v.ratePct as number) / 100 * (v.tax as number) / 100) },
      netTotal: { needs: ["deposit", "ratePct", "tax", "tenureMonths"], fn: (v) => finite(fdrFigures(v.deposit as number, v.ratePct as number, v.tax as number, typeof v.excise === "number" ? v.excise : 0, v.tenureMonths as number).netTotal as number) },
    },
    flags: (v) => (typeof v.excise === "number" ? ["excise_typed"] : ["excise_not_counted"]),
  },
];
// Shared library formulas (break-even, margin, CAC, payback, capacity ...): template id "lib:<formulaId>".
/** The library formulas offered as calculators (break-even, margin, CAC, payback, capacity). */
export const LIB_OFFERED: readonly string[] = ["grossMargin", "breakEvenUnits", "breakEvenRevenue", "contributionMarginPct", "cac", "payback", "capacityUtilisation"];
for (const f of LIB_FORMULAS.filter((x) => LIB_OFFERED.includes(x.id))) {
  const ids = f.params.map((p) => p.id);
  T.push({ id: `lib:${f.id}`, fields: ids.map((id) => ({ id })), defaultOut: "result", solvable: [], extras: [], defs: { result: ex(ids, f.expr) } });
}
const BY_ID = new Map(T.map((x) => [x.id, x]));
export const TEMPLATE_IDS: readonly string[] = T.map((x) => x.id);
/** The nine generic templates (rate x time, total per period, required per period, time to finish, percent and percent change, compound + recurring, compare A/B, budget, EMI). */
export const GENERIC_TEMPLATES: readonly string[] = ["rateTime", "totalPeriod", "requiredPer", "timeToFinish", "percent", "percentChange", "compound", "compare", "budget", "emi"];
export const getTemplate = (id: string): WTemplate | undefined => BY_ID.get(id);
export const libName = (id: string) => getLibFormula(id.replace(/^lib:/, ""));

// ---------- running ----------
export interface WhatIfOut { id: string; calc: Calc; /** field ids still needed when Unknown */ missing: string[] }
export interface WhatIfResult { template: string; target: string; invalid: string[]; outputs: WhatIfOut[]; flags: string[] }
export const outputIds = (t: WTemplate, target = t.defaultOut): string[] => [target, ...t.extras.filter((x) => x !== target)];
const unknownCalc = (missing: number): Calc => ({ ok: false, reason: "unknown_inputs", missing });
const okCalc = (value: number): Calc => ({ ok: true, value, label: CALC_LABEL });

export function runWhatIf(templateId: string, raw: Raw, solveFor?: string | null): WhatIfResult {
  const t = BY_ID.get(templateId); if (!t) throw new Error(`unknown what-if template ${templateId}`);
  const target = solveFor && t.solvable.includes(solveFor) ? solveFor : t.defaultOut;
  const vals: Values = {}; const invalid: string[] = [];
  for (const f of t.fields) {
    if (f.id === target) continue;
    const p = parseInput(raw[f.id], !!f.neg);
    if (p.state === "invalid" || (p.state === "value" && f.choices && !f.choices.includes(p.value))) { invalid.push(f.id); continue; }
    if (p.state === "value") vals[f.id] = p.value;
  }
  const out: Record<string, number | null> = {}; const outputs: WhatIfOut[] = [];
  for (const id of outputIds(t, target)) {
    const d = t.defs[id]; if (!d) continue;
    const missing = d.needs.filter((n) => typeof vals[n] !== "number");
    const value = missing.length ? null : d.fn(vals);
    out[id] = value;
    if (value !== null) vals[id] = value;
    outputs.push({ id, calc: value === null ? unknownCalc(missing.length) : okCalc(value), missing });
  }
  return { template: t.id, target, invalid, outputs, flags: t.flags ? t.flags(vals, out) : [] };
}

export interface CompareRow { id: string; now: Calc; what: Calc; delta: number | null; deltaPct: number | null }
/** Now (typed numbers) against a what-if (changed numbers). A difference exists only when both sides are known; a percent only when the base is not zero. */
export function compareWhatIf(templateId: string, now: Raw, what: Raw, solveFor?: string | null): { now: WhatIfResult; what: WhatIfResult; rows: CompareRow[] } {
  const a = runWhatIf(templateId, now, solveFor); const b = runWhatIf(templateId, what, solveFor);
  const rows = a.outputs.map((o, i): CompareRow => {
    const w = (b.outputs[i] as WhatIfOut).calc;
    const both = o.calc.ok && w.ok;
    const delta = both ? (w as { value: number }).value - (o.calc as { value: number }).value : null;
    const base = o.calc.ok ? o.calc.value : null;
    return { id: o.id, now: o.calc, what: w, delta, deltaPct: delta !== null && base !== null && base !== 0 ? delta / Math.abs(base) * 100 : null };
  });
  return { now: a, what: b, rows };
}

/** Plain text of a result, for "Save as note". Only the typed numbers and the figures that follow from them. */
export function resultLines(r: WhatIfResult, round = 2): string[] {
  const rd = (n: number) => String(Math.round(n * 10 ** round) / 10 ** round);
  return r.outputs.map((o) => (o.calc.ok ? `${o.id}: ${rd(o.calc.value)} (${o.calc.label})` : `${o.id}: ?`));
}

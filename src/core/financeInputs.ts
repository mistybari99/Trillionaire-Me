// Saved finance records -> calculator inputs.
// M07 (TM-REQ-150): money lines can be monthly, yearly or one-off, and in another currency with a rate the USER typed (no network, no rate list).
//  - monthly lines count as they are; a yearly line counts as one twelfth a month (labelled ESTIMATE); a one-off line is not in a monthly figure;
//    a one-off line with a date inside the next 90 days is added to the 90-day cash flow, an undated one is only counted.
//  - an amount in another currency is multiplied by the user's rate to BDT; with no valid rate the amount is Unknown, never 0 and never guessed.
import { CALC_LABEL, type FinItem } from "./finance";
import type { FieldValue, TMRecord } from "./types";

const val = (v: FieldValue | undefined) => (v && v.state === "value" ? v.value : null);
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const round2 = (n: number) => Math.round(n * 100) / 100;

export const BASE_CURRENCY = "BDT";
/** Three letters A-Z. BDT itself is the base and is stored as no currency. */
export const parseCurrency = (raw: string): { state: "base" } | { state: "code"; code: string } | null => {
  const s = raw.trim().toUpperCase();
  if (s === "" || s === BASE_CURRENCY) return { state: "base" };
  return /^[A-Z]{3}$/.test(s) ? { state: "code", code: s } : null;
};
/** A rate is BDT per 1 unit of the other currency: a number above 0. Bangla digits and commas are accepted. Blank = not typed yet. */
export function parseRate(raw: string): { state: "unknown" } | { state: "value"; value: number } | null {
  const s = raw.trim().replace(/,/g, "").replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6));
  if (s === "") return { state: "unknown" };
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? { state: "value", value: n } : null;
}

export interface Foreign { code: string; rate: number | null; rateOn: string | null }
/** The currency of a line when it is not BDT. */
export function foreignOf(r: TMRecord): Foreign | null {
  const c = val(r.values["finance.currency"]);
  if (typeof c !== "string" || !/^[A-Z]{3}$/.test(c) || c === BASE_CURRENCY) return null;
  const rate = val(r.values["finance.fx_rate"]); const on = val(r.values["finance.fx_on"]);
  return { code: c, rate: typeof rate === "number" && Number.isFinite(rate) && rate > 0 ? rate : null, rateOn: typeof on === "string" ? on : null };
}

/** The amount of a line in BDT. Another currency is converted with the user's own rate; no valid rate means Unknown. */
export function bdtAmount(r: TMRecord): FieldValue {
  const a = r.values["finance.amount"] ?? { state: "unknown" as const };
  const f = foreignOf(r);
  if (!f) return a;
  if (a.state !== "value" || typeof a.value !== "number" || !Number.isFinite(a.value) || f.rate === null) return a.state === "value" ? { state: "unknown" } : a;
  return { state: "value", value: round2(a.value * f.rate), label: CALC_LABEL };
}

export interface OneOff { kind: FinItem["kind"]; scope: FinItem["scope"]; amount: FieldValue; on: string | null }
export interface FinView {
  items: FinItem[];
  /** one-off income / expense lines: not in the monthly figures */
  notMonthly: number; yearly: number;
  oneOff: OneOff[];
  /** money lines in another currency, and how many of them have no usable rate (their amount is Unknown) */
  foreign: number; foreignNoRate: number;
  labels: Map<string, string>;
}

export function financeFrom(records: TMRecord[]): FinView {
  const items: FinItem[] = []; const labels = new Map<string, string>(); const oneOff: OneOff[] = [];
  let notMonthly = 0, yearly = 0, foreign = 0, foreignNoRate = 0;
  for (const r of records.filter((x) => x.entity === "finance_item").sort((a, b) => a.id.localeCompare(b.id))) {
    const kind = val(r.values["finance.kind"]), scope = val(r.values["finance.scope"]), period = val(r.values["finance.period"]);
    if (!["asset", "liability", "income", "expense"].includes(String(kind)) || !["personal", "business"].includes(String(scope))) continue;
    labels.set(r.id, String(val(r.values["finance.label"]) ?? ""));
    const f = foreignOf(r); if (f) { foreign++; if (f.rate === null) foreignNoRate++; }
    const amount = bdtAmount(r);
    const flow = kind === "income" || kind === "expense";
    if (flow && period === "yearly") {
      yearly++;
      const a = amount.state === "value" && typeof amount.value === "number" ? ({ state: "value", value: round2(amount.value / 12), label: CALC_LABEL } as FieldValue) : amount.state === "value" ? ({ state: "unknown" } as FieldValue) : amount;
      items.push({ kind: kind as FinItem["kind"], scope: scope as FinItem["scope"], amount: a }); continue;
    }
    if (flow && period !== "monthly") {
      notMonthly++; const on = val(r.values["finance.on"]);
      oneOff.push({ kind: kind as FinItem["kind"], scope: scope as FinItem["scope"], amount, on: typeof on === "string" && DAY.test(on) ? on : null });
      continue;
    }
    items.push({ kind: kind as FinItem["kind"], scope: scope as FinItem["scope"], amount });
  }
  return { items, notMonthly, yearly, oneOff, foreign, foreignNoRate, labels };
}

const addDays = (day: string, n: number): string => { const [y, m, d] = day.split("-").map(Number); const x = new Date(y!, m! - 1, d! + n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };

export type Cash90 =
  | { state: "value"; value: number; oneOffIn: number; undated: number }
  | { state: "unknown"; missing: number; undated: number };
/** 90-day cash flow of one scope: three months of the monthly figures, plus one-off lines dated from today to day 89. Undated one-offs are counted, not added. */
export function cashFlow90(fv: FinView, scope: FinItem["scope"], today: string): Cash90 {
  let inc = 0, exp = 0, hasInc = false, hasExp = false, missing = 0;
  for (const i of fv.items) {
    if (i.scope !== scope || (i.kind !== "income" && i.kind !== "expense")) continue;
    const a = i.amount.state === "value" && typeof i.amount.value === "number" ? i.amount.value : null;
    if (i.kind === "income") hasInc = true; else hasExp = true;
    if (a === null) missing++; else if (i.kind === "income") inc += a; else exp += a;
  }
  const end = addDays(today, 89); let undated = 0, oneIn = 0;
  for (const o of fv.oneOff) {
    if (o.scope !== scope) continue;
    if (o.on === null) { undated++; continue; }
    if (o.on < today || o.on > end) continue;
    const a = o.amount.state === "value" && typeof o.amount.value === "number" ? o.amount.value : null;
    if (o.kind === "income") hasInc = true; else hasExp = true;
    if (a === null) { missing++; continue; }
    if (o.kind === "income") inc += a; else exp += a;
    oneIn++;
  }
  if (!hasInc && !hasExp) return { state: "unknown", missing: 0, undated };
  if (missing) return { state: "unknown", missing, undated };
  // monthly part is three months; the one-off part is already inside inc/exp once, so add it back separately
  const monthlyInc = fv.items.filter((i) => i.scope === scope && i.kind === "income").reduce((s, i) => s + (i.amount.state === "value" ? Number(i.amount.value) : 0), 0);
  const monthlyExp = fv.items.filter((i) => i.scope === scope && i.kind === "expense").reduce((s, i) => s + (i.amount.state === "value" ? Number(i.amount.value) : 0), 0);
  const oneOffNet = (inc - monthlyInc) - (exp - monthlyExp);
  return { state: "value", value: round2((monthlyInc - monthlyExp) * 3 + oneOffNet), oneOffIn: oneIn, undated };
}

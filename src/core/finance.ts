// Finance basics (TM-REQ-022/023/028). Unknown is never 0; personal and business never mixed.
import type { FieldValue } from "./types";

export interface FinItem { kind: "asset" | "liability" | "income" | "expense"; scope: "personal" | "business"; amount: FieldValue }
export type Calc = { ok: true; value: number } | { ok: false; reason: "unknown_inputs"; missing: number };

const num = (v: FieldValue) => (v.state === "value" && typeof v.value === "number" && Number.isFinite(v.value) ? v.value : null);

function total(items: FinItem[], kind: FinItem["kind"], scope: FinItem["scope"]): Calc {
  let sum = 0, missing = 0;
  for (const i of items) if (i.kind === kind && i.scope === scope) { const n = num(i.amount); if (n === null) missing++; else sum += n; }
  return missing ? { ok: false, reason: "unknown_inputs", missing } : { ok: true, value: sum };
}
const diff = (a: Calc, b: Calc): Calc => (a.ok && b.ok ? { ok: true, value: a.value - b.value } : { ok: false, reason: "unknown_inputs", missing: (a.ok ? 0 : a.missing) + (b.ok ? 0 : b.missing) });

export const netWorth = (items: FinItem[], scope: FinItem["scope"]) => diff(total(items, "asset", scope), total(items, "liability", scope));
/** Monthly figures only: caller must pass monthly amounts (one-off and yearly items are not silently converted). */
export const monthlyCashFlow = (items: FinItem[], scope: FinItem["scope"]) => diff(total(items, "income", scope), total(items, "expense", scope));

/** 90-day cash flow (TM-REQ-023) = three months of monthly flows. One-off and yearly items have no known date here,
 *  so they are counted separately (notMonthly) and never converted. Unknown amounts stay unknown. */
export const cashFlow90Days = (items: FinItem[], scope: FinItem["scope"]): Calc => {
  const m = monthlyCashFlow(items, scope);
  return m.ok ? { ok: true, value: m.value * 3 } : m;
};

/** Months of cash left at the current burn. null when burn is not positive (nothing to run out of) — never "infinite". */
export function runwayMonths(cash: FieldValue, monthlyFlow: Calc): Calc | { ok: true; value: null } {
  const c = num(cash);
  if (c === null || !monthlyFlow.ok) return { ok: false, reason: "unknown_inputs", missing: 1 };
  if (monthlyFlow.value >= 0) return { ok: true, value: null };
  return { ok: true, value: c / -monthlyFlow.value };
}

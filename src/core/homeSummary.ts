// Home summary (pure): net worth, monthly income and monthly expenses from the user's own Money entries.
// Nothing entered = "none" (shown as Unknown). An entry with no amount = "unknown" with the number missing. Never 0, never invented.
import { monthlyExpenses, monthlyIncome, netWorth, type Calc, type FinItem } from "./finance";
import type { Label } from "./types";

export type Metric = { state: "value"; value: number; label: Label } | { state: "unknown"; missing: number } | { state: "none" };
export type Scope = FinItem["scope"];
export interface ScopeSummary { scope: Scope; netWorth: Metric; income: Metric; expenses: Metric }
export interface MoneySummary { scopes: ScopeSummary[] }

const SCOPES: readonly Scope[] = ["personal", "business"];
const has = (items: FinItem[], scope: Scope, kinds: FinItem["kind"][]) => items.some((i) => i.scope === scope && kinds.includes(i.kind));
const metric = (c: Calc): Metric => (c.ok ? { state: "value", value: c.value, label: c.label } : { state: "unknown", missing: c.missing });

export function scopeSummary(items: FinItem[], scope: Scope): ScopeSummary {
  return {
    scope,
    netWorth: has(items, scope, ["asset", "liability"]) ? metric(netWorth(items, scope)) : { state: "none" },
    income: has(items, scope, ["income"]) ? metric(monthlyIncome(items, scope)) : { state: "none" },
    expenses: has(items, scope, ["expense"]) ? metric(monthlyExpenses(items, scope)) : { state: "none" },
  };
}

/** Personal is always listed (so an empty start shows Unknown). Business is listed only when the user entered something for it. */
export function moneySummary(items: FinItem[]): MoneySummary {
  return { scopes: SCOPES.filter((sc) => sc === "personal" || items.some((i) => i.scope === sc)).map((sc) => scopeSummary(items, sc)) };
}

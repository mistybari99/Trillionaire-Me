// M09 venture / asset list rows (demo namespace). Pure.
// Ownership unknown stays unknown: no equity value is computed from it, and it is never taken as 0.
import { monthlyCashFlow, monthlyExpenses, monthlyIncome, type Calc } from "./finance";
import { financeFrom } from "./financeInputs";
import type { FieldValue, TMRecord } from "./types";

export const STAGES = ["idea", "testing", "running", "paused", "closed"] as const;
export type VentureStage = (typeof STAGES)[number];
export interface VentureRow { id: string; name: string; stage: VentureStage | null; ownership: number | null; valuation: number | null }
export type OwnershipInput = { state: "value"; value: number } | { state: "unknown" } | null; // null = not a valid entry

const str = (v: FieldValue | undefined): string | null => (v?.state === "value" && typeof v.value === "string" && v.value.trim() ? v.value.trim() : null);

export function ventureRows(recs: TMRecord[]): VentureRow[] {
  return recs.filter((r) => r.entity === "venture").map((r): VentureRow => {
    const st = str(r.values["venture.stage"]);
    const own = r.values["venture.ownership_pct"];
    return { id: r.id, name: str(r.values["venture.name"]) ?? "", stage: st && (STAGES as readonly string[]).includes(st) ? (st as VentureStage) : null,
      ownership: own?.state === "value" && typeof own.value === "number" ? own.value : null,
      valuation: (() => { const v = r.values["venture.valuation"]; return v?.state === "value" && typeof v.value === "number" && Number.isFinite(v.value) ? v.value : null; })() };
  }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Blank = unknown. A number must be 0–100. Bangla digits are accepted. Anything else is invalid (null). */
export function parseOwnership(raw: string): OwnershipInput {
  const s = raw.trim().replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6));
  if (s === "") return { state: "unknown" };
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return { state: "value", value: n };
}

/** Blank = unknown. An amount must be 0 or more. Bangla digits and commas are accepted. Anything else is invalid (null). */
export function parseAmount(raw: string): { state: "unknown" } | { state: "value"; value: number } | null {
  const s = raw.trim().replace(/,/g, "").replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6));
  if (s === "") return { state: "unknown" };
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? { state: "value", value: n } : null;
}

// ---- value, your share, and the venture's own income and expense (money lines linked to the venture) ----

/** A money amount that may be missing. "none" = the user has entered no such line (shown as "not entered", never as 0). */
export type Money = { state: "value"; value: number } | { state: "unknown"; missing: number } | { state: "none" };
const money = (hasLines: boolean, c: Calc): Money => (!hasLines ? { state: "none" } : c.ok ? { state: "value", value: c.value } : { state: "unknown", missing: c.missing });

export interface VentureAccounts {
  lineIds: string[];
  income: Money; expenses: Money;
  /** income minus expenses, only when both are known */
  net: Money;
  /** income or expense lines that are yearly or one-off: listed, never converted, never counted */
  notMonthly: number;
}

/** The venture's own money lines: finance entries of the same mode that carry a link to it. A link to a venture that no longer exists is ignored. */
export function ventureAccounts(recs: readonly TMRecord[], ventureId: string): VentureAccounts {
  const lines = recs.filter((r) => r.entity === "finance_item" && r.links?.venture === ventureId);
  const fv = financeFrom(lines);
  const items = fv.items.filter((i) => i.kind === "income" || i.kind === "expense").map((i) => ({ ...i, scope: "business" as const }));
  const hasInc = items.some((i) => i.kind === "income"), hasExp = items.some((i) => i.kind === "expense");
  const inc = monthlyIncome(items, "business"), exp = monthlyExpenses(items, "business");
  const net: Money = hasInc && hasExp ? money(true, monthlyCashFlow(items, "business")) : { state: "none" };
  return { lineIds: lines.map((r) => r.id).sort(), income: money(hasInc, inc), expenses: money(hasExp, exp), net, notMonthly: fv.notMonthly };
}

export type Share = { state: "value"; value: number } | { state: "unknown"; missing: Array<"valuation" | "ownership"> };
/** Your share of the value = value x ownership / 100. Needs both; otherwise it names what is missing (never 0). */
export function yourShare(r: Pick<VentureRow, "valuation" | "ownership">): Share {
  const missing: Array<"valuation" | "ownership"> = [];
  if (r.valuation === null) missing.push("valuation");
  if (r.ownership === null) missing.push("ownership");
  return missing.length ? { state: "unknown", missing } : { state: "value", value: (r.valuation! * r.ownership!) / 100 };
}

export interface VentureView { row: VentureRow; share: Share; accounts: VentureAccounts }
export const ventureViews = (recs: readonly TMRecord[]): VentureView[] => ventureRows(recs as TMRecord[]).map((row) => ({ row, share: yourShare(row), accounts: ventureAccounts(recs, row.id) }));

/** A portfolio total is shown only when every venture contributes. Otherwise it says how many do; nothing unknown is added as 0. */
export type Total = { state: "none" } | { state: "value"; value: number } | { state: "incomplete"; known: number; of: number };
function total(values: Array<number | null>): Total {
  if (values.length === 0) return { state: "none" };
  const known = values.filter((v): v is number => v !== null);
  return known.length === values.length ? { state: "value", value: known.reduce((a, b) => a + b, 0) } : { state: "incomplete", known: known.length, of: values.length };
}
export interface Portfolio { count: number; value: Total; share: Total; monthlyNet: Total }
export function portfolio(views: readonly VentureView[]): Portfolio {
  return {
    count: views.length,
    value: total(views.map((v) => v.row.valuation)),
    share: total(views.map((v) => (v.share.state === "value" ? v.share.value : null))),
    monthlyNet: total(views.map((v) => (v.accounts.net.state === "value" ? v.accounts.net.value : null))),
  };
}

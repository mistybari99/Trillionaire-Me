// Money leak review and the four-legs status. Own entries only (the caller passes the active mode's records).
// Unknown is never 0. Each leg is Steady, Worth a look, Partly known, or Not enough data.
import { monthlyCashFlow, monthlyIncome, type FinItem } from "./finance";
import { bdtAmount } from "./financeInputs";
import { weeklySummary } from "./weeklyReview";
import type { FieldValue, TMRecord } from "./types";

const val = (v: FieldValue | undefined): unknown => (v && v.state === "value" ? v.value : undefined);
const numOf = (v: FieldValue | undefined): number | null => { const x = val(v); return typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : null; };
type Scope = FinItem["scope"];

// ---- Money leak review: which monthly expense lines to look at first ----
export interface ExpenseLine { id: string; label: string; amount: number | null }
export interface LeakScope {
  scope: Scope;
  lines: ExpenseLine[];
  /** Lines whose amount is not known. They are listed, never counted as 0. */
  unknownCount: number;
  /** Up to 3 largest known monthly lines (ties by id). A pointer for review, not a verdict. */
  top: Array<ExpenseLine & { amount: number; shareOfIncome: number | null }>;
  /** Expense lines that are one-off or yearly: not converted, only counted. */
  notMonthly: number;
}

export function leakReview(records: readonly TMRecord[]): LeakScope[] {
  const out: LeakScope[] = [];
  const fin = records.filter((r) => r.entity === "finance_item").sort((a, b) => a.id.localeCompare(b.id));
  const items: FinItem[] = [];
  for (const r of fin) {
    const kind = val(r.values["finance.kind"]), scope = val(r.values["finance.scope"]), period = val(r.values["finance.period"]);
    if (!["asset", "liability", "income", "expense"].includes(String(kind)) || !["personal", "business"].includes(String(scope))) continue;
    if ((kind === "income" || kind === "expense") && period !== "monthly") continue;
    items.push({ kind: kind as FinItem["kind"], scope: scope as Scope, amount: bdtAmount(r) });
  }
  for (const scope of ["personal", "business"] as const) {
    const mine = fin.filter((r) => val(r.values["finance.kind"]) === "expense" && val(r.values["finance.scope"]) === scope);
    if (!mine.length) continue;
    const monthly = mine.filter((r) => val(r.values["finance.period"]) === "monthly");
    const lines: ExpenseLine[] = monthly.map((r) => ({ id: r.id, label: String(val(r.values["finance.label"]) ?? ""), amount: numOf(bdtAmount(r)) }));
    const inc = monthlyIncome(items, scope);
    const income = inc.ok && inc.value > 0 ? inc.value : null;
    const top = lines.filter((l): l is ExpenseLine & { amount: number } => l.amount !== null).sort((a, b) => b.amount - a.amount || a.id.localeCompare(b.id)).slice(0, 3)
      .map((l) => ({ ...l, shareOfIncome: income === null ? null : Math.round((l.amount / income) * 100) }));
    out.push({ scope, lines, unknownCount: lines.filter((l) => l.amount === null).length, top, notMonthly: mine.length - monthly.length });
  }
  return out;
}

// ---- Attention leaks: four levers, a checklist of things the person may do ----
export const ATTENTION_LEVERS = ["silence", "close", "clarify", "bound"] as const;
export type AttentionLever = (typeof ATTENTION_LEVERS)[number];

// ---- Four legs ----
export const LEGS = ["finance", "tasks", "weekly", "habits"] as const;
export type Leg = (typeof LEGS)[number];
export type LegState = "steady" | "look" | "partial" | "unknown";
export interface LegStatus { leg: Leg; state: LegState; /** i18n key suffix for the reason */ why: string }
export interface LegsResult { legs: LegStatus[]; /** Legs worth a look, in the fixed order of LEGS. Empty when none. */ lookAt: Leg[] }

function financeLeg(records: readonly TMRecord[]): LegStatus {
  const items: FinItem[] = []; let any = false;
  for (const r of records) {
    if (r.entity !== "finance_item") continue;
    const kind = val(r.values["finance.kind"]), scope = val(r.values["finance.scope"]), period = val(r.values["finance.period"]);
    if (!["asset", "liability", "income", "expense"].includes(String(kind)) || !["personal", "business"].includes(String(scope))) continue;
    any = true;
    if ((kind === "income" || kind === "expense") && period !== "monthly") continue;
    items.push({ kind: kind as FinItem["kind"], scope: scope as Scope, amount: bdtAmount(r) });
  }
  if (!any) return { leg: "finance", state: "unknown", why: "finance.none" };
  let known = 0, negative = 0, unknownScopes = 0;
  for (const scope of ["personal", "business"] as const) {
    const has = items.some((i) => i.scope === scope && (i.kind === "income" || i.kind === "expense"));
    if (!has) continue;
    // Income and expenses must both be entered; one side alone is not a cash flow.
    const hasInc = items.some((i) => i.scope === scope && i.kind === "income"), hasExp = items.some((i) => i.scope === scope && i.kind === "expense");
    const flow = monthlyCashFlow(items, scope);
    if (!hasInc || !hasExp || !flow.ok) { unknownScopes++; continue; }
    known++; if (flow.value < 0) negative++;
  }
  if (negative > 0) return { leg: "finance", state: "look", why: "finance.negative" };
  if (known > 0 && unknownScopes === 0) return { leg: "finance", state: "steady", why: "finance.steady" };
  return { leg: "finance", state: "partial", why: "finance.partial" };
}

export function fourLegs(records: readonly TMRecord[], today: string): LegsResult {
  const w = weeklySummary(records, today);
  const tasks = records.filter((r) => r.entity === "task");
  const habits = records.filter((r) => r.entity === "habit");
  const finance = financeLeg(records);
  const tasksLeg: LegStatus = tasks.length === 0 ? { leg: "tasks", state: "unknown", why: "tasks.none" }
    : w.tasksDone !== null ? { leg: "tasks", state: "steady", why: "tasks.moving" }
    : w.stillOpen === 0 ? { leg: "tasks", state: "steady", why: "tasks.clear" }
    : { leg: "tasks", state: "look", why: "tasks.still" };
  const knownMeasures = [w.tasksDone, w.focusMinutes, w.habitCheckins, w.journeyNotes, w.stillOpen].filter((x) => x !== null).length;
  const weekly: LegStatus = knownMeasures === 0 ? { leg: "weekly", state: "unknown", why: "weekly.none" }
    : knownMeasures >= 3 ? { leg: "weekly", state: "steady", why: "weekly.enough" } : { leg: "weekly", state: "partial", why: "weekly.little" };
  const habitsLeg: LegStatus = habits.length === 0 ? { leg: "habits", state: "unknown", why: "habits.none" }
    : w.habitCheckins !== null ? { leg: "habits", state: "steady", why: "habits.checkins" } : { leg: "habits", state: "look", why: "habits.quiet" };
  const legs = [finance, tasksLeg, weekly, habitsLeg];
  return { legs, lookAt: legs.filter((l) => l.state === "look").map((l) => l.leg) };
}

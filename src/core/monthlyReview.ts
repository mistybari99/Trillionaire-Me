// M16 monthly review, and the money and risk blocks every review shares (weekly, monthly, 90 days). Pure.
// Counts come only from the user's own records. Unknown is never 0: no record in the window is null, an unknown amount makes a total unknown.
// Wording elsewhere stays neutral: "still open", "more to go", never failed or late.
import { monthlyExpenses, monthlyIncome, monthlyCashFlow, type Calc } from "./finance";
import { financeFrom } from "./financeInputs";
import { riskDue, riskRows, withoutStopRule, type RiskRow } from "./risk";
import type { EventKind } from "./realityLoop";
import type { FieldValue, TMRecord } from "./types";
import { SCHEMA_VERSION } from "../schema/entities";

export const MONTH_DAYS = 30;
const pad = (n: number) => String(n).padStart(2, "0");
const dayOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const val = (v: FieldValue | undefined): unknown => (v && v.state === "value" ? v.value : undefined);

export function monthWindow(today: string): { from: string; to: string } {
  const [y, m, d] = today.split("-").map(Number);
  if (!y || !m || !d) throw new Error("today must be YYYY-MM-DD");
  return { from: dayOf(new Date(y, m - 1, d - (MONTH_DAYS - 1))), to: today };
}

export interface MonthlySummary { from: string; to: string; tasksDone: number | null; focusMinutes: number | null; focusUnknown: number; habitCheckins: number | null; stagePasses: number | null; journeyNotes: number | null }
const orNull = (n: number): number | null => (n > 0 ? n : null);

export function monthlySummary(recs: readonly TMRecord[], today: string): MonthlySummary {
  const { from, to } = monthWindow(today);
  const inWin = (day: string) => day >= from && day <= to;
  const tasksDone = recs.filter((r) => r.entity === "task" && typeof val(r.values["task.done_on"]) === "string" && inWin(String(val(r.values["task.done_on"])))).length;
  let minutes = 0, known = 0, unknown = 0;
  for (const r of recs) {
    if (r.entity !== "focus_session") continue;
    const date = val(r.values["focus_session.date"]);
    if (typeof date !== "string" || !inWin(date)) continue;
    const m = val(r.values["focus_session.minutes"]);
    if (typeof m === "number" && Number.isFinite(m) && m >= 0) { minutes += m; known++; } else unknown++;
  }
  const habit = recs.filter((r) => r.entity === "habit_log" && typeof val(r.values["habit_log.date"]) === "string" && inWin(String(val(r.values["habit_log.date"]))) && Number(val(r.values["habit_log.count"]) ?? 0) > 0).length;
  const inCreated = (r: TMRecord) => Number.isFinite(Date.parse(r.createdAt)) && inWin(dayOf(new Date(r.createdAt)));
  const stagePasses = recs.filter((r) => r.entity === "stage_pass" && inCreated(r)).length;
  const notes = recs.filter((r) => (r.entity === "journey_log" || r.entity === "stage_pass") && inCreated(r)).length;
  return { from, to, tasksDone: orNull(tasksDone), focusMinutes: known > 0 ? minutes : null, focusUnknown: unknown, habitCheckins: orNull(habit), stagePasses: orNull(stagePasses), journeyNotes: orNull(notes) };
}

// ------------------------------------------------------------------ money in every review
export type Fig = { state: "value"; value: number } | { state: "unknown"; why: "no_lines" | "incomplete" };
export interface MoneyReview { scope: "personal" | "business"; income: Fig; expense: Fig; cashFlow: Fig }
const fig = (c: Calc, any: boolean): Fig => (!any ? { state: "unknown", why: "no_lines" } : c.ok ? { state: "value", value: c.value } : { state: "unknown", why: "incomplete" });

/** The user's monthly money figures as entered (income lines, spending lines, cash flow), personal and business apart. A scope with no monthly line is left out. */
export function moneyReview(recs: readonly TMRecord[]): MoneyReview[] {
  const fv = financeFrom(recs as TMRecord[]);
  return (["personal", "business"] as const).flatMap((scope) => {
    const inc = fv.items.some((i) => i.kind === "income" && i.scope === scope), exp = fv.items.some((i) => i.kind === "expense" && i.scope === scope);
    if (!inc && !exp) return [];
    return [{ scope, income: fig(monthlyIncome(fv.items, scope), inc), expense: fig(monthlyExpenses(fv.items, scope), exp), cashFlow: fig(monthlyCashFlow(fv.items, scope), inc && exp) }];
  });
}

// ------------------------------------------------------------------ risks in every review
export interface RiskReview { total: number; due: RiskRow[]; soon: RiskRow[]; noStopRule: number }
export function riskReview(recs: readonly TMRecord[], today: string): RiskReview {
  const rows = riskRows(recs as TMRecord[]);
  return { total: rows.length, due: rows.filter((r) => riskDue(r, today) === "due"), soon: rows.filter((r) => riskDue(r, today) === "soon"), noStopRule: withoutStopRule(rows) };
}

// ------------------------------------------------------------------ assumptions check (monthly)
export const ASSUMPTION_KEYS = ["free_time", "income", "spending"] as const;
export type AssumptionKey = (typeof ASSUMPTION_KEYS)[number];
export const ASSUMPTION_EVENT: Record<AssumptionKey, EventKind> = { free_time: "time_less", income: "income_change", spending: "expense_change" };
export interface AssumptionItem { key: AssumptionKey; kind: EventKind; value: { state: "value"; value: number; unit: "hours_week" | "bdt_month" } | { state: "unknown"; why: "not_written" | "no_lines" | "incomplete" }; lastChecked: string | null }

/** The things the plan rests on that the app can read back, with the day the user last checked each. The user says whether each is still true. */
export function assumptionItems(recs: readonly TMRecord[], freeMinutes: number | null): AssumptionItem[] {
  const fv = financeFrom(recs as TMRecord[]);
  const last = (key: string): string | null => recs.filter((r) => r.entity === "journey_log" && r.links?.assume === key).map((r) => r.createdAt.slice(0, 10)).sort().pop() ?? null;
  const money = (kind: "income" | "expense"): AssumptionItem["value"] => {
    if (!fv.items.some((i) => i.kind === kind && i.scope === "personal")) return { state: "unknown", why: "no_lines" };
    const c = kind === "income" ? monthlyIncome(fv.items, "personal") : monthlyExpenses(fv.items, "personal");
    return c.ok ? { state: "value", value: c.value, unit: "bdt_month" } : { state: "unknown", why: "incomplete" };
  };
  return [
    { key: "free_time", kind: "time_less", value: freeMinutes === null ? { state: "unknown", why: "not_written" } : { state: "value", value: Math.round((freeMinutes / 60) * 10) / 10, unit: "hours_week" }, lastChecked: last("free_time") },
    { key: "income", kind: "income_change", value: money("income"), lastChecked: last("income") },
    { key: "spending", kind: "expense_change", value: money("expense"), lastChecked: last("spending") },
  ];
}

/** The journey-log line written when the user says an assumption is still true. */
export function assumptionLog(p: { id: string; key: AssumptionKey; text: string; createdAt: string }): TMRecord {
  return { id: p.id, entity: "journey_log", ns: "demo", ownerId: "demo-user", schemaVersion: SCHEMA_VERSION, createdAt: p.createdAt, values: { "journey_log.entry": { state: "value", value: p.text, label: "DEMO" } }, links: { assume: p.key } };
}

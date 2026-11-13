// M05 stage gates B-H (Spec 3.4): entry condition, measurable exit conditions, review date, pause/rollback rule. Pure.
// The user writes every condition and every target; the app proposes none. An exit condition is "reached" only when the app can read a real
// number from the user's own records (or the number they typed) and it is at or above their target. Unknown is never 0:
// no records, an incomplete total or no target gives "unknown", never "not reached".
import { monthlyIncome } from "./finance";
import { financeFrom } from "./financeInputs";
import { nowOf, type StarSource } from "./northStar";
import { ventureRows } from "./ventures";
import { handoverRows } from "./team";
import { reviewSummary } from "./review";
import { addDays, validDay } from "./realityLoop";
import { STAGE_CODES, type StageCode } from "./stages";
import type { FieldValue, TMRecord } from "./types";

export const GATE_CODES: readonly StageCode[] = STAGE_CODES.filter((c) => c !== "A");
export const isGateCode = (s: string): s is StageCode => (GATE_CODES as readonly string[]).includes(s);

export const EXIT_MEASURES = ["own", "net_worth", "business_net_worth", "monthly_income", "business_income", "venture_value", "venture_share", "ventures_running", "handovers_done", "tasks_done_90", "focus_minutes_90"] as const;
export type ExitMeasure = (typeof EXIT_MEASURES)[number];
const STAR_MEASURES: readonly string[] = ["net_worth", "business_net_worth", "venture_value", "venture_share"];

const str = (v: FieldValue | undefined): string | null => (v?.state === "value" && typeof v.value === "string" && v.value.trim() ? v.value.trim() : null);
const numv = (v: FieldValue | undefined): number | null => (v?.state === "value" && typeof v.value === "number" && Number.isFinite(v.value) ? v.value : null);

// ------------------------------------------------------------------ gate rules (entry, review date, pause/rollback)
export interface GateRow { id: string | null; code: StageCode; entry: string | null; reviewOn: string | null; pauseRule: string | null }

/** One row for each stage B-H (an empty row when the user has written nothing for it). */
export function gateRows(recs: readonly TMRecord[]): GateRow[] {
  const by = new Map<string, TMRecord>();
  for (const r of recs) if (r.entity === "stage_gate") { const c = str(r.values["stage_gate.stage_code"]); if (c && isGateCode(c)) by.set(c, r); }
  return GATE_CODES.map((code) => { const r = by.get(code); return { id: r?.id ?? null, code, entry: r ? str(r.values["stage_gate.entry_condition"]) : null, reviewOn: r ? str(r.values["stage_gate.review_on"]) : null, pauseRule: r ? str(r.values["stage_gate.pause_rule"]) : null }; });
}
export const gateIsEmpty = (g: GateRow): boolean => !g.entry && !g.reviewOn && !g.pauseRule;

export type GateDue = "due" | "soon" | "later" | "none";
export const GATE_SOON_DAYS = 7;
export function gateDue(g: Pick<GateRow, "reviewOn">, today: string): GateDue {
  if (!g.reviewOn || !validDay(g.reviewOn)) return "none";
  if (g.reviewOn <= today) return "due";
  return g.reviewOn <= addDays(today, GATE_SOON_DAYS) ? "soon" : "later";
}
/** Stages whose review date has come, only for stages that are not passed yet. */
export const dueGates = (rows: readonly GateRow[], passed: readonly string[], today: string): GateRow[] => rows.filter((g) => !passed.includes(g.code) && gateDue(g, today) === "due");

export type GateError = "entry_long" | "pause_long" | "date_format" | "date_invalid";
export function validateGate(p: { entry: string; reviewOn: string; pauseRule: string }): GateError | null {
  if (p.entry.trim().length > 300) return "entry_long";
  if (p.pauseRule.trim().length > 300) return "pause_long";
  const d = p.reviewOn.trim();
  if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) return "date_format";
  if (d && !validDay(d)) return "date_invalid";
  return null;
}

// ------------------------------------------------------------------ measurable exit conditions
export interface ExitRow { id: string; ns: TMRecord["ns"]; code: StageCode; name: string; measure: ExitMeasure; target: number | null; unit: string; ownActual: number | null; ownActualOn: string | null }

export function exitRows(recs: readonly TMRecord[]): ExitRow[] {
  const out: ExitRow[] = [];
  for (const r of recs) {
    if (r.entity !== "stage_exit") continue;
    const code = str(r.values["stage_exit.stage_code"]), name = str(r.values["stage_exit.name"]), m = str(r.values["stage_exit.measure"]);
    if (!code || !isGateCode(code) || !name || !(EXIT_MEASURES as readonly string[]).includes(m ?? "")) continue;
    const tg = numv(r.values["stage_exit.target"]);
    out.push({ id: r.id, ns: r.ns, code, name, measure: m as ExitMeasure, target: tg !== null && tg > 0 ? tg : null, unit: str(r.values["stage_exit.unit"]) ?? "", ownActual: numv(r.values["stage_exit.actual"]), ownActualOn: str(r.values["stage_exit.actual_on"]) });
  }
  return out.sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : a.name.localeCompare(b.name) || a.id.localeCompare(b.id)));
}

export type ExitWhy = "not_entered" | "no_money_lines" | "no_ventures" | "incomplete" | "no_records";
export type ExitActual = { state: "value"; value: number; asOf: string | null } | { state: "unknown"; why: ExitWhy };

/** The number for an exit condition, read from the user's own records. Unknown when nothing real can be read. */
export function exitActual(row: ExitRow, recs: readonly TMRecord[], today: string): ExitActual {
  const m = row.measure;
  if (m === "own") return row.ownActual === null ? { state: "unknown", why: "not_entered" } : { state: "value", value: row.ownActual, asOf: row.ownActualOn };
  if (STAR_MEASURES.includes(m)) {
    const now = nowOf({ id: row.id, ns: row.ns, metric: row.name, unit: null, baseline: null, target: null, current: null, currentOn: null, source: m as StarSource, weight: null }, recs);
    return now.state === "value" ? { state: "value", value: now.value, asOf: null } : { state: "unknown", why: now.why === "not_entered" ? "no_records" : now.why };
  }
  if (m === "monthly_income" || m === "business_income") {
    const scope = m === "monthly_income" ? "personal" : "business";
    const fv = financeFrom(recs as TMRecord[]);
    if (!fv.items.some((i) => i.kind === "income" && i.scope === scope)) return { state: "unknown", why: "no_money_lines" };
    const c = monthlyIncome(fv.items, scope);
    return c.ok ? { state: "value", value: c.value, asOf: null } : { state: "unknown", why: "incomplete" };
  }
  if (m === "ventures_running") {
    const vs = ventureRows(recs as TMRecord[]);
    return vs.length ? { state: "value", value: vs.filter((v) => v.stage === "running").length, asOf: null } : { state: "unknown", why: "no_ventures" };
  }
  if (m === "handovers_done") {
    const hs = handoverRows(recs);
    return hs.length ? { state: "value", value: hs.filter((x) => x.status === "done").length, asOf: null } : { state: "unknown", why: "no_records" };
  }
  const s = reviewSummary(recs, today);
  const n = m === "tasks_done_90" ? s.tasksDone : s.focusMinutes;
  return n === null ? { state: "unknown", why: "no_records" } : { state: "value", value: n, asOf: null };
}

export type ExitState = "met" | "not_yet" | "unknown" | "no_target";
export interface ExitStatus { row: ExitRow; actual: ExitActual; state: ExitState; toGo: number | null }
export function exitStatus(row: ExitRow, recs: readonly TMRecord[], today: string): ExitStatus {
  const actual = exitActual(row, recs, today);
  if (row.target === null) return { row, actual, state: "no_target", toGo: null };
  if (actual.state !== "value") return { row, actual, state: "unknown", toGo: null };
  return actual.value >= row.target ? { row, actual, state: "met", toGo: 0 } : { row, actual, state: "not_yet", toGo: row.target - actual.value };
}
export const exitStatuses = (recs: readonly TMRecord[], today: string, code?: StageCode): ExitStatus[] =>
  exitRows(recs).filter((r) => !code || r.code === code).map((r) => exitStatus(r, recs, today));

/** A stage's measurable exits together: all reached, or how many are open. No exit written = nothing measurable (not "all reached"). */
export interface ExitSummary { total: number; met: number; open: number; unknown: number; noTarget: number; allMet: boolean }
export function summariseExits(list: readonly ExitStatus[]): ExitSummary {
  const met = list.filter((x) => x.state === "met").length;
  return { total: list.length, met, open: list.filter((x) => x.state === "not_yet").length, unknown: list.filter((x) => x.state === "unknown").length, noTarget: list.filter((x) => x.state === "no_target").length, allMet: list.length > 0 && met === list.length };
}

export type ExitError = "name_required" | "name_long" | "unit_long" | "target_invalid";
export function validateExit(p: { name: string; unit: string; target: string }, parse: (raw: string) => { state: string } | null): ExitError | null {
  if (!p.name.trim()) return "name_required";
  if (p.name.trim().length > 80) return "name_long";
  if (p.unit.trim().length > 40) return "unit_long";
  if (parse(p.target) === null) return "target_invalid";
  return null;
}

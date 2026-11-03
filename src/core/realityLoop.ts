// M12 reality-changed loop (Spec 3.6), pure. Event -> rule-based impact -> at most 3 options -> plan-diff -> approval -> new plan version.
// Rules only (no AI). Nothing is deleted: a plan version keeps the plan as it was (before) and as it became (after), and is never overwritten.
// Unknown is never 0: a goal with no target date is not "moved"; a step with no estimate is still just a step. No option ever adds work.
import type { CapacityMode } from "./planner";
import { isOpenTask, isParkedTask } from "./planInputs";
import { GOAL_STATUSES, goalStatusOf, withGoalStatus, type GoalStatus } from "./goalStatus";
import { goalIdsOf } from "./taskGoals";
import type { FieldValue, TMRecord } from "./types";
import { SCHEMA_VERSION } from "../schema/entities";

export const EVENT_KINDS = ["income_change", "expense_change", "time_less", "new_duty", "setback", "opportunity", "market_change", "illness"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];
export const LOOP_OPTIONS = ["move_dates", "reduce_scope", "change_path", "pause"] as const;
export type LoopOption = (typeof LOOP_OPTIONS)[number];
export type VersionOption = LoopOption | "resume";
export const MOVE_DAYS = [7, 14, 30] as const;
export type MoveDays = (typeof MOVE_DAYS)[number];
export type EventStatus = "open" | "decided" | "noted";
export const MAX_OPTIONS = 3;
/** Parking more steps than this, or changing a whole path, needs an extra tick before approval. */
export const BIG_CHANGE_ITEMS = 5;
export const RESUME_STEPS = 3;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: FieldValue | undefined): string | null => (v?.state === "value" && typeof v.value === "string" && v.value.trim() ? v.value.trim() : null);
const lv = (r: TMRecord, value: unknown): FieldValue => ({ state: "value", value, label: r.ns === "real" ? "FACT" : "DEMO" });
const PRIORITY: Record<string, number> = { high: 3, normal: 2, low: 1 };
const prioOf = (r: TMRecord): number => PRIORITY[str(r.values["task.priority"]) ?? "normal"] ?? 2;
const titleOf = (r: TMRecord, key: string): string => str(r.values[key]) ?? "";
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function validDay(s: string): boolean {
  if (!DAY.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- events

export interface EventRow { id: string; ns: TMRecord["ns"]; kind: EventKind; note: string | null; on: string | null; status: EventStatus; goalId: string | null; option: LoopOption | null }
export type EventError = "kind_required" | "note_long" | "date_invalid";

/** Events, newest first (then by id). An unreadable kind drops the record from view, never from storage. */
export function eventRows(recs: readonly TMRecord[]): EventRow[] {
  const out: EventRow[] = [];
  for (const r of recs) {
    if (r.entity !== "reality_event") continue;
    const kind = str(r.values["reality_event.kind"]);
    if (!(EVENT_KINDS as readonly string[]).includes(kind ?? "")) continue;
    const st = str(r.values["reality_event.status"]); const op = str(r.values["reality_event.option"]);
    out.push({ id: r.id, ns: r.ns, kind: kind as EventKind, note: str(r.values["reality_event.note"]), on: str(r.values["reality_event.on"]),
      status: st === "decided" || st === "noted" ? st : "open", goalId: r.links?.goal ?? null,
      option: (LOOP_OPTIONS as readonly string[]).includes(op ?? "") ? (op as LoopOption) : null });
  }
  return out.sort((a, b) => cmp(b.on ?? "", a.on ?? "") || cmp(b.id, a.id));
}
export const openEvents = (recs: readonly TMRecord[]): EventRow[] => eventRows(recs).filter((e) => e.status === "open");

export function validateEvent(p: { kind: string; note: string; on: string }): EventError | null {
  if (!(EVENT_KINDS as readonly string[]).includes(p.kind)) return "kind_required";
  if (p.note.trim().length > 200) return "note_long";
  if (p.on && !validDay(p.on)) return "date_invalid";
  return null;
}

// ---------------------------------------------------------------- impact (dependency graph + rules)

export type Assumption = "free_time" | "income" | "spending" | "market" | "health" | "dates" | "approach";
/** Which written-down assumptions an event puts in question. A fixed rule table, shown with its reason. */
export const ASSUMPTIONS: Record<EventKind, Assumption[]> = {
  income_change: ["income", "dates"], expense_change: ["spending", "dates"], time_less: ["free_time", "dates"], new_duty: ["free_time", "dates"],
  setback: ["dates", "approach"], opportunity: ["approach"], market_change: ["market", "income"], illness: ["health", "free_time", "dates"],
};
const MONEY_KINDS: readonly EventKind[] = ["income_change", "expense_change", "market_change"];
const TIME_KINDS: readonly EventKind[] = ["time_less", "new_duty", "illness", "setback"];
const MONEY_AREAS = ["business", "career"];

export interface ImpactGoal { id: string; title: string; targetDate: string | null }
export interface ImpactTask { id: string; title: string; priority: number; viaDependency: boolean; after: string | null }
export interface Impact {
  kind: EventKind; scopeGoalId: string | null;
  goals: ImpactGoal[]; tasks: ImpactTask[]; dates: Array<{ goalId: string; title: string; date: string }>;
  /** money kinds only: how many income and spending lines you have, and which ventures carry lines */
  money: { lines: number; ventures: Array<{ id: string; name: string }> } | null;
  risks: Array<{ id: string; text: string }>;
  assumptions: Assumption[]; markedNotTrue: number;
}

const activeGoals = (recs: readonly TMRecord[]): TMRecord[] => recs.filter((r) => r.entity === "goal" && str(r.values["goal.title"]) && goalStatusOf(r) === "active").sort((a, b) => cmp(a.id, b.id));

/** Walks the "after" links: every open step that waits (directly or not) for a step already in the set. */
function withDownstream(base: TMRecord[], open: TMRecord[]): ImpactTask[] {
  const inSet = new Map(base.map((r) => [r.id, false] as const));
  const out = new Map<string, boolean>(inSet);
  let grew = true;
  while (grew) {
    grew = false;
    for (const r of open) if (!out.has(r.id) && r.links?.after && out.has(r.links.after)) { out.set(r.id, true); grew = true; }
  }
  const byId = new Map(open.map((r) => [r.id, r] as const));
  return [...out.entries()].map(([id, via]) => { const r = byId.get(id)!; return { id, title: titleOf(r, "task.title"), priority: prioOf(r), viaDependency: via, after: r.links?.after ?? null }; })
    .sort((a, b) => b.priority - a.priority || cmp(a.id, b.id));
}

/** What the event may touch in YOUR plan. Only your own records are read; nothing is guessed. */
export function impactOf(recs: readonly TMRecord[], ev: Pick<EventRow, "kind" | "goalId">): Impact {
  const goalsAll = activeGoals(recs);
  const scope = ev.goalId ? goalsAll.find((g) => g.id === ev.goalId) ?? null : null;
  const open = recs.filter(isOpenTask);
  const isMoney = MONEY_KINDS.includes(ev.kind);
  let tasks: ImpactTask[] = [];
  if (scope) tasks = withDownstream(open.filter((r) => goalIdsOf(r).includes(scope.id)), open);
  else if (!isMoney && ev.kind !== "opportunity") tasks = withDownstream(open, open);
  const goalIds = new Set<string>();
  if (scope) goalIds.add(scope.id);
  else if (isMoney) { for (const g of goalsAll) if (MONEY_AREAS.includes(str(g.values["goal.area"]) ?? "")) goalIds.add(g.id); }
  else if (TIME_KINDS.includes(ev.kind)) { for (const t of tasks) { const rec = open.find((r) => r.id === t.id); if (rec) for (const gid of goalIdsOf(rec)) goalIds.add(gid); } }
  const goals = goalsAll.filter((g) => goalIds.has(g.id)).map((g): ImpactGoal => ({ id: g.id, title: titleOf(g, "goal.title"), targetDate: (() => { const d = str(g.values["goal.target_date"]); return d && validDay(d) ? d : null; })() }));
  const dates = goals.filter((g) => g.targetDate).map((g) => ({ goalId: g.id, title: g.title, date: g.targetDate! }));
  const lines = recs.filter((r) => r.entity === "finance_item" && ["income", "expense"].includes(str(r.values["finance.kind"]) ?? ""));
  const ventureIds = new Set(lines.map((r) => r.links?.venture).filter((x): x is string => !!x));
  const money = isMoney ? { lines: lines.length, ventures: recs.filter((r) => r.entity === "venture" && ventureIds.has(r.id)).map((r) => ({ id: r.id, name: titleOf(r, "venture.name") })).sort((a, b) => cmp(a.name, b.name) || cmp(a.id, b.id)) } : null;
  const risks = isMoney || ev.kind === "setback"
    ? recs.filter((r) => r.entity === "risk" && str(r.values["risk.text"])).map((r) => ({ id: r.id, text: titleOf(r, "risk.text") })).sort((a, b) => cmp(a.text, b.text) || cmp(a.id, b.id)) : [];
  return { kind: ev.kind, scopeGoalId: scope?.id ?? null, goals, tasks, dates, money, risks, assumptions: ASSUMPTIONS[ev.kind],
    markedNotTrue: recs.filter((r) => r.entity === "task" && r.values["task.not_true_on"]?.state === "value").length };
}
/** True when the event touches nothing in the plan. The user can still note it. */
export const noImpact = (i: Impact): boolean => !i.goals.length && !i.tasks.length && !i.dates.length && !(i.money && i.money.lines) && !i.risks.length;

// ---------------------------------------------------------------- options (at most 3, by rule)

const OPTION_ORDER: Record<EventKind, LoopOption[]> = {
  time_less: ["reduce_scope", "move_dates", "pause"], new_duty: ["reduce_scope", "move_dates", "pause"], illness: ["pause", "reduce_scope", "move_dates"],
  setback: ["move_dates", "change_path", "pause"], income_change: ["move_dates", "change_path", "reduce_scope"], expense_change: ["move_dates", "change_path", "reduce_scope"],
  market_change: ["change_path", "move_dates", "reduce_scope"], opportunity: ["change_path", "move_dates", "reduce_scope"],
};
/** Up to 3 options that would really change something right now. No option adds a task. */
export function optionsFor(imp: Impact, mode: CapacityMode): LoopOption[] {
  const ok = (o: LoopOption): boolean =>
    o === "move_dates" ? imp.dates.length > 0
      : o === "reduce_scope" ? keepSet(imp).parkIds.length > 0
        : o === "change_path" ? imp.scopeGoalId !== null && imp.goals.length > 0
          : mode !== "pause";
  return OPTION_ORDER[imp.kind].filter(ok).slice(0, MAX_OPTIONS);
}

/** Reduce scope: keep the more important half of the affected steps (and anything a kept step waits for); park the rest. Needs 2 or more steps. */
function keepSet(imp: Impact): { keepIds: string[]; parkIds: string[] } {
  const ts = imp.tasks;
  if (ts.length < 2) return { keepIds: ts.map((t) => t.id), parkIds: [] };
  const keep = new Set(ts.slice(0, Math.max(1, Math.ceil(ts.length / 2))).map((t) => t.id));
  const after = new Map(ts.map((t) => [t.id, t.after] as const));
  let grew = true;
  while (grew) { grew = false; for (const id of [...keep]) { const a = after.get(id); if (a && after.has(a) && !keep.has(a)) { keep.add(a); grew = true; } } }
  return { keepIds: ts.map((t) => t.id).filter((id) => keep.has(id)), parkIds: ts.map((t) => t.id).filter((id) => !keep.has(id)) };
}

// ---------------------------------------------------------------- the change itself (computed, not yet saved)

export interface PlanChange { puts: TMRecord[]; mode: CapacityMode | null; itemCount: number; big: boolean }

/** The records and plan mode an option would change. Pure: the screen shows the diff first and saves only after approval. */
export function planChange(recs: readonly TMRecord[], imp: Impact, option: LoopOption, p: { today: string; days: MoveDays; mode: CapacityMode }): PlanChange {
  const byId = new Map(recs.map((r) => [r.id, r] as const));
  const puts: TMRecord[] = [];
  let mode: CapacityMode | null = null;
  if (option === "move_dates") {
    for (const d of imp.dates) {
      const g = byId.get(d.goalId); if (!g) continue;
      const base = d.date > p.today ? d.date : p.today;           // a date already past is moved from today
      puts.push({ ...g, values: { ...g.values, "goal.target_date": lv(g, addDays(base, p.days)) } });
    }
  } else if (option === "reduce_scope") {
    for (const id of keepSet(imp).parkIds) { const r = byId.get(id); if (r) puts.push({ ...r, values: { ...r.values, "task.parked_on": lv(r, p.today) } }); }
  } else if (option === "change_path") {
    const g = imp.scopeGoalId ? byId.get(imp.scopeGoalId) : null;
    if (g) puts.push(withGoalStatus(g, "paused"));
  } else if (p.mode !== "pause") mode = "pause";
  const itemCount = puts.length + (mode ? 1 : 0);
  return { puts, mode, itemCount, big: option === "change_path" || itemCount > BIG_CHANGE_ITEMS };
}

/** Resume gently: end Pause or Minimum Week, and bring back at most 3 parked steps (most important first). The rest stay parked. */
export function resumeChange(recs: readonly TMRecord[], p: { today: string; mode: CapacityMode; n?: number }): PlanChange {
  const parked = recs.filter(isParkedTask).sort((a, b) => prioOf(b) - prioOf(a) || cmp(a.id, b.id)).slice(0, p.n ?? RESUME_STEPS);
  const puts = parked.map((r): TMRecord => { const { "task.parked_on": _p, ...rest } = r.values; return { ...r, values: rest }; });
  const mode: CapacityMode | null = p.mode !== "normal" ? "normal" : null;
  return { puts, mode, itemCount: puts.length + (mode ? 1 : 0), big: false };
}
export const parkedRows = (recs: readonly TMRecord[]): Array<{ id: string; title: string; since: string | null }> =>
  recs.filter(isParkedTask).sort((a, b) => prioOf(b) - prioOf(a) || cmp(a.id, b.id)).map((r) => ({ id: r.id, title: titleOf(r, "task.title"), since: str(r.values["task.parked_on"]) }));
/** Returns one parked step to the plan (the record is otherwise unchanged). */
export const unparkTask = (r: TMRecord): TMRecord => { const { "task.parked_on": _p, ...rest } = r.values; return { ...r, values: rest }; };

/** Applies a change to a copy of the records (for the preview diff). Same result as saving it. */
export function applyToRecords(recs: readonly TMRecord[], ch: PlanChange): TMRecord[] {
  const m = new Map(ch.puts.map((r) => [r.id, r] as const));
  return recs.map((r) => m.get(r.id) ?? r);
}

// ---------------------------------------------------------------- snapshots and plan-diff

export interface SnapGoal { id: string; title: string; status: GoalStatus; date: string | null }
export interface SnapTask { id: string; title: string; state: "open" | "parked" }
export interface Snapshot { v: 1; mode: CapacityMode; goals: SnapGoal[]; tasks: SnapTask[] }

/** The plan as it stands: goals (title, status, date), steps still ahead (open or parked) and the plan mode. */
export function snapshotOf(recs: readonly TMRecord[], mode: CapacityMode): Snapshot {
  const goals = recs.filter((r) => r.entity === "goal" && str(r.values["goal.title"])).sort((a, b) => cmp(a.id, b.id))
    .map((g): SnapGoal => ({ id: g.id, title: titleOf(g, "goal.title"), status: goalStatusOf(g), date: (() => { const d = str(g.values["goal.target_date"]); return d && validDay(d) ? d : null; })() }));
  const tasks = recs.filter((r) => isOpenTask(r) || isParkedTask(r)).sort((a, b) => cmp(a.id, b.id))
    .map((r): SnapTask => ({ id: r.id, title: titleOf(r, "task.title"), state: isParkedTask(r) ? "parked" : "open" }));
  return { v: 1, mode, goals, tasks };
}
export function parseSnapshot(text: string | null): Snapshot | null {
  if (!text) return null;
  try {
    const s = JSON.parse(text) as Partial<Snapshot>;
    if (s?.v !== 1 || !["normal", "minimum_week", "pause"].includes(String(s.mode)) || !Array.isArray(s.goals) || !Array.isArray(s.tasks)) return null;
    const goals = s.goals.filter((g): g is SnapGoal => !!g && typeof g.id === "string" && typeof g.title === "string" && (GOAL_STATUSES as readonly string[]).includes(String(g.status)) && (g.date === null || typeof g.date === "string"));
    const tasks = s.tasks.filter((t): t is SnapTask => !!t && typeof t.id === "string" && typeof t.title === "string" && (t.state === "open" || t.state === "parked"));
    return { v: 1, mode: s.mode as CapacityMode, goals, tasks };
  } catch { return null; }
}

export interface DiffRow { kind: "mode" | "goal" | "task"; id: string; title: string; field: "mode" | "date" | "status" | "state"; from: string | null; to: string | null }
/** Old against new, changed rows only. `null` on one side means the item is not in that plan. */
export function planDiff(before: Snapshot, after: Snapshot): DiffRow[] {
  const rows: DiffRow[] = [];
  if (before.mode !== after.mode) rows.push({ kind: "mode", id: "mode", title: "", field: "mode", from: before.mode, to: after.mode });
  const bg = new Map(before.goals.map((g) => [g.id, g] as const)), ag = new Map(after.goals.map((g) => [g.id, g] as const));
  for (const id of [...new Set([...bg.keys(), ...ag.keys()])].sort()) {
    const b = bg.get(id), a = ag.get(id), title = (a ?? b)!.title;
    if (!b || !a) { rows.push({ kind: "goal", id, title, field: "state", from: b ? "listed" : null, to: a ? "listed" : null }); continue; }
    if (b.date !== a.date) rows.push({ kind: "goal", id, title, field: "date", from: b.date, to: a.date });
    if (b.status !== a.status) rows.push({ kind: "goal", id, title, field: "status", from: b.status, to: a.status });
  }
  const bt = new Map(before.tasks.map((t) => [t.id, t] as const)), at = new Map(after.tasks.map((t) => [t.id, t] as const));
  for (const id of [...new Set([...bt.keys(), ...at.keys()])].sort()) {
    const b = bt.get(id), a = at.get(id), title = (a ?? b)!.title;
    if (b?.state !== a?.state) rows.push({ kind: "task", id, title, field: "state", from: b?.state ?? null, to: a?.state ?? null });
  }
  return rows;
}

// ---------------------------------------------------------------- records (built as demo; the screen puts them in the active mode)

const rec = (id: string, entity: string, createdAt: string, values: Record<string, FieldValue>, links?: Record<string, string>): TMRecord =>
  ({ id, entity, ns: "demo", ownerId: "demo-user", schemaVersion: SCHEMA_VERSION, createdAt, values, ...(links ? { links } : {}) });
const dv = (value: unknown): FieldValue => ({ state: "value", value, label: "DEMO" });

export function eventRecord(p: { id: string; kind: EventKind; note: string; on: string; goalId: string | null; createdAt: string }): TMRecord {
  const values: Record<string, FieldValue> = { "reality_event.kind": dv(p.kind), "reality_event.on": dv(p.on), "reality_event.status": dv("open") };
  if (p.note.trim()) values["reality_event.note"] = dv(p.note.trim());
  return rec(p.id, "reality_event", p.createdAt, values, p.goalId ? { goal: p.goalId } : undefined);
}
export function decidedEvent(ev: TMRecord, option: LoopOption | null): TMRecord {
  const values: Record<string, FieldValue> = { ...ev.values, "reality_event.status": lv(ev, option ? "decided" : "noted") };
  if (option) values["reality_event.option"] = lv(ev, option);
  return { ...ev, values };
}
export function versionRecord(p: { id: string; number: number; option: VersionOption; on: string; eventId: string | null; before: Snapshot; after: Snapshot; createdAt: string }): TMRecord {
  return rec(p.id, "plan_version", p.createdAt, {
    "plan_version.number": dv(p.number), "plan_version.option": dv(p.option), "plan_version.on": dv(p.on),
    "plan_version.before_snapshot": dv(JSON.stringify(p.before)), "plan_version.snapshot": dv(JSON.stringify(p.after)),
  }, p.eventId ? { event: p.eventId } : undefined);
}
/** The decision-log line (journey log, append-only). `text` is already localised by the screen. */
export function loopLogRecord(p: { id: string; eventId: string | null; text: string; createdAt: string }): TMRecord {
  return rec(p.id, "journey_log", p.createdAt, { "journey_log.entry": dv(p.text) }, p.eventId ? { event: p.eventId } : undefined);
}

export interface VersionRow { id: string; number: number; option: VersionOption; on: string | null; eventId: string | null; before: Snapshot | null; after: Snapshot | null; diff: DiffRow[] | null }
const VERSION_OPTIONS: readonly string[] = [...LOOP_OPTIONS, "resume"];
/** Saved plan versions, newest first. The diff is old (before) against new (after); null when a snapshot cannot be read. */
export function versionRows(recs: readonly TMRecord[]): VersionRow[] {
  const out: VersionRow[] = [];
  for (const r of recs) {
    if (r.entity !== "plan_version") continue;
    const n = r.values["plan_version.number"]; const o = str(r.values["plan_version.option"]);
    if (n?.state !== "value" || typeof n.value !== "number" || !VERSION_OPTIONS.includes(o ?? "")) continue;
    const before = parseSnapshot(str(r.values["plan_version.before_snapshot"])), after = parseSnapshot(str(r.values["plan_version.snapshot"]));
    out.push({ id: r.id, number: n.value, option: o as VersionOption, on: str(r.values["plan_version.on"]), eventId: r.links?.event ?? null, before, after, diff: before && after ? planDiff(before, after) : null });
  }
  return out.sort((a, b) => b.number - a.number || cmp(b.id, a.id));
}
export const nextVersionNumber = (recs: readonly TMRecord[]): number => versionRows(recs).reduce((m, v) => Math.max(m, v.number), 0) + 1;

// M10 team roles (demo namespace). Roles only: no people's names are stored or needed.
// Unknown holder is shown as unknown, never counted as "covered" or as "open".
import { isDelegatedTask } from "./planInputs";
import type { FieldValue, TMRecord } from "./types";

export type Holder = "me" | "someone" | "open";
const HOLDERS: readonly string[] = ["me", "someone", "open"];
export interface RoleRow { id: string; role: string; holder: Holder | null }
export interface RoleSummary { total: number; open: number; unknown: number }

const str = (v: FieldValue | undefined): string | null => (v?.state === "value" && typeof v.value === "string" && v.value.trim() ? v.value.trim() : null);

export function roleRows(recs: TMRecord[]): RoleRow[] {
  return recs.filter((r) => r.entity === "team_role").map((r): RoleRow => {
    const h = str(r.values["team_role.holder"]);
    return { id: r.id, role: str(r.values["team_role.role"]) ?? "", holder: h && HOLDERS.includes(h) ? (h as Holder) : null };
  }).sort((a, b) => (a.role < b.role ? -1 : a.role > b.role ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Counts for the summary line. "open" = nobody covers the role yet; "unknown" = not answered. */
export function roleSummary(rows: RoleRow[]): RoleSummary {
  return { total: rows.length, open: rows.filter((r) => r.holder === "open").length, unknown: rows.filter((r) => r.holder === null).length };
}

/** Names are refused by shape: a role line with an @ or a phone-like number is not saved. */
export function looksLikePersonContact(text: string): boolean {
  return /@|\+?\d[\d\s-]{7,}/.test(text);
}

// ---------------------------------------------------------------- tasks tied to roles, hand-over, hiring step, gap analysis (M10)
// Roles only, no names. A step is tied to a role by links.role. A role covered by "someone else" takes its open steps out of the user's own schedule
// (task.delegated_on, kept in step by syncDelegation) but they still count toward their goal. Nothing unknown is counted as 0.
export type HandoverStatus = "planned" | "done";
export interface HandoverRow { id: string; roleId: string; status: HandoverStatus; note: string | null; due: string | null; doneOn: string | null }
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const txt = (v: FieldValue | undefined): string | null => str(v);

export function handoverRows(recs: readonly TMRecord[]): HandoverRow[] {
  const out: HandoverRow[] = [];
  for (const r of recs) {
    if (r.entity !== "handover" || !r.links?.role) continue;
    const st = txt(r.values["handover.status"]);
    out.push({ id: r.id, roleId: r.links.role, status: st === "done" ? "done" : "planned", note: txt(r.values["handover.note"]), due: txt(r.values["handover.due"]), doneOn: txt(r.values["handover.done_on"]) });
  }
  return out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export type RoleGap = "gap" | "open_no_steps" | "unanswered" | "covered" | "mine";
export interface RoleTask { id: string; title: string; minutes: number | null; delegated: boolean; parked: boolean }
export interface RoleView {
  row: RoleRow; tasks: RoleTask[];
  /** sum of the known estimates, and how many steps have no estimate yet (never counted as 0 minutes) */
  knownMinutes: number; unknownEstimates: number;
  gap: RoleGap;
  planned: HandoverRow | null; done: HandoverRow[];
}

const numOf = (v: FieldValue | undefined): number | null => (v?.state === "value" && typeof v.value === "number" && Number.isFinite(v.value) && v.value > 0 ? v.value : null);
const stillOpen = (r: TMRecord): boolean => r.entity === "task" && r.values["task.done_on"]?.state !== "value" && r.values["task.not_true_on"]?.state !== "value";

export function roleViews(recs: readonly TMRecord[]): RoleView[] {
  const hos = handoverRows(recs);
  return roleRows(recs as TMRecord[]).map((row): RoleView => {
    const mine = recs.filter((r) => stillOpen(r) && r.links?.role === row.id).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const tasks = mine.map((r): RoleTask => ({ id: r.id, title: txt(r.values["task.title"]) ?? "", minutes: numOf(r.values["task.minutes"]), delegated: isDelegatedTask(r), parked: r.values["task.parked_on"]?.state === "value" }));
    const known = tasks.filter((x) => x.minutes !== null);
    const gap: RoleGap = row.holder === null ? "unanswered" : row.holder === "open" ? (tasks.length ? "gap" : "open_no_steps") : row.holder === "me" ? "mine" : "covered";
    const mineHo = hos.filter((h) => h.roleId === row.id);
    return { row, tasks, knownMinutes: known.reduce((a, x) => a + (x.minutes as number), 0), unknownEstimates: tasks.length - known.length, gap,
      planned: mineHo.find((h) => h.status === "planned") ?? null, done: mineHo.filter((h) => h.status === "done") };
  });
}

export interface TeamAnalysis {
  roles: number; gaps: number; openNoSteps: number; unanswered: number; planned: number; handedOver: number;
  /** open steps not tied to any role: owner unknown, not a gap */
  unassigned: number;
  /** steps tied to roles the user holds: known minutes, steps without an estimate, and the user's weekly free minutes (null = not known) */
  mine: { steps: number; knownMinutes: number; unknownEstimates: number; freeMinutes: number | null; over: boolean | null };
}
export function analyseTeam(recs: readonly TMRecord[], freeMinutes: number | null): TeamAnalysis {
  const vs = roleViews(recs);
  const roleIds = new Set(vs.map((v) => v.row.id));
  const mineViews = vs.filter((v) => v.gap === "mine");
  const steps = mineViews.reduce((a, v) => a + v.tasks.length, 0);
  const knownMinutes = mineViews.reduce((a, v) => a + v.knownMinutes, 0);
  const unknownEstimates = mineViews.reduce((a, v) => a + v.unknownEstimates, 0);
  return {
    roles: vs.length, gaps: vs.filter((v) => v.gap === "gap").length, openNoSteps: vs.filter((v) => v.gap === "open_no_steps").length, unanswered: vs.filter((v) => v.gap === "unanswered").length,
    planned: vs.filter((v) => v.planned).length, handedOver: vs.reduce((a, v) => a + v.done.length, 0),
    unassigned: recs.filter((r) => stillOpen(r) && !(r.links?.role && roleIds.has(r.links.role)) && !isDelegatedTask(r)).length,
    mine: { steps, knownMinutes, unknownEstimates, freeMinutes, over: freeMinutes === null || steps === 0 ? null : knownMinutes > freeMinutes },
  };
}

/** Ties a step to a role, or unties it (null). The step is otherwise unchanged. */
export function assignTask(task: TMRecord, roleId: string | null): TMRecord {
  const { role: _r, ...rest } = task.links ?? {};
  const links = roleId ? { ...rest, role: roleId } : rest;
  const { links: _l, ...base } = task;
  return Object.keys(links).length ? { ...base, links } : base;
}

/** Keeps task.delegated_on in step with the roles: an open step of a role covered by "someone else" is delegated; every other step is not.
 *  Returns only the records that change. Pure. */
export function syncDelegation(recs: readonly TMRecord[], today: string): TMRecord[] {
  const holder = new Map(roleRows(recs as TMRecord[]).map((r) => [r.id, r.holder] as const));
  const out: TMRecord[] = [];
  for (const r of recs) {
    if (r.entity !== "task") continue;
    const should = stillOpen(r) && !!r.links?.role && holder.get(r.links.role) === "someone";
    const has = r.values["task.delegated_on"]?.state === "value";
    if (should && !has) out.push({ ...r, values: { ...r.values, "task.delegated_on": { state: "value", value: today, label: r.ns === "real" ? "FACT" : "DEMO" } } });
    else if (!should && has) { const { "task.delegated_on": _d, ...rest } = r.values; out.push({ ...r, values: rest }); }
  }
  return out;
}

/** A role with a new holder (the record only). */
export function withHolder(role: TMRecord, holder: Holder | null): TMRecord {
  const lb = role.ns === "real" ? "FACT" : "DEMO";
  return { ...role, values: { ...role.values, "team_role.holder": holder ? { state: "value", value: holder, label: lb } : { state: "unknown" } } };
}

export type HandoverError = "note_long" | "date_invalid" | "already_planned" | "already_someone";
export function validateHandover(p: { note: string; due: string }, view: Pick<RoleView, "planned" | "row">): HandoverError | null {
  if (view.planned) return "already_planned";
  if (view.row.holder === "someone") return "already_someone";
  if (p.note.trim().length > 200) return "note_long";
  if (p.due) { if (!DAY.test(p.due)) return "date_invalid"; const d = new Date(`${p.due}T00:00:00Z`); if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== p.due) return "date_invalid"; }
  return null;
}

/** Completing a hand-over: the plan is marked done (with the day), the role becomes "someone else", and the role's open steps leave the user's schedule. */
export function completeHandover(recs: readonly TMRecord[], handoverId: string, today: string): { puts: TMRecord[] } | null {
  const ho = recs.find((r) => r.id === handoverId && r.entity === "handover"); const roleId = ho?.links?.role;
  const role = roleId ? recs.find((r) => r.id === roleId && r.entity === "team_role") : undefined;
  if (!ho || !role || txt(ho.values["handover.status"]) === "done") return null;
  const lb = ho.ns === "real" ? "FACT" : "DEMO";
  const doneHo: TMRecord = { ...ho, values: { ...ho.values, "handover.status": { state: "value", value: "done", label: lb }, "handover.done_on": { state: "value", value: today, label: lb } } };
  const newRole = withHolder(role, "someone");
  const after = recs.map((r) => (r.id === role.id ? newRole : r));
  return { puts: [doneHo, newRole, ...syncDelegation(after, today)] };
}

// M18 visual layer, part 2 (pure): data for the drawn timeline, the task board (Kanban) and the option board. Everything is the person's own data.
// Unknown stays unknown: a goal with no date is listed as "no date yet", never placed on the line; no tasks means "no tasks", never a zero.
// Past dates are shown plainly (no red, no warning). Nothing is ordered by worth or compared.
import { goalIdsOf } from "./taskGoals";
import type { FieldValue, TMRecord } from "./types";
import { goalStatusOf, type GoalStatus } from "./goalStatus";
import type { PathFit, PathMatch } from "./assessment";

const str = (v: FieldValue | undefined): string | null => (v?.state === "value" && typeof v.value === "string" && v.value.trim() ? v.value.trim() : null);
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const validDay = (s: string | null): s is string => !!s && DAY.test(s) && new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s;
const days = (a: string, b: string) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);

// ---------------------------------------------------------------- timeline
export interface TimelineItem { id: string; ns: TMRecord["ns"]; title: string; date: string; status: GoalStatus; passed: boolean; /** 0 to 1 along the line */ at: number }
export interface Timeline { items: TimelineItem[]; undated: Array<{ id: string; title: string }>; start: string; end: string; todayAt: number }

/** Goals with a valid target date, on a line from the earliest of (today, first date) to the latest of (today, last date). Retired goals are left out; paused ones are marked. */
export function timeline(recs: readonly TMRecord[], today: string): Timeline {
  const goals = recs.filter((r) => r.entity === "goal" && goalStatusOf(r) !== "retired").flatMap((r) => {
    const title = str(r.values["goal.title"]); if (!title) return [];
    return [{ r, title, date: str(r.values["goal.target_date"]) }];
  });
  const dated = goals.filter((g) => validDay(g.date)) as Array<{ r: TMRecord; title: string; date: string }>;
  const undated = goals.filter((g) => !validDay(g.date)).map((g) => ({ id: g.r.id, title: g.title })).sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
  const all = [today, ...dated.map((g) => g.date)].sort();
  const start = all[0]!, end = all[all.length - 1]!; const span = Math.max(1, days(start, end));
  const at = (d: string) => (days(start, d) / span);
  const items = dated.map((g): TimelineItem => ({ id: g.r.id, ns: g.r.ns, title: g.title, date: g.date, status: goalStatusOf(g.r), passed: g.date < today, at: at(g.date) }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  return { items, undated, start, end, todayAt: at(today) };
}

// ---------------------------------------------------------------- task board
export const BOARD_COLUMNS = ["open", "parked", "delegated", "done"] as const;
export type BoardColumn = (typeof BOARD_COLUMNS)[number];
export interface BoardCard { id: string; ns: TMRecord["ns"]; title: string; goalId: string | null; goalTitle: string | null; /** every existing goal this step serves, by title */ goals: Array<{ id: string; title: string }>; doneOn: string | null }
export interface TaskBoard { columns: Record<BoardColumn, BoardCard[]>; totals: Record<BoardColumn, number>; hiddenDone: number; anyTask: boolean }
export const DONE_SHOWN = 12;

/** The column of a step comes from the fields the app already keeps: done, parked, delegated. Steps marked "not true" any more are left out. */
export function columnOf(r: TMRecord): BoardColumn | null {
  if (r.entity !== "task" || r.values["task.not_true_on"]?.state === "value") return null;
  if (r.values["task.done_on"]?.state === "value") return "done";
  if (r.values["task.parked_on"]?.state === "value") return "parked";
  if (r.values["task.delegated_on"]?.state === "value") return "delegated";
  return "open";
}
export function taskBoard(recs: readonly TMRecord[]): TaskBoard {
  const goals = new Map(recs.filter((r) => r.entity === "goal").map((g) => [g.id, str(g.values["goal.title"])] as const));
  const columns: Record<BoardColumn, BoardCard[]> = { open: [], parked: [], delegated: [], done: [] };
  for (const r of recs) {
    const col = columnOf(r); const title = str(r.values["task.title"]); if (!col || !title) continue;
    const ids = goalIdsOf(r); const gid = ids.find((x) => goals.has(x)) ?? ids[0] ?? null;
    const serves = ids.filter((x) => goals.has(x)).map((x) => ({ id: x, title: goals.get(x) ?? "" })).sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
    columns[col].push({ id: r.id, ns: r.ns, title, goalId: gid && goals.has(gid) ? gid : null, goalTitle: gid ? goals.get(gid) ?? null : null, goals: serves, doneOn: str(r.values["task.done_on"]) });
  }
  for (const c of BOARD_COLUMNS) columns[c].sort((a, b) => (c === "done" ? (b.doneOn ?? "").localeCompare(a.doneOn ?? "") : 0) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
  const totals = Object.fromEntries(BOARD_COLUMNS.map((c) => [c, columns[c].length])) as Record<BoardColumn, number>;
  const hiddenDone = Math.max(0, columns.done.length - DONE_SHOWN); columns.done = columns.done.slice(0, DONE_SHOWN);
  return { columns, totals, hiddenDone, anyTask: BOARD_COLUMNS.some((c) => totals[c] > 0) };
}

// ---------------------------------------------------------------- option board
export interface OptionColumn { id: string; match: PathMatch }
/** The paths that came up from the person's own words, side by side (at most the three the fit step keeps). No order number and no weight are carried over. */
export function optionBoard(fit: PathFit): OptionColumn[] { return fit.status === "matched" ? fit.matches.map((m) => ({ id: m.path.id, match: m })) : []; }

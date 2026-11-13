// Weekly review. Pure: counts come only from the user's own records for the last 7 calendar days (today included).
// Unknown is never 0: a measure with no record in the window is null. Counts only; nothing is compared.
import type { FieldValue, TMRecord } from "./types";

export const WEEK_DAYS = 7;
const pad = (n: number) => String(n).padStart(2, "0");
const dayOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const val = (v: FieldValue | undefined): unknown => (v && v.state === "value" ? v.value : undefined);

export function weekWindow(today: string): { from: string; to: string } {
  const [y, m, d] = today.split("-").map(Number);
  if (!y || !m || !d) throw new Error("today must be YYYY-MM-DD");
  return { from: dayOf(new Date(y, m - 1, d - (WEEK_DAYS - 1))), to: today };
}

export interface WeeklySummary {
  from: string; to: string;
  tasksDone: number | null;
  focusMinutes: number | null;
  focusUnknown: number;
  habitCheckins: number | null;
  journeyNotes: number | null;
  /** Own tasks not finished and not marked "no longer true". Shown as "still open", never as failed. Null when there are no tasks. */
  stillOpen: number | null;
}

const orNull = (n: number): number | null => (n > 0 ? n : null);

export function weeklySummary(recs: readonly TMRecord[], today: string): WeeklySummary {
  const { from, to } = weekWindow(today);
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
  const habitCheckins = recs.filter((r) => r.entity === "habit_log" && typeof val(r.values["habit_log.date"]) === "string" && inWin(String(val(r.values["habit_log.date"]))) && Number(val(r.values["habit_log.count"]) ?? 0) > 0).length;
  const journeyNotes = recs.filter((r) => (r.entity === "journey_log" || r.entity === "stage_pass") && Number.isFinite(Date.parse(r.createdAt)) && inWin(dayOf(new Date(r.createdAt)))).length;
  const tasks = recs.filter((r) => r.entity === "task");
  const open = tasks.filter((r) => typeof val(r.values["task.done_on"]) !== "string" && !val(r.values["task.not_true_on"]) && !val(r.values["task.parked_on"]) && !val(r.values["task.delegated_on"])).length;
  return { from, to, tasksDone: orNull(tasksDone), focusMinutes: known > 0 ? minutes : null, focusUnknown: unknown, habitCheckins: orNull(habitCheckins), journeyNotes: orNull(journeyNotes), stillOpen: tasks.length ? open : null };
}

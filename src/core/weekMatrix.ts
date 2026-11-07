// Q-06: the last 7 days of each habit under the weekly counts. Pure. Planned days only can be "open"; a day that was not planned
// (or came before the habit existed) is "none": it shows nothing and is never a miss. No habits at all = null (Unknown), never 0.
import { habitRange, type PeriodState } from "./chartData";
import { todayIso, type Habit, type Log } from "./habits";
import type { TMRecord } from "./types";

export type DayState = "done" | "open" | "none";
export interface MatrixRow { id: string; title: string; days: Array<{ date: string; state: DayState }> }

const val = (r: TMRecord, k: string): unknown => { const v = r.values[k]; return v && v.state === "value" ? v.value : undefined; };

export function weekHabitMatrix(recs: readonly TMRecord[], today: string): MatrixRow[] | null {
  const habits: Habit[] = recs.filter((r) => r.entity === "habit" && typeof val(r, "habit.title") === "string").sort((a, b) => a.id.localeCompare(b.id)).map((r) => ({
    id: r.id, title: String(val(r, "habit.title")), days: String(val(r, "habit.days") ?? "0,1,2,3,4,5,6").split(",").filter((x) => x !== "").map(Number),
    target: typeof val(r, "habit.target") === "number" && (val(r, "habit.target") as number) > 0 ? (val(r, "habit.target") as number) : null, unit: String(val(r, "habit.unit") ?? "") }));
  if (!habits.length) return null;
  const logs: Log[] = recs.filter((r) => r.entity === "habit_log").map((r) => ({ habitId: r.links?.habit ?? "", date: String(val(r, "habit_log.date")), count: Number(val(r, "habit_log.count") ?? 0) }));
  const rec = new Map(recs.filter((r) => r.entity === "habit").map((r) => [r.id, r] as const));
  return habits.map((hb) => {
    const made = rec.get(hb.id)?.createdAt; const since = made && Number.isFinite(Date.parse(made)) ? todayIso(new Date(made)) : null;
    const days = habitRange(hb, logs, today, "days31", since).slice(-7).map((p) => ({ date: p.from, state: toDay(p.state) }));
    return { id: hb.id, title: hb.title, days };
  });
}
const toDay = (s: PeriodState): DayState => (s === "full" ? "done" : s === "open" ? "open" : "none");

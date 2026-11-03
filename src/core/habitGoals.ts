// Habits are traced to goals, never counted in any percent (multi-goal ruling). Pure. Unknown is never 0: a habit with no check-in at all is "no check-ins yet".
import { goalIdsOf } from "./taskGoals";
import type { TMRecord } from "./types";

export interface HabitLine { id: string; title: string; planned: number; done: number; started: boolean }
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const txt = (r: TMRecord, k: string): string | null => { const v = r.values[k]; return v?.state === "value" && typeof v.value === "string" ? v.value : null; };

/** Habits that serve any of `nodeIds`, with this week's planned days (last 7 days up to `today`) and the days with a check-in. `started` = at least one check-in ever. */
export function habitLines(recs: readonly TMRecord[], nodeIds: ReadonlySet<string>, today: string): HabitLine[] {
  const [y, m, d] = today.split("-").map(Number); const week = Array.from({ length: 7 }, (_, i) => iso(new Date(y!, m! - 1, d! - i)));
  const logs = recs.filter((r) => r.entity === "habit_log" && r.links?.habit);
  return recs.filter((r) => r.entity === "habit" && txt(r, "habit.title") && goalIdsOf(r).some((g) => nodeIds.has(g))).sort((a, b) => a.id.localeCompare(b.id)).map((h) => {
    const days = (txt(h, "habit.days") ?? "0,1,2,3,4,5,6").split(",").filter((x) => x !== "").map(Number);
    const mine = logs.filter((l) => l.links!.habit === h.id).map((l) => ({ date: txt(l, "habit_log.date") ?? "", count: Number((l.values["habit_log.count"] as { value?: unknown } | undefined)?.value ?? 0) })).filter((l) => l.count > 0);
    const planned = week.filter((dt) => { const [yy, mm, dd] = dt.split("-").map(Number); return days.includes(new Date(yy!, mm! - 1, dd!).getDay()); });
    return { id: h.id, title: txt(h, "habit.title")!, planned: planned.length, done: planned.filter((dt) => mine.some((l) => l.date === dt)).length, started: mine.length > 0 };
  });
}

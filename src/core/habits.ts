// Habits without shame: no run-counts, no best-ever, no one overall number. Only "x of y planned days" and a gentle restart plan.
export interface Habit { id: string; title: string; days: number[]; target: number | null; unit: string }
export interface Log { habitId: string; date: string; count: number }

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const parseIso = (s: string): Date => { const [y, m, d] = s.split("-").map(Number); return new Date(y!, m! - 1, d!); };
export const addDays = (s: string, n: number): string => { const d = parseIso(s); d.setDate(d.getDate() + n); return iso(d); };
export const todayIso = (now = new Date()) => iso(now);

export const isPlanned = (h: Habit, date: string): boolean => h.days.includes(parseIso(date).getDay());
/** Done = a log exists and (no target, or count reaches the target). */
export function isDone(h: Habit, logs: Log[], date: string): boolean {
  const l = logs.find((x) => x.habitId === h.id && x.date === date);
  return !!l && (h.target === null ? l.count >= 1 : l.count >= h.target);
}
export const countOn = (h: Habit, logs: Log[], date: string): number => logs.find((x) => x.habitId === h.id && x.date === date)?.count ?? 0;

export interface Consistency { done: number; planned: number; pct: number | null }
/** Planned days in [from..to] that are done. No planned days → pct null (unknown, not 0%). Future days are never counted. */
export function consistency(h: Habit, logs: Log[], from: string, to: string, today: string): Consistency {
  let done = 0, planned = 0;
  for (let d = from; d <= to && d <= today; d = addDays(d, 1)) if (isPlanned(h, d)) { planned++; if (isDone(h, logs, d)) done++; }
  return { done, planned, pct: planned ? Math.round((done / planned) * 100) : null };
}

export type Restart = "none" | "smallest_version";
/** If the last two planned days (before today) were both missed, offer the smallest version — kindly, never as a failure. */
export function restartPlan(h: Habit, logs: Log[], today: string): Restart {
  const missed: boolean[] = [];
  for (let d = addDays(today, -1), i = 0; i < 21 && missed.length < 2; d = addDays(d, -1), i++) if (isPlanned(h, d)) missed.push(!isDone(h, logs, d));
  return missed.length === 2 && missed.every(Boolean) ? "smallest_version" : "none";
}
/** Backfill is allowed for the past only. */
export const canLog = (date: string, today: string) => date <= today;

// Small per-device memory for batch 1 (key tm:ui:qb1, owned by the "welcome" settings row). Parsers fail closed: a broken value is treated as "nothing chosen".
export const WAY_OPTIONS = ["time", "energy", "unclear", "interrupt", "other"] as const;
export type WayPick = typeof WAY_OPTIONS[number] | "skip";
export interface Qb1Prefs {
  /** Q-06: the answer to "what got in the way", for the week that starts on `week` (YYYY-MM-DD). Replaced each week; nothing is kept as history. */
  way: { week: string; pick: WayPick } | null;
  /** Q-07: lever ids whose topic card the user opened ("kept"). */
  kept: string[];
}
/** Monday (YYYY-MM-DD) of the calendar week that holds `today`. The answer belongs to that week, so it resets on its own on Monday. */
export function weekStart(today: string): string {
  const [y, m, d] = today.split("-").map(Number); const dt = new Date(y!, m! - 1, d!); dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}
export const EMPTY_QB1: Qb1Prefs = { way: null, kept: [] };
const isPick = (v: unknown): v is WayPick => v === "skip" || (WAY_OPTIONS as readonly unknown[]).includes(v);

export function parseQb1(raw: unknown): Qb1Prefs {
  if (typeof raw !== "object" || raw === null) return { way: null, kept: [] };
  const o = raw as Record<string, unknown>; const w = o.way as Record<string, unknown> | null | undefined;
  const way = w && typeof w.week === "string" && /^\d{4}-\d{2}-\d{2}$/.test(w.week) && isPick(w.pick) ? { week: w.week, pick: w.pick } : null;
  const kept = Array.isArray(o.kept) ? [...new Set(o.kept.filter((x): x is string => typeof x === "string" && /^[a-z0-9_-]{1,40}$/i.test(x)))].slice(0, 40) : [];
  return { way, kept };
}

// Welcome back (audit M2) and monthly then-vs-now. Pure. Own records only. Unknown is never 0: a first visit, a bad date or an empty
// month shows nothing instead of "0 days" or "0 steps". Wording stays calm: nothing is counted against the person, nothing is late or missed.
import { monthlySummary } from "./monthlyReview";
import type { FieldValue, TMRecord } from "./types";

export const AWAY_DAYS = 3;
export interface Visit { lastOpen: string | null; welcome: WelcomeState | null }
export interface WelcomeState { day: string; away: number; last: string; dismissed: boolean }

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const utc = (iso: string): number => { const [y, m, d] = iso.split("-").map(Number); return Date.UTC(y!, m! - 1, d!); };
export const daysBetween = (a: string, b: string): number => Math.round((utc(b) - utc(a)) / 86400000);
const shift = (iso: string, n: number): string => { const d = new Date(utc(iso) + n * 86400000); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`; };

export function parseVisit(raw: unknown): Visit {
  const o = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const lastOpen = typeof o.lastOpen === "string" && ISO.test(o.lastOpen) ? o.lastOpen : null;
  const w = o.welcome as Record<string, unknown> | null | undefined;
  const welcome = w && typeof w.day === "string" && ISO.test(w.day) && typeof w.last === "string" && ISO.test(w.last) && Number.isInteger(w.away) && Number(w.away) >= AWAY_DAYS
    ? { day: w.day, away: Number(w.away), last: w.last, dismissed: w.dismissed === true } : null;
  return { lastOpen, welcome };
}

/** One call per app open. The first visit of a new day decides whether to welcome the person back; later calls the same day change nothing. */
export function stepVisit(v: Visit, today: string): Visit {
  if (!ISO.test(today)) return v;
  if (v.lastOpen === today) return v;
  if (v.lastOpen === null) return { lastOpen: today, welcome: null }; // first visit: nothing is known about an absence
  const away = daysBetween(v.lastOpen, today);
  return { lastOpen: today, welcome: away >= AWAY_DAYS ? { day: today, away, last: v.lastOpen, dismissed: false } : null };
}
/** The card shows on the day it was decided, until it is dismissed. */
export const showWelcome = (v: Visit, today: string): WelcomeState | null => (v.welcome && v.welcome.day === today && !v.welcome.dismissed ? v.welcome : null);
export const dismissWelcome = (v: Visit): Visit => (v.welcome ? { ...v, welcome: { ...v.welcome, dismissed: true } } : v);

const val = (v: FieldValue | undefined): unknown => (v && v.state === "value" ? v.value : undefined);
export interface WelcomeFacts { openSteps: number | null; nextStep: string | null }
/** From the user's own steps: how many are still open and the oldest open one by name. No steps recorded = null (not 0). */
export function welcomeFacts(recs: readonly TMRecord[]): WelcomeFacts {
  const tasks = recs.filter((r) => r.entity === "task");
  if (!tasks.length) return { openSteps: null, nextStep: null };
  const open = tasks.filter((r) => typeof val(r.values["task.done_on"]) !== "string").sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id < b.id ? -1 : 1));
  const title = open.map((r) => val(r.values["task.title"])).find((x): x is string => typeof x === "string" && x.trim().length > 0) ?? null;
  return { openSteps: open.length, nextStep: title ? title.trim().slice(0, 80) : null };
}

// ------------------------------------------------------------------ monthly then vs now
export type Measure = "tasks" | "focus" | "habits" | "notes";
export type Relation = "more" | "same" | "less";
export interface ThenNowRow { id: Measure; then: number | null; now: number | null; relation: Relation | null }
export interface ThenNow { thenFrom: string; thenTo: string; nowFrom: string; nowTo: string; rows: ThenNowRow[]; anyThen: boolean }

const rel = (then: number | null, now: number | null): Relation | null => {
  if (then === null || now === null) return null;
  const hi = Math.max(then, now); if (hi === 0 || Math.abs(now - then) / hi < 0.1) return "same";
  return now > then ? "more" : "less";
};
/** The last 30 days next to the 30 days before. A side with no record is null (shown as "not recorded"), and no comparison is made then. */
export function thenVsNow(recs: readonly TMRecord[], today: string): ThenNow {
  const now = monthlySummary(recs, today), then = monthlySummary(recs, shift(today, -30));
  const rows: ThenNowRow[] = ([["tasks", then.tasksDone, now.tasksDone], ["focus", then.focusMinutes, now.focusMinutes], ["habits", then.habitCheckins, now.habitCheckins], ["notes", then.journeyNotes, now.journeyNotes]] as const)
    .map(([id, a, b]) => ({ id, then: a, now: b, relation: rel(a, b) }));
  return { thenFrom: then.from, thenTo: then.to, nowFrom: now.from, nowTo: now.to, rows, anyThen: rows.some((r) => r.then !== null) };
}

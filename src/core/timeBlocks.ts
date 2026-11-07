// M08 time blocks: prayer, family, rest, work and other committed time placed in the schedule as blocks tasks never enter. Pure.
// Prayer blocks are TIMES ONLY: each prayer time worked out on this phone (src/core/prayer.ts) plus a length in minutes the user types.
// The documents give no length, so none is assumed: with no length typed there is no prayer block. No scripture text.
// Other kinds use a daily window the user types. Hours a week are the user's own number; Unknown is never 0.
import { PRAYER_KEYS, prayerTimes, type CalDate, type Coords, type PrayerKey, type PrayerTimes } from "./prayer";
import type { PrayerSettings } from "./prayerMethod";
import type { Block } from "./planner";
import { parseClock } from "./planInputs";
import type { FieldValue, TMRecord } from "./types";

export const BLOCK_KINDS = ["prayer", "family", "rest", "work", "other"] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];
export const MAX_PRAYER_MINUTES = 240;

const val = (v: FieldValue | undefined): unknown => (v && v.state === "value" ? v.value : undefined);
const numv = (v: FieldValue | undefined): number | null => { const x = val(v); return typeof x === "number" && Number.isFinite(x) ? x : null; };
const strv = (v: FieldValue | undefined): string | null => { const x = val(v); return typeof x === "string" && x.trim() ? x.trim() : null; };

export interface CommitRow { id: string; ns: TMRecord["ns"]; kind: BlockKind; hoursPerWeek: number | null; from: number | null; to: number | null; prayerMinutes: number | null; fromDiary: boolean }

/** The user's committed time: rows added on the Plan screen, plus the kind and hours typed in the diary (intake step 4). */
export function commitRows(recs: readonly TMRecord[]): CommitRow[] {
  const out: CommitRow[] = [];
  for (const r of recs) {
    if (r.entity !== "constraint") continue;
    const k = strv(r.values["constraint.kind"]);
    if (!k || !(BLOCK_KINDS as readonly string[]).includes(k)) continue;
    const hrs = numv(r.values["constraint.hours_per_week"]);
    const from = ((s) => (s === null ? null : parseClock(s)))(strv(r.values["constraint.block_from"])), to = ((s) => (s === null ? null : parseClock(s)))(strv(r.values["constraint.block_to"]));
    const pm = numv(r.values["constraint.block_minutes"]);
    out.push({ id: r.id, ns: r.ns, kind: k as BlockKind, hoursPerWeek: hrs !== null && hrs >= 0 && hrs <= 168 ? hrs : null,
      from: from !== null && to !== null && to > from ? from : null, to: from !== null && to !== null && to > from ? to : null,
      prayerMinutes: pm !== null && pm > 0 && pm <= MAX_PRAYER_MINUTES ? Math.round(pm) : null, fromDiary: r.id.startsWith("intake-") });
  }
  return out.sort((a, b) => (a.fromDiary === b.fromDiary ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : a.fromDiary ? -1 : 1));
}

export interface TimeBlock { kind: BlockKind; day: number; start: number; end: number; prayer: PrayerKey | null; rowId: string; date: string }
export interface WeekBlocks { blocks: TimeBlock[]; /** prayer times that could not be worked out (no block is made for them) */ unknownPrayer: number }
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Blocks for the 7 days from `from` (a calendar date). A weekday occurs once, so a block carries the weekday the planner uses. */
export function weekBlocks(rows: readonly CommitRow[], from: CalDate, coords: Coords, settings: PrayerSettings, days = 7, timesFor?: (d: CalDate) => PrayerTimes): WeekBlocks {
  const blocks: TimeBlock[] = []; let unknownPrayer = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(from.y, from.m - 1, from.d + i); const cd: CalDate = { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }; const day = d.getDay();
    let times: ReturnType<typeof prayerTimes> | null = null;
    for (const r of rows) {
      if (r.kind === "prayer" && r.prayerMinutes !== null) {
        times ??= timesFor ? timesFor(cd) : prayerTimes(cd, coords, settings);
        for (const k of PRAYER_KEYS) {
          const at = times[k]; if (at === null) { unknownPrayer++; continue; }
          blocks.push({ kind: "prayer", day, start: at, end: Math.min(1440, at + r.prayerMinutes), prayer: k, rowId: r.id, date: iso(d) });
        }
      } else if (r.from !== null && r.to !== null) blocks.push({ kind: r.kind, day, start: r.from, end: r.to, prayer: null, rowId: r.id, date: iso(d) });
    }
  }
  return { blocks: blocks.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.start - b.start)), unknownPrayer };
}
export const toPlannerBlocks = (bs: readonly TimeBlock[]): Block[] => bs.map((b) => ({ day: b.day, start: b.start, end: b.end }));

// ------------------------------------------------------------------ the weekly time budget
export interface Budget {
  /** known hours per kind, and how many rows of that kind have no hours typed */
  byKind: Array<{ kind: BlockKind; hours: number; unknownRows: number }>;
  committedHours: number; unknownRows: number;
  freeHours: number | null;
  /** committed + free hours more than the 168 hours of a week; null when it cannot be told */
  over: boolean | null;
}
export function weeklyBudget(rows: readonly CommitRow[], freeHours: number | null): Budget {
  const byKind = BLOCK_KINDS.flatMap((kind) => {
    const mine = rows.filter((r) => r.kind === kind && (r.hoursPerWeek !== null || r.from !== null || r.prayerMinutes !== null || r.fromDiary));
    if (!mine.length) return [];
    return [{ kind, hours: mine.reduce((s, r) => s + (r.hoursPerWeek ?? 0), 0), unknownRows: mine.filter((r) => r.hoursPerWeek === null).length }];
  });
  const committedHours = byKind.reduce((s, k) => s + k.hours, 0), unknownRows = byKind.reduce((s, k) => s + k.unknownRows, 0);
  const anyKnown = rows.some((r) => r.hoursPerWeek !== null);
  return { byKind, committedHours, unknownRows, freeHours, over: !anyKnown || freeHours === null ? null : committedHours + freeHours > 168 };
}

export type CommitError = "kind_required" | "hours_invalid" | "window_pair" | "window_order" | "window_invalid" | "minutes_required" | "minutes_invalid" | "nothing";
/** A prayer row needs the minutes kept free at each prayer; any other row needs hours, a daily window, or both (a window needs both ends). */
export function validateCommit(p: { kind: string; hours: string; from: string; to: string; minutes: string }): CommitError | null {
  if (!(BLOCK_KINDS as readonly string[]).includes(p.kind)) return "kind_required";
  const clean = (s: string) => s.trim().replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6));
  if (clean(p.hours) !== "") { const n = Number(clean(p.hours)); if (!Number.isFinite(n) || n < 0 || n > 168) return "hours_invalid"; }
  if (p.kind === "prayer") {
    if (clean(p.minutes) === "") return "minutes_required";
    const n = Number(clean(p.minutes)); return Number.isFinite(n) && n >= 1 && n <= MAX_PRAYER_MINUTES && Number.isInteger(n) ? null : "minutes_invalid";
  }
  const f = p.from.trim(), t = p.to.trim();
  if (!!f !== !!t) return "window_pair";
  if (f && t) { const a = parseClock(f), b = parseClock(t); if (a === null || b === null) return "window_invalid"; if (b <= a) return "window_order"; }
  if (clean(p.hours) === "" && !f) return "nothing";
  return null;
}

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

// ------------------------------------------------------------------ W3 optional work blocks (BUILD-01, TM-REQ-040)
// A work block is time the USER blocks for their own work, by hand. The app never creates one by itself, never forces a prayer block
// (prayer times stay information), and never moves a block or a task. A block keeps the planner free only when the user marks it "protected".
export const REPEATS = ["none", "daily", "weekdays", "weekly"] as const;
export type Repeat = (typeof REPEATS)[number];
export const MAX_LABEL = 60;
export interface WorkBlock {
  id: string; ns: TMRecord["ns"];
  /** the day of the block, or the first day of a repeat: YYYY-MM-DD (local) */
  date: string; start: number; end: number; label: string | null; repeat: Repeat;
  /** id of a goal record, or null (not linked) */
  goalId: string | null;
  /** true: the planner treats this time as busy. Default false. */
  protectedBlock: boolean;
}
export interface WorkOcc { blockId: string; date: string; day: number; start: number; end: number; label: string | null; goalId: string | null; protectedBlock: boolean }

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
export const isoOf = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** A real calendar date or null. */
export function parseIsoDate(s: string): Date | null {
  const m = ISO.exec(s.trim()); if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]) ? d : null;
}

/** Reads one `work_block` record. A record without a valid date, a valid window or a repeat is skipped (null). */
export function workBlockFromRecord(r: TMRecord): WorkBlock | null {
  if (r.entity !== "work_block") return null;
  const date = strv(r.values["work_block.date"]); const f = strv(r.values["work_block.from"]), t = strv(r.values["work_block.to"]);
  const rep = strv(r.values["work_block.repeat"]); const label = strv(r.values["work_block.label"]); const goal = strv(r.values["work_block.goal"]);
  if (!date || !parseIsoDate(date) || !f || !t) return null;
  const start = parseClock(f), end = parseClock(t);
  if (start === null || end === null || end <= start) return null;
  return { id: r.id, ns: r.ns, date, start, end, label: label ? label.slice(0, MAX_LABEL) : null,
    repeat: (REPEATS as readonly string[]).includes(rep ?? "") ? (rep as Repeat) : "none", goalId: goal, protectedBlock: val(r.values["work_block.protected"]) === true };
}
export const workBlocksFromRecords = (recs: readonly TMRecord[]): WorkBlock[] =>
  recs.map(workBlockFromRecord).filter((x): x is WorkBlock => x !== null).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.start - b.start || (a.id < b.id ? -1 : 1)));

const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
/** The stored record. Only what the user gave is written: no label stays absent, no goal stays "not linked" (unknown). */
export function workBlockRecord(p: { id: string; ns: TMRecord["ns"]; ownerId: string; schemaVersion: number; createdAt: string; b: Omit<WorkBlock, "id" | "ns"> }): TMRecord {
  const lab = p.ns === "real" ? "FACT" : "DEMO";
  const dv = (value: unknown): FieldValue => ({ state: "value", value, label: lab });
  const values: Record<string, FieldValue> = { "work_block.date": dv(p.b.date), "work_block.from": dv(clock(p.b.start)), "work_block.to": dv(clock(p.b.end)), "work_block.repeat": dv(p.b.repeat), "work_block.protected": dv(p.b.protectedBlock) };
  if (p.b.label) values["work_block.label"] = dv(p.b.label.slice(0, MAX_LABEL));
  if (p.b.goalId) values["work_block.goal"] = dv(p.b.goalId);
  return { id: p.id, entity: "work_block", ns: p.ns, ownerId: p.ownerId, schemaVersion: p.schemaVersion, createdAt: p.createdAt, values, ...(p.b.goalId ? { links: { goal: p.b.goalId } } : {}) };
}

/** Every occurrence from `fromIso` for `days` days. A repeat never starts before its first date. Pure and deterministic. */
export function expandWorkBlocks(blocks: readonly WorkBlock[], fromIso: string, days: number): WorkOcc[] {
  const from = parseIsoDate(fromIso); if (!from) return [];
  const out: WorkOcc[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i); const date = isoOf(d), day = d.getDay();
    for (const b of blocks) {
      if (date < b.date) continue;
      const first = parseIsoDate(b.date)!;
      const hit = b.repeat === "none" ? date === b.date : b.repeat === "daily" ? true : b.repeat === "weekdays" ? day >= 1 && day <= 5 : day === first.getDay();
      if (hit) out.push({ blockId: b.id, date, day, start: b.start, end: b.end, label: b.label, goalId: b.goalId, protectedBlock: b.protectedBlock });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.start - b.start || (a.blockId < b.blockId ? -1 : 1)));
}

/** Only protected occurrences keep the planner out. Everything else is just a mark on the calendar. */
export const protectedPlannerBlocks = (occs: readonly WorkOcc[]): Block[] => occs.filter((o) => o.protectedBlock).map((o) => ({ day: o.day, start: o.start, end: o.end }));

export interface Overlap { blockId: string; date: string; with: "work" | "committed"; otherId: string }
/** Pairs that overlap on the same date: work blocks with each other, and work blocks with the committed time the user typed. A warning only; nothing moves. */
export function workOverlaps(occs: readonly WorkOcc[], committed: readonly TimeBlock[]): Overlap[] {
  const out: Overlap[] = []; const hit = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1;
  for (let i = 0; i < occs.length; i++) {
    const a = occs[i]!;
    for (let j = i + 1; j < occs.length; j++) {
      const b = occs[j]!;
      if (a.date === b.date && a.blockId !== b.blockId && hit(a.start, a.end, b.start, b.end)) {
        out.push({ blockId: a.blockId, date: a.date, with: "work", otherId: b.blockId }); out.push({ blockId: b.blockId, date: a.date, with: "work", otherId: a.blockId });
      }
    }
    for (const c of committed) if (c.date === a.date && hit(a.start, a.end, c.start, c.end)) out.push({ blockId: a.blockId, date: a.date, with: "committed", otherId: c.rowId });
  }
  return out;
}

export type WorkBlockError = "date_invalid" | "window_required" | "window_invalid" | "window_order" | "label_long" | "repeat_invalid";
export function validateWorkBlock(p: { date: string; from: string; to: string; label: string; repeat: string }): WorkBlockError | null {
  if (!parseIsoDate(p.date)) return "date_invalid";
  if (!(REPEATS as readonly string[]).includes(p.repeat)) return "repeat_invalid";
  if (!p.from.trim() || !p.to.trim()) return "window_required";
  const a = parseClock(p.from.trim()), b = parseClock(p.to.trim());
  if (a === null || b === null) return "window_invalid";
  if (b <= a) return "window_order";
  if (p.label.trim().length > MAX_LABEL) return "label_long";
  return null;
}

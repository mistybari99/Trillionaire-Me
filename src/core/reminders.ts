// Reminders (docs/design/reminders-final-decision.md). Pure: no UI, no network, no clock of its own (every function takes `nowMs`).
// A reminder is tied to one existing item (task, plan step, habit, bill, goal, review). It never copies the item's title or time.
// Honest limit: nothing here can wake a closed web app. The delivery adapter shows reminders while the app is open;
// the phone calendar file (src/core/ics.ts) is the reliable route when the app is closed.
import type { PrivacyClass } from "../catalog/types";
import type { Bi } from "../i18n/registry";
import type { CapacityMode } from "./planner";
import { buildNotification, type NotifyPrefs } from "./notify";
import { dhakaNow, isoDate, type CalDate } from "./prayer";
import type { FieldValue, TMRecord } from "./types";

export const REMINDER_TARGETS = ["task", "plan_step", "habit", "bill", "goal", "review"] as const;
export type ReminderTarget = (typeof REMINDER_TARGETS)[number];
export type ReminderState = "on" | "done" | "skipped";

/** One stored reminder, read from a `reminder` record. */
export interface Reminder {
  id: string;
  target: ReminderTarget;
  targetId: string;
  /** local Dhaka "YYYY-MM-DDTHH:MM"; task, plan_step, review */
  at: string | null;
  /** "HH:MM"; habit, bill, goal */
  timeOfDay: string | null;
  /** bill and goal only: 0 = on the day, 1 = the day before */
  leadDays: 0 | 1;
  state: ReminderState;
  snoozedUntil: string | null;
}

export interface ReminderPrefs {
  master: boolean;
  /** remind at the start of each planned step */
  planStart: boolean;
  /** minutes before a planned step: 0 or 10 */
  planLead: 0 | 10;
  quiet: { from: string; to: string };
  defaultTime: string;
}
export const DEFAULT_REMINDER_PREFS: ReminderPrefs = { master: false, planStart: false, planLead: 0, quiet: { from: "22:00", to: "07:00" }, defaultTime: "09:00" };

export const MAX_PER_DAY = 6;
export const MERGE_MINUTES = 15;
export const PRAYER_SPACING_MIN = 3;
/** a due reminder is shown if the app notices it inside this window; later it moves to the missed card */
export const DUE_WINDOW_MIN = 5;
export const MISSED_KEEP_MS = { plan_step: 24 * 3600_000, other: 7 * 24 * 3600_000 } as const;
export const LEDGER_KEEP_MS = 7 * 24 * 3600_000;

const MIN = 60_000;
const DHAKA_OFFSET_MS = 6 * 3600_000;
export const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const AT = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d)$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const hhmmToMin = (s: string): number => { const m = HHMM.exec(s); return m ? Number(m[1]) * 60 + Number(m[2]) : NaN; };
export const minToHhmm = (n: number): string => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

/** Epoch ms of a Dhaka date and minute-of-day. */
export const dhakaMs = (date: string, minute: number): number => {
  const m = ISO_DATE.exec(date); if (!m) return NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, minute) - DHAKA_OFFSET_MS;
};
const dateMinuteOf = (ms: number): { date: string; minute: number } => { const n = dhakaNow(ms); return { date: isoDate(n.date), minute: n.minute }; };
export const addDaysIso = (date: string, n: number): string => { const ms = dhakaMs(date, 12 * 60); return isoDate(dhakaNow(ms + n * 86400_000).date); };
/** 0 = Sunday, like the habit day list. */
export const weekdayOf = (date: string): number => new Date(dhakaMs(date, 12 * 60) + DHAKA_OFFSET_MS).getUTCDay();
/** "YYYY-MM-DDTHH:MM" in Dhaka time to epoch ms, or NaN. */
export const atToMs = (at: string): number => { const m = AT.exec(at); return m ? dhakaMs(`${m[1]}-${m[2]}-${m[3]}`, Number(m[4]) * 60 + Number(m[5])) : NaN; };
export const msToAt = (ms: number): string => { const x = dateMinuteOf(ms); return `${x.date}T${minToHhmm(x.minute)}`; };

// ---------------------------------------------------------------- prefs (fail closed)

/** Safe read of the stored preferences. Master is on only when it is exactly `true`; anything odd falls back to the default. */
export function parseReminderPrefs(raw: unknown): ReminderPrefs {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const q = (typeof r.quiet === "object" && r.quiet !== null ? r.quiet : {}) as Record<string, unknown>;
  const time = (v: unknown, d: string) => (typeof v === "string" && HHMM.test(v) ? v : d);
  return {
    master: r.master === true, planStart: r.planStart === true, planLead: r.planLead === 10 ? 10 : 0,
    quiet: { from: time(q.from, DEFAULT_REMINDER_PREFS.quiet.from), to: time(q.to, DEFAULT_REMINDER_PREFS.quiet.to) },
    defaultTime: time(r.defaultTime, DEFAULT_REMINDER_PREFS.defaultTime),
  };
}

// ---------------------------------------------------------------- records

const str = (v: FieldValue | undefined): string | null => (v && v.state === "value" && typeof v.value === "string" && v.value.trim() ? v.value.trim() : null);
/** Reads one `reminder` record. A record with no valid target is skipped (null). */
export function reminderFromRecord(r: TMRecord): Reminder | null {
  if (r.entity !== "reminder") return null;
  const target = str(r.values["reminder.target_entity"]) as ReminderTarget | null;
  const targetId = str(r.values["reminder.target_id"]);
  if (!target || !targetId || !(REMINDER_TARGETS as readonly string[]).includes(target)) return null;
  const st = str(r.values["reminder.state"]);
  const lead = r.values["reminder.lead_days"];
  const tod = str(r.values["reminder.time_of_day"]);
  const at = str(r.values["reminder.at"]); const sn = str(r.values["reminder.snoozed_until"]);
  return {
    id: r.id, target, targetId, at: at && AT.test(at) ? at : null, timeOfDay: tod && HHMM.test(tod) ? tod : null,
    leadDays: lead && lead.state === "value" && lead.value === 1 ? 1 : 0,
    state: st === "done" || st === "skipped" ? st : "on", snoozedUntil: sn && AT.test(sn) ? sn : null,
  };
}
export const remindersFromRecords = (recs: readonly TMRecord[]): Reminder[] => recs.map(reminderFromRecord).filter((x): x is Reminder => x !== null);

const dv = (value: unknown, ns: TMRecord["ns"]): FieldValue => ({ state: "value", value, label: ns === "real" ? "FACT" : "DEMO" });
/** Builds the stored record. Only the fields that apply to the target are written; a missing time stays absent (unknown), never "now". */
export function reminderRecord(p: { id: string; ns: TMRecord["ns"]; ownerId: string; schemaVersion: number; createdAt: string; r: Omit<Reminder, "id"> }): TMRecord {
  const { r, ns } = p;
  const values: Record<string, FieldValue> = {
    "reminder.target_entity": dv(r.target, ns), "reminder.target_id": dv(r.targetId, ns), "reminder.state": dv(r.state, ns),
  };
  if (r.at) values["reminder.at"] = dv(r.at, ns);
  if (r.timeOfDay) values["reminder.time_of_day"] = dv(r.timeOfDay, ns);
  if (r.target === "bill" || r.target === "goal") values["reminder.lead_days"] = dv(r.leadDays, ns);
  if (r.snoozedUntil) values["reminder.snoozed_until"] = dv(r.snoozedUntil, ns);
  return { id: p.id, entity: "reminder", ns, ownerId: p.ownerId, schemaVersion: p.schemaVersion, createdAt: p.createdAt, values, links: { target: r.targetId } };
}
/** The record with new reminder fields merged in (used by snooze, done and skip). */
export function withReminder(rec: TMRecord, next: Reminder): TMRecord {
  const base = reminderRecord({ id: rec.id, ns: rec.ns, ownerId: rec.ownerId, schemaVersion: rec.schemaVersion, createdAt: rec.createdAt, r: next });
  return { ...rec, values: base.values };
}

// ---------------------------------------------------------------- targets (looked up by the caller; nothing is copied)

export interface TargetInfo {
  title: string;
  privacy: PrivacyClass;
  /** bill and goal: the item's own date "YYYY-MM-DD", or null when unknown (then no reminder fires) */
  date: string | null;
  /** habit: weekdays 0..6 (Sunday = 0) */
  days: number[];
  /** plan_step: where the planner placed it, or null; `deferred` is true for needs_estimate, no_room, paused */
  placed: { date: string; minute: number } | null;
  deferred: boolean;
}
export type TargetLookup = (target: ReminderTarget, id: string) => TargetInfo | null;

/** One moment a reminder may fire. `when` is epoch ms; `date`/`minute` are the Dhaka view of it. */
export interface Slot {
  id: string; reminderId: string; target: ReminderTarget; targetId: string; title: string; privacy: PrivacyClass;
  when: number; date: string; minute: number; snooze: boolean;
}

const slot = (rem: Reminder, info: TargetInfo, date: string, minute: number, suffix = ""): Slot | null => {
  const when = dhakaMs(date, minute); if (!Number.isFinite(when)) return null;
  return { id: `${rem.id}:${date}${suffix}`, reminderId: rem.id, target: rem.target, targetId: rem.targetId, title: info.title, privacy: info.privacy, when, date, minute, snooze: suffix !== "" };
};

/** Every slot of every reminder whose Dhaka date is in [from, to]. A reminder that is not on, or whose item has no date, gives none. */
export function expandReminders(list: readonly Reminder[], from: string, to: string, prefs: ReminderPrefs, lookup: TargetLookup): Slot[] {
  const out: Slot[] = [];
  const inRange = (d: string) => d >= from && d <= to;
  const defMin = hhmmToMin(prefs.defaultTime);
  for (const rem of list) {
    const info = lookup(rem.target, rem.targetId);
    if (!info) continue;
    // A snooze is one extra slot at the new time. The first slot is closed in the ledger when the person snoozes it.
    if (rem.snoozedUntil) {
      const ms = atToMs(rem.snoozedUntil);
      if (Number.isFinite(ms)) { const x = dateMinuteOf(ms); const s = rem.state === "on" && inRange(x.date) ? slot(rem, info, x.date, x.minute, `~z${x.minute}`) : null; if (s) out.push(s); }
    }
    if (rem.state !== "on") continue;
    const add = (date: string, minute: number) => { if (!inRange(date)) return; const s = slot(rem, info, date, minute); if (s) out.push(s); };
    if (rem.target === "task" || rem.target === "review") {
      if (!rem.at) continue; const ms = atToMs(rem.at); if (!Number.isFinite(ms)) continue; const x = dateMinuteOf(ms); add(x.date, x.minute);
    } else if (rem.target === "plan_step") {
      if (info.deferred || !info.placed) continue; add(info.placed.date, info.placed.minute);
    } else if (rem.target === "habit") {
      if (!info.days.length) continue;
      const minute = rem.timeOfDay ? hhmmToMin(rem.timeOfDay) : defMin;
      for (let d = from; d <= to; d = addDaysIso(d, 1)) if (info.days.includes(weekdayOf(d))) add(d, minute);
    } else {
      if (!info.date || !ISO_DATE.test(info.date)) continue;
      add(addDaysIso(info.date, -rem.leadDays), rem.timeOfDay ? hhmmToMin(rem.timeOfDay) : defMin);
    }
  }
  return out.sort((a, b) => a.when - b.when || (a.id < b.id ? -1 : 1));
}

// ---------------------------------------------------------------- ledger (ids and times only, never titles)

export type LedgerState = "shown" | "held" | "done" | "skipped" | "snoozed";
export interface LedgerEntry { id: string; at: number; s: LedgerState; /** notification group: the first id of a merged notification */ g?: string }
export type Ledger = readonly LedgerEntry[];

/** Parses the stored ledger; anything odd is dropped. Entries older than 7 days are pruned. */
export function parseLedger(raw: unknown, nowMs: number): LedgerEntry[] {
  if (!Array.isArray(raw)) return [];
  const states: readonly string[] = ["shown", "held", "done", "skipped", "snoozed"];
  const out: LedgerEntry[] = [];
  for (const e of raw as unknown[]) {
    if (typeof e !== "object" || e === null) continue;
    const o = e as Record<string, unknown>;
    if (typeof o.id !== "string" || typeof o.at !== "number" || !Number.isFinite(o.at) || typeof o.s !== "string" || !states.includes(o.s)) continue;
    if (nowMs - o.at > LEDGER_KEEP_MS) continue;
    out.push({ id: o.id, at: o.at, s: o.s as LedgerState, ...(typeof o.g === "string" ? { g: o.g } : {}) });
  }
  return out;
}
const handled = (ledger: Ledger): Set<string> => new Set(ledger.map((e) => e.id));
const record = (ledger: Ledger, add: LedgerEntry[], nowMs: number): LedgerEntry[] => parseLedger([...ledger, ...add], nowMs);

// ---------------------------------------------------------------- placing (quiet hours, blocks, prayer spacing, overload)

export interface BusyBlock { date: string; start: number; end: number }
export interface PrayerMoment { date: string; minute: number }

const inQuiet = (minute: number, q: { from: string; to: string }): boolean => {
  const f = hhmmToMin(q.from), t = hhmmToMin(q.to);
  if (f === t) return false;
  return f < t ? minute >= f && minute < t : minute >= f || minute < t;
};

/** Moves a moment forward until it is outside quiet hours, outside busy blocks, and at least 3 minutes from a prayer alert. Never drops it. */
function settle(when: number, prefs: ReminderPrefs, blocks: readonly BusyBlock[], prayers: readonly PrayerMoment[]): number {
  let t = when;
  const quietTo = hhmmToMin(prefs.quiet.to);
  for (let i = 0; i < 40; i++) {
    const { date, minute } = dateMinuteOf(t);
    if (inQuiet(minute, prefs.quiet)) { const wrapNext = minute >= hhmmToMin(prefs.quiet.from) && hhmmToMin(prefs.quiet.from) > quietTo; t = dhakaMs(wrapNext ? addDaysIso(date, 1) : date, quietTo); continue; }
    const b = blocks.find((x) => x.date === date && minute >= x.start && minute < x.end);
    if (b) { t = dhakaMs(date, b.end); continue; }
    const p = prayers.find((x) => x.date === date && Math.abs(minute - x.minute) < PRAYER_SPACING_MIN);
    if (p) { t = dhakaMs(date, p.minute + PRAYER_SPACING_MIN); continue; }
    break;
  }
  return t;
}

export interface Placed extends Slot { /** when it will actually be shown (after holds) */ showAt: number }
export interface Limited { schedule: Placed[]; /** slots held because of overload; the caller records them as "held" so no catch-up card appears later */ held: Slot[] }

/**
 * Applies the hold rules. Quiet hours and busy blocks move a reminder later (they never drop it). Prayer alerts keep their time:
 * a reminder within 3 minutes of one moves to 3 minutes after it. In `minimum_week` and `pause` nothing is scheduled (all are held).
 * Master off gives an empty schedule. Slots already in the ledger are left out.
 */
export function applyLimits(slots: readonly Slot[], ledger: Ledger, prayers: readonly PrayerMoment[], blocks: readonly BusyBlock[], prefs: ReminderPrefs, mode: CapacityMode): Limited {
  if (!prefs.master) return { schedule: [], held: [] };
  const done = handled(ledger);
  const open = slots.filter((s) => !done.has(s.id));
  if (mode !== "normal") return { schedule: [], held: open };
  const schedule = open.map((s): Placed => ({ ...s, showAt: settle(s.when, prefs, blocks, prayers) })).sort((a, b) => a.showAt - b.showAt || (a.id < b.id ? -1 : 1));
  return { schedule, held: [] };
}

// ---------------------------------------------------------------- delivery decisions

export interface Notice { /** every slot id in this one notification */ ids: string[]; items: Placed[]; merged: boolean }
export interface DueResult { show: Notice[]; /** over the daily cap: not shown now, they appear on the missed card */ folded: Placed[] }

const dayOf = (ms: number): string => dateMinuteOf(ms).date;

/**
 * What to show now. A reminder is due when `showAt` has passed and is inside the 5-minute window. Reminders due within 15 minutes of each
 * other become one notification. At most 6 notifications per Dhaka day; extra ones are returned in `folded`. Nothing here shows a slot twice.
 */
export function dueReminders(schedule: readonly Placed[], ledger: Ledger, nowMs: number): DueResult {
  const done = handled(ledger);
  const due = schedule.filter((s) => !done.has(s.id) && nowMs >= s.showAt && nowMs < s.showAt + DUE_WINDOW_MIN * MIN);
  const today = dayOf(nowMs);
  const used = new Set(ledger.filter((e) => e.s === "shown" && dayOf(e.at) === today).map((e) => e.g ?? e.id)).size;
  const groups: Placed[][] = [];
  for (const s of due) {
    const g = groups[groups.length - 1];
    if (g && s.showAt - g[0]!.showAt <= MERGE_MINUTES * MIN) g.push(s); else groups.push([s]);
  }
  // Later slots inside the 15-minute merge range that are not yet due ride along with the group, so one buzz covers them.
  for (const g of groups) {
    const first = g[0]!.showAt;
    for (const s of schedule) if (!done.has(s.id) && !g.includes(s) && s.showAt > nowMs && s.showAt - first <= MERGE_MINUTES * MIN && !due.includes(s)) g.push(s);
  }
  const show: Notice[] = [], folded: Placed[] = [];
  let room = Math.max(0, MAX_PER_DAY - used);
  for (const g of groups) {
    if (room > 0) { show.push({ ids: g.map((x) => x.id), items: g, merged: g.length > 1 }); room--; } else folded.push(...g);
  }
  return { show, folded };
}

/** Ledger after a notice was shown (one group key per notification so the daily cap counts notifications). */
export const markShown = (ledger: Ledger, n: Notice, nowMs: number): LedgerEntry[] => record(ledger, n.ids.map((id) => ({ id, at: nowMs, s: "shown" as const, g: n.ids[0]! })), nowMs);
export const markHeld = (ledger: Ledger, slots: readonly Slot[], nowMs: number): LedgerEntry[] => record(ledger, slots.filter((s) => !handled(ledger).has(s.id)).map((s) => ({ id: s.id, at: nowMs, s: "held" as const })), nowMs);

// ---------------------------------------------------------------- the missed card

export interface MissedOptions { /** Deen (worship) items appear only when the person turned the worship detail tick on */ notify: NotifyPrefs }
/**
 * Reminders that passed unseen. Plan-step ones expire after 24 hours, all others after 7 days. Held (overload), done, skipped, snoozed and shown
 * ones are never listed. Worship items lapse quietly unless the worship tick is on. Master off lists nothing.
 */
export function missedReminders(schedule: readonly Placed[], ledger: Ledger, nowMs: number, prefs: ReminderPrefs, opt: MissedOptions): Placed[] {
  if (!prefs.master) return [];
  const done = handled(ledger);
  return schedule.filter((s) => {
    if (done.has(s.id)) return false;
    if (nowMs < s.showAt + DUE_WINDOW_MIN * MIN) return false; // still due or in the future
    const keep = s.target === "plan_step" ? MISSED_KEEP_MS.plan_step : MISSED_KEEP_MS.other;
    if (nowMs - s.showAt > keep) return false;
    if (s.privacy === "worship" && opt.notify.worship !== true) return false;
    return true;
  });
}

// ---------------------------------------------------------------- actions on a reminder

export type SnoozeChoice = "hour" | "tomorrow";
/** New snooze time: one hour from now, or tomorrow at the default time (Dhaka). */
export function snoozeAt(choice: SnoozeChoice, nowMs: number, prefs: ReminderPrefs): string {
  if (choice === "hour") return msToAt(nowMs + 60 * MIN);
  return `${addDaysIso(dateMinuteOf(nowMs).date, 1)}T${prefs.defaultTime}`;
}
export interface ActionResult { reminder: Reminder; ledger: LedgerEntry[] }
/** Snooze: closes this slot in the ledger and sets one new time. The item is not marked done. */
export function snooze(rem: Reminder, slotId: string, choice: SnoozeChoice, ledger: Ledger, nowMs: number, prefs: ReminderPrefs): ActionResult {
  return { reminder: { ...rem, snoozedUntil: snoozeAt(choice, nowMs, prefs) }, ledger: record(ledger, [{ id: slotId, at: nowMs, s: "snoozed" }], nowMs) };
}
/** Done: a habit keeps going on its other days; every other kind is finished. */
export function markDone(rem: Reminder, slotId: string, ledger: Ledger, nowMs: number): ActionResult {
  return { reminder: rem.target === "habit" ? rem : { ...rem, state: "done", snoozedUntil: null }, ledger: record(ledger, [{ id: slotId, at: nowMs, s: "done" }], nowMs) };
}
export function markSkipped(rem: Reminder, slotId: string, ledger: Ledger, nowMs: number): ActionResult {
  return { reminder: rem.target === "habit" ? rem : { ...rem, state: "skipped", snoozedUntil: null }, ledger: record(ledger, [{ id: slotId, at: nowMs, s: "skipped" }], nowMs) };
}

// ---------------------------------------------------------------- text

export const REMINDER_TITLE: Bi = { en: "Reminder", bn: "রিমাইন্ডার" };
export const MANY_TITLE = (n: number): Bi => ({ en: `${n} things soon`, bn: `${n}টি জিনিস কাছে` });
/**
 * Notification text for one notice. One item shows its title only when its privacy class allows it (the existing O8 rule via buildNotification);
 * worship, health, financial and third-party items are neutral unless the person turned that tick on. A merged notice shows only a count.
 */
export function reminderNotification(n: Notice, notify: NotifyPrefs): { title: Bi; body: Bi } {
  if (n.merged) return { title: REMINDER_TITLE, body: MANY_TITLE(n.items.length) };
  const it = n.items[0]!;
  return buildNotification({ title: REMINDER_TITLE, body: { en: it.title, bn: it.title }, privacy: it.privacy }, notify);
}
/** The Dhaka calendar day of a moment, as CalDate (for callers that need it). */
export const dhakaDateOf = (ms: number): CalDate => dhakaNow(ms).date;

// Reminder delivery (docs/design/reminders-final-decision.md section 4, 13 step 4). Runs inside the existing 30-second check of
// src/ui/prayerAlerts.ts (no second timer). Ladder: phone notification (app in the background, permission granted) -> in-app card
// (app open, or no permission) -> the missed card. Honest limit: a closed app cannot run this; the calendar file is the closed-app route.
import { allRecs } from "./entry";
import { currentBlocks } from "./blocksUi";
import { loadAnswers } from "./screens";
import { canNotify, onAlertTick, showPhone } from "./prayerAlerts";
import { resolvedPrayerTimes } from "./prayerSync";
import { prefs } from "./state";
import { t } from "../i18n/t";
import type { Locale } from "../i18n/registry";
import { entityById } from "../schema/entities";
import { dhakaNow, isoDate } from "../core/prayer";
import { alertSlots } from "../core/prayerAlerts";
import { buildPlanInput } from "../core/planInputs";
import { schedule, type CapacityMode } from "../core/planner";
import { toPlannerBlocks } from "../core/timeBlocks";
import { notifyText } from "../core/notify";
import {
  addDaysIso, applyLimits, dueReminders, expandReminders, markHeld, markShown, missedReminders, remindersFromRecords, reminderNotification, weekdayOf,
  type BusyBlock, type Notice, type Placed, type PrayerMoment, type Reminder, type ReminderTarget, type TargetInfo, type TargetLookup,
} from "../core/reminders";
import type { FieldValue, TMRecord } from "../core/types";

/** The screen that opens when a reminder notification is tapped. */
export const ROUTE_FOR: Record<ReminderTarget, string> = {
  task: "#/diary/plan", plan_step: "#/diary/plan", habit: "#/habits", bill: "#/diary/money", goal: "#/journey/goals", review: "#/journey/month",
};

const str = (v: FieldValue | undefined): string | null => (v && v.state === "value" && typeof v.value === "string" && v.value.trim() ? v.value.trim() : null);
const isoOrNull = (v: FieldValue | undefined): string | null => { const s = str(v); return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null; };
const privacyOf = (r: TMRecord) => entityById(r.entity)?.defaultPrivacy ?? "personal";

/** What the reminders can point at, read from the active mode's records. Nothing is copied into the reminder itself. */
export function buildLookup(recs: readonly TMRecord[], placements: ReadonlyMap<string, { date: string; minute: number }>, deferred: ReadonlySet<string>, lang: Locale): TargetLookup {
  const byId = new Map(recs.map((r) => [r.id, r]));
  return (target, id): TargetInfo | null => {
    const base = { date: null as string | null, days: [] as number[], placed: null as TargetInfo["placed"], deferred: false };
    if (target === "review") return id === "weekly" || id === "monthly" ? { ...base, title: t(id === "weekly" ? "rem.review.weekly" : "rem.review.monthly", lang), privacy: "personal" } : null;
    const r = byId.get(id); if (!r) return null;
    const untitled = t("next.task.untitled", lang);
    if (target === "task" || target === "plan_step") {
      if (r.entity !== "task") return null;
      return { ...base, title: str(r.values["task.title"]) ?? untitled, privacy: privacyOf(r), placed: placements.get(id) ?? null, deferred: deferred.has(id) };
    }
    if (target === "habit") {
      if (r.entity !== "habit") return null;
      const days = String(str(r.values["habit.days"]) ?? "0,1,2,3,4,5,6").split(",").filter((x) => x !== "").map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
      return { ...base, title: str(r.values["habit.title"]) ?? untitled, privacy: privacyOf(r), days };
    }
    if (target === "bill") {
      if (r.entity !== "finance_item") return null;
      return { ...base, title: str(r.values["finance.label"]) ?? untitled, privacy: "financial", date: isoOrNull(r.values["finance.on"]) };
    }
    if (r.entity !== "goal") return null;
    return { ...base, title: str(r.values["goal.title"]) ?? untitled, privacy: privacyOf(r), date: isoOrNull(r.values["goal.target_date"]) };
  };
}

export interface Built { reminders: Reminder[]; schedule: Placed[]; held: Placed[]; today: string }
/** Slots for the last 7 days and the next day, after the hold rules. Pure given its inputs (the clock is `nowMs`). */
export function buildSchedule(nowMs: number, lang: Locale): Built {
  const p = prefs.reminders; const today = isoDate(dhakaNow(nowMs).date);
  const recs = allRecs(); const reminders = remindersFromRecords(recs);
  const mode: CapacityMode = prefs.mode;
  const wk = currentBlocks().week.blocks;
  // plan placements: the planner starts on today's weekday; weekday d lands on the date `(d - start + 7) % 7` days after today
  const startDay = weekdayOf(today);
  const placements = new Map<string, { date: string; minute: number }>(); const deferred = new Set<string>();
  if (reminders.some((x) => x.target === "plan_step")) {
    const plan = schedule(buildPlanInput(loadAnswers(), recs, mode, startDay, toPlannerBlocks(wk)));
    for (const pl of plan.placements) placements.set(pl.taskId, { date: addDaysIso(today, (pl.day - startDay + 7) % 7), minute: pl.start });
    for (const d of plan.deferred) deferred.add(d.taskId);
  }
  const from = addDaysIso(today, -7), to = addDaysIso(today, 1);
  const slots = expandReminders(reminders, from, to, p, buildLookup(recs, placements, deferred, lang));
  const prayers: PrayerMoment[] = [];
  const a = prefs.prayerAlerts;
  if (a.preAlert || a.azan) for (const d of [today, addDaysIso(today, 1)]) {
    const [y, m, dd] = d.split("-").map(Number); const times = resolvedPrayerTimes({ y: y!, m: m!, d: dd! }).times;
    for (const s of alertSlots(d, times, a)) prayers.push({ date: d, minute: s.minute });
  }
  const blocks: BusyBlock[] = wk.filter((b) => b.kind === "prayer" || b.kind === "family" || b.kind === "rest").map((b) => ({ date: b.date, start: b.start, end: b.end }));
  const lim = applyLimits(slots, prefs.remindersFired, prayers, blocks, p, mode);
  return { reminders, schedule: lim.schedule, held: lim.held as Placed[], today };
}

// ---- in-app state: cards shown while the app is open (Today shows them in step 5) ----
let pendingCards: Notice[] = [];
export const pendingReminderCards = (): readonly Notice[] => pendingCards;
export function dismissReminderCard(firstId: string) { pendingCards = pendingCards.filter((n) => n.ids[0] !== firstId); }
export const resetReminderCards = () => { pendingCards = []; };
const rerender = () => { try { window.dispatchEvent(new HashChangeEvent("hashchange")); } catch { /* ignore */ } };

/** One check. Returns how many notices were handled (for tests). Never throws into the timer. */
export async function checkReminders(nowMs: number = Date.now()): Promise<number> {
  const p = prefs.reminders;
  if (!p.master) return 0;
  const lang = prefs.lang;
  const b = buildSchedule(nowMs, lang);
  let ledger = prefs.remindersFired;
  const passedHeld = b.held.filter((s) => s.when <= nowMs);
  if (passedHeld.length) ledger = markHeld(ledger, passedHeld, nowMs); // overload: no catch-up card later
  const due = dueReminders(b.schedule, ledger, nowMs);
  const foreground = typeof document !== "undefined" && document.visibilityState === "visible";
  let handled = 0;
  for (const n of due.show) {
    const txt = reminderNotification(n, prefs.notifyShow);
    const url = ROUTE_FOR[n.items[0]!.target];
    let sent = false;
    if (!foreground && canNotify()) sent = await showPhone(notifyText(txt.title, lang), notifyText(txt.body, lang), `rem-${n.ids[0]}`, false, url);
    if (!sent) pendingCards = [...pendingCards.filter((x) => x.ids[0] !== n.ids[0]), n]; // in-app card (also when the phone refused)
    ledger = markShown(ledger, n, nowMs); handled++;
  }
  if (handled || passedHeld.length) prefs.remindersFired = ledger;
  if (handled) rerender();
  return handled;
}

/** Reminders that passed unseen (the missed card, step 7). Empty when master is off. */
export function currentMissed(nowMs: number = Date.now()): Placed[] {
  const p = prefs.reminders; if (!p.master) return [];
  return missedReminders(buildSchedule(nowMs, prefs.lang).schedule, prefs.remindersFired, nowMs, p, { notify: prefs.notifyShow });
}

let started = false;
/** Hooks the reminder check into the prayer timer, and lets a tapped notification open its screen. */
export function startReminders() {
  if (started) return; started = true;
  onAlertTick((now) => { void checkReminders(now); });
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", (e) => {
    const d = e.data as { type?: unknown; hash?: unknown } | null;
    if (d && d.type === "OPEN_ROUTE" && typeof d.hash === "string" && /^#\/[a-z0-9/_-]*$/i.test(d.hash)) location.hash = d.hash;
  });
}

// Prayer alerts (M13): which alert is due now. Pure. The UI layer (src/ui/prayerAlerts.ts) delivers them.
import { PRAYER_KEYS, type PrayerKey, type PrayerTimes } from "./prayer";

export interface AlertPrefs { preAlert: boolean; preMinutes: number; azan: boolean }
export const DEFAULT_ALERT_PREFS: AlertPrefs = { preAlert: false, preMinutes: 10, azan: false };
export type AlertKind = "pre" | "azan";
export interface AlertSlot { id: string; prayer: PrayerKey; kind: AlertKind; minute: number; minutesBefore: number }

/** Only whole minutes from 1 to 60 are accepted; anything else falls back to the default (10). Both toggles default off. */
export function parseAlertPrefs(raw: unknown): AlertPrefs {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const mins = typeof r.preMinutes === "number" && Number.isInteger(r.preMinutes) && r.preMinutes >= 1 && r.preMinutes <= 60 ? r.preMinutes : DEFAULT_ALERT_PREFS.preMinutes;
  return { preAlert: r.preAlert === true, preMinutes: mins, azan: r.azan === true };
}

/** Alert moments for one Dhaka date. Prayers with no time (null) get no alert. A pre-alert before midnight is skipped. */
export function alertSlots(date: string, times: PrayerTimes, p: AlertPrefs): AlertSlot[] {
  const out: AlertSlot[] = [];
  for (const prayer of PRAYER_KEYS) {
    const at = times[prayer];
    if (at === null) continue;
    if (p.azan) out.push({ id: `${date}-azan-${prayer}`, prayer, kind: "azan", minute: at, minutesBefore: 0 });
    if (p.preAlert && at - p.preMinutes >= 0) out.push({ id: `${date}-pre-${prayer}`, prayer, kind: "pre", minute: at - p.preMinutes, minutesBefore: p.preMinutes });
  }
  return out;
}

/** Slots whose moment is inside [minute, minute + windowMin) and not yet delivered. A late app start still fires once, within the window. */
export function dueSlots(nowMinute: number, slots: AlertSlot[], delivered: ReadonlySet<string>, windowMin = 5): AlertSlot[] {
  return slots.filter((s) => !delivered.has(s.id) && nowMinute >= s.minute && nowMinute < s.minute + windowMin);
}

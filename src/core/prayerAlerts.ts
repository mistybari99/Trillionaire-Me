// Prayer alerts (M13): which alert is due now. Pure. The UI layer (src/ui/prayerAlerts.ts) delivers them.
import { PRAYER_KEYS, type PrayerKey, type PrayerTimes } from "./prayer";

/**
 * preAlert / azan: the two alert kinds (both OFF by default). prayers: which prayers may alert once a kind is on
 * (all five by default, so switching an alert on is one tap; the user can switch single prayers off).
 * sound: optional azan sound / vibration while the app is open (OFF by default).
 */
export interface AlertPrefs { preAlert: boolean; preMinutes: number; azan: boolean; prayers: Record<PrayerKey, boolean>; sound: boolean }
const ALL_ON: Record<PrayerKey, boolean> = { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true };
export const DEFAULT_ALERT_PREFS: AlertPrefs = { preAlert: false, preMinutes: 10, azan: false, prayers: { ...ALL_ON }, sound: false };
export type AlertKind = "pre" | "azan";
export interface AlertSlot { id: string; prayer: PrayerKey; kind: AlertKind; minute: number; minutesBefore: number }

/** Only whole minutes from 1 to 60 are accepted; anything else falls back to the default (10). Both toggles default off. */
export function parseAlertPrefs(raw: unknown): AlertPrefs {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const mins = typeof r.preMinutes === "number" && Number.isInteger(r.preMinutes) && r.preMinutes >= 1 && r.preMinutes <= 60 ? r.preMinutes : DEFAULT_ALERT_PREFS.preMinutes;
  const pr = (typeof r.prayers === "object" && r.prayers !== null ? r.prayers : {}) as Record<string, unknown>;
  const prayers = { ...ALL_ON };
  for (const k of PRAYER_KEYS) if (pr[k] === false) prayers[k] = false;
  return { preAlert: r.preAlert === true, preMinutes: mins, azan: r.azan === true, prayers, sound: r.sound === true };
}

/** Alert moments for one Dhaka date. Prayers with no time (null) get no alert. A pre-alert before midnight is skipped. */
export function alertSlots(date: string, times: PrayerTimes, p: AlertPrefs): AlertSlot[] {
  const out: AlertSlot[] = [];
  for (const prayer of PRAYER_KEYS) {
    const at = times[prayer];
    if (at === null || p.prayers[prayer] === false) continue;
    if (p.azan) out.push({ id: `${date}-azan-${prayer}`, prayer, kind: "azan", minute: at, minutesBefore: 0 });
    if (p.preAlert && at - p.preMinutes >= 0) out.push({ id: `${date}-pre-${prayer}`, prayer, kind: "pre", minute: at - p.preMinutes, minutesBefore: p.preMinutes });
  }
  return out;
}

/** Slots whose moment is inside [minute, minute + windowMin) and not yet delivered. A late app start still fires once, within the window. */
export function dueSlots(nowMinute: number, slots: AlertSlot[], delivered: ReadonlySet<string>, windowMin = 5): AlertSlot[] {
  return slots.filter((s) => !delivered.has(s.id) && nowMinute >= s.minute && nowMinute < s.minute + windowMin);
}

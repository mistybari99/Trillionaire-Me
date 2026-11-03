// Delivers prayer alerts while the app is open (M13). Phone notification when permission is granted, otherwise an in-app card.
// Lock-screen text goes through the existing O8 rule (buildNotification): neutral unless "show details" is on for worship.
import { resolvedPrayerTimes } from "./prayerSync";
import { dhakaNow, isoDate, type PrayerKey, type PrayerTimes } from "../core/prayer";
import { alertSlots, dueSlots, type AlertSlot } from "../core/prayerAlerts";
import { NO_AZAN, VIBRATE_PATTERN, azanFileFor, detectAzan, soundPlan, type AzanAvailability } from "../core/prayerSound";
import { buildNotification, notifyText, type NotifyPrefs } from "../core/notify";
import { prefs } from "./state";
import type { Bi, Locale } from "../i18n/registry";

export interface InAppReminder { id: string; text: Bi }
let reminders: InAppReminder[] = [];
export const inAppReminders = (): readonly InAppReminder[] => reminders;
export function dismissReminder(id: string) { reminders = reminders.filter((r) => r.id !== id); }

const PRAYER_BN: Record<PrayerKey, string> = { fajr: "ফজর", dhuhr: "যোহর", asr: "আসর", maghrib: "মাগরিব", isha: "ইশা" };
const PRAYER_EN: Record<PrayerKey, string> = { fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha" };

/** Alert sentence in both languages. Used for the in-app card and the phone notification body. */
export function slotText(s: AlertSlot): Bi {
  const bn = s.kind === "azan" ? `${PRAYER_BN[s.prayer]}-এর সময় হয়েছে` : `${PRAYER_BN[s.prayer]} আরও ${s.minutesBefore} মিনিট বাকি`;
  const en = s.kind === "azan" ? `${PRAYER_EN[s.prayer]} time has come` : `${PRAYER_EN[s.prayer]} in ${s.minutesBefore} minutes`;
  return { bn, en };
}

/** Whether a phone notification can be shown right now (API present and permission granted). */
export const canNotify = (): boolean => typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted";

/** Why phone notifications are not shown: not supported by this browser, blocked by the user, or not asked yet. */
export function notifyState(): "unsupported" | "denied" | "ask" | "granted" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission === "granted" ? "granted" : Notification.permission === "denied" ? "denied" : "ask";
}

let azanAvail: AzanAvailability = NO_AZAN;
let azanProbed: Promise<AzanAvailability> | null = null;
/** What audio the owner has added. Checked once (same-origin HEAD) and kept; pass force to look again. Never throws. */
export function refreshAzanAvailability(force = false): Promise<AzanAvailability> {
  if (azanProbed && !force) return azanProbed;
  const f = typeof fetch === "function" ? (fetch as unknown as Parameters<typeof detectAzan>[0]) : null;
  azanProbed = (f ? detectAzan(f) : Promise.resolve(NO_AZAN)).then((a) => (azanAvail = a), () => (azanAvail = NO_AZAN));
  return azanProbed;
}
export const azanAvailability = (): AzanAvailability => azanAvail;
/** Test hook: set the known availability without a request. */
export function setAzanAvailability(a: AzanAvailability) { azanAvail = a; azanProbed = Promise.resolve(a); }

const reducedMotion = (): boolean => prefs.reduceMotion === "always" || (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);

/** Plays one file at the chosen volume. Needs a tap or an open app; a blocked play is ignored. */
function playFile(file: string, volume: number) {
  const a = new Audio(file); a.volume = Math.min(1, Math.max(0, volume / 100));
  void a.play().catch(() => { /* the phone may block sound until a tap */ });
}

/** Sound or vibration for an azan alert, only if switched on. Works while the app is open; a closed page cannot play audio. Never throws. */
export function playAlertSound(s: AlertSlot, soundOn: boolean): "audio" | "vibrate" | "none" {
  const canVibrate = typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
  const volume = prefs.prayerAlerts.volume;
  const file = azanFileFor(s.prayer, azanAvail);
  const plan = soundPlan(s, soundOn, file, canVibrate, volume, reducedMotion());
  try {
    if (plan === "audio" && file) playFile(file, volume);
    else if (plan === "vibrate") navigator.vibrate([...VIBRATE_PATTERN]);
  } catch { return "none"; }
  return plan;
}

/** Preview button: plays the added azan (or the Fajr one) once at the chosen volume. Returns false when no file was added. */
export function previewAzan(prayer: PrayerKey = "dhuhr"): boolean {
  const file = azanFileFor(prayer, azanAvail);
  if (!file || prefs.prayerAlerts.volume <= 0) return false;
  try { playFile(file, prefs.prayerAlerts.volume); return true; } catch { return false; }
}

async function showPhone(title: string, body: string, tag: string, quiet: boolean): Promise<boolean> {
  if (!canNotify()) return false;
  try {
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) { await reg.showNotification(title, { body, tag, icon: "./icon-192.png", silent: quiet }); return true; }
    new Notification(title, { body, tag, silent: quiet });
    return true;
  } catch { return false; }
}

async function deliver(s: AlertSlot, lang: Locale, showDetails: NotifyPrefs) {
  const text = slotText(s);
  const title: Bi = { bn: "নামাজের অ্যালার্ট", en: "Prayer reminder" };
  const safe = buildNotification({ title, body: text, privacy: "worship" }, showDetails);
  const soundOn = prefs.prayerAlerts.sound;
  const ok = await showPhone(notifyText(safe.title, lang), notifyText(safe.body, lang), s.id, !soundOn);
  playAlertSound(s, soundOn);
  if (!ok) {
    reminders = [...reminders.filter((r) => r.id !== s.id), { id: s.id, text }];
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
}

let timer: ReturnType<typeof setInterval> | null = null;
let cache: { date: string; times: PrayerTimes; key: string } | null = null;

/** One check: finds alerts due now, delivers each once, and remembers it for the Dhaka day. */
export async function checkPrayerAlerts(nowMs: number = Date.now()): Promise<void> {
  const alerts = prefs.prayerAlerts;
  if (!alerts.preAlert && !alerts.azan) return;
  const { date, minute } = dhakaNow(nowMs);
  const day = isoDate(date);
  const coords = prefs.prayerCoords;
  const settings = prefs.prayerSettings;
  const res = resolvedPrayerTimes(date);
  const key = `${coords.lat},${coords.lon},${JSON.stringify(settings)},${res.source},${res.fetchedAt}`;
  if (!cache || cache.date !== day || cache.key !== key) cache = { date: day, times: res.times, key };
  const slots = alertSlots(day, cache.times, alerts);
  const saved = prefs.prayerFired;
  const delivered = new Set(saved.date === day ? saved.ids : []);
  const due = dueSlots(minute, slots, delivered);
  if (due.length === 0) return;
  prefs.prayerFired = { date: day, ids: [...delivered, ...due.map((s) => s.id)] };
  await Promise.all(due.map((s) => deliver(s, prefs.lang, prefs.notifyShow)));
}

/** Starts the in-app checker once (every 30 s, and when the app comes back to the front). */
export function startPrayerAlerts() {
  if (timer !== null) return;
  void refreshAzanAvailability();
  timer = setInterval(() => { checkPrayerAlerts().catch(() => { /* never break the app */ }); }, 30_000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") checkPrayerAlerts().catch(() => { /* ignore */ }); });
  checkPrayerAlerts().catch(() => { /* ignore */ });
}


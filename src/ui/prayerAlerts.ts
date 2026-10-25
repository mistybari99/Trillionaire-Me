// Delivers prayer alerts while the app is open (M13). Phone notification when permission is granted, otherwise an in-app card.
// Lock-screen text goes through the existing O8 rule (buildNotification): neutral unless "show details" is on for worship.
import { dhakaNow, isoDate, prayerTimes, type PrayerKey, type PrayerTimes } from "../core/prayer";
import { alertSlots, dueSlots, type AlertSlot } from "../core/prayerAlerts";
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

async function showPhone(title: string, body: string, tag: string): Promise<boolean> {
  if (!canNotify()) return false;
  try {
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) { await reg.showNotification(title, { body, tag, icon: "./icon-192.png" }); return true; }
    new Notification(title, { body, tag });
    return true;
  } catch { return false; }
}

async function deliver(s: AlertSlot, lang: Locale, showDetails: NotifyPrefs) {
  const text = slotText(s);
  const title: Bi = { bn: "নামাজের সতর্কবার্তা", en: "Prayer reminder" };
  const safe = buildNotification({ title, body: text, privacy: "worship" }, showDetails);
  const ok = await showPhone(notifyText(safe.title, lang), notifyText(safe.body, lang), s.id);
  if (!ok) {
    reminders = [...reminders.filter((r) => r.id !== s.id), { id: s.id, text }];
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
}

let timer: ReturnType<typeof setInterval> | null = null;
let cache: { date: string; times: PrayerTimes; coords: string } | null = null;

/** One check: finds alerts due now, delivers each once, and remembers it for the Dhaka day. */
export async function checkPrayerAlerts(nowMs: number = Date.now()): Promise<void> {
  const alerts = prefs.prayerAlerts;
  if (!alerts.preAlert && !alerts.azan) return;
  const { date, minute } = dhakaNow(nowMs);
  const day = isoDate(date);
  const coords = prefs.prayerCoords;
  const key = `${coords.lat},${coords.lon}`;
  if (!cache || cache.date !== day || cache.coords !== key) cache = { date: day, times: prayerTimes(date, coords), coords: key };
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
  timer = setInterval(() => { checkPrayerAlerts().catch(() => { /* never break the app */ }); }, 30_000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") checkPrayerAlerts().catch(() => { /* ignore */ }); });
  checkPrayerAlerts().catch(() => { /* ignore */ });
}


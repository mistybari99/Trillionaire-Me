// Notification privacy (MR-14, G2, ROADMAP O8). Lock-screen text never reveals worship, health, money or third-party
// details unless the user turns "show details" on for that category. Settings are per category and default to hidden.
import type { PrivacyClass } from "../catalog/types";
import type { Bi, Locale } from "../i18n/registry";
import { swapMixTerms } from "../i18n/packs";

export interface NotifyItem { title: Bi; body: Bi; privacy: PrivacyClass }
export type NotifyCategory = "worship" | "health" | "financial" | "third_party";
export const NOTIFY_CATEGORIES: readonly NotifyCategory[] = ["worship", "health", "financial", "third_party"];
/** true = show details for that category on the lock screen. Missing or false = hidden (the default). */
export type NotifyPrefs = Partial<Record<NotifyCategory, boolean>>;
export const DEFAULT_NOTIFY_PREFS: NotifyPrefs = {};

/** Neutral text used whenever details are hidden. It names no item, category or amount. */
export const NEUTRAL_TITLE: Bi = { en: "A reminder is waiting", bn: "একটি স্মরণ অপেক্ষা করছে" };
export const NEUTRAL_BODY: Bi = { en: "Open the app to see it", bn: "খুলে দেখুন" };

/** Safe read of a stored value: anything that is not a known category set to true is hidden. */
export function parseNotifyPrefs(raw: unknown): NotifyPrefs {
  const out: NotifyPrefs = {};
  if (typeof raw !== "object" || raw === null) return out;
  for (const c of NOTIFY_CATEGORIES) if ((raw as Record<string, unknown>)[c] === true) out[c] = true;
  return out;
}

export function isSensitiveCategory(p: PrivacyClass): p is NotifyCategory {
  return (NOTIFY_CATEGORIES as readonly string[]).includes(p);
}

export function buildNotification(item: NotifyItem, prefs: NotifyPrefs = DEFAULT_NOTIFY_PREFS): { title: Bi; body: Bi } {
  if (isSensitiveCategory(item.privacy) && prefs[item.privacy] !== true) return { title: NEUTRAL_TITLE, body: NEUTRAL_BODY };
  return { title: item.title, body: item.body };
}

/** One line of notification text in the chosen UI mode. Mix is derived from the Bangla text, like the UI packs. */
export function notifyText(b: Bi, lang: Locale): string {
  if (lang === "en") return b.en;
  if (lang === "mix") return swapMixTerms(b.bn);
  return b.bn;
}

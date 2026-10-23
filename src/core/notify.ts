// Notification privacy (MR-14, G2). Lock-screen text never reveals worship, health or money details unless the user turns hiding off.
import type { PrivacyClass } from "../catalog/types";
import type { Bi } from "../i18n/registry";

export interface NotifyItem { title: Bi; body: Bi; privacy: PrivacyClass }
export interface NotifyPrefs { hideDetails: boolean }
export const DEFAULT_NOTIFY_PREFS: NotifyPrefs = { hideDetails: true };

const GENERIC: Bi = { bn: "একটি স্মরণ আছে", en: "You have a reminder" };
const SENSITIVE: ReadonlySet<PrivacyClass> = new Set(["worship", "health", "financial", "third_party"]);

export function buildNotification(item: NotifyItem, prefs: NotifyPrefs = DEFAULT_NOTIFY_PREFS): { title: Bi; body: Bi } {
  if (SENSITIVE.has(item.privacy) && prefs.hideDetails) return { title: GENERIC, body: { bn: "খুলে দেখুন", en: "Open the app to see it" } };
  return { title: item.title, body: item.body };
}

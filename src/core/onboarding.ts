// First-run onboarding (audit M1). Pure rules only: no UI, no storage.
// Three screens: 1 choose Demo or Real (the existing first-run choice), 2 one goal in plain words, 3 one small first step and the first win.
// Nothing here judges the user. The only measurement is a local "time to first step" that is never shown as a grade.
import { checkFreeText } from "./safety";

/** "" = never offered (existing devices), pending = offered and not finished, done / skipped = closed. */
export type OnboardState = "" | "pending" | "done" | "skipped";
export const parseOnboard = (v: unknown): OnboardState => (v === "pending" || v === "done" || v === "skipped" ? v : "");

/** Only a device that just made its first demo / real choice is offered the onboarding. */
export const onboardingOpen = (s: OnboardState): boolean => s === "pending";

export const MAX_TEXT = 160;
export type TextCheck = { ok: true; text: string } | { ok: false; reason: "empty" | "long" | "secret" };

/** A goal or step written in plain words. Secrets (passwords, OTP, card numbers) are refused like everywhere else. */
export function checkPlainText(raw: string): TextCheck {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return { ok: false, reason: "empty" };
  if (text.length > MAX_TEXT) return { ok: false, reason: "long" };
  if (!checkFreeText(text).ok) return { ok: false, reason: "secret" };
  return { ok: true, text };
}

/** Time choices for the first step. "unknown" is a real answer and stays unknown (never 0). */
export const FIRST_MINUTES = [5, 10, 15] as const;
export const DEFAULT_FIRST_MINUTES = 10;
export const parseMinutes = (v: string): number | null => { const n = Number(v); return (FIRST_MINUTES as readonly number[]).includes(n) ? n : null; };

/** Whole seconds between two ISO times, or null when either is missing or out of order. */
export function secondsBetween(startIso: string | undefined, endIso: string | undefined): number | null {
  if (!startIso || !endIso) return null;
  const a = Date.parse(startIso), b = Date.parse(endIso);
  return Number.isFinite(a) && Number.isFinite(b) && b >= a ? Math.round((b - a) / 1000) : null;
}

export interface OnboardTimes { start?: string; firstStep?: string }
export function parseTimes(raw: unknown): OnboardTimes {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  return { ...(typeof r.start === "string" ? { start: r.start } : {}), ...(typeof r.firstStep === "string" ? { firstStep: r.firstStep } : {}) };
}

// Prayer-time settings (M13): calculation method, Asr rule and a small per-prayer minute offset. Pure; no network, no DOM.
// Times are a calculation, not an official timetable. The UI always says "verify with your local timetable".
import type { PrayerKey } from "./prayer";

export type MethodId = "karachi" | "mwl" | "egypt" | "isna";
export const METHOD_IDS: readonly MethodId[] = ["karachi", "mwl", "egypt", "isna"];
/** Twilight angles in degrees below the horizon. Karachi (University of Islamic Sciences) is the Bangladesh default. */
export const METHODS: Record<MethodId, { fajrAngle: number; ishaAngle: number }> = {
  karachi: { fajrAngle: 18, ishaAngle: 18 },
  mwl: { fajrAngle: 18, ishaAngle: 17 },
  egypt: { fajrAngle: 19.5, ishaAngle: 17.5 },
  isna: { fajrAngle: 15, ishaAngle: 15 },
};
export type AsrRule = "standard" | "hanafi";
export const MAX_OFFSET_MIN = 30;
export interface PrayerSettings { method: MethodId; asr: AsrRule; offsets: Record<PrayerKey, number> }

const ZERO: Record<PrayerKey, number> = { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 };
export const DEFAULT_PRAYER_SETTINGS: PrayerSettings = { method: "karachi", asr: "standard", offsets: { ...ZERO } };

/** Safe read of a stored value. Anything unknown falls back to the default; offsets are whole minutes from -30 to 30. */
export function parsePrayerSettings(raw: unknown): PrayerSettings {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const method = (METHOD_IDS as readonly unknown[]).includes(r.method) ? (r.method as MethodId) : DEFAULT_PRAYER_SETTINGS.method;
  const asr: AsrRule = r.asr === "hanafi" ? "hanafi" : "standard";
  const o = (typeof r.offsets === "object" && r.offsets !== null ? r.offsets : {}) as Record<string, unknown>;
  const offsets = { ...ZERO };
  for (const k of Object.keys(ZERO) as PrayerKey[]) {
    const v = o[k];
    offsets[k] = typeof v === "number" && Number.isInteger(v) && Math.abs(v) <= MAX_OFFSET_MIN ? v : 0;
  }
  return { method, asr, offsets };
}

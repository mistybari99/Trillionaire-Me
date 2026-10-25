// Prayer times (M13). Pure: no network, no DOM, no scripture text, no licensed timetable.
// Standard solar-position formula (NOAA-style sunrise equation). Output is clock time in Asia/Dhaka (UTC+6).
// The owner must check these times against an official Bangladesh timetable before relying on them (DECISIONS_LOG).

/** Asia/Dhaka has no daylight saving; UTC+6 = 360 minutes. */
export const DHAKA_UTC_OFFSET_MIN = 360;

/** Method angles (degrees). Named so an owner or reviewer can change them in one place. */
export const FAJR_ANGLE_DEG = 18;            // Fajr: sun this far below the horizon, before sunrise
export const ISHA_ANGLE_DEG = 17;            // Isha: sun this far below the horizon, after sunset
export const MAGHRIB_ALTITUDE_DEG = -0.833;  // Maghrib: sunset, sun's upper edge with refraction
export const ASR_SHADOW_FACTOR = 1;          // Asr: shadow length = factor x object + noon shadow (1 = standard, 2 = Hanafi)

/** Default city: Dhaka. */
export const DHAKA_COORDS = { lat: 23.8103, lon: 90.4125 } as const;

export type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
export const PRAYER_KEYS: readonly PrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
/** Minute of the Dhaka day (0..1439), or null when the event does not happen that day at this place (unknown, never 0). */
export type PrayerTimes = Record<PrayerKey, number | null>;
export interface Coords { lat: number; lon: number }
export interface CalDate { y: number; m: number; d: number }

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const norm360 = (x: number) => ((x % 360) + 360) % 360;
const signed180 = (x: number) => { const v = norm360(x); return v > 180 ? v - 360 : v; };

/** Julian day number at 00:00 UT of a calendar date. */
export function julianDayUT0(c: CalDate): number {
  let y = c.y, m = c.m;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + c.d + B - 1524.5;
}

/** Sun declination (radians) and equation of time (minutes) at a Julian day. */
function sunAt(jd: number): { dec: number; eot: number } {
  const n = jd - 2451545.0;
  const L = norm360(280.46 + 0.9856474 * n);
  const g = norm360(357.528 + 0.9856003 * n) * RAD;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const eps = (23.439 - 0.0000004 * n) * RAD;
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)) * DEG;
  return { dec, eot: 4 * signed180(L - ra) };
}

/** Solar noon in UT minutes from 00:00 UT of the calendar date. */
const noonUT = (lon: number, eot: number) => 720 - 4 * lon - eot;

/**
 * Event time in UT minutes for a sun altitude (degrees). `sign` -1 = before noon (morning), +1 = after noon.
 * Declination is re-read at the event's own time (3 passes), so it is not a single noon snapshot.
 * Returns null when the sun never reaches that altitude that day (polar cases).
 */
function eventUT(jd0: number, c: Coords, altOf: (decRad: number) => number, sign: -1 | 1): number | null {
  const phi = c.lat * RAD;
  let t = 720 - 4 * c.lon;
  for (let i = 0; i < 3; i++) {
    const { dec, eot } = sunAt(jd0 + t / 1440);
    const alt = altOf(dec) * RAD;
    const cosH = (Math.sin(alt) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
    if (!Number.isFinite(cosH) || cosH < -1 || cosH > 1) return null;
    t = noonUT(c.lon, eot) + sign * 4 * Math.acos(cosH) * DEG;
  }
  return t;
}

/** UT minutes -> Dhaka minute of day, rounded to the nearest minute. */
const toDhakaMinute = (utMin: number | null): number | null => {
  if (utMin === null || !Number.isFinite(utMin)) return null;
  const m = Math.round(utMin + DHAKA_UTC_OFFSET_MIN);
  return ((m % 1440) + 1440) % 1440;
};

/** The five daily prayer times for a calendar date (Dhaka calendar) at a location, in Dhaka clock minutes. */
export function prayerTimes(date: CalDate, c: Coords): PrayerTimes {
  const jd0 = julianDayUT0(date);
  // Solar noon from the equation of time at the middle of the Dhaka day (about 06:00 UT).
  const noonMin = noonUT(c.lon, sunAt(jd0 + 0.25).eot);
  const at = (alt: number, sign: -1 | 1) => eventUT(jd0, c, () => alt, sign);
  const asr = eventUT(jd0, c, (dec) => Math.atan(1 / (ASR_SHADOW_FACTOR + Math.tan(Math.abs(c.lat * RAD - dec)))) * DEG, 1);
  return {
    fajr: toDhakaMinute(at(-FAJR_ANGLE_DEG, -1)),
    dhuhr: toDhakaMinute(noonMin),
    asr: toDhakaMinute(asr),
    maghrib: toDhakaMinute(at(MAGHRIB_ALTITUDE_DEG, 1)),
    isha: toDhakaMinute(at(-ISHA_ANGLE_DEG, 1)),
  };
}

/** "HH:MM" with Latin digits; null stays null (never shown as 00:00). */
export function prayerClock(min: number | null): string | null {
  if (min === null) return null;
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/** Parse "23.8103" style text (Latin or Bangla digits). Returns null for anything out of range. */
export function parseCoord(text: string, limit: number): number | null {
  const s = text.trim().replace(/[০-৯]/g, (ch) => String(ch.charCodeAt(0) - 0x09e6)).replace(/,/g, ".");
  if (!/^-?\d{1,3}(\.\d{1,6})?$/.test(s)) return null;
  const v = Number(s);
  return Number.isFinite(v) && Math.abs(v) <= limit ? v : null;
}

export function validCoords(c: unknown): c is Coords {
  if (typeof c !== "object" || c === null) return false;
  const { lat, lon } = c as Record<string, unknown>;
  return typeof lat === "number" && typeof lon === "number" && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}

/** Dhaka calendar date and minute of day for an epoch time. Uses the fixed UTC+6 offset, never the device zone. */
export function dhakaNow(epochMs: number): { date: CalDate; minute: number } {
  const d = new Date(epochMs + DHAKA_UTC_OFFSET_MIN * 60000);
  return { date: { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }, minute: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

export const isoDate = (c: CalDate) => `${c.y}-${String(c.m).padStart(2, "0")}-${String(c.d).padStart(2, "0")}`;

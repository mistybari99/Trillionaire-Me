// Prayer-time source (owner request 3 Nov 2026): a free public service gives the real timetable for a city, so times follow the
// season without anyone typing them. This file is PURE: types, the port with its "off" adapter, request building, response checking,
// cache rules and the resolver. The network lives in src/adapters/aladhan.ts, the cache in src/adapters/prayerCacheDb.ts.
// What is sent (only when the user ticked the box): city name, country name, calculation method, Asr rule, month, year. Nothing else.
import { PRAYER_KEYS, prayerTimes, type CalDate, type Coords, type PrayerKey, type PrayerTimes } from "./prayer";
import type { MethodId, PrayerSettings } from "./prayerMethod";
import type { PortResult } from "./ports";

export const SOURCE_ID = "aladhan";
export const SOURCE_NAME = "Aladhan (aladhan.com)";
export const SOURCE_HOST = "https://api.aladhan.com";
/** Aladhan method numbers: 1 = University of Islamic Sciences, Karachi (our default for Bangladesh), 2 = ISNA, 3 = Muslim World League, 5 = Egyptian. */
export const ALADHAN_METHOD: Record<MethodId, number> = { karachi: 1, isna: 2, mwl: 3, egypt: 5 };
export const FETCH_DAYS = 30;
export const LOW_DAYS = 7;
export const RETRY_HOURS = 6;

export interface PrayerPlace { city: string; country: string }
export const DEFAULT_PLACE: PrayerPlace = { city: "Dhaka", country: "Bangladesh" };

/** The user's choice. `on` is true only after the tick; Withdraw sets it back to false. */
export interface SyncSettings { v: 1; on: boolean; since: string | null; place: PrayerPlace }
export const OFF_SYNC: SyncSettings = { v: 1, on: false, since: null, place: { ...DEFAULT_PLACE } };

/** A place name is letters, spaces, dots, apostrophes and hyphens, 2 to 40 characters. Anything else (numbers, symbols, addresses) is refused. */
export function cleanPlaceName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.normalize("NFC").trim().replace(/\s+/g, " ");
  return s.length >= 2 && s.length <= 40 && /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u.test(s) ? s : null;
}
export function parseSyncSettings(raw: unknown): SyncSettings {
  const o = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const p = (typeof o.place === "object" && o.place !== null ? o.place : {}) as Record<string, unknown>;
  const city = cleanPlaceName(p.city) ?? DEFAULT_PLACE.city, country = cleanPlaceName(p.country) ?? DEFAULT_PLACE.country;
  const on = o.on === true && typeof o.since === "string";
  return { v: 1, on, since: on ? (o.since as string) : null, place: { city, country } };
}

export type DayTimes = Record<PrayerKey, number>;
export interface PrayerCache { v: 1; key: string; source: typeof SOURCE_ID; fetchedAt: string; days: Record<string, DayTimes> }
export interface AttemptRecord { at: string; key: string }

export const cacheKey = (s: PrayerSettings, p: PrayerPlace): string => `${SOURCE_ID}|m${ALADHAN_METHOD[s.method]}|s${s.asr === "hanafi" ? 1 : 0}|${p.city.toLowerCase()}|${p.country.toLowerCase()}`;
export const isoOf = (c: CalDate): string => `${c.y}-${String(c.m).padStart(2, "0")}-${String(c.d).padStart(2, "0")}`;
const addDays = (c: CalDate, n: number): CalDate => { const d = new Date(Date.UTC(c.y, c.m - 1, c.d + n)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }; };

/** The one or two calendar months that cover today and the next FETCH_DAYS days. */
export function monthsToFetch(today: CalDate, days = FETCH_DAYS): Array<{ y: number; m: number }> {
  const out: Array<{ y: number; m: number }> = [];
  for (let i = 0; i <= days; i++) { const d = addDays(today, i); if (!out.some((x) => x.y === d.y && x.m === d.m)) out.push({ y: d.y, m: d.m }); }
  return out;
}

export interface MonthQuery { y: number; m: number; place: PrayerPlace; settings: PrayerSettings }
/** The request address. Method, Asr school and the Dhaka clock are fixed so the numbers match the rest of the app. */
export function monthUrl(q: MonthQuery): string {
  const e = encodeURIComponent;
  return `${SOURCE_HOST}/v1/calendarByCity/${q.y}/${q.m}?city=${e(q.place.city)}&country=${e(q.place.country)}&method=${ALADHAN_METHOD[q.settings.method]}&school=${q.settings.asr === "hanafi" ? 1 : 0}&timezonestring=Asia%2FDhaka`;
}

const clockMin = (v: unknown): number | null => {
  if (typeof v !== "string") return null;
  const m = /^\s*(\d{1,2}):(\d{2})/.exec(v); if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  return h < 24 && mi < 60 ? h * 60 + mi : null;
};
/** Checks the documented calendar answer. A day is kept only when all five times read as clock times in the right order. A bad day is dropped, never guessed. */
export function parseAladhanMonth(json: unknown): Record<string, DayTimes> | null {
  const root = json as { code?: unknown; data?: unknown } | null;
  if (!root || root.code !== 200 || !Array.isArray(root.data)) return null;
  const out: Record<string, DayTimes> = {};
  for (const item of root.data as Array<Record<string, unknown>>) {
    const g = ((item?.date as Record<string, unknown> | undefined)?.gregorian as Record<string, unknown> | undefined)?.date;
    const dm = typeof g === "string" ? /^(\d{2})-(\d{2})-(\d{4})$/.exec(g) : null;
    const tm = item?.timings as Record<string, unknown> | undefined;
    if (!dm || !tm) continue;
    const vals = [clockMin(tm.Fajr), clockMin(tm.Dhuhr), clockMin(tm.Asr), clockMin(tm.Maghrib), clockMin(tm.Isha)];
    if (vals.some((v) => v === null)) continue;
    const [fajr, dhuhr, asr, maghrib, isha] = vals as number[];
    if (!(fajr! < dhuhr! && dhuhr! < asr! && asr! < maghrib! && maghrib! < isha!)) continue;
    out[`${dm[3]}-${dm[2]}-${dm[1]}`] = { fajr: fajr!, dhuhr: dhuhr!, asr: asr!, maghrib: maghrib!, isha: isha! };
  }
  return Object.keys(out).length ? out : null;
}

/** The port: ask for the months for a place. The "off" adapter answers "not connected" and does nothing else. */
export interface PrayerSourcePort { readonly id: "prayerTimes"; fetchMonth(q: MonthQuery): Promise<PortResult<Record<string, DayTimes>>> }
export const nullPrayerSource: PrayerSourcePort = { id: "prayerTimes", fetchMonth: () => Promise.resolve({ ok: false, reason: "not_connected", message: "not connected" }) };

/** Number of days from today on that the cache can answer without a gap. */
export function daysLeft(cache: PrayerCache | null, today: CalDate): number {
  if (!cache) return 0;
  let n = 0; while (n < 400 && cache.days[isoOf(addDays(today, n))]) n++;
  return n;
}
/** Past days are dropped (yesterday stays, a late-night check may still need it). */
export function trimDays(days: Record<string, DayTimes>, today: CalDate): Record<string, DayTimes> {
  const keep = isoOf(addDays(today, -1)); const out: Record<string, DayTimes> = {};
  for (const k of Object.keys(days).sort()) if (k >= keep) out[k] = days[k]!;
  return out;
}

export interface FetchGate { sync: SyncSettings; online: boolean; cache: PrayerCache | null; attempt: AttemptRecord | null; key: string; today: CalDate; nowMs: number }
/** When to ask. Never when off or offline. Once a day on app open; sooner only when fewer than 7 days are saved and 6 hours passed since the last try. */
export function shouldFetch(g: FetchGate): boolean {
  if (!g.sync.on || !g.online) return false;
  const a = g.attempt;
  if (a && a.key === g.key) {
    const ms = Date.parse(a.at);
    if (Number.isFinite(ms)) {
      const triedToday = isoOf(dhakaDay(ms)) === isoOf(g.today);
      const low = !g.cache || g.cache.key !== g.key || daysLeft(g.cache, g.today) < LOW_DAYS;
      if (triedToday && !(low && g.nowMs - ms >= RETRY_HOURS * 3_600_000)) return false;
    }
  }
  return true;
}
const dhakaDay = (ms: number): CalDate => { const d = new Date(ms + 360 * 60000); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }; };

export type TimesSource = "external" | "local";
export interface ResolvedTimes { times: PrayerTimes; source: TimesSource; fetchedAt: string | null; name: string | null }
const wrap = (v: number) => ((v % 1440) + 1440) % 1440;

/**
 * The one answer every screen, alert and schedule block reads. External times are used only when sync is on, the cache is for the
 * same method, Asr rule and place, and has this date. Otherwise the phone's own calculation answers. Offsets are added on top either way.
 */
export function resolveTimes(date: CalDate, coords: Coords, settings: PrayerSettings, sync: SyncSettings, cache: PrayerCache | null): ResolvedTimes {
  const day = sync.on && cache && cache.key === cacheKey(settings, sync.place) ? cache.days[isoOf(date)] : undefined;
  if (!day) return { times: prayerTimes(date, coords, settings), source: "local", fetchedAt: null, name: null };
  const times = { ...day } as PrayerTimes;
  for (const k of PRAYER_KEYS) times[k] = wrap(day[k] + (settings.offsets[k] ?? 0));
  return { times, source: "external", fetchedAt: cache!.fetchedAt, name: SOURCE_NAME };
}

// Automatic prayer-time update (owner request 3 Nov 2026; D-B off-device exception for prayer times only, see DECISIONS_LOG).
// Off until the user ticks the box on Settings > Prayer. Then, when online: one request per day on app open (sooner only when fewer than
// 7 days are saved) for today and the next 30 days. The answer is saved in IndexedDB. Offline, stale or failed: the saved copy answers,
// and when there is none the phone's own calculation does. Nothing here waits for the network: screens always read resolvedPrayerTimes().
import { prefs } from "./state";
import { dhakaNow, type CalDate } from "../core/prayer";
import { SOURCE_ID, cacheKey, cleanPlaceName, daysLeft, monthsToFetch, resolveTimes, shouldFetch, trimDays,
  type DayTimes, type PrayerCache, type PrayerSourcePort, type ResolvedTimes, type SyncSettings } from "../core/prayerSource";
import { aladhanSource } from "../adapters/aladhan";
import { IdbPrayerCache, MemoryPrayerCache, type PrayerCacheRepo } from "../adapters/prayerCacheDb";

export interface SyncDeps { source: PrayerSourcePort; repo: PrayerCacheRepo; now: () => number; online: () => boolean; redraw: () => void }
const redraw = () => { try { window.dispatchEvent(new HashChangeEvent("hashchange")); } catch { /* no window */ } };
const defaults = (): SyncDeps => ({ source: aladhanSource(), repo: typeof indexedDB !== "undefined" ? new IdbPrayerCache() : new MemoryPrayerCache(), now: () => Date.now(), online: () => (typeof navigator === "undefined" ? false : navigator.onLine !== false), redraw });

let deps: SyncDeps = defaults();
let cache: PrayerCache | null = null;
let attempt: { at: string; key: string } | null = null;
let loaded = false;
let running = false;
export type SyncOutcome = "off" | "offline" | "skipped" | "updated" | "failed";
let lastOutcome: SyncOutcome = "off";
export const lastSyncOutcome = (): SyncOutcome => lastOutcome;

/** For tests: swap the network, the saved copy and the clock. */
export function configurePrayerSync(next: Partial<SyncDeps> | null): void { deps = { ...defaults(), ...(next ?? {}) }; cache = null; attempt = null; loaded = false; running = false; lastOutcome = "off"; }
/** The saved copy as it is in memory right now (for tests and the status line). */
export const currentCache = (): PrayerCache | null => cache;

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  const s = await deps.repo.load(); cache = s.cache; attempt = s.attempt; loaded = true;
}

/** The one answer for screens, alerts and schedule blocks. Never waits; reads the copy already in memory. */
export function resolvedPrayerTimes(date: CalDate): ResolvedTimes {
  return resolveTimes(date, prefs.prayerCoords, prefs.prayerSettings, prefs.prayerSync, cache);
}

/** Called on app start and when the app comes back to the front. Does nothing unless the user turned the update on. Never throws. */
export async function maybeSyncPrayerTimes(force = false): Promise<SyncOutcome> {
  const sync = prefs.prayerSync;
  if (!sync.on) { lastOutcome = "off"; return lastOutcome; }
  try { await ensureLoaded(); } catch { /* start without a saved copy */ }
  const settings = prefs.prayerSettings; const key = cacheKey(settings, sync.place);
  const nowMs = deps.now(); const today = dhakaNow(nowMs).date;
  if (!deps.online()) { lastOutcome = "offline"; return lastOutcome; }
  if (!force && !shouldFetch({ sync, online: true, cache, attempt, key, today, nowMs })) { lastOutcome = "skipped"; return lastOutcome; }
  if (running) return lastOutcome;
  running = true;
  try {
    attempt = { at: new Date(nowMs).toISOString(), key }; void deps.repo.saveAttempt(attempt);
    const results = await Promise.all(monthsToFetch(today).map((m) => deps.source.fetchMonth({ y: m.y, m: m.m, place: sync.place, settings })));
    const days: Record<string, DayTimes> = {}; let any = false;
    for (const r of results) if (r.ok) { any = true; Object.assign(days, r.value); }
    // The user may have turned it off or changed the method while the request was out: then the answer is dropped.
    const now = prefs.prayerSync;
    if (!now.on || cacheKey(prefs.prayerSettings, now.place) !== key) { lastOutcome = "skipped"; return lastOutcome; }
    if (!any) { lastOutcome = "failed"; return lastOutcome; }
    const keepOld = cache && cache.key === key ? cache.days : {};
    const next: PrayerCache = { v: 1, key, source: SOURCE_ID, fetchedAt: new Date(nowMs).toISOString(), days: trimDays({ ...keepOld, ...days }, today) };
    cache = next; await deps.repo.saveCache(next); lastOutcome = "updated"; deps.redraw(); return lastOutcome;
  } catch { lastOutcome = "failed"; return lastOutcome; }
  finally { running = false; }
}

/** The tick was given: record the choice with the city and country that will be sent, then ask once. Returns false for a refused place name. */
export function turnOnPrayerSync(cityRaw: string, countryRaw: string): boolean {
  const city = cleanPlaceName(cityRaw), country = cleanPlaceName(countryRaw);
  if (!city || !country) return false;
  prefs.prayerSync = { v: 1, on: true, since: new Date(deps.now()).toISOString(), place: { city, country } };
  void maybeSyncPrayerTimes(true).finally(() => deps.redraw());
  return true;
}
/** Withdraw: stops all requests at once and forgets the saved copy. The phone's own calculation answers again. */
export async function turnOffPrayerSync(): Promise<void> {
  prefs.prayerSync = { v: 1, on: false, since: null, place: prefs.prayerSync.place };
  cache = null; attempt = null; loaded = true; lastOutcome = "off";
  await deps.repo.clear(); deps.redraw();
}

export interface SyncStatus { sync: SyncSettings; resolved: ResolvedTimes; daysSaved: number; lastTry: SyncOutcome }
export function syncStatus(date: CalDate): SyncStatus {
  return { sync: prefs.prayerSync, resolved: resolvedPrayerTimes(date), daysSaved: daysLeft(cache, date), lastTry: lastOutcome };
}
/** Start-up: load the saved copy (so offline starts already know the times), redraw, then ask at most once. Fire and forget. */
export async function startPrayerSync(): Promise<void> {
  if (!prefs.prayerSync.on) return;
  try { await ensureLoaded(); deps.redraw(); } catch { /* local calculation answers */ }
  await maybeSyncPrayerTimes();
}

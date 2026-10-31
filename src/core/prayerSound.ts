// Azan sound plan (M13). Pure: no UI, no direct network. The app ships NO audio file and downloads none.
// The owner drops a licensed recording into public/audio/ (see docs/azan.md). Presence is detected with a same-origin HEAD
// request through an injected fetch, so the code is testable and an absent file is simply "silent / vibration", never an error.
import type { AlertSlot } from "./prayerAlerts";
import type { PrayerKey } from "./prayer";

/** Slot for the one azan used at every prayer. Same-origin, relative to the app. */
export const AZAN_FILE = "./audio/azan.mp3";
/** Optional slot: a different recording for Fajr. Used only if present. */
export const AZAN_FAJR_FILE = "./audio/azan-fajr.mp3";
/** Largest file the app accepts (bytes). Larger files are ignored so the offline cache stays small. */
export const AZAN_MAX_BYTES = 3 * 1024 * 1024;
/** Short, calm vibration pattern in milliseconds. */
export const VIBRATE_PATTERN: readonly number[] = [200, 100, 200];
export const DEFAULT_AZAN_VOLUME = 80;

export type SoundPlan = "audio" | "vibrate" | "none";
export interface AzanAvailability { main: boolean; fajr: boolean }
export const NO_AZAN: AzanAvailability = { main: false, fajr: false };

type HeadFetch = (url: string, init: { method: "HEAD"; cache: "no-store" }) => Promise<{ ok: boolean; headers: { get(name: string): string | null } }>;

/** True only for a real audio file within the size limit. A page returned for a missing path (HTML) does not count. Never throws. */
export async function probeAudio(fetchFn: HeadFetch, url: string): Promise<boolean> {
  try {
    const r = await fetchFn(url, { method: "HEAD", cache: "no-store" });
    if (!r.ok) return false;
    const type = (r.headers.get("content-type") ?? "").toLowerCase();
    if (!(type.startsWith("audio/") || type.startsWith("application/ogg") || type.startsWith("application/octet-stream"))) return false;
    const len = Number(r.headers.get("content-length"));
    if (Number.isFinite(len) && len > AZAN_MAX_BYTES) return false;
    return true;
  } catch { return false; }
}

export async function detectAzan(fetchFn: HeadFetch): Promise<AzanAvailability> {
  const [main, fajr] = await Promise.all([probeAudio(fetchFn, AZAN_FILE), probeAudio(fetchFn, AZAN_FAJR_FILE)]);
  return { main, fajr };
}

/** File to play for a prayer, or null when nothing was added. Fajr prefers its own file, then the main one. */
export function azanFileFor(prayer: PrayerKey, a: AzanAvailability): string | null {
  if (prayer === "fajr" && a.fajr) return AZAN_FAJR_FILE;
  return a.main ? AZAN_FILE : null;
}

/** Whole number 0 to 100; anything else falls back to the default. */
export function clampVolume(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : DEFAULT_AZAN_VOLUME;
}

/** What to do when an alert is delivered. Sound is for the azan alert only, only if the user switched it on.
 *  Volume 0 means silent. With reduced motion the vibration is skipped (audio is not motion). */
export function soundPlan(slot: Pick<AlertSlot, "kind">, soundOn: boolean, audioFile: string | null, canVibrate: boolean, volume: number = DEFAULT_AZAN_VOLUME, reducedMotion = false): SoundPlan {
  if (!soundOn || slot.kind !== "azan" || volume <= 0) return "none";
  if (audioFile) return "audio";
  return canVibrate && !reducedMotion ? "vibrate" : "none";
}

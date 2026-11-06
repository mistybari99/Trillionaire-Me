// Azan sound plan (M13). Pure: no UI, no direct network. The app ships NO audio file and downloads none.
// The owner drops a licensed recording into public/audio/ (see docs/azan.md). Presence is detected with a same-origin HEAD
// request through an injected fetch, so the code is testable and an absent file is simply "silent / vibration", never an error.
import type { AlertSlot } from "./prayerAlerts";

/** Older file names, still used as slot 1 (see azanSlots.ts for the 4 slots). */
export const AZAN_FILE = "./audio/azan.mp3";
export const AZAN_FAJR_FILE = "./audio/azan-fajr.mp3";
/** Largest file the app accepts (bytes). Larger files are ignored so the offline cache stays small. */
export const AZAN_MAX_BYTES = 3 * 1024 * 1024;
/** Short, calm vibration pattern in milliseconds. */
export const VIBRATE_PATTERN: readonly number[] = [200, 100, 200];
export const DEFAULT_AZAN_VOLUME = 80;

export type SoundPlan = "audio" | "vibrate" | "none";
export type HeadFetch = (url: string, init: { method: "HEAD"; cache: "no-store" }) => Promise<{ ok: boolean; headers: { get(name: string): string | null } }>;

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

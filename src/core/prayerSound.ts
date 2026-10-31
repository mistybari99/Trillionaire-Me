// Azan sound plan (M13). Pure. The app ships NO audio file: a recording must be supplied and licensed by the owner,
// then its path is set in AZAN_AUDIO_FILE (it must live inside the app, e.g. "./audio/azan.mp3"; nothing is fetched from the internet).
// Until then the sound setting gives a short vibration where the phone allows it, and otherwise stays silent.
import type { AlertSlot } from "./prayerAlerts";

/** Path of the bundled azan audio, or null when the owner has not added one yet. */
export const AZAN_AUDIO_FILE: string | null = null;
/** Short, calm vibration pattern in milliseconds. */
export const VIBRATE_PATTERN: readonly number[] = [200, 100, 200];

export type SoundPlan = "audio" | "vibrate" | "none";

/** What to do when an alert is delivered. Sound is for the azan alert only, only if the user switched it on. */
export function soundPlan(slot: Pick<AlertSlot, "kind">, soundOn: boolean, audioFile: string | null, canVibrate: boolean): SoundPlan {
  if (!soundOn || slot.kind !== "azan") return "none";
  if (audioFile) return "audio";
  return canVibrate ? "vibrate" : "none";
}

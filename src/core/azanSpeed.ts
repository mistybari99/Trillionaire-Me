// Azan playback speed (pure). The recording's real length comes from the audio file's own metadata; nothing is guessed.
// Unknown length is never shown as 0: the calculation says "unknown" and the screen shows that word.
export const SPEED_MIN = 0.75;
export const SPEED_MAX = 1.5;
export const SPEED_STEP = 0.05;
export const DEFAULT_SPEED = 1;

/** A speed from 0.75 to 1.5 in steps of 0.05. Anything else (text, NaN, out of range) falls back to 1.0 or the nearest limit. */
export function clampSpeed(v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return DEFAULT_SPEED;
  const stepped = Math.round(v / SPEED_STEP) * SPEED_STEP;
  return Math.round(Math.min(SPEED_MAX, Math.max(SPEED_MIN, stepped)) * 100) / 100;
}

/** Whole seconds as m:ss (4:10). Null for an unknown or non-positive length: never "0:00". */
export function formatDuration(sec: unknown): string | null {
  if (typeof sec !== "number" || !Number.isFinite(sec) || sec <= 0) return null;
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export type SpeedReadout =
  | { known: false; rate: number }
  | { known: true; rate: number; originalSec: number; adjustedSec: number; original: string; adjusted: string; diffSec: number; direction: "shorter" | "longer" | "same" };

/** Length at normal speed and at the chosen speed. Playing at rate r takes duration / r. */
export function speedReadout(durationSec: unknown, rate: unknown): SpeedReadout {
  const r = clampSpeed(rate);
  const original = formatDuration(durationSec);
  if (original === null) return { known: false, rate: r };
  const originalSec = Math.round(durationSec as number);
  const adjustedSec = Math.max(1, Math.round(originalSec / r));
  const diff = originalSec - adjustedSec;
  return { known: true, rate: r, originalSec, adjustedSec, original, adjusted: formatDuration(adjustedSec) as string, diffSec: Math.abs(diff), direction: diff > 0 ? "shorter" : diff < 0 ? "longer" : "same" };
}

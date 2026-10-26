// Focus timer: pure time maths. The UI stores {phase, startedAt, pausedMs} and asks for what is left; nothing here touches the clock.
export type Phase = "focus" | "rest";
export interface Session { phase: Phase; minutes: number; startedAt: number; pausedAt: number | null; pausedMs: number }
export const PRESETS = [10, 25, 45] as const;
export const REST_MINUTES = 5;
export const MAX_MINUTES = 120;

export const start = (phase: Phase, minutes: number, now: number): Session => {
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > MAX_MINUTES) throw new Error("minutes out of range");
  return { phase, minutes: Math.round(minutes), startedAt: now, pausedAt: null, pausedMs: 0 };
};
export const elapsedMs = (s: Session, now: number): number => Math.max(0, (s.pausedAt ?? now) - s.startedAt - s.pausedMs);
export const remainingMs = (s: Session, now: number): number => Math.max(0, s.minutes * 60_000 - elapsedMs(s, now));
export const isFinished = (s: Session, now: number): boolean => remainingMs(s, now) === 0;
export const pause = (s: Session, now: number): Session => (s.pausedAt === null ? { ...s, pausedAt: now } : s);
export const resume = (s: Session, now: number): Session => (s.pausedAt === null ? s : { ...s, pausedAt: null, pausedMs: s.pausedMs + (now - s.pausedAt) });
/** ±5 minutes without losing what has already passed; never below what has elapsed + 1 minute, never above the cap. */
export const adjust = (s: Session, deltaMin: number, now: number): Session => {
  const minElapsed = Math.ceil(elapsedMs(s, now) / 60_000) + 1;
  return { ...s, minutes: Math.min(MAX_MINUTES, Math.max(minElapsed, s.minutes + deltaMin)) };
};
/** Minutes truly focused so far (whole minutes, rounded down) — what gets recorded if the user stops early. */
export const focusedMinutes = (s: Session, now: number): number => (s.phase === "focus" ? Math.min(s.minutes, Math.floor(elapsedMs(s, now) / 60_000)) : 0);
export const fmt = (ms: number): string => { const t = Math.ceil(ms / 1000); return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; };

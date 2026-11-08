// Q-12: the hidden-effort buffer bar. The user's own minutes per step plus a lighter +25 percent segment (an ESTIMATE, the same +25 percent the Topics tip suggests).
// Pure. If any step has no minutes the answer is "unknown": a missing number is never counted as 0.
export type BufferBar = { kind: "none" } | { kind: "unknown"; missing: number } | { kind: "ok"; own: number; extra: number; total: number };
export const BUFFER_PERCENT = 25;
export function bufferBar(minutes: ReadonlyArray<number | null>): BufferBar {
  if (minutes.length === 0) return { kind: "none" };
  const bad = minutes.filter((m) => m === null || !Number.isFinite(m) || m <= 0).length;
  if (bad > 0) return { kind: "unknown", missing: bad };
  const own = (minutes as number[]).reduce((a, b) => a + b, 0); const extra = Math.ceil((own * BUFFER_PERCENT) / 100);
  return { kind: "ok", own, extra, total: own + extra };
}

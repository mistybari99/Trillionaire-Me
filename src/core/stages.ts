// Stage A–H rules (TM-REQ-166, DP-04). Pure. Passing needs real evidence, order is fixed, history is append-only,
// and an unmet condition is information ("what is left"), never a failure.
import { completeness, type Answers } from "./intake";
import type { Bi } from "../i18n/registry";

export const STAGE_CODES = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;
export type StageCode = (typeof STAGE_CODES)[number];

export interface StageCtx { answers: Answers; goalCount: number }
export interface Condition { id: string; text: Bi; met: boolean; auto: boolean }

export class StageError extends Error {}

/** Stage A is checked automatically from the diary; later stages are the user's own evidence (templates are editable later). */
export function conditions(ctx: StageCtx, code: StageCode): Condition[] {
  if (code === "A") {
    const c = completeness(ctx.answers);
    return [
      { id: "A1", auto: true, met: c.requiredAddressed === c.requiredTotal, text: { bn: "ডায়েরির আবশ্যক প্রশ্নগুলোর সবকটির উত্তর দেওয়া হয়েছে (“পরে” চলবে)", en: "Every required diary question is answered (“Later” counts)" } },
      { id: "A2", auto: true, met: ctx.goalCount >= 1, text: { bn: "অন্তত একটি লক্ষ্য লেখা হয়েছে", en: "At least one goal is written" } },
    ];
  }
  return [{ id: `${code}1`, auto: false, met: false, text: { bn: "এই ধাপের শর্ত পূরণের প্রমাণ আপনি নিজের ভাষায় লিখেছেন", en: "You wrote your own evidence that this stage’s condition is met" } }];
}

export const currentIndex = (passed: readonly string[]): number => {
  let i = 0; while (i < STAGE_CODES.length && passed.includes(STAGE_CODES[i]!)) i++; return i;
};

export interface PassRecord { code: StageCode; evidence: string; progressPct: number; at: string }

/** Validate and build the pass. Returns the new record; the caller appends it (nothing is ever removed). */
export function passStage(ctx: StageCtx, passed: readonly string[], code: StageCode, evidence: string, now = new Date()): PassRecord {
  const cur = currentIndex(passed);
  if (cur >= STAGE_CODES.length) throw new StageError("all stages are done");
  if (STAGE_CODES[cur] !== code) throw new StageError("only the current stage can be passed");
  const cs = conditions(ctx, code);
  if (!cs.filter((c) => c.auto).every((c) => c.met)) throw new StageError("conditions are not met yet");
  const ev = evidence.trim();
  if (!cs.some((c) => c.auto) && ev.length < 3) throw new StageError("evidence is needed");
  return { code, evidence: ev, progressPct: completeness(ctx.answers).pct, at: now.toISOString() };
}

export type StageState = "done" | "now" | "locked";
export const stageStates = (passed: readonly string[]): StageState[] => { const cur = currentIndex(passed); return STAGE_CODES.map((_, i) => (i < cur ? "done" : i === cur ? "now" : "locked")); };

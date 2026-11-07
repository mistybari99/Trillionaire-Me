// Guided progressive intake (TM-REQ-010, 067, 145). Pure functions over fields + answered values.
import { FIELDS, intakeSteps } from "../catalog/fields";
import type { FieldDef } from "../catalog/types";
import type { RecordValues } from "./types";

export const MAX_FIELDS_PER_SCREEN = 7;

/** Answers keyed by field id. A deliberate "unknown/later/NA/prefer_not" counts as ADDRESSED, not as filled. */
export type Answers = RecordValues;

export const stepFields = (step: number): FieldDef[] => FIELDS.filter((f) => f.step === step);

export interface Completeness {
  requiredTotal: number; requiredFilled: number; requiredAddressed: number;
  filled: number; addressed: number; total: number; pct: number;
}

const inIntake = FIELDS.filter((f) => f.step > 0);

export function completeness(a: Answers): Completeness {
  const req = inIntake.filter((f) => f.requirement === "required");
  const filled = inIntake.filter((f) => a[f.id]?.state === "value").length;
  const addressed = inIntake.filter((f) => a[f.id] !== undefined).length;
  return {
    requiredTotal: req.length,
    requiredFilled: req.filter((f) => a[f.id]?.state === "value").length,
    requiredAddressed: req.filter((f) => a[f.id] !== undefined).length,
    filled, addressed, total: inIntake.length,
    pct: Math.round((filled / inIntake.length) * 100),
  };
}

export interface NextStep { field: FieldDef | null; step: number | null; reasonKey: "required_missing" | "useful_missing" | "all_done" }

/** Next field to ask and WHY. Required first, then core, then useful; optional ones are never pushed. */
export function nextStep(a: Answers): NextStep {
  const order = (f: FieldDef) => (f.requirement === "required" ? 0 : f.importance === "core" ? 1 : 2);
  const open = inIntake.filter((f) => a[f.id] === undefined && f.importance !== "optional");
  open.sort((x, y) => order(x) - order(y) || x.step - y.step);
  const f = open[0];
  if (!f) return { field: null, step: null, reasonKey: "all_done" };
  return { field: f, step: f.step, reasonKey: f.requirement === "required" ? "required_missing" : "useful_missing" };
}

export const firstOpenStep = (a: Answers): number | null => nextStep(a).step ?? intakeSteps().find((s) => stepFields(s).some((f) => a[f.id] === undefined)) ?? null;

// Core value model. Unknown is never 0 (TM-REQ-021); every value carries a label (TM-REQ-006).
export type Label = "FACT" | "ESTIMATE" | "INFERENCE" | "EXTERNAL" | "DEMO";
export const LABELS: readonly Label[] = ["FACT", "ESTIMATE", "INFERENCE", "EXTERNAL", "DEMO"];

export type UnknownState = "unknown" | "later" | "not_applicable" | "prefer_not";
export const UNKNOWN_STATES: readonly UnknownState[] = ["unknown", "later", "not_applicable", "prefer_not"];

export type Namespace = "demo" | "real";

export type FieldValue<T = unknown> =
  | { state: "value"; value: T; label: Label }
  | { state: UnknownState };

export type RecordValues = Record<string, FieldValue>;

export interface TMRecord {
  id: string;
  entity: string;
  ns: Namespace;
  ownerId: string;
  schemaVersion: number;
  createdAt: string;
  values: RecordValues;
  /** structural links, e.g. { parent: "goal-1" } for the Goal → Subgoal → Project → Task hierarchy */
  links?: Record<string, string>;
}

export const isUnknown = (v: FieldValue | undefined): v is { state: UnknownState } =>
  !!v && v.state !== "value";

/** Numeric reader: returns null (never 0) when the value is not a real number. */
export function numberOrNull(v: FieldValue | undefined): number | null {
  if (!v || v.state !== "value") return null;
  return typeof v.value === "number" && Number.isFinite(v.value) ? v.value : null;
}

/** Sum that refuses to treat unknowns as zero: null if ANY addend is unknown. */
export function sumKnown(vs: (FieldValue | undefined)[]): number | null {
  let t = 0;
  for (const v of vs) {
    const n = numberOrNull(v);
    if (n === null) return null;
    t += n;
  }
  return t;
}

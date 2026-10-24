// M03 North Star measure and milestone ladder (demo namespace). Pure.
// One measure per record; several measures stay separate (TM-REQ-002). Unknown start or target gives no ladder, never zeros.
import type { FieldValue, TMRecord } from "./types";
import { numberOrNull } from "./types";

export interface StarRow { id: string; metric: string; unit: string | null; baseline: number | null; target: number | null }
export type Ladder =
  | { status: "ok"; levels: number[] }            // start, evenly spaced steps, target (linear, rounded to 1 decimal)
  | { status: "same" }                            // start equals target: nothing to climb
  | { status: "unknown"; missing: Array<"baseline" | "target"> };

const str = (v: FieldValue | undefined): string | null => (v?.state === "value" && typeof v.value === "string" && v.value.trim() ? v.value.trim() : null);

export function starRows(recs: TMRecord[]): StarRow[] {
  return recs.filter((r) => r.entity === "north_star").map((r): StarRow => ({
    id: r.id, metric: str(r.values["north_star.metric"]) ?? "", unit: str(r.values["north_star.unit"]),
    baseline: numberOrNull(r.values["north_star.baseline"]), target: numberOrNull(r.values["north_star.target"]),
  })).sort((a, b) => (a.metric < b.metric ? -1 : a.metric > b.metric ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Evenly spaced steps from the starting number to the target. Steps must be 1 or more. */
export function ladder(baseline: number | null, target: number | null, steps = 3): Ladder {
  const missing: Array<"baseline" | "target"> = [];
  if (baseline === null) missing.push("baseline");
  if (target === null) missing.push("target");
  if (missing.length) return { status: "unknown", missing };
  const b = baseline as number, g = target as number;
  if (b === g) return { status: "same" };
  const n = Math.max(1, Math.floor(steps));
  const pts = [b];
  for (let i = 1; i <= n; i++) pts.push(Math.round((b + ((g - b) * i) / (n + 1)) * 10) / 10);
  pts.push(g);
  return { status: "ok", levels: pts };
}

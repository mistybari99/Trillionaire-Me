import type { Label } from "../core/types";
import type { FieldDef } from "./types";

const ESTIMATE_FIELDS = new Set(["skill.level", "interest.energy", "constraint.weekly_free_hours", "task.minutes", "venture.valuation", "finance.amount"]);
/** The label a value of this field carries in the REAL namespace. In the demo namespace every value is DEMO. */
export function semanticLabel(f: FieldDef): Label {
  return ESTIMATE_FIELDS.has(f.id) ? "ESTIMATE" : "FACT";
}

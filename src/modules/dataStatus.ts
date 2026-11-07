// Data status of a module on THIS phone, in the mode that is showing. It is separate from the build status (capability.ts):
// an empty module can be fully built, and a module full of demo data can still be partly built.
//   none  = the module keeps no records of its own
//   empty = no record of the module in this mode
//   demo  = holds DEMO records (mode: demo)
//   real  = holds real records (mode: real)
import { ENTITIES } from "../schema/entities";
import type { Namespace, TMRecord } from "../core/types";

export type DataStatus = "none" | "empty" | "demo" | "real";

export const entitiesOf = (moduleId: string): string[] => ENTITIES.filter((e) => e.module === moduleId).map((e) => e.id);

/** Counts only records of the given mode, so a demo record can never make a real module look filled (or the other way round). */
export function dataStatus(moduleId: string, recs: readonly TMRecord[], mode: Namespace): DataStatus {
  const ents = entitiesOf(moduleId);
  if (ents.length === 0) return "none";
  const n = recs.filter((r) => r.ns === mode && ents.includes(r.entity)).length;
  return n === 0 ? "empty" : mode === "real" ? "real" : "demo";
}

export function recordCount(moduleId: string, recs: readonly TMRecord[], mode: Namespace): number {
  const ents = entitiesOf(moduleId);
  return recs.filter((r) => r.ns === mode && ents.includes(r.entity)).length;
}

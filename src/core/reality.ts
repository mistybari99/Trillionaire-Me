// O6: "reality changed" loop for one plan step (task). Pure. Nothing is deleted: the step stays on record,
// it just stops being scheduled, and the change is written as a new journey-log record (append-only).
import type { TMRecord } from "./types";

export class RealityError extends Error {}
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Mark a plan step as no longer true. Finished steps and already-marked steps are refused. */
export function markNotTrue(task: TMRecord, day: string): TMRecord {
  if (task.entity !== "task") throw new RealityError("only plan steps can be marked");
  if (task.values["task.done_on"]?.state === "value") throw new RealityError("a finished step is history");
  if (task.values["task.not_true_on"]?.state === "value") throw new RealityError("already marked");
  if (!DAY.test(day)) throw new RealityError("day must be YYYY-MM-DD");
  return { ...task, values: { ...task.values, "task.not_true_on": { state: "value", value: day, label: "DEMO" } } };
}

/** The journey-log record for one change. `text` is already localised by the UI. */
export function realityLogRecord(p: { id: string; taskId: string; text: string; createdAt: string; ownerId?: string }): TMRecord {
  return {
    id: p.id, entity: "journey_log", ns: "demo", ownerId: p.ownerId ?? "demo-user", schemaVersion: 1, createdAt: p.createdAt,
    links: { task: p.taskId },
    values: { "journey_log.entry": { state: "value", value: p.text, label: "DEMO" } },
  };
}

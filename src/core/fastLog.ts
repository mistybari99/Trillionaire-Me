// M13 fasting marks (content-free): one record per date in the existing `fast` entity.
// Tap once to mark a fasting day, tap again to undo. Nothing is counted, scored or ranked.
import type { TMRecord } from "./types";

export const fastLogId = (date: string) => `fast-${date}`;

/** The record for one marked day. Values are DEMO-labelled to match the demo namespace (the real namespace stays closed, D-B). */
export function fastLogRecord(date: string, nowIso: string): TMRecord {
  return {
    id: fastLogId(date), entity: "fast", ns: "demo", ownerId: "demo-user", schemaVersion: 1, createdAt: nowIso,
    values: { "fast.date": { state: "value", value: date, label: "DEMO" } },
  };
}

/** Whether a given date is marked. Reads only `fast` records with a real date value. */
export function isFastMarked(records: TMRecord[], date: string): boolean {
  return records.some((r) => r.entity === "fast" && r.values["fast.date"]?.state === "value" && r.values["fast.date"].value === date);
}

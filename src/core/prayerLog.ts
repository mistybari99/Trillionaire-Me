// Prayer marks (M13). One record per prayer per Dhaka day in the existing `prayer_log` entity.
// Tapping once logs the prayer; tapping again removes the record (undo). Nothing is scored, ranked or counted.
import type { TMRecord } from "./types";
import { PRAYER_KEYS, type PrayerKey } from "./prayer";

export const prayerLogId = (date: string, prayer: PrayerKey) => `prayer-${date}-${prayer}`;

/** The record for one marked prayer. Values are DEMO-labelled to match the demo namespace (the real namespace stays closed, D-B). */
export function prayerLogRecord(date: string, prayer: PrayerKey, nowIso: string): TMRecord {
  return {
    id: prayerLogId(date, prayer), entity: "prayer_log", ns: "demo", ownerId: "demo-user", schemaVersion: 1, createdAt: nowIso,
    links: { prayer },
    values: { "prayer_log.date": { state: "value", value: date, label: "DEMO" } },
  };
}

/** Which prayers are marked on a given date. Reads only prayer_log records with a known prayer link. */
export function markedOn(records: TMRecord[], date: string): Set<PrayerKey> {
  const out = new Set<PrayerKey>();
  for (const r of records) {
    if (r.entity !== "prayer_log") continue;
    const p = r.links?.prayer as PrayerKey | undefined;
    if (p && (PRAYER_KEYS as readonly string[]).includes(p) && r.values["prayer_log.date"]?.state === "value" && r.values["prayer_log.date"].value === date) out.add(p);
  }
  return out;
}

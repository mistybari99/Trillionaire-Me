// TM-REQ-040: hard constraints (prayer, family, rest, legal) are never used by the scheduler. A person may still choose to place
// a step on top of one. That needs an explicit confirmation and always leaves a log entry. Pure; nothing is stored here.
import type { Block, Placement, Plan } from "./planner";
import type { TMRecord } from "./types";

export interface OverrideEntry { taskId: string; day: number; start: number; end: number; overlaps: Block[]; at: string }
export type OverrideResult =
  | { ok: true; plan: Plan; log: OverrideEntry | null }
  | { ok: false; reason: "needs_confirmation" | "bad_slot" | "already_placed"; overlaps: Block[] };

export const overlapsOf = (p: Pick<Placement, "day" | "start" | "end">, blocked: readonly Block[]): Block[] =>
  blocked.filter((b) => b.day === p.day && b.start < p.end && p.start < b.end);

/** Place one step by hand. No overlap: placed, no log. Overlap: refused unless confirmOverride is true; then placed and logged. */
export function placeByHand(plan: Plan, slot: Placement, blocked: readonly Block[], o: { confirmOverride: boolean; at: string }): OverrideResult {
  if (!(slot.end > slot.start) || slot.start < 0 || slot.end > 1440 || slot.day < 0 || slot.day > 6 || !Number.isInteger(slot.day)) return { ok: false, reason: "bad_slot", overlaps: [] };
  if (plan.placements.some((p) => p.taskId === slot.taskId)) return { ok: false, reason: "already_placed", overlaps: [] };
  const overlaps = overlapsOf(slot, blocked);
  if (overlaps.length && !o.confirmOverride) return { ok: false, reason: "needs_confirmation", overlaps };
  const next: Plan = { placements: [...plan.placements, slot], deferred: plan.deferred.filter((d) => d.taskId !== slot.taskId), usedMinutes: plan.usedMinutes + (slot.end - slot.start) };
  return { ok: true, plan: next, log: overlaps.length ? { taskId: slot.taskId, day: slot.day, start: slot.start, end: slot.end, overlaps, at: o.at } : null };
}

/** The journey-log record for one override. `text` is already localised by the caller. Append-only. */
export function overrideLogRecord(e: OverrideEntry, p: { id: string; text: string; ns: "demo" | "real"; ownerId: string }): TMRecord {
  const label = p.ns === "demo" ? "DEMO" : "FACT";
  return { id: p.id, entity: "journey_log", ns: p.ns, ownerId: p.ownerId, schemaVersion: 1, createdAt: e.at, links: { task: e.taskId },
    values: { "journey_log.entry": { state: "value", value: p.text, label } } };
}

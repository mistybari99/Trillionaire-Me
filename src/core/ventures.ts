// M09 venture / asset list rows (demo namespace). Pure.
// Ownership unknown stays unknown: no equity value is computed from it, and it is never taken as 0.
import type { FieldValue, TMRecord } from "./types";

export const STAGES = ["idea", "testing", "running", "paused", "closed"] as const;
export type VentureStage = (typeof STAGES)[number];
export interface VentureRow { id: string; name: string; stage: VentureStage | null; ownership: number | null }
export type OwnershipInput = { state: "value"; value: number } | { state: "unknown" } | null; // null = not a valid entry

const str = (v: FieldValue | undefined): string | null => (v?.state === "value" && typeof v.value === "string" && v.value.trim() ? v.value.trim() : null);

export function ventureRows(recs: TMRecord[]): VentureRow[] {
  return recs.filter((r) => r.entity === "venture").map((r): VentureRow => {
    const st = str(r.values["venture.stage"]);
    const own = r.values["venture.ownership_pct"];
    return { id: r.id, name: str(r.values["venture.name"]) ?? "", stage: st && (STAGES as readonly string[]).includes(st) ? (st as VentureStage) : null,
      ownership: own?.state === "value" && typeof own.value === "number" ? own.value : null };
  }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Blank = unknown. A number must be 0–100. Bangla digits are accepted. Anything else is invalid (null). */
export function parseOwnership(raw: string): OwnershipInput {
  const s = raw.trim().replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6));
  if (s === "") return { state: "unknown" };
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return { state: "value", value: n };
}

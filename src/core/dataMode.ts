// Data mode (owner rule 25 Oct 2026): "demo" and "real" never mix. DEMO data is not permanent.
// Pure: no storage, clock or UI in here. Callers pass in today's date and the stored state.
import type { Namespace, TMRecord } from "./types";

export type DataMode = Namespace; // "demo" | "real"

/** How many separate days the app must be opened in demo mode before it asks to delete demo data. */
export const DEMO_DAYS_BEFORE_ASK = 3;
const MAX_DAYS_KEPT = 60;

export const isDataMode = (v: unknown): v is DataMode => v === "demo" || v === "real";

/** Adds today's date (YYYY-MM-DD) to the list of days the app was opened. Distinct, sorted, capped. */
export function recordDay(days: readonly string[], today: string): string[] {
  const set = new Set(days.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)));
  if (/^\d{4}-\d{2}-\d{2}$/.test(today)) set.add(today);
  return [...set].sort().slice(-MAX_DAYS_KEPT);
}

export interface AskInput { mode: DataMode | null; days: readonly string[]; askedOn: string; today: string }

/** Ask to delete demo data: only in demo mode, after enough separate days, and at most once per day. */
export function shouldAskDeleteDemo(i: AskInput): boolean {
  if (i.mode !== "demo") return false;
  if (new Set(i.days).size < DEMO_DAYS_BEFORE_ASK) return false;
  return i.askedOn !== i.today;
}

/** The only records a screen or a calculation may see: the active namespace, nothing from the other one. */
export function visibleRecords(mode: DataMode, demo: readonly TMRecord[], real: readonly TMRecord[]): TMRecord[] {
  return (mode === "real" ? real : demo).filter((r) => r.ns === mode);
}

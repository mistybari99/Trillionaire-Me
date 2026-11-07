// Q-13: the tiny-habit starter and the optional start / end day of a habit. Pure. Nothing here judges or counts a run.
import { addDays, parseIso } from "./habits";

export const MICRO_MAX_MINUTES = 2;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
export const validIso = (s: string): boolean => { if (!ISO.test(s)) return false; const d = parseIso(s); return Number.isFinite(d.getTime()) && `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` === s; };

export type MicroCheck = { ok: true; title: string; anchor: string; minutes: number } | { ok: false };
/** A tiny habit needs a name, an anchor ("After I...") and 1 or 2 minutes. */
export function checkMicro(input: { title: string; anchor: string; minutes: string }): MicroCheck {
  const title = input.title.trim(), anchor = input.anchor.trim(); const raw = input.minutes.trim().replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6)); const n = Number(raw);
  if (!title || !anchor || raw === "" || !Number.isInteger(n) || n < 1 || n > MICRO_MAX_MINUTES) return { ok: false };
  return { ok: true, title, anchor, minutes: n };
}

/** The starter is offered only when no habit was added in the last 14 days (no other new habit is active). It never blocks anything. */
export const NEW_HABIT_DAYS = 14;
export function microOffered(habitCreatedAt: readonly string[], today: string): boolean {
  const from = addDays(today, -NEW_HABIT_DAYS);
  return !habitCreatedAt.some((c) => { const t = Date.parse(c); if (!Number.isFinite(t)) return false; const d = new Date(t); const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; return day >= from; });
}

/** Both days are optional. Together they must be valid days with the end not before the start. */
export function checkRange(start: string, end: string): "ok" | "bad" {
  if (start !== "" && !validIso(start)) return "bad"; if (end !== "" && !validIso(end)) return "bad";
  return start !== "" && end !== "" && end < start ? "bad" : "ok";
}

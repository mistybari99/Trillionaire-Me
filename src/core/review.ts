// O6: 90-day review. Pure: counts come only from the user's own records, passed in with "today".
// Unknown is never 0 (TM-REQ-021): a measure with no record in the window is null ("not enough data"), not a zero judgement.
import type { FieldValue, TMRecord } from "./types";

export const REVIEW_DAYS = 90;
const pad = (n: number) => String(n).padStart(2, "0");
const dayOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const val = (v: FieldValue | undefined): unknown => (v && v.state === "value" ? v.value : undefined);

/** Window of REVIEW_DAYS calendar days ending on `today` (YYYY-MM-DD, inclusive at both ends). */
export function reviewWindow(today: string): { from: string; to: string } {
  const [y, m, d] = today.split("-").map(Number);
  if (!y || !m || !d) throw new Error("today must be YYYY-MM-DD");
  return { from: dayOf(new Date(y, m - 1, d - (REVIEW_DAYS - 1))), to: today };
}

export interface ReviewSummary {
  from: string;
  to: string;
  /** Tasks finished inside the window, or null when there are none. */
  tasksDone: number | null;
  /** Known focus minutes inside the window, or null when no session has known minutes. */
  focusMinutes: number | null;
  /** Focus sessions in the window whose minutes were never entered (not counted). */
  focusUnknown: number;
  /** Stage passes inside the window, or null when there are none. */
  stagePasses: number | null;
}

const orNull = (n: number): number | null => (n > 0 ? n : null);

export function reviewSummary(recs: readonly TMRecord[], today: string): ReviewSummary {
  const { from, to } = reviewWindow(today);
  const inWindow = (day: string) => day >= from && day <= to;

  const tasksDone = recs.filter((r) => r.entity === "task" && typeof val(r.values["task.done_on"]) === "string" && inWindow(String(val(r.values["task.done_on"])))).length;

  let focusMinutes = 0, focusKnown = 0, focusUnknown = 0;
  for (const r of recs) {
    if (r.entity !== "focus_session") continue;
    const date = val(r.values["focus_session.date"]);
    if (typeof date !== "string" || !inWindow(date)) continue;
    const m = val(r.values["focus_session.minutes"]);
    if (typeof m === "number" && Number.isFinite(m) && m >= 0) { focusMinutes += m; focusKnown++; } else focusUnknown++;
  }

  const stagePasses = recs.filter((r) => r.entity === "stage_pass" && Number.isFinite(Date.parse(r.createdAt)) && inWindow(dayOf(new Date(r.createdAt)))).length;

  return {
    from, to,
    tasksDone: orNull(tasksDone),
    focusMinutes: focusKnown > 0 ? focusMinutes : null,
    focusUnknown,
    stagePasses: orNull(stagePasses),
  };
}

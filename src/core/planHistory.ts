// M12 plan history: dated list of plan steps that were finished or marked "no longer true" (demo namespace). Pure.
// Nothing is deleted from the record; this is a read-only list, newest first.
import type { TMRecord } from "./types";

export interface HistoryRow { id: string; kind: "not_true" | "done"; day: string; title: string }
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function planHistory(recs: TMRecord[]): HistoryRow[] {
  const rows: HistoryRow[] = [];
  for (const r of recs) {
    if (r.entity !== "task") continue;
    const title = String((r.values["task.title"] as { value?: unknown } | undefined)?.value ?? "").trim();
    const done = r.values["task.done_on"], nt = r.values["task.not_true_on"];
    if (nt?.state === "value" && typeof nt.value === "string" && DAY.test(nt.value)) rows.push({ id: `${r.id}:not_true`, kind: "not_true", day: nt.value, title });
    if (done?.state === "value" && typeof done.value === "string" && DAY.test(done.value)) rows.push({ id: `${r.id}:done`, kind: "done", day: done.value, title });
  }
  return rows.sort((a, b) => (a.day !== b.day ? (a.day < b.day ? 1 : -1) : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

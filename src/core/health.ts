// M14 health and family (owner approved 2 Nov 2026): simple records the person types about sleep, walking, water, exercise, family time and
// optional numbers such as blood pressure or sugar. NO normal range, NO threshold, NO alert, NO diagnosis, NO medicine, NO advice, nothing rated.
// Unknown is never 0: a day with no entry is "no entry", not a zero. Pure.
import type { FieldValue, TMRecord } from "./types";
import type { KV } from "./store";

export const HEALTH_KINDS = ["sleep", "walking", "water", "exercise", "family", "reading_a", "reading_b"] as const;
export type HealthKind = (typeof HEALTH_KINDS)[number];
// ---- separate consent tick for health data (own key, same fail-closed pattern as real-data consent) ----
export const HEALTH_CONSENT_KEY = "tm:consent:health:v1";
export function readHealthConsent(kv: KV): boolean { try { const r = JSON.parse(kv.get(HEALTH_CONSENT_KEY) ?? "null") as { v?: number; at?: string } | null; return !!r && r.v === 1 && typeof r.at === "string"; } catch { return false; } }
export function grantHealthConsent(kv: KV, nowIso: string): void { kv.set(HEALTH_CONSENT_KEY, JSON.stringify({ v: 1, at: nowIso })); }
export function revokeHealthConsent(kv: KV): void { kv.remove(HEALTH_CONSENT_KEY); }

const str = (v: FieldValue | undefined): string | null => (v?.state === "value" && typeof v.value === "string" && v.value.trim() ? v.value.trim() : null);
const DAY = /^\d{4}-\d{2}-\d{2}$/;
export interface HealthRow { id: string; ns: TMRecord["ns"]; date: string; kind: HealthKind; value: number | null; unit: string | null; note: string | null }

export function healthRows(recs: readonly TMRecord[]): HealthRow[] {
  return recs.filter((r) => r.entity === "health_entry").flatMap((r) => {
    const d = str(r.values["health_entry.date"]), k = str(r.values["health_entry.kind"]);
    if (!d || !DAY.test(d) || !(HEALTH_KINDS as readonly string[]).includes(k ?? "")) return [];
    const v = r.values["health_entry.value"];
    return [{ id: r.id, ns: r.ns, date: d, kind: k as HealthKind, value: v?.state === "value" && typeof v.value === "number" && Number.isFinite(v.value) && v.value >= 0 ? v.value : null, unit: str(r.values["health_entry.unit"]), note: str(r.values["health_entry.note"]) }];
  }).sort((a, b) => (a.date === b.date ? (a.id < b.id ? 1 : -1) : a.date < b.date ? 1 : -1));
}

const addDays = (day: string, n: number): string => { const [y, m, d] = day.split("-").map(Number); const x = new Date(y!, m! - 1, d! + n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };

/** Per kind: how many days in the last `days` days have at least one entry, and the latest entry. Counts only; no total is compared with anything. */
export interface KindSummary { kind: HealthKind; daysWithEntry: number; latest: HealthRow | null }
export function summarise(rows: readonly HealthRow[], today: string, days = 7): KindSummary[] {
  const from = addDays(today, -(days - 1));
  return HEALTH_KINDS.flatMap((kind) => {
    const mine = rows.filter((r) => r.kind === kind); if (!mine.length) return [];
    return [{ kind, daysWithEntry: new Set(mine.filter((r) => r.date >= from && r.date <= today).map((r) => r.date)).size, latest: mine[0]! }];
  });
}

export type HealthError = "kind_required" | "date_invalid" | "value_invalid" | "unit_long" | "note_long" | "unit_required" | "empty";
export function validateHealth(p: { kind: string; date: string; value: string; unit: string; note: string }): HealthError | null {
  if (!(HEALTH_KINDS as readonly string[]).includes(p.kind)) return "kind_required";
  if (!DAY.test(p.date.trim()) || Number.isNaN(Date.parse(p.date.trim()))) return "date_invalid";
  const raw = p.value.trim().replace(/,/g, "").replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6));
  if (raw !== "" && (!Number.isFinite(Number(raw)) || Number(raw) < 0)) return "value_invalid";
  if (p.unit.trim().length > 20) return "unit_long";
  if (p.note.trim().length > 200) return "note_long";
  if ((p.kind === "reading_a" || p.kind === "reading_b") && raw !== "" && !p.unit.trim()) return "unit_required";
  if (raw === "" && !p.note.trim() && p.kind.startsWith("reading")) return "empty";
  return null;
}

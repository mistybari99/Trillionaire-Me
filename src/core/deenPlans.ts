// M13 Deen plans and reminders (owner approval 2 Nov 2026). The person's own plans: salah, fasting, zakat, learning, family, giving.
// One-tap daily mark that can be undone. Nothing is rated, ordered or ruled on, and there is no count of missed days. Private by default.
// Zakat figure comes ONLY from numbers the person types (wealth, nisab, rate): the app holds no nisab value and no rate. Unknown is never 0. Pure.
import type { FieldValue, TMRecord } from "./types";
import { PRAYER_KEYS, type PrayerKey } from "./prayer";
import { markedOn } from "./prayerLog";
import { isFastMarked } from "./fastLog";
import { SCHEMA_VERSION } from "../schema/entities";

export const PLAN_KINDS = ["salah", "fasting", "zakat", "learning", "family", "giving"] as const;
export type PlanKind = (typeof PLAN_KINDS)[number];
export const REPEATS = ["daily", "weekly", "monthly", "yearly", "once"] as const;
export type Repeat = (typeof REPEATS)[number];
export const PRAYER_LINKS = [...PRAYER_KEYS, "other"] as const;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: FieldValue | undefined): string | null => (v?.state === "value" && typeof v.value === "string" && v.value.trim() ? v.value.trim() : null);
const num = (v: FieldValue | undefined): number | null => (v?.state === "value" && typeof v.value === "number" && Number.isFinite(v.value) ? v.value : null);
const validDay = (s: string) => DAY.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s;

export interface PlanRow { id: string; ns: TMRecord["ns"]; kind: PlanKind; title: string; repeat: Repeat; due: string | null; active: boolean; note: string | null; prayer: PrayerKey | "other" | null }

export function planRows(recs: readonly TMRecord[]): PlanRow[] {
  return recs.filter((r) => r.entity === "deen_plan").flatMap((r) => {
    const kind = str(r.values["deen_plan.kind"]), title = str(r.values["deen_plan.title"]), repeat = str(r.values["deen_plan.repeat"]);
    if (!(PLAN_KINDS as readonly string[]).includes(kind ?? "") || !title || !(REPEATS as readonly string[]).includes(repeat ?? "")) return [];
    const due = str(r.values["deen_plan.due"]); const pr = str(r.values["deen_plan.prayer"]);
    return [{ id: r.id, ns: r.ns, kind: kind as PlanKind, title, repeat: repeat as Repeat, due: due && validDay(due) ? due : null, active: str(r.values["deen_plan.status"]) !== "paused",
      note: str(r.values["deen_plan.note"]), prayer: pr && (PRAYER_LINKS as readonly string[]).includes(pr) ? (pr as PrayerKey | "other") : null }];
  }).sort((a, b) => (a.kind === b.kind ? (a.title < b.title ? -1 : 1) : PLAN_KINDS.indexOf(a.kind) - PLAN_KINDS.indexOf(b.kind)));
}

const parts = (d: string) => d.split("-").map(Number) as [number, number, number];
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const weekday = (d: string) => { const [y, m, dd] = parts(d); return new Date(Date.UTC(y, m - 1, dd)).getUTCDay(); };

/** Whether a plan is due on `day`. Paused plans are never due. A plan that needs a date (weekly, monthly, yearly, once) but has none is not scheduled (Unknown, not "every day"). */
export function isDueOn(p: PlanRow, day: string): boolean {
  if (!p.active) return false;
  if (p.repeat === "daily") return p.due === null || p.due <= day;
  if (p.due === null || p.due > day) return false;
  const [, pm, pd] = parts(p.due), [y, m, d] = parts(day);
  switch (p.repeat) {
    case "once": return p.due === day;
    case "weekly": return weekday(p.due) === weekday(day);
    case "monthly": return d === Math.min(pd, daysIn(y, m));
    case "yearly": return m === pm && d === Math.min(pd, daysIn(y, m));
  }
}

export const planMarkId = (planId: string, day: string) => `deenmark-${planId}-${day}`;
export function planMarkRecord(planId: string, day: string, nowIso: string): TMRecord {
  return { id: planMarkId(planId, day), entity: "deen_mark", ns: "demo", ownerId: "demo-user", schemaVersion: SCHEMA_VERSION, createdAt: nowIso, links: { plan: planId },
    values: { "deen_mark.date": { state: "value", value: day, label: "DEMO" } } };
}
/** How a plan's one-tap mark is kept. A salah plan tied to one of the five prayers and a fasting plan share the marks of the Deen page, so both screens agree. */
export type MarkKind = { via: "prayer"; prayer: PrayerKey } | { via: "fast" } | { via: "plan" };
export function markKind(p: PlanRow): MarkKind {
  if (p.kind === "salah" && p.prayer && p.prayer !== "other") return { via: "prayer", prayer: p.prayer };
  if (p.kind === "fasting") return { via: "fast" };
  return { via: "plan" };
}
export function isMarked(recs: readonly TMRecord[], p: PlanRow, day: string): boolean {
  const k = markKind(p);
  if (k.via === "prayer") return markedOn(recs as TMRecord[], day).has(k.prayer);
  if (k.via === "fast") return isFastMarked(recs as TMRecord[], day);
  const id = planMarkId(p.id, day);
  return recs.some((r) => r.entity === "deen_mark" && r.id === id);
}
/** Plans due today with their mark state. No count of missed days, no history total. */
export function dueToday(recs: readonly TMRecord[], day: string): Array<{ plan: PlanRow; marked: boolean }> {
  return planRows(recs).filter((p) => isDueOn(p, day)).map((plan) => ({ plan, marked: isMarked(recs, plan, day) }));
}

// ---- zakat: only the person's own numbers ----
export type ZakatFigure =
  | { state: "unknown"; missing: Array<"wealth" | "nisab" | "rate"> }
  | { state: "below" }
  | { state: "figure"; amount: number };
/** wealth and nisab are amounts the person typed; rate is the percent the person typed. The app supplies none of them. */
export function zakatFigure(wealth: number | null, nisab: number | null, rate: number | null): ZakatFigure {
  const missing = ([["wealth", wealth], ["nisab", nisab], ["rate", rate]] as const).filter(([, v]) => v === null).map(([k]) => k);
  if (missing.length) return { state: "unknown", missing };
  if (wealth! < nisab!) return { state: "below" };
  return { state: "figure", amount: Math.round(wealth! * rate!) / 100 };
}
export interface ZakatRow { id: string; ns: TMRecord["ns"]; wealth: number | null; nisab: number | null; rate: number | null; hawl: string | null; note: string | null }
export const ZAKAT_ID = "zakat-current";
export function zakatRow(recs: readonly TMRecord[]): ZakatRow | null {
  const r = recs.find((x) => x.entity === "zakat_snapshot" && x.id === ZAKAT_ID); if (!r) return null;
  const h = str(r.values["zakat_snapshot.hawl_on"]);
  return { id: r.id, ns: r.ns, wealth: num(r.values["zakat_snapshot.wealth"]), nisab: num(r.values["zakat_snapshot.nisab"]), rate: num(r.values["zakat_snapshot.rate"]), hawl: h && validDay(h) ? h : null, note: str(r.values["zakat_snapshot.note"]) };
}
const clean = (s: string) => s.trim().replace(/,/g, "").replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6));
export const parseNumber = (s: string): number | null => { const x = clean(s); if (x === "") return null; const n = Number(x); return Number.isFinite(n) ? n : NaN; };
/** Days from `today` to the typed date (negative = already passed); null when no valid date. Shown plainly, never in red. */
export function daysUntil(date: string | null, today: string): number | null {
  if (!date || !validDay(date) || !validDay(today)) return null;
  return Math.round((Date.parse(date + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86400000);
}

// ---- validation ----
export type PlanError = "kind_required" | "title_required" | "title_long" | "repeat_required" | "due_required" | "due_invalid" | "note_long";
export function validatePlan(p: { kind: string; title: string; repeat: string; due: string; note: string }): PlanError | null {
  if (!(PLAN_KINDS as readonly string[]).includes(p.kind)) return "kind_required";
  if (!p.title.trim()) return "title_required";
  if (p.title.trim().length > 80) return "title_long";
  if (!(REPEATS as readonly string[]).includes(p.repeat)) return "repeat_required";
  if (p.due.trim() && !validDay(p.due.trim())) return "due_invalid";
  if (p.repeat !== "daily" && !p.due.trim()) return "due_required";
  if (p.note.trim().length > 300) return "note_long";
  return null;
}
export type ZakatError = "number_invalid" | "rate_invalid" | "date_invalid" | "note_long" | "empty";
export function validateZakat(p: { wealth: string; nisab: string; rate: string; hawl: string; note: string }): ZakatError | null {
  for (const k of ["wealth", "nisab"] as const) { const n = parseNumber(p[k]); if (n !== null && (Number.isNaN(n) || n < 0)) return "number_invalid"; }
  const r = parseNumber(p.rate); if (r !== null && (Number.isNaN(r) || r < 0 || r > 100)) return "rate_invalid";
  if (p.hawl.trim() && !validDay(p.hawl.trim())) return "date_invalid";
  if (p.note.trim().length > 300) return "note_long";
  if (![p.wealth, p.nisab, p.rate, p.hawl, p.note].some((x) => x.trim())) return "empty";
  return null;
}

// ---- private notes and figures kept in the older Deen entities (each field has exactly one place to type it) ----
export const NOTE_AREAS = [
  { code: "prayer", entity: "prayer_log", field: "prayer_log.note", kind: "text" },
  { code: "quran", entity: "quran_activity", field: "quran_activity.note", kind: "text" },
  { code: "hajj", entity: "hajj_plan", field: "hajj_plan.note", kind: "text" },
  { code: "duty", entity: "right_duty", field: "right_duty.note", kind: "text" },
  { code: "learning", entity: "learning_item", field: "learning_item.title", kind: "text" },
  { code: "giving", entity: "giving", field: "giving.amount", kind: "amount" },
] as const;
export type NoteArea = (typeof NOTE_AREAS)[number]["code"];
export interface NoteRow { id: string; ns: TMRecord["ns"]; area: NoteArea; text: string | null; amount: number | null; day: string }
export function noteRows(recs: readonly TMRecord[]): NoteRow[] {
  return recs.flatMap((r) => {
    const a = NOTE_AREAS.find((x) => x.entity === r.entity); if (!a || !r.id.startsWith("dnote-")) return [];
    const text = a.kind === "text" ? str(r.values[a.field]) : null, amount = a.kind === "amount" ? num(r.values[a.field]) : null;
    if (text === null && amount === null) return [];
    return [{ id: r.id, ns: r.ns, area: a.code, text, amount, day: r.createdAt.slice(0, 10) }];
  }).sort((x, y) => (x.day === y.day ? (x.id < y.id ? 1 : -1) : x.day < y.day ? 1 : -1));
}
export type NoteError = "area_required" | "text_required" | "text_long" | "amount_invalid";
export function validateNote(p: { area: string; text: string; amount: string }): NoteError | null {
  const a = NOTE_AREAS.find((x) => x.code === p.area); if (!a) return "area_required";
  if (a.kind === "amount") { const n = parseNumber(p.amount); return n === null || Number.isNaN(n) || n <= 0 || n > 1e12 ? "amount_invalid" : null; }
  if (!p.text.trim()) return "text_required";
  return p.text.trim().length > 300 ? "text_long" : null;
}

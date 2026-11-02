// M17 knowledge: the person's own sources, notes and SOPs (standard steps for a role). Pure.
// A source is never opened or fetched: it is a reference the person typed. A source or SOP carries the day it was last checked; after
// 180 days it is flagged "check again", and an unreadable date is "unknown", never "recent". Unknown is never 0 or "fresh".
import { freshnessOf, type Freshness } from "./freshness";
import type { FieldValue, TMRecord } from "./types";

export const KNOWLEDGE_STALE_DAYS = 180;
export const SOURCE_KINDS = ["book", "article", "video", "course", "person", "website", "other"] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];
export const MAX_SOP_STEPS = 30;

const str = (v: FieldValue | undefined): string | null => (v?.state === "value" && typeof v.value === "string" && v.value.trim() ? v.value.trim() : null);
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const day = (v: FieldValue | undefined): string | null => { const s = str(v); return s && DAY.test(s) && !Number.isNaN(Date.parse(s)) ? s : null; };
const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export interface SourceRow { id: string; ns: TMRecord["ns"]; title: string; kind: SourceKind | null; reference: string | null; checkedOn: string | null; note: string | null; fresh: Freshness }
export function sourceRows(recs: readonly TMRecord[], now: Date): SourceRow[] {
  return recs.filter((r) => r.entity === "source").flatMap((r) => {
    const title = str(r.values["source.title"]); if (!title) return [];
    const k = str(r.values["source.kind"]); const on = day(r.values["source.checked_on"]);
    return [{ id: r.id, ns: r.ns, title, kind: (SOURCE_KINDS as readonly string[]).includes(k ?? "") ? (k as SourceKind) : null, reference: str(r.values["source.reference"]), checkedOn: on, note: str(r.values["source.note"]), fresh: freshnessOf(on, now, KNOWLEDGE_STALE_DAYS) }];
  }).sort(byId);
}

export interface NoteRow { id: string; ns: TMRecord["ns"]; title: string; text: string | null; sourceId: string | null; goalId: string | null }
export function noteRows(recs: readonly TMRecord[]): NoteRow[] {
  const sources = new Set(recs.filter((r) => r.entity === "source").map((r) => r.id)); const goals = new Set(recs.filter((r) => r.entity === "goal").map((r) => r.id));
  return recs.filter((r) => r.entity === "note").flatMap((r) => {
    const title = str(r.values["note.title"]); if (!title) return [];
    const s = r.links?.source ?? null, g = r.links?.goal ?? null;
    return [{ id: r.id, ns: r.ns, title, text: str(r.values["note.text"]), sourceId: s && sources.has(s) ? s : null, goalId: g && goals.has(g) ? g : null }];
  }).sort(byId);
}

export interface SopRow { id: string; ns: TMRecord["ns"]; title: string; steps: string[]; reviewedOn: string | null; roleId: string | null; fresh: Freshness }
export function sopRows(recs: readonly TMRecord[], now: Date): SopRow[] {
  const roles = new Set(recs.filter((r) => r.entity === "team_role").map((r) => r.id));
  return recs.filter((r) => r.entity === "sop").flatMap((r) => {
    const title = str(r.values["sop.title"]); if (!title) return [];
    const on = day(r.values["sop.reviewed_on"]); const role = r.links?.role ?? null;
    return [{ id: r.id, ns: r.ns, title, steps: splitSteps(str(r.values["sop.steps"]) ?? ""), reviewedOn: on, roleId: role && roles.has(role) ? role : null, fresh: freshnessOf(on, now, KNOWLEDGE_STALE_DAYS) }];
  }).sort(byId);
}
export const sopsForRole = (rows: readonly SopRow[], roleId: string): SopRow[] => rows.filter((s) => s.roleId === roleId);

/** One step per line; blank lines dropped; a leading number or dash is removed so the list can be pasted. */
export const splitSteps = (text: string): string[] => text.split(/\r?\n/).map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim()).filter(Boolean);

export type SourceError = "title_required" | "title_long" | "reference_long" | "note_long" | "date_invalid";
export function validateSource(p: { title: string; reference: string; note: string; checkedOn: string }): SourceError | null {
  if (!p.title.trim()) return "title_required";
  if (p.title.trim().length > 120) return "title_long";
  if (p.reference.trim().length > 200) return "reference_long";
  if (p.note.trim().length > 300) return "note_long";
  if (p.checkedOn.trim() && !(DAY.test(p.checkedOn.trim()) && !Number.isNaN(Date.parse(p.checkedOn.trim())))) return "date_invalid";
  return null;
}
export type NoteError = "title_required" | "title_long" | "text_long";
export function validateNote(p: { title: string; text: string }): NoteError | null {
  if (!p.title.trim()) return "title_required";
  if (p.title.trim().length > 120) return "title_long";
  if (p.text.trim().length > 2000) return "text_long";
  return null;
}
export type SopError = "title_required" | "title_long" | "steps_required" | "steps_many" | "step_long";
export function validateSop(p: { title: string; steps: string }): SopError | null {
  if (!p.title.trim()) return "title_required";
  if (p.title.trim().length > 120) return "title_long";
  const st = splitSteps(p.steps);
  if (!st.length) return "steps_required";
  if (st.length > MAX_SOP_STEPS) return "steps_many";
  if (st.some((s) => s.length > 200)) return "step_long";
  return null;
}

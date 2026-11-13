// CSV import of the user's own data (the same long format that exportCsv writes).
// Rules: demo and real are separate. A file belongs to exactly one namespace (its "namespace" column) and goes only there.
// Real needs the consent tick. Every row is validated before anything is written (all or nothing). Secrets, worship and health
// fields are refused. Records that already exist are skipped, never overwritten. The last import can be undone.
import { FIELDS } from "../catalog/fields";
import type { FieldDef } from "../catalog/types";
import { ENTITIES } from "../schema/entities";
import { CSV_HEADER } from "./csv";
import { readConsent } from "./consent";
import { checkFreeText } from "./safety";
import type { KV, Store } from "./store";
import { UNKNOWN_STATES, type FieldValue, type Namespace, type TMRecord, type UnknownState } from "./types";
import { SCHEMA_VERSION } from "../schema/entities";

export const MAX_IMPORT_BYTES = 2_000_000;
export const MAX_IMPORT_ROWS = 20_000;
export const IMPORT_BATCH_KEY = "tm:import:last:v1";

/** RFC 4180 reader: quotes, doubled quotes, CRLF or LF, optional BOM. Returns rows of cells. */
export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = []; let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (q) { if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
    if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && src[i + 1] === "\n") i++; row.push(cell); cell = ""; rows.push(row); row = []; }
    else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

export type ImportErrorCode = "too_big" | "too_many_rows" | "empty" | "header" | "mixed_ns" | "bad_ns" | "entity" | "field" | "state" | "value" | "secret" | "restricted" | "redacted" | "date" | "id";
export interface ImportError { row: number; code: ImportErrorCode; field?: string }
export interface ImportPlan {
  ns: Namespace | null;
  /** Records ready to write (empty when there are errors). */
  records: TMRecord[];
  /** Record ids that already exist in that namespace; skipped, never overwritten. */
  skipped: string[];
  errors: ImportError[];
}

const FIELD_BY_ID = new Map(FIELDS.map((f) => [f.id, f]));
const ENTITY_IDS = new Set(ENTITIES.map((e) => e.id));
const isRestricted = (f: FieldDef) => f.privacy === "worship" || f.privacy === "health";
const isoDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;

/** Undo the formula guard that exportCsv adds (a leading apostrophe before = + - @). */
const unguard = (s: string) => (/^'[=+\-@\t\r]/.test(s) ? s.slice(1) : s);

function convert(f: FieldDef, raw: string): { ok: true; value: unknown } | { ok: false; code: ImportErrorCode } {
  const s = unguard(raw);
  if (s === "[redacted]") return { ok: false, code: "redacted" };
  switch (f.type) {
    case "number": case "money": case "scale": { if (s.trim() === "") return { ok: false, code: "value" }; const n = Number(s); return Number.isFinite(n) ? { ok: true, value: n } : { ok: false, code: "value" }; }
    case "bool": return s === "true" ? { ok: true, value: true } : s === "false" ? { ok: true, value: false } : { ok: false, code: "value" };
    case "date": return isoDate(s) ? { ok: true, value: s } : { ok: false, code: "date" };
    case "choice": return f.options && !f.options.some((o) => o.code === s) ? { ok: false, code: "value" } : { ok: true, value: s };
    case "multichoice": case "list": {
      const parts = s.split(" | ").filter((x) => x !== "");
      if (!parts.length) return { ok: false, code: "value" };
      if (parts.some((p) => !checkFreeText(p).ok)) return { ok: false, code: "secret" };
      if (f.type === "multichoice" && f.options && parts.some((p) => !f.options!.some((o) => o.code === p))) return { ok: false, code: "value" };
      return { ok: true, value: parts };
    }
    default: return s.trim() === "" ? { ok: false, code: "value" } : checkFreeText(s).ok ? { ok: true, value: s } : { ok: false, code: "secret" };
  }
}

export function planImport(text: string, store: Store): ImportPlan {
  const fail = (code: ImportErrorCode, row = 0): ImportPlan => ({ ns: null, records: [], skipped: [], errors: [{ row, code }] });
  if (text.length > MAX_IMPORT_BYTES) return fail("too_big");
  const rows = parseCsv(text);
  if (rows.length === 0) return fail("empty");
  const head = rows[0]!;
  if (head.length !== CSV_HEADER.length || CSV_HEADER.some((c, i) => head[i] !== c)) return fail("header", 1);
  if (rows.length - 1 > MAX_IMPORT_ROWS) return fail("too_many_rows");
  if (rows.length === 1) return fail("empty");
  const errors: ImportError[] = [];
  const nsSet = new Set(rows.slice(1).map((r) => r[0]));
  let ns: Namespace | null = null;
  if (nsSet.size > 1) return { ns: null, records: [], skipped: [], errors: [{ row: 2, code: "mixed_ns" }] };
  const only = rows[1]![0];
  if (only === "demo" || only === "real") ns = only; else return fail("bad_ns", 2);
  const existing = new Set(store[ns].list().map((r) => r.id));
  const byId = new Map<string, TMRecord>(); const skipped = new Set<string>();
  rows.slice(1).forEach((r, idx) => {
    const rowNo = idx + 2;
    const [, kind, id, entity, createdAt, fieldId, , state, , rawValue] = r as [string, string, string, string, string, string, string, string, string, string];
    if (kind !== (ns === "demo" ? "DEMO_NOT_REAL" : "real")) { errors.push({ row: rowNo, code: "bad_ns" }); return; }
    if (!ENTITY_IDS.has(entity)) { errors.push({ row: rowNo, code: "entity", field: entity }); return; }
    const f = FIELD_BY_ID.get(fieldId);
    if (!f || f.entity !== entity) { errors.push({ row: rowNo, code: "field", field: fieldId }); return; }
    if (isRestricted(f)) { errors.push({ row: rowNo, code: "restricted", field: fieldId }); return; }
    if (!/^[\w.:-]{1,80}$/.test(id)) { errors.push({ row: rowNo, code: "id" }); return; }
    if (existing.has(id)) { if (id) skipped.add(id); return; }
    let fv: FieldValue;
    if (state === "value") {
      const c = convert(f, rawValue);
      if (!c.ok) { errors.push({ row: rowNo, code: c.code, field: fieldId }); return; }
      fv = { state: "value", value: c.value, label: ns === "demo" ? "DEMO" : "FACT" };
    } else if ((UNKNOWN_STATES as readonly string[]).includes(state)) {
      if (rawValue !== "") { errors.push({ row: rowNo, code: "state", field: fieldId }); return; }
      fv = { state: state as UnknownState };
    } else { errors.push({ row: rowNo, code: "state", field: fieldId }); return; }
    let rec = byId.get(id);
    if (!rec) { rec = { id, entity, ns, ownerId: "", schemaVersion: SCHEMA_VERSION, createdAt: Number.isFinite(Date.parse(createdAt)) ? createdAt : new Date(0).toISOString(), values: {} }; byId.set(id, rec); }
    else if (rec.entity !== entity) { errors.push({ row: rowNo, code: "entity", field: entity }); return; }
    rec.values[fieldId] = fv;
  });
  return { ns, records: errors.length ? [] : [...byId.values()], skipped: [...skipped], errors };
}

export type ImportResult = { ok: true; added: number; skipped: number } | { ok: false; reason: "errors" | "needs_consent" | "nothing" };

/** Writes a checked plan. Real needs the consent tick (checked here too, not only in the screen). Remembers the batch so it can be undone. */
export function applyImport(store: Store, plan: ImportPlan, consentKv: KV, batchKv: KV, ownerId: string): ImportResult {
  if (plan.errors.length || !plan.ns) return { ok: false, reason: "errors" };
  if (plan.ns === "real" && !readConsent(consentKv)) return { ok: false, reason: "needs_consent" };
  if (!plan.records.length) return { ok: false, reason: "nothing" };
  const written: string[] = [];
  try { for (const r of plan.records) { store[plan.ns].put({ ...r, ownerId }); written.push(r.id); } }
  catch (e) { for (const id of written) store[plan.ns].delete(id); throw e; }
  batchKv.set(IMPORT_BATCH_KEY, JSON.stringify({ ns: plan.ns, ids: written, at: new Date().toISOString() }));
  return { ok: true, added: written.length, skipped: plan.skipped.length };
}

export interface ImportBatch { ns: Namespace; ids: string[]; at: string }
export function lastImport(kv: KV): ImportBatch | null {
  try { const b = JSON.parse(kv.get(IMPORT_BATCH_KEY) ?? "null") as Partial<ImportBatch> | null; return b && (b.ns === "demo" || b.ns === "real") && Array.isArray(b.ids) && typeof b.at === "string" ? (b as ImportBatch) : null; } catch { return null; }
}
/** Removes exactly the records the last import added (and nothing else). Returns how many were removed. */
export function undoImport(store: Store, kv: KV): number {
  const b = lastImport(kv); if (!b) return 0;
  let n = 0; for (const id of b.ids) if (store[b.ns].get(id)) { store[b.ns].delete(id); n++; }
  kv.remove(IMPORT_BATCH_KEY); return n;
}

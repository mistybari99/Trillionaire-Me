// TM-REQ-153: CSV export of the user's own data, one namespace per file. Long format: one row per saved value, so every record
// and every field is reproduced, and an unknown value stays unknown (empty value cell, state column says which kind).
// Built on exportNamespace, so secrets are redacted and worship/health fields stay out unless authorised per record.
import { FIELDS } from "../catalog/fields";
import type { Store } from "./store";
import type { Namespace } from "./types";
import { exportNamespace, type ExportOptions } from "./export";

export const CSV_HEADER = ["namespace", "kind", "record_id", "entity", "created_at", "field_id", "field_label", "state", "label", "value"] as const;

/** Quotes a cell. A leading = + - @ tab or CR would be read as a formula by spreadsheets, so such a cell starts with an apostrophe. */
export function csvCell(x: unknown): string {
  let s = x === null || x === undefined ? "" : String(x);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const valueText = (v: unknown): string => (Array.isArray(v) ? v.map(String).join(" | ") : typeof v === "object" && v !== null ? JSON.stringify(v) : String(v ?? ""));

export function exportCsv(store: Store, ns: Namespace, opts: ExportOptions = {}): string {
  const ex = exportNamespace(store, ns, opts);
  const rows: string[][] = [];
  for (const r of ex.records) {
    for (const [fid, v] of Object.entries(r.values).sort(([a], [b]) => a.localeCompare(b))) {
      const f = FIELDS.find((x) => x.id === fid);
      rows.push([ex.exportedNamespace, ex.kind, r.id, r.entity, r.createdAt, fid, f?.label.en ?? "", v.state, v.state === "value" ? v.label : "", v.state === "value" ? valueText(v.value) : ""]);
    }
  }
  rows.sort((a, b) => a[2]!.localeCompare(b[2]!) || a[5]!.localeCompare(b[5]!));
  return "﻿" + [CSV_HEADER as readonly string[], ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

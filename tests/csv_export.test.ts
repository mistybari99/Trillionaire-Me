// TM-REQ-153: CSV export of the user's own data. Demo and real never mixed, unknown stays unknown, no secrets, no formula injection.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { CSV_HEADER, csvCell, exportCsv } from "../src/core/csv";
import { Store, MemoryKV } from "../src/core/store";
import { store as uiStore, consentKv } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import type { FieldValue, Namespace, TMRecord } from "../src/core/types";

const NOW = "2026-10-25T00:00:00.000Z";
const mk = (ns: Namespace, id: string, entity: string, values: Record<string, FieldValue | unknown>): TMRecord => {
  const vals: Record<string, FieldValue> = {};
  for (const [k, x] of Object.entries(values)) vals[k] = (x && typeof x === "object" && "state" in (x as object) ? x : { state: "value", value: x, label: ns === "demo" ? "DEMO" : "FACT" }) as FieldValue;
  return { id, entity, ns, ownerId: "o", schemaVersion: 1, createdAt: NOW, values: vals };
};
/** Small RFC 4180 reader, used only to check the file reads back. */
function parse(csv: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cell = "", q = false; const s = csv.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (q) { if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true; else if (c === ",") { row.push(cell); cell = ""; } else if (c === "\r") { /* skip */ } else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; } else cell += c;
  }
  return rows;
}
const fresh = () => { const ck = new MemoryKV(); grantConsent(ck, NOW); return new Store(new MemoryKV(), { consentKv: ck }); };
const seed = (s: Store) => {
  s.demo.put(mk("demo", "t1", "task", { "task.title": "Write, \"quote\"\nline", "task.minutes": 25, "task.priority": "high" }));
  s.demo.put(mk("demo", "t2", "task", { "task.title": "No estimate", "task.minutes": { state: "later" } }));
  s.real.put(mk("real", "r1", "task", { "task.title": "Real task", "task.minutes": 40 }));
  s.real.put(mk("real", "r2", "finance_item", { "finance.label": "=HYPERLINK(\"http://x\")", "finance.amount": { state: "unknown" } }));
  s.real.put(mk("real", "r3", "profile", { "profile.health_note": "private note" }));
};

describe("TM-TST-153 CSV export (JSON backup exists separately; PDF and data dictionary are not part of this step)", () => {
  it("has the fixed header and a byte-order mark; reads back with every record and value", () => {
    const s = fresh(); seed(s);
    const csv = exportCsv(s, "demo"); expect(csv.charCodeAt(0)).toBe(0xfeff);
    const rows = parse(csv); expect(rows[0]).toEqual([...CSV_HEADER]);
    const body = rows.slice(1).filter((r) => r.length > 1);
    expect(new Set(body.map((r) => r[2]))).toEqual(new Set(["t1", "t2"]));
    const get = (id: string, f: string) => body.find((r) => r[2] === id && r[5] === f)!;
    expect(get("t1", "task.title")[9]).toBe("Write, \"quote\"\nline"); expect(get("t1", "task.minutes")[9]).toBe("25");
    expect(body.every((r) => r.length === CSV_HEADER.length)).toBe(true);
  });
  it("unknown stays unknown: empty value cell with its state, never 0", () => {
    const s = fresh(); seed(s);
    const r = parse(exportCsv(s, "demo")).find((x) => x[2] === "t2" && x[5] === "task.minutes")!;
    expect(r[7]).toBe("later"); expect(r[9]).toBe(""); expect(r[8]).toBe("");
  });
  it("demo and real are never mixed in one file; demo is marked DEMO_NOT_REAL", () => {
    const s = fresh(); seed(s);
    const d = parse(exportCsv(s, "demo")).slice(1).filter((r) => r.length > 1), re = parse(exportCsv(s, "real")).slice(1).filter((r) => r.length > 1);
    expect(d.every((r) => r[0] === "demo" && r[1] === "DEMO_NOT_REAL" && r[2]!.startsWith("t"))).toBe(true);
    expect(re.every((r) => r[0] === "real" && r[1] === "real" && r[2]!.startsWith("r"))).toBe(true);
    expect(exportCsv(s, "real")).not.toContain("Write,"); expect(exportCsv(s, "demo")).not.toContain("Real task");
  });
  it("health and worship fields stay out unless the record is authorised", () => {
    const s = fresh(); seed(s);
    expect(exportCsv(s, "real")).not.toContain("private note");
    expect(exportCsv(s, "real", { authorisedRecordIds: new Set(["r3"]) })).toContain("private note");
  });
  it("secret-looking text is redacted in the file", () => {
    const s = fresh();
    s.demo.put(mk("demo", "x", "task", { "task.title": "card 4111 1111 1111 1111 and password: hunter2" }));
    const csv = exportCsv(s, "demo"); expect(csv).not.toContain("4111 1111"); expect(csv).not.toContain("hunter2");
  });
  it("a cell that starts like a formula is neutralised", () => {
    expect(csvCell("=1+1")).toBe("'=1+1"); expect(csvCell("@x")).toBe("'@x"); expect(csvCell("-5")).toBe("'-5"); expect(csvCell("plain")).toBe("plain");
    const s = fresh(); seed(s);
    const r = parse(exportCsv(s, "real")).find((x) => x[2] === "r2" && x[5] === "finance.label")!;
    expect(r[9]!.startsWith("'=")).toBe(true);
  });
  it("is byte-identical for the same data (stable order)", () => {
    const a = fresh(), b = fresh(); seed(a); seed(b);
    expect(exportCsv(a, "demo")).toBe(exportCsv(b, "demo"));
  });
});

describe("CSV card on the Data screen", () => {
  beforeEach(() => {
    localStorage.clear(); uiStore.demo.clear(); uiStore.real.clear(); document.body.innerHTML = '<div id="app"></div>';
    localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
  });
  it("real export is disabled until the consent tick; demo export is available", () => {
    location.hash = "#/settings/backup"; render();
    expect(document.querySelector<HTMLButtonElement>("[data-act=csv-real]")!.disabled).toBe(true);
    expect(document.querySelector("[data-csv-locked]")).not.toBeNull();
    expect(document.querySelector<HTMLButtonElement>("[data-act=csv-demo]")!.disabled).toBe(false);
    grantConsent(consentKv, NOW); render();
    expect(document.querySelector<HTMLButtonElement>("[data-act=csv-real]")!.disabled).toBe(false);
    expect(document.querySelector("[data-csv-locked]")).toBeNull();
  });
});

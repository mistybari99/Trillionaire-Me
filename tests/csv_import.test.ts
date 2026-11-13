// CSV import (own data): demo and real separate, real needs the consent tick, whole file validated first, undo, no secrets/worship/health; plus the data dictionary.
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { exportCsv } from "../src/core/csv";
import { applyImport, lastImport, parseCsv, planImport, undoImport } from "../src/core/csvImport";
import { MemoryKV, Store } from "../src/core/store";
import { grantConsent } from "../src/core/consent";
import { resetImportState } from "../src/ui/importUi";
import { store as appStore, consentKv } from "../src/ui/state";
import type { FieldValue, Namespace, TMRecord } from "../src/core/types";

const NOW = "2026-10-25T00:00:00.000Z";
const mk = (ns: Namespace, id: string, entity: string, values: Record<string, unknown>, unknown: string[] = []): TMRecord => {
  const vals: Record<string, FieldValue> = {};
  for (const [k, x] of Object.entries(values)) vals[k] = { state: "value", value: x, label: ns === "demo" ? "DEMO" : "FACT" } as FieldValue;
  for (const k of unknown) vals[k] = { state: "unknown" } as FieldValue;
  return { id, entity, ns, ownerId: ns === "demo" ? "demo-user" : "owner", schemaVersion: 1, createdAt: NOW, values: vals };
};
const fresh = (consent: boolean) => { const ck = new MemoryKV(); if (consent) grantConsent(ck, NOW); return { s: new Store(new MemoryKV(), { consentKv: ck }), ck, bk: new MemoryKV() }; };
const HEAD = "namespace,kind,record_id,entity,created_at,field_id,field_label,state,label,value\r\n";
const seed = (s: Store) => {
  s.real.put(mk("real", "t1", "task", { "task.title": "Pay supplier", "task.minutes": 30 }, ["task.size"]));
  s.real.put(mk("real", "f1", "finance_item", { "finance.kind": "expense", "finance.scope": "personal", "finance.period": "monthly", "finance.label": "=Rent, \"flat\"", "finance.amount": 12000 }));
};

describe("csv parser", () => {
  it("handles BOM, quotes, doubled quotes, commas and CRLF/LF", () => {
    expect(parseCsv('﻿a,"b,1","c ""q"""\r\nx,y,z\n')).toEqual([["a", "b,1", 'c "q"'], ["x", "y", "z"]]);
  });
});

describe("import core", () => {
  it("round trip: own export imports into an empty store with the same values; unknown stays unknown; no links", () => {
    const a = fresh(true); seed(a.s);
    const csv = exportCsv(a.s, "real");
    const b = fresh(true);
    const plan = planImport(csv, b.s);
    expect(plan.errors).toEqual([]); expect(plan.ns).toBe("real"); expect(plan.records).toHaveLength(2);
    expect(applyImport(b.s, plan, b.ck, b.bk, "owner")).toEqual({ ok: true, added: 2, skipped: 0 });
    const t1 = b.s.real.get("t1")!;
    expect(t1.values["task.title"]).toMatchObject({ state: "value", value: "Pay supplier", label: "FACT" });
    expect(t1.values["task.minutes"]).toMatchObject({ value: 30 }); expect(t1.values["task.size"]).toEqual({ state: "unknown" });
    expect(b.s.real.get("f1")!.values["finance.label"]).toMatchObject({ value: '=Rent, "flat"' });
    expect(b.s.demo.list()).toHaveLength(0);
  });
  it("demo file goes to demo only, labelled DEMO, never into real", () => {
    const a = fresh(true); a.s.demo.put(mk("demo", "d1", "task", { "task.title": "Sample" }));
    const b = fresh(true);
    const plan = planImport(exportCsv(a.s, "demo"), b.s);
    expect(plan.ns).toBe("demo");
    applyImport(b.s, plan, b.ck, b.bk, "demo-user");
    expect(b.s.demo.get("d1")!.values["task.title"]).toMatchObject({ label: "DEMO" }); expect(b.s.real.list()).toHaveLength(0);
  });
  it("a file that mixes demo and real rows is refused", () => {
    const csv = HEAD + "demo,DEMO_NOT_REAL,a,task,2026-10-25T00:00:00.000Z,task.title,Title,value,DEMO,x\r\n" + "real,real,b,task,2026-10-25T00:00:00.000Z,task.title,Title,value,FACT,y\r\n";
    expect(planImport(csv, fresh(true).s).errors[0]).toMatchObject({ code: "mixed_ns" });
  });
  it("real import needs the consent tick (checked in core, nothing written)", () => {
    const a = fresh(true); seed(a.s); const csv = exportCsv(a.s, "real");
    const b = fresh(false); const plan = planImport(csv, b.s);
    expect(applyImport(b.s, plan, b.ck, b.bk, "owner")).toEqual({ ok: false, reason: "needs_consent" });
    expect(b.s.real.list()).toHaveLength(0); expect(lastImport(b.bk)).toBeNull();
  });
  it("one bad row blocks the whole file (all or nothing) and names the problem", () => {
    const csv = HEAD + "real,real,a,task,2026-10-25T00:00:00.000Z,task.title,Title,value,FACT,ok\r\n" + "real,real,a,task,2026-10-25T00:00:00.000Z,task.minutes,Minutes,value,FACT,abc\r\n";
    const f = fresh(true); const plan = planImport(csv, f.s);
    expect(plan.errors).toEqual([{ row: 3, code: "value", field: "task.minutes" }]); expect(plan.records).toEqual([]);
    expect(applyImport(f.s, plan, f.ck, f.bk, "owner")).toEqual({ ok: false, reason: "errors" });
  });
  it("wrong header, unknown field, unknown entity, bad date, bad id are errors", () => {
    const f = fresh(true);
    expect(planImport("a,b\r\n1,2\r\n", f.s).errors[0]!.code).toBe("header");
    const row = (fid: string, ent = "task", id = "a", val = "x", st = "value") => HEAD + `real,real,${id},${ent},${NOW},${fid},L,${st},FACT,${val}\r\n`;
    expect(planImport(row("nope.field"), f.s).errors[0]!.code).toBe("field");
    expect(planImport(row("task.title", "nope"), f.s).errors[0]!.code).toBe("entity");
    expect(planImport(row("task.done_on", "task", "a", "31/10/2026"), f.s).errors[0]!.code).toBe("date");
    expect(planImport(row("task.title", "task", "bad id!"), f.s).errors[0]!.code).toBe("id");
    expect(planImport("", f.s).errors[0]!.code).toBe("empty");
  });
  it("secrets, worship and health fields are refused; redacted values are refused", () => {
    const f = fresh(true);
    const row = (fid: string, ent: string, val: string) => HEAD + `real,real,a,${ent},${NOW},${fid},L,value,FACT,${val}\r\n`;
    expect(planImport(row("task.title", "task", "my password: hunter2 and card 4111 1111 1111 1111"), f.s).errors[0]!.code).toBe("secret");
    expect(planImport(row("prayer_log.note", "prayer_log", "private"), f.s).errors[0]!.code).toBe("restricted");
    expect(planImport(row("task.title", "task", "[redacted]"), f.s).errors[0]!.code).toBe("redacted");
  });
  it("existing records are skipped, never overwritten", () => {
    const a = fresh(true); seed(a.s); const csv = exportCsv(a.s, "real");
    const plan = planImport(csv, a.s);
    expect(plan.skipped.sort()).toEqual(["f1", "t1"]); expect(plan.records).toEqual([]);
    expect(applyImport(a.s, plan, a.ck, a.bk, "owner")).toEqual({ ok: false, reason: "nothing" });
  });
  it("undo removes exactly the imported records and nothing else", () => {
    const a = fresh(true); seed(a.s); const csv = exportCsv(a.s, "real");
    const b = fresh(true); b.s.real.put(mk("real", "keep", "task", { "task.title": "Mine" }));
    applyImport(b.s, planImport(csv, b.s), b.ck, b.bk, "owner");
    expect(b.s.real.list()).toHaveLength(3); expect(lastImport(b.bk)!.ids.sort()).toEqual(["f1", "t1"]);
    expect(undoImport(b.s, b.bk)).toBe(2);
    expect(b.s.real.list().map((r) => r.id)).toEqual(["keep"]); expect(lastImport(b.bk)).toBeNull();
  });
});

describe("import card and dictionary (screens)", () => {
  const onHash = () => render();
  beforeEach(() => {
    window.addEventListener("hashchange", onHash); resetImportState();
    localStorage.clear(); appStore.demo.clear(); appStore.real.clear();
    document.body.innerHTML = '<div id="app"></div>';
    localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "real");
  });
  afterEach(() => window.removeEventListener("hashchange", onHash));
  const go = (p: string) => { location.hash = p; render(); };
  const app = () => document.getElementById("app")!;
  const pick = async (text: string) => {
    const input = app().querySelector("#csv-file") as HTMLInputElement;
    const file = new File([text], "x.csv", { type: "text/csv" });
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    (app().querySelector('[data-act="csv-check"]') as HTMLElement).click();
    await new Promise((r) => setTimeout(r, 20));
  };
  it("no file chosen: calm message", async () => {
    go("#/settings/backup"); (app().querySelector('[data-act="csv-check"]') as HTMLElement).click();
    expect(app().querySelector('[data-imp-notice="imp.nofile"]')).not.toBeNull();
  });
  it("real file without the tick: ready but locked, import button disabled", async () => {
    const a = fresh(true); seed(a.s); const csv = exportCsv(a.s, "real");
    go("#/settings/backup"); await pick(csv);
    expect(app().querySelector('[data-imp-ready="real"]')).not.toBeNull(); expect(app().querySelector("[data-imp-locked]")).not.toBeNull();
    expect((app().querySelector('[data-act="csv-import"]') as HTMLButtonElement).disabled).toBe(true);
    expect(appStore.real.list()).toHaveLength(0);
  });
  it("with the tick: import writes the records, then undo removes them", async () => {
    grantConsent(consentKv, NOW);
    const a = fresh(true); seed(a.s); const csv = exportCsv(a.s, "real");
    go("#/settings/backup"); await pick(csv);
    (app().querySelector('[data-act="csv-import"]') as HTMLElement).click();
    expect(appStore.real.list().map((r) => r.id).sort()).toEqual(["f1", "t1"]);
    expect(app().querySelector("[data-imp-undo]")).not.toBeNull();
    (app().querySelector('[data-act="csv-undo"]') as HTMLElement).click();
    expect(appStore.real.list()).toHaveLength(0);
  });
  it("a bad file shows the problem rows and writes nothing", async () => {
    grantConsent(consentKv, NOW);
    go("#/settings/backup"); await pick("x,y\r\n1,2\r\n");
    expect(app().querySelector("[data-imp-errors]")).not.toBeNull(); expect(app().querySelector('[data-imp-error="header"]')).not.toBeNull(); expect(appStore.real.list()).toHaveLength(0);
  });
  it("dictionary lists every catalog field with type and import rule, in all three languages", () => {
    for (const l of ["en", "bn", "mix"]) {
      localStorage.setItem("tm:ui:lang", l); go("#/more/dictionary");
      expect(app().querySelectorAll("[data-dict-field]").length).toBeGreaterThan(90);
      expect(app().querySelector('[data-dict-field="task.title"]')!.textContent).toMatch(/task\.title/);
      expect(app().textContent).not.toMatch(/[০-৯]/);
    }
    localStorage.setItem("tm:ui:lang", "en"); go("#/more/dictionary");
    expect(app().querySelector('[data-dict-field="prayer_log.note"]')!.textContent).toMatch(/Never imported/);
  });
});

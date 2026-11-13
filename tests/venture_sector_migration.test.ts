// BUILD-02 phase C (data): schema 5 adds the optional venture.sector_* values. Additive; old ventures get none; the values survive backup, export and CSV.
// Fixtures are invented test fixtures, not data.
import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DexieRepo } from "../src/adapters/dexie";
import { FIELDS, CATALOG_VERSION } from "../src/catalog/fields";
import { createBackup, restoreBackup } from "../src/core/backup";
import { grantConsent } from "../src/core/consent";
import { exportCsv } from "../src/core/csv";
import { applyImport, planImport } from "../src/core/csvImport";
import { exportNamespace } from "../src/core/export";
import { MIGRATIONS, migrateRecord } from "../src/core/migrate";
import { MemoryKV, Store } from "../src/core/store";
import { SECTOR_FIELDS, readSectorData, sectorValues, ventureSectorView } from "../src/core/ventureSector";
import { SCHEMA_VERSION } from "../src/schema/entities";
import type { TMRecord } from "../src/core/types";

const fx = (n: string) => JSON.parse(readFileSync(`tests/fixtures/${n}`, "utf8")) as { schemaVersion: number; records: TMRecord[] };
const v4 = fx("records_v4.json").records, v5 = fx("records_v5.json").records;

describe("schema 5", () => {
  it("is at least 5, the catalog moved with it, and step 4 only raises the number", () => {
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(5); expect(CATALOG_VERSION).toBeGreaterThanOrEqual(21);
    for (const r of v4) expect(MIGRATIONS[4]!(r)).toBe(r);
  });
  it("four optional venture fields exist, each with EN and BN help; the answers are financial", () => {
    const fs = FIELDS.filter((f) => f.id.startsWith("venture.sector_"));
    expect(fs.map((f) => f.id).sort()).toEqual(["venture.sector_checks", "venture.sector_custom", "venture.sector_id", "venture.sector_inputs"]);
    for (const f of fs) { expect(f.requirement).toBe("optional"); expect(f.label.en && f.label.bn && f.help.what.en && f.help.what.bn && f.help.why.en && f.help.why.bn).toBeTruthy(); }
    expect(FIELDS.find((f) => f.id === SECTOR_FIELDS.inputs)!.privacy).toBe("financial");
  });
  it("old ventures migrate untouched and read as: no business type (Unknown), nothing invented", () => {
    for (const r of v4.filter((x) => x.entity === "venture")) { const up = migrateRecord(r).rec; expect(up.values).toEqual(r.values); expect(ventureSectorView(up).family).toBeNull(); }
  });
  it("the version-5 fixture venture reads back: a typed 0 price stays 0, the other answers stay Unknown", () => {
    const rec = v5.find((r) => r.id === "v-sector")!; const view = ventureSectorView(rec);
    expect(view.family!.id).toBe("retail"); expect(view.data.inputs).toEqual({ price: 0, varCost: 6 }); expect(view.data.checks).toEqual({ q: [0], r: [] });
    expect(view.results.find((r) => r.id === "unitMargin")!.value).toBe(-6); expect(view.results.find((r) => r.id === "breakEvenSales")!.value).toBeNull();
  });
});

const sectorRec = (): TMRecord => {
  const base = v5.find((r) => r.id === "v-sector")!;
  const data = { sectorId: "custom", inputs: { a1: 12.5, a2: 0 }, custom: { inputs: [{ id: "a1", label: "Sales, \"net\"", unit: "money" as const, perPeriod: true }, { id: "a2", label: "Costs", unit: "money" as const }], formulas: [{ id: "f1", name: "Left, over", expr: "a1 - a2" }] }, checks: { q: [1, 2], r: [0] } };
  return { ...base, values: { ...base.values, ...sectorValues(data, "DEMO") } };
};

describe("the values survive backup, export and CSV", () => {
  it("plain backup, wipe, restore", async () => {
    const repo = new DexieRepo(`vs-${Math.random()}`, true); await repo.put(sectorRec());
    const file = JSON.stringify(await createBackup(repo, "demo")); await repo.clear("demo");
    expect(await restoreBackup(repo, file)).toBe(1);
    expect(readSectorData((await repo.list("demo"))[0]!)).toEqual(readSectorData(sectorRec()));
  });
  it("JSON export and CSV export then import keep the type, the answers (a typed 0 included), the custom definition and the ticks", () => {
    const ck = new MemoryKV(); grantConsent(ck, "2026-11-08T00:00:00.000Z"); const s = new Store(new MemoryKV(), { consentKv: ck }); s.demo.put(sectorRec());
    expect(readSectorData(exportNamespace(s, "demo").records[0] as TMRecord)).toEqual(readSectorData(sectorRec()));
    const csv = exportCsv(s, "demo"); const ck2 = new MemoryKV(); const s2 = new Store(new MemoryKV(), { consentKv: ck2 });
    const plan = planImport(csv, s2); expect(plan.errors).toEqual([]);
    expect(applyImport(s2, plan, ck2, new MemoryKV(), "demo-user")).toMatchObject({ ok: true, added: 1 });
    const back = readSectorData(s2.demo.list()[0]!); expect(back).toEqual(readSectorData(sectorRec())); expect(back.inputs.a2).toBe(0);
  });
});

// BUILD-01 (W3): work blocks survive backup, encrypted backup, restore, JSON export and CSV export followed by CSV import.
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { DexieRepo } from "../src/adapters/dexie";
import { createBackup, restoreBackup } from "../src/core/backup";
import { decryptBackup, encryptBackup } from "../src/core/cryptoBackup";
import { exportNamespace } from "../src/core/export";
import { exportCsv } from "../src/core/csv";
import { applyImport, planImport } from "../src/core/csvImport";
import { grantConsent } from "../src/core/consent";
import { MemoryKV, Store } from "../src/core/store";
import { workBlockRecord, workBlocksFromRecords } from "../src/core/timeBlocks";
import { FIELDS } from "../src/catalog/fields";
import type { TMRecord } from "../src/core/types";

const mk = (id: string, b: Partial<Parameters<typeof workBlockRecord>[0]["b"]> = {}): TMRecord =>
  workBlockRecord({ id, ns: "demo", ownerId: "demo-user", schemaVersion: 4, createdAt: "2026-11-07T00:00:00.000Z", b: { date: "2026-11-09", start: 540, end: 630, label: "Write, then \"review\"", repeat: "weekly", goalId: "g1", protectedBlock: true, ...b } });
const recs = () => [mk("wb-a"), mk("wb-b", { repeat: "daily", label: null, goalId: null, protectedBlock: false }), mk("wb-c", { repeat: "weekdays", start: 780, end: 840 })];
const blocks = (r: TMRecord[]) => workBlocksFromRecords(r);

describe("work_block fields are in the catalog", () => {
  it("seven fields, personal privacy, EN and BN help", () => {
    const fs = FIELDS.filter((f) => f.entity === "work_block");
    expect(fs.map((f) => f.id).sort()).toEqual(["work_block.date", "work_block.from", "work_block.goal", "work_block.label", "work_block.protected", "work_block.repeat", "work_block.to"]);
    for (const f of fs) { expect(f.privacy).toBe("personal"); expect(f.label.en && f.label.bn && f.help.what.en && f.help.what.bn && f.help.why.bn).toBeTruthy(); }
  });
});

describe("backup and restore", () => {
  it("plain backup, wipe, restore gives the same records and the same blocks", async () => {
    const repo = new DexieRepo(`wb-${Math.random()}`, true); for (const r of recs()) await repo.put(r);
    const before = (await repo.list("demo")).sort((a, b) => a.id.localeCompare(b.id));
    const file = JSON.stringify(await createBackup(repo, "demo")); await repo.clear("demo"); expect(await repo.list("demo")).toEqual([]);
    expect(await restoreBackup(repo, file)).toBe(3);
    const after = (await repo.list("demo")).sort((a, b) => a.id.localeCompare(b.id)); expect(after).toEqual(before); expect(blocks(after)).toEqual(blocks(before)); expect(blocks(after).map((b) => b.repeat).sort()).toEqual(["daily", "weekdays", "weekly"]);
  });
  it("encrypted backup round-trips the blocks", async () => {
    const repo = new DexieRepo(`wb-${Math.random()}`, true); for (const r of recs()) await repo.put(r);
    const enc = await encryptBackup({ demo: await createBackup(repo, "demo"), real: null }, "a long passphrase", 1000);
    const out = await decryptBackup(JSON.stringify(enc), "a long passphrase");
    expect(blocks(out.demo.records)).toEqual(blocks(recs()));
  });
});

describe("export and CSV round trip", () => {
  const filled = () => { const ck = new MemoryKV(); grantConsent(ck, "2026-11-07T00:00:00.000Z"); const s = new Store(new MemoryKV(), { consentKv: ck }); for (const r of recs()) s.demo.put(r); return s; };
  it("JSON export keeps every block value", () => {
    const ex = exportNamespace(filled(), "demo"); expect(blocks(ex.records as TMRecord[]).map((b) => [b.id, b.repeat, b.protectedBlock, b.goalId])).toEqual(blocks(recs()).map((b) => [b.id, b.repeat, b.protectedBlock, b.goalId]));
  });
  it("CSV export then CSV import into an empty store keeps the blocks (repeat, protected, goal, label with comma and quotes)", () => {
    const csv = exportCsv(filled(), "demo"); const ck = new MemoryKV(); const s2 = new Store(new MemoryKV(), { consentKv: ck });
    const plan = planImport(csv, s2); expect(plan.errors).toEqual([]);
    const res = applyImport(s2, plan, ck, new MemoryKV(), "demo-user"); expect(res).toMatchObject({ ok: true, added: 3 });
    expect(blocks(s2.demo.list())).toEqual(blocks(recs()));
  });
});

import "fake-indexeddb/auto";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MIGRATIONS, migrateAll, migrateRecord, type Step } from "../src/core/migrate";
import { MemoryKV } from "../src/core/store";
import { DexieRepo } from "../src/adapters/dexie";
import { FIELDS } from "../src/catalog/fields";
import { ENTITIES, SCHEMA_VERSION } from "../src/schema/entities";
import type { TMRecord } from "../src/core/types";

const fx = (n: string) => JSON.parse(readFileSync(`tests/fixtures/${n}`, "utf8")) as { schemaVersion: number; records: TMRecord[] };
const v1 = fx("records_v1.json").records, v0 = fx("records_v0.json").records;
const noVersion = (r: TMRecord) => { const { schemaVersion: _s, ...rest } = r; return rest; };

describe("record migration", () => {
  it("an old record (no version) is upgraded to the current version with every value and unknown state intact", () => {
    for (let i = 0; i < v0.length; i++) {
      expect(v0[i]!.schemaVersion).toBeUndefined();
      const r = migrateRecord(v0[i]!); expect(r.status).toBe("migrated");
      expect(r.rec.schemaVersion).toBe(SCHEMA_VERSION); expect(r.rec.values).toEqual(v1[i]!.values); expect(noVersion(r.rec)).toEqual(noVersion(v1[i]!));
    }
  });
  it("current records are untouched; records from a newer app are left alone, never downgraded", () => {
    expect(migrateRecord(v1[0]!)).toEqual({ rec: v1[0], status: "current" });
    const newer = { ...v1[0]!, schemaVersion: SCHEMA_VERSION + 1 }; expect(migrateRecord(newer)).toEqual({ rec: newer, status: "newer" });
  });
  it("a chain of steps runs in order and loses nothing; a failing step or missing step keeps the original", () => {
    const steps: Record<number, Step> = { 0: MIGRATIONS[0]!, 1: (r) => ({ ...r, values: { ...r.values, "x.new": { state: "unknown" } } }) };
    const r = migrateRecord(v0[0]!, 2, steps); expect(r.status).toBe("migrated"); expect(r.rec.schemaVersion).toBe(2);
    expect(Object.keys(r.rec.values)).toEqual([...Object.keys(v1[0]!.values), "x.new"]); expect(r.rec.values["goal.title"]).toEqual(v1[0]!.values["goal.title"]);
    expect(migrateRecord(v1[0]!, 3, steps).status).toBe("failed"); // no step for 2
    const boom = migrateRecord(v1[0]!, 2, { 1: () => { throw new Error("x"); } }); expect(boom.status).toBe("failed"); expect(boom.rec).toBe(v1[0]);
    const moved = migrateRecord(v1[0]!, 2, { 1: (x) => ({ ...x, ns: "demo" }) }); expect(moved.status).toBe("failed"); // never changes namespace
  });
  it("migrateAll saves a copy first, upgrades memory and the repo, and does nothing when the copy cannot be saved", async () => {
    const mk = () => { const m = new MemoryKV(); for (const r of v0) m.set(`tm:${r.ns}:${r.id}`, JSON.stringify(r)); return m; };
    const repo = new DexieRepo(`mig-${Math.random()}`, true); let copies = 0;
    const m = mk(); const rep = await migrateAll(m, repo, async (n) => { copies = n; });
    expect(copies).toBe(2); expect(rep).toMatchObject({ migrated: 2, failed: 0, blocked: false });
    expect(JSON.parse(m.get("tm:real:g1")!).schemaVersion).toBe(SCHEMA_VERSION); expect((await repo.list("real"))[0]!.values).toEqual(v1[0]!.values);
    expect(await migrateAll(m, repo, async () => { throw new Error("no copy"); })).toMatchObject({ current: 2, migrated: 0 }); // second run: nothing to do, no copy needed
    const m2 = mk(); const blocked = await migrateAll(m2, null, async () => { throw new Error("no copy"); });
    expect(blocked.blocked).toBe(true); expect(JSON.parse(m2.get("tm:real:g1")!).schemaVersion).toBeUndefined();
  });
});

describe("schema version bump check", () => {
  const fingerprint = () => createHash("sha256").update(JSON.stringify({ e: ENTITIES.map((e) => e.id).sort(), f: FIELDS.map((f) => `${f.id}:${f.type}`).sort() })).digest("hex").slice(0, 16);
  it("the record shape fingerprint matches the one recorded for this SCHEMA_VERSION", () => {
    const rec = JSON.parse(readFileSync("tests/fixtures/schema_fingerprint.json", "utf8")) as { schemaVersion: number; fingerprint: string };
    expect(rec.schemaVersion, "SCHEMA_VERSION changed: add a MIGRATIONS step, a fixture and update schema_fingerprint.json together").toBe(SCHEMA_VERSION);
    expect(fingerprint(), "Entities or field ids/types changed: bump SCHEMA_VERSION with a migration (or, for a purely additive optional field, update the fingerprint and note it in DECISIONS_LOG)").toBe(rec.fingerprint);
  });
  it("every version below the current has a migration step and a kept fixture", () => {
    for (let v = 0; v < SCHEMA_VERSION; v++) { expect(typeof MIGRATIONS[v], `step ${v}`).toBe("function"); expect(readdirSync("tests/fixtures"), `fixture v${v}`).toContain(`records_v${v}.json`); }
    expect(readdirSync("tests/fixtures")).toContain(`records_v${SCHEMA_VERSION}.json`);
  });
});

// BUILD-01 (W3): schema 4 adds the entity `work_block`. Additive: no data rewrite, safe to run twice, defaults empty.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MIGRATIONS, migrateRecord } from "../src/core/migrate";
import { ENTITIES, SCHEMA_VERSION } from "../src/schema/entities";
import { workBlocksFromRecords } from "../src/core/timeBlocks";
import type { TMRecord } from "../src/core/types";

const fx = (n: string) => JSON.parse(readFileSync(`tests/fixtures/${n}`, "utf8")) as { schemaVersion: number; records: TMRecord[] };
const v3 = fx("records_v3.json").records, v4 = fx("records_v4.json").records;

describe("work blocks: schema 4 (additive, no data rewrite)", () => {
  it("the schema is at version 4 and knows the work_block entity", () => {
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(4);
    expect(ENTITIES.map((e) => e.id)).toContain("work_block");
  });
  it("every version-3 record upgrades to the version-4 fixture with all values intact; a second run changes nothing", () => {
    const up = v3.map((r) => migrateRecord(r, 4));
    expect(up.every((u) => u.status === "migrated")).toBe(true);
    expect(up.map((u) => u.rec)).toEqual(v4.filter((r) => r.entity !== "work_block"));
    for (let i = 0; i < v3.length; i++) { expect(up[i]!.rec.values).toEqual(v3[i]!.values); expect(MIGRATIONS[3]!(up[i]!.rec)).toEqual(up[i]!.rec); expect(migrateRecord(up[i]!.rec, 4).status).toBe("current"); }
  });
  it("defaults are empty: old data has no work blocks; the fixture block reads back with an unknown goal kept as not linked", () => {
    expect(workBlocksFromRecords(v3)).toEqual([]);
    const b = workBlocksFromRecords(v4);
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ id: "wb-fx1", date: "2026-11-09", start: 540, end: 630, repeat: "weekly", goalId: null, protectedBlock: false, label: null });
  });
});

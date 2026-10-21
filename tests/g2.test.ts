import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { DexieRepo } from "../src/adapters/dexie";
import { BackupError, createBackup, parseBackup, restoreBackup } from "../src/core/backup";
import type { TMRecord } from "../src/core/types";

const rec = (id: string, ns: "demo" | "real" = "demo", label: "DEMO" | "FACT" = "DEMO"): TMRecord =>
  ({ id, entity: "profile", ns, ownerId: "u", schemaVersion: 1, createdAt: "2026-10-22T00:00:00Z", values: { "profile.display_name": { state: "value", value: id, label }, "profile.birth_year": { state: "unknown" } } });
let n = 0; const fresh = () => new DexieRepo(`t${n++}`);

describe("G2 local database (IndexedDB adapter)", () => {
  it("put/get/list/delete, namespaces stay separate", async () => {
    const r = fresh(); await r.put(rec("a")); await r.put(rec("b"));
    expect((await r.list("demo")).length).toBe(2); expect(await r.list("real")).toEqual([]);
    expect((await r.get("demo", "a"))?.values["profile.birth_year"]).toEqual({ state: "unknown" }); // unknown survives storage
    await r.delete("demo", "a"); expect(await r.get("demo", "a")).toBeNull();
  });
  it("same isolation guards as G1 store", async () => {
    const r = fresh();
    await expect(r.put(rec("x", "real", "FACT"))).rejects.toThrow(/locked/);
    const open = new DexieRepo(`t${n++}`, true);
    await expect(open.put(rec("x", "real", "DEMO"))).rejects.toThrow(/DEMO/);
    await expect(open.put(rec("x", "demo", "FACT"))).rejects.toThrow(/only DEMO/);
  });
});

describe("G2 backup / restore", () => {
  it("round-trips to a clean database (clean-device restore)", async () => {
    const a = fresh(); for (const i of ["a", "b", "c"]) await a.put(rec(i));
    const file = JSON.stringify(await createBackup(a, "demo"));
    const b = fresh(); expect(await restoreBackup(b, file)).toBe(3);
    expect(await b.list("demo")).toEqual(await a.list("demo"));
  });
  it("restore replaces, never merges stale rows", async () => {
    const a = fresh(); await a.put(rec("a")); const file = JSON.stringify(await createBackup(a, "demo"));
    const b = fresh(); await b.put(rec("stale")); await restoreBackup(b, file);
    expect((await b.list("demo")).map((r) => r.id)).toEqual(["a"]);
  });
  it("damaged or tampered file is rejected and changes nothing", async () => {
    const a = fresh(); await a.put(rec("a")); const good = JSON.stringify(await createBackup(a, "demo"));
    const b = fresh(); await b.put(rec("keep"));
    for (const bad of [good.slice(0, good.length - 20), good.replace('"a"', '"z"'), "{}", "nope"]) await expect(restoreBackup(b, bad)).rejects.toThrow(BackupError);
    expect((await b.list("demo")).map((r) => r.id)).toEqual(["keep"]);
  });
  it("a demo backup can never be restored as real, and real is locked", async () => {
    const a = fresh(); await a.put(rec("a")); const f = await createBackup(a, "demo");
    const forged = JSON.stringify({ ...f, ns: "real", records: f.records.map((r) => ({ ...r, ns: "real" })) });
    const forgedFixed = JSON.parse(forged); forgedFixed.checksum = (await import("../src/core/backup")).checksum(JSON.stringify(forgedFixed.records));
    await expect(restoreBackup(fresh(), JSON.stringify(forgedFixed))).rejects.toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify({ ...f, ns: "real" }))).toThrow(/namespace/);
  });
  it("newer-schema backup is refused", async () => {
    const a = fresh(); const f = await createBackup(a, "demo");
    expect(() => parseBackup(JSON.stringify({ ...f, schemaVersion: 99 }))).toThrow(/newer/);
  });
});

import { MemoryKV, Store } from "../src/core/store";
import { StoreRepo } from "../src/adapters/storeRepo";
describe("G2 backup via the app's current store", () => {
  it("demo store backs up and restores into a fresh device; real stays locked", async () => {
    const s1 = new Store(new MemoryKV()); s1.demo.put(rec("a")); s1.demo.put(rec("b"));
    const file = JSON.stringify(await createBackup(new StoreRepo(s1), "demo"));
    const s2 = new Store(new MemoryKV());
    expect(await restoreBackup(new StoreRepo(s2), file)).toBe(2);
    expect(s2.demo.list().length).toBe(2); expect(s2.real.list()).toEqual([]);
  });
});

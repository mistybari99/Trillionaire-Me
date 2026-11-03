import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";
import { DexieRepo } from "../src/adapters/dexie";
import { MirrorKV, SaveMonitor, mirrorToRepo } from "../src/core/persist";
import { MemoryKV, Store } from "../src/core/store";
import { MemorySnapshotRepo, buildSnapshotFile } from "../src/core/snapshots";
import type { TMRecord } from "../src/core/types";
import { StoreRepo } from "../src/adapters/storeRepo";
import { PACKS } from "../src/i18n/packs";

const rec = (id: string): TMRecord => ({ id, entity: "profile", ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-10-23T00:00:00Z", values: { "profile.display_name": { state: "value", value: id, label: "DEMO" } } });
const settle = () => new Promise((r) => setTimeout(r, 30));
let n = 0;

describe("save-failed state", () => {
  it("a failing store is reported (not swallowed), memory keeps the data, retry saves it", async () => {
    const repo = new DexieRepo(`sf${n++}`); let failing = true; const real = repo.put.bind(repo);
    repo.put = async (r) => { if (failing) throw new Error("QuotaExceededError"); return real(r); };
    const mon = new SaveMonitor(); let events = 0; mon.subscribe(() => events++);
    const s = new Store(new MirrorKV(new MemoryKV(), mirrorToRepo(repo, mon)));
    s.demo.put(rec("a")); await vi.waitFor(() => expect(mon.hasFailure).toBe(true), { timeout: 5000 });
    expect(mon.hasFailure).toBe(true); expect(mon.failedCount).toBe(1); expect(events).toBe(1);
    expect(s.demo.get("a")).not.toBeNull();
    mon.retry(); await settle(); expect(mon.hasFailure).toBe(true); expect(events).toBe(1); // still failing, no new event
    failing = false; mon.retry();
    // wait for the real write to finish instead of a fixed delay (a slow CI runner needs longer than 30 ms)
    await vi.waitFor(() => expect(mon.hasFailure).toBe(false), { timeout: 5000 }); expect(events).toBe(2);
    expect((await repo.list("demo")).map((r) => r.id)).toEqual(["a"]);
  });
  it("the latest value wins for a retried key, and a later good write clears it", async () => {
    const repo = new DexieRepo(`sf${n++}`); let failing = true; const real = repo.put.bind(repo);
    repo.put = async (r) => { if (failing) throw new Error("x"); return real(r); };
    const mon = new SaveMonitor(); const s = new Store(new MirrorKV(new MemoryKV(), mirrorToRepo(repo, mon)));
    s.demo.put(rec("a")); await vi.waitFor(() => expect(mon.hasFailure).toBe(true), { timeout: 5000 }); failing = false; s.demo.put({ ...rec("a"), createdAt: "2026-11-01T00:00:00Z" });
    await vi.waitFor(async () => { expect(mon.hasFailure).toBe(false); expect((await repo.list("demo"))[0]!.createdAt).toBe("2026-11-01T00:00:00Z"); }, { timeout: 5000 });
  });
  it("one-tap backup file comes from memory, real part only with the tick", async () => {
    const s = new Store(new MemoryKV(), { consentKv: new MemoryKV() });
    s.demo.put(rec("a"));
    const f = await buildSnapshotFile(new StoreRepo(s), false);
    expect(f.kind).toBe("snapshot-file"); expect(f.demo.count).toBe(1); expect(f.real).toBeNull();
    void MemorySnapshotRepo;
  });
  it("banner wording exists in EN and BN and is not alarming", () => {
    expect(PACKS.en["save.fail.text"]).toContain("Could not save on this device. Export a backup now.");
    for (const k of ["save.fail.title", "save.fail.text", "save.fail.retry", "save.fail.backup"] as const) expect(PACKS.bn[k]).toBeTruthy();
  });
});

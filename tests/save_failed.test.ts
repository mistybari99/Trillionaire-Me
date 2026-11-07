import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";
import { DexieRepo } from "../src/adapters/dexie";
import { MirrorKV, SaveMonitor, mirrorToRepo } from "../src/core/persist";
import { LocalKV, MemoryKV, Store } from "../src/core/store";
import { MemorySnapshotRepo, buildSnapshotFile } from "../src/core/snapshots";
import type { TMRecord } from "../src/core/types";
import { StoreRepo } from "../src/adapters/storeRepo";
import { PACKS } from "../src/i18n/packs";

const rec = (id: string): TMRecord => ({ id, entity: "profile", ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-10-23T00:00:00Z", values: { "profile.display_name": { state: "value", value: id, label: "DEMO" } } });
const settle = () => new Promise((r) => setTimeout(r, 30));
const deferred = () => { let resolve!: () => void; const promise = new Promise<void>((r) => { resolve = r; }); return { promise, resolve }; };
let n = 0;

describe("save-failed state", () => {
  it("StoreRepo waits for durable writes and reports their failure despite the memory update", async () => {
    const disk = new DexieRepo(`sf${n++}`);
    const gate = deferred();
    const put = disk.put.bind(disk);
    disk.put = async (r) => { await gate.promise; await put(r); };
    const monitor = new SaveMonitor();
    const writer = mirrorToRepo(disk, monitor);
    const memory = new Store(new MirrorKV(new MemoryKV(), writer));
    const adapter = new StoreRepo(memory, writer.flush);
    let completed = false;
    const saving = adapter.put(rec("a")).then(() => { completed = true; });
    await Promise.resolve();
    expect(memory.demo.get("a")).not.toBeNull();
    expect(completed).toBe(false);
    expect(await disk.get("demo", "a")).toBeNull();
    gate.resolve(); await saving;
    expect(completed).toBe(true);
    expect(await disk.get("demo", "a")).toEqual(rec("a"));
    disk.put = async () => { throw new Error("QuotaExceededError"); };
    await expect(adapter.put(rec("b"))).rejects.toThrow("Could not save on this device");
    expect(memory.demo.get("b")).not.toBeNull();
    expect(await disk.get("demo", "b")).toBeNull();
    expect(monitor.hasFailure).toBe(true);
  });
  it("retry cannot overwrite a queued newer value with an older failed value", async () => {
    const disk = new DexieRepo(`sf${n++}`);
    const put = disk.put.bind(disk);
    disk.put = async () => { throw new Error("quota"); };
    const monitor = new SaveMonitor(); const writer = mirrorToRepo(disk, monitor);
    const memory = new Store(new MirrorKV(new MemoryKV(), writer));
    memory.demo.put(rec("a")); await expect(writer.flush()).rejects.toThrow();
    disk.put = put;
    const newer = { ...rec("a"), createdAt: "2026-11-01T00:00:00Z" };
    memory.demo.put(newer); monitor.retry(); await writer.flush();
    expect(await disk.get("demo", "a")).toEqual(newer);
    expect(monitor.hasFailure).toBe(false);
  });
  it("retry preserves a newer deletion and durably completes failed deletes", async () => {
    const disk = new DexieRepo(`sf${n++}`);
    const put = disk.put.bind(disk), remove = disk.delete.bind(disk);
    const monitor = new SaveMonitor(); const writer = mirrorToRepo(disk, monitor);
    const memory = new Store(new MirrorKV(new MemoryKV(), writer));
    const adapter = new StoreRepo(memory, writer.flush);
    await adapter.put(rec("a"));
    disk.put = async () => { throw new Error("quota"); };
    memory.demo.put({ ...rec("a"), createdAt: "2026-11-01T00:00:00Z" });
    await expect(writer.flush()).rejects.toThrow();
    disk.put = put;
    memory.demo.delete("a"); monitor.retry(); await writer.flush();
    expect(await disk.get("demo", "a")).toBeNull();
    await adapter.put(rec("b"));
    disk.delete = async () => { throw new Error("disk unavailable"); };
    await expect(adapter.delete("demo", "b")).rejects.toThrow();
    expect(memory.demo.get("b")).toBeNull();
    expect(await disk.get("demo", "b")).not.toBeNull();
    expect(monitor.entries()).toEqual([["tm:demo:b", null]]);
    disk.delete = remove; monitor.retry(); await writer.flush();
    expect(await disk.get("demo", "b")).toBeNull();
  });
  it("flush includes changes queued while it is waiting and does not hide unrelated failures", async () => {
    const disk = new DexieRepo(`sf${n++}`), gate = deferred();
    const put = disk.put.bind(disk);
    disk.put = async (r) => { if (r.id === "a") await gate.promise; else throw new Error("quota"); await put(r); };
    const writer = mirrorToRepo(disk);
    writer("tm:demo:a", JSON.stringify(rec("a")));
    const flushed = writer.flush();
    writer("tm:demo:b", JSON.stringify(rec("b"))); gate.resolve();
    await expect(flushed).rejects.toThrow("Could not save on this device");
    expect(await disk.get("demo", "a")).not.toBeNull();
  });
  it("LocalKV reports failed deletion and a retry can remove the durable record", () => {
    const monitor = new SaveMonitor();
    const local = new LocalKV((k, v, ok) => { if (ok) monitor.ok(k); else monitor.fail(k, v); });
    const key = "tm:demo:local-delete"; local.set(key, JSON.stringify(rec("local-delete")));
    const remove = vi.spyOn(Storage.prototype, "removeItem").mockImplementationOnce(() => { throw new Error("blocked"); });
    local.remove(key);
    expect(monitor.entries()).toEqual([[key, null]]);
    expect(local.get(key)).not.toBeNull();
    monitor.bind(() => { for (const [k, v] of monitor.entries()) if (v === null) local.remove(k); else local.set(k, v); });
    monitor.retry();
    expect(monitor.hasFailure).toBe(false); expect(local.get(key)).toBeNull();
    remove.mockRestore();
  });
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

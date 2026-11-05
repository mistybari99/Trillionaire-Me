import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { DexieRepo } from "../src/adapters/dexie";
import { StoreRepo } from "../src/adapters/storeRepo";
import { createBackup } from "../src/core/backup";
import { grantConsent } from "../src/core/consent";
import type { RecordRepo } from "../src/core/repo";
import { goBack, planRestore, RealPermissionError, restoreBackupAtomic, RestoreRecoveryError } from "../src/core/restore";
import { MemorySnapshotRepo, restoreSnapshot } from "../src/core/snapshots";
import { MemoryKV, Store } from "../src/core/store";
import type { Namespace, TMRecord } from "../src/core/types";

const at = "2026-11-05T00:00:00Z";
const rec = (ns: Namespace, id: string, value = id): TMRecord => ({ id, entity: "goal", ns, ownerId: "synthetic-test", schemaVersion: 3,
  createdAt: at, values: { "goal.title": { state: "value", value, label: ns === "demo" ? "DEMO" : "FACT" } } });
const memory = () => {
  const consent = new MemoryKV(); grantConsent(consent, at);
  return new StoreRepo(new Store(new MemoryKV(), { consentKv: consent }));
};
const source = async (r: RecordRepo) => ({ demo: await createBackup(r, "demo"), real: await createBackup(r, "real"), createdAt: at });
const fault = (inner: RecordRepo, put: (r: TMRecord) => Promise<void>): RecordRepo => ({
  list: ns => inner.list(ns), get: (ns, id) => inner.get(ns, id), put,
  delete: (ns, id) => inner.delete(ns, id), clear: ns => inner.clear(ns),
});

describe("recovery when writes and compensation fail", () => {
  it("never claims unchanged after a persistent rollback failure and keeps the original snapshot usable", async () => {
    const repo = memory(), incoming = memory(), snaps = new MemorySnapshotRepo();
    await repo.put(rec("demo", "same", "original"));
    await incoming.put(rec("demo", "same", "replacement")); await incoming.put(rec("demo", "zz-fail"));
    let failed = false;
    const broken = fault(repo, async r => {
      if (r.id === "zz-fail" || failed) { failed = true; throw Error("persistent quota failure"); }
      await repo.put(r);
    });
    const error = await restoreBackupAtomic(broken, snaps, await source(incoming), true).catch(e => e);
    expect(error).toBeInstanceOf(RestoreRecoveryError); expect(error.unchanged).toBe(false);
    expect(error.message).not.toContain("nothing was changed");
    expect((await repo.get("demo", "same"))!.values["goal.title"]).toHaveProperty("value", "replacement");
    const saved = (await snaps.list()).find(s => s.id === error.snapshotId)!;
    expect(saved.demo.records[0]!.values["goal.title"]).toHaveProperty("value", "original");
    await goBack(repo, snaps, error.snapshotId, true);
    expect((await repo.get("demo", "same"))!.values["goal.title"]).toHaveProperty("value", "original");
  });

  it("rolls back both namespaces after a later real write fails, using IndexedDB", async () => {
    const repo = new DexieRepo(`recovery-${crypto.randomUUID()}`, true), incoming = memory();
    try {
      await repo.put(rec("demo", "old-demo")); await repo.put(rec("real", "old-real"));
      await incoming.put(rec("demo", "new-demo")); await incoming.put(rec("real", "new-real"));
      let once = true;
      const broken = fault(repo, async r => { if (once && r.id === "new-real") { once = false; throw Error("write failed"); } await repo.put(r); });
      const error = await restoreBackupAtomic(broken, repo.snapshots(), await source(incoming), true).catch(e => e);
      expect(error).toBeInstanceOf(RestoreRecoveryError); expect(error.unchanged).toBe(true);
      expect((await repo.list("demo")).map(r => r.id)).toEqual(["old-demo"]);
      expect((await repo.list("real")).map(r => r.id)).toEqual(["old-real"]);
      expect((await repo.snapshots().list()).some(s => s.id === error.snapshotId)).toBe(true);
    } finally { repo.close(); }
  });

  it("Go back preserves both current parts on failure and the original recovery copy remains retryable", async () => {
    const repo = memory(), incoming = memory(), snaps = new MemorySnapshotRepo();
    await repo.put(rec("demo", "original-demo")); await repo.put(rec("real", "original-real"));
    await incoming.put(rec("demo", "current-demo")); await incoming.put(rec("real", "current-real"));
    const initial = await restoreBackupAtomic(repo, snaps, await source(incoming), true);
    let once = true;
    const broken = fault(repo, async r => { if (once && r.id === "original-real") { once = false; throw Error("failed recovery write"); } await repo.put(r); });
    await expect(goBack(broken, snaps, initial.snapshotId, true)).rejects.toThrow(RestoreRecoveryError);
    expect((await repo.list("demo")).map(r => r.id)).toEqual(["current-demo"]);
    expect((await repo.list("real")).map(r => r.id)).toEqual(["current-real"]);
    await expect(goBack(repo, snaps, initial.snapshotId, false)).rejects.toThrow(RealPermissionError);
    expect((await repo.list("demo")).map(r => r.id)).toEqual(["current-demo"]);
    await goBack(repo, snaps, initial.snapshotId, true);
    expect((await repo.list("demo")).map(r => r.id)).toEqual(["original-demo"]);
    expect((await repo.list("real")).map(r => r.id)).toEqual(["original-real"]);
  });

  it("the direct snapshot API compensates the first part when its second part fails", async () => {
    const repo = memory(), incoming = memory();
    await repo.put(rec("demo", "old-demo")); await repo.put(rec("real", "old-real"));
    await incoming.put(rec("demo", "new-demo")); await incoming.put(rec("real", "new-real"));
    const src = await source(incoming); let once = true;
    const broken = fault(repo, async r => { if (once && r.id === "new-real") { once = false; throw Error("failure"); } await repo.put(r); });
    await expect(restoreSnapshot(broken, { ...src, id: "fixture", reason: "before_restore" }, true)).rejects.toThrow("nothing was changed");
    expect((await repo.list("demo")).map(r => r.id)).toEqual(["old-demo"]);
    expect((await repo.list("real")).map(r => r.id)).toEqual(["old-real"]);
  });

  it("rejects a real backup placed in the demo slot before touching data", async () => {
    const repo = memory(), incoming = memory(); await incoming.put(rec("real", "r"));
    await expect(planRestore(repo, { demo: await createBackup(incoming, "real"), real: null, createdAt: at }, false)).rejects.toThrow("wrong place");
    expect(await repo.list("real")).toEqual([]);
  });
});

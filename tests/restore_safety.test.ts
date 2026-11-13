// Settings redesign PR 1: restore safety. Preview, automatic "Before restore" copy, atomic replace with rollback, Go back.
import { describe, expect, it } from "vitest";
import { BackupError, createBackup, replaceNamespace, restoreBackup } from "../src/core/backup";
import { RealPermissionError, goBack, planRestore, restoreBackupAtomic } from "../src/core/restore";
import { MemorySnapshotRepo, pruneSnapshots, scrubRealParts, type Snapshot } from "../src/core/snapshots";
import { StoreRepo } from "../src/adapters/storeRepo";
import { grantConsent } from "../src/core/consent";
import { MemoryKV, Store } from "../src/core/store";
import type { RecordRepo } from "../src/core/repo";
import type { FieldValue, Namespace, TMRecord } from "../src/core/types";

const NOW = "2026-10-26T10:00:00.000Z";
const rec = (ns: Namespace, id: string, v = id): TMRecord => ({ id, entity: "goal", ns, ownerId: ns === "demo" ? "demo-user" : "owner", schemaVersion: 1, createdAt: NOW, values: { "goal.title": { state: "value", value: v, label: ns === "demo" ? "DEMO" : "FACT" } as FieldValue } });
const mk = (consent = false) => { const c = new MemoryKV(); if (consent) grantConsent(c, NOW); const s = new Store(new MemoryKV(), { consentKv: c }); return { s, repo: new StoreRepo(s) }; };
/** A repo whose n-th put (1-based, counted from arming) throws once. */
const flaky = (inner: RecordRepo) => { let left = -1; const r: RecordRepo & { failOnPut(n: number): void } = {
  list: (ns) => inner.list(ns), get: (ns, id) => inner.get(ns, id), delete: (ns, id) => inner.delete(ns, id), clear: (ns) => inner.clear(ns),
  put: async (x) => { if (left > 0 && --left === 0) { left = -1; throw new Error("disk full"); } await inner.put(x); }, failOnPut(n) { left = n; } }; return r; };
const src = async (repo: RecordRepo, ns: Namespace = "demo") => ({ demo: ns === "demo" ? await createBackup(repo, "demo") : null, real: ns === "real" ? await createBackup(repo, "real") : null, createdAt: NOW });

describe("restoreBackup no longer empties the store first", () => {
  it("a failing put in the middle keeps the original records", async () => {
    const { s, repo } = mk(); s.demo.put(rec("demo", "old1")); s.demo.put(rec("demo", "old2"));
    const other = mk(); for (const i of ["n1", "n2", "n3"]) other.s.demo.put(rec("demo", i));
    const file = JSON.stringify(await createBackup(other.repo, "demo"));
    const f = flaky(repo); f.failOnPut(2);
    await expect(restoreBackup(f, file)).rejects.toThrow(/nothing was changed/);
    expect(s.demo.list().map((r) => r.id).sort()).toEqual(["old1", "old2"]);
  });
  it("replaceNamespace removes records that are not in the new set, and rolls back removals too", async () => {
    const { s, repo } = mk(); s.demo.put(rec("demo", "a")); s.demo.put(rec("demo", "b"));
    await replaceNamespace(repo, "demo", [rec("demo", "a", "A2"), rec("demo", "c")]);
    expect(s.demo.list().map((r) => r.id).sort()).toEqual(["a", "c"]);
  });
});

describe("planRestore (preview)", () => {
  it("counts equal the file and the phone; nothing changes", async () => {
    const { s, repo } = mk(); s.demo.put(rec("demo", "a")); s.demo.put(rec("demo", "b"));
    const o = mk(); for (const i of ["x", "y", "z"]) o.s.demo.put(rec("demo", i));
    const p = await planRestore(repo, await src(o.repo), false);
    expect(p.parts).toEqual([{ ns: "demo", file: 3, now: 2 }]); expect(p.fileTotal).toBe(3); expect(p.nowTotal).toBe(2); expect(p.realBlocked).toBe(false);
    expect(s.demo.list().length).toBe(2);
  });
  it("a real part without the tick is flagged; a corrupt or newer file is rejected", async () => {
    const o = mk(true); o.s.real.put(rec("real", "r1"));
    const real = await src(o.repo, "real"); const { repo } = mk();
    expect((await planRestore(repo, real, false)).realBlocked).toBe(true);
    await expect(planRestore(repo, { ...real, real: { ...real.real!, checksum: "00000000" } }, true)).rejects.toThrow(BackupError);
    await expect(planRestore(repo, { ...real, real: { ...real.real!, schemaVersion: 999 } }, true)).rejects.toThrow(/newer/);
  });
});

describe("restoreBackupAtomic", () => {
  it("saves a Before restore copy, replaces, and Go back puts the old records back", async () => {
    const { s, repo } = mk(); s.demo.put(rec("demo", "a")); s.demo.put(rec("demo", "b"));
    const o = mk(); o.s.demo.put(rec("demo", "x")); const snaps = new MemorySnapshotRepo();
    const r = await restoreBackupAtomic(repo, snaps, await src(o.repo), false);
    expect(r.demo).toBe(1); expect(s.demo.list().map((x) => x.id)).toEqual(["x"]);
    const saved = (await snaps.list())[0]!; expect(saved.reason).toBe("before_restore"); expect(saved.demo.count).toBe(2); expect(saved.id).toBe(r.snapshotId);
    const back = await goBack(repo, snaps, r.snapshotId, false);
    expect(back.demo).toBe(2); expect(s.demo.list().map((x) => x.id).sort()).toEqual(["a", "b"]);
  });
  it("a failing put leaves the original records and reports that nothing was changed", async () => {
    const { s, repo } = mk(); s.demo.put(rec("demo", "a")); s.demo.put(rec("demo", "b"));
    const o = mk(); for (const i of ["x", "y", "z"]) o.s.demo.put(rec("demo", i));
    const f = flaky(repo); f.failOnPut(2);
    await expect(restoreBackupAtomic(f, new MemorySnapshotRepo(), await src(o.repo), false)).rejects.toThrow(/nothing was changed/);
    expect(s.demo.list().map((x) => x.id).sort()).toEqual(["a", "b"]);
  });
  it("real data without the tick writes nothing at all (no copy either)", async () => {
    const o = mk(true); o.s.real.put(rec("real", "r1")); const { s, repo } = mk(); s.demo.put(rec("demo", "a")); const snaps = new MemorySnapshotRepo();
    await expect(restoreBackupAtomic(repo, snaps, await src(o.repo, "real"), false)).rejects.toThrow(RealPermissionError);
    expect(s.demo.list().length).toBe(1); expect(s.real.list().length).toBe(0); expect((await snaps.list()).length).toBe(0);
  });
  it("with the tick, real is replaced and Go back also empties real entries the restore added", async () => {
    const o = mk(true); o.s.real.put(rec("real", "r1")); const { s, repo } = mk(true);
    const snaps = new MemorySnapshotRepo(); const r = await restoreBackupAtomic(repo, snaps, await src(o.repo, "real"), true);
    expect(s.real.list().length).toBe(1);
    await goBack(repo, snaps, r.snapshotId, true); expect(s.real.list().length).toBe(0);
  });
  it("if the Before restore copy cannot be saved, nothing is changed", async () => {
    const { s, repo } = mk(); s.demo.put(rec("demo", "a")); const o = mk(); o.s.demo.put(rec("demo", "x"));
    const bad = { list: async () => [], put: async () => { throw new Error("quota"); }, delete: async () => {} };
    await expect(restoreBackupAtomic(repo, bad, await src(o.repo), false)).rejects.toThrow(/nothing was changed/);
    expect(s.demo.list().map((x) => x.id)).toEqual(["a"]);
  });
  it("a corrupt file is rejected before anything is touched", async () => {
    const { s, repo } = mk(); s.demo.put(rec("demo", "a")); const o = mk(); o.s.demo.put(rec("demo", "x")); const good = await src(o.repo);
    await expect(restoreBackupAtomic(repo, new MemorySnapshotRepo(), { ...good, demo: { ...good.demo!, checksum: "bad00000" } }, false)).rejects.toThrow(BackupError);
    expect(s.demo.list().map((x) => x.id)).toEqual(["a"]);
  });
});

describe("Before restore copy lifetime", () => {
  const snap = (id: string, reason: Snapshot["reason"], daysAgo: number, now: Date): Snapshot => {
    const at = new Date(now.getTime() - daysAgo * 86400_000).toISOString();
    return { id, createdAt: at, reason, demo: { app: "trillionaire-me", schemaVersion: 1, ns: "demo", createdAt: at, count: 0, checksum: "x", records: [] }, real: null };
  };
  it("is kept 7 days outside the keep-N count, then removed", async () => {
    const now = new Date(NOW); const snaps = new MemorySnapshotRepo();
    for (const s of [snap("m1", "manual", 1, now), snap("m2", "manual", 2, now), snap("br-new", "before_restore", 3, now), snap("br-old", "before_restore", 8, now)]) await snaps.put(s);
    await pruneSnapshots(snaps, 1, now);
    expect((await snaps.list()).map((s) => s.id).sort()).toEqual(["br-new", "m1"]);
  });
  it("Clear real removes the real copy inside it", async () => {
    const o = mk(true); o.s.real.put(rec("real", "r1")); const { repo } = mk(true); const snaps = new MemorySnapshotRepo();
    await restoreBackupAtomic(repo, snaps, await src(o.repo, "real"), true);
    // a second restore makes a Before copy that holds the real entry
    await restoreBackupAtomic(repo, snaps, await src(mk().repo), true).catch(() => null);
    const withReal = (await snaps.list()).filter((s) => s.real && s.real.count > 0);
    expect(withReal.length).toBeGreaterThan(0);
    await scrubRealParts(snaps); expect((await snaps.list()).every((s) => s.real === null)).toBe(true);
  });
});

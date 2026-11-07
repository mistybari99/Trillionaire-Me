// At-rest encryption in the persistence layer: read path accepts plain + sealed, the mirror is the only place that seals, failures never drop data.
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { DexieRepo } from "../src/adapters/dexie";
import { StoreRepo } from "../src/adapters/storeRepo";
import { MirrorKV, SaveMonitor, hydrate, mirrorToRepo, rehydrateReal } from "../src/core/persist";
import { MemoryKV, Store } from "../src/core/store";
import { grantConsent } from "../src/core/consent";
import { VaultSession, encryptRecord, isEncRecord, newVault, writeVault, decryptRecord, VAULT_KEY } from "../src/core/dataVault";
import { createBackup } from "../src/core/backup";
import { restoreBackupAtomic } from "../src/core/restore";
import { MemorySnapshotRepo } from "../src/core/snapshots";
import type { TMRecord } from "../src/core/types";

let n = 0;
const rec = (id: string, ns: "real" | "demo" = "real"): TMRecord => ({ id, entity: "profile", ns, ownerId: "u", schemaVersion: 3, createdAt: "2026-11-07T00:00:00Z",
  values: { "profile.display_name": { state: "value", value: `Name ${id}`, label: ns === "real" ? "FACT" : "DEMO" } } });
async function setup(on: boolean) {
  const consent = new MemoryKV(); grantConsent(consent, "2026-11-07T00:00:00Z");
  const repo = new DexieRepo(`vp${n++}`, true); const v = await newVault("blue-tea-42", 1000);
  if (on) writeVault(consent, { ...v.config, state: "on" });
  const session = new VaultSession(consent); if (on) session.setKey(v.key);
  const mem = new MemoryKV(), monitor = new SaveMonitor(), mirror = mirrorToRepo(repo, monitor, session);
  const store = new Store(new MirrorKV(mem, mirror), { consentKv: consent });
  return { consent, repo, v, session, mem, monitor, mirror, store };
}

describe("read path", () => {
  it("accepts plain and sealed records together; the sync store sees plain values", async () => {
    const s = await setup(true);
    await s.repo.put(rec("plain")); await s.repo.put(await encryptRecord(s.v.key, rec("sealed"))); await s.repo.put(rec("d1", "demo"));
    const mem = new MemoryKV(); await hydrate(mem, s.repo, new MemoryKV(), s.session);
    const st = new Store(mem); expect(st.real.list().map((r) => r.id).sort()).toEqual(["plain", "sealed"]);
    expect(st.real.get("sealed")!.values["profile.display_name"]).toMatchObject({ value: "Name sealed" });
    expect(st.demo.list().length).toBe(1);
  });
  it("locked: no real record reaches memory (sealed or plain); demo does", async () => {
    const s = await setup(true); await s.repo.put(rec("plain")); await s.repo.put(await encryptRecord(s.v.key, rec("sealed"))); await s.repo.put(rec("d1", "demo"));
    s.session.lock(); const mem = new MemoryKV(); await hydrate(mem, s.repo, new MemoryKV(), s.session);
    const st = new Store(mem); expect(st.real.list()).toEqual([]); expect(st.demo.list().length).toBe(1);
    expect(s.session.locked()).toBe(true);
  });
  it("after unlock, rehydrateReal loads the opened records", async () => {
    const s = await setup(true); await s.repo.put(await encryptRecord(s.v.key, rec("sealed")));
    const mem = new MemoryKV(); mem.set("tm:real:old", "{}"); await rehydrateReal(mem, s.repo, s.session);
    expect(new Store(mem).real.list().map((r) => r.id)).toEqual(["sealed"]);
  });
  it("a record that cannot be opened is shown as a stand-in, its ciphertext is kept, never overwritten or deleted", async () => {
    const s = await setup(true); const other = await newVault("blue-tea-42", 1000);
    const foreign = await encryptRecord(other.key, rec("bad")); await s.repo.put(foreign);
    await hydrate(s.mem, s.repo, new MemoryKV(), s.session);
    const shown = s.store.real.get("bad")!; expect(shown.cantOpen).toBe(true); expect(shown.values).toEqual({});
    s.store.real.put({ ...shown, cantOpen: undefined, values: { x: { state: "unknown" } } }); s.store.real.delete("bad");
    await s.mirror.flush(); const kept = await s.repo.get("real", "bad"); expect(kept!.ct).toBe(foreign.ct);
    expect(s.session.opaqueCount).toBe(1);
  });
});

describe("write path", () => {
  it("seals real records on the way to IndexedDB, keeps demo plain, memory stays plain", async () => {
    const s = await setup(true); s.store.real.put(rec("a")); s.store.demo.put(rec("d", "demo")); await s.mirror.flush();
    const stored = await s.repo.get("real", "a"); expect(isEncRecord(stored)).toBe(true); expect(JSON.stringify(stored)).not.toContain("Name a");
    expect(isEncRecord((await s.repo.get("demo", "d"))!)).toBe(false);
    expect(s.store.real.get("a")!.values["profile.display_name"]).toMatchObject({ value: "Name a" });
    expect((await decryptRecord(s.v.key, stored!)).values["profile.display_name"]).toMatchObject({ value: "Name a" });
  });
  it("vault off: records are written plain, as before", async () => {
    const s = await setup(false); s.store.real.put(rec("a")); await s.mirror.flush();
    expect(isEncRecord((await s.repo.get("real", "a"))!)).toBe(false);
  });
  it("on but locked or stale tab (no key): nothing is written plain, the value waits in the save monitor and memory", async () => {
    const s = await setup(true); s.session.lock();
    s.store.real.put(rec("a")); await expect(s.mirror.flush()).rejects.toThrow();
    expect(await s.repo.get("real", "a")).toBeNull(); expect(s.monitor.hasFailure).toBe(true); expect(s.store.real.get("a")).not.toBeNull();
    // after unlock the retry seals it
    s.session.setKey(s.v.key); s.monitor.retry(); await s.mirror.flush();
    expect(isEncRecord((await s.repo.get("real", "a"))!)).toBe(true); expect(s.monitor.hasFailure).toBe(false);
  });
  it("a tab whose key belongs to an older vault cannot seal with it", async () => {
    const s = await setup(true); const again = await newVault("blue-tea-42", 1000);
    writeVault(s.consent, { ...again.config, state: "on" }); // turned off and on again elsewhere
    expect(s.session.key()).toBeNull();
    s.store.real.put(rec("a")); await expect(s.mirror.flush()).rejects.toThrow(); expect(await s.repo.get("real", "a")).toBeNull();
  });
  it("a crypto failure goes to the save monitor and keeps the plain memory value", async () => {
    const s = await setup(true);
    const broken = new VaultSession(s.consent); broken.setKey({} as CryptoKey); // not a real key: encrypt throws
    const monitor = new SaveMonitor(); const mirror = mirrorToRepo(s.repo, monitor, broken); const st = new Store(new MirrorKV(new MemoryKV(), mirror), { consentKv: s.consent });
    st.real.put(rec("a")); await expect(mirror.flush()).rejects.toThrow();
    expect(monitor.hasFailure).toBe(true); expect(st.real.get("a")).not.toBeNull(); expect(await s.repo.get("real", "a")).toBeNull();
  });
  it("the secret settings key is never a record key", () => { expect(VAULT_KEY.startsWith("tm:secret:")).toBe(true); expect(/^tm:(demo|real):/.test(VAULT_KEY)).toBe(false); });
});

describe("backup and restore with the vault on", () => {
  it("a restore re-encrypts through the write path; the Before-restore copy keeps its real part sealed", async () => {
    const s = await setup(true); s.store.real.put(rec("old")); await s.mirror.flush();
    const bk = { demo: await createBackup(new StoreRepo(s.store), "demo"), real: await (async () => { const st2 = new Store(new MemoryKV(), { consentKv: s.consent }); st2.real.put(rec("fromfile")); return createBackup(new StoreRepo(st2), "real"); })() };
    const inner = new MemorySnapshotRepo();
    const { VaultSnapshotRepo } = await import("../src/core/dataVault");
    const snaps = new VaultSnapshotRepo(inner, () => s.session.key(), () => s.session.active());
    const res = await restoreBackupAtomic(new StoreRepo(s.store), snaps, { demo: bk.demo, real: bk.real, createdAt: "2026-11-07T00:00:00Z" }, true);
    await s.mirror.flush();
    const stored = await s.repo.list("real"); expect(stored.map((r) => r.id)).toEqual(["fromfile"]); expect(stored.every(isEncRecord)).toBe(true);
    const raw = (await inner.list())[0]!; expect(raw.real).toBeNull(); expect(JSON.stringify(raw)).not.toContain("Name old");
    expect((await snaps.list()).find((x) => x.id === res.snapshotId)!.real!.count).toBe(1);
  });
});

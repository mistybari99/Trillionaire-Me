// At-rest encryption, stage 1 (option C). Core tests: crypto, tamper, wrong passphrase, migration (interrupt/resume), rollback, snapshots, exports.
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { DexieRepo } from "../src/adapters/dexie";
import { MemoryKV } from "../src/core/store";
import type { TMRecord } from "../src/core/types";
import {
  VAULT_KEY, VAULT_BATCH, activateInPlace, decryptRecord, deactivateInPlace, encryptRecord, isEncRecord, newVault, readVault, unlockVault,
  vaultPassphraseProblem, verifyVaultPassphrase, writeVault, VaultSnapshotRepo, vaultActive, DEFAULT_VAULT_ITERATIONS,
} from "../src/core/dataVault";
import { MemorySnapshotRepo, type Snapshot } from "../src/core/snapshots";
import { createBackup } from "../src/core/backup";
import { exportCsv } from "../src/core/csv";
import { exportNamespace } from "../src/core/export";
import { Store } from "../src/core/store";
import { grantConsent } from "../src/core/consent";

const IT = 1000; // low iteration count for tests only
let n = 0;
const rec = (id: string, ns: "real" | "demo" = "real", label: "FACT" | "DEMO" = ns === "real" ? "FACT" : "DEMO"): TMRecord => ({
  id, entity: "profile", ns, ownerId: "u", schemaVersion: 3, createdAt: "2026-11-07T00:00:00Z", links: { parent: "p1" },
  values: { "profile.display_name": { state: "value", value: `Name ${id}`, label }, "profile.birth_year": { state: "unknown" } },
});
const fill = async (repo: DexieRepo, count: number) => { for (let i = 0; i < count; i++) await repo.put(rec(`r${String(i).padStart(5, "0")}`)); };
const fresh = () => new DexieRepo(`v${n++}`, true);

describe("passphrase rules", () => {
  it("needs 8+ characters and refuses digits only with a plain reason", () => {
    expect(vaultPassphraseProblem("")).toBe("empty");
    expect(vaultPassphraseProblem("abc12")).toBe("short");
    expect(vaultPassphraseProblem("12345678")).toBe("digits");
    expect(vaultPassphraseProblem("1234567890123")).toBe("digits");
    expect(vaultPassphraseProblem("blue-tea-42")).toBeNull();
  });
  it("newVault refuses a weak passphrase", async () => {
    await expect(newVault("12345678", IT)).rejects.toThrow();
    await expect(newVault("abc", IT)).rejects.toThrow();
  });
  it("default iterations reuse the backup setting", () => { expect(DEFAULT_VAULT_ITERATIONS).toBe(600_000); });
});

describe("record crypto", () => {
  it("round trip; plain fields stay plain; values are not in the stored text; IV is unique per record and per write", async () => {
    const { key } = await newVault("blue-tea-42", IT);
    const r = rec("a"); const e1 = await encryptRecord(key, r); const e2 = await encryptRecord(key, r);
    expect(isEncRecord(e1)).toBe(true); expect(e1.enc).toBe(1);
    expect({ id: e1.id, ns: e1.ns, entity: e1.entity, schemaVersion: e1.schemaVersion, createdAt: e1.createdAt }).toEqual({ id: "a", ns: "real", entity: "profile", schemaVersion: 3, createdAt: "2026-11-07T00:00:00Z" });
    expect(e1.values).toEqual({}); expect(JSON.stringify(e1)).not.toContain("Name a"); expect(JSON.stringify(e1)).not.toContain("p1");
    expect(e1.iv).not.toBe(e2.iv); expect(e1.ct).not.toBe(e2.ct);
    expect(await decryptRecord(key, e1)).toEqual(r);
  });
  it("demo records are never encrypted", async () => {
    const { key } = await newVault("blue-tea-42", IT); const d = rec("d", "demo");
    expect(await encryptRecord(key, d)).toBe(d);
  });
  it("tamper: a flipped byte fails cleanly; a record moved to another id fails (AAD)", async () => {
    const { key } = await newVault("blue-tea-42", IT); const e = await encryptRecord(key, rec("a"));
    const bytes = atob(e.ct!); const flipped = btoa(String.fromCharCode(bytes.charCodeAt(0) ^ 1) + bytes.slice(1));
    await expect(decryptRecord(key, { ...e, ct: flipped })).rejects.toThrow();
    await expect(decryptRecord(key, { ...e, id: "b" })).rejects.toThrow();
    await expect(decryptRecord(key, { ...e, ns: "demo" })).rejects.toThrow();
    await expect(decryptRecord(key, { ...e, ct: "!!!" })).rejects.toThrow();
  });
  it("another vault's key cannot open it", async () => {
    const a = await newVault("blue-tea-42", IT), b = await newVault("blue-tea-42", IT);
    await expect(decryptRecord(b.key, await encryptRecord(a.key, rec("a")))).rejects.toThrow();
  });
});

describe("wrapped key and wrong-passphrase slowdown", () => {
  it("unlock gives the same key; the wrapper never holds the raw key or the passphrase", async () => {
    const v = await newVault("blue-tea-42", IT); const e = await encryptRecord(v.key, rec("a"));
    const k2 = await unlockVault(v.config, "blue-tea-42");
    expect(await decryptRecord(k2, e)).toEqual(rec("a"));
    expect(JSON.stringify(v.config)).not.toContain("blue-tea-42");
    expect(v.config.salt).toBeTruthy();
  });
  it("wrong passphrase is refused, slows after 5 tries, data untouched, right one resets", async () => {
    const kv = new MemoryKV(); const v = await newVault("blue-tea-42", IT); writeVault(kv, v.config);
    const repo = fresh(); await repo.put(await encryptRecord(v.key, rec("a"))); const before = JSON.stringify(await repo.list("real"));
    let now = 1_000_000;
    for (let i = 0; i < 4; i++) expect(await verifyVaultPassphrase(kv, "wrong-pass-1", now)).toMatchObject({ ok: false, reason: "wrong" });
    const fifth = await verifyVaultPassphrase(kv, "wrong-pass-1", now); expect(fifth).toMatchObject({ ok: false, reason: "wait", waitSeconds: 30 });
    expect(await verifyVaultPassphrase(kv, "blue-tea-42", now + 5000)).toMatchObject({ ok: false, reason: "wait" }); // even the right one waits
    const ok = await verifyVaultPassphrase(kv, "blue-tea-42", now + 31_000); expect(ok.ok).toBe(true);
    expect(readVault(kv)!.fails).toBe(0);
    expect(JSON.stringify(await repo.list("real"))).toBe(before);
  });
});

describe("in-place migration", () => {
  it("encrypts every real record, leaves demo plain, flips to on only at the end, keeps progress marker, rejects a plain copy afterwards", async () => {
    const kv = new MemoryKV(); const repo = fresh(); await fill(repo, 7); await repo.put(rec("demo1", "demo"));
    const v = await newVault("blue-tea-42", IT); writeVault(kv, { ...v.config, state: "migrating" });
    const seen: number[] = [];
    const res = await activateInPlace(repo, v.key, kv, { batch: 3, afterBatch: (done) => { seen.push(done); expect(readVault(kv)!.state).toBe("migrating"); } });
    expect(res).toEqual({ done: 7, total: 7 }); expect(seen).toEqual([3, 6, 7]);
    const all = await repo.list("real"); expect(all.every(isEncRecord)).toBe(true); expect(all.length).toBe(7);
    expect(readVault(kv)!.state).toBe("on");
    const demo = await repo.get("demo", "demo1"); expect(isEncRecord(demo!)).toBe(false); expect(demo!.values["profile.display_name"]).toBeTruthy();
  });
  it("batch size default is 200", () => { expect(VAULT_BATCH).toBe(200); });
  it("interrupted after batch N: reopen is readable (mixed), resume finishes, 0 plain left", async () => {
    const kv = new MemoryKV(); const repo = fresh(); await fill(repo, 10);
    const v = await newVault("blue-tea-42", IT); writeVault(kv, { ...v.config, state: "migrating" });
    await expect(activateInPlace(repo, v.key, kv, { batch: 4, afterBatch: (d) => { if (d === 4) throw new Error("power cut"); } })).rejects.toThrow("power cut");
    const mid = await repo.list("real"); expect(mid.filter(isEncRecord).length).toBe(4); expect(mid.filter((r) => !isEncRecord(r)).length).toBe(6);
    expect(readVault(kv)!.state).toBe("migrating"); expect(readVault(kv)!.done).toBe(4);
    // every record is still readable in the mixed state
    const k2 = await unlockVault(readVault(kv)!, "blue-tea-42");
    for (const r of mid) expect((await decryptRecord(k2, r)).values["profile.display_name"]).toBeTruthy();
    const res = await activateInPlace(repo, k2, kv, { batch: 4 });
    expect(res.done).toBe(10);
    expect((await repo.list("real")).filter((r) => !isEncRecord(r)).length).toBe(0); expect(readVault(kv)!.state).toBe("on");
  });
  it("a read-back mismatch restores the original and stops without losing data", async () => {
    const kv = new MemoryKV(); const base = fresh(); await fill(base, 3);
    const v = await newVault("blue-tea-42", IT); writeVault(kv, { ...v.config, state: "migrating" });
    // a repo that silently corrupts what it stores for r00001
    const bad = { list: base.list.bind(base), get: base.get.bind(base), delete: base.delete.bind(base), clear: base.clear.bind(base),
      put: async (r: TMRecord) => { await base.put(r.id === "r00001" && isEncRecord(r) ? { ...r, ct: r.ct!.slice(0, -4) + "AAAA" } : r); } };
    await expect(activateInPlace(bad, v.key, kv, { batch: 10 })).rejects.toThrow();
    const left = await base.get("real", "r00001"); expect(isEncRecord(left!)).toBe(false); expect(left!.values["profile.display_name"]).toBeTruthy();
    expect(readVault(kv)!.state).toBe("migrating");
  });
  it("a record that cannot be opened is skipped on resume, ciphertext kept, and the run reports it", async () => {
    const kv = new MemoryKV(); const repo = fresh(); await fill(repo, 2);
    const v = await newVault("blue-tea-42", IT), other = await newVault("blue-tea-42", IT);
    writeVault(kv, { ...v.config, state: "migrating" });
    const foreign = await encryptRecord(other.key, rec("zzz")); await repo.put(foreign);
    await activateInPlace(repo, v.key, kv, { batch: 10 });
    expect((await repo.get("real", "zzz"))!.ct).toBe(foreign.ct);
  });
});

describe("rollback (turn off)", () => {
  it("decrypts in place back to the originals, then removes the vault config", async () => {
    const kv = new MemoryKV(); const repo = fresh(); await fill(repo, 9); const originals = await repo.list("real");
    const v = await newVault("blue-tea-42", IT); writeVault(kv, { ...v.config, state: "migrating" });
    await activateInPlace(repo, v.key, kv, { batch: 4 });
    await deactivateInPlace(repo, v.key, kv, { batch: 4 });
    expect(await repo.list("real")).toEqual(originals); expect(kv.get(VAULT_KEY)).toBeNull(); expect(vaultActive(kv)).toBe(false);
  });
  it("failing half way keeps a mixed readable state and keeps the config", async () => {
    const kv = new MemoryKV(); const repo = fresh(); await fill(repo, 8);
    const v = await newVault("blue-tea-42", IT); writeVault(kv, { ...v.config, state: "migrating" });
    await activateInPlace(repo, v.key, kv, { batch: 4 });
    await expect(deactivateInPlace(repo, v.key, kv, { batch: 3, afterBatch: (d) => { if (d === 3) throw new Error("cut"); } })).rejects.toThrow("cut");
    expect(readVault(kv)!.state).toBe("disabling"); expect(kv.get(VAULT_KEY)).not.toBeNull();
    const mid = await repo.list("real"); expect(mid.some(isEncRecord)).toBe(true); expect(mid.some((r) => !isEncRecord(r))).toBe(true);
    await deactivateInPlace(repo, v.key, kv, { batch: 3 }); expect((await repo.list("real")).some(isEncRecord)).toBe(false); expect(kv.get(VAULT_KEY)).toBeNull();
  });
  it("does not remove the config while a record could not be opened (ciphertext is never dropped)", async () => {
    const kv = new MemoryKV(); const repo = fresh(); await fill(repo, 2);
    const v = await newVault("blue-tea-42", IT), other = await newVault("blue-tea-42", IT); writeVault(kv, { ...v.config, state: "migrating" });
    await activateInPlace(repo, v.key, kv, { batch: 10 }); await repo.put(await encryptRecord(other.key, rec("zzz")));
    await expect(deactivateInPlace(repo, v.key, kv, { batch: 10 })).rejects.toThrow();
    expect(kv.get(VAULT_KEY)).not.toBeNull(); expect((await repo.get("real", "zzz"))!.enc).toBe(1);
  });
});

describe("snapshots, backups, exports never carry plain data or key material while the vault is on", () => {
  const snapOf = async (repo: DexieRepo): Promise<Snapshot> => ({ id: "s1", createdAt: "2026-11-07T00:00:00Z", reason: "manual", demo: await createBackup(repo, "demo"), real: await createBackup(repo, "real") });
  it("the real part is sealed in storage and comes back only with the key", async () => {
    const kv = new MemoryKV(); const v = await newVault("blue-tea-42", IT); writeVault(kv, v.config);
    const inner = new MemorySnapshotRepo(); let key: CryptoKey | null = v.key;
    const wrap = new VaultSnapshotRepo(inner, () => key, () => vaultActive(kv));
    const repo = fresh(); await fill(repo, 3); await wrap.put(await snapOf(repo));
    const [raw] = await inner.list(); expect(raw!.real).toBeNull(); expect(JSON.stringify(raw)).not.toContain("Name r00000");
    expect((await wrap.list())[0]!.real!.count).toBe(3);
    key = null; expect((await wrap.list())[0]!.real).toBeNull(); // locked: never shown
    await expect(wrap.put(await snapOf(repo))).resolves.toBeUndefined(); // stored without the real part, never plain
    expect((await inner.list()).every((s) => s.real === null)).toBe(true);
  });
  it("encrypted backup with a separate passphrase works with vault records read through the key", async () => {
    const { encryptBackup, decryptBackup } = await import("../src/core/cryptoBackup");
    const repo = fresh(); await fill(repo, 2);
    const env = await encryptBackup({ demo: await createBackup(repo, "demo"), real: await createBackup(repo, "real") }, "recovery-pass-1", IT);
    const text = JSON.stringify(env); expect(text).not.toContain("Name r00000");
    expect((await decryptBackup(text, "recovery-pass-1")).real!.count).toBe(2);
  });
  it("CSV of plain in-memory records has no key, wrapper or ciphertext", async () => {
    const v = await newVault("blue-tea-42", IT); const e = await encryptRecord(v.key, rec("a"));
    const ck = new MemoryKV(); grantConsent(ck, "2026-11-07T00:00:00Z");
    const st = new Store(new MemoryKV(), { consentKv: ck }); st.real.put(rec("a"));
    const csv = exportCsv(st, "real"), json = JSON.stringify(exportNamespace(st, "real"));
    expect(csv).toContain("Name a");
    for (const bad of [e.ct!, e.iv!, v.config.wrapped, v.config.salt, "tm:secret:vault"]) { expect(csv).not.toContain(bad); expect(json).not.toContain(bad); }
  });
});

/** A plain Map repo: fake-indexeddb is quadratic in the number of records that share an index value (a test-tool artefact, a browser's B-tree is not), so the 10k run times the vault code itself. */
class MapRepo {
  private m = new Map<string, TMRecord>();
  async list(ns: "demo" | "real") { return [...this.m.values()].filter((r) => r.ns === ns); }
  async get(ns: string, id: string) { return this.m.get(`${ns}:${id}`) ?? null; }
  async put(r: TMRecord) { this.m.set(`${r.ns}:${r.id}`, structuredClone(r)); }
  async delete(ns: string, id: string) { this.m.delete(`${ns}:${id}`); }
  async clear() { this.m.clear(); }
}
describe("speed", () => {
  it("10 000 records migrate and open (timing logged)", async () => {
    const kv = new MemoryKV(); const repo = new MapRepo();
    for (let i = 0; i < 10_000; i++) await repo.put(rec(`r${String(i).padStart(5, "0")}`));
    const v = await newVault("blue-tea-42", IT); writeVault(kv, { ...v.config, state: "migrating" });
    const t0 = performance.now(); await activateInPlace(repo, v.key, kv, { batch: VAULT_BATCH }); const t1 = performance.now();
    const all = await repo.list("real"); for (const r of all) await decryptRecord(v.key, r); const t2 = performance.now();
    console.log(`VAULT-TIMING 10000 records (Map repo, node WebCrypto): migrate ${(t1 - t0).toFixed(0)} ms, open all ${(t2 - t1).toFixed(0)} ms`);
    expect(all.length).toBe(10_000); expect(all.every(isEncRecord)).toBe(true);
  }, 120_000);
  it("1 000 records through fake IndexedDB (reference)", async () => {
    const kv = new MemoryKV(); const repo = fresh(); await fill(repo, 1000);
    const v = await newVault("blue-tea-42", IT); writeVault(kv, { ...v.config, state: "migrating" });
    const t0 = performance.now(); await activateInPlace(repo, v.key, kv); console.log(`VAULT-TIMING 1000 records (fake-indexeddb): ${(performance.now() - t0).toFixed(0)} ms`);
    expect((await repo.list("real")).every(isEncRecord)).toBe(true);
  }, 120_000);
});

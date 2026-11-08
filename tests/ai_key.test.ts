// W1: the AI key. Same store convention as other connection keys; sealed with the existing vault when encryption is on;
// masked (last 4); removable; never in backup, CSV, export, errors or logs.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryKV, Store } from "../src/core/store";
import { VaultSession, newVault, writeVault } from "../src/core/dataVault";
import { secretKey } from "../src/core/connections";
import { hasAiKey, maskedAiKey, readAiKey, removeAiKey, saveAiKey, sealAiKeyIfNeeded } from "../src/core/aiKey";
import { grantConsent } from "../src/core/consent";
import { createBackup } from "../src/core/backup";
import { exportNamespace } from "../src/core/export";
import { exportCsv } from "../src/core/csv";
import { encryptBackup, decryptBackup } from "../src/core/cryptoBackup";
import { StoreRepo } from "../src/adapters/storeRepo";
import { FACILITY_IDS } from "../src/core/ports";
import type { TMRecord } from "../src/core/types";

const SENTINEL = "KEY-SENTINEL-9999";
let kv: MemoryKV, session: VaultSession;
beforeEach(() => { kv = new MemoryKV(); session = new VaultSession(kv); });
async function vaultOn() { const { config, key } = await newVault("a-long-passphrase", 1000); writeVault(kv, config); session.setKey(key); return key; }

describe("save, read, mask, remove", () => {
  it("stores under the connection secret key; reads back; masks to the last 4", async () => {
    expect(await saveAiKey(kv, session, SENTINEL)).toEqual({ ok: true });
    expect(kv.get(secretKey("aiAssistant"))).toBe(SENTINEL); expect(secretKey("aiAssistant")).toBe("tm:secret:conn:aiAssistant");
    expect(await readAiKey(kv, session)).toEqual({ ok: true, key: SENTINEL });
    expect(await maskedAiKey(kv, session)).toBe("••••9999");
    removeAiKey(kv); expect(hasAiKey(kv)).toBe(false); expect(await readAiKey(kv, session)).toEqual({ ok: false, reason: "none" }); expect(await maskedAiKey(kv, session)).toBeNull();
  });
  it("refuses cards, passwords, spaces and short text; nothing is saved", async () => {
    for (const bad of ["4111111111111111", "password:hunter2hunter2", "has a space inside", "short"]) expect((await saveAiKey(kv, session, bad)).ok).toBe(false);
    expect(kv.keys()).toEqual([]);
  });
  it("the facility list is unchanged", () => { expect([...FACILITY_IDS]).toEqual(["aiAssistant", "cloudSync", "webSearch", "licensedContent"]); });
});

describe("vault wrap (existing vault functions)", () => {
  it("with encryption on the stored string does not contain the key; it reads back while open", async () => {
    await vaultOn();
    expect(await saveAiKey(kv, session, SENTINEL)).toEqual({ ok: true });
    const stored = kv.get(secretKey("aiAssistant"))!;
    expect(stored).not.toContain(SENTINEL); expect(JSON.parse(stored)).toMatchObject({ enc: 1 });
    expect(JSON.stringify(kv.keys().map((k) => kv.get(k)))).not.toContain(SENTINEL);
    expect(await readAiKey(kv, session)).toEqual({ ok: true, key: SENTINEL }); expect(await maskedAiKey(kv, session)).toBe("••••9999");
  });
  it("locked: no read, no save, mask shows dots only", async () => {
    await vaultOn(); await saveAiKey(kv, session, SENTINEL); session.lock();
    expect(await readAiKey(kv, session)).toEqual({ ok: false, reason: "locked" });
    expect(await saveAiKey(kv, session, "ANOTHER-KEY-12345")).toEqual({ ok: false, problem: "locked" });
    expect(await maskedAiKey(kv, session)).toBe("••••••••");
  });
  it("a key saved before encryption was turned on is sealed once the vault is open", async () => {
    await saveAiKey(kv, session, SENTINEL); expect(kv.get(secretKey("aiAssistant"))).toBe(SENTINEL);
    await vaultOn(); expect(await sealAiKeyIfNeeded(kv, session)).toBe(true);
    expect(kv.get(secretKey("aiAssistant"))).not.toContain(SENTINEL); expect(await readAiKey(kv, session)).toEqual({ ok: true, key: SENTINEL });
    expect(await sealAiKeyIfNeeded(kv, session)).toBe(false);
  });
});

describe("the key never leaves", () => {
  const rec = (ns: "demo" | "real"): TMRecord => ({ id: `t-${ns}`, entity: "task", ns, ownerId: "o", schemaVersion: 1, createdAt: "2026-11-08T00:00:00Z", values: { "task.title": { state: "value", value: "x", label: ns === "demo" ? "DEMO" : "FACT" } } });
  it("is absent from backup, export, CSV, encrypted bundle and record stores", async () => {
    const consentKv = new MemoryKV(); const store = new Store(kv, { consentKv }); grantConsent(consentKv, "2026-11-08T00:00:00Z");
    await saveAiKey(kv, session, SENTINEL); store.demo.put(rec("demo")); store.real.put(rec("real"));
    const repo = new StoreRepo(store); const demo = await createBackup(repo, "demo"), real = await createBackup(repo, "real");
    const all = JSON.stringify([demo, real, exportNamespace(store, "demo"), exportNamespace(store, "real"), exportCsv(store, "demo"), exportCsv(store, "real"), store.demo.list(), store.real.list()]);
    expect(all).not.toContain(SENTINEL);
    expect(JSON.stringify(await decryptBackup(JSON.stringify(await encryptBackup({ demo, real }, "a-long-passphrase", 1000)), "a-long-passphrase"))).not.toContain(SENTINEL);
    expect(kv.keys().filter((k) => /^tm:(demo|real):/.test(k) && kv.get(k)!.includes(SENTINEL))).toEqual([]);
  });
  it("error strings from saving or reading do not contain it", async () => {
    await vaultOn(); await saveAiKey(kv, session, SENTINEL); session.lock();
    const outs = [await saveAiKey(kv, session, SENTINEL), await readAiKey(kv, session), await maskedAiKey(kv, session)];
    expect(JSON.stringify(outs)).not.toContain(SENTINEL);
  });
});

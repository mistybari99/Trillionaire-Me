// Forgot-passphrase recovery says what it would throw away before it replaces anything; plain exports never carry key material or ciphertext.
import "fake-indexeddb/auto";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../src/app";
import { DexieRepo } from "../src/adapters/dexie";
import { StoreRepo } from "../src/adapters/storeRepo";
import { consentKv, store, flushStorage, vault, closeVault, vaultRepo } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import { activateInPlace, isEncRecord, newVault, readVault, recoveryImpact, writeVault, encryptRecord, VAULT_KEY } from "../src/core/dataVault";
import { createBackup } from "../src/core/backup";
import { encryptBackup } from "../src/core/cryptoBackup";
import { buildSnapshotFile } from "../src/core/snapshots";
import { exportCsv } from "../src/core/csv";
import { exportNamespace } from "../src/core/export";
import type { TMRecord } from "../src/core/types";

vi.setConfig({ testTimeout: 180_000 });
// vi.waitFor defaults to 1 s; steps with 600 000-round PBKDF2 can exceed that on a busy CPU.
const wf = (fn: () => unknown) => vi.waitFor(fn, { timeout: 90_000, interval: 25 });
const NOW = "2026-11-07T10:00:00.000Z";
const real = (id: string): TMRecord => ({ id, entity: "goal", ns: "real", ownerId: "owner", schemaVersion: 3, createdAt: NOW, values: { "goal.title": { state: "value", value: `Secret ${id}`, label: "FACT" } } });
const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const click = (s: string) => { const el = q<HTMLElement>(s); expect(el, s).toBeTruthy(); el.click(); };
const type = (s: string, v: string) => { q<HTMLInputElement>(s).value = v; };
const tick = (s: string) => { q<HTMLInputElement>(s).checked = true; };
const go = (hash: string) => { location.hash = hash; render(); };
const raw = () => new DexieRepo("tm-db", true).list("real");
const downloads: string[] = [];

beforeAll(() => {
  window.addEventListener("hashchange", () => render());
  (URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL = () => "blob:test";
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) { downloads.push(this.download); };
});
beforeEach(async () => {
  closeVault(); localStorage.clear(); store.demo.clear(); store.real.clear(); await flushStorage().catch(() => undefined);
  for (const r of await raw()) await new DexieRepo("tm-db", true).delete("real", r.id);
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "real");
  grantConsent(consentKv, NOW); downloads.length = 0;
});

describe("recoveryImpact (core)", () => {
  it("counts stored entries the file does not hold; zero when everything is in it", async () => {
    const repo = new DexieRepo("ri1", true); const v = await newVault("blue-tea-42", 1000);
    await repo.put(await encryptRecord(v.key, real("a"))); await repo.put(await encryptRecord(v.key, real("b"))); await repo.put(real("c"));
    expect(await recoveryImpact(repo, ["a"])).toMatchObject({ inFile: 1, lost: 2, lostSealed: 1 });
    expect((await recoveryImpact(repo, ["a"])).readable.map((r) => r.id)).toEqual(["c"]);
    expect(await recoveryImpact(repo, ["a", "b", "c", "zzz"])).toMatchObject({ lost: 0, lostSealed: 0, readable: [] });
  });
});

describe("unlock screen: forgot the passphrase", () => {
  async function lockedPhoneWithNewerEntries() {
    store.real.put(real("g1")); await flushStorage();
    const v = await newVault("blue-tea-42", 1000); writeVault(consentKv, { ...v.config, state: "migrating" }); vault.setKey(v.key);
    const r = new StoreRepo(store);
    const text = JSON.stringify(await encryptBackup({ demo: await createBackup(r, "demo"), real: await createBackup(r, "real") }, "recovery-pass-9", 1000));
    store.real.put(real("g2")); await flushStorage(); // created AFTER the recovery file was made
    await activateInPlace(vaultRepo!, v.key, consentKv);
    return { v, text };
  }
  const openForgot = async (text: string) => {
    closeVault(); go("#/today"); await new Promise((r) => setTimeout(r, 50)); // location.hash fires its own async hashchange; let it settle
    expect(q("[data-vault-screen]")).toBeTruthy();
    for (let i = 0; i < 2 && !q("#vault-rf"); i++) { click("[data-act=vault-forgot]"); await new Promise((r) => setTimeout(r, 50)); }
    Object.defineProperty(q("#vault-rf"), "files", { value: [{ text: async () => text }], configurable: true });
    type("#vault-rfp", "recovery-pass-9"); click("[data-act=vault-forgot-check]");
  };

  it("shows how many entries are NOT in the file, needs a second tick naming the number, offers to save readable ones, and changes nothing before both ticks", async () => {
    const { text } = await lockedPhoneWithNewerEntries();
    await vaultRepo!.put(real("g3")); // a plain, readable entry (half-finished state)
    await openForgot(text);
    await wf(() => expect(q("[data-vault=forgot-lost]")).toBeTruthy());
    expect(q("[data-vault=forgot-lost]").textContent).toMatch(/2 entries on this phone are NOT in the recovery file/);
    expect(q("[data-vault=msg], [data-vault=forgot-msg]").textContent).toMatch(/file holds 1 real entries/);
    expect(q("label[for=vault-forgot-tick2]").textContent).toMatch(/2 entries will be gone/);
    expect(q("[data-act=vault-forgot-export]").textContent).toMatch(/Save the 1 readable entries first/);
    click("[data-act=vault-forgot-export]"); expect(downloads.at(-1)).toMatch(/^tm-readable-entries-/);
    tick("#vault-forgot-tick"); click("[data-act=vault-forgot-go]"); // second tick missing
    expect(q("[data-vault=forgot-msg]").textContent).toMatch(/Tick the box/);
    expect((await raw()).map((r) => r.id).sort()).toEqual(["g1", "g2", "g3"]); expect(readVault(consentKv)).not.toBeNull();
    tick("#vault-forgot-tick2"); click("[data-act=vault-forgot-go]");
    await wf(() => expect(readVault(consentKv)).toBeNull());
    const after = await raw(); expect(after.map((r) => r.id)).toEqual(["g1"]); expect(after.some(isEncRecord)).toBe(false);
  });

  it("says nothing extra and needs one tick when every stored entry is in the file", async () => {
    store.real.put(real("g1")); await flushStorage();
    const v = await newVault("blue-tea-42", 1000); writeVault(consentKv, { ...v.config, state: "migrating" }); vault.setKey(v.key);
    const r = new StoreRepo(store);
    const text = JSON.stringify(await encryptBackup({ demo: await createBackup(r, "demo"), real: await createBackup(r, "real") }, "recovery-pass-9", 1000));
    await activateInPlace(vaultRepo!, v.key, consentKv);
    await openForgot(text);
    await wf(() => expect(q("[data-vault=forgot-confirm] [data-act=vault-forgot-go]")).toBeTruthy());
    expect(q("[data-vault=forgot-lost]")).toBeFalsy(); expect(q("#vault-forgot-tick2")).toBeFalsy();
    tick("#vault-forgot-tick"); click("[data-act=vault-forgot-go]");
    await wf(() => expect(readVault(consentKv)).toBeNull());
    expect((await raw()).map((x) => x.id)).toEqual(["g1"]);
  });
});

describe("plain exports never carry the data key, the wrapper or a ciphertext", () => {
  it("snapshot file, JSON backup, CSV and namespace export while the vault is on", async () => {
    store.real.put(real("g1")); store.real.put(real("g2")); await flushStorage();
    const v = await newVault("blue-tea-42", 1000); writeVault(consentKv, { ...v.config, state: "migrating" }); vault.setKey(v.key);
    await activateInPlace(vaultRepo!, v.key, consentKv);
    const sealed = await raw(); expect(sealed.every(isEncRecord)).toBe(true);
    const r = new StoreRepo(store);
    const outputs = [JSON.stringify(await buildSnapshotFile(r, true)), JSON.stringify(await createBackup(r, "real")), JSON.stringify(await createBackup(r, "demo")), exportCsv(store, "real"), JSON.stringify(exportNamespace(store, "real"))];
    expect(outputs[0]).toContain("Secret g1"); // plain on purpose: an explicit user action, with the note shown
    const cfg = readVault(consentKv)!; const secrets = [...sealed.flatMap((x) => [x.ct!, x.iv!]), cfg.wrapped, cfg.salt, cfg.iv, VAULT_KEY, "blue-tea-42"];
    for (const o of outputs) { for (const bad of secrets) expect(o.includes(bad), bad.slice(0, 12)).toBe(false); expect(/"enc":\s*1/.test(o)).toBe(false); }
  });
});

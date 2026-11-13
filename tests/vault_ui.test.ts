// At-rest encryption screens: Settings > Privacy card (Off, Turning on, On, Locked, Turn off), the unlock screen, forced failure, and wiring (registry, safety box, crossTab, notes).
import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../src/app";
import { DexieRepo } from "../src/adapters/dexie";
import { consentKv, store, flushStorage, vault, closeVault, snapshotRepo } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import { isEncRecord, readVault, VAULT_KEY, encryptRecord, newVault, writeVault } from "../src/core/dataVault";
import { rowById, ROWS } from "../src/ui/settingsRegistry";
import { isWatchedChange } from "../src/ui/crossTab";
import type { TMRecord } from "../src/core/types";

vi.setConfig({ testTimeout: 180_000 });
// Root cause of the load flake: vi.waitFor defaults to a 1 s timeout, but these steps run PBKDF2 with 600 000 rounds (twice for the recovery file), which exceeds 1 s on a busy CPU.
const wf = (fn: () => unknown, o: { timeout?: number } = {}) => vi.waitFor(fn, { timeout: 90_000, interval: 25, ...o });
const NOW = "2026-11-07T10:00:00.000Z";
const real = (id: string): TMRecord => ({ id, entity: "goal", ns: "real", ownerId: "owner", schemaVersion: 3, createdAt: NOW, values: { "goal.title": { state: "value", value: `Secret ${id}`, label: "FACT" } } });
const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const click = (s: string) => { const el = q<HTMLElement>(s); expect(el, s).toBeTruthy(); el.click(); };
const type = (s: string, v: string) => { const el = q<HTMLInputElement>(s); expect(el, s).toBeTruthy(); el.value = v; };
const tick = (s: string) => { const el = q<HTMLInputElement>(s); el.checked = true; };
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

describe("registry and wiring", () => {
  it("has the Privacy row, owns the secret key, and the key is watched across tabs", () => {
    expect(rowById("vault")?.cat).toBe("privacy"); expect(rowById("vault")?.keys).toContain(VAULT_KEY);
    expect(ROWS.filter((r) => r.id === "vault").length).toBe(1);
    expect(isWatchedChange(VAULT_KEY)).toBe(true);
  });
  it("the Safety box links to the card", () => {
    go("#/more/safety"); const a = q<HTMLAnchorElement>("[data-safety-vault] a"); expect(a.getAttribute("href")).toBe("#/settings/privacy/vault");
  });
  it("EN, BN and Mix text exist for every vault key, Latin digits, plain warning present", async () => {
    const { PACKS } = await import("../src/i18n/packs"); const { VAULT_EN } = await import("../src/i18n/vault");
    for (const k of Object.keys(VAULT_EN)) for (const l of ["en", "bn", "mix"] as const) { const s = (PACKS[l] as Record<string, string>)[k]; expect(s, `${l}:${k}`).toBeTruthy(); expect(/[০-৯]/.test(s!)).toBe(false); }
    expect(PACKS.en["vault.warn" as keyof typeof PACKS.en]).toMatch(/lose both the passphrase and the recovery file, nobody can get your data back/);
  });
});

describe("the card: off, warning, recovery file, second tick, turning on, on, locked, unlock, turn off", () => {
  it("full path with the real data staying readable and sealed in storage", async () => {
    store.real.put(real("g1")); store.real.put(real("g2")); await flushStorage();
    expect((await raw()).some(isEncRecord)).toBe(false);
    go("#/settings/privacy/vault");
    expect(q("[data-card=vault]").getAttribute("data-vault-state")).toBe("off");
    click("[data-act=vault-start]");
    expect(q("[data-vault=warning]").textContent).toMatch(/nobody can get your data back/);
    click("[data-act=vault-next]"); expect(q("[data-vault=msg]").textContent).toMatch(/Tick the box/); // needs the first tick
    tick("#vault-tick1"); click("[data-act=vault-next]");
    // weak passphrases are refused with a plain message
    type("#vault-pass", "12345678"); type("#vault-pass2", "12345678"); type("#vault-rec", "recovery-pass-9"); type("#vault-rec2", "recovery-pass-9");
    click("[data-act=vault-save-recovery]"); await wf(() => expect(q("[data-vault=msg]").textContent).toMatch(/only is too easy|Digits only/i));
    expect(downloads.length).toBe(0); expect(readVault(consentKv)).toBeNull();
    type("#vault-pass", "blue-tea-42"); type("#vault-pass2", "blue-tea-42"); type("#vault-rec", "blue-tea-42"); type("#vault-rec2", "blue-tea-42");
    click("[data-act=vault-save-recovery]"); await wf(() => expect(q("[data-vault=msg]").textContent).toMatch(/different/));
    type("#vault-pass", "blue-tea-42"); type("#vault-pass2", "blue-tea-42"); type("#vault-rec", "recovery-pass-9"); type("#vault-rec2", "recovery-pass-9");
    click("[data-act=vault-save-recovery]"); await wf(() => expect(downloads.length).toBe(1));
    expect(downloads[0]).toMatch(/^tm-recovery-/);
    await wf(() => expect(q("[data-act=vault-go]")).toBeTruthy());
    expect(readVault(consentKv)).toBeNull(); // nothing changed yet: the second tick comes first
    click("[data-act=vault-go]"); expect(q("[data-vault=msg]").textContent).toMatch(/Tick the box/); expect(readVault(consentKv)).toBeNull();
    tick("#vault-tick2"); click("[data-act=vault-go]");
    await wf(() => expect(readVault(consentKv)?.state).toBe("on"));
    await wf(() => expect(q("[data-card=vault]").getAttribute("data-vault-state")).toBe("on"));
    const stored = await raw(); expect(stored.length).toBe(2); expect(stored.every(isEncRecord)).toBe(true); expect(JSON.stringify(stored)).not.toContain("Secret g1");
    expect(store.real.get("g1")!.values["goal.title"]).toMatchObject({ value: "Secret g1" }); // screens keep the plain sync store
    // the safety copy before encryption is sealed
    const snaps = await (await import("../src/ui/state")).rawSnapshotRepo!.list(); expect(snaps.some((s) => s.reason === "before_migrate")).toBe(true);
    expect(JSON.stringify(snaps)).not.toContain("Secret g1");
    // Lock now: the unlock screen replaces the app and no real record stays in memory
    click("[data-act=vault-lock]"); expect(q("[data-vault-screen]")).toBeTruthy(); expect(store.real.list()).toEqual([]);
    type("#vault-unlock-pass", "wrong-pass-11"); click("[data-act=vault-unlock]");
    await wf(() => expect(q("[data-vault=unlock-msg]").textContent).toMatch(/not right/));
    expect(store.real.list()).toEqual([]); expect((await raw()).every(isEncRecord)).toBe(true); // data untouched
    type("#vault-unlock-pass", "blue-tea-42"); click("[data-act=vault-unlock]");
    await wf(() => expect(q("[data-vault-screen]")).toBeFalsy());
    expect(store.real.list().length).toBe(2);
    // Turn off: needs the passphrase, opens in place, removes the settings
    go("#/settings/privacy/vault"); click("[data-act=vault-off]"); type("#vault-off-pass", "wrong-pass-11"); click("[data-act=vault-off-go]");
    await wf(() => expect(q("[data-vault=msg]").textContent).toMatch(/not right/)); expect(readVault(consentKv)).not.toBeNull();
    type("#vault-off-pass", "blue-tea-42"); click("[data-act=vault-off-go]");
    await wf(() => expect(readVault(consentKv)).toBeNull());
    const after = await raw(); expect(after.length).toBe(2); expect(after.some(isEncRecord)).toBe(false);
    expect((await snapshotRepo!.list()).every((s) => !("realEnc" in s))).toBe(true);
  });

  it("forced failure while turning on: the state stays readable, the card offers to continue or turn off", async () => {
    store.real.put(real("g1")); store.real.put(real("g2")); await flushStorage();
    const v = await newVault("blue-tea-42", 1000); writeVault(consentKv, { ...v.config, state: "migrating" }); vault.setKey(v.key);
    const repo = new DexieRepo("tm-db", true); await repo.put(await encryptRecord(v.key, real("g1"))); // half way: one sealed, one plain
    go("#/settings/privacy/vault");
    expect(q("[data-card=vault]").getAttribute("data-vault-state")).toBe("turning"); expect(q("[data-act=vault-resume]")).toBeTruthy(); expect(q("[data-act=vault-off]")).toBeTruthy();
    expect(store.real.get("g2")!.values["goal.title"]).toMatchObject({ value: "Secret g2" });
    click("[data-act=vault-resume]"); await wf(() => expect(readVault(consentKv)?.state).toBe("on"));
    expect((await raw()).every(isEncRecord)).toBe(true);
  });

  it("without IndexedDB support the card says so (checked through the text)", () => {
    expect(readFileSync("src/i18n/vault.ts", "utf8")).toContain("vault.unavailable");
  });
});

describe("exports carry a plain-file note while the vault is on", () => {
  it("CSV card shows the note only with the vault on", async () => {
    go("#/settings/backup/csv"); expect(q("[data-vault=plain-note]")).toBeFalsy();
    const v = await newVault("blue-tea-42", 1000); writeVault(consentKv, { ...v.config, state: "on" }); vault.setKey(v.key);
    go("#/settings/backup/csv"); expect(q("[data-vault=plain-note]").textContent).toMatch(/not encrypted/);
  });
});

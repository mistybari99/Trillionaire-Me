// Settings redesign PR 3b: Privacy & lock. One consent gate, live read-out, Withdraw, lock-screen Show asks first.
import "fake-indexeddb/auto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { consentKv, prefs, store } from "../src/ui/state";
import { grantConsent, readConsent, revokeConsent } from "../src/core/consent";
import { setPin } from "../src/core/appLock";
import { StoreError } from "../src/core/store";
import { saveTyped, putMode } from "../src/ui/entry";
import { restoreBackupAtomic, RealPermissionError } from "../src/core/restore";
import { createBackup } from "../src/core/backup";
import { MemorySnapshotRepo } from "../src/core/snapshots";
import { StoreRepo } from "../src/adapters/storeRepo";
import { Store, MemoryKV } from "../src/core/store";
import type { FieldValue, TMRecord } from "../src/core/types";

const NOW = "2026-10-26T10:00:00.000Z";
const real = (id: string): TMRecord => ({ id, entity: "goal", ns: "real", ownerId: "owner", schemaVersion: 1, createdAt: NOW, values: { "goal.title": { state: "value", value: id, label: "FACT" } as FieldValue } });
const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const go = (hash: string) => { location.hash = hash; render(); };
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = `${d}/${f}`; return statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") ? [p] : []; });

beforeEach(() => {
  localStorage.clear(); store.demo.clear(); store.real.clear(); revokeConsent(consentKv);
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
});

describe("single consent source", () => {
  it("grantConsent is called from one place in the UI, and the consent sentence exists once", () => {
    const sites = walk("src/ui").filter((f) => /\bgrantConsent\(/.test(readFileSync(f, "utf8")));
    expect(sites).toEqual(["src/ui/consentGate.ts"]);
    const src = readFileSync("src/i18n/packs.ts", "utf8");
    expect(src.match(/"data\.consent\.p1": "Your real data stays on this phone only\."/g)?.length).toBe(1);
  });
  it("the gate on Privacy and the gate on the Data page are the same component and need the tick", () => {
    go("#/settings/privacy"); expect(q("[data-consent=real]")).not.toBeNull();
    q<HTMLButtonElement>("[data-act=consent]").click(); render(); expect(readConsent(consentKv)).toBe(false); expect(q(".err")?.textContent).toMatch(/Tick/);
    q<HTMLInputElement>("#consent-tick").checked = true; q<HTMLButtonElement>("[data-act=consent]").click(); expect(readConsent(consentKv)).toBe(true);
    go("#/settings/data"); expect(app().querySelector("[data-consent=real]")).toBeNull();
  });
});

describe("live read-out", () => {
  it("each line is computed from state in every combination", async () => {
    go("#/settings/privacy"); const line = (id: string) => q(`[data-priv-line=${id}]`).textContent!;
    expect(line("consent")).toMatch(/not allowed/); expect(line("applock")).toMatch(/off/); expect(line("lockscreen")).toMatch(/nothing shown/); expect(line("connections")).toMatch(/0 of 4 on\. Nothing leaves this phone/);
    grantConsent(consentKv, NOW); await setPin(consentKv, "4821", "4821", 1000); prefs.notifyShow = { health: true, financial: true }; go("#/settings/privacy");
    expect(line("consent")).toMatch(/allowed since 2026-10-26/); expect(line("applock")).toMatch(/App lock: on/); expect(line("lockscreen")).toMatch(/shows: Health.*Financial|shows: Financial.*Health/);
  });
  it("the weaker state is plain: a Turn on link, no warning styling or alert role", () => {
    go("#/settings/privacy"); const li = q("[data-priv-line=consent]"); expect(li.textContent).toMatch(/Turn on/); expect(li.querySelector("[role=alert], .err")).toBeNull();
  });
});

describe("Withdraw", () => {
  it("revokes only the permission: nothing is deleted, new real writes and imports are refused, Today shows a calm paused card", async () => {
    grantConsent(consentKv, NOW); localStorage.setItem("tm:ui:dataMode", "real"); store.real.put(real("r1")); store.real.put(real("r2")); go("#/settings/privacy");
    expect(q("[data-priv=consent-on]").textContent).toMatch(/Allowed since 2026-10-26/); q<HTMLButtonElement>("[data-act=withdraw-consent]").click(); render();
    expect(readConsent(consentKv)).toBe(false); expect(store.real.list().length).toBe(2);
    expect(q("[data-priv=withdrawn]").textContent).toBe("Permission withdrawn. Your 2 real entries are still on this phone.");
    expect(() => store.real.put(real("r3"))).toThrow(StoreError);
    expect(saveTyped({ id: "x", entity: "goal", createdAt: NOW, values: {} })).toBe(false); // entry forms
    expect(putMode({ ...real("y"), ns: "demo" } as TMRecord)).toBe(false);                    // app-made records
    const src = new Store(new MemoryKV(), { consentKv: (() => { const k = new MemoryKV(); grantConsent(k, NOW); return k; })() }); src.real.put(real("z"));
    await expect(restoreBackupAtomic(new StoreRepo(store), new MemorySnapshotRepo(), { demo: null, real: await createBackup(new StoreRepo(src), "real"), createdAt: NOW }, readConsent(consentKv))).rejects.toBeInstanceOf(RealPermissionError);
    expect(store.real.list().length).toBe(2);
    go("#/today"); expect(q("[data-paused]").textContent).toMatch(/Real data is paused/); expect(q("[data-paused]").querySelector(".err")).toBeNull();
  });
  it("allowing it again brings the same entries back into use", () => {
    grantConsent(consentKv, NOW); store.real.put(real("r1")); revokeConsent(consentKv); go("#/settings/privacy");
    q<HTMLInputElement>("#consent-tick").checked = true; q<HTMLButtonElement>("[data-act=consent]").click(); expect(readConsent(consentKv)).toBe(true); expect(store.real.list().map((r) => r.id)).toEqual(["r1"]);
  });
});

describe("lock screen details and app lock", () => {
  it("Show asks one calm line first; Cancel changes nothing; Hide is one tap", () => {
    go("#/settings/privacy"); const row = () => q("[data-lock-cat=worship]");
    [...row().querySelectorAll("button")].find((b) => b.textContent === "Show details")!.click(); render();
    expect(q("[data-lock-ask=worship]").textContent).toMatch(/Anyone holding your phone can read this/); expect(prefs.notifyShow).toEqual({});
    q<HTMLButtonElement>("[data-act=lock-show-no]").click(); render(); expect(prefs.notifyShow).toEqual({}); expect(app().querySelector("[data-lock-ask]")).toBeNull();
    prefs.notifyShow = { worship: true }; go("#/settings/privacy"); [...row().querySelectorAll("button")].find((b) => b.textContent === "Hide")!.click(); expect(prefs.notifyShow).toEqual({});
  });
  it("app lock card and the forgot-PIN help line live here; More no longer holds these controls", () => {
    go("#/settings/privacy"); expect(q("[data-card=applock]")).not.toBeNull(); expect(q("[data-priv=forgot]").textContent).toMatch(/Only the PIN is removed. Your data is never deleted/);
    go("#/settings"); expect(app().querySelector("[data-lock-settings]")).toBeNull(); go("#/settings/data"); expect(app().querySelector("[data-card=applock]")).toBeNull();
  });
  it("Settings never reads or shows the PIN data", async () => {
    await setPin(consentKv, "4821", "4821", 1000); go("#/settings/privacy"); const html = app().innerHTML; expect(html).not.toMatch(/tm:secret|salt|hash/i);
  });
});

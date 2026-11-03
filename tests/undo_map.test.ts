// SET-R.09 (plan tracker G3-03): ONE test for the whole undo map of docs/design/settings-final-decision.md section 3.5.
// Each row: the way back exists in the real screen, it works, and the screen says so in en, bn and mix.
//   Look/layout -> change back or "Reset look & layout"      CSV import -> "Undo last import"        Restore -> Go back (7 days)
//   Delete demo -> none after confirm (a demo copy is offered)   Clear real -> none, stated          Remove lock -> set again
//   Withdraw consent -> allow again, data untouched          Withdraw connection -> approve again
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { consentKv, prefs, snapshotRepo, store } from "../src/ui/state";
import { grantConsent, readConsent, revokeConsent } from "../src/core/consent";
import { lockEnabled, setPin } from "../src/core/appLock";
import { grantApproval, isApproved, withdrawApproval } from "../src/core/connections";
import { StoreRepo } from "../src/adapters/storeRepo";
import { takeSnapshot } from "../src/core/snapshots";
import { applyImport, planImport, undoImport } from "../src/core/csvImport";
import { exportCsv } from "../src/core/csv";
import { MemoryKV, Store } from "../src/core/store";
import { preloadLazy } from "../src/ui/lazy";
import { FACILITY_IDS } from "../src/core/ports";
import { PACKS, type Key } from "../src/i18n/packs";
import type { FieldValue, Namespace, TMRecord } from "../src/core/types";

const NOW = "2026-10-26T10:00:00.000Z";
const rec = (ns: Namespace, id: string): TMRecord => ({ id, entity: "goal", ns, ownerId: ns === "demo" ? "demo-user" : "owner", schemaVersion: 1, createdAt: NOW, values: { "goal.title": { state: "value", value: `T-${id}`, label: ns === "demo" ? "DEMO" : "FACT" } as FieldValue } });
const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const go = (hash: string) => { location.hash = hash; render(); };
const settle = (ms = 80) => new Promise((r) => setTimeout(r, ms));
const wait = async (fn: () => boolean) => { for (let i = 0; i < 300 && !fn(); i++) await new Promise((r) => setTimeout(r, 10)); };
const said = (k: Key) => { for (const l of ["en", "bn", "mix"] as const) expect((PACKS[l] as Record<string, string>)[k], `${l}:${k}`).toBeTruthy(); };

beforeEach(async () => {
  await preloadLazy(); localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear(); revokeConsent(consentKv);
  for (const x of await snapshotRepo!.list()) await snapshotRepo!.delete(x.id);
  for (const id of FACILITY_IDS) withdrawApproval(consentKv, id);
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
});

describe("undo map (settings final decision 3.5)", () => {
  it("1 Look/layout: change back by hand, or Reset look & layout", () => {
    prefs.design = "emerald-obsidian"; expect(localStorage.getItem("tm:ui:design")).toBe("emerald-obsidian"); prefs.design = "light-futuristic"; expect(prefs.design).toBe("light-futuristic");
    localStorage.setItem("tm:ui:design", "broadsheet"); go("#/settings/look");
    q<HTMLButtonElement>("[data-act=reset-look]").click(); render(); q<HTMLButtonElement>("[data-act=reset-look-yes]").click(); render();
    expect(localStorage.getItem("tm:ui:design")).toBeNull(); expect(q("[data-look=reset-done]")).not.toBeNull(); said("look.reset.done");
  });
  it("2 CSV import: Undo last import removes exactly the imported records", () => {
    const src = new Store(new MemoryKV(), { consentKv: (() => { const k = new MemoryKV(); grantConsent(k, NOW); return k; })() }); src.real.put(rec("real", "a")); src.real.put(rec("real", "b"));
    const csv = exportCsv(src, "real"); const ck = new MemoryKV(); grantConsent(ck, NOW); const dst = new Store(new MemoryKV(), { consentKv: ck }); const bk = new MemoryKV(); dst.real.put(rec("real", "keep"));
    const plan = planImport(csv, dst); expect(plan.errors).toEqual([]); expect(applyImport(dst, plan, ck, bk, "owner")).toMatchObject({ ok: true, added: 2 });
    expect(dst.real.list().length).toBe(3); expect(undoImport(dst, bk)).toBe(2); expect(dst.real.list().map((r) => r.id)).toEqual(["keep"]);
    said("imp.undo"); said("imp.undone");
  });
  it("3 Restore: Go back brings the earlier data back, and the screen says it is kept 7 days", async () => {
    store.demo.put(rec("demo", "x")); const s = await takeSnapshot(new StoreRepo(store), snapshotRepo!, { reason: "manual", keep: 5, realOk: false }); expect(s).not.toBeNull();
    store.demo.put(rec("demo", "later")); go("#/settings/backup/restore"); await settle(); q<HTMLButtonElement>("[data-act=snap-restore]").click(); await wait(() => !!q("[data-restore=preview]"));
    q<HTMLButtonElement>("[data-act=snap-confirm]").click(); await wait(() => store.demo.list().length === 1); expect(store.demo.list().map((r) => r.id)).toEqual(["x"]);
    render(); expect(q("[data-restore=result] .muted").textContent).toMatch(/7 days/); q<HTMLButtonElement>("[data-act=restore-goback]").click(); await wait(() => store.demo.list().length === 2);
    expect(store.demo.list().map((r) => r.id).sort()).toEqual(["later", "x"]); said("restore.goBack.note");
  });
  it("4 Delete demo: no undo after the confirm, and the page says so and offers a demo copy first", async () => {
    store.demo.put(rec("demo", "d1")); go("#/settings/delete"); expect(q("[data-card=delete-demo], main").textContent).toMatch(/No undo after you confirm/);
    expect(q("[data-act=clear-demo]")).not.toBeNull(); said("del.demo.goes"); said("del.demo.copy");
    q<HTMLButtonElement>("[data-act=clear-demo]").click(); render(); expect(store.demo.list().length).toBe(1); // asking changes nothing
    expect(q("[data-act=clear-demo-no]")).not.toBeNull(); q<HTMLButtonElement>("[data-act=clear-demo-yes]").click(); expect(store.demo.list().length).toBe(0);
  });
  it("5 Clear real: no undo, stated on the page, and a backup link comes first", () => {
    grantConsent(consentKv, NOW); store.real.put(rec("real", "r1")); go("#/settings/delete");
    expect(app().textContent).toMatch(/No undo\./); expect(q("[data-act=delete-real-backup]").getAttribute("href")).toBe("#/settings/backup"); said("del.real.goes");
  });
  it("6 Remove lock: turn it off with the PIN, set it again any time", async () => {
    await setPin(consentKv, "4821", "4821", 1000); expect(lockEnabled(consentKv)).toBe(true); go("#/settings/privacy");
    q<HTMLInputElement>("#lock-off-pin").value = "4821"; q<HTMLButtonElement>("[data-act=lock-off]").click(); await wait(() => !lockEnabled(consentKv)); expect(lockEnabled(consentKv)).toBe(false);
    await setPin(consentKv, "1357", "1357", 1000); expect(lockEnabled(consentKv)).toBe(true); said("lock.off");
  });
  it("7 Withdraw consent: allow again, and the data stays untouched in between", () => {
    grantConsent(consentKv, NOW); store.real.put(rec("real", "r1")); store.real.put(rec("real", "r2")); localStorage.setItem("tm:ui:dataMode", "real"); go("#/settings/privacy");
    q<HTMLButtonElement>("[data-act=withdraw-consent]").click(); render(); expect(readConsent(consentKv)).toBe(false); expect(store.real.list().length).toBe(2);
    grantConsent(consentKv, NOW); expect(readConsent(consentKv)).toBe(true); expect(store.real.list().map((r) => r.id).sort()).toEqual(["r1", "r2"]);
  });
  it("8 Withdraw connection: approve again", () => {
    grantApproval(consentKv, "webSearch", NOW); go("#/settings/connections"); expect(q("[data-conn-withdraw=webSearch]")).not.toBeNull();
    q<HTMLButtonElement>("[data-conn-withdraw=webSearch]").click(); render(); expect(isApproved(consentKv, "webSearch")).toBe(false); expect(q("[data-conn-approve=webSearch]")).not.toBeNull();
    grantApproval(consentKv, "webSearch", NOW); expect(isApproved(consentKv, "webSearch")).toBe(true); said("conn.withdraw");
  });
});

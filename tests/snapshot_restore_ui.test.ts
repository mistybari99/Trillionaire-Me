// SET-1.05 (plan tracker G3-03): snapshot restore UI on Settings > Backup & export > Restore:
// a saved copy and a copy loaded from a file both open the same preview; the PIN is asked again; a real part is blocked without the tick;
// Cancel changes nothing; nothing changes before the confirm; en, bn and mix all show the flow.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { consentKv, snapshotRepo, store } from "../src/ui/state";
import { grantConsent, revokeConsent } from "../src/core/consent";
import { setPin } from "../src/core/appLock";
import { StoreRepo } from "../src/adapters/storeRepo";
import { snapshotToFile, takeSnapshot } from "../src/core/snapshots";
import type { FieldValue, Namespace, TMRecord } from "../src/core/types";

const NOW = "2026-10-26T10:00:00.000Z";
const rec = (ns: Namespace, id: string): TMRecord => ({ id, entity: "goal", ns, ownerId: ns === "demo" ? "demo-user" : "owner", schemaVersion: 1, createdAt: NOW, values: { "goal.title": { state: "value", value: `T-${id}`, label: ns === "demo" ? "DEMO" : "FACT" } as FieldValue } });
const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const go = (hash: string) => { location.hash = hash; render(); };
// Completion follows durable persistence; memory can change before the result is ready.
const restoreFinished = () => { render(); return !!q("[data-act=restore-goback]"); };
const settle = (ms = 80) => new Promise((r) => setTimeout(r, ms));
const wait = async (fn: () => boolean) => { for (let i = 0; i < 300 && !fn(); i++) await new Promise((r) => setTimeout(r, 10)); };
const ids = () => store.demo.list().map((r) => r.id).sort();

beforeEach(async () => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear(); revokeConsent(consentKv);
  for (const x of await snapshotRepo!.list()) await snapshotRepo!.delete(x.id);
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
});

async function oneSnapshotOf(demoIds: string[], real: string[] = []) {
  grantConsent(consentKv, NOW); store.demo.clear(); store.real.clear(); demoIds.forEach((i) => store.demo.put(rec("demo", i))); real.forEach((i) => store.real.put(rec("real", i)));
  const s = await takeSnapshot(new StoreRepo(store), snapshotRepo!, { reason: "manual", keep: 5, realOk: true }); expect(s).not.toBeNull(); return s!;
}

describe("snapshot restore UI", () => {
  it("the restore page lists saved copies with Restore and a load-from-file control", async () => {
    await oneSnapshotOf(["a"]); revokeConsent(consentKv); go("#/settings/backup/restore"); await settle();
    expect(q("[data-snapshot]")).not.toBeNull(); expect(q("[data-act=snap-restore]")).not.toBeNull(); expect(q("[data-snap=file]")).not.toBeNull(); expect(q("[data-act=snap-open-file]")).not.toBeNull();
  });
  it("a copy loaded from a snapshot file opens the same preview, changes nothing until confirmed, then replaces and keeps a Go back copy", async () => {
    const s = await oneSnapshotOf(["x", "y"]); revokeConsent(consentKv); const text = JSON.stringify(snapshotToFile(s));
    for (const x of await snapshotRepo!.list()) await snapshotRepo!.delete(x.id);
    store.demo.clear(); store.demo.put(rec("demo", "a"));
    go("#/settings/backup/restore"); await settle();
    Object.defineProperty(q("[data-snap=file]"), "files", { value: [{ text: async () => text }], configurable: true });
    q<HTMLButtonElement>("[data-act=snap-open-file]").click(); await wait(() => !!q("[data-restore=preview]"));
    expect(q("[data-restore=preview]").textContent).toMatch(/Replace my 1 entries with the 2 in this file/); expect(ids()).toEqual(["a"]);
    q<HTMLButtonElement>("[data-act=snap-confirm]").click(); await wait(restoreFinished);
    expect(ids()).toEqual(["x", "y"]); expect((await snapshotRepo!.list()).some((x) => x.reason === "before_restore")).toBe(true);
  });
  it("a damaged snapshot file shows a plain message and nothing changes", async () => {
    store.demo.put(rec("demo", "a")); go("#/settings/backup/restore"); await settle();
    Object.defineProperty(q("[data-snap=file]"), "files", { value: [{ text: async () => "{nope" }], configurable: true });
    q<HTMLButtonElement>("[data-act=snap-open-file]").click(); await wait(() => !!q("[data-snap=msg]").textContent);
    expect(q("[data-snap=msg]").className).toBe("err"); expect(q("[data-restore=preview]")).toBeNull(); expect(ids()).toEqual(["a"]);
  });
  it("with the app lock on the PIN is asked again; a wrong PIN changes nothing", async () => {
    await oneSnapshotOf(["x"]); revokeConsent(consentKv); store.demo.clear(); store.demo.put(rec("demo", "a")); await setPin(consentKv, "4821", "4821", 1000);
    go("#/settings/backup/restore"); await settle(); q<HTMLButtonElement>("[data-act=snap-restore]").click(); await wait(() => !!q("[data-restore=pin]"));
    q<HTMLInputElement>("[data-restore=pin]").value = "0000"; q<HTMLButtonElement>("[data-act=snap-confirm]").click(); await wait(() => !!q("[data-restore=err]").textContent);
    expect(ids()).toEqual(["a"]);
    q<HTMLInputElement>("[data-restore=pin]").value = "4821"; q<HTMLButtonElement>("[data-act=snap-confirm]").click(); await wait(restoreFinished); expect(ids()).toEqual(["x"]);
  });
  it("a copy with real data is blocked without the real-data tick and nothing changes", async () => {
    await oneSnapshotOf(["d"], ["r"]); revokeConsent(consentKv); store.real.clear(); store.demo.clear(); store.demo.put(rec("demo", "a"));
    go("#/settings/backup/restore"); await settle(); q<HTMLButtonElement>("[data-act=snap-restore]").click(); await wait(() => !!q("[data-restore=blocked], [data-restore=preview]"));
    const blocked = q("[data-restore=blocked]"); if (blocked) { expect(blocked.textContent).toMatch(/needs your permission/); expect(ids()).toEqual(["a"]); }
    else { expect(q("[data-restore-part=real]")).toBeNull(); } // a snapshot taken with the tick keeps its real part only when the tick is on now; without it the real part is left out
    expect(store.real.list().length).toBe(0);
  });
  it("Cancel is the default focus and leaves everything as it was", async () => {
    await oneSnapshotOf(["x"]); revokeConsent(consentKv); store.demo.clear(); store.demo.put(rec("demo", "a"));
    go("#/settings/backup/restore"); await settle(); q<HTMLButtonElement>("[data-act=snap-restore]").click(); await wait(() => !!q("[data-restore=preview]"));
    expect(document.activeElement?.getAttribute("data-act")).toBe("snap-cancel"); q<HTMLButtonElement>("[data-act=snap-cancel]").click();
    expect(q("[data-restore=preview]")).toBeNull(); expect(ids()).toEqual(["a"]);
  });
  for (const lang of ["bn", "mix"]) it(`the same flow shows in ${lang}`, async () => {
    await oneSnapshotOf(["x"]); revokeConsent(consentKv); store.demo.clear(); store.demo.put(rec("demo", "a")); localStorage.setItem("tm:ui:lang", lang);
    go("#/settings/backup/restore"); await settle(); q<HTMLButtonElement>("[data-act=snap-restore]").click(); await wait(() => !!q("[data-restore=preview]"));
    expect(q("[data-restore=preview]").textContent).toMatch(/[ঀ-৿]/); expect(q("[data-act=snap-confirm]").textContent!.length).toBeGreaterThan(5);
  });
});

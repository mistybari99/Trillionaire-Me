// Settings redesign PR 1: the restore screen part (backup file path). Preview first, PIN again when locked, numbers in the confirm, Go back.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { grantConsent, revokeConsent } from "../src/core/consent";
import { setPin, LOCK_KEY } from "../src/core/appLock";
import { createBackup } from "../src/core/backup";
import { StoreRepo } from "../src/adapters/storeRepo";
import type { FieldValue, TMRecord } from "../src/core/types";

const NOW = "2026-10-26T10:00:00.000Z";
const rec = (id: string): TMRecord => ({ id, entity: "goal", ns: "demo", ownerId: "demo-user", schemaVersion: 1, createdAt: NOW, values: { "goal.title": { state: "value", value: id, label: "DEMO" } as FieldValue } });
const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const go = (hash: string) => { location.hash = hash; render(); };
const wait = async (fn: () => boolean) => { for (let i = 0; i < 300 && !fn(); i++) await new Promise((r) => setTimeout(r, 10)); };
const setFile = (input: HTMLInputElement, text: string) => Object.defineProperty(input, "files", { value: [{ text: async () => text }], configurable: true });
async function fileOf(ids: string[]): Promise<string> {
  const keep = store.demo.list(); store.demo.clear(); ids.forEach((i) => store.demo.put(rec(i)));
  const text = JSON.stringify(await createBackup(new StoreRepo(store), "demo")); store.demo.clear(); keep.forEach((r) => store.demo.put(r)); return text;
}
beforeEach(() => {
  localStorage.clear(); store.demo.clear(); store.real.clear(); revokeConsent(consentKv);
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
});

describe("backup file restore flow", () => {
  it("shows a preview with both numbers, changes nothing until confirm, then offers Go back", async () => {
    store.demo.put(rec("a")); store.demo.put(rec("b")); const text = await fileOf(["x", "y", "z"]);
    go("#/more/data"); setFile(q("[data-act=restore]"), text); q<HTMLInputElement>("[data-act=restore]").dispatchEvent(new Event("change"));
    await wait(() => !!q("[data-restore=preview]"));
    expect(q("[data-restore=preview]").textContent).toMatch(/your 2 entries on this phone will be replaced by the 3 in this file/);
    expect(q("[data-act=json-confirm]").textContent).toBe("Replace my 2 entries with the 3 in this file"); expect(store.demo.list().length).toBe(2);
    q<HTMLButtonElement>("[data-act=json-confirm]").click(); await wait(() => store.demo.list().length === 3); render(); // the real app redraws on hashchange
    expect(store.demo.list().map((r) => r.id).sort()).toEqual(["x", "y", "z"]);
    expect(q("[data-restore=msg]").textContent).toMatch(/Done. 3 entries restored/);
    q<HTMLButtonElement>("[data-act=restore-goback]").click(); await wait(() => store.demo.list().length === 2);
    expect(store.demo.list().map((r) => r.id).sort()).toEqual(["a", "b"]);
  });
  it("a damaged file is refused with a plain message and nothing changes", async () => {
    store.demo.put(rec("a")); go("#/more/data"); setFile(q("[data-act=restore]"), "{nope"); q<HTMLInputElement>("[data-act=restore]").dispatchEvent(new Event("change"));
    await wait(() => !!q("#backup-msg").textContent); expect(q("#backup-msg").textContent).toMatch(/Nothing was changed/); expect(store.demo.list().length).toBe(1);
  });
  it("with the app lock on, the PIN is asked again; a wrong PIN changes nothing", async () => {
    await setPin(consentKv, "4821", "4821", 1000); expect(consentKv.get(LOCK_KEY)).toBeTruthy(); grantConsent(consentKv, NOW);
    store.demo.put(rec("a")); const text = await fileOf(["x"]);
    go("#/more/data"); setFile(q("[data-act=restore]"), text); q<HTMLInputElement>("[data-act=restore]").dispatchEvent(new Event("change"));
    await wait(() => !!q("[data-restore=pin]"));
    q<HTMLInputElement>("[data-restore=pin]").value = "0000"; q<HTMLButtonElement>("[data-act=json-confirm]").click();
    await wait(() => !!q("[data-restore=err]").textContent); expect(q("[data-restore=err]").textContent).toMatch(/not right/); expect(store.demo.list().map((r) => r.id)).toEqual(["a"]);
    q<HTMLInputElement>("[data-restore=pin]").value = "4821"; q<HTMLButtonElement>("[data-act=json-confirm]").click();
    await wait(() => store.demo.list().some((r) => r.id === "x")); expect(store.demo.list().map((r) => r.id)).toEqual(["x"]);
  });
  it("the Save buttons say what the file contains", () => {
    go("#/more/data"); expect(q("[data-backup=contains]").textContent).toMatch(/demo entries only/); expect(q("[data-enc=contains]").textContent).toMatch(/demo and real/);
  });
});

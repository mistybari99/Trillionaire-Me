// Settings redesign PR 3c: Delete data page. Typed word (+ fallback), PIN again, two-step demo delete, nothing destructive on the home.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { grantConsent, readConsent, revokeConsent } from "../src/core/consent";
import { setPin } from "../src/core/appLock";
import { isDeleteWord } from "../src/core/typedConfirm";
import type { FieldValue, Namespace, TMRecord } from "../src/core/types";

const NOW = "2026-10-26T10:00:00.000Z";
const rec = (ns: Namespace, id: string): TMRecord => ({ id, entity: "goal", ns, ownerId: ns === "demo" ? "demo-user" : "owner", schemaVersion: 1, createdAt: NOW, values: { "goal.title": { state: "value", value: id, label: ns === "demo" ? "DEMO" : "FACT" } as FieldValue } });
const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const go = (hash: string) => { location.hash = hash; render(); };
const word = (w: string) => { const i = q<HTMLInputElement>("[data-delete-word]"); i.value = w; i.dispatchEvent(new Event("input")); };
const wait = (ms = 80) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  localStorage.clear(); store.demo.clear(); store.real.clear(); revokeConsent(consentKv);
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
});

describe("typed word", () => {
  it("accepts delete, DELETE, ডিলিট and ডিলেট after trim, NFC and case folding", () => {
    for (const w of ["delete", "DELETE", "  Delete ", "ডিলিট", "ডিলেট", " ডিলিট\n", "ডিলিট".normalize("NFD"), "ডিলেট".normalize("NFD")]) expect(isDeleteWord(w), w).toBe(true);
    for (const w of ["", "del", "delete it", "deleted", "ডিলিট করুন", "remove"]) expect(isDeleteWord(w), w).toBe(false);
  });
});

describe("Delete data page", () => {
  it("opens calm: says nothing happens until you confirm, shows live counts, links to the backup page", () => {
    store.demo.put(rec("demo", "d1")); grantConsent(consentKv, NOW); store.real.put(rec("real", "r1")); store.real.put(rec("real", "r2")); go("#/settings/delete");
    expect(q(".sub").textContent).toBe("Nothing here happens until you confirm.");
    expect(q("[data-delete=demo-count]").textContent).toBe("Your demo entries: 1."); expect(q("[data-delete=real-count]").textContent).toBe("Your real entries: 2.");
    expect(q("[data-act=delete-real-backup]").getAttribute("href")).toBe("#/settings/backup");
    expect(app().querySelector(".countdown, [data-countdown]")).toBeNull();
  });
  it("Clear real: the final button stays off until an accepted word is typed; each accepted word works; demo and snapshots rules hold", () => {
    grantConsent(consentKv, NOW); store.real.put(rec("real", "r1")); store.demo.put(rec("demo", "d1")); go("#/settings/delete");
    const yes = q<HTMLButtonElement>("[data-act=clear-real-yes]"); expect(yes.disabled).toBe(true);
    for (const w of ["x", "del"]) { word(w); expect(yes.disabled).toBe(true); }
    for (const w of ["delete", "DELETE", "ডিলিট", "ডিলেট"]) { word(w); expect(yes.disabled, w).toBe(false); }
    word("ডিলিট"); yes.click();
    expect(store.real.list()).toEqual([]); expect(store.demo.list().length).toBe(1); expect(readConsent(consentKv)).toBe(false);
  });
  it("fallback: 'I cannot type this' shows a tick; Cancel is focused first; the tick enables the button", async () => {
    grantConsent(consentKv, NOW); store.real.put(rec("real", "r1")); go("#/settings/delete");
    q<HTMLButtonElement>("[data-act=clear-real-cant]").click(); render(); await wait(10);
    expect(document.activeElement?.getAttribute("data-act")).toBe("clear-real-no");
    const yes = q<HTMLButtonElement>("[data-act=clear-real-yes]"); expect(yes.disabled).toBe(true);
    expect(q("label[for=delete-tick]").textContent).toBe("I understand that 1 entries will be deleted.");
    const tick = q<HTMLInputElement>("[data-delete-tick]"); tick.checked = true; tick.dispatchEvent(new Event("change")); expect(yes.disabled).toBe(false);
    yes.click(); expect(store.real.list()).toEqual([]);
    q<HTMLButtonElement>("[data-act=clear-real-no]");
  });
  it("Cancel on the fallback goes back to the typed-word step and deletes nothing", () => {
    grantConsent(consentKv, NOW); store.real.put(rec("real", "r1")); go("#/settings/delete");
    q<HTMLButtonElement>("[data-act=clear-real-cant]").click(); render(); q<HTMLButtonElement>("[data-act=clear-real-no]").click(); render();
    expect(q("[data-delete-word]")).not.toBeNull(); expect(store.real.list().length).toBe(1);
  });
  it("Delete demo is ask then confirm, cancel keeps everything, and real data is untouched", () => {
    store.demo.put(rec("demo", "d1")); grantConsent(consentKv, NOW); store.real.put(rec("real", "r1")); go("#/settings/delete");
    q<HTMLButtonElement>("[data-act=clear-demo]").click(); render(); q<HTMLButtonElement>("[data-act=clear-demo-no]").click(); render(); expect(store.demo.list().length).toBe(1);
    q<HTMLButtonElement>("[data-act=clear-demo]").click(); render(); expect(store.demo.list().length).toBe(1);
    q<HTMLButtonElement>("[data-act=clear-demo-yes]").click(); expect(store.demo.list()).toEqual([]); expect(store.real.list().length).toBe(1);
  });
  it("with the app lock on, the PIN is asked again and a wrong PIN deletes nothing", async () => {
    await setPin(consentKv, "4821", "4821", 1000); grantConsent(consentKv, NOW); store.real.put(rec("real", "r1")); go("#/settings/delete");
    word("delete"); q<HTMLInputElement>("[data-delete=pin]").value = "0000"; q<HTMLButtonElement>("[data-act=clear-real-yes]").click(); await wait(200);
    expect(store.real.list().length).toBe(1); expect(q("[data-delete=pin-err]").textContent).toMatch(/not right/);
    q<HTMLInputElement>("[data-delete=pin]").value = "4821"; q<HTMLButtonElement>("[data-act=clear-real-yes]").click(); await wait(300);
    expect(store.real.list()).toEqual([]);
  });
  it("the result is read from state: after leaving and returning with new real data, no stale 'done' message", async () => {
    grantConsent(consentKv, NOW); store.real.put(rec("real", "r1")); go("#/settings/delete"); word("delete"); q<HTMLButtonElement>("[data-act=clear-real-yes]").click(); await wait(); render();
    expect(q("[data-delete=done]")).not.toBeNull();
    grantConsent(consentKv, NOW); store.real.put(rec("real", "r9")); go("#/settings/delete"); expect(app().querySelector("[data-delete=done]")).toBeNull();
  });
  it("nothing destructive on the Settings home, and the old Data page only links here", () => {
    go("#/settings"); expect(app().querySelector("[data-act^=clear], [data-delete-word]")).toBeNull();
    go("#/settings/data"); expect(app().querySelector("[data-act^=clear]")).toBeNull(); expect(q("a[href='#/settings/delete']")).not.toBeNull();
  });
});

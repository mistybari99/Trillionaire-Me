// Settings redesign PR 3c (second part): Demo or real data page and the Start-real page.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { consentKv, prefs, store } from "../src/ui/state";
import { readConsent, revokeConsent } from "../src/core/consent";
import type { FieldValue, TMRecord } from "../src/core/types";

const NOW = "2026-10-26T10:00:00.000Z";
const demo = (id: string): TMRecord => ({ id, entity: "goal", ns: "demo", ownerId: "demo-user", schemaVersion: 1, createdAt: NOW, values: { "goal.title": { state: "value", value: id, label: "DEMO" } as FieldValue } });
const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const go = (hash: string) => { location.hash = hash; render(); };
beforeEach(() => {
  localStorage.clear(); store.demo.clear(); store.real.clear(); revokeConsent(consentKv);
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
});

describe("Demo or real data", () => {
  it("the page shows mode, both counts, the permission gate, and links to Delete, Privacy and Backup", () => {
    store.demo.put(demo("d1")); go("#/settings/data");
    expect(q("[data-mode-switch]")).not.toBeNull(); expect(q("[data-ns=demo]").textContent).toMatch(/1/); expect(q("[data-consent=real]")).not.toBeNull();
    for (const h of ["#/settings/delete", "#/settings/privacy", "#/settings/backup"]) expect(q(`a[href='${h}']`), h).not.toBeNull();
  });
  it("the DEMO banner and 'Start real now' open the Start-real page; nothing is deleted by opening it", () => {
    store.demo.put(demo("d1")); go("#/today"); q<HTMLButtonElement>("[data-act=start-real-banner]").click(); render();
    expect(location.hash).toBe("#/settings/data/start-real"); expect(q("[data-settings=start-real]")).not.toBeNull(); expect(q("[data-act=start-demo-copy]")).not.toBeNull(); expect(store.demo.list().length).toBe(1);
  });
  it("on the page, confirming needs the tick, deletes demo only, turns real on and lands on the data page", () => {
    store.demo.put(demo("d1")); go("#/settings/data/start-real");
    q<HTMLButtonElement>("[data-act=demo-delete-confirm]").click(); render(); expect(store.demo.list().length).toBe(1); expect(readConsent(consentKv)).toBe(false);
    q<HTMLInputElement>("#mode-tick").checked = true; q<HTMLButtonElement>("[data-act=demo-delete-confirm]").click(); render();
    expect(store.demo.list()).toEqual([]); expect(readConsent(consentKv)).toBe(true); expect(prefs.dataMode).toBe("real"); expect(location.hash).toBe("#/settings/data");
  });
  it("Keep demo data on the page cancels and returns to the data page", () => {
    store.demo.put(demo("d1")); go("#/settings/data/start-real"); q<HTMLButtonElement>("[data-act=demo-delete-cancel]").click(); render();
    expect(location.hash).toBe("#/settings/data"); expect(store.demo.list().length).toBe(1); expect(prefs.dataMode).toBe("demo");
  });
  it("the old /more/data route still shows the same page (redirect comes later)", () => { go("#/settings/data"); expect(q("[data-settings=data]")).not.toBeNull(); });
});

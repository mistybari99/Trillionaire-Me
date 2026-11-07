// Settings gap closing (plan keeper G-04, G-06, G-07): restore Cancel, refusal on every real write path after Withdraw,
// no score/rank/streak wording in any language pack, cross-tab refresh (SET-6.04), tap-target rules, one consent wording.
import "fake-indexeddb/auto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../src/app";
import { consentKv, prefs, store } from "../src/ui/state";
import { grantConsent, readConsent, revokeConsent, CONSENT_KEY } from "../src/core/consent";
import { LOCK_KEY, setPin } from "../src/core/appLock";
import { createBackup } from "../src/core/backup";
import { exportCsv } from "../src/core/csv";
import { applyImport, planImport } from "../src/core/csvImport";
import { restoreBackupAtomic, RealPermissionError } from "../src/core/restore";
import { MemorySnapshotRepo } from "../src/core/snapshots";
import { StoreRepo } from "../src/adapters/storeRepo";
import { MemoryKV, Store, StoreError } from "../src/core/store";
import { saveTyped, putMode } from "../src/ui/entry";
import { installCrossTab, isWatchedChange } from "../src/ui/crossTab";
import { firstRunScreen } from "../src/ui/modeUi";
import { PACKS } from "../src/i18n/packs";
import type { FieldValue, TMRecord } from "../src/core/types";

const NOW = "2026-10-26T10:00:00.000Z";
const rec = (id: string, ns: "demo" | "real"): TMRecord => ({ id, entity: "goal", ns, ownerId: "owner", schemaVersion: 1, createdAt: NOW, values: { "goal.title": { state: "value", value: id, label: ns === "real" ? "FACT" : "DEMO" } as FieldValue } });
const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const go = (hash: string) => { location.hash = hash; render(); };
const wait = async (fn: () => boolean) => { for (let i = 0; i < 300 && !fn(); i++) await new Promise((r) => setTimeout(r, 10)); };
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = `${d}/${f}`; return statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") ? [p] : []; });

beforeEach(() => {
  localStorage.clear(); store.demo.clear(); store.real.clear(); revokeConsent(consentKv);
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
});

describe("restore: Cancel by name (SET-1.T5)", () => {
  it("Cancel closes the preview and nothing changes; Cancel is the default focus", async () => {
    store.demo.put(rec("a", "demo"));
    const keep = store.demo.list(); store.demo.clear(); store.demo.put(rec("x", "demo"));
    const text = JSON.stringify(await createBackup(new StoreRepo(store), "demo")); store.demo.clear(); keep.forEach((r) => store.demo.put(r));
    go("#/settings/backup/restore");
    const input = q<HTMLInputElement>("[data-act=restore]"); Object.defineProperty(input, "files", { value: [{ text: async () => text }], configurable: true }); input.dispatchEvent(new Event("change"));
    await wait(() => !!q("[data-restore=preview]"));
    const cancel = [...app().querySelectorAll("button")].find((b) => b.textContent === "Cancel")!;
    expect(cancel).toBeTruthy(); expect(document.activeElement).toBe(cancel);
    cancel.click();
    expect(app().querySelector("[data-restore=preview]")).toBeNull(); expect(store.demo.list().map((r) => r.id)).toEqual(["a"]);
  });
});

describe("every real write path refuses after Withdraw (SET-3b.T)", () => {
  it("store, entry forms, app-made records, restore, CSV import and the typed prayer place all refuse; nothing is lost", async () => {
    grantConsent(consentKv, NOW); localStorage.setItem("tm:ui:dataMode", "real"); store.real.put(rec("r1", "real"));
    const sender = new Store(new MemoryKV(), { consentKv: (() => { const k = new MemoryKV(); grantConsent(k, NOW); return k; })() }); sender.real.put(rec("z", "real"));
    const csv = exportCsv(sender, "real"); const backup = await createBackup(new StoreRepo(sender), "real");
    revokeConsent(consentKv);
    expect(() => store.real.put(rec("r2", "real"))).toThrow(StoreError);
    expect(saveTyped({ id: "x", entity: "goal", createdAt: NOW, values: {} })).toBe(false);
    expect(putMode(rec("y", "demo"))).toBe(false);
    await expect(restoreBackupAtomic(new StoreRepo(store), new MemorySnapshotRepo(), { demo: null, real: backup, createdAt: NOW }, readConsent(consentKv))).rejects.toBeInstanceOf(RealPermissionError);
    const plan = planImport(csv, store); expect(applyImport(store, plan, consentKv, new MemoryKV(), "owner")).toEqual({ ok: false, reason: "needs_consent" });
    const before = JSON.stringify(prefs.prayerCoords);
    go("#/settings/prayer"); const form = q<HTMLFormElement>("[data-form=prayer-place]");
    (form.querySelector("#pr-lat") as HTMLInputElement).value = "23.9"; (form.querySelector("#pr-lon") as HTMLInputElement).value = "90.1";
    form.dispatchEvent(new Event("submit", { cancelable: true })); expect(JSON.stringify(prefs.prayerCoords)).toBe(before);
    expect(store.real.list().map((r) => r.id)).toEqual(["r1"]);
  });
  it("no source file writes a real record key except the store itself and its saved-copy mirror", () => {
    const allowed = new Set(["src/core/store.ts", "src/core/persist.ts", "src/core/connections.ts"]);
    for (const f of walk("src")) if (!allowed.has(f)) expect(/["'`]tm:real:/.test(readFileSync(f, "utf8")), f).toBe(false);
  });
});

describe("no score, rank or streak wording in any pack (SET-3b.T)", () => {
  it("English, Bangla and Mix, every key", () => {
    const re = /\b(scores?|ranks?|ranking|rankings|streaks?|leaderboards?|points)\b|স্কোর|র‍্যাঙ্ক|র্যাঙ্ক|র‌্যাংক|স্ট্রিক|পয়েন্ট|লিডারবোর্ড/i;
    for (const l of ["en", "bn", "mix"] as const) for (const [k, v] of Object.entries(PACKS[l])) expect(re.test(v), `${l}:${k}`).toBe(false);
  });
});

describe("cross-tab refresh (SET-6.04)", () => {
  it("watches consent, lock and data mode only; a cleared storage counts", () => {
    expect(isWatchedChange(CONSENT_KEY)).toBe(true); expect(isWatchedChange(LOCK_KEY)).toBe(true); expect(isWatchedChange("tm:ui:dataMode")).toBe(true);
    expect(isWatchedChange(null)).toBe(true); expect(isWatchedChange("tm:ui:lang")).toBe(false); expect(isWatchedChange("tm:real:abc")).toBe(false);
  });
  it("a storage event from another tab redraws Privacy: consent withdrawn there shows here, nothing is written", () => {
    const redraw = vi.fn(() => render()); installCrossTab(redraw);
    grantConsent(consentKv, NOW); go("#/settings/privacy"); expect(q("[data-priv=consent-on]")).not.toBeNull();
    const writes = vi.spyOn(Storage.prototype, "setItem");
    localStorage.removeItem(CONSENT_KEY); window.dispatchEvent(new StorageEvent("storage", { key: CONSENT_KEY }));
    expect(redraw).toHaveBeenCalledTimes(1); expect(q("[data-priv=consent-on]")).toBeNull(); expect(app().querySelector("[data-consent=real]")).not.toBeNull();
    window.dispatchEvent(new StorageEvent("storage", { key: "tm:ui:lang" })); expect(redraw).toHaveBeenCalledTimes(1);
    expect(writes).not.toHaveBeenCalled(); writes.mockRestore();
  });
  it("the lock set in another tab is read here on the next redraw", async () => {
    go("#/settings/privacy"); const other = new MemoryKV(); await setPin(other, "4821", "4821", 1000);
    localStorage.setItem(LOCK_KEY, other.get(LOCK_KEY)!); window.dispatchEvent(new StorageEvent("storage", { key: LOCK_KEY })); render();
    expect(q("[data-priv-line=applock]").textContent).toMatch(/App lock: on/);
  });
  it("main.ts installs it", () => { expect(readFileSync("src/main.ts", "utf8")).toMatch(/installCrossTab\(onRoute\)/); });
});

describe("tap targets (SET-6.03)", () => {
  const css = readFileSync("src/ui/styles.css", "utf8");
  it("buttons are at least 44 and inputs 48 by rule", () => {
    expect(Number(css.match(/\.cta,\.btn\{[^}]*min-height:(\d+)px/)![1])).toBeGreaterThanOrEqual(44);
    expect(Number(css.match(/input,select,textarea\{[^}]*min-height:(\d+)px/)![1])).toBeGreaterThanOrEqual(48);
    expect(Number(css.match(/\.seg button\{min-height:(\d+)px/)![1])).toBeGreaterThanOrEqual(44);
  });
  it("on every Settings page, no inline height or min-height is under 44, in both languages", () => {
    for (const lang of ["en", "bn"]) for (const r of ["", "/look", "/prayer", "/backup", "/backup/restore", "/privacy", "/data", "/data/start-real", "/plan", "/connections", "/delete", "/about"]) {
      localStorage.setItem("tm:ui:lang", lang); go(`#/settings${r}`);
      for (const el of app().querySelectorAll<HTMLElement>("[style]")) for (const m of el.getAttribute("style")!.matchAll(/(?:^|;)\s*(min-height|height)\s*:\s*(\d+)px/g)) expect(Number(m[2]), `${lang} ${r} ${el.outerHTML.slice(0, 80)}`).toBeGreaterThanOrEqual(44);
    }
  });
});

describe("one consent wording everywhere (SET-3b.3, G-07)", () => {
  it("first-run Start-real step shows the same four sentences and the same tick as the consent gate", () => {
    for (const l of ["en", "bn"] as const) {
      localStorage.setItem("tm:ui:lang", l);
      app().replaceChildren(firstRunScreen()); q<HTMLButtonElement>("[data-act=first-real]").click(); // module state moves to the confirm step
      app().replaceChildren(firstRunScreen()); const txt = app().textContent!;
      for (const k of ["data.consent.p1", "data.consent.p2", "data.consent.p3", "data.consent.p4", "data.consent.tick"] as const) expect(txt, `${l} ${k}`).toContain(PACKS[l][k]);
      q<HTMLButtonElement>("[data-act=first-real-back]").click();
    }
  });
  it("the Start-real page uses the same tick sentence", () => {
    go("#/settings/data/start-real"); expect(app().textContent).toContain(PACKS.en["data.consent.tick"]);
  });
});

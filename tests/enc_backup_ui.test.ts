// Build step 4 UI + follow-up: encrypted backup card on More > Data, and "Link to goal" on the Plan task form.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { grantConsent, revokeConsent } from "../src/core/consent";
import { encryptBackup } from "../src/core/cryptoBackup";
import { createBackup } from "../src/core/backup";
import { StoreRepo } from "../src/adapters/storeRepo";
import type { FieldValue, Namespace, TMRecord } from "../src/core/types";
import { goalRings } from "../src/core/chartData";

const NOW = "2026-10-25T00:00:00.000Z";
const mk = (ns: Namespace, id: string, entity: string, values: Record<string, unknown>, links?: Record<string, string>): TMRecord => {
  const label = ns === "demo" ? "DEMO" : "FACT"; const vals: Record<string, FieldValue> = {};
  for (const [k, x] of Object.entries(values)) vals[k] = { state: "value", value: x, label } as FieldValue;
  return { id, entity, ns, ownerId: ns === "demo" ? "demo-user" : "owner", schemaVersion: 1, createdAt: NOW, values: vals, ...(links ? { links } : {}) };
};
const app = () => document.getElementById("app")!;
const go = (hash: string) => { location.hash = hash; render(); };
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const tick = () => new Promise((r) => setTimeout(r, 0));
async function until(fn: () => boolean) { for (let i = 0; i < 400 && !fn(); i++) await new Promise((r) => setTimeout(r, 10)); }
const setFile = (input: HTMLInputElement, text: string) => Object.defineProperty(input, "files", { value: [{ text: async () => text }], configurable: true });

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear();
  document.body.innerHTML = '<div id="app"></div>';
  localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, NOW);
});

describe("encrypted backup card", () => {
  it("refuses empty, short and mismatching passphrases", async () => {
    go("#/more/data");
    const click = (a: string) => q<HTMLButtonElement>(`[data-act=${a}]`).click();
    click("enc-save"); await tick(); expect(q("#enc-msg").textContent).toMatch(/passphrase first/);
    q<HTMLInputElement>("#enc-pass").value = "abc"; q<HTMLInputElement>("#enc-pass2").value = "abc"; click("enc-save"); await tick();
    expect(q("#enc-msg").textContent).toMatch(/at least 8/);
    q<HTMLInputElement>("#enc-pass").value = "longenough1"; q<HTMLInputElement>("#enc-pass2").value = "different11"; click("enc-save"); await tick();
    expect(q("#enc-msg").textContent).toMatch(/not the same/);
  });

  async function fileFor(demoRecs: TMRecord[], realRecs: TMRecord[], pass: string) {
    const s = new (await import("../src/core/store")).Store(new (await import("../src/core/store")).MemoryKV(), { realEnabled: true, consentKv });
    demoRecs.forEach((r) => s.demo.put(r)); realRecs.forEach((r) => s.real.put(r));
    const repo = new StoreRepo(s); const real = await createBackup(repo, "real");
    return JSON.stringify(await encryptBackup({ demo: await createBackup(repo, "demo"), real: real.count ? real : null }, pass, 1000));
  }

  it("wrong passphrase and damaged file show plain errors and change nothing", async () => {
    store.demo.put(mk("demo", "keep", "task", { "task.title": "keep me" }));
    const text = await fileFor([mk("demo", "d1", "task", { "task.title": "a" })], [], "right-pass-1");
    go("#/more/data");
    setFile(q("#enc-file"), text); q<HTMLInputElement>("#enc-rpass").value = "wrong-pass-9"; q<HTMLButtonElement>("[data-act=enc-open]").click();
    await until(() => !!q("#enc-msg").textContent);
    expect(q("#enc-msg").textContent).toMatch(/does not match, or the file is damaged/); expect(q("[data-act=enc-confirm]")).toBeNull();
    setFile(q("#enc-file"), "{broken"); q<HTMLButtonElement>("[data-act=enc-open]").click(); await until(() => /not a valid/.test(q("#enc-msg").textContent ?? ""));
    expect(q("#enc-msg").textContent).toMatch(/not a valid backup/);
    expect(store.demo.list().map((r) => r.id)).toEqual(["keep"]);
  });

  it("restore needs an explicit confirm, then puts demo into demo and real into real only", async () => {
    store.demo.put(mk("demo", "old", "task", { "task.title": "old" })); store.real.put(mk("real", "oldr", "task", { "task.title": "oldr" }));
    const text = await fileFor([mk("demo", "d1", "task", { "task.title": "a" })], [mk("real", "r1", "task", { "task.title": "b" })], "right-pass-1");
    go("#/more/data");
    setFile(q("#enc-file"), text); q<HTMLInputElement>("#enc-rpass").value = "right-pass-1"; q<HTMLButtonElement>("[data-act=enc-open]").click();
    await until(() => !!q("[data-act=enc-confirm]"));
    expect(q("#enc-msg").textContent).toMatch(/1 demo and 1 real/);
    expect(store.demo.list().map((r) => r.id)).toEqual(["old"]); expect(store.real.list().map((r) => r.id)).toEqual(["oldr"]); // nothing yet
    q<HTMLButtonElement>("[data-act=enc-confirm]").click();
    await until(() => store.demo.list().some((r) => r.id === "d1"));
    expect(store.demo.list().map((r) => r.id)).toEqual(["d1"]); expect(store.real.list().map((r) => r.id)).toEqual(["r1"]);
    expect(store.demo.list().every((r) => r.ns === "demo")).toBe(true); expect(store.real.list().every((r) => r.ns === "real")).toBe(true);
  });

  it("cancel keeps everything; real part is skipped without the real-data tick", async () => {
    store.real.put(mk("real", "oldr", "task", { "task.title": "oldr" }));
    const text = await fileFor([mk("demo", "d1", "task", { "task.title": "a" })], [mk("real", "r1", "task", { "task.title": "b" })], "right-pass-1");
    revokeConsent(consentKv);
    go("#/more/data");
    setFile(q("#enc-file"), text); q<HTMLInputElement>("#enc-rpass").value = "right-pass-1"; q<HTMLButtonElement>("[data-act=enc-open]").click();
    await until(() => !!q("[data-act=enc-cancel]")); q<HTMLButtonElement>("[data-act=enc-cancel]").click();
    expect(store.demo.list()).toHaveLength(0); expect(store.real.list().map((r) => r.id)).toEqual(["oldr"]);
    q<HTMLInputElement>("#enc-rpass").value = "right-pass-1"; q<HTMLButtonElement>("[data-act=enc-open]").click(); await until(() => !!q("[data-act=enc-confirm]")); q<HTMLButtonElement>("[data-act=enc-confirm]").click();
    await until(() => store.demo.list().length === 1);
    expect(store.real.list().map((r) => r.id)).toEqual(["oldr"]); expect(q("#enc-msg").textContent).toMatch(/real-data tick is off/);
  });

  it("has Bangla copy with Latin digits", () => {
    localStorage.setItem("tm:ui:lang", "bn"); go("#/more/data");
    expect(q("[data-card=enc-backup]").textContent).toContain("এনক্রিপ্টেড ব্যাকআপ"); expect(q("[data-card=enc-backup]").textContent).not.toMatch(/[০-৯]/);
  });
});

describe("Plan: link a task to a goal", () => {
  it("lists only the active mode's goals, saves links.goal, and the Report ring is no longer unknown", () => {
    store.demo.put(mk("demo", "g-demo", "goal", { "goal.title": "Demo goal" }));
    localStorage.setItem("tm:ui:dataMode", "real"); store.real.put(mk("real", "g1", "goal", { "goal.title": "Save a reserve" }));
    go("#/diary/plan");
    const sel = q<HTMLSelectElement>("#pt-goal");
    expect([...sel.options].map((o) => o.textContent)).toEqual(["No goal", "Save a reserve"]);
    q<HTMLInputElement>("#pt-title").value = "Open account"; sel.value = "g1";
    q<HTMLFormElement>("form[data-form=task]").dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    const task = store.real.list().find((r) => r.entity === "task")!;
    expect(task.links).toEqual({ goal: "g1" });
    go("#/diary/plan");
    expect(q("[data-goal=g1]").textContent).toContain("Save a reserve");
    const ring = goalRings(store.real.list()).find((g) => g.id === "g1")!;
    expect(ring.total).toBe(1); expect(ring.fraction).toBe(0);
  });
  it("no goal chosen leaves no goal link; no select when there are no goals", () => {
    go("#/diary/plan"); expect(q("#pt-goal")).toBeNull();
    store.demo.put(mk("demo", "g1", "goal", { "goal.title": "G" })); go("#/diary/plan");
    q<HTMLInputElement>("#pt-title").value = "T"; q<HTMLFormElement>("form[data-form=task]").dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    expect(store.demo.list().find((r) => r.entity === "task")!.links).toBeUndefined();
  });
  it("Bangla labels exist", () => {
    localStorage.setItem("tm:ui:lang", "bn"); store.demo.put(mk("demo", "g1", "goal", { "goal.title": "G" })); go("#/diary/plan");
    expect(app().textContent).toContain("লক্ষ্যের সাথে যুক্ত করুন");
  });
});

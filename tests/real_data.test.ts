// D-B real data (owner approved 25 Oct 2026): consent gate, demo/real separation, clear-all, data screen flow.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { CONSENT_KEY, grantConsent, readConsent, revokeConsent } from "../src/core/consent";
import { REAL_DATA_ENABLED, MemoryKV, Store, StoreError } from "../src/core/store";
import { DexieRepo } from "../src/adapters/dexie";
import { guardWrite } from "../src/core/repo";
import type { FieldValue, TMRecord } from "../src/core/types";
import { render } from "../src/app";
import { store, consentKv } from "../src/ui/state";

const NOW = "2026-10-25T00:00:00.000Z";
const fact = (x: unknown): FieldValue => ({ state: "value", value: x, label: "FACT" });
const demoVal = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" });
const rec = (ns: "demo" | "real", id: string, values: Record<string, FieldValue> = {}): TMRecord =>
  ({ id, entity: "profile", ns, ownerId: "u", schemaVersion: 1, createdAt: NOW, values });

describe("D-B: the real namespace is open, behind consent", () => {
  it("REAL_DATA_ENABLED is true", () => { expect(REAL_DATA_ENABLED).toBe(true); });

  it("real writes are refused until consent is stored, then allowed", () => {
    const kv = new MemoryKV(), consent = new MemoryKV();
    const s = new Store(kv, { consentKv: consent });
    expect(() => s.real.put(rec("real", "a", { x: fact("1") }))).toThrow(StoreError);
    expect(kv.keys()).toEqual([]);
    grantConsent(consent, NOW);
    s.real.put(rec("real", "a", { x: fact("1") }));
    expect(s.real.list().map((r) => r.id)).toEqual(["a"]);
    expect(kv.keys().every((k) => k.startsWith("tm:real:"))).toBe(true);
  });

  it("without a consent source the real namespace stays closed (fail closed)", () => {
    expect(() => new Store(new MemoryKV(), { realEnabled: true }).real.put(rec("real", "a", { x: fact(1) }))).toThrow(/consent/);
  });
});

describe("D-B: demo and real never mix", () => {
  let kv: MemoryKV, consent: MemoryKV, s: Store;
  beforeEach(() => { kv = new MemoryKV(); consent = new MemoryKV(); grantConsent(consent, NOW); s = new Store(kv, { consentKv: consent }); });

  it("demo and real lists are disjoint", () => {
    s.demo.put(rec("demo", "d1", { x: demoVal("a") }));
    s.real.put(rec("real", "r1", { x: fact("b") }));
    expect(s.demo.list().map((r) => r.id)).toEqual(["d1"]);
    expect(s.real.list().map((r) => r.id)).toEqual(["r1"]);
    expect(s.demo.get("r1")).toBeNull();
    expect(s.real.get("d1")).toBeNull();
  });

  it("a DEMO label is rejected in the real namespace", () => {
    expect(() => s.real.put(rec("real", "r2", { x: demoVal("a") }))).toThrow(/DEMO/);
    expect(s.real.list()).toEqual([]);
  });

  it("a non-DEMO label is rejected in the demo namespace", () => {
    expect(() => s.demo.put(rec("demo", "d2", { x: fact("a") }))).toThrow(/only DEMO/);
  });

  it("a record cannot be written into the other namespace", () => {
    expect(() => s.real.put(rec("demo", "x", { y: fact(1) }))).toThrow(/cannot be written/);
    expect(() => s.demo.put(rec("real", "x", { y: demoVal(1) }))).toThrow(/cannot be written/);
  });

  it("the IndexedDB adapter enforces the same rules and the consent gate", async () => {
    const gate = { on: false };
    const repo = new DexieRepo(`real-gate-${Math.random()}`, () => gate.on);
    await expect(repo.put(rec("real", "r3", { x: fact(1) }))).rejects.toThrow(/locked/);
    gate.on = true;
    await repo.put(rec("real", "r3", { x: fact(1) }));
    expect((await repo.list("real")).map((r) => r.id)).toEqual(["r3"]);
    await expect(repo.put(rec("real", "r4", { x: demoVal(1) }))).rejects.toThrow(/DEMO/);
    expect(() => guardWrite(rec("real", "r5", { x: demoVal(1) }), true)).toThrow(/DEMO/);
    repo.close();
  });
});

describe("D-B: consent record", () => {
  it("missing, broken or old-version consent means no consent", () => {
    const kv = new MemoryKV();
    expect(readConsent(kv)).toBe(false);
    kv.set(CONSENT_KEY, "{not json"); expect(readConsent(kv)).toBe(false);
    kv.set(CONSENT_KEY, JSON.stringify({ v: 0, at: NOW })); expect(readConsent(kv)).toBe(false);
    kv.set(CONSENT_KEY, JSON.stringify({ v: 1 })); expect(readConsent(kv)).toBe(false);
  });

  it("grant then revoke", () => {
    const kv = new MemoryKV();
    grantConsent(kv, NOW); expect(readConsent(kv)).toBe(true);
    revokeConsent(kv); expect(readConsent(kv)).toBe(false);
  });
});

describe("D-B: data screen flow (consent and clear-all)", () => {
  const $ = (sel: string) => document.querySelector(sel) as HTMLElement | null;
  const click = (sel: string) => { $(sel)!.click(); render(); };
  const ui = () => { document.body.innerHTML = '<div id="app"></div>'; location.hash = "#/more/data"; render(); };

  beforeEach(() => { localStorage.clear(); localStorage.setItem("tm:ui:lang", "en"); store.demo.clear(); store.real.clear(); ui(); });

  it("shows the consent card first; real entry is locked until 'I understand' is ticked", () => {
    expect($("[data-consent='real']")).not.toBeNull();
    expect(readConsent(consentKv)).toBe(false);
    expect(() => store.real.put(rec("real", "r1", { x: fact(1) }))).toThrow(StoreError);
  });

  it("asks for the tick before turning real data on", () => {
    click("[data-act='consent']");
    expect(document.body.textContent).toContain("Tick 'I understand' first.");
    expect(readConsent(consentKv)).toBe(false);
  });

  it("ticking and tapping turns real data on; the consent card goes away", () => {
    (document.getElementById("consent-tick") as HTMLInputElement).checked = true;
    click("[data-act='consent']");
    expect(readConsent(consentKv)).toBe(true);
    expect($("[data-consent='real']")).toBeNull();
    store.real.put(rec("real", "r1", { x: fact(1) }));
    expect(store.real.list().length).toBe(1);
  });

  it("clear-all needs a second tap; cancel keeps everything", () => {
    grantConsent(consentKv, NOW);
    store.real.put(rec("real", "r1", { x: fact(1) }));
    store.demo.put(rec("demo", "d1", { x: demoVal(1) }));
    ui();
    click("[data-act='clear-real']");
    expect($("[data-act='clear-real-yes']")).not.toBeNull();
    click("[data-act='clear-real-no']");
    expect(store.real.list().length).toBe(1);
    expect(readConsent(consentKv)).toBe(true);
  });

  it("confirmed clear-all removes real records only, revokes consent, and keeps demo", () => {
    grantConsent(consentKv, NOW);
    store.real.put(rec("real", "r1", { x: fact(1) }));
    store.real.put(rec("real", "r2", { x: fact(2) }));
    store.demo.put(rec("demo", "d1", { x: demoVal(1) }));
    ui();
    click("[data-act='clear-real']");
    click("[data-act='clear-real-yes']");
    expect(store.real.list()).toEqual([]);
    expect(store.demo.list().map((r) => r.id)).toEqual(["d1"]);
    expect(readConsent(consentKv)).toBe(false);
    expect($("[data-consent='real']")).not.toBeNull();
    expect(() => store.real.put(rec("real", "r3", { x: fact(3) }))).toThrow(StoreError);
  });
});

// Local snapshots: automatic copies in IndexedDB (keep last N), restore with confirm, same exclusions as the encrypted backup,
// reminder OFF by default, save to file, no network. Demo and real stay apart; real needs the tick.
import "fake-indexeddb/auto";
import Dexie from "dexie";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { store, consentKv, prefs, snapshotRepo } from "../src/ui/state";
import { grantConsent, revokeConsent } from "../src/core/consent";
import { DexieRepo } from "../src/adapters/dexie";
import { StoreRepo } from "../src/adapters/storeRepo";
import { MemoryKV, Store } from "../src/core/store";
import { MemorySnapshotRepo, autoDue, newestFirst, parseSnapshotFile, pruneSnapshots, reminderDue, restoreSnapshot, scrubRealParts, snapshotToFile, takeSnapshot, type Snapshot } from "../src/core/snapshots";
import { runAutoSnapshot } from "../src/ui/snapshotsUi";
import { secretKey } from "../src/core/connections";
import type { FieldValue, Namespace, TMRecord } from "../src/core/types";
import { PACKS } from "../src/i18n/packs";

const NOW = "2026-10-26T10:00:00.000Z";
const rec = (ns: Namespace, id: string, extra: Record<string, unknown> = {}): TMRecord => {
  const label = ns === "demo" ? "DEMO" : "FACT"; const values: Record<string, FieldValue> = { "goal.title": { state: "value", value: `T-${id}`, label } };
  for (const [k, x] of Object.entries(extra)) values[k] = { state: "value", value: x, label } as FieldValue;
  return { id, entity: "goal", ns, ownerId: ns === "demo" ? "demo-user" : "owner", schemaVersion: 1, createdAt: NOW, values };
};
const at = (h: number) => new Date(Date.UTC(2026, 9, 26, h, 0, 0));
const mkStore = () => { const s = new Store(new MemoryKV(), { consentKv: new MemoryKV() }); return s; };
const settle = (ms = 60) => new Promise((r) => setTimeout(r, ms));

describe("takeSnapshot (pure)", () => {
  it("copies demo and real into their own parts; real only when the tick is given; nothing to save returns null", async () => {
    const s = mkStore(); const repo = new StoreRepo(s); const snaps = new MemorySnapshotRepo();
    expect(await takeSnapshot(repo, snaps, { reason: "manual", keep: 5, realOk: true })).toBeNull();
    s.demo.put(rec("demo", "a"));
    const snap = (await takeSnapshot(repo, snaps, { reason: "manual", keep: 5, realOk: false, now: at(9) }))!;
    expect(snap.demo.ns).toBe("demo"); expect(snap.demo.count).toBe(1); expect(snap.real).toBeNull();
  });
  it("keeps only the newest N and deletes older ones", async () => {
    const s = mkStore(); s.demo.put(rec("demo", "a")); const repo = new StoreRepo(s); const snaps = new MemorySnapshotRepo();
    for (let i = 0; i < 6; i++) { s.demo.put(rec("demo", "a", { "goal.why": `v${i}` })); await takeSnapshot(repo, snaps, { reason: "manual", keep: 3, realOk: false, now: at(i + 1) }); }
    const l = newestFirst(await snaps.list()); expect(l.length).toBe(3); expect(l.map((x) => x.createdAt.slice(11, 13))).toEqual(["06", "05", "04"]);
    expect(await pruneSnapshots(snaps, 1)).toBe(2); expect((await snaps.list()).length).toBe(1);
  });
  it("an automatic snapshot is skipped when nothing changed; a manual one is always kept", async () => {
    const s = mkStore(); s.demo.put(rec("demo", "a")); const repo = new StoreRepo(s); const snaps = new MemorySnapshotRepo();
    expect(await takeSnapshot(repo, snaps, { reason: "auto", keep: 5, realOk: false, now: at(1) })).not.toBeNull();
    expect(await takeSnapshot(repo, snaps, { reason: "auto", keep: 5, realOk: false, now: at(2) })).toBeNull();
    expect(await takeSnapshot(repo, snaps, { reason: "manual", keep: 5, realOk: false, now: at(3) })).not.toBeNull();
    s.demo.put(rec("demo", "b")); expect(await takeSnapshot(repo, snaps, { reason: "auto", keep: 5, realOk: false, now: at(4) })).not.toBeNull();
  });
  it("autoDue: due when none, not due inside 20 hours, due after", () => {
    const snap = { id: "x", createdAt: at(0).toISOString(), reason: "auto", demo: {} as never, real: null } as Snapshot;
    expect(autoDue([], at(1))).toBe(true); expect(autoDue([snap], at(19))).toBe(false); expect(autoDue([snap], new Date(at(0).getTime() + 20 * 3600_000))).toBe(true);
  });
});

describe("real data and secrets", () => {
  it("real part exists only with the tick; records of real never appear when the tick is off", async () => {
    const kv = new MemoryKV(); const s = new Store(new MemoryKV(), { consentKv: kv }); grantConsent(kv, NOW);
    s.demo.put(rec("demo", "d")); s.real.put(rec("real", "r")); const repo = new StoreRepo(s); const snaps = new MemorySnapshotRepo();
    const withTick = (await takeSnapshot(repo, snaps, { reason: "manual", keep: 5, realOk: true, now: at(1) }))!;
    expect(withTick.real!.ns).toBe("real"); expect(withTick.real!.count).toBe(1); expect(withTick.demo.records.every((r) => r.ns === "demo")).toBe(true);
    const noTick = (await takeSnapshot(repo, snaps, { reason: "manual", keep: 5, realOk: false, now: at(2) }))!;
    expect(noTick.real).toBeNull(); expect(JSON.stringify(noTick)).not.toContain("T-r");
  });
  it("only records are copied: keys, secrets and settings never enter a snapshot", async () => {
    const kv = new MemoryKV(); kv.set(secretKey("aiAssistant"), "sk-live-SECRETVALUE-123456"); kv.set("tm:ui:conn:approved:aiAssistant", "x"); kv.set("tm:consent:real:v1", "x");
    const s = new Store(new MemoryKV(), { consentKv: kv }); s.demo.put(rec("demo", "d")); const snaps = new MemorySnapshotRepo();
    const snap = (await takeSnapshot(new StoreRepo(s), snaps, { reason: "manual", keep: 5, realOk: true }))!; const text = JSON.stringify(snap);
    expect(text).not.toMatch(/SECRETVALUE|tm:secret|tm:ui:|tm:consent|passphrase/i);
    expect(Object.keys(snap.demo).sort()).toEqual(["app", "checksum", "count", "createdAt", "ns", "records", "schemaVersion"]);
  });
  it("scrubRealParts removes every real copy (used after the user deletes real data)", async () => {
    const kv = new MemoryKV(); const s = new Store(new MemoryKV(), { consentKv: kv }); grantConsent(kv, NOW); s.demo.put(rec("demo", "d")); s.real.put(rec("real", "r"));
    const snaps = new MemorySnapshotRepo(); await takeSnapshot(new StoreRepo(s), snaps, { reason: "manual", keep: 5, realOk: true, now: at(1) }); await takeSnapshot(new StoreRepo(s), snaps, { reason: "manual", keep: 5, realOk: true, now: at(2) });
    expect(await scrubRealParts(snaps)).toBe(2); expect(JSON.stringify(await snaps.list())).not.toContain("T-r"); expect(await scrubRealParts(snaps)).toBe(0);
  });
});

describe("restoreSnapshot", () => {
  const setup = async () => {
    const kv = new MemoryKV(); const s = new Store(new MemoryKV(), { consentKv: kv }); grantConsent(kv, NOW); s.demo.put(rec("demo", "d1")); s.real.put(rec("real", "r1"));
    const snaps = new MemorySnapshotRepo(); const snap = (await takeSnapshot(new StoreRepo(s), snaps, { reason: "manual", keep: 5, realOk: true, now: at(1) }))!;
    return { kv, s, snap };
  };
  it("replaces current data with the snapshot, each kind in its own place", async () => {
    const { s, snap } = await setup(); s.demo.put(rec("demo", "d2")); s.demo.delete("d1"); s.real.put(rec("real", "r2"));
    const r = await restoreSnapshot(new StoreRepo(s), snap, true);
    expect(r).toEqual({ demo: 1, real: 1, realSkipped: false }); expect(s.demo.list().map((x) => x.id)).toEqual(["d1"]); expect(s.real.list().map((x) => x.id)).toEqual(["r1"]);
  });
  it("without the tick the real part is skipped and real data is left alone", async () => {
    const { kv, s, snap } = await setup(); s.real.put(rec("real", "r2")); revokeConsent(kv);
    const r = await restoreSnapshot(new StoreRepo(s), snap, false);
    expect(r.realSkipped).toBe(true); expect(r.real).toBe(0); expect(s.demo.list().map((x) => x.id)).toEqual(["d1"]);
    grantConsent(kv, NOW); expect(s.real.list().map((x) => x.id).sort()).toEqual(["r1", "r2"]);
  });
  it("a damaged snapshot changes nothing", async () => {
    const { s, snap } = await setup(); s.demo.put(rec("demo", "keep-me"));
    const bad: Snapshot = { ...snap, demo: { ...snap.demo, checksum: "00000000" } };
    await expect(restoreSnapshot(new StoreRepo(s), bad, true)).rejects.toThrow(); expect(s.demo.get("keep-me")).not.toBeNull();
    const wrongNs: Snapshot = { ...snap, real: snap.demo }; await expect(restoreSnapshot(new StoreRepo(s), wrongNs, true)).rejects.toThrow(); expect(s.demo.get("keep-me")).not.toBeNull();
  });
});

describe("save to file", () => {
  it("round trip; a plain demo backup or random text is refused", async () => {
    const s = mkStore(); s.demo.put(rec("demo", "a")); const snaps = new MemorySnapshotRepo(); const snap = (await takeSnapshot(new StoreRepo(s), snaps, { reason: "manual", keep: 5, realOk: false }))!;
    const text = JSON.stringify(snapshotToFile(snap)); const back = parseSnapshotFile(text);
    expect(back.demo.records).toEqual(snap.demo.records); expect(back.real).toBeNull();
    expect(() => parseSnapshotFile(JSON.stringify(snap.demo))).toThrow(); expect(() => parseSnapshotFile("nope")).toThrow();
    expect(() => parseSnapshotFile(text.replace('"count":1', '"count":2'))).toThrow();
  });
});

describe("reminder rule", () => {
  it("off by default; needs data; due with no file or after 7 days; snooze for the day", () => {
    const now = new Date(2026, 9, 26, 12, 0, 0);
    expect(reminderDue(false, true, null, now)).toBe(false); expect(reminderDue(true, false, null, now)).toBe(false);
    expect(reminderDue(true, true, null, now)).toBe(true);
    expect(reminderDue(true, true, new Date(now.getTime() - 3 * 86400_000).toISOString(), now)).toBe(false);
    expect(reminderDue(true, true, new Date(now.getTime() - 8 * 86400_000).toISOString(), now)).toBe(true);
    expect(reminderDue(true, true, null, now, "2026-10-26")).toBe(false); expect(reminderDue(true, true, null, now, "2026-10-25")).toBe(true);
  });
});

describe("IndexedDB adapter", () => {
  it("snapshots persist and an existing version-1 database keeps its records after the upgrade", async () => {
    const name = `snapdb-${Math.random().toString(36).slice(2)}`;
    const v1 = new Dexie(name); v1.version(1).stores({ records: "[ns+id], ns, entity" }); await v1.table("records").put(rec("demo", "old")); v1.close();
    const repo = new DexieRepo(name); expect((await repo.list("demo")).map((r) => r.id)).toEqual(["old"]);
    const snaps = repo.snapshots(); const s = mkStore(); s.demo.put(rec("demo", "a"));
    const snap = (await takeSnapshot(new StoreRepo(s), snaps, { reason: "manual", keep: 2, realOk: false, now: at(1) }))!;
    await takeSnapshot(new StoreRepo(s), snaps, { reason: "manual", keep: 2, realOk: false, now: at(2) }); await takeSnapshot(new StoreRepo(s), snaps, { reason: "manual", keep: 2, realOk: false, now: at(3) });
    repo.close(); const again = new DexieRepo(name).snapshots(); const l = newestFirst(await again.list());
    expect(l.length).toBe(2); expect(l.some((x) => x.id === snap.id)).toBe(false); expect(l[0]!.demo.records[0]!.id).toBe("a");
  });
});

describe("screen (More > Demo & real data)", () => {
  const app = () => document.getElementById("app")!;
  const go = (hash: string) => { location.hash = hash; render(); };
  beforeEach(async () => {
    localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear(); revokeConsent(consentKv);
    for (const x of await snapshotRepo!.list()) await snapshotRepo!.delete(x.id);
    document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
  });
  it("defaults: automatic on, keep 5, reminder OFF", () => {
    expect(prefs.snapAuto).toBe(true); expect(prefs.snapKeep).toBe(5); expect(prefs.backupRemind).toBe(false);
    go("#/more/data"); expect((app().querySelector("[data-snap=auto]") as HTMLInputElement).checked).toBe(true); expect((app().querySelector("[data-snap=remind]") as HTMLInputElement).checked).toBe(false);
    expect((app().querySelector("[data-snap=keep]") as HTMLSelectElement).value).toBe("5");
  });
  it("take a snapshot, see it listed with counts, restore only after the confirm, and today's data is saved first", async () => {
    store.demo.put(rec("demo", "a")); go("#/more/data");
    (app().querySelector("[data-act=snap-take]") as HTMLElement).click(); await settle();
    expect(app().querySelector("[data-snap=msg]")!.textContent).toBe("Snapshot saved."); expect(app().querySelectorAll("[data-snapshot]").length).toBe(1);
    expect(app().querySelector("[data-snapshot]")!.textContent).toMatch(/manual · 1 demo, 0 real/);
    store.demo.put(rec("demo", "b"));
    (app().querySelector("[data-act=snap-restore]") as HTMLElement).click();
    expect(app().querySelector("[data-snap=confirm-box]")!.textContent).toMatch(/replaces your current demo data/); expect(store.demo.list().length).toBe(2);
    (app().querySelector("[data-act=snap-confirm]") as HTMLElement).click(); await settle(120);
    expect(store.demo.list().map((r) => r.id)).toEqual(["a"]);
    expect((await snapshotRepo!.list()).some((x) => x.reason === "before_restore" && x.demo.count === 2)).toBe(true);
    render(); // the app redraws on the hash event; the restore message survives the redraw
    expect(app().querySelector("[data-snap=msg]")!.textContent).toMatch(/Restored: 1 demo and 0 real/);
  });
  it("cancel leaves everything as it was; nothing to save says so", async () => {
    go("#/more/data"); (app().querySelector("[data-act=snap-take]") as HTMLElement).click(); await settle();
    expect(app().querySelector("[data-snap=msg]")!.textContent).toMatch(/nothing to save/); expect(app().querySelectorAll("[data-snapshot]").length).toBe(0);
    store.demo.put(rec("demo", "a")); go("#/more/data"); (app().querySelector("[data-act=snap-take]") as HTMLElement).click(); await settle();
    (app().querySelector("[data-act=snap-restore]") as HTMLElement).click(); (app().querySelector("[data-act=snap-cancel]") as HTMLElement).click();
    expect(app().querySelector("[data-snap=confirm-box]")).toBeNull(); expect(store.demo.list().length).toBe(1);
  });
  it("runAutoSnapshot: takes one when due, skips when switched off or too soon", async () => {
    store.demo.put(rec("demo", "a")); prefs.snapAuto = false; expect(await runAutoSnapshot()).toBeNull(); prefs.snapAuto = true;
    expect(await runAutoSnapshot()).not.toBeNull(); store.demo.put(rec("demo", "b")); expect(await runAutoSnapshot()).toBeNull(); // newest is under 20 hours old
    expect((await snapshotRepo!.list()).length).toBe(1);
  });
  it("reminder: no card by default; with it on and no file saved it shows on Today, can be snoozed, and goes away after a file is saved", () => {
    store.demo.put(rec("demo", "a")); go("#/today"); expect(app().querySelector("[data-backup-reminder]")).toBeNull();
    prefs.backupRemind = true; go("#/today"); expect(app().querySelector("[data-backup-reminder]")).not.toBeNull();
    (app().querySelector("[data-act=reminder-later]") as HTMLElement).click(); render(); expect(app().querySelector("[data-backup-reminder]")).toBeNull();
    prefs.remindSnoozedOn = ""; prefs.fileBackupAt = new Date().toISOString(); go("#/today"); expect(app().querySelector("[data-backup-reminder]")).toBeNull();
  });
  it("deleting real data also removes real copies from snapshots", async () => {
    grantConsent(consentKv, NOW); localStorage.setItem("tm:ui:dataMode", "real"); store.real.put(rec("real", "r")); store.demo.put(rec("demo", "d"));
    go("#/more/data"); (app().querySelector("[data-act=snap-take]") as HTMLElement).click(); await settle();
    expect((await snapshotRepo!.list())[0]!.real!.count).toBe(1);
    (app().querySelector("[data-act=clear-real]") as HTMLElement).click(); render(); (app().querySelector("[data-act=clear-real-yes]") as HTMLElement).click(); await settle();
    expect((await snapshotRepo!.list()).every((x) => x.real === null)).toBe(true);
  });
});

describe("text, size, network", () => {
  it("every snap key exists in en, bn and mix with Latin digits; targets are 44 px; no network call", () => {
    for (const k of Object.keys(PACKS.en).filter((x) => x.startsWith("snap."))) for (const l of ["en", "bn", "mix"] as const) { expect((PACKS[l] as Record<string, string>)[k], `${l}:${k}`).toBeTruthy(); expect((PACKS[l] as Record<string, string>)[k]).not.toMatch(/[০-৯]/); }
    const css = readFileSync("src/ui/styles.css", "utf8"); const part = css.slice(css.indexOf("/* local snapshots"));
    expect(part).toMatch(/\.snap-btns \.btn\{[^}]*min-height:44px/); expect(part).toMatch(/\.snap-check\{[^}]*min-height:44px/); expect(part).not.toMatch(/animation|transition/);
    const src = ["src/core/snapshots.ts", "src/ui/snapshotsUi.ts", "src/adapters/dexie.ts"].map((f) => readFileSync(f, "utf8")).join("\n");
    expect(src).not.toMatch(/fetch\(|XMLHttpRequest|https?:\/\/|sendBeacon|WebSocket/);
  });
});

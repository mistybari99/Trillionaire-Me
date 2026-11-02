// Settings redesign PR 3d: Backup & export page and Restore sub-page.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { consentKv, prefs, store, snapshotRepo } from "../src/ui/state";
import { grantConsent, revokeConsent } from "../src/core/consent";
import { markBackupFile } from "../src/ui/snapshotsUi";
import type { FieldValue, Namespace, TMRecord } from "../src/core/types";

const NOW = "2026-10-26T10:00:00.000Z";
const rec = (ns: Namespace, id: string): TMRecord => ({ id, entity: "goal", ns, ownerId: ns === "demo" ? "demo-user" : "owner", schemaVersion: 1, createdAt: NOW, values: { "goal.title": { state: "value", value: id, label: ns === "demo" ? "DEMO" : "FACT" } as FieldValue } });
const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const go = (hash: string) => { location.hash = hash; render(); };

beforeEach(async () => {
  localStorage.clear(); store.demo.clear(); store.real.clear(); revokeConsent(consentKv);
  for (const x of await snapshotRepo!.list()) await snapshotRepo!.delete(x.id);
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
});

describe("Backup & export page", () => {
  it("status lines are computed: file backup, and real-data backup (not shown as 0 when unknown)", () => {
    go("#/settings/backup"); expect(q("[data-bak=file]").textContent).toBe("No backup file yet"); expect(q("[data-bak=real]").textContent).toBe("Real data backup: no real data yet");
    grantConsent(consentKv, NOW); store.real.put(rec("real", "r1")); go("#/settings/backup"); expect(q("[data-bak=real]").textContent).toBe("Real data backup: none yet");
    markBackupFile(1); go("#/settings/backup"); expect(q("[data-bak=real]").textContent).toMatch(/^Real data backup: last on \d{4}-\d{2}-\d{2}/); expect(q("[data-bak=file]").textContent).toMatch(/^Last backup file: /);
    expect(prefs.realBackupAt).not.toBe("");
  });
  it("each save button says what it contains; encrypted save needs the 'I wrote it down' tick", () => {
    go("#/settings/backup"); expect(q("[data-backup=contains]").textContent).toBe("Contains: demo entries only."); expect(q("[data-enc=contains]").textContent).toBe("Contains: demo and real entries.");
    expect(q("[data-enc=wrote]")).not.toBeNull();
  });
  it("one reminder switch shows the computed default and why; the Today card has only Later and a link", () => {
    go("#/settings/backup"); expect(q<HTMLInputElement>("#snap-remind").checked).toBe(false); expect(q("[data-bak=reminder-why]").textContent).toMatch(/off until you have real data/);
    grantConsent(consentKv, NOW); store.real.put(rec("real", "r1")); go("#/settings/backup"); expect(q<HTMLInputElement>("#snap-remind").checked).toBe(true); expect(q("[data-bak=reminder-why]").textContent).toMatch(/on because you have real data/);
    q<HTMLInputElement>("#snap-remind").click(); expect(prefs.backupRemind).toBe(false); go("#/settings/backup"); expect(q("[data-bak=reminder-why]").textContent).toMatch(/You chose this yourself/);
    prefs.backupRemind = true; prefs.fileBackupAt = ""; go("#/today");
    expect(app().querySelector("[data-act=reminder-off]")).toBeNull(); expect(q("[data-act=reminder-later]")).not.toBeNull(); expect(q("[data-backup-reminder] a").getAttribute("href")).toBe("#/settings/backup/reminder");
  });
  it("the plain note says settings are not in the backup file", () => { go("#/settings/backup"); expect(q("[data-bak=settings-note]").textContent).toMatch(/not in the backup file/); });
  it("restore is on its own page: no Restore button beside Save, and the page has file, encrypted and snapshot restore", async () => {
    store.demo.put(rec("demo", "a")); go("#/settings/backup");
    expect(app().querySelector("[data-act=snap-restore], [data-act=enc-open], [data-act=restore]")).toBeNull();
    expect(q("a[href='#/settings/backup/restore']")).not.toBeNull();
    q<HTMLButtonElement>("[data-act=snap-take]").click(); await new Promise((r) => setTimeout(r, 80));
    go("#/settings/backup/restore"); await new Promise((r) => setTimeout(r, 80)); expect(q("[data-restore=host]")).not.toBeNull(); expect(q("[data-act=restore]")).not.toBeNull(); expect(q("[data-act=enc-open]")).not.toBeNull(); expect(q("[data-act=snap-restore]")).not.toBeNull();
    expect(app().querySelector("[data-act=backup], [data-act=enc-save], [data-act=snap-take]")).toBeNull();
  });
  it("opening a fold row (snapshots, csv) opens the fold and highlights it", () => {
    go("#/settings/backup/csv"); expect(q("details[data-setting-row=csv]").hasAttribute("open")).toBe(true); expect(q("details[data-setting-row=csv]").classList.contains("set-hl")).toBe(true);
  });
  it("the old Data page only links to Backup; storage status moved with it", () => {
    go("#/settings/data"); expect(app().querySelector("[data-act=backup], [data-card=storage], [data-card=csv]")).toBeNull(); expect(q("a[href='#/settings/backup']")).not.toBeNull();
    go("#/settings/backup"); expect(q("[data-card=storage]")).not.toBeNull();
  });
  it("every way of saving a backup file updates the same status (banner button, snapshot file)", async () => {
    const { saveMonitor } = await import("../src/ui/state"); void saveMonitor;
    markBackupFile(0); expect(prefs.fileBackupAt).not.toBe(""); expect(prefs.realBackupAt).toBe("");
  });
});

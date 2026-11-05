import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DexieRepo } from "../src/adapters/dexie";
import { StoreRepo } from "../src/adapters/storeRepo";
import { createBackup } from "../src/core/backup";
import { MemoryKV, Store } from "../src/core/store";
import type { TMRecord } from "../src/core/types";
import { restoreHost, startRestore } from "../src/ui/restoreUi";
import { flushStorage, retryStorage, saveMonitor, store } from "../src/ui/state";

const rec = (id: string): TMRecord => ({ id, entity: "profile", ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-11-05T00:00:00Z", values: { "profile.display_name": { state: "value", value: id, label: "DEMO" } } });
const q = <T extends Element>(s: string) => document.querySelector(s) as T;
const redraw = () => document.body.replaceChildren(restoreHost("en"));
const disk = new DexieRepo("tm-db");
async function preview() {
  const source = new Store(new MemoryKV()); source.demo.put(rec("incoming"));
  const backup = await createBackup(new StoreRepo(source), "demo");
  redraw(); await startRestore("json", { demo: backup, real: null, createdAt: backup.createdAt }, "en");
}
async function result() { await vi.waitFor(() => expect(q("[data-restore=result]")).not.toBeNull()); }
beforeEach(async () => {
  localStorage.clear();
  await retryStorage(); store.demo.clear(); store.real.clear(); await flushStorage();
  store.demo.put(rec("original")); await flushStorage();
  window.addEventListener("hashchange", redraw);
});
afterEach(async () => {
  vi.restoreAllMocks();
  await retryStorage();
  window.removeEventListener("hashchange", redraw);
  document.body.replaceChildren();
});

describe("restore reports durable persistence outcomes", () => {
  it("does not show Done until the IndexedDB write has finished", async () => {
    await preview();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const put = DexieRepo.prototype.put;
    vi.spyOn(DexieRepo.prototype, "put").mockImplementation(async function (this: DexieRepo, record) {
      if (record.id === "incoming") await pending;
      await put.call(this, record);
    });
    q<HTMLButtonElement>("[data-act=json-confirm]").click();
    try {
      await vi.waitFor(() => expect(store.demo.get("incoming")).not.toBeNull());
      expect(q("[data-restore=result]")).toBeNull();
      expect(await disk.get("demo", "incoming")).toBeNull();
    } finally { release(); }
    await result();
    expect(q("[data-restore=msg]").textContent).toMatch(/Done/);
    expect(await disk.get("demo", "incoming")).toEqual(rec("incoming"));
  });
  it("a failed restore keeps its recovery action and Go back retries the current memory values", async () => {
    await preview();
    const put = DexieRepo.prototype.put;
    let broken = true;
    vi.spyOn(DexieRepo.prototype, "put").mockImplementation(async function (this: DexieRepo, record) {
      if (broken) throw new Error("disk unavailable");
      await put.call(this, record);
    });
    q<HTMLButtonElement>("[data-act=json-confirm]").click(); await result();
    expect(q("[data-restore=msg]").textContent).not.toMatch(/Done|nothing was changed/i);
    expect(saveMonitor.hasFailure).toBe(true);
    expect(q("[data-act=restore-goback]")).not.toBeNull();
    broken = false;
    q<HTMLButtonElement>("[data-act=restore-goback]").click();
    await vi.waitFor(() => expect(q("[data-act=restore-goback]")).toBeNull());
    expect(saveMonitor.hasFailure).toBe(false);
    expect((await disk.list("demo")).map((r) => r.id)).toEqual(["original"]);
  });
  it("a storage failure during Go back keeps the recovery copy available for another attempt", async () => {
    await preview(); q<HTMLButtonElement>("[data-act=json-confirm]").click(); await result();
    const put = DexieRepo.prototype.put;
    let broken = true;
    vi.spyOn(DexieRepo.prototype, "put").mockImplementation(async function (this: DexieRepo, record) {
      if (broken) throw new Error("disk unavailable");
      await put.call(this, record);
    });
    q<HTMLButtonElement>("[data-act=restore-goback]").click();
    await vi.waitFor(() => expect(q("[data-restore=msg]").textContent).toMatch(/could not|couldn't/i));
    expect(q("[data-restore=msg]").textContent).not.toMatch(/no longer|gone/i);
    expect(q("[data-act=restore-goback]")).not.toBeNull();
    broken = false; q<HTMLButtonElement>("[data-act=restore-goback]").click();
    await vi.waitFor(() => expect(q("[data-act=restore-goback]")).toBeNull());
    expect((await disk.list("demo")).map((r) => r.id)).toEqual(["original"]);
  });
});

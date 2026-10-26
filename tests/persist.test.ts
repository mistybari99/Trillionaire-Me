import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { DexieRepo } from "../src/adapters/dexie";
import { MirrorKV, hydrate, mirrorToRepo } from "../src/core/persist";
import { MemoryKV, Store } from "../src/core/store";
import type { TMRecord } from "../src/core/types";

const rec = (id: string): TMRecord => ({ id, entity: "profile", ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-10-23T00:00:00Z", values: { "profile.display_name": { state: "value", value: id, label: "DEMO" }, "profile.birth_year": { state: "unknown" } } });
let n = 0;
const settle = () => new Promise((r) => setTimeout(r, 30));

describe("G2 app storage on IndexedDB", () => {
  it("writes survive an app restart; unknown stays unknown; delete and clear persist", async () => {
    const name = `p${n++}`;
    const repo1 = new DexieRepo(name); const s1 = new Store(new MirrorKV(new MemoryKV(), mirrorToRepo(repo1)));
    s1.demo.put(rec("a")); s1.demo.put(rec("b")); s1.demo.delete("b"); await settle();
    const repo2 = new DexieRepo(name); const mem2 = new MemoryKV(); await hydrate(mem2, repo2, new MemoryKV());
    const s2 = new Store(mem2); expect(s2.demo.list().map((r) => r.id)).toEqual(["a"]);
    expect(s2.demo.get("a")!.values["profile.birth_year"]).toEqual({ state: "unknown" });
    s1.demo.clear(); await settle(); expect(await new DexieRepo(name).list("demo")).toEqual([]);
  });
  it("old localStorage records are imported once and never overwrite newer data", async () => {
    const legacy = new MemoryKV(); legacy.set("tm:demo:old", JSON.stringify(rec("old"))); legacy.set("tm:demo:a", JSON.stringify({ ...rec("a"), createdAt: "2000-01-01T00:00:00Z" }));
    const repo = new DexieRepo(`p${n++}`); await repo.put(rec("a"));
    const mem = new MemoryKV(); await hydrate(mem, repo, legacy);
    expect(new Store(mem).demo.list().map((r) => r.id).sort()).toEqual(["a", "old"]);
    expect(new Store(mem).demo.get("a")!.createdAt).toBe("2026-10-23T00:00:00Z");
    expect((await repo.list("demo")).length).toBe(2);
  });
  it("real namespace stays locked through the mirror", async () => {
    const s = new Store(new MirrorKV(new MemoryKV(), mirrorToRepo(new DexieRepo(`p${n++}`))));
    expect(() => s.real.put({ ...rec("x"), ns: "real" })).toThrow(/locked/);
  });
});

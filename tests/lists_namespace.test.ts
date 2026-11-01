// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryKV, Store } from "../src/core/store";
import { grantConsent } from "../src/core/consent";
import { moveListsToReal, ownOptions, saveOwnOption, saveSearchResults, savedSearchResults } from "../src/core/savedLists";
import type { Suggestion } from "../src/core/research";
import { consentKv, prefs, repairListNamespaces, store } from "../src/ui/state";

const at = new Date("2026-11-01T00:00:00Z");
const sug: Suggestion[] = [1, 2].map((i) => ({ id: `o${i}`, title: `T${i}`, snippet: "s", sourceName: "Wikipedia", sourceUrl: "https://en.wikipedia.org/wiki/T", fetchedAt: "2026-11-01T00:00:00Z" }));
const mk = () => { const ck = new MemoryKV(); grantConsent(ck, "2026-11-01T00:00:00Z"); return new Store(new MemoryKV(), { consentKv: ck }); };

describe("own options and saved results follow the active namespace", () => {
  it("real store: records are real, labelled FACT/EXTERNAL, owner is the owner, demo untouched", () => {
    const s = mk();
    expect(saveOwnOption(s.real, "skill.name", "Bookkeeping", at)).toBe("saved");
    saveSearchResults(s.real, "skill.name", "tailoring", sug, at);
    expect(s.demo.list()).toEqual([]);
    const recs = s.real.list(); expect(recs).toHaveLength(2);
    for (const r of recs) { expect(r.ns).toBe("real"); expect(r.ownerId).toBe("owner"); for (const v of Object.values(r.values)) if (v.state === "value") expect(v.label).not.toBe("DEMO"); }
    expect(ownOptions(s.real, "skill.name")).toEqual(["Bookkeeping"]); expect(ownOptions(s.demo, "skill.name")).toEqual([]);
    expect(savedSearchResults(s.real, "skill.name", "Tailoring")).toHaveLength(2); expect(savedSearchResults(s.demo, "skill.name", "tailoring")).toEqual([]);
  });
  it("demo store keeps DEMO labels; real writes without the tick are refused", () => {
    const s = mk(); saveOwnOption(s.demo, "skill.name", "Sewing", at);
    for (const v of Object.values(s.demo.list()[0]!.values)) if (v.state === "value") expect(v.label).toBe("DEMO");
    const locked = new Store(new MemoryKV());
    expect(() => saveOwnOption(locked.real, "skill.name", "x", at)).toThrow();
  });
  it("repair moves only these two kinds from demo to real, re-labels, drops secret-looking text, deletes demo copies", () => {
    const s = mk(); saveOwnOption(s.demo, "skill.name", "Bookkeeping", at); saveSearchResults(s.demo, "skill.name", "tailoring", sug, at);
    s.demo.put({ id: "other", entity: "profile", ns: "demo", ownerId: "demo-user", schemaVersion: 1, createdAt: at.toISOString(), values: { "profile.display_name": { state: "value", value: "d", label: "DEMO" } } });
    expect(moveListsToReal(s.demo, s.real)).toBe(2);
    expect(s.demo.list().map((r) => r.id)).toEqual(["other"]);
    expect(s.real.list().map((r) => r.entity).sort()).toEqual(["own_option", "saved_search"]);
    expect(moveListsToReal(s.demo, s.real)).toBe(0);
  });
});

describe("one-time repair on this device", () => {
  beforeEach(() => { localStorage.clear(); store.demo.clear(); store.real.clear(); });
  it("runs once in real mode with the tick; a later demo-mode list is never moved", () => {
    grantConsent(consentKv, "2026-11-01T00:00:00Z"); prefs.dataMode = "real";
    saveOwnOption(store.demo, "skill.name", "Old", at);
    expect(repairListNamespaces()).toBe(1); expect(store.real.list()).toHaveLength(1); expect(store.demo.list()).toHaveLength(0);
    prefs.dataMode = "demo"; saveOwnOption(store.demo, "skill.name", "DemoOnly", at); prefs.dataMode = "real";
    expect(repairListNamespaces()).toBe(0); expect(store.demo.list()).toHaveLength(1);
  });
  it("in demo mode nothing moves, and the flag is still set", () => {
    prefs.dataMode = "demo"; saveOwnOption(store.demo, "skill.name", "A", at);
    expect(repairListNamespaces()).toBe(0); expect(store.demo.list()).toHaveLength(1); expect(localStorage.getItem("tm:ui:listsNs")).toBe("v1");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../src/app";
import { store } from "../src/ui/state";
import { MemoryKV, Store } from "../src/core/store";
import { oldestToRemove, ownOptions, saveOwnOption, saveSearchResults, savedSearchResults, termKey, LIST_CAP } from "../src/core/savedLists";
import { research, type Suggestion, type SearchProvider } from "../src/core/research";

const at = (i: number) => new Date(Date.UTC(2026, 9, 24, 0, 0, i));
const sug = (n: number): Suggestion[] => Array.from({ length: n }, (_, i) => ({ id: `opt-${i + 1}`, title: `T${i}`, snippet: "s", sourceName: "Wikipedia", sourceUrl: `https://en.wikipedia.org/wiki/T${i}`, fetchedAt: "2026-10-24T00:00:00.000Z" }));
const fresh = () => new Store(new MemoryKV()).demo;

describe("TM-TST-053 O7 own options (per field, cap 20)", () => {
  it("keeps the newest 20 and removes the oldest first", () => {
    const s = fresh();
    for (let i = 0; i < 23; i++) expect(saveOwnOption(s, "interest.topic", `opt ${i}`, at(i))).toBe("saved");
    const list = ownOptions(s, "interest.topic");
    expect(list).toHaveLength(LIST_CAP);
    expect(list[0]).toBe("opt 22"); expect(list).not.toContain("opt 0"); expect(list).not.toContain("opt 2"); expect(list).toContain("opt 3");
  });
  it("the cap is per field: another field keeps its own list", () => {
    const s = fresh();
    for (let i = 0; i < 25; i++) saveOwnOption(s, "skill.name", `skill ${i}`, at(i));
    saveOwnOption(s, "goal.title", "one goal", at(0));
    expect(ownOptions(s, "skill.name")).toHaveLength(LIST_CAP); expect(ownOptions(s, "goal.title")).toEqual(["one goal"]);
  });
  it("saving the same term again moves it to newest, no duplicate", () => {
    const s = fresh();
    saveOwnOption(s, "value.name", "Honesty", at(1)); saveOwnOption(s, "value.name", "Patience", at(2));
    expect(saveOwnOption(s, "value.name", "  honesty ", at(3))).toBe("duplicate_updated");
    // same term (case and spaces ignored) is one entry, moved to the top, showing the latest typed spelling
    expect(ownOptions(s, "value.name")).toEqual(["honesty", "Patience"]);
  });
  it("empty and password-like input is never stored", () => {
    const s = fresh();
    expect(saveOwnOption(s, "skill.name", "   ", at(1))).toBe("empty");
    expect(saveOwnOption(s, "skill.name", "password: abc123", at(2))).toBe("secret");
    expect(ownOptions(s, "skill.name")).toEqual([]);
  });
  it("oldestToRemove is deterministic on equal times", () => {
    const items = Array.from({ length: 22 }, (_, i) => ({ id: `x${String(i).padStart(2, "0")}`, at: "2026-10-24T00:00:00.000Z" }));
    expect(oldestToRemove(items, 20)).toEqual(["x00", "x01"]);
    expect(oldestToRemove(items.slice(0, 20), 20)).toEqual([]);
  });
});

describe("TM-TST-053 O7 saved offline search list (per field, cap 20)", () => {
  it("stores tapped results under the normalised term and reads them back", () => {
    const s = fresh();
    saveSearchResults(s, "interest.topic", "  Bookkeeping ", sug(3), at(1));
    expect(termKey("  Bookkeeping ")).toBe("bookkeeping");
    expect(savedSearchResults(s, "interest.topic", "bookkeeping").map((o) => o.title)).toEqual(["T0", "T1", "T2"]);
    expect(savedSearchResults(s, "skill.name", "bookkeeping")).toEqual([]);
  });
  it("a single result is never saved (research never pads a list)", () => {
    const s = fresh(); saveSearchResults(s, "interest.topic", "x", sug(1), at(1));
    expect(savedSearchResults(s, "interest.topic", "x")).toEqual([]);
  });
  it("cap 20 per field; oldest term removed first", () => {
    const s = fresh();
    for (let i = 0; i < 21; i++) saveSearchResults(s, "interest.topic", `term ${i}`, sug(2), at(i));
    expect(s.list().filter((r) => r.entity === "saved_search")).toHaveLength(LIST_CAP);
    expect(savedSearchResults(s, "interest.topic", "term 0")).toEqual([]);
    expect(savedSearchResults(s, "interest.topic", "term 1")).toHaveLength(2);
  });
  it("offline read path: a saved term makes no fetch, even when online", async () => {
    const s = fresh(); saveSearchResults(s, "interest.topic", "bookkeeping", sug(3), at(1));
    const p: SearchProvider = { name: "spy", search: vi.fn(async () => []) };
    const r = await research("bookkeeping", true, { provider: p, online: () => true, cached: (q) => savedSearchResults(s, "interest.topic", q) });
    expect(r.status).toBe("options"); expect(r.options).toHaveLength(3); expect(p.search).not.toHaveBeenCalled();
    const off = await research("bookkeeping", true, { provider: p, online: () => false, cached: (q) => savedSearchResults(s, "interest.topic", q) });
    expect(off.options).toHaveLength(3); expect(p.search).not.toHaveBeenCalled();
  });
  it("an unsaved term online still goes to the provider", async () => {
    const p: SearchProvider = { name: "spy", search: vi.fn(async () => [{ title: "A", snippet: "", sourceName: "S", sourceUrl: "https://e.org/a" }, { title: "B", snippet: "", sourceName: "S", sourceUrl: "https://e.org/b" }]) };
    const r = await research("new", true, { provider: p, online: () => true, cached: () => [] });
    expect(r.status).toBe("options"); expect(p.search).toHaveBeenCalledTimes(1);
  });
});

describe("TM-TST-053 O7 render: own options show above the suggestions", () => {
  beforeEach(() => { localStorage.clear(); store.demo.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); });
  it("a saved own option is listed in the topic field panel, and a new typed one can be saved", () => {
    saveOwnOption(store.demo, "interest.topic", "Pottery at home", new Date("2026-10-24T00:00:00Z"));
    location.hash = "#/diary/intake/2"; render();
    const panel = document.querySelector("[data-suggest='interest.topic']")!;
    const own = panel.querySelector("[data-own-list='interest.topic']")!;
    expect(own.textContent).toContain("Pottery at home");
    // the own list comes before the search button
    expect(own.compareDocumentPosition(panel.querySelector("[data-act=suggest-go]")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    (document.getElementById("f-interest.topic") as HTMLInputElement).value = "Calligraphy";
    (panel.querySelector("[data-act=suggest-save-own]") as HTMLButtonElement).click();
    expect(panel.querySelector("[data-own-list='interest.topic']")!.textContent).toContain("Calligraphy");
    expect(ownOptions(store.demo, "interest.topic")).toEqual(["Calligraphy", "Pottery at home"]);
  });
  it("clicking an own option fills the input", () => {
    saveOwnOption(store.demo, "interest.topic", "Pottery at home", new Date("2026-10-24T00:00:00Z"));
    location.hash = "#/diary/intake/2"; render();
    (document.querySelector("[data-own-option='interest.topic']") as HTMLButtonElement).click();
    expect((document.getElementById("f-interest.topic") as HTMLInputElement).value).toBe("Pottery at home");
  });
});

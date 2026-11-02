// D-D hadith reader: off by default, local pack only, provenance mandatory, never a fatwa. The shipped pack has 0 entries on purpose (licence unclear).
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { disableHadith, enableHadith, loadPack, readHadithOn, searchHadith, whyInvalid, type HadithEntry } from "../src/core/hadith";
import pack from "../src/library/hadithPack.json";
import { PACKS } from "../src/i18n/packs";

const good = (o: Partial<HadithEntry> = {}): HadithEntry => ({ id: "t1", topics: ["intention"], en: "SAMPLE TEXT FOR TEST ONLY", collection: "Test collection", number: "1", source: "Test source", sourceUrl: "https://example.org/x", licence: "Test licence", status: "unreviewed", ...o });
describe("hadith core", () => {
  it("the shipped pack is empty (nothing invented) and loads cleanly", () => { expect(loadPack(pack)).toEqual({ entries: [], rejected: [] }); });
  it("provenance is mandatory: each missing part rejects the entry", () => {
    expect(whyInvalid(good())).toBeNull();
    for (const k of ["collection", "number", "source", "licence", "sourceUrl", "id"] as const) expect(whyInvalid(good({ [k]: "" } as never)), k).toBe(k);
    expect(whyInvalid(good({ sourceUrl: "http://x" }))).toBe("sourceUrl"); expect(whyInvalid(good({ topics: [] }))).toBe("topics"); expect(whyInvalid(good({ topics: ["nope" as never] }))).toBe("topics");
    expect(whyInvalid(good({ en: "" }))).toBe("no_text"); expect(whyInvalid(good({ grade: "x" }))).toBe("grade_needs_grader"); expect(whyInvalid(good({ status: "reviewed" }))).toBe("reviewed_without_reviewer");
    expect(whyInvalid(good({ status: "reviewed", reviewer: "Name" }))).toBeNull();
  });
  it("duplicates and bad entries are reported, good ones kept", () => {
    const r = loadPack({ entries: [good(), good(), good({ id: "t2", licence: "" })] }); expect(r.entries.length).toBe(1); expect(r.rejected.map((x) => x.why)).toEqual(["duplicate", "licence"]);
  });
  it("search by word and by topic", () => {
    const es = [good({ id: "a", en: "alpha one" }), good({ id: "b", en: "beta", topics: ["family"] })];
    expect(searchHadith(es, "alpha", null).map((e) => e.id)).toEqual(["a"]); expect(searchHadith(es, "", "family").map((e) => e.id)).toEqual(["b"]); expect(searchHadith(es, "zzz", null)).toEqual([]);
  });
  it("switch: off by default, on, off", () => { expect(readHadithOn(consentKv)).toBe(false); enableHadith(consentKv, "2026-11-02T00:00:00Z"); expect(readHadithOn(consentKv)).toBe(true); disableHadith(consentKv); expect(readHadithOn(consentKv)).toBe(false); });
});
const $ = (s: string) => document.querySelector(s);
const go = (h: string) => { location.hash = h; render(); };
beforeEach(() => { localStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); });
describe("hadith page", () => {
  it("off by default: explanation, no content, no network; the tick turns it on; empty pack says why", async () => {
    const f = vi.fn(); vi.stubGlobal("fetch", f);
    go("#/hadith"); expect($("[data-hadith-off]")).not.toBeNull(); expect($("[data-hadith-banner]")!.textContent).toMatch(/Not a fatwa/);
    ($('[data-act="hadith-on"]') as HTMLButtonElement).click(); expect(readHadithOn(consentKv)).toBe(false);
    (document.getElementById("hadith-tick") as HTMLInputElement).checked = true; ($('[data-act="hadith-on"]') as HTMLButtonElement).click(); render();
    expect(readHadithOn(consentKv)).toBe(true); await new Promise((r) => setTimeout(r, 30));
    expect($("[data-hadith-empty=pack]")).not.toBeNull(); expect(f).not.toHaveBeenCalled(); vi.unstubAllGlobals();
    ($('[data-act="hadith-off"]') as HTMLButtonElement).click(); render(); expect($("[data-hadith-off]")).not.toBeNull();
  });
  it("linked from Settings guides; strings in all languages, Latin digits, loanword rule", () => {
    go("#/settings/about"); expect($('a[href="#/hadith"]')).not.toBeNull();
    for (const k of Object.keys(PACKS.en).filter((x) => x.startsWith("hd."))) for (const l of ["en", "bn", "mix"] as const) { const s = (PACKS[l] as Record<string, string>)[k]!; expect(s.length).toBeGreaterThan(1); if (l !== "en") expect(s, k).not.toMatch(/[০-৯]/); }
    for (const l of ["bn", "mix"]) { localStorage.setItem("tm:ui:lang", l); go("#/hadith"); expect(document.querySelectorAll("h1").length).toBe(1); }
  });
});

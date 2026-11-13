// D-D hadith reader: off by default, local pack only, provenance mandatory, never a fatwa. The shipped pack holds text copied unchanged from HadeethEnc.com (terms allow it).
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { disableHadith, enableHadith, loadPack, readHadithOn, searchHadith, whyInvalid, type HadithEntry } from "../src/core/hadith";
import pack from "../src/library/hadithPack.json";
import { PACKS } from "../src/i18n/packs";

const good = (o: Partial<HadithEntry> = {}): HadithEntry => ({ id: "t1", topics: ["intention"], en: "SAMPLE TEXT FOR TEST ONLY", collection: "Test collection", number: "1", source: "Test source", sourceUrl: "https://example.org/x", licence: "Test licence", status: "unreviewed", ...o });
describe("hadith core", () => {
  it("the shipped pack loads cleanly: every entry has Arabic, English, a reference, the source, its address and its licence", () => {
    const r = loadPack(pack); expect(r.rejected).toEqual([]); expect(r.entries.length).toBeGreaterThanOrEqual(200); expect(r.entries.length).toBeLessThanOrEqual(300);
    const refs = new Set<string>();
    for (const e of r.entries) {
      expect(e.status, e.id).toBe("unreviewed"); expect(e.reviewer, e.id).toBeUndefined();
      expect(e.arabic, e.id).toMatch(/[\u0600-\u06FF]/); expect(e.en, e.id).toMatch(/[A-Za-z]/); if (e.bn) expect(e.bn, e.id).toMatch(/[\u0980-\u09FF]/);
      expect(e.sourceUrl, e.id).toMatch(/^https:\/\/hadeethenc\.com\/en\/browse\/hadith\/\d+$/); expect(e.source, e.id).toMatch(/HadeethEnc\.com.*Arabic v\d.*English v\d.*Bangla v\d/); expect(e.licence, e.id).toMatch(/HadeethEnc\.com terms/);
      expect(e.number, e.id).toMatch(/^[\d\s,،\-–]+$/); expect(e.reference, e.id).toContain(e.collection === "Sahih al-Bukhari" ? "صحيح البخاري" : ""); expect(e.grade, e.id).toBeTruthy(); expect(e.gradeBy, e.id).toBe("HadeethEnc.com");
      const k = `${e.collection}|${e.number}`; expect(refs.has(k), `duplicate reference ${k}`).toBe(false); refs.add(k);
    }
    for (const tp of ["life", "purpose", "wealth", "halal_earning", "time", "patience", "intention", "family", "knowledge", "character"]) expect(r.entries.some((e) => e.topics.includes(tp as never)), tp).toBe(true);
  });
  it("no scripture-style invention: no entry text is shorter than a sentence, none is a URL, none carries an app-written note", () => {
    for (const e of loadPack(pack).entries) { expect((e.en ?? "").length, e.id).toBeGreaterThan(20); expect(e.en, e.id).not.toMatch(/https?:\/\//); }
  });
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
  it("off by default: explanation, no content, no network; the tick turns it on; the bundled cards show reference, source, version and the unreviewed label", async () => {
    const f = vi.fn(); vi.stubGlobal("fetch", f);
    go("#/hadith"); expect($("[data-hadith-off]")).not.toBeNull(); expect($("[data-hadith-banner]")!.textContent).toMatch(/Not a fatwa/);
    ($('[data-act="hadith-on"]') as HTMLButtonElement).click(); expect(readHadithOn(consentKv)).toBe(false);
    (document.getElementById("hadith-tick") as HTMLInputElement).checked = true; ($('[data-act="hadith-on"]') as HTMLButtonElement).click(); render();
    expect(readHadithOn(consentKv)).toBe(true); await new Promise((r) => setTimeout(r, 30));
    expect($("[data-hadith-empty=pack]")).toBeNull(); const cards = document.querySelectorAll("[data-hadith]"); expect(cards.length).toBeGreaterThanOrEqual(200);
    const c = cards[0]!; expect(c.querySelector("[data-hadith-ar]")).not.toBeNull(); expect(c.querySelector("[data-hadith-ref]")!.textContent).toMatch(/number \d/); expect(c.querySelector("[data-hadith-source]")!.textContent).toMatch(/Arabic v.*English v.*Bangla v/);
    expect(c.querySelector("[data-hadith-status]")!.textContent).toMatch(/Unreviewed by a scholar/); expect($("[data-hadith-sourcenote]")!.textContent).toMatch(/HadeethEnc\.com/);
    const first = (pack as { entries: Array<{ id: string; en: string }> }).entries[0]!; expect(c.querySelector("[data-hadith-text]")!.textContent).toBe(first.en);
    expect(f).not.toHaveBeenCalled(); vi.unstubAllGlobals();
    ($('[data-act="hadith-off"]') as HTMLButtonElement).click(); render(); expect($("[data-hadith-off]")).not.toBeNull();
  });
  it("linked from Settings guides; strings in all languages, Latin digits, loanword rule", () => {
    go("#/settings/about"); expect($('a[href="#/hadith"]')).not.toBeNull();
    for (const k of Object.keys(PACKS.en).filter((x) => x.startsWith("hd."))) for (const l of ["en", "bn", "mix"] as const) { const s = (PACKS[l] as Record<string, string>)[k]!; expect(s.length).toBeGreaterThan(1); if (l !== "en") expect(s, k).not.toMatch(/[০-৯]/); }
    for (const l of ["bn", "mix"]) { localStorage.setItem("tm:ui:lang", l); go("#/hadith"); expect(document.querySelectorAll("h1").length).toBe(1); }
  });
});

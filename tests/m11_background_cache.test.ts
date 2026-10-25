// M11 (owner, 24 Oct 2026): Wikipedia runs only after a tap. The first successful search is saved on the phone
// and shown offline later. No search at app start. Labels say "saved in background", never "internet needed".
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { research, type Suggestion } from "../src/core/research";
import { saveSearchResults, savedSearchResults, type ListStore } from "../src/core/savedLists";
import { wikipedia } from "../src/adapters/wikipedia";
import { MODULES } from "../src/modules/capability";
import { PACKS } from "../src/i18n/packs";
import type { TMRecord } from "../src/core/types";

const ROOT = resolve(__dirname, "..");
const memStore = (): ListStore & { rows: Map<string, TMRecord> } => {
  const rows = new Map<string, TMRecord>();
  return { rows, list: () => [...rows.values()], put: (r) => { rows.set(r.id, r); }, delete: (id) => { rows.delete(id); } };
};
const fakeFetch = (titles: string[]) => vi.fn(async (_u: string) => ({ ok: true, json: async () => ({ query: { search: titles.map((title) => ({ title, snippet: `about ${title}` })) } }) }));
const at = (n: number) => new Date(Date.UTC(2026, 9, 24, 10, n));

describe("M11 Wikipedia cache: first tap saves, next time works offline", () => {
  it("the first online search is one provider call; the result is then saved on the phone", async () => {
    const s = memStore();
    const f = fakeFetch(["Book keeping", "Accounting", "Ledger"]);
    const r = await research("accounting", true, { provider: wikipedia("en", f), online: () => true });
    expect(r.status).toBe("options");
    expect(f).toHaveBeenCalledTimes(1);
    saveSearchResults(s, "skill.name", "accounting", r.options, at(1));
    expect(savedSearchResults(s, "skill.name", "accounting")).toHaveLength(3);
  });

  it("the same term later, offline, is shown from the phone and makes no network call", async () => {
    const s = memStore();
    const first = fakeFetch(["Book keeping", "Accounting"]);
    const online = await research("accounting", true, { provider: wikipedia("en", first), online: () => true });
    saveSearchResults(s, "skill.name", "accounting", online.options, at(1));
    const never = fakeFetch([]);
    const offline = await research("Accounting ", true, {
      provider: wikipedia("en", never), online: () => false, cached: (q) => savedSearchResults(s, "skill.name", q),
    });
    expect(offline.status).toBe("options");
    expect(offline.options.map((o: Suggestion) => o.title)).toEqual(["Book keeping", "Accounting"]);
    expect(never).not.toHaveBeenCalled();
  });

  it("a saved term is also read without a network call when the phone is online", async () => {
    const s = memStore();
    saveSearchResults(s, "skill.name", "cooking", [
      { id: "a", title: "Cooking", snippet: "x", sourceName: "Wikipedia", sourceUrl: "https://en.wikipedia.org/wiki/Cooking", fetchedAt: "2026-10-24" },
      { id: "b", title: "Chef", snippet: "y", sourceName: "Wikipedia", sourceUrl: "https://en.wikipedia.org/wiki/Chef", fetchedAt: "2026-10-24" },
    ], at(2));
    const f = fakeFetch(["x", "y"]);
    const r = await research("cooking", true, { provider: wikipedia("en", f), online: () => true, cached: (q) => savedSearchResults(s, "skill.name", q) });
    expect(r.status).toBe("options");
    expect(f).not.toHaveBeenCalled();
  });

  it("nothing is sent without a real tap (no network at app start)", async () => {
    const f = fakeFetch(["a", "b"]);
    await expect(research("accounting", false, { provider: wikipedia("en", f), online: () => true })).rejects.toThrow(/explicit click/);
    expect(f).not.toHaveBeenCalled();
  });

  it("only the UI click handler calls the Wikipedia adapter; no other source file reaches the network", () => {
    const files: string[] = [];
    const walk = (d: string) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith(".ts")) files.push(p); } };
    walk(resolve(ROOT, "src"));
    const withFetch = files.filter((p) => /\bfetch\(|XMLHttpRequest|new WebSocket/.test(readFileSync(p, "utf8"))).map((p) => p.replace(ROOT + "/", ""));
    expect(withFetch).toEqual(["src/adapters/wikipedia.ts"]);
    const callers = files.filter((p) => /\bwikipedia\(/.test(readFileSync(p, "utf8")) && !p.endsWith("adapters/wikipedia.ts")).map((p) => p.replace(ROOT + "/", ""));
    expect(callers).toEqual(["src/ui/screens.ts"]);
    const screens = readFileSync(resolve(ROOT, "src/ui/screens.ts"), "utf8");
    const onlyInClick = screens.indexOf("wikipedia(lang") > screens.indexOf("const go = h(");
    expect(onlyInClick).toBe(true);
  });
});

describe("M11 labels and M-list status", () => {
  const m11 = MODULES.find((m) => m.id === "M11")!;
  const m23 = MODULES.find((m) => m.id === "M23")!;

  it("status tag reads exactly the owner's label in Bangla and English", () => {
    expect(m11.statuses).toContain("saved-background");
    expect(PACKS.en["cap.saved-background"]).toBe("Wikipedia (saved in background)");
    expect(PACKS.bn["cap.saved-background"]).toBe("উইকিপিডিয়া (ব্যাকগ্রাউন্ডে সংরক্ষিত)");
    expect(PACKS.mix["cap.saved-background"].length).toBeGreaterThan(0);
  });

  it("no module says 'internet needed' any more (keys stay; wording changes)", () => {
    for (const m of MODULES) expect(m.statuses, m.id).not.toContain("internet-needed");
    for (const m of [m11, m23]) {
      expect(`${m.note.en} ${m.name.en}`, m.id).not.toMatch(/internet/i);
      expect(`${m.note.bn} ${m.name.bn}`, m.id).not.toMatch(/ইন্টারনেট/);
    }
  });

  it("M11 note explains first-tap save and no search at start, in plain Bangla with Latin digits", () => {
    expect(m11.note.en).toMatch(/saved on this phone/);
    expect(m11.note.en).toMatch(/No search runs when the app opens/);
    expect(m11.note.bn).toMatch(/ফোনে সংরক্ষিত/);
    expect(m11.note.bn).toMatch(/২-৩|2-3/);
    expect(m11.note.bn).not.toMatch(/[০-৯]/);
  });

  it("the consent line tells the user results are saved on the phone (en + bn)", () => {
    expect(PACKS.en["suggest.consent"]).toMatch(/saved on this phone/);
    expect(PACKS.bn["suggest.consent"]).toMatch(/ফলাফল এই ফোনে সংরক্ষিত থাকবে/);
  });
});

// Content pack: schema, copy guard, parity (bn / en), no external address, loader behaviour. Offline; reads public/content from disk.
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { validatePack, loadContentPacks, ensureContentPacks, tipsFor, resetContentPacksForTest, packTipsOf, type PackFiles } from "../src/library/packs";
import { TIPS, TOPICS, TIP_KINDS, tipsOf } from "../src/library/topics";
import { GLOSSARY } from "../src/catalog/glossary";

const DIR = resolve(process.cwd(), "public/content"); // vitest runs from the repo root
const NEW_TOPICS = ["money", "time", "habits", "knowledge", "health", "relationships"];
const readPack = (name: string) => JSON.parse(readFileSync(`${DIR}/${name}`, "utf8"));
const pack = readPack("pack-001.json");

// Same word lists as tests/copy_review.test.ts (banned shame / grade / streak words, in English and Bangla).
const BANNED_EN = /\b(shame\w*|guilt\w*|fail\w*|grade\w*|rank\w*|streak\w*|score\w*|rating\w*|penalt\w*|punish\w*|lazy|overdue|behind|lost|mistake\w*|bad|red)\b/i;
const BANNED_BN = ["ব্যর্থ", "ফেল", "লজ্জা", "ভুল", "স্কোর", "স্ট্রিক", "গ্রেড", "র্যাঙ্ক", "র্যাংক", "রেটিং", "শিকল", "শাস্তি", "খারাপ", "পিছিয়ে", "লাল"];
const letterWord = (w: string) => new RegExp(`(?<![\\p{L}\\p{M}])${w}(?![\\p{L}\\p{M}])`, "u");
// Money guard (CLAUDE §6): no return figures, no wealth promises, no percentages or currency amounts.
const MONEY_EN = /%|৳|\bBDT\b|\breturns?\b|guarantee|profit|invest|interest|\bROI\b/i;
const MONEY_BN = /(?<![\p{L}\p{M}])(কোটি|লাখ|মুনাফা|বিনিয়োগ|সুদ|গ্যারান্টি|রিটার্ন)(?![\p{L}\p{M}])/u;
// Deen guard for the pack: no scripture names or text (D-D).
const SCRIPTURE = /কুরআন|হাদিস|সূরা|আয়াত|আল্লাহ|quran|qur'an|hadith|surah|ayah|allah/i;
const EXTERNAL = /https?:|\bwww\.|\/\/|ftp:/i;
const BN = /[ঀ-৿]/;
const labels = (s: string) => s.split("|").map((x) => x.trim());

function allTipText(p: { tips: { title: { bn: string; en: string }; how: { bn: string; en: string }; diagram: { bn: string; en: string } }[] }) {
  return p.tips.flatMap((t) => [t.title.bn, t.title.en, t.how.bn, t.how.en, t.diagram.bn, t.diagram.en]);
}

describe("content pack files", () => {
  const packNames = readdirSync(DIR).filter((f) => f.endsWith(".json")).sort();
  it("every JSON file in the folder is a pack that validates", () => {
    expect(packNames).toContain("pack-001.json");
    for (const name of packNames) {
      const res = validatePack(readPack(name), new Set(TIPS.map((t) => t.id)));
      expect(res.ok, res.ok ? "" : res.errors.join("; ")).toBe(true);
    }
  });

  it("the folder holds only pack files (pack-*.json), nothing else", () => {
    for (const f of readdirSync(DIR)) expect(f, f).toMatch(/^pack-[a-z0-9-]{1,30}\.json$/);
  });

  it("pack-001 ships at least 30 new tips, covering all six requested topics", () => {
    expect(pack.tips.length).toBeGreaterThanOrEqual(30);
    for (const topic of NEW_TOPICS) expect(pack.tips.filter((t: { topic: string }) => t.topic === topic).length, topic).toBeGreaterThanOrEqual(5);
  });

  it("pack-001 is marked pending reviewer and has no duplicate ids", () => {
    expect(pack.reviewStatus).toBe("pending_reviewer");
    const ids = pack.tips.map((t: { id: string }) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(TIPS.some((t) => t.id === id), id).toBe(false);
  });
});

describe("content pack copy guard and parity", () => {
  it("no banned English or Bangla words in pack text", () => {
    for (const s of allTipText(pack)) {
      expect(BANNED_EN.exec(s)?.[0], s).toBeUndefined();
      const plain = s.replace(/[‌‍]/g, "");
      expect(BANNED_BN.find((w) => letterWord(w).test(plain)), s).toBeUndefined();
    }
  });

  it("no money promises, percentages or currency figures in pack text", () => {
    for (const s of allTipText(pack)) { expect(MONEY_EN.exec(s)?.[0], s).toBeUndefined(); expect(MONEY_BN.exec(s)?.[0], s).toBeUndefined(); }
  });

  it("no scripture names or text in pack text (D-D)", () => {
    for (const s of allTipText(pack)) expect(SCRIPTURE.exec(s)?.[0], s).toBeUndefined();
    for (const f of readdirSync(DIR)) expect(SCRIPTURE.exec(readFileSync(`${DIR}/${f}`, "utf8")), f).toBeNull();
  });

  it("parity: every tip has bn and en title, how and diagram; label counts match; Bangla is Bangla, English is not", () => {
    for (const t of pack.tips) {
      expect(t.title.bn.trim() && t.title.en.trim(), t.id).toBeTruthy();
      expect(t.how.bn.trim() && t.how.en.trim(), t.id).toBeTruthy();
      expect(labels(t.diagram.bn).length, t.id).toBe(labels(t.diagram.en).length);
      expect(BN.test(t.title.bn) && BN.test(t.how.bn), t.id).toBe(true);
      expect(BN.test(t.title.en) || BN.test(t.how.en), t.id).toBe(false);
      expect(t.how.bn.length, t.id).toBeLessThan(260);
    }
  });

  it("new glossary terms are bilingual and still marked unreviewed", () => {
    for (const id of ["emergency_fund", "debt", "fixed_cost", "unknown_value"]) {
      const g = GLOSSARY.find((x) => x.id === id);
      expect(g, id).toBeTruthy();
      expect(BN.test(g!.term.bn) && BN.test(g!.meaning.bn), id).toBe(true);
      expect(g!.meaning.en.length, id).toBeGreaterThan(5);
      expect(g!.reviewed, id).toBe(false);
    }
  });
});

describe("content pack: no external address", () => {
  it("no http, https, www or protocol-relative address in any file under public/content", () => {
    for (const f of readdirSync(DIR)) expect(EXTERNAL.exec(readFileSync(`${DIR}/${f}`, "utf8"))?.[0], f).toBeUndefined();
  });
  it("the pack reader makes no network call (no fetch, XHR or socket in the loader)", () => {
    const src = readFileSync(resolve(process.cwd(), "src/library/packs.ts"), "utf8");
    expect(/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/.test(src)).toBe(false);
  });
});

describe("content pack validator rejects bad input", () => {
  const ok = () => JSON.parse(JSON.stringify(pack)) as typeof pack;
  const tip = () => ({ id: "x-test", topic: "money", tags: ["money"], title: { bn: "শিরোনাম", en: "Title" }, how: { bn: "একটা ছোট কাজ।", en: "A short task." }, diagram: { type: "steps", bn: "এক|দুই", en: "One|Two" } });
  const bad = (mut: (p: any) => void) => { const p = ok(); mut(p); return validatePack(p, new Set()); };

  it("accepts a well-formed pack", () => {
    expect(validatePack({ schema: "tm-content-pack", schemaVersion: 1, packId: "test-pack", reviewStatus: "pending_reviewer", license: "original", description: "d", tips: [tip()] }, new Set()).ok).toBe(true);
  });
  it("rejects wrong schema, version and review status", () => {
    expect(bad((p) => { p.schema = "x"; }).ok).toBe(false);
    expect(bad((p) => { p.schemaVersion = 2; }).ok).toBe(false);
    expect(bad((p) => { p.reviewStatus = "approved"; }).ok).toBe(false);
  });
  it("rejects unknown topics, unknown keys, duplicate and reserved ids", () => {
    expect(bad((p) => { p.tips[0].topic = "new-topic"; }).ok).toBe(false);
    expect(bad((p) => { p.tips[0].extra = 1; }).ok).toBe(false);
    expect(bad((p) => { p.tips.push({ ...p.tips[0] }); }).ok).toBe(false);
    const reservedId = TIPS[0]!.id;
    const res = validatePack({ ...ok(), tips: [{ ...tip(), id: reservedId }] }, new Set([reservedId]));
    expect(res.ok).toBe(false);
  });
  it("rejects a Bangla field with English text, a missing translation and a long Bangla line", () => {
    expect(bad((p) => { p.tips[0].how.bn = "Only English here"; }).ok).toBe(false);
    expect(bad((p) => { p.tips[0].title.en = ""; }).ok).toBe(false);
    expect(bad((p) => { p.tips[0].how.bn = "ক".repeat(260); }).ok).toBe(false);
  });
  it("rejects label-count mismatch, a matrix without four labels, and bad appLink", () => {
    expect(bad((p) => { p.tips[0].diagram.en = "One|Two|Three"; }).ok).toBe(false);
    expect(bad((p) => { p.tips[0].diagram = { type: "matrix", bn: "এক|দুই|তিন", en: "One|Two|Three" }; }).ok).toBe(false);
    expect(bad((p) => { p.tips[0].diagram = { type: "matrix", bn: "এক|দুই|তিন|চার", en: "One|Two|Three|Four" }; }).ok).toBe(true);
    expect(bad((p) => { p.tips[0].appLink = "https://example.com"; }).ok).toBe(false);
    expect(bad((p) => { p.tips[0].appLink = "#/diary/money"; }).ok).toBe(true);
  });
  it("rejects any URL-like text, even inside a how field", () => {
    expect(bad((p) => { p.tips[0].how.en = "See www.example.org for more"; }).ok).toBe(false);
    expect(bad((p) => { p.tips[0].how.en = "Read https://example.org"; }).ok).toBe(false);
  });
  it("reports every problem, not just the first", () => {
    const res = bad((p) => { p.tips[0].topic = "nope"; p.tips[0].tags = []; });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe("content pack loader (bundled files, on demand, never throws)", () => {
  const fromDisk: PackFiles = Object.fromEntries(readdirSync(DIR).map((f) => [`../../public/content/${f}`, async () => readPack(f)]));
  beforeEach(() => resetContentPacksForTest());

  it("loads every shipped pack tip with no errors", async () => {
    const r = await loadContentPacks(fromDisk);
    expect(r.errors).toEqual([]);
    const all = readdirSync(DIR).filter((f) => f.endsWith(".json")).reduce((n, f) => n + readPack(f).tips.length, 0);
    expect(r.tips.length).toBe(all);
  });
  it("a loader that throws becomes an error entry, not a throw", async () => {
    const r = await loadContentPacks({ "../../public/content/pack-x.json": async () => { throw new TypeError("gone"); } });
    expect(r.tips).toEqual([]);
    expect(r.errors[0]).toMatch(/gone/);
  });
  it("a broken pack is skipped and reported; a good pack beside it still loads", async () => {
    const broken = { schema: "tm-content-pack", schemaVersion: 1, packId: "broken-one", reviewStatus: "pending_reviewer", license: "original", description: "d", tips: [{ id: "bad-1", topic: "unknown", tags: ["x"], title: { bn: "ক", en: "a" }, how: { bn: "ক", en: "a" }, diagram: { type: "steps", bn: "a", en: "a" } }] };
    const r = await loadContentPacks({ "../../public/content/pack-a.json": async () => broken, "../../public/content/pack-001.json": async () => pack });
    expect(r.errors.some((e) => e.startsWith("pack-a.json:"))).toBe(true);
    expect(r.tips.length).toBe(pack.tips.length);
  });
  it("a file that is not named pack-*.json is refused", async () => {
    const r = await loadContentPacks({ "../../public/content/secret.json": async () => pack });
    expect(r.tips).toEqual([]);
    expect(r.errors[0]).toMatch(/bad file name/);
  });

  it("on-demand load adds pack tips to their topic, and the bundled tips stay", async () => {
    const before = tipsOf("money").length;
    await new Promise<void>((done) => ensureContentPacks(done, fromDisk));
    expect(packTipsOf("money").length).toBeGreaterThan(0);
    expect(tipsFor("money").length).toBe(before + packTipsOf("money").length);
    expect(tipsOf("money").length).toBe(before);
    expect(TOPICS.some((t) => t.id === "money")).toBe(true);
  });
});

describe("pack tips in the app", () => {
  it("a topic page shows pack tips once the packs have loaded (English)", async () => {
    const { render } = await import("../src/app");
    resetContentPacksForTest();
    localStorage.clear(); localStorage.setItem("tm:ui:lang", "en");
    const fromDisk: PackFiles = Object.fromEntries(readdirSync(DIR).map((f) => [`../../public/content/${f}`, async () => readPack(f)]));
    await new Promise<void>((done) => ensureContentPacks(done, fromDisk));
    document.body.innerHTML = '<div id="app"></div>';
    location.hash = "#/topic/money";
    render();
    expect(document.body.textContent).toContain("Sort spending into three groups");
    expect(document.body.textContent).toContain("Unknown is not zero");
    resetContentPacksForTest();
  });
});


// ---- knowledge packs 003+ : every topic filled, kinds, reviewer flag, guards on EVERY pack ----
describe("knowledge packs (003 and later)", () => {
  const names = readdirSync(DIR).filter((f) => /^pack-\d+\.json$/.test(f) && Number(f.slice(5, 8)) >= 3).sort();
  const packs = names.map((n) => ({ name: n, p: readPack(n) }));
  const tips = packs.flatMap((x) => x.p.tips as any[]);
  const every = (f: (s: string, id: string) => void) => { for (const t of tips) for (const s of [t.title.bn, t.title.en, t.how.bn, t.how.en, t.diagram.bn, t.diagram.en]) f(s, t.id); };

  it("has at least 120 new entries and all packs are pending reviewer", () => {
    expect(names.length).toBeGreaterThanOrEqual(5);
    expect(tips.length).toBeGreaterThanOrEqual(120);
    for (const x of packs) expect(x.p.reviewStatus, x.name).toBe("pending_reviewer");
    expect(new Set(tips.map((t) => t.id)).size).toBe(tips.length);
  });
  it("every entry has kind and reviewer=pending; learn entries name a source kind; other kinds have none", () => {
    for (const t of tips) {
      expect(TIP_KINDS, t.id).toContain(t.kind);
      expect(t.reviewer, t.id).toBe("pending");
      if (t.kind === "learn") expect(["general", "wikipedia", "reviewer"], t.id).toContain(t.source); else expect(t.source, t.id).toBeUndefined();
    }
  });
  it("every one of the 21 topics has explain, steps, example, watchout and learn entries", () => {
    for (const tp of TOPICS) for (const k of TIP_KINDS) expect(tips.some((t) => t.topic === tp.id && t.kind === k), `${tp.id}/${k}`).toBe(true);
  });
  it("every topic opens with at least 4 tips (bundled + packs)", () => {
    for (const tp of TOPICS) expect(tipsOf(tp.id).length + tips.filter((t) => t.topic === tp.id).length, tp.id).toBeGreaterThanOrEqual(4);
  });
  it("requested areas are covered: money (budget, saving, debt, income), digital safety, goals, decisions, time, habits, learning, health, relationships, career", () => {
    const tagged = (topic: string, tag: string) => tips.filter((t) => t.topic === topic && t.tags.includes(tag)).length;
    for (const tag of ["budget", "savings", "debt", "income"]) expect(tagged("money", tag), tag).toBeGreaterThanOrEqual(3);
    expect(tagged("environment", "digital-safety")).toBeGreaterThanOrEqual(5);
    expect(tagged("skills", "career")).toBeGreaterThanOrEqual(4);
    for (const topic of ["goal-strategy", "decisions", "time", "habits", "knowledge", "health", "relationships"]) expect(tips.filter((t) => t.topic === topic).length, topic).toBeGreaterThanOrEqual(5);
  });
  it("no banned shame / grade / streak words, in English or Bangla, in any new pack", () => {
    every((s, id) => {
      expect(BANNED_EN.exec(s)?.[0], id + ": " + s).toBeUndefined();
      const plain = s.replace(/[‌‍]/g, "");
      expect(BANNED_BN.find((w) => letterWord(w).test(plain)), id + ": " + s).toBeUndefined();
    });
  });
  it("no returns, interest, profit, percentages, currency or guarantees in any new pack", () => {
    every((s, id) => { expect(MONEY_EN.exec(s)?.[0], id + ": " + s).toBeUndefined(); expect(MONEY_BN.exec(s)?.[0], id + ": " + s).toBeUndefined(); });
  });
  it("no scripture or hadith names, no clinical or investment-advice wording, no invented statistics", () => {
    const CLINICAL = /\b(diagnos(e|es|ed|ing)|prescri\w*|dosage|therapy for|cures?|cured)\b|রোগ নির্ণয় করুন/i;
    const STATS = /\b\d+(\.\d+)?\s*(percent|per cent|times more|x faster)\b|studies show|research shows|according to/i;
    every((s, id) => { expect(SCRIPTURE.exec(s)?.[0], id).toBeUndefined(); expect(CLINICAL.exec(s)?.[0], id + ": " + s).toBeUndefined(); expect(STATS.exec(s)?.[0], id + ": " + s).toBeUndefined(); });
  });
  it("Bangla uses Latin digits only (no Bangla digits) and English text has no Bangla letters", () => {
    for (const t of tips) {
      for (const s of [t.title.bn, t.how.bn, t.diagram.bn]) expect(/[০-৯]/.test(s), t.id + ": " + s).toBe(false);
      for (const s of [t.title.en, t.how.en, t.diagram.en]) expect(BN.test(s), t.id).toBe(false);
      expect(t.how.bn.length, t.id).toBeLessThan(260);
    }
  });
  it("health, emotions and money entries carry a non-clinical / not-advice stance somewhere in their topic", () => {
    expect(tips.some((t) => t.topic === "health" && /not (for )?diagnos|not treatment|doctor/i.test(t.how.en))).toBe(true);
    expect(tips.some((t) => t.topic === "emotions" && /not treatment|not diagnosis|counsellor/i.test(t.how.en))).toBe(true);
    expect(tips.some((t) => t.topic === "deen" && /no rulings|qualified scholar/i.test(t.how.en))).toBe(true);
  });
});

describe("pack validator: new optional fields", () => {
  const base = () => ({ schema: "tm-content-pack", schemaVersion: 1, packId: "test-pack", reviewStatus: "pending_reviewer", license: "original", description: "d",
    tips: [{ id: "x-new", topic: "money", tags: ["money"], title: { bn: "শিরোনাম", en: "Title" }, how: { bn: "একটা ছোট কাজ।", en: "A short task." }, diagram: { type: "steps", bn: "এক|দুই", en: "One|Two" }, kind: "learn", source: "general", reviewer: "pending" }] });
  const bad = (mut: (p: any) => void) => { const p = base(); mut(p); return validatePack(p, new Set()); };
  it("accepts kind, source and reviewer", () => { expect(validatePack(base(), new Set()).ok).toBe(true); });
  it("rejects an unknown kind, an unknown source, a source on a non-learn entry, and reviewer other than pending", () => {
    expect(bad((p) => { p.tips[0].kind = "essay"; }).ok).toBe(false);
    expect(bad((p) => { p.tips[0].source = "scripture"; }).ok).toBe(false);
    expect(bad((p) => { p.tips[0].kind = "steps"; }).ok).toBe(false);
    expect(bad((p) => { p.tips[0].reviewer = "approved"; }).ok).toBe(false);
  });
  it("the pack reader keeps kind, source and reviewer on the loaded tip", () => {
    const r = validatePack(base(), new Set());
    expect(r.ok && r.pack.tips[0]).toMatchObject({ kind: "learn", source: "general", reviewer: "pending" });
  });
});

describe("new entries on the topic screen", () => {
  it("a thin topic (Deen) shows pack entries with kind labels; Bangla view shows the Bangla kind label", async () => {
    const { render } = await import("../src/app");
    const fromDisk: PackFiles = Object.fromEntries(readdirSync(DIR).map((f) => [`../../public/content/${f}`, async () => readPack(f)]));
    resetContentPacksForTest();
    await new Promise<void>((done) => ensureContentPacks(done, fromDisk));
    document.body.innerHTML = '<div id="app"></div>';
    localStorage.clear(); localStorage.setItem("tm:ui:lang", "en"); location.hash = "#/topic/debt-none"; // unknown id falls back to the index
    location.hash = "#/topic/environment"; render();
    expect(document.querySelectorAll("[data-tip]").length).toBeGreaterThanOrEqual(10);
    expect(document.querySelector('[data-kind="watchout"]')?.textContent).toBe("Common slips");
    expect(document.querySelector('[data-source="reviewer"]')?.textContent).toContain("reviewer pending");
    localStorage.setItem("tm:ui:lang", "bn"); render();
    expect(document.querySelector('[data-kind="example"]')?.textContent).toBe("উদাহরণ");
    resetContentPacksForTest();
  });
});

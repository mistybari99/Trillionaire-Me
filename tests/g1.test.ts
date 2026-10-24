import { beforeEach, describe, expect, it } from "vitest";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { FIELDS, intakeSteps } from "../src/catalog/fields";
import { validateCatalog } from "../src/catalog/validate";
import { GLOSSARY } from "../src/catalog/glossary";
import { ENTITIES, orphanFields, WORSHIP_ENTITIES } from "../src/schema/entities";
import { MODULES, CAP_STATUSES } from "../src/modules/capability";
import { PACKS } from "../src/i18n/packs";
import { LOCALES } from "../src/i18n/registry";
import { LABELS, UNKNOWN_STATES, numberOrNull, sumKnown, type FieldValue, type TMRecord } from "../src/core/types";
import { checkFreeText, detectSecret, redact } from "../src/core/safety";
import { MemoryKV, Store, StoreError } from "../src/core/store";
import { exportNamespace } from "../src/core/export";
import { MAX_FIELDS_PER_SCREEN, completeness, nextStep, stepFields, type Answers } from "../src/core/intake";
import { srcFiles, read } from "./helpers";
import { t, setStrict } from "../src/i18n/t";
import { ROUTES, render } from "../src/app";
import type { Key } from "../src/i18n/packs";

const rec = (over: Partial<TMRecord> & { ns: "demo" | "real" }): TMRecord => ({ id: "r1", entity: "profile", ownerId: "u", schemaVersion: 1, createdAt: "2026-10-22T00:00:00Z", values: {}, ...over });
const demoVal = (value: unknown): FieldValue => ({ state: "value", value, label: "DEMO" });

// deterministic PRNG so property tests are reproducible
function rng(seed: number) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

describe("TM-TST-021 unknown is never zero (1000 random cases)", () => {
  it("numberOrNull / sumKnown never coerce unknown states", () => {
    const r = rng(21);
    for (let i = 0; i < 1000; i++) {
      const n = 1 + Math.floor(r() * 6);
      const vs: FieldValue[] = Array.from({ length: n }, () => r() < 0.4 ? { state: UNKNOWN_STATES[Math.floor(r() * 4)]! } : demoVal(Math.floor(r() * 1000)));
      const anyUnknown = vs.some((v) => v.state !== "value");
      const s = sumKnown(vs);
      if (anyUnknown) expect(s).toBeNull(); else expect(s).toBe(vs.reduce((a, v) => a + (v as { value: number }).value, 0));
      for (const v of vs) if (v.state !== "value") expect(numberOrNull(v)).toBeNull();
    }
    expect(numberOrNull(undefined)).toBeNull();
    expect(numberOrNull(demoVal("12"))).toBeNull(); // a string is not silently a number either
    expect(numberOrNull(demoVal(0))).toBe(0); // a genuine zero stays zero
  });
  it("every numeric/money/scale field offers all four unknown states", () => {
    for (const f of FIELDS.filter((x) => ["number", "money", "scale"].includes(x.type))) expect(f.unknownStates).toEqual(UNKNOWN_STATES);
  });
});

describe("TM-TST-034 secrets are rejected", () => {
  const bad = [
    "password: hunter2", "my pass is 123 passcode: abc", "পাসওয়ার্ড: ১২৩৪৫৬", "OTP 482913", "otp is 4829", "ওটিপি ৪৮২৯১৩", "verification code 551203",
    "CVV 123", "cvc: 4567", "সিভিভি ৩২১", "PIN 4821", "pin number 123456", "পিন ১২৩৪",
    "4111 1111 1111 1111", "5500-0000-0000-0004", "378282246310005", "4012888888881881",
    "seed phrase: apple banana", "recovery key abc", "private key is below", "রিকভারি ফ্রেজ লিখলাম",
    "abandon ability able about above absent absorb abstract absurd abuse access accident",
    "NID 1234567890123", "national id 19901234567890123", "জাতীয় পরিচয় ১২৩৪৫৬৭৮৯০", "passport number 123456789",
    "account number 1234567890123", "A/C 20501234567", "অ্যাকাউন্ট নম্বর ১২৩৪৫৬৭৮৯০১২", "pwd=letmein", "passwd secret1",
  ];
  const good = ["Bookkeeping for a small shop", "রান্না করতে ভালোবাসি", "I can do 10 minutes daily", "Family time 14 hours", "২০২৬-১০-২২", "Learn tajweed rules", "My pin on the map is the corner shop", "target 50 customers"];
  it("rejects 30 fixtures", () => { expect(bad.length).toBeGreaterThanOrEqual(30); for (const b of bad) { expect(detectSecret(b), b).not.toBeNull(); expect(checkFreeText(b).ok).toBe(false); expect(redact(b)).toBe("[redacted]"); } });
  it("does not block ordinary text", () => { for (const g of good) expect(checkFreeText(g).ok, g).toBe(true); });
  it("code has no logging, network or analytics sinks (0 occurrences)", () => {
    const re = /console\.|\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|navigator\.share|gtag|analytics/;
    // the Wikipedia adapter is the single allowed network file; everything else must stay offline-pure
    for (const f of srcFiles().filter((x) => x.endsWith(".ts") && !x.endsWith("adapters/wikipedia.ts"))) expect(re.test(read(f)), f).toBe(false);
  });
  it("exports redact secret-looking strings", () => {
    const store = new Store(new MemoryKV());
    store.demo.put(rec({ ns: "demo", values: { "profile.display_name": demoVal("password: abc123") } }));
    const ex = exportNamespace(store, "demo");
    expect(JSON.stringify(ex)).not.toContain("abc123");
  });
});

describe("TM-TST-143 demo/real isolation", () => {
  let kv: MemoryKV, store: Store;
  beforeEach(() => { kv = new MemoryKV(); store = new Store(kv); });
  it("fresh install is empty in both namespaces", () => { expect(store.real.list()).toEqual([]); expect(store.demo.list()).toEqual([]); expect(kv.keys()).toEqual([]); });
  it("real namespace is locked", () => { expect(() => store.real.put(rec({ ns: "real" }))).toThrow(StoreError); });
  it("even when unlocked, DEMO values and wrong-ns records are refused", () => {
    const open = new Store(kv, { realEnabled: true });
    expect(() => open.real.put(rec({ ns: "real", values: { x: demoVal("a") } }))).toThrow(/DEMO/);
    expect(() => open.real.put(rec({ ns: "demo" }))).toThrow(/cannot be written/);
    expect(() => open.demo.put(rec({ ns: "real" }))).toThrow(/cannot be written/);
    expect(() => open.demo.put(rec({ ns: "demo", values: { x: { state: "value", value: 1, label: "FACT" } } }))).toThrow(/only DEMO/);
  });
  it("no promote/copy/convert API exists", () => {
    const names = [...Object.getOwnPropertyNames(Object.getPrototypeOf(store.demo)), ...Object.getOwnPropertyNames(Store.prototype), ...Object.keys(store)].join(" ");
    expect(names).not.toMatch(/promote|convert|copyTo|moveTo|migrate/i);
  });
  it("demo export is marked and never carries real kind; real export contains no demo", () => {
    store.demo.put(rec({ ns: "demo", values: { a: demoVal("x") } }));
    expect(exportNamespace(store, "demo").kind).toBe("DEMO_NOT_REAL");
    expect(exportNamespace(store, "real").records).toEqual([]);
  });
  it("demo and real use disjoint key prefixes", () => {
    store.demo.put(rec({ ns: "demo" }));
    expect(kv.keys().every((k) => k.startsWith("tm:demo:"))).toBe(true);
    expect(store.real.list()).toEqual([]);
  });
  it("the demo seed is never written to storage on boot", () => {
    document.body.innerHTML = '<div id="app"></div>'; localStorage.clear(); location.hash = "#/today"; render();
    expect(Object.keys(localStorage).filter((k) => k.startsWith("tm:real:") || k.startsWith("tm:demo:"))).toEqual([]);
  });
});

describe("TM-TST-092/066 field catalog completeness", () => {
  const rep = validateCatalog();
  it("100% of fields have help, privacy, purpose, access, bn+en text", () => {
    mkdirSync("evidence", { recursive: true });
    writeFileSync("evidence/catalog-report.json", JSON.stringify(rep, null, 2));
    expect(rep.problems).toEqual([]);
    for (const k of ["withHelp", "withPrivacy", "withPurposeAndAccess", "withBilingualLabel", "withUnknownRule"] as const) expect(rep[k]).toBe(rep.fields);
    expect(rep.fields).toBeGreaterThanOrEqual(40);
  });
  it("no orphan fields; every entity has a module", () => { expect(orphanFields()).toEqual([]); for (const e of ENTITIES) expect(MODULES.some((m) => m.id === e.module)).toBe(true); });
  it("sensitive fields are never required (can be turned off)", () => {
    for (const f of FIELDS.filter((x) => ["health", "worship", "financial"].includes(x.privacy))) expect(f.requirement, f.id).not.toBe("required");
    for (const f of FIELDS.filter((x) => ["health", "worship"].includes(x.privacy))) expect(f.unknownStates).toContain("prefer_not");
  });
  it("catalog is business-neutral: no industry words in schema or catalog", () => {
    const text = JSON.stringify([FIELDS, ENTITIES]).toLowerCase();
    for (const w of ["bakery", "sweets", "restaurant", "retail", "clothing", "farm", "salon", "factory"]) expect(text).not.toContain(w);
  });
});

describe("TM-TST-161 glossary (automated part; reviewer sign-off still pending)", () => {
  it("covers finance, islamic and business domains in Bangla", () => {
    for (const d of ["finance", "islamic", "business"] as const) expect(GLOSSARY.filter((g) => g.domain === d).length).toBeGreaterThanOrEqual(8);
    for (const g of GLOSSARY) { expect(LOCALES.bn.scripts.test(g.term.bn)).toBe(true); expect(g.meaning.bn.length).toBeGreaterThan(5); expect(g.reviewed).toBe(false); }
  });
});

describe("TM-TST-100/114 deen guard", () => {
  const banned = /\b(piety|leaderboard|ranking|rank|score|scores|scoring|points|streak)\b|স্কোর|র‍্যাঙ্ক|ব‍্যাঙ্ক|লিডারবোর্ড|পয়েন্ট|স্ট্রিক|কবুল হয়েছে|accepted by allah|reward points/i;
  it("0 piety score/rank/leaderboard/acceptance wording in strings, catalog, glossary and source", () => {
    const strings = JSON.stringify([PACKS, FIELDS, GLOSSARY, MODULES, ENTITIES]);
    expect(strings.match(banned)).toBeNull();
    for (const f of srcFiles().filter((x) => x.endsWith(".ts") || x.endsWith(".css"))) expect(read(f).match(banned), f).toBeNull();
  });
  it("worship + health entities are private and per-item authorised", () => {
    for (const f of FIELDS.filter((x) => WORSHIP_ENTITIES.includes(x.entity))) { expect(f.privacy).toBe("worship"); expect(f.access).toBe("device_only_per_item_authorisation"); }
    expect(FIELDS.filter((x) => x.privacy === "health").length).toBeGreaterThan(0);
  });
  it("no scripture text is bundled (G1 schema + privacy only)", () => {
    expect(JSON.stringify([PACKS, FIELDS, GLOSSARY])).not.toMatch(/بسم|الله|﷽|surah|ayah|আয়াত:|সূরা \w+ :/i);
  });
  it("worship/health values appear in 0 external payloads without per-item authorisation", () => {
    const store = new Store(new MemoryKV());
    store.demo.put(rec({ id: "w1", entity: "prayer_log", ns: "demo", values: { "prayer_log.note": demoVal("private-note-xyz"), "prayer_log.date": demoVal("2026-10-22") } }));
    store.demo.put(rec({ id: "h1", entity: "profile", ns: "demo", values: { "profile.health_note": demoVal("health-note-xyz"), "profile.display_name": demoVal("Rahim") } }));
    const plain = JSON.stringify(exportNamespace(store, "demo"));
    expect(plain).not.toContain("private-note-xyz"); expect(plain).not.toContain("health-note-xyz"); expect(plain).toContain("Rahim");
    const authorised = JSON.stringify(exportNamespace(store, "demo", { authorisedRecordIds: new Set(["w1"]) }));
    expect(authorised).toContain("private-note-xyz"); expect(authorised).not.toContain("health-note-xyz");
  });
});

describe("TM-TST-010/067/017 intake", () => {
  it("no screen shows more than 7 fields", () => { for (const s of intakeSteps()) expect(stepFields(s).length).toBeLessThanOrEqual(MAX_FIELDS_PER_SCREEN); });
  it("next-needed field and its reason are given in 100% of 500 random states", () => {
    const r = rng(67); const ids = FIELDS.filter((f) => f.step > 0).map((f) => f.id);
    for (let i = 0; i < 500; i++) {
      const a: Answers = {}; for (const id of ids) if (r() < 0.5) a[id] = r() < 0.3 ? { state: "later" } : demoVal("x");
      const n = nextStep(a);
      if (n.field) { expect(n.field.help.why.bn.length).toBeGreaterThan(3); expect(n.field.help.why.en.length).toBeGreaterThan(3); expect(a[n.field.id]).toBeUndefined(); expect(n.reasonKey).not.toBe("all_done"); }
      else expect(n.reasonKey).toBe("all_done");
      const c = completeness(a); expect(c.pct).toBeGreaterThanOrEqual(0); expect(c.pct).toBeLessThanOrEqual(100); expect(c.addressed).toBeGreaterThanOrEqual(c.filled);
    }
  });
  it("'unknown' answers count as addressed but not as filled", () => {
    const c = completeness({ "profile.display_name": { state: "unknown" } });
    expect(c.filled).toBe(0); expect(c.addressed).toBe(1);
  });
  it("health fields empty: nothing in intake depends on them and none is ever suggested", () => {
    const health = FIELDS.filter((f) => f.privacy === "health").map((f) => f.id);
    expect(FIELDS.filter((f) => f.step > 0).some((f) => health.includes(f.id))).toBe(false);
    const all: Answers = {}; for (const f of FIELDS.filter((x) => x.step > 0)) all[f.id] = demoVal("x");
    expect(nextStep(all).field).toBeNull(); expect(completeness(all).pct).toBe(100);
    for (const id of health) expect(FIELDS.find((f) => f.id === id)!.importance).toBe("optional");
  });
});

describe("TM-TST-144 capability status", () => {
  it("100% of modules have a valid status; nothing is 'implemented' without being the status screen", () => {
    expect(MODULES.length).toBe(24);
    for (const m of MODULES) { expect(m.statuses.length).toBeGreaterThan(0); for (const s of m.statuses) expect(CAP_STATUSES).toContain(s); }
    expect(MODULES.filter((m) => m.statuses.includes("implemented")).map((m) => m.id)).toEqual(["M22"]);
  });
});

// Owner decision: common English words stay in English inside the Bangla version (easier to read).
const COMMON_ENGLISH_KEYS = new Set(["badge.demo", "status.online", "status.offline", "label.DEMO", "help.format", "more.theme", "cap.demo", "data.demo", "backup.title", "suggest.btn"]);
describe("i18n parity (completeness gate)", () => {
  const en = PACKS.en as Record<string, string>, bn = PACKS.bn as Record<string, string>;
  it("key parity, no empties, same placeholders, Bangla script present", () => {
    expect(Object.keys(bn).sort()).toEqual(Object.keys(en).sort());
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    for (const k of Object.keys(en)) {
      expect(en[k]!.trim(), k).not.toBe(""); expect(bn[k]!.trim(), k).not.toBe("");
      expect(ph(bn[k]!), k).toBe(ph(en[k]!));
      if (!COMMON_ENGLISH_KEYS.has(k)) expect(LOCALES.bn.scripts.test(bn[k]!), k).toBe(true);
    }
  });
  it("missing key throws in strict mode, never silently", () => { setStrict(true); expect(() => t("nope" as Key, "bn")).toThrow(); });
  it("no call-site English fallbacks in UI code", () => { for (const f of srcFiles().filter((x) => x.includes("/ui/"))) expect(read(f)).not.toMatch(/\bt\([^)]*\)\s*(\|\||\?\?)\s*["'`]/); });
  it("no-guarantee copy exists in both languages (TM-TST-004 stub)", () => {
    expect(bn["disclaimer.noGuarantee"]).toMatch(/গ্যারান্টি নেই/); expect(en["disclaimer.noGuarantee"]).toMatch(/No guarantee/);
    expect(JSON.stringify(PACKS)).not.toMatch(/guaranteed (wealth|returns|success)|you will become/i);
  });
});

describe("TM-TST-006 every rendered value is labelled (all routes, both languages)", () => {
  const paths = ["/today", "/journey", "/diary", "/diary/intake/1", "/diary/intake/2", "/diary/intake/3", "/diary/intake/4", "/diary/intake/5", "/diary/intake/6", "/diary/intake/7", "/diary/plan", "/diary/money", "/journey/log", "/journey/report", "/capture", "/deen", "/more", "/more/status", "/more/fields", "/more/glossary", "/more/safety", "/more/data"];
  it("route table is fully covered", () => { for (const p of paths) expect(ROUTES.some(([re]) => re.test(p)), p).toBe(true); expect(ROUTES.length).toBe(16); });
  for (const lang of ["bn", "en"] as const) it(`0 unlabelled values in ${lang}`, () => {
    let seen = 0;
    for (const p of paths) {
      document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", lang); location.hash = "#" + p; render();
      expect(document.documentElement.lang).toBe(lang);
      for (const el of document.querySelectorAll("[data-value]")) {
        seen++;
        expect(LABELS as readonly string[], p).toContain(el.getAttribute("data-label"));
        expect(el.querySelector(".chip")?.textContent?.length, p).toBeGreaterThan(0);
      }
      expect(document.querySelector("main"), p).not.toBeNull();
    }
    expect(seen).toBeGreaterThan(10);
  });
  it("home value tokens (date, gate, minutes, completeness) are inside labelled values", () => {
    document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); location.hash = "#/today"; render();
    const vals = [...document.querySelectorAll("[data-value]")].map((e) => e.textContent ?? "");
    expect(vals.some((v) => /22 October/.test(v))).toBe(true); expect(vals.some((v) => /Stage 1 \/ 8/.test(v))).toBe(true); expect(vals.some((v) => /10 min/.test(v))).toBe(true);
    expect(document.querySelector("[data-label='DEMO']")).not.toBeNull();
  });
});

describe("TM-TST-144/171 UI status and home structure", () => {
  it("status screen shows a status tag for every module", () => {
    document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); location.hash = "#/more/status"; render();
    const cards = document.querySelectorAll("[data-module]"); expect(cards.length).toBe(24);
    for (const c of cards) expect(c.querySelector("[data-cap]"), c.getAttribute("data-module") ?? "").not.toBeNull();
  });
  it("home shows only 1–3 actions and the current stage", () => {
    document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "bn"); location.hash = "#/today"; render();
    const n = document.querySelectorAll(".task").length; expect(n).toBeGreaterThanOrEqual(1); expect(n).toBeLessThanOrEqual(3);
    expect(document.querySelectorAll(".stage").length).toBe(1);
  });
  it("deen screen has no scoring widgets; every entity card is marked private", () => {
    document.body.innerHTML = '<div id="app"></div>'; location.hash = "#/deen"; render();
    for (const c of document.querySelectorAll("[data-entity]")) expect(c.textContent).toMatch(/ব্যক্তিগত|Private/);
    expect(WORSHIP_ENTITIES.length).toBe(document.querySelectorAll("[data-entity]").length);
  });
});

describe("TM-TST-130 process: no rule derives from image text", () => {
  it("account-bucket/four-account structures are absent from the G1 catalog (optional later)", () => {
    expect(FIELDS.some((f) => /bucket|four_account|jar/i.test(f.id))).toBe(false);
    expect(existsSync("docs/process/TM-TST-130-checklist.md")).toBe(true);
  });
});

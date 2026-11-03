// Guards for docs/design/bangla-plain-final-decision.md: spelling, banned words, key parity, placeholders, protected strings, Mix.
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { PACKS, MIX_TERMS, swapMixTerms } from "../src/i18n/packs";
// @ts-expect-error plain .mjs tool module without types
import { loadAll, isProtected, applyWordRules, toLatinDigits, hasPlaceholders, TS_FILES, JSON_FILES } from "../tools/banglaPlainCore.mjs";

const rules = JSON.parse(readFileSync("tools/bangla_plain_rules.json", "utf8"));
const banned = JSON.parse(readFileSync("tests/fixtures/bangla_banned.json", "utf8"));
const log: Array<{ group: string; file: string; key: string | null; before: string; after: string; protected?: boolean }> = existsSync("docs/design/bangla-plain-change-log.json") ? JSON.parse(readFileSync("docs/design/bangla-plain-change-log.json", "utf8")) : [];
const applied = new Set(log.map((l) => l.group));
type Seg = { file: string; key: string | null; text: string };
const segs: Seg[] = loadAll(".");
const BNL = "\\u0980-\\u09FF";
const re = (w: string, mode?: string) => (mode === "latin" ? new RegExp(`(?<![A-Za-z${BNL}])${w}(?![A-Za-z])`) : mode === "exact" ? new RegExp(`(?<![${BNL}A-Za-z])${w}(?![${BNL}])`) : new RegExp(`(?<![${BNL}A-Za-z])${w}`));
const keys = Object.keys(PACKS.en);

describe("Bangla plain: key parity and string counts", () => {
  it("en, bn and mix have the same keys", () => {
    expect(Object.keys(PACKS.bn).sort()).toEqual([...keys].sort());
    expect(Object.keys(PACKS.mix).sort()).toEqual([...keys].sort());
  });
  it("string counts do not change by accident (edit tests/fixtures/bangla_counts.json on purpose)", () => {
    const counts = JSON.parse(readFileSync("tests/fixtures/bangla_counts.json", "utf8"));
    const perFile: Record<string, number> = {};
    for (const s of segs) perFile[s.file] = (perFile[s.file] ?? 0) + 1;
    expect({ keys: keys.length, perFile }).toEqual(counts);
  });
  it("every scanned file really produced Bangla strings", () => {
    const files = new Set(segs.map((s) => s.file));
    for (const f of [...TS_FILES, ...JSON_FILES]) expect(files.has(f), f).toBe(true);
  });
});

describe("Bangla plain: placeholders", () => {
  it("{tokens} are identical in en, bn and mix for every key", () => {
    for (const k of keys) {
      const p = hasPlaceholders(PACKS.en[k as keyof typeof PACKS.en]);
      expect(hasPlaceholders(PACKS.bn[k as keyof typeof PACKS.bn]), k).toBe(p);
      expect(hasPlaceholders(PACKS.mix[k as keyof typeof PACKS.mix]), k).toBe(p);
    }
  });
  it("the tool log never changed a placeholder", () => {
    for (const l of log) expect(hasPlaceholders(l.after), `${l.file}#${l.key}`).toBe(hasPlaceholders(l.before));
  });
});

describe("Bangla plain: banned words and required spellings", () => {
  for (const group of ["spelling", "meaning", "stiff"]) {
    it(`banned words are gone (${group})${applied.has(group) ? "" : " [step not applied yet: skipped]"}`, () => {
      if (!applied.has(group)) return;
      const hits: string[] = [];
      for (const w of banned.words.filter((x: { group: string }) => x.group === group)) {
        const r = re(w.word, w.mode);
        for (const s of segs) {
          if (group !== "spelling" && isProtected(rules.protected, s.file, s.key, s.text)) continue;
          if (r.test(s.text)) hits.push(`${w.word} in ${s.file}#${s.key} (use ${w.use})`);
        }
      }
      expect(hits).toEqual([]);
    });
  }
  it("no Bangla digits in any Bangla string", () => {
    expect(segs.filter((s) => /[০-৯]/.test(s.text) && /[অ-হ]/.test(s.text)).map((s) => `${s.file}#${s.key}`)).toEqual([]);
  });
  it("required spellings are in use", () => {
    const all = Object.values(PACKS.bn).join("\n");
    for (const w of banned.required) expect(all, w).toContain(w);
  });
  it("Latin digits helper", () => expect(toLatinDigits("১২৩ ৪৫")).toBe("123 45"));
});

describe("Bangla plain: protected strings", () => {
  it("protected strings equal the reviewed snapshot (change only on purpose)", () => {
    const snap = JSON.parse(readFileSync("tests/fixtures/bangla_protected.json", "utf8"));
    const now: Record<string, string> = {};
    for (const s of segs) if (s.file === "src/i18n/packs.ts" && s.key && isProtected(rules.protected, s.file, s.key, s.text)) now[s.key] = s.text;
    expect(now).toEqual(snap);
  });
  it("tool changes to protected strings were spelling and naming only", () => {
    for (const l of log.filter((x) => x.protected)) {
      const spelled = applyWordRules(l.before, rules.rules, "spelling", { file: l.file, key: l.key, protected: true }).text;
      const allowed = rules.rewrites.some((r: { file: string; key: string; allowProtected?: boolean }) => r.file === l.file && r.key === l.key && r.allowProtected);
      if (!allowed) expect(l.after, `${l.file}#${l.key}`).toBe(spelled);
    }
  });
  it("the D-B consent, delete and no-fatwa meaning words are still there", () => {
    const need: Record<string, string[]> = { "mode.del.p": ["ডিলিট"], "halal.banner": ["ফতোয়া"], "disclaimer.noGuarantee": ["গ্যারান্টি"], "entry.consent.saveBlocked": ["টিক"] };
    for (const [k, ws] of Object.entries(need)) for (const w of ws) expect(PACKS.bn[k as keyof typeof PACKS.bn], k).toContain(w);
  });
  it("Unknown is not 0: unknown-wording keys still say it", () => {
    for (const k of ["chart.unknown", "money.baselineNeeded", "hl.note", "home.cnt.unknown", "intake.skipHint"]) {
      expect(/অজানা|জানা নেই|জানি না|ফাঁকা|শূন্য/.test(PACKS.bn[k as keyof typeof PACKS.bn] ?? ""), k).toBe(true);
    }
  });
  it("unreviewed Bangla keeps the যাচাই হয়নি tag", () => {
    expect(PACKS.bn["glossary.tag" as keyof typeof PACKS.bn] ?? PACKS.bn["advice.draft" as keyof typeof PACKS.bn]).toContain("যাচাই হয়নি");
  });
});

describe("Bangla plain: Mix", () => {
  const nonLegacy = MIX_TERMS.slice(14);
  it("every swapped loanword needed by the applied steps has a Mix pair", () => {
    const have = new Set(MIX_TERMS.map(([b, e]) => `${b}|${e}`));
    for (const [g, b, e] of rules.mixRequired) if (applied.has(g)) expect(have.has(`${b}|${e}`), `${b}|${e}`).toBe(true);
  });
  it("Mix never keeps a listed Bangla loanword", () => {
    const left: string[] = [];
    for (const k of keys) for (const [b] of nonLegacy) if (new RegExp(`(?<![${BNL}])${b}(ের|ে|র|তে|টি|টা|গুলোর|গুলোতে|গুলো|কে|ও|ই)?(?![${BNL}/])`, "u").test(PACKS.mix[k as keyof typeof PACKS.mix]) && !(["badge.demo"].includes(k))) left.push(`${k}: ${b}`);
    expect(left).toEqual([]);
  });
  it("suffix forms: Goal-এর, Goal-গুলোর, Data-এ, Data-তে", () => {
    expect(swapMixTerms("গোলের তালিকা")).toBe("Goal-এর তালিকা");
    expect(swapMixTerms("গোলগুলোর মধ্যে")).toBe("Goal-গুলোর মধ্যে");
    expect(swapMixTerms("ডাটায় দেখুন")).toBe("Data-এ দেখুন");
    expect(swapMixTerms("ডাটাতে")).toBe("Data-তে");
    expect(swapMixTerms("মূল গোল: {title}")).toBe("মূল Goal: {title}");
  });
  it("no half-converted word (a Latin letter glued to a Bangla letter without a hyphen) is created", () => {
    const bad: string[] = [];
    for (const k of keys) {
      const bn = PACKS.bn[k as keyof typeof PACKS.bn];
      const mix = PACKS.mix[k as keyof typeof PACKS.mix];
      const glue = (s: string) => (s.match(/[A-Za-z][ঀ-৿]|[ঀ-৿][A-Za-z]/g) ?? []).length;
      if (glue(mix) > glue(bn)) bad.push(k);
    }
    expect(bad).toEqual([]);
  });
});

describe("Bangla plain: buttons stay short", () => {
  it("button keys are 24 characters or fewer", () => {
    const allow = JSON.parse(readFileSync("tests/fixtures/bangla_banned.json", "utf8")).longButtons as Record<string, number>;
    const long = keys.filter((k) => /\.(btn|save|add)$/.test(k)).filter((k) => PACKS.bn[k as keyof typeof PACKS.bn].length > (allow[k] ?? 24));
    expect(long.map((k) => `${k}: ${PACKS.bn[k as keyof typeof PACKS.bn].length}`)).toEqual([]);
  });
});

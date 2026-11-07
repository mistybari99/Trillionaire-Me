// Apply-back script for the Bangla review sheet (audit M8): reads a reviewed copy, checks each change, edits only the Bangla block.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyToSource, parseSheet, readSheet, refusalFor } from "../tools/banglaApplyBack";
import { PACKS } from "../src/i18n/packs";

const known = new Set(Object.keys(PACKS.bn));
const row = (n: number, key: string, en: string, bn: string, ans: string) => `| ${n} | \`${key}\` | ${en} | ${bn} | ${ans} |`;
const sheet = (rows: string[], sign = "Reviewer name: ______  Date: ______  Result: x") => `# Bangla review sheet\n\n${sign}\n\n| # | Key | English | বাংলা | OK |\n|---|---|---|---|---|\n${rows.join("\n")}\n`;

describe("reading the reviewed sheet", () => {
  it("parses rows (escaped bars and line breaks), counts OK, blank, changes and refusals", () => {
    const rows = parseSheet(sheet([row(1, "app.title", "Trillionaire Me", "ট্রিলিয়নেয়ার মি", "OK"), row(2, "lang.menu", "Language", "ভাষা", "ভাষা বেছে নিন"), row(3, "lazy.loading", "Loading...", "লোড হচ্ছে...", ""), row(4, "x", "a \\| b", "c <br> d", "")]));
    expect(rows.length).toBe(4); expect(rows[3]).toMatchObject({ english: "a | b", bangla: "c\nd" });
    const rep = readSheet(sheet([row(1, "app.title", "Trillionaire Me", "ট্রিলিয়নেয়ার মি", "OK"), row(2, "lang.menu", "Language", "ভাষা", "ভাষা বেছে নিন"), row(3, "lazy.loading", "Loading...", "লোড হচ্ছে...", ""),
      row(4, "lang.menu", "Language", "ভাষা", "টাকা ১০"), row(5, "nope.key", "x", "y", "নতুন")]), known);
    expect(rep).toMatchObject({ rows: 5, ok: 1, blank: 1, signed: false }); expect(rep.changes).toEqual([{ key: "lang.menu", from: "ভাষা", to: "ভাষা বেছে নিন" }]);
    expect(rep.refused.map((r) => r.why)).toEqual(["Bangla digits (use 0-9)", "unknown key"]);
  });
  it("sign-off is read only when a name and date were written", () => {
    expect(readSheet(sheet([], "Reviewer name: Rahim  Date: 2026-11-05  Result: all OK"), known)).toMatchObject({ signed: true, reviewer: "Rahim" });
  });
  it("refuses unsafe lines: no Bangla script, banned words, changed placeholders, empty", () => {
    const en = "{n} steps";
    expect(refusalFor("lang.menu", en, "steps", known)).toBe("no Bangla script"); expect(refusalFor("lang.menu", en, "স্কোর {n}", known)).toBe("score, rank or streak wording");
    expect(refusalFor("lang.menu", en, "ধাপ", known)).toMatch(/placeholders/); expect(refusalFor("lang.menu", en, "{n}টি ধাপ", known)).toBeNull(); expect(refusalFor("lang.menu", en, " ", known)).toBe("empty");
  });
});

describe("editing the source", () => {
  const src = `const en = {\n  "a.b": "Hello",\n};\nconst bn: Record<Key, string> = {\n  "a.b": "হ্যালো", "c.d": "পুরনো {n}",\n  "e.f": "আরেক",\n};\nconst mix = 1;\n`;
  it("changes only the Bangla value of the key; English, other keys and the rest stay byte for byte", () => {
    const r = applyToSource(src, [{ key: "c.d", from: "", to: 'নতুন "{n}"' }]);
    expect(r.applied).toEqual(["c.d"]); expect(r.src).toBe(src.replace('"পুরনো {n}"', JSON.stringify('নতুন "{n}"')));
  });
  it("a key missing from the Bangla block is refused and nothing changes; the English-only key is never touched", () => {
    const r = applyToSource(src, [{ key: "zz", from: "", to: "বাংলা" }]); expect(r.applied).toEqual([]); expect(r.refused[0]!.why).toMatch(/not found/); expect(r.src).toBe(src);
  });
});

describe("the command", () => {
  it("dry run prints a summary and writes nothing; the real packs file is unchanged", () => {
    const d = mkdtempSync(join(tmpdir(), "tm-bn-")); const f = join(d, "sheet.md");
    writeFileSync(f, sheet([row(1, "lang.menu", "Language", PACKS.bn["lang.menu"], "ভাষা বেছে নিন"), row(2, "app.title", "Trillionaire Me", PACKS.bn["app.title"], "OK")]));
    const before = readFileSync("src/i18n/packs.ts", "utf8");
    const out = execFileSync("node", ["tools/bangla_apply_back.mjs", f], { encoding: "utf8" });
    expect(out).toMatch(/rows 2 · OK 1 · blank 0 · changes 1 · refused 0 · signed no/); expect(out).toMatch(/dry run: nothing was written/); expect(readFileSync("src/i18n/packs.ts", "utf8")).toBe(before);
  }, 60_000);
});

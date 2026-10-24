// Copy review guard: plain, calm copy in English, Bangla and Mix.
// Rules: no banned words, every key in all three modes, short English lines, Mix really differs from Bangla where it should.
import { describe, expect, it } from "vitest";
import { PACKS, COMMON_ENGLISH_KEYS, MIX_TERMS } from "../src/i18n/packs";

const en = PACKS.en as Record<string, string>;
const bn = PACKS.bn as Record<string, string>;
const mix = PACKS.mix as Record<string, string>;

// Banned English words (whole words, any case). Shame, grades, ranks, streaks, scores, red and failure copy.
const BANNED_EN = /\b(shame\w*|guilt\w*|fail\w*|grade\w*|rank\w*|streak\w*|score\w*|rating\w*|penalt\w*|punish\w*|lazy|overdue|behind|lost|mistake\w*|bad|red)\b/i;
// Banned Bangla words. Zero-width joiners are stripped before matching; matches are whole words only.
const BANNED_BN = ["ব্যর্থ", "ফেল", "লজ্জা", "ভুল", "স্কোর", "স্ট্রিক", "গ্রেড", "র্যাঙ্ক", "র্যাংক", "রেটিং", "শিকল", "শাস্তি", "খারাপ", "পিছিয়ে", "লাল"];
// Same boundary rule the Mix pack uses to swap a term (src/i18n/packs.ts swapMixTerms).
const wholeWord = (w: string) => new RegExp(`(?<=^|[\\s(·,।:“"'-])${w}(?=$|[\\s).,।:!?”"'·])`, "u");
const letterWord = (w: string) => new RegExp(`(?<![\\p{L}\\p{M}])${w}(?![\\p{L}\\p{M}])`, "u");
const bnHit = (s: string): string | undefined => {
  const plain = s.replace(/[\u200c\u200d]/g, "");
  return BANNED_BN.find((w) => letterWord(w).test(plain));
};

const keys = Object.keys(en).sort();

describe("copy review: plain English", () => {
  it("every English line is 120 characters or fewer", () => {
    for (const k of keys) expect(en[k]!.length, k).toBeLessThanOrEqual(120);
  });

  it("no banned English words in en", () => {
    for (const k of keys) expect(BANNED_EN.exec(en[k]!)?.[0], k).toBeUndefined();
  });
});

describe("TM-TST-041 copy review: no banned words in any mode", () => {
  it("no banned English words in bn or mix (English words inside Bangla lines)", () => {
    for (const k of keys) {
      expect(BANNED_EN.exec(bn[k]!)?.[0], `bn ${k}`).toBeUndefined();
      expect(BANNED_EN.exec(mix[k]!)?.[0], `mix ${k}`).toBeUndefined();
    }
  });

  it("no banned Bangla words in bn or mix", () => {
    for (const k of keys) {
      expect(bnHit(bn[k]!), `bn ${k}`).toBeUndefined();
      expect(bnHit(mix[k]!), `mix ${k}`).toBeUndefined();
    }
  });
});

describe("copy review: parity across en / bn / mix", () => {
  it("every key is present and non-empty in all three modes", () => {
    for (const k of keys) {
      for (const p of [en, bn, mix]) expect(p[k]?.trim(), k).toBeTruthy();
    }
    expect(Object.keys(bn).sort()).toEqual(keys);
    expect(Object.keys(mix).sort()).toEqual(keys);
  });
});

describe("copy review: Mix against Bangla", () => {
  it("Mix swaps the agreed common Bangla terms for English", () => {
    for (const [bnWord, enWord] of MIX_TERMS) {
      for (const k of keys) {
        if (COMMON_ENGLISH_KEYS.has(k) || !wholeWord(bnWord).test(bn[k]!)) continue;
        expect(mix[k], k).toContain(enWord);
        expect(wholeWord(bnWord).test(mix[k]!), k).toBe(false);
      }
    }
  });

  it("Mix differs from Bangla on the agreed terms (Stage, Journey, Diary, Demo)", () => {
    expect(mix["home.stage"]).toBe("Stage");
    expect(mix["stage.progress"]).not.toBe(bn["stage.progress"]);
    expect(mix["nav.journey"]).toBe("Journey");
    expect(mix["nav.diary"]).toBe("Diary");
    expect(mix["label.DEMO"]).toBe("Demo");
  });

  it("common English keys read the same in Mix and English", () => {
    for (const k of COMMON_ENGLISH_KEYS) expect(mix[k], k).toBe(en[k]);
  });
});

describe("copy review: reviewer-pending flag", () => {
  it("draft Bangla glossary and topics are marked as not reviewed", () => {
    expect(bn["glossary.unreviewed"]).toContain("যাচাই হয়নি");
    expect(bn["glossary.tag"]).toBe("যাচাই হয়নি");
    expect(bn["topics.draft"]).toContain("যাচাই হয়নি");
    expect(bn["fit.draft"]).toContain("যাচাই হয়নি");
  });
});


// R5 (ROADMAP B7, B8, B10): stuck reflection cards, effort-timing tip, journey-log word chain.
import { beforeEach, describe, expect, it } from "vitest";
import { PACKS } from "../src/i18n/packs";
import { learnWord, wordChain } from "../src/core/learning";
import { render } from "../src/app";
import { store } from "../src/ui/state";
import type { FieldValue, TMRecord } from "../src/core/types";

const en = PACKS.en as Record<string, string>, bn = PACKS.bn as Record<string, string>, mix = PACKS.mix as Record<string, string>;
const NEW_PREFIX = /^(stuck\.(two|timing|time)\.|log\.learn\.)/;
const NEW_KEYS = Object.keys(en).filter((k) => NEW_PREFIX.test(k));
// Judgement words that must never appear in the new calm copy (English and Bangla).
const BANNED_EN = /\b(fail\w*|wrong|lazy|shame\w*|should|score\w*|rank\w*|streak\w*|grade\w*|behind|missed|lost|bad|error|mistake\w*|warning)\b/i;
const BANNED_BN = /(ব্যর্থ|ফেল|লজ্জা|ভুল|স্কোর|স্ট্রিক|গ্রেড|র‍্যাঙ্ক|খারাপ|পিছিয়ে|সতর্ক)/u;
const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" });

describe("TM-TST-116 R5 calm copy guard (new stuck + log keys)", () => {
  it("there are new keys to guard", () => { expect(NEW_KEYS.length).toBeGreaterThanOrEqual(13); });
  it("no judging, score, streak or grade words in English or Bangla", () => {
    for (const k of NEW_KEYS) {
      expect(en[k], k).not.toMatch(BANNED_EN);
      expect(bn[k], k).not.toMatch(BANNED_BN);
    }
  });
  it("every new key has a non-empty English and Bangla value; Mix follows the same keys", () => {
    for (const k of NEW_KEYS) { expect(en[k]!.trim(), k).not.toBe(""); expect(bn[k]!.trim(), k).not.toBe(""); expect(mix[k], k).toBeDefined(); }
  });
  it("the 'two paths' card names both paths neutrally, and the time list has three plain items", () => {
    expect(en["stuck.two.fun"]).toMatch(/^Fun now:/); expect(en["stuck.two.struggle"]).toMatch(/^Struggle now:/);
    for (const k of ["stuck.time.1", "stuck.time.2", "stuck.time.3"]) expect(en[k]).toMatch(/^(Time|Distractions|Goals):/);
  });
});

describe("R5 word chain (pure)", () => {
  it("takes the first meaningful word of a note, skipping stop words", () => {
    expect(learnWord({ code: "B", note: "the morning walk helped" })).toBe("morning");
    expect(learnWord({ code: "B", note: "" })).toBe("B");
    expect(learnWord({ code: "C", note: "—" })).toBe("C");
    expect(learnWord({ code: "D", note: "to be" })).toBe("D");
  });
  it("works with Bangla words and never crashes on odd input", () => {
    expect(learnWord({ code: "A", note: "হিসাব রাখা শুরু" })).toBe("হিসাব");
    expect(learnWord({ code: "A", note: "x".repeat(200) }).length).toBeLessThanOrEqual(24);
  });
  it("chain shows only the last five entries, oldest first", () => {
    const e = ["a", "b", "c", "d", "e", "f"].map((c) => ({ code: c, note: `word${c}` }));
    expect(wordChain(e)).toEqual(["wordb", "wordc", "wordd", "worde", "wordf"]);
    expect(wordChain([])).toEqual([]);
  });
});

describe("R5 cards render in the app, in both languages", () => {
  beforeEach(() => { localStorage.clear(); store.demo.clear(); document.body.innerHTML = '<div id="app"></div>'; });
  const go = (hash: string) => { location.hash = hash; render(); };
  const cards = ["two_paths", "effort_timing", "where_time_goes"];

  it("stuck screen shows all three cards with no alert or red-error element, in English", () => {
    localStorage.setItem("tm:ui:lang", "en"); go("#/stuck");
    for (const c of cards) expect(document.querySelector(`[data-card=${c}]`), c).not.toBeNull();
    expect(document.querySelector("[data-card=two_paths]")!.textContent).toContain("Two paths right now");
    expect(document.querySelectorAll("[data-card=where_time_goes] li").length).toBe(3);
    expect(document.querySelector("[data-card] .err, [data-card] [role=alert]")).toBeNull();
  });
  it("stuck screen shows the same cards in Bangla", () => {
    localStorage.setItem("tm:ui:lang", "bn"); go("#/stuck");
    for (const c of cards) expect(document.querySelector(`[data-card=${c}]`), c).not.toBeNull();
    const txt = document.querySelector("[data-card=two_paths]")!.textContent!;
    expect(txt).toContain(bn["stuck.two.h"]); expect(/[ঀ-৿]/.test(txt)).toBe(true);
    expect(document.querySelector("[data-card=effort_timing]")!.textContent).toContain(bn["stuck.timing.body"]);
  });
  it("journey log shows the word chain of recent stage passes in both languages", () => {
    const base = { ns: "demo" as const, ownerId: "u", schemaVersion: 1, entity: "stage_pass" };
    const pass = (code: string, note: string, at: string): TMRecord => ({ ...base, id: `p-${code}`, createdAt: at, values: { "stage_pass.stage_code": v(code), "stage_pass.evidence": v(note), "stage_pass.progress_pct": v(10) } });
    store.demo.put(pass("A", "tracking every taka", "2026-10-20T00:00:00Z"));
    store.demo.put(pass("B", "small weekly review", "2026-10-21T00:00:00Z"));
    localStorage.setItem("tm:ui:lang", "en"); go("#/journey/log");
    expect(document.querySelector("[data-chain]")!.textContent).toBe("tracking → small");
    localStorage.setItem("tm:ui:lang", "bn"); go("#/journey/log");
    expect(document.querySelector("[data-card=learn_chain]")!.textContent).toContain(bn["log.learn.h"]);
    expect(document.querySelector("[data-chain]")!.textContent).toBe("tracking → small");
  });
  it("journey log with no passes shows the calm empty hint instead of a chain", () => {
    localStorage.setItem("tm:ui:lang", "en"); go("#/journey/log");
    expect(document.querySelector("[data-chain]")).toBeNull();
    expect(document.querySelector("[data-card=learn_chain]")!.textContent).toContain("short note");
  });
});

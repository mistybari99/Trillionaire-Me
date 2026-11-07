// M19 automation rules (pure). Same input gives the same output; rules only suggest and never write.
import { describe, expect, it } from "vitest";
import { breakAfterFocusRule, evaluateRules, FOCUS_WINDOW_MS, focusAgainRule, nextStageRule, parseRuleSwitches, RULE_IDS, RULES, ruleOn, smallerStepRule, type RuleInput } from "../src/core/rules";
import type { Habit, Log } from "../src/core/habits";
import { PACKS } from "../src/i18n/packs";

const NOW = Date.parse("2026-10-25T10:00:00");   // local time in the test process
const TODAY = "2026-10-25";
const daily: Habit = { id: "h-walk", title: "Walk", days: [0, 1, 2, 3, 4, 5, 6], target: null, unit: "" };
const base = (over: Partial<RuleInput> = {}): RuleInput => ({ today: TODAY, now: NOW, habits: [], logs: [], passedStages: [], lastFocus: null, lastRestAt: null, switches: {}, ...over });
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

describe("rule 1: smaller step after two planned days", () => {
  it("two planned days before today not done -> smallest version offered", () => {
    expect(smallerStepRule(base({ habits: [daily] }))).toEqual([{ rule: "smaller_step", habitId: "h-walk", title: "Walk" }]);
  });
  it("only one missed day -> nothing", () => {
    const logs: Log[] = [{ habitId: "h-walk", date: "2026-10-23", count: 1 }];
    expect(smallerStepRule(base({ habits: [daily], logs }))).toEqual([]);
  });
  it("the last two planned days done -> nothing", () => {
    const logs: Log[] = [{ habitId: "h-walk", date: "2026-10-24", count: 1 }, { habitId: "h-walk", date: "2026-10-23", count: 1 }];
    expect(smallerStepRule(base({ habits: [daily], logs }))).toEqual([]);
  });
});

describe("rule 2: next stage after a pass", () => {
  it("nothing passed yet -> nothing", () => expect(nextStageRule(base())).toEqual([]));
  it("A passed -> B is next", () => expect(nextStageRule(base({ passedStages: ["A"] }))).toEqual([{ rule: "next_stage", code: "B" }]));
  it("all eight passed -> nothing left to show", () => expect(nextStageRule(base({ passedStages: ["A", "B", "C", "D", "E", "F", "G", "H"] }))).toEqual([])); 
});

describe("rule 3: short break after a focus block", () => {
  const recent = { at: NOW - 5 * 60_000, minutes: 25 };
  it("focus ended 5 minutes ago and no rest since -> 5-minute break", () => {
    expect(breakAfterFocusRule(base({ lastFocus: recent }))).toEqual([{ rule: "break_after_focus", minutes: 5 }]);
  });
  it("a rest ended after the focus block -> nothing", () => {
    expect(breakAfterFocusRule(base({ lastFocus: recent, lastRestAt: NOW - 60_000 }))).toEqual([]);
  });
  it("focus ended long ago -> nothing (the window is 30 minutes)", () => {
    expect(breakAfterFocusRule(base({ lastFocus: { at: NOW - FOCUS_WINDOW_MS - 1, minutes: 25 } }))).toEqual([]);
  });
  it("focus with zero minutes is not a focus block -> nothing", () => {
    expect(breakAfterFocusRule(base({ lastFocus: { at: NOW - 1000, minutes: 0 } }))).toEqual([]);
  });
});

describe("rule 4: another focus block (off by default)", () => {
  it("a 25-minute block just ended -> another 25 minutes is offered by the pure rule", () => {
    expect(focusAgainRule(base({ lastFocus: { at: NOW - 1000, minutes: 25 } }))).toEqual([{ rule: "focus_again", minutes: 25 }]);
  });
  it("a 5-minute block is too short to offer again", () => {
    expect(focusAgainRule(base({ lastFocus: { at: NOW - 1000, minutes: 5 } }))).toEqual([]);
  });
});

describe("switches and defaults", () => {
  it("calm rules are on by default; the focus-again rule is off", () => {
    expect(RULE_IDS.filter((id) => ruleOn(id, {}))).toEqual(["smaller_step", "next_stage", "break_after_focus"]);
    expect(RULES.focus_again.calm).toBe(false);
  });
  it("an explicit switch overrides the default both ways", () => {
    expect(ruleOn("break_after_focus", { break_after_focus: false })).toBe(false);
    expect(ruleOn("focus_again", { focus_again: true })).toBe(true);
  });
  it("parseRuleSwitches keeps only known ids with boolean values", () => {
    expect(parseRuleSwitches({ focus_again: true, next_stage: "yes", nope: true, smaller_step: false })).toEqual({ focus_again: true, smaller_step: false });
    expect(parseRuleSwitches(null)).toEqual({});
    expect(parseRuleSwitches([true])).toEqual({});
  });
  it("evaluateRules: defaults show the calm suggestions only; switching focus-again on adds its line", () => {
    const input = base({ habits: [daily], passedStages: ["A"], lastFocus: { at: NOW - 60_000, minutes: 25 } });
    expect(evaluateRules(input).map((s) => s.rule)).toEqual(["smaller_step", "next_stage", "break_after_focus"]);
    expect(evaluateRules({ ...input, switches: { smaller_step: false, next_stage: false, break_after_focus: false, focus_again: true } }).map((s) => s.rule)).toEqual(["focus_again"]);
  });
});

describe("pure and deterministic", () => {
  it("same input gives the same output, every time", () => {
    const input = base({ habits: [daily], passedStages: ["A", "B"], lastFocus: { at: NOW - 60_000, minutes: 25 } });
    expect(evaluateRules(input)).toEqual(evaluateRules(input));
  });
  it("rules never change their input", () => {
    const input = base({ habits: [daily], logs: [{ habitId: "h-walk", date: "2026-10-24", count: 0 }], passedStages: ["A"], lastFocus: { at: NOW - 60_000, minutes: 25 }, switches: { focus_again: true } });
    const before = clone(input);
    evaluateRules(input);
    expect(input).toEqual(before);
  });
  it("no rule adds a task or any record: the output is only suggestion objects with a rule name", () => {
    for (const s of evaluateRules(base({ habits: [daily], passedStages: ["A"], lastFocus: { at: NOW - 1, minutes: 25 }, switches: { focus_again: true } }))) {
      expect(Object.keys(s).sort().length).toBeGreaterThan(1);
      expect(RULE_IDS).toContain(s.rule);
    }
  });
});

describe("copy and privacy guards", () => {
  const BANNED_EN = /\b(fail\w*|wrong|lazy|shame\w*|should|score\w*|rank\w*|streak\w*|grade\w*|behind|missed|overdue|late|bad|error|mistake\w*|warning|penalt\w*|lost|red)\b/i;
  it("rule copy in English and Bangla has no banned words", () => {
    const texts = [...Object.values(RULES).flatMap((r) => [r.name, r.desc])];
    for (const b of texts) { expect(BANNED_EN.exec(b.en)?.[0], b.en).toBeUndefined(); expect(BANNED_EN.exec(b.bn)?.[0], b.bn).toBeUndefined(); }
    for (const k of Object.keys(PACKS.en).filter((x) => x.startsWith("rules."))) expect(BANNED_EN.exec(PACKS.en[k as keyof typeof PACKS.en])?.[0], k).toBeUndefined();
  });
  it("the rules module names no notification API (no notification is sent)", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    for (const f of ["src/core/rules.ts", "src/ui/libraryScreens.ts"]) {
      const src = readFileSync(resolve(__dirname, "..", f), "utf8");
      expect(/Notification\(|showNotification|registration\.|serviceWorker/.test(src), f).toBe(false);
    }
  });
});

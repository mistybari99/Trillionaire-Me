// M19 automation rules, on this phone only. Each rule is a pure function of the input (no clock, no storage, no network).
// Rules only SUGGEST: they never write records, never add a task, and never send a notification.
// Calm rules are on by default; the others are off until the user switches them on (More > Automation rules).
import type { Bi } from "../i18n/registry";
import { restartPlan, type Habit, type Log } from "./habits";
import { STAGE_CODES, currentIndex, type StageCode } from "./stages";
import { REST_MINUTES } from "./focus";

export const RULE_IDS = ["smaller_step", "next_stage", "break_after_focus", "focus_again"] as const;
export type RuleId = (typeof RULE_IDS)[number];

export interface RuleDef { id: RuleId; calm: boolean; name: Bi; desc: Bi }
export const RULES: Record<RuleId, RuleDef> = {
  smaller_step: { id: "smaller_step", calm: true,
    name: { bn: "দুইটি নির্ধারিত দিন বাদ গেলে ছোট ধাপ", en: "Smaller step after two planned days" },
    desc: { bn: "অভ্যাসের শেষ দুইটি নির্ধারিত দিন না হলে, তার সবচেয়ে ছোট রূপ দেখানো হবে।", en: "If the last two planned days of a habit were not done, its smallest version is offered." } },
  next_stage: { id: "next_stage", calm: true,
    name: { bn: "ধাপ পার হলে পরের ধাপ", en: "Next stage after a pass" },
    desc: { bn: "একটি ধাপ পার হলে, পরের ধাপটি কোনটি তা দেখানো হবে।", en: "After a stage is passed, the next stage is shown." } },
  break_after_focus: { id: "break_after_focus", calm: true,
    name: { bn: "ফোকাসের পর ছোট বিরতি", en: "Short break after a focus block" },
    desc: { bn: "ফোকাস ব্লক শেষ হলে ৩০ মিনিট পর্যন্ত ৫ মিনিটের বিরতির পরামর্শ।", en: "After a focus block ends, a 5-minute rest is suggested for 30 minutes." } },
  focus_again: { id: "focus_again", calm: false,
    name: { bn: "আরেকটি ফোকাস ব্লক", en: "Another focus block" },
    desc: { bn: "১০ মিনিট বা বেশি ফোকাস শেষ হলে আরেকটি ব্লকের পরামর্শ। ডিফল্টে বন্ধ।", en: "After a focus block of 10 minutes or more, another one is offered. Off by default." } },
};

export const isRuleId = (v: unknown): v is RuleId => typeof v === "string" && (RULE_IDS as readonly string[]).includes(v);
/** Per-device switches. A missing key means the rule's default (calm = on). */
export type RuleSwitches = Partial<Record<RuleId, boolean>>;
/** Keeps only known rule ids with a boolean value. Anything else is dropped (fail to defaults). */
export function parseRuleSwitches(raw: unknown): RuleSwitches {
  const out: RuleSwitches = {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return out;
  for (const id of RULE_IDS) { const v = (raw as Record<string, unknown>)[id]; if (typeof v === "boolean") out[id] = v; }
  return out;
}
export const ruleOn = (id: RuleId, sw: RuleSwitches): boolean => sw[id] ?? RULES[id].calm;

export const FOCUS_WINDOW_MS = 30 * 60_000;
export const AGAIN_MIN_MINUTES = 10;
export interface FocusEnd { at: number; minutes: number }

export interface RuleInput {
  /** yyyy-mm-dd, the phone's local day */
  today: string;
  /** epoch ms */
  now: number;
  habits: Habit[];
  logs: Log[];
  /** stage codes already passed, in order */
  passedStages: readonly string[];
  /** last focus block that ended with minutes > 0, or null */
  lastFocus: FocusEnd | null;
  /** epoch ms when the last rest ended, or null */
  lastRestAt: number | null;
  switches: RuleSwitches;
}

export type Suggestion =
  | { rule: "smaller_step"; habitId: string; title: string }
  | { rule: "next_stage"; code: StageCode }
  | { rule: "break_after_focus"; minutes: number }
  | { rule: "focus_again"; minutes: number };

/** Rule 1: the last two planned days of a habit were not done, so offer its smallest version. Ignores switches. */
export function smallerStepRule(i: RuleInput): Suggestion[] {
  return i.habits
    .filter((h) => restartPlan(h, i.logs, i.today) === "smallest_version")
    .map((h) => ({ rule: "smaller_step" as const, habitId: h.id, title: h.title }));
}

/** Rule 2: once at least one stage is passed, show the next stage code (none when all eight are done). Ignores switches. */
export function nextStageRule(i: RuleInput): Suggestion[] {
  if (i.passedStages.length === 0) return [];
  const idx = currentIndex(i.passedStages);
  return idx < STAGE_CODES.length ? [{ rule: "next_stage", code: STAGE_CODES[idx]! }] : [];
}

const freshFocus = (i: RuleInput): FocusEnd | null => {
  const f = i.lastFocus;
  if (!f || f.minutes < 1) return null;
  const age = i.now - f.at;
  return age >= 0 && age <= FOCUS_WINDOW_MS ? f : null;
};

/** Rule 3: a focus block ended recently and no rest has ended since, so suggest a short rest. Ignores switches. */
export function breakAfterFocusRule(i: RuleInput): Suggestion[] {
  const f = freshFocus(i);
  if (!f) return [];
  if (i.lastRestAt !== null && i.lastRestAt >= f.at) return [];
  return [{ rule: "break_after_focus", minutes: REST_MINUTES }];
}

/** Rule 4 (off by default): a longer focus block just ended, so offer another of the same length. Ignores switches. */
export function focusAgainRule(i: RuleInput): Suggestion[] {
  const f = freshFocus(i);
  return f && f.minutes >= AGAIN_MIN_MINUTES ? [{ rule: "focus_again", minutes: f.minutes }] : [];
}

/** All suggestions for the switched-on rules, in the fixed RULE_IDS order. Same input, same output. */
export function evaluateRules(i: RuleInput): Suggestion[] {
  const fns: Record<RuleId, (x: RuleInput) => Suggestion[]> = {
    smaller_step: smallerStepRule, next_stage: nextStageRule, break_after_focus: breakAfterFocusRule, focus_again: focusAgainRule,
  };
  return RULE_IDS.filter((id) => ruleOn(id, i.switches)).flatMap((id) => fns[id](i));
}

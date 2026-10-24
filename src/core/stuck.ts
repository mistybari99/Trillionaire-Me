// "I'm stuck" (TM-REQ-174/175): rule-based, no typing, no AI. Unknown answers are never forced into a cause.
import type { Bi } from "../i18n/registry";

export type Answer = "yes" | "no" | "unknown";
export type Cause = "overloaded" | "tired" | "missing" | "unclear" | "too_big" | "fear";
export type Helper = "tiny_step" | "minimum_week" | "pause";

export interface Question { id: string; cause: Cause; text: Bi }
export const QUESTIONS: Question[] = [
  { id: "q_overloaded", cause: "overloaded", text: { bn: "আমার হাতে এখন অনেক বেশি কাজ", en: "I have too much on my plate right now" } },
  { id: "q_tired", cause: "tired", text: { bn: "আজ আমি ক্লান্ত বা শক্তি কম", en: "I am tired or low on energy today" } },
  { id: "q_missing", cause: "missing", text: { bn: "দরকারি তথ্য বা জিনিস আমার হাতে নেই", en: "I am missing information or something I need" } },
  { id: "q_unclear", cause: "unclear", text: { bn: "ঠিক পরের ধাপটা কী তা জানি না", en: "I don't know what the very next step is" } },
  { id: "q_too_big", cause: "too_big", text: { bn: "কাজটা আমার কাছে খুব বড় লাগছে", en: "The task feels too big" } },
  { id: "q_fear", cause: "fear", text: { bn: "ভয় হচ্ছে ঠিকমতো হবে না", en: "I am afraid it won't turn out well" } },
];

export const CAUSE_TEXT: Record<Cause, Bi> = {
  overloaded: { bn: "কাজের চাপ বেশি", en: "Too much load" }, tired: { bn: "ক্লান্তি", en: "Low energy" }, missing: { bn: "তথ্য বা জিনিসের অভাব", en: "Something is missing" },
  unclear: { bn: "পরের ধাপ অস্পষ্ট", en: "Next step unclear" }, too_big: { bn: "কাজ অনেক বড়", en: "Task too big" }, fear: { bn: "ভুল হওয়ার ভয়", en: "Fear of getting it wrong" },
};

const ORDER: Cause[] = ["overloaded", "tired", "missing", "unclear", "too_big", "fear"]; // load and rest come first
const HELPERS: Record<Cause, Helper[]> = {
  overloaded: ["minimum_week", "pause"], tired: ["minimum_week", "pause"], // never adds a task (Charter §6)
  missing: ["tiny_step"], unclear: ["tiny_step"], too_big: ["tiny_step"], fear: ["tiny_step"],
};

export interface Diagnosis { causes: Cause[]; helpers: Helper[]; unansweredCount: number }

export function diagnose(answers: Record<string, Answer | undefined>): Diagnosis {
  const causes = ORDER.filter((c) => QUESTIONS.some((q) => q.cause === c && answers[q.id] === "yes"));
  const unanswered = QUESTIONS.filter((q) => !answers[q.id] || answers[q.id] === "unknown").length;
  const load = causes.some((c) => c === "overloaded" || c === "tired");
  let helpers: Helper[] = [];
  for (const c of causes) for (const h of HELPERS[c]) if (!helpers.includes(h)) helpers.push(h);
  if (load) helpers = helpers.filter((h) => h !== "tiny_step"); // load/rest first: do not add work
  if (!causes.length) helpers = ["tiny_step"]; // nothing identified: the smallest step is still safe
  return { causes, helpers: helpers.slice(0, 3), unansweredCount: unanswered };
}

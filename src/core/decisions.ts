// Decision wizard and ownership triage. Rule-based and pure: the same answers always give the same suggestion,
// and every suggestion carries the reason key. Nothing is scored, nothing is invented, nothing is changed in the user's data.
// An unanswered question is "unknown" (null). It is never read as "no".

export type YN = "yes" | "no" | "unsure";

export const DECISION_QUESTIONS = ["reversible", "time", "learn", "regret"] as const;
export type DecisionQuestion = (typeof DECISION_QUESTIONS)[number];
export type DecisionAnswers = Partial<Record<DecisionQuestion, YN | null>>;

export type DecisionOutcome = "need_answers" | "try_small" | "wait_learn" | "decide_with_care" | "lean_go" | "lean_wait" | "sleep_on_it";
export interface Decision { outcome: DecisionOutcome; /** i18n key suffix of the reason shown under the suggestion */ reason: string; /** Questions still unanswered or "not sure" that block a suggestion. */ missing: DecisionQuestion[] }

const ans = (a: DecisionAnswers, q: DecisionQuestion): YN | null => a[q] ?? null;

/**
 * reversible: can I undo it later at a small cost?  time: can I wait before choosing?
 * learn: can I learn more cheaply before choosing?  regret: in 10 years, would I regret NOT doing it?
 */
export function decide(a: DecisionAnswers): Decision {
  const rev = ans(a, "reversible");
  if (rev === null || rev === "unsure") return { outcome: "need_answers", reason: "need", missing: ["reversible"] };
  if (rev === "yes") return { outcome: "try_small", reason: "reversible", missing: [] };
  // Not reversible from here on.
  const time = ans(a, "time");
  if (time === null || time === "unsure") return { outcome: "need_answers", reason: "need", missing: ["time"] };
  if (time === "no") return { outcome: "decide_with_care", reason: "no_time", missing: [] };
  const learn = ans(a, "learn");
  if (learn === null || learn === "unsure") return { outcome: "need_answers", reason: "need", missing: ["learn"] };
  if (learn === "yes") return { outcome: "wait_learn", reason: "can_learn", missing: [] };
  const regret = ans(a, "regret");
  if (regret === null) return { outcome: "need_answers", reason: "need", missing: ["regret"] };
  if (regret === "unsure") return { outcome: "sleep_on_it", reason: "unsure_regret", missing: [] };
  return regret === "yes" ? { outcome: "lean_go", reason: "regret_yes", missing: [] } : { outcome: "lean_wait", reason: "regret_no", missing: [] };
}

// ---- Ownership triage: is it mine? ----
export const TRIAGE_QUESTIONS = ["mine", "matters", "other"] as const;
export type TriageQuestion = (typeof TRIAGE_QUESTIONS)[number];
export type TriageAnswers = Partial<Record<TriageQuestion, YN | null>>;
export type TriageOutcome = "ask" | "do" | "delegate" | "let_go";
export interface Triage { outcome: TriageOutcome; reason: string }

/** mine: is this my job? matters: does it matter for my aims? other: can someone else do it? */
export function triage(a: TriageAnswers): Triage {
  const g = (q: TriageQuestion): YN | null => a[q] ?? null;
  const mine = g("mine");
  if (mine === null || mine === "unsure") return { outcome: "ask", reason: "need_mine" };
  if (mine === "yes") {
    const m = g("matters");
    if (m === null || m === "unsure") return { outcome: "ask", reason: "need_matters" };
    return m === "yes" ? { outcome: "do", reason: "mine_matters" } : { outcome: "let_go", reason: "mine_not_matter" };
  }
  const o = g("other");
  if (o === null || o === "unsure") return { outcome: "ask", reason: "need_other" };
  return o === "yes" ? { outcome: "delegate", reason: "other_can" } : { outcome: "let_go", reason: "other_cannot" };
}

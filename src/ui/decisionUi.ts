// Decision helper and ownership check screens. Answers live only in memory while the screen is open (nothing is saved).
// Suggestions come from src/core/decisions.ts (rule-based); the reason is always shown.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Key } from "../i18n/packs";
import { prefs } from "./state";
import { disclaimers } from "./components";
import { allRecs } from "./entry";
import { isOpenTask } from "../core/planInputs";
import { DECISION_QUESTIONS, TRIAGE_QUESTIONS, decide, triage, type DecisionAnswers, type TriageAnswers, type YN } from "../core/decisions";

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
const YNS: YN[] = ["yes", "no", "unsure"];
const back = (lang: typeof prefs.lang) => h("a", { href: "#/journey", class: "crumb" }, `← ${t("journey.title", lang)}`);

let decAnswers: DecisionAnswers = {};
const triAnswers = new Map<string, TriageAnswers>();

function choice(group: string, cur: YN | null | undefined, onPick: (v: YN) => void, lang: typeof prefs.lang): HTMLElement {
  return h("div", { class: "seg", role: "group", "data-choice": group }, ...YNS.map((v) => h("button", { type: "button", "data-opt": v, "aria-pressed": String(cur === v), style: "min-height:44px", onclick: () => { onPick(v); rerender(); } }, t(`dec.${v}` as Key, lang))));
}

export function decisionScreen(): HTMLElement {
  const lang = prefs.lang;
  const d = decide(decAnswers);
  const qs = DECISION_QUESTIONS.map((q) => h("section", { class: "card", "data-dec-q": q }, h("h2", { class: "card-h" }, t(`dec.q.${q}` as Key, lang)),
    choice(`dec-${q}`, decAnswers[q], (v) => { decAnswers = { ...decAnswers, [q]: v }; }, lang)));
  const why = d.outcome === "need_answers" ? t("dec.why.need", lang, { q: d.missing.map((q) => t(`dec.q.${q}` as Key, lang)).join(" ") }) : t(`dec.why.${d.reason}` as Key, lang);
  return h("main", { "data-screen": "decision" }, back(lang), h("h1", {}, t("dec.title", lang)), h("p", { class: "sub" }, t("dec.intro", lang)),
    ...qs,
    h("section", { class: "card", "data-dec-result": d.outcome, role: "status" }, h("h2", { class: "card-h" }, t("dec.result", lang)),
      h("p", {}, h("strong", {}, t(`dec.out.${d.outcome}` as Key, lang))), h("p", { "data-dec-why": d.reason }, why)),
    h("button", { class: "btn ghost", type: "button", "data-act": "dec-reset", style: "width:auto;min-height:44px", onclick: () => { decAnswers = {}; rerender(); } }, t("dec.reset", lang)),
    h("p", { class: "muted" }, t("dec.note", lang)), disclaimers(lang, ["advice"]));
}

export function triageScreen(): HTMLElement {
  const lang = prefs.lang;
  const tasks = allRecs().filter(isOpenTask).sort((a, b) => a.id.localeCompare(b.id));
  const cards = tasks.map((r) => {
    const tv = r.values["task.title"]; const title = tv && tv.state === "value" ? String(tv.value) : "";
    const a = triAnswers.get(r.id) ?? {}; const res = triage(a);
    const pick = (q: (typeof TRIAGE_QUESTIONS)[number]) => h("div", {}, h("p", {}, t(`tri.q.${q}` as Key, lang)), choice(`tri-${r.id}-${q}`, a[q], (v) => { triAnswers.set(r.id, { ...(triAnswers.get(r.id) ?? {}), [q]: v }); }, lang));
    return h("section", { class: "card", "data-tri-task": r.id }, h("h2", { class: "card-h" }, title || r.id),
      ...TRIAGE_QUESTIONS.map(pick),
      h("p", { "data-tri-result": res.outcome, role: "status" }, h("strong", {}, t(`tri.out.${res.outcome}` as Key, lang)), " · ", t(`tri.why.${res.reason}` as Key, lang)));
  });
  return h("main", { "data-screen": "triage" }, back(lang), h("h1", {}, t("tri.title", lang)), h("p", { class: "sub" }, t("tri.intro", lang)),
    ...(cards.length ? cards : [h("p", { class: "muted", "data-tri-empty": "1" }, t("tri.empty", lang))]),
    h("p", { class: "muted" }, t("tri.note", lang)), disclaimers(lang, ["advice"]));
}

/** Test hook: clears the in-memory answers. */
export function resetDecisionState() { decAnswers = {}; triAnswers.clear(); }

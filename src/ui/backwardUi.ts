// Backward-planning wizard (audit M7, AU-22): #/journey/backward (choose a goal) and #/journey/backward/<goalId>.
// 1 end date (own goal date, or typed)  2 pick the user's OWN steps from the last one back  3 dates worked back to today  4 optional save / remove.
// No step is created. The dates are spread evenly; nothing is saved until the user taps Save, and Remove puts it back. Calm wording only.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { prefs } from "./state";
import { num } from "./components";
import { allRecs, entryNs, findRec, inNs, labelFor, saveBlockedText, storeOf } from "./entry";
import { todayIsoKpi } from "./kpiUi";
import { buildTree } from "../core/goalTree";
import { goalStatusOf } from "../core/goalStatus";
import { openSteps, planByOf, validDay, withPlanDates, withoutPlanDates, workBack } from "../core/backwardPlan";
import type { TMRecord } from "../core/types";

const L = () => prefs.lang;
const link = (href: string, cls: string, ...kids: Array<Node | string>) => h("a", { href, class: cls }, ...kids);
const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
const textOf = (r: TMRecord, f: string): string => { const v = r.values[f]; return v && v.state === "value" && typeof v.value === "string" ? v.value : ""; };

interface Draft { order: string[]; target: string | null; msg: { key: Key; args?: Record<string, string> } | null }
const drafts = new Map<string, Draft>();
export const resetBackward = (): void => drafts.clear();
const draftOf = (goal: TMRecord): Draft => { let d = drafts.get(goal.id); if (!d) { d = { order: [], target: textOf(goal, "goal.target_date") || null, msg: null }; drafts.set(goal.id, d); } return d; };

/** A small "planned by" tag for a step row. Null when the step has no planned date. */
export function planByTag(r: TMRecord, lang: Locale): HTMLElement | null {
  const d = planByOf(r); return d ? h("span", { class: "tag", "data-plan-by": d }, t("bw.tag", lang, { date: d })) : null;
}

export function backwardListScreen(): HTMLElement {
  const lang = L(); const recs = allRecs(); const goals = buildTree(recs).filter((r) => !r.orphan);
  const byId = new Map(recs.filter((r) => r.entity === "goal").map((g) => [g.id, g] as const));
  const live = goals.filter((n) => goalStatusOf(byId.get(n.id)!) === "active");
  return h("main", { "data-backward": "list" }, link("#/journey/goals", "crumb", `← ${t("goals.title", lang)}`), h("h1", {}, t("bw.title", lang)), h("p", { class: "sub" }, t("bw.intro", lang)),
    live.length ? h("section", { class: "card" }, h("h2", { class: "card-h" }, t("bw.pick", lang)), h("p", { class: "muted" }, t("bw.list.intro", lang)),
      h("ul", { class: "plain" }, ...live.map((n) => { const dt = textOf(byId.get(n.id)!, "goal.target_date");
        return h("li", { "data-bw-goal": n.id }, link(`#/journey/backward/${n.id}`, "btn ghost", `${t("bw.open", lang)}: ${n.title}`), " ", h("span", { class: "muted" }, dt || t("bw.nodate", lang))); })))
      : h("section", { class: "card" }, h("p", { class: "muted" }, t("bw.noGoals", lang)), link("#/journey/goals", "btn ghost", t("bw.addGoal", lang))));
}

export function backwardScreen(goalId: string): HTMLElement {
  const lang = L(); const goal = findRec(goalId);
  if (!goal || goal.entity !== "goal" || !textOf(goal, "goal.title")) return h("main", {}, link("#/journey/backward", "crumb", `← ${t("bw.title", lang)}`), h("h1", {}, t("bw.title", lang)), h("p", { class: "muted", "data-goal-missing": "1" }, t("goals.notFound", lang)));
  const d = draftOf(goal); const recs = allRecs(); const today = todayIsoKpi();
  const steps = openSteps(recs, goalId); const title = new Map(steps.map((s) => [s.id, s.title] as const));
  d.order = d.order.filter((id) => title.has(id)); // a step that was finished or removed meanwhile drops out
  const remaining = steps.filter((s) => !d.order.includes(s.id));
  const dateIn = h("input", { id: "bw-date", type: "date", value: d.target ?? "", "data-bw": "date" }) as HTMLInputElement;
  dateIn.addEventListener("change", () => { d.target = validDay(dateIn.value) ? dateIn.value : null; d.msg = null; rerender(); });
  const result = d.target ? workBack(d.order, d.target, today) : { kind: "no-date" as const };
  const gate = entryNs() ? null : h("p", { class: "need", role: "alert" }, saveBlockedText(lang));
  const hasDates = withoutPlanDates(recs, goalId).length > 0;

  const save = () => {
    if (!entryNs()) { d.msg = { key: "entry.consent.saveBlocked" }; rerender(); return; }
    if (result.kind !== "ok") return;
    const puts = withPlanDates(recs, result.rows, labelFor(goal.ns)); for (const r of puts) storeOf(r).put(inNs(r, r.ns));
    d.msg = { key: "bw.saved", args: { n: num(puts.length, lang) } }; rerender();
  };
  const clear = () => { const puts = withoutPlanDates(recs, goalId); for (const r of puts) storeOf(r).put(inNs(r, r.ns)); d.msg = { key: "bw.cleared", args: { n: num(puts.length, lang) } }; rerender(); };

  const lastTitle = d.order.length ? title.get(d.order[d.order.length - 1]!)! : "";
  const picker = !steps.length ? h("p", { class: "muted", "data-bw": "nosteps" }, t("bw.steps.none", lang), " ", link("#/diary/plan", "crumb", t("bw.steps.add", lang)))
    : remaining.length ? h("div", { "data-bw": "pick" }, h("h3", {}, d.order.length ? t("bw.q.before", lang, { title: lastTitle }) : t("bw.q.last", lang)),
      ...remaining.map((s) => h("button", { type: "button", class: "btn ghost", "data-bw-step": s.id, style: "min-height:44px", onclick: () => { d.order = [...d.order, s.id]; d.msg = null; rerender(); } }, s.title)))
      : h("p", { class: "ok-msg", role: "status", "data-bw": "allplaced" }, t("bw.q.done", lang));
  const placed = d.order.length ? h("div", { "data-bw": "placed" }, h("h3", {}, t("bw.placed", lang)), h("ol", {}, ...d.order.map((id) => h("li", { "data-bw-placed": id }, title.get(id)!))),
    h("button", { type: "button", class: "btn ghost", "data-act": "bw-undo", style: "min-height:44px", onclick: () => { d.order = d.order.slice(0, -1); d.msg = null; rerender(); } }, t("bw.undo", lang))) : null;
  const out = result.kind === "ok" ? h("section", { class: "card", "data-bw": "result" }, h("h2", { class: "card-h" }, t("bw.result", lang)),
      h("ol", {}, ...result.rows.map((r) => h("li", { "data-bw-row": r.id, "data-date": r.date }, `${r.date} · ${title.get(r.id)}`))),
      h("p", { class: "muted" }, t("bw.even", lang)), result.shared ? h("p", { class: "muted", "data-bw": "shared" }, t("bw.shared", lang)) : null,
      steps.length > d.order.length ? h("p", { class: "muted", "data-bw": "unplaced" }, t("bw.unplaced", lang, { n: num(steps.length - d.order.length, lang) })) : null,
      h("button", { type: "button", class: "btn", "data-act": "bw-save", style: "min-height:44px", onclick: save }, t("bw.save", lang)))
    : null;
  const dateNote = result.kind === "past" ? h("p", { class: "need", role: "status", "data-bw": "past" }, t("bw.date.past", lang)) : !d.target ? h("p", { class: "need", role: "status", "data-bw": "nodate" }, t("bw.date.unset", lang)) : null;
  return h("main", { "data-backward": goalId }, link("#/journey/backward", "crumb", `← ${t("bw.title", lang)}`), h("h1", {}, t("bw.title", lang)), h("p", { class: "sub" }, textOf(goal, "goal.title")), h("p", {}, t("bw.intro", lang)), gate,
    h("section", { class: "card" }, h("label", { for: "bw-date" }, t("bw.date", lang)), dateIn, dateNote),
    h("section", { class: "card" }, picker, placed),
    out,
    d.msg ? h("p", { class: "ok-msg", role: "status", "data-bw": "msg" }, t(d.msg.key, lang, d.msg.args)) : null,
    hasDates ? h("button", { type: "button", class: "btn ghost", "data-act": "bw-clear", style: "min-height:44px", onclick: clear }, t("bw.clear", lang)) : null);
}

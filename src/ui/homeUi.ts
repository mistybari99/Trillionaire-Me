// Home cards: money summary (net worth, income, expenses) from the user's own Money entries, and a rule-based "Next best action".
// Unknown when nothing is entered; the DEMO tag shows in demo mode; BDT only; no invented figure, no percent in the action card.
import { h } from "./dom";
import { t, fmtNumber } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { activeNs, allRecs, nsTag } from "./entry";
import { valueEl } from "./components";
import { financeFrom } from "../core/financeInputs";
import { moneySummary, type Metric, type ScopeSummary } from "../core/homeSummary";
import { nextBestAction, type NextAction } from "../core/nextAction";

const METRICS = [["networth", "netWorth", "home.sum.networth"], ["income", "income", "home.sum.income"], ["expenses", "expenses", "home.sum.expenses"]] as const;

function metricText(m: Metric, lang: Locale): HTMLElement {
  if (m.state === "value") return valueEl(t("money.bdt", lang, { v: fmtNumber(m.value, lang) }), m.label, lang);
  return h("span", { class: "muted", "data-unknown": "1" }, m.state === "unknown" ? t("home.sum.missing", lang, { n: fmtNumber(m.missing, lang) }) : t("home.sum.unknown", lang));
}

function metricCard(id: string, key: Key, pick: "netWorth" | "income" | "expenses", scopes: ScopeSummary[], lang: Locale): HTMLElement {
  const multi = scopes.length > 1;
  return h("article", { class: "card home-card", "data-home-card": id },
    h("h3", { class: "card-h" }, t(key, lang)),
    ...scopes.map((sc) => { const m = sc[pick]; return h("p", { class: "home-val", "data-scope": sc.scope, "data-state": m.state },
      multi ? h("small", {}, `${t(`money.${sc.scope}` as Key, lang)}: `) : null, metricText(m, lang)); }));
}

/** Three summary cards. Personal and business are never added together; business shows only when the user entered business items. */
export function homeSummaryCards(lang: Locale): HTMLElement {
  const fv = financeFrom(allRecs()); const scopes = moneySummary(fv.items).scopes;
  return h("section", { class: "home-sum", "data-home-summary": activeNs(), "aria-label": t("home.sum.title", lang) },
    h("div", { class: "row" }, h("h2", {}, t("home.sum.title", lang)), nsTag(activeNs(), lang)),
    h("div", { class: "home-grid" }, ...METRICS.map(([id, pick, key]) => metricCard(id, key, pick, scopes, lang))),
    h("p", { class: "muted" }, t("home.sum.note", lang), " ", t("home.saved", lang)),
    h("a", { href: "#/diary/money", class: "btn ghost", style: "width:auto;margin:0;min-height:44px" }, t("home.sum.open", lang)));
}

const BTN: Record<NextAction["id"], Key> = { add_goal: "next.btn.diary", link_task: "next.btn.plan", add_task: "next.btn.plan", do_task: "next.btn.plan", add_money: "next.btn.money", rate_life: "next.btn.wheel", review_plan: "next.btn.plan" };

/** One rule-based suggestion. The reason is always shown. Only the user's own words are used in the text. */
export function nextActionCard(lang: Locale): HTMLElement {
  const a = nextBestAction(allRecs());
  const args = { ...a.args }; if (a.id === "do_task" && !args.task) args.task = t("next.task.untitled", lang);
  return h("aside", { class: "card next-action", "data-next-action": a.id, "aria-label": t("next.title", lang) },
    h("h2", { class: "card-h" }, t("next.title", lang)),
    h("p", { class: "next-title", "data-next-title": "1" }, t(`next.${a.id}.title` as Key, lang, args)),
    h("p", { class: "next-why", "data-next-reason": "1" }, h("strong", {}, `${t("next.why", lang)} `), t(`next.${a.id}.reason` as Key, lang)),
    h("a", { href: a.href, class: "btn", "data-act": "next-go", style: "width:auto;margin:0;min-height:44px" }, t(BTN[a.id], lang)),
    h("p", { class: "muted" }, t("next.note", lang)));
}

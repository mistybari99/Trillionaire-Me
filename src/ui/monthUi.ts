// M16 monthly review and the money / risk blocks shared by the weekly, monthly and 90-day reviews.
// Own records only; unknown is never 0; a gap is "more to go", never a failure. The assumptions check only asks: the user decides.
import { remindRow } from "./remindUi";
import { h } from "./dom";
import { t, fmtNumber } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { prefs } from "./state";
import { buildPlanInput } from "../core/planInputs";
import { ASSUMPTION_EVENT, assumptionItems, assumptionLog, moneyReview, monthlySummary, riskReview, type AssumptionItem, type Fig } from "../core/monthlyReview";
import { eventRecord } from "../core/realityLoop";
import { activeNs, allRecs, entryNs, nsTag, putMode, saveBlockedText, saveTyped } from "./entry";
import { disclaimers, num, valueEl } from "./components";
import { bdt, estimateLabel } from "./ventureCard";
import { kpiSection, todayIsoKpi } from "./kpiUi";
import { activityChart } from "./charts";
import { loadAnswers } from "./screens";
import { thenNowCard } from "./welcomeUi";

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
const link = (href: string, cls: string, ...kids: Array<Node | string>) => h("a", { href, class: cls }, ...kids);

const figEl = (f: Fig, lang: Locale): HTMLElement => f.state === "value" ? valueEl(bdt(f.value, lang), estimateLabel(), lang)
  : h("span", { class: "muted", "data-unknown": "1" }, t(f.why === "no_lines" ? "mo.money.nolines" : "mo.money.incomplete", lang));

/** Monthly money figures as entered (not tied to the review window: money lines are monthly amounts). Nothing is drawn without a monthly line. */
export function moneyReviewCard(lang: Locale): HTMLElement | null {
  const rows = moneyReview(allRecs());
  if (!rows.length) return null;
  return h("section", { class: "card", "data-review-money": String(rows.length), "aria-label": t("mo.money.title", lang) },
    h("div", { class: "row" }, h("h2", { class: "card-h" }, t("mo.money.title", lang)), nsTag(activeNs(), lang)),
    ...rows.map((r) => h("div", { "data-money-scope": r.scope },
      h("p", {}, h("strong", {}, t(`mo.money.${r.scope}` as Key, lang))),
      h("p", {}, h("span", { class: "muted" }, `${t("mo.money.income", lang)}: `), figEl(r.income, lang), h("span", { class: "muted" }, ` · ${t("mo.money.expense", lang)}: `), figEl(r.expense, lang)),
      h("p", {}, h("span", { class: "muted" }, `${t("mo.money.flow", lang)}: `), figEl(r.cashFlow, lang)))),
    h("p", { class: "muted" }, t("mo.money.note", lang)),
    link("#/diary/money", "crumb", t("mo.money.open", lang)));
}

/** Risks in a review: the ones whose review date has come or is near, how many have no stop rule. Nothing is drawn without a risk. */
export function riskReviewCard(lang: Locale): HTMLElement | null {
  const r = riskReview(allRecs(), todayIsoKpi());
  if (!r.total) return null;
  const list = [...r.due, ...r.soon];
  return h("section", { class: "card", "data-review-risk": String(r.total), "aria-label": t("mo.risk.title", lang) },
    h("div", { class: "row" }, h("h2", { class: "card-h" }, t("mo.risk.title", lang)), nsTag(activeNs(), lang)),
    h("p", {}, t("mo.risk.count", lang, { n: fmtNumber(r.total, lang) })),
    list.length ? h("ul", { class: "plain" }, ...list.map((x) => h("li", { "data-review-risk-row": x.id }, h("strong", {}, x.text), h("span", { class: "muted" }, ` · ${x.reviewOn ?? ""} · ${t(r.due.includes(x) ? "risk.due.now" : "risk.due.soon", lang)}`))))
      : h("p", { class: "muted", "data-review-risk-none": "1" }, t("mo.risk.none", lang)),
    r.noStopRule ? h("p", { class: "muted" }, t("mo.risk.nostop", lang, { n: fmtNumber(r.noStopRule, lang) })) : null,
    link("#/journey/risks", "crumb", t("risk.due.open", lang)));
}

function assumptionRow(it: AssumptionItem, lang: Locale): HTMLElement {
  const v = it.value;
  const shown = v.state === "value" ? (v.unit === "hours_week" ? t("mo.asm.hours", lang, { h: fmtNumber(v.value, lang) }) : t("mo.asm.bdt", lang, { v: bdt(v.value, lang) }))
    : t(`mo.asm.why.${v.why}` as Key, lang);
  const msg = h("p", { class: "err", role: "alert" });
  const still = h("button", { class: "btn ghost", type: "button", "data-act": "asm-still", "data-asm": it.key, style: "width:auto;margin:6px 6px 0 0;min-height:44px" }, t("mo.asm.still", lang));
  still.addEventListener("click", () => {
    if (!entryNs()) { msg.textContent = saveBlockedText(lang); return; }
    const base = assumptionLog({ id: `asm-${it.key}-${Date.now().toString(36)}`, key: it.key, text: t("mo.asm.logged", lang, { what: t(`mo.asm.${it.key}` as Key, lang), date: todayIsoKpi() }), createdAt: new Date().toISOString() });
    putMode(base); rerender();
  });
  const change = h("button", { class: "btn ghost", type: "button", "data-act": "asm-change", "data-asm": it.key, style: "width:auto;margin:6px 0 0;min-height:44px" }, t("mo.asm.change", lang));
  change.addEventListener("click", () => {
    const id = `ev-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const ev = eventRecord({ id, kind: ASSUMPTION_EVENT[it.key], note: t("mo.asm.eventNote", lang, { what: t(`mo.asm.${it.key}` as Key, lang) }).slice(0, 200), on: todayIsoKpi(), goalId: null, createdAt: new Date().toISOString() });
    if (!saveTyped({ id, entity: ev.entity, createdAt: ev.createdAt, values: ev.values })) { msg.textContent = saveBlockedText(lang); return; }
    location.hash = "#/journey/reality"; rerender();
  });
  return h("li", { "data-asm-row": it.key },
    h("strong", {}, t(`mo.asm.${it.key}` as Key, lang)), h("p", {}, h("span", { class: "muted" }, `${t("mo.asm.you", lang)}: `), shown),
    h("p", { class: "muted", "data-asm-last": it.lastChecked ?? "never" }, it.lastChecked ? t("mo.asm.last", lang, { d: it.lastChecked }) : t("mo.asm.never", lang)),
    h("p", {}, t("mo.asm.ask", lang)), still, change, msg);
}

export function monthScreen(): HTMLElement {
  const lang = prefs.lang; const recs = allRecs(); const today = todayIsoKpi(); const s = monthlySummary(recs, today);
  const one = (n: number | null, key: Key) => (n === null ? null : t(key, lang, { n: num(n, lang) }));
  const measures: Array<[string, Key, string | null]> = [
    ["tasks", "month.tasks", one(s.tasksDone, "month.tasks.n")],
    ["focus", "month.focus", s.focusMinutes === null ? null : t("month.focus.n", lang, { m: num(Math.round(s.focusMinutes), lang) })],
    ["habits", "month.habits", one(s.habitCheckins, "month.habits.n")],
    ["passes", "month.passes", one(s.stagePasses, "month.passes.n")]];
  const free = buildPlanInput(loadAnswers(), recs, prefs.mode).weeklyFreeMinutes;
  const items = assumptionItems(recs, free);
  return h("main", { class: "scr scr-month" }, link("#/journey", "crumb", `← ${t("journey.title", lang)}`),
    h("h1", {}, t("month.title", lang)), h("p", { class: "sub" }, t("month.intro", lang)), remindRow("review", "monthly", lang),
    h("p", { class: "muted", "data-month-period": "1" }, valueEl(t("review.period", lang, { from: s.from, to: s.to }), activeNs() === "real" ? "FACT" : "DEMO", lang)),
    activityChart(recs, today, lang),
    ...measures.map(([id, title, v]) => h("section", { class: "card", "data-month": id }, h("h2", { class: "card-h" }, t(title, lang)),
      v === null ? h("p", { class: "muted", "data-month-empty": id }, t("month.notEnough", lang)) : valueEl(v, "INFERENCE", lang))),
    thenNowCard(lang), kpiSection("days90", lang), moneyReviewCard(lang), riskReviewCard(lang),
    h("section", { class: "card", "data-assumptions": "1", "aria-label": t("mo.asm.title", lang) }, h("h2", { class: "card-h" }, t("mo.asm.title", lang)), h("p", { class: "muted" }, t("mo.asm.intro", lang)),
      h("ul", { class: "plain" }, ...items.map((it) => assumptionRow(it, lang)))),
    s.focusUnknown > 0 ? h("p", { class: "muted" }, t("month.unknownFocus", lang, { n: num(s.focusUnknown, lang) })) : null,
    h("p", { class: "muted" }, t("month.quiet", lang)),
    link("#/journey/week", "crumb", t("week.link", lang)), " ", link("#/journey/review", "crumb", t("review.link", lang)), disclaimers(lang));
}

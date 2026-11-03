// "Welcome back" card on Today and the "then and now" card on the monthly review. Own records only (src/core/welcomeBack.ts).
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { prefs } from "./state";
import { allRecs } from "./entry";
import { num } from "./components";
import { dismissWelcome, showWelcome, stepVisit, thenVsNow, welcomeFacts, type Measure } from "../core/welcomeBack";
import { todayIsoKpi } from "./kpiUi";

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));

/** Calm card for someone who has been away 3 days or more. Decided once per day on the first open; "Not now" hides it for the day. */
export function welcomeBackCard(lang: Locale): HTMLElement | null {
  const today = todayIsoKpi(); const before = prefs.visit; const next = stepVisit(before, today);
  if (next !== before) prefs.visit = next;
  const w = showWelcome(next, today); if (!w) return null;
  const f = welcomeFacts(allRecs());
  return h("aside", { class: "card", role: "status", "data-welcome-back": String(w.away) },
    h("h2", { class: "card-h" }, t("wb.title", lang)),
    h("p", {}, t("wb.body", lang, { n: num(w.away, lang) })),
    f.openSteps !== null && f.openSteps > 0 ? h("p", { "data-wb-steps": String(f.openSteps) }, t("wb.steps", lang, { n: num(f.openSteps, lang) }), f.nextStep ? " " + t("wb.next", lang, { s: f.nextStep }) : "") : null,
    h("a", { href: "#/diary/plan", class: "btn", "data-act": "wb-open", style: "width:auto;margin:0;min-height:44px" }, t("wb.open", lang)),
    h("button", { class: "btn ghost", type: "button", "data-act": "wb-dismiss", style: "width:auto;margin:0 0 0 8px;min-height:44px", onclick: () => { prefs.visit = dismissWelcome(prefs.visit); rerender(); } }, t("wb.later", lang)));
}

const LABEL: Record<Measure, Key> = { tasks: "month.tasks", focus: "month.focus", habits: "month.habits", notes: "month.tn.notes" };
/** The last 30 days next to the 30 days before. "Not recorded" when a side has no entry; no comparison is made then. */
export function thenNowCard(lang: Locale): HTMLElement {
  const tn = thenVsNow(allRecs(), todayIsoKpi());
  const show = (m: Measure, n: number | null) => (n === null ? t("month.tn.none", lang) : m === "focus" ? t("month.focus.n", lang, { m: num(Math.round(n), lang) }) : num(n, lang));
  return h("section", { class: "card", "data-then-now": tn.anyThen ? "1" : "none", "aria-label": t("month.tn.title", lang) },
    h("h2", { class: "card-h" }, t("month.tn.title", lang)), h("p", { class: "muted" }, t("month.tn.intro", lang, { a: tn.thenFrom, b: tn.thenTo, c: tn.nowFrom, d: tn.nowTo })),
    tn.anyThen ? h("ul", { class: "plain" }, ...tn.rows.map((r) => h("li", { "data-tn": r.id, ...(r.relation ? { "data-rel": r.relation } : {}) },
      h("strong", {}, t(LABEL[r.id], lang)), h("span", {}, ` · ${t("month.tn.then", lang)}: ${show(r.id, r.then)} · ${t("month.tn.now", lang)}: ${show(r.id, r.now)}`),
      r.relation ? h("span", { class: "muted" }, ` · ${t(`month.tn.rel.${r.relation}` as Key, lang)}`) : null)))
      : h("p", { class: "muted", "data-tn-empty": "1" }, t("month.tn.empty", lang)),
    h("p", { class: "muted" }, t("month.tn.note", lang)));
}

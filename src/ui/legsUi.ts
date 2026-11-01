// Four-legs status and leak audit screens. Own entries of the active mode only; Unknown when data is missing.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Key } from "../i18n/packs";
import { prefs } from "./state";
import { disclaimers, num, valueEl } from "./components";
import { allRecs } from "./entry";
import { ATTENTION_LEVERS, fourLegs, leakReview } from "../core/legs";

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
const back = (lang: typeof prefs.lang) => h("a", { href: "#/journey", class: "crumb" }, `← ${t("journey.title", lang)}`);
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export function legsScreen(): HTMLElement {
  const lang = prefs.lang; const r = fourLegs(allRecs(), todayIso());
  const cards = r.legs.map((l) => h("section", { class: "card", "data-leg": l.leg, "data-leg-state": l.state },
    h("h2", { class: "card-h" }, t(`legs.leg.${l.leg}` as Key, lang)),
    h("p", {}, h("strong", {}, t(`legs.state.${l.state}` as Key, lang))),
    h("p", { class: "muted" }, t(`legs.why.${l.why}` as Key, lang))));
  const names = r.lookAt.map((x) => t(`legs.leg.${x}` as Key, lang)).join(", ");
  return h("main", { "data-screen": "legs" }, back(lang), h("h1", {}, t("legs.title", lang)), h("p", { class: "sub" }, t("legs.intro", lang)),
    h("p", { role: "status", "data-legs-summary": r.lookAt.length ? "look" : "none" }, r.lookAt.length ? t("legs.look", lang, { names }) : t("legs.allgood", lang)),
    ...cards, h("p", { class: "muted" }, t("legs.note", lang)), disclaimers(lang, ["advice"]));
}

const marked = new Set<string>();
export function resetLeakState() { marked.clear(); }

export function leakScreen(): HTMLElement {
  const lang = prefs.lang; const scopes = leakReview(allRecs());
  const money = scopes.length === 0 ? [h("p", { class: "muted", "data-leak-empty": "1" }, t("leak.money.none", lang))] : scopes.map((s) => h("div", { "data-leak-scope": s.scope },
    scopes.length > 1 ? h("h3", {}, t(`money.${s.scope}` as Key, lang)) : null,
    s.top.length ? h("p", {}, t("leak.money.top", lang)) : h("p", { class: "muted", "data-leak-nothing": "1" }, t("leak.money.nothing", lang)),
    h("ul", {}, ...s.top.map((l) => h("li", { "data-leak-line": l.id }, `${l.label} · `, valueEl(t("money.bdt", lang, { v: num(l.amount, lang) }), "FACT", lang), " · ",
      l.shareOfIncome === null ? h("span", { class: "muted", "data-unknown": "1" }, t("leak.money.noshare", lang)) : valueEl(t("leak.money.share", lang, { p: num(l.shareOfIncome, lang) }), "ESTIMATE", lang)))),
    s.unknownCount ? h("p", { class: "muted", "data-leak-unknown": "1" }, t("leak.money.unknown", lang, { n: num(s.unknownCount, lang) })) : null,
    s.notMonthly ? h("p", { class: "muted" }, t("leak.money.notMonthly", lang, { n: num(s.notMonthly, lang) })) : null));
  const levers = ATTENTION_LEVERS.map((k) => {
    const on = marked.has(k);
    return h("li", { "data-lever": k }, h("strong", {}, t(`leak.att.${k}` as Key, lang)), h("p", {}, t(`leak.att.${k}.tip` as Key, lang)),
      h("button", { class: "btn ghost", type: "button", "data-act": "lever", "aria-pressed": String(on), style: "width:auto;min-height:44px", onclick: () => { if (on) marked.delete(k); else marked.add(k); rerender(); } }, on ? t("leak.att.marked", lang) : t("leak.att.mark", lang)));
  });
  return h("main", { "data-screen": "leak" }, back(lang), h("h1", {}, t("leak.title", lang)), h("p", { class: "sub" }, t("leak.intro", lang)),
    h("section", { class: "card" }, h("h2", { class: "card-h" }, t("leak.money.h", lang)), ...money),
    h("section", { class: "card" }, h("h2", { class: "card-h" }, t("leak.att.h", lang)), h("ul", {}, ...levers)),
    disclaimers(lang, ["advice"]));
}

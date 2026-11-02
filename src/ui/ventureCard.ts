// Venture portfolio summary (M09): the same card on the venture page, on Today and in the report.
// A total shows only when every venture has its figure; otherwise it says how many do. Nothing unknown is added as 0.
import { h } from "./dom";
import { t, fmtNumber } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import type { Label } from "../core/types";
import { portfolio, ventureViews, type Money, type Total } from "../core/ventures";
import { activeNs, allRecs, nsTag } from "./entry";
import { valueEl } from "./components";

/** Typed estimates are ESTIMATE in real mode (never FACT); in demo mode they stay DEMO. */
export const estimateLabel = (): Label => (activeNs() === "real" ? "ESTIMATE" : "DEMO");
export const bdt = (v: number, lang: Locale) => t("money.bdt", lang, { v: fmtNumber(Math.round(v * 100) / 100, lang) });

export function moneyEl(m: Money, lang: Locale, label: Label): HTMLElement {
  if (m.state === "value") return valueEl(bdt(m.value, lang), label, lang);
  return h("span", { class: "muted", "data-unknown": "1" }, m.state === "none" ? t("ven.acc.none", lang) : t("money.unknown", lang, { n: fmtNumber(m.missing, lang) }));
}

function totalEl(tt: Total, lang: Locale): HTMLElement {
  if (tt.state === "value") return valueEl(bdt(tt.value, lang), estimateLabel(), lang);
  if (tt.state === "none") return h("span", { class: "muted", "data-unknown": "1" }, t("ven.pf.none", lang));
  return h("span", { class: "muted", "data-unknown": "1", "data-incomplete": "1" }, t("ven.pf.incomplete", lang, { k: fmtNumber(tt.known, lang), n: fmtNumber(tt.of, lang) }));
}

/** All ventures together. Null when the user has no venture, so an empty start stays quiet. */
export function portfolioCard(lang: Locale, where: "page" | "today" | "report"): HTMLElement | null {
  const pf = portfolio(ventureViews(allRecs()));
  if (pf.count === 0) return null;
  const line = (id: string, key: Key, tt: Total) => h("p", { "data-pf": id, "data-state": tt.state }, h("span", { class: "muted" }, `${t(key, lang)}: `), totalEl(tt, lang));
  return h("section", { class: "card", "data-portfolio": where, "aria-label": t("ven.pf.title", lang) },
    h("div", { class: "row" }, h("h2", { class: "card-h" }, t(where === "today" ? "ven.today.title" : "ven.pf.title", lang)), nsTag(activeNs(), lang)),
    h("p", { class: "muted", "data-pf-count": String(pf.count) }, t("ven.pf.count", lang, { n: fmtNumber(pf.count, lang) })),
    line("value", "ven.pf.value", pf.value), line("share", "ven.pf.share", pf.share), line("net", "ven.pf.net", pf.monthlyNet),
    h("p", { class: "muted" }, t("ven.pf.note", lang)),
    where === "page" ? null : h("a", { href: "#/diary/ventures", class: "crumb" }, t("ven.pf.open", lang)));
}

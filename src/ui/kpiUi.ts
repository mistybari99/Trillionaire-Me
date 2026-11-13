// KPI target display (M16): the same rows appear on the weekly review, the 90-day review, the report, Today and the KPI page.
// Planned against actual, side by side. Wording stays neutral: a gap is "more to reach it", never a failure; unknown is never 0.
import { h } from "./dom";
import { t, fmtNumber } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import type { Label } from "../core/types";
import { kpiStatus, type KpiPeriod, type KpiStatus } from "../core/kpi";
import { activeNs, allRecs, nsTag } from "./entry";
import { valueEl } from "./components";

export const todayIsoKpi = (): string => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const fmt = (n: number, lang: Locale) => fmtNumber(Math.round(n * 10) / 10, lang);

/** One target with its actual. Words carry the meaning (the bar is a picture of the same sentence). */
export function kpiRowView(st: KpiStatus, lang: Locale): HTMLElement {
  const { row, actual, progress } = st;
  const unit = row.unit ? ` ${row.unit}` : "";
  const ownLabel: Label = row.ns === "real" ? "FACT" : "DEMO";
  const targetEl = row.target === null ? h("span", { class: "muted", "data-kpi-notarget": "1" }, t("kpi.noTarget", lang)) : valueEl(`${fmt(row.target, lang)}${unit}`, row.targetLabel ?? ownLabel, lang);
  const actualEl = actual.state === "value"
    ? valueEl(`${fmt(actual.value, lang)}${unit}`, actual.source === "own" ? ownLabel : "INFERENCE", lang)
    : h("span", { class: "muted", "data-kpi-unknown": "1" }, t(actual.why === "not_entered" ? "kpi.notEntered" : "kpi.noRecords", lang));
  const pct = progress.state === "value" ? Math.max(0, Math.min(100, progress.pct)) : null;
  const toGo = progress.state === "value" && !progress.reached && row.target !== null && actual.state === "value" ? row.target - actual.value : null;
  return h("div", { class: "kpi-row", "data-kpi": row.id, "data-kpi-state": progress.state },
    h("p", {}, h("strong", {}, row.name), h("span", { class: "muted" }, ` · ${t(`kpi.per.${row.period}` as Key, lang)}`)),
    h("p", {}, h("span", { class: "muted" }, `${t("kpi.row.target", lang)}: `), targetEl, h("span", { class: "muted" }, ` · ${t("kpi.row.sofar", lang)}: `), actualEl,
      actual.state === "value" && actual.source === "own" && actual.asOf ? h("small", { class: "muted" }, ` (${t("kpi.asOf", lang, { d: actual.asOf })})`) : null),
    pct === null ? null : h("div", { class: "ov-bar", role: "img", "aria-label": t("kpi.bar", lang, { p: String(pct) }), "data-kpi-bar": String(pct) }, h("i", { style: `width:${pct}%` })),
    progress.state === "value"
      ? h("p", { class: "muted", "data-kpi-text": progress.reached ? "reached" : "partial" }, progress.reached ? t("kpi.reached", lang) : t("kpi.pct", lang, { p: String(progress.pct) }), toGo !== null ? ` · ${t("kpi.toGo", lang, { n: `${fmt(toGo, lang)}${unit}` })}` : "")
      : null);
}

/** A titled block of targets for one period, with a link to set them. Empty periods say so and keep the link. */
export function kpiSection(period: KpiPeriod, lang: Locale): HTMLElement {
  const rows = kpiStatus(allRecs(), todayIsoKpi(), period);
  return h("section", { class: "card", "data-kpi-section": period, "aria-label": t(`kpi.section.${period}` as Key, lang) },
    h("div", { class: "row" }, h("h2", { class: "card-h" }, t(`kpi.section.${period}` as Key, lang)), nsTag(activeNs(), lang)),
    rows.length ? h("div", {}, ...rows.map((r) => kpiRowView(r, lang))) : h("p", { class: "muted", "data-kpi-empty": period }, t("kpi.section.empty", lang)),
    h("a", { href: "#/journey/kpi", class: "crumb" }, t("kpi.section.open", lang)));
}

/** Today: this week's targets (up to three). Nothing is drawn when the user has set none, so an empty start stays quiet. */
export function kpiTodayCard(lang: Locale): HTMLElement | null {
  const rows = kpiStatus(allRecs(), todayIsoKpi(), "week");
  if (!rows.length) return null;
  return h("section", { class: "card", "data-kpi-today": String(rows.length), "aria-label": t("kpi.today.title", lang) },
    h("div", { class: "row" }, h("h2", { class: "card-h" }, t("kpi.today.title", lang)), nsTag(activeNs(), lang)),
    ...rows.slice(0, 3).map((r) => kpiRowView(r, lang)),
    h("a", { href: "#/journey/kpi", class: "crumb" }, t("kpi.section.open", lang)));
}

// North Star progress (M03): start, where you are now, target, steps passed, and one weighted overall figure when there are several measures.
// The same rows appear on the North Star page, Journey, Today and the report. Unknown is never 0; wording stays neutral.
import { h } from "./dom";
import { t, fmtNumber } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import type { Label } from "../core/types";
import { overallProgress, starViews, type Now, type Overall, type StarView } from "../core/northStar";
import { activeNs, allRecs, nsTag } from "./entry";
import { valueEl } from "./components";
import { bdt } from "./ventureCard";

const fmt = (n: number, lang: Locale) => fmtNumber(Math.round(n * 100) / 100, lang);

function nowText(now: Now, lang: Locale): string {
  if (now.state === "value") return "";
  if (now.why === "incomplete" && now.of !== undefined) return t("ns.now.incompleteV", lang, { k: fmtNumber(now.known ?? 0, lang), n: fmtNumber(now.of, lang) });
  return t(`ns.now.${now.why}` as Key, lang);
}

/** One measure with its start, now and target, and how far along it is. */
export function starRowView(v: StarView, lang: Locale): HTMLElement {
  const { row, now, progress: p } = v;
  const unit = row.unit ? ` ${row.unit}` : "";
  const own: Label = row.ns === "real" ? "FACT" : "DEMO";
  const num = (n: number | null) => (n === null ? h("span", { class: "muted", "data-unknown": "1" }, t("unknown.unknown", lang)) : valueEl(`${fmt(n, lang)}${unit}`, own, lang));
  const nowEl = now.state === "value"
    ? (now.source === "own" ? valueEl(`${fmt(now.value, lang)}${unit}`, own, lang) : valueEl(bdt(now.value, lang), "ESTIMATE", lang))
    : h("span", { class: "muted", "data-now-unknown": now.why }, nowText(now, lang));
  const pct = p.state === "value" ? p.pct : null;
  return h("div", { class: "star-row", "data-star": row.id, "data-star-state": p.state },
    h("p", {}, h("strong", {}, row.metric), row.unit ? h("span", { class: "muted" }, ` (${row.unit})`) : null),
    h("p", {}, h("span", { class: "muted" }, `${t("ns.row.start", lang)}: `), num(row.baseline), h("span", { class: "muted" }, ` · ${t("ns.row.now", lang)}: `), nowEl,
      h("span", { class: "muted" }, ` · ${t("ns.row.target", lang)}: `), num(row.target),
      now.state === "value" && now.source === "own" && now.asOf ? h("small", { class: "muted" }, ` (${t("ns.asOf", lang, { d: now.asOf })})`) : null),
    now.state === "value" && now.source !== "own" ? h("p", { class: "muted", "data-now-source": now.source }, t(`ns.src.note.${now.source}` as Key, lang)) : null,
    pct === null ? null : h("div", { class: "ov-bar", role: "img", "aria-label": t("ns.bar", lang, { p: String(pct) }), "data-star-bar": String(pct) }, h("i", { style: `width:${pct}%` })),
    p.state === "value"
      ? h("p", { class: "muted", "data-star-text": p.reached ? "reached" : p.below ? "below" : "partial" }, p.reached ? t("ns.reached", lang) : p.below ? t("ns.below", lang) : t("ns.pct", lang, { p: String(p.pct) }), " · ", t("ns.passed", lang, { a: fmtNumber(p.passed, lang), b: fmtNumber(p.of, lang) }))
      : p.state === "same" ? h("p", { class: "muted", "data-star-text": "same" }, t("ns.same", lang))
        : h("p", { class: "muted", "data-star-text": "unknown" }, t("ns.prog.unknown", lang, { what: p.missing.map((m) => t(`ns.missing.${m}` as Key, lang)).join(", ") })));
}

export function overallEl(o: Overall, lang: Locale): HTMLElement | null {
  if (o.state === "none") return null;
  if (o.state === "incomplete") return h("p", { class: "muted", "data-overall": "incomplete" }, t("ns.overall.incomplete", lang, { k: fmtNumber(o.known, lang), n: fmtNumber(o.of, lang) }));
  return h("div", { "data-overall": "value" },
    h("p", {}, h("span", { class: "muted" }, `${t("ns.overall", lang)}: `), valueEl(`${o.pct}%`, "INFERENCE", lang)),
    h("div", { class: "ov-bar", role: "img", "aria-label": t("ns.bar", lang, { p: String(o.pct) }), "data-overall-bar": String(o.pct) }, h("i", { style: `width:${o.pct}%` })),
    h("p", { class: "muted" }, t("ns.overall.note", lang)));
}

/** Journey, Today and the report. Nothing is drawn when the user has no measure, so an empty start stays quiet. */
export function northStarCard(lang: Locale, where: "journey" | "today" | "report"): HTMLElement | null {
  const views = starViews(allRecs());
  if (!views.length) return null;
  const shown = where === "today" ? views.slice(0, 3) : views;
  return h("section", { class: "card", "data-star-card": where, "aria-label": t("ns.card.title", lang) },
    h("div", { class: "row" }, h("h2", { class: "card-h" }, t("ns.card.title", lang)), nsTag(activeNs(), lang)),
    ...shown.map((v) => starRowView(v, lang)),
    where === "today" && views.length > shown.length ? h("p", { class: "muted" }, t("ns.card.more", lang, { n: fmtNumber(views.length - shown.length, lang) })) : null,
    overallEl(overallProgress(views), lang),
    h("a", { href: "#/journey/northstar", class: "crumb" }, t("ns.card.open", lang)));
}

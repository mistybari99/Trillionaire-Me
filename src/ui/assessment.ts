// O5 (C): assessment and path-fit cards on the Plan screen. Simple cards; no ordering by merit, no red copy, no external calls.
import { h } from "./dom";
import { t, tb } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { num } from "./components";
import type { TMRecord } from "../core/types";
import { DIMENSIONS, assessmentFrom, pathFit, levelsOf, type Dimension, type PathFit, type Source } from "../core/assessment";
import { THEME_LABEL } from "../library/paths";

const list = (xs: string[]) => xs.join(", ");

function dimensionCard(d: Dimension, s: ReturnType<typeof levelsOf>["dimensions"][Dimension], lang: Locale): HTMLElement {
  const head = h("h3", {}, t(`assess.dim.${d}` as Key, lang));
  if (s.status === "not_enough_data") return h("div", { class: "card", "data-dim": d, "data-status": s.status }, head, h("p", { class: "muted" }, t("assess.notEnough", lang)));
  const rating = s.level === null
    ? h("p", { class: "muted", "data-rating": "none" }, t("assess.noRating", lang))
    : h("p", { class: "muted", "data-rating": "given" }, t("assess.avg", lang, { avg: num(Math.round((s.level / 20) * 10) / 10, lang) }), " · ", t("assess.rated", lang, { n: num(s.rated, lang), total: num(s.count, lang) }));
  return h("div", { class: "card", "data-dim": d, "data-status": s.status }, head, h("p", {}, list(s.names)), d === "strengths" ? null : rating);
}

function fitCard(f: PathFit, lang: Locale): HTMLElement {
  const srcLabel = (s: Source) => t(`fit.src.${s}` as Key, lang);
  const unmapped = f.unmapped.length ? h("p", { class: "muted", "data-unmapped": "1" }, t("fit.unmapped", lang, { list: list(f.unmapped) })) : null;
  const body = f.status === "not_enough_data"
    ? [h("p", { class: "muted", "data-fit": "not_enough_data" }, t("fit.notEnough", lang)), h("a", { class: "crumb", href: "#/diary/intake/2" }, t("fit.add", lang))]
    : f.status === "no_match" ? [h("p", { class: "muted", "data-fit": "no_match" }, t("fit.none", lang)), unmapped]
    : f.matches.map((m) => h("div", { class: "card", "data-path": m.path.id },
      h("h3", {}, tb(m.path.name, lang)),
      h("p", {}, tb(m.path.summary, lang)),
      ...m.reasons.map((r) => h("p", { class: "muted", "data-reason": r.theme }, t("fit.reason", lang, { src: srcLabel(r.source), text: r.text, theme: tb(THEME_LABEL[r.theme], lang) }))),
      m.unknownThemes.length ? h("p", { class: "muted", "data-unknown": "1" }, t("fit.unknown", lang, { list: list(m.unknownThemes.map((th) => tb(THEME_LABEL[th], lang))) })) : null,
      h("p", {}, t("fit.needs", lang, { text: tb(m.path.needs, lang) })),
      h("p", {}, t("fit.test", lang, { text: tb(m.path.firstTest, lang) })),
      m.path.caution ? h("p", { class: "muted", "data-caution": "1" }, t("fit.caution", lang, { text: tb(m.path.caution, lang) })) : null));
  return h("div", { class: "card", "data-fit-card": "1" },
    h("h3", {}, t("fit.title", lang)), h("p", { class: "muted" }, t("fit.intro", lang)),
    ...body,
    f.status === "matched" ? unmapped : null,
    h("p", { class: "muted" }, t("fit.draft", lang)));
}

/** Plan screen section: assessment cards, then path-fit cards. Reads only the user's own records. */
export function assessmentSection(recs: readonly TMRecord[], lang: Locale): HTMLElement {
  const a = assessmentFrom(recs);
  const s = levelsOf(a);
  return h("section", { "data-assessment": "1" },
    h("h2", {}, t("assess.title", lang)),
    h("p", { class: "sub" }, t("assess.intro", lang)),
    ...DIMENSIONS.map((d) => dimensionCard(d, s.dimensions[d], lang)),
    fitCard(pathFit(a), lang));
}

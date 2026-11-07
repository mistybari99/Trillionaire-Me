// Q-05: the Inspiration page (#/diary/inspiration): the four themes with their short lines, plus the Motivation / Discipline compare card.
import "./styles_qb1.css";
import { h } from "./dom";
import { t, tb } from "../i18n/t";
import { prefs } from "./state";
import { INSPIRATIONS, THEME_LABEL, type Inspiration } from "../library/inspiration";
import { TIPS } from "../library/topics";
import { diagram } from "./diagram";
import { disclaimers } from "./components";

const THEMES: Array<Inspiration["theme"]> = ["motivation", "discipline", "patience", "care"];

/** The 2-column Motivation / Discipline compare (a 'matrix' tip under the habits topic). Used on the habits topic page and here. */
export function compareCard(): HTMLElement | null {
  const lang = prefs.lang; const tip = TIPS.find((x) => x.id === "ha3"); if (!tip) return null;
  return h("section", { class: "card", "data-card": "motivation_discipline" }, h("h2", { class: "card-h" }, tb(tip.title, lang)), h("p", {}, tb(tip.how, lang)), diagram(tip, lang));
}

export function inspirationScreen(): HTMLElement {
  const lang = prefs.lang;
  return h("main", { class: "scr scr-inspiration" }, h("a", { href: "#/today", class: "crumb" }, `← ${t("nav.today", lang)}`),
    h("h1", {}, t("qb1.insp.h", lang)), h("p", { class: "sub" }, t("qb1.insp.intro", lang)),
    compareCard(),
    ...THEMES.map((th) => h("section", { class: "card", "data-theme-card": th }, h("h2", { class: "card-h" }, tb(THEME_LABEL[th], lang)),
      h("ul", { style: "padding-inline-start:20px" }, ...INSPIRATIONS.filter((x) => x.theme === th).map((x) => h("li", {}, tb({ bn: x.bn, en: x.en }, lang)))))),
    disclaimers(lang, ["noGuarantee"]));
}

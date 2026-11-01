// More > Halal-check flags (DRAFT). Questions to ask a qualified person. Not a fatwa, no verdict, nothing is saved or scored.
import { h } from "./dom";
import { t, tb } from "../i18n/t";
import type { Key } from "../i18n/packs";
import { prefs } from "./state";
import { disclaimers } from "./components";
import { FLAG_GROUPS, HALAL_FLAGS } from "../library/halalFlags";

export function halalFlagsScreen(): HTMLElement {
  const lang = prefs.lang;
  return h("main", { class: "scr scr-halal", "data-halal-flags": "draft" },
    h("a", { href: "#/more", class: "crumb" }, `← ${t("more.title", lang)}`),
    h("h1", {}, t("halal.title", lang)),
    h("div", { class: "note", role: "note", "data-halal-banner": "1" }, h("p", {}, h("b", {}, t("halal.banner", lang))), h("p", {}, t("halal.draft", lang))),
    h("p", { class: "sub" }, t("halal.intro", lang)),
    ...FLAG_GROUPS.map((g) => h("section", { class: "card", "data-flag-group": g },
      h("h2", { class: "card-h" }, t(`halal.group.${g}` as Key, lang)),
      h("ul", {}, ...HALAL_FLAGS.filter((x) => x.group === g).map((x) => h("li", { "data-flag": x.id }, tb(x.q, lang)))))),
    disclaimers(lang, ["noFatwa"]));
}

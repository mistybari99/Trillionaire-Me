import { h } from "./dom";
import { t } from "../i18n/t";
import type { Locale } from "../i18n/registry";

/** Product line + tagline (W5a). The app name stays "Trillionaire Me"; this is the subtitle. */
export function brandCard(lang: Locale): HTMLElement {
  return h("section", { class: "card brand-card", "data-brand": "1", "aria-label": t("brand.line", lang) },
    h("p", { class: "brand-line", "data-brand-line": "1" }, t("brand.line", lang)),
    h("p", { class: "brand-tagline", "data-brand-tagline": "1" }, t("brand.tagline", lang)));
}
export function brandAboutCard(lang: Locale): HTMLElement {
  return h("section", { class: "card brand-card", "data-brand": "about" }, h("h2", { class: "card-h" }, t("brand.line", lang)),
    h("p", { "data-brand-tagline": "1" }, t("brand.tagline", lang)), h("p", { class: "muted" }, t("brand.about", lang)));
}

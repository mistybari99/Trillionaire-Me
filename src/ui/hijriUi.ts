// Deen page: calculated Hijri date and Ramadan view (src/core/hijri.ts). Plain, calm, never a ruling or a count of days kept.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Locale } from "../i18n/registry";
import { dhakaNow } from "../core/prayer";
import { HIJRI_MONTHS_BN, HIJRI_MONTHS_EN, ramadanView } from "../core/hijri";
import { num } from "./components";

export function hijriCard(lang: Locale): HTMLElement {
  const v = ramadanView(dhakaNow(Date.now()).date);
  const month = (m: number) => (lang === "en" ? HIJRI_MONTHS_EN : HIJRI_MONTHS_BN)[m - 1]!;
  const body: HTMLElement[] = [];
  if (v.state === "unknown") body.push(h("p", { class: "muted", "data-hijri": "unknown" }, t("deen.hijri.unknown", lang)));
  else {
    body.push(h("p", { "data-hijri": "today" }, t("deen.hijri.today", lang, { d: num(v.hijri.d, lang), m: month(v.hijri.m), y: num(v.hijri.y, lang) })));
    if (v.state === "during") body.push(h("p", { "data-ramadan": "during" }, t("deen.hijri.during", lang, { n: num(v.day, lang) }), v.endsInDays !== null ? " " + t("deen.hijri.ends", lang, { n: num(v.endsInDays, lang) }) : ""));
    else body.push(h("p", { "data-ramadan": "upcoming" }, t("deen.hijri.upcoming", lang, { n: num(v.inDays, lang), d: v.startsAround })));
  }
  return h("div", { class: "card", "data-hijri-card": "1" }, h("h2", { class: "card-h" }, t("deen.hijri.title", lang)), ...body,
    h("p", { class: "note" }, t("deen.hijri.note", lang), " ", t("deen.hijri.official", lang)));
}

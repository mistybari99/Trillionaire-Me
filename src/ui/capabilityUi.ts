// Capability cards (TM-REQ-144, redefined 2 Nov 2026). One card per module with TWO separate parts:
//  1. Build status: six boxes (Input, Storage, Calculation, Output, Export, Links) and one label computed from them.
//  2. Data status: what THIS phone holds in the mode that is showing (the only place the word Demo is used for a module).
// Words carry the meaning; colour is only a hint (every box says Built / Missing / Not needed in text).
import { h } from "./dom";
import { t, tb } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { MODULES, BUILD_BOXES, CAP_ATTRS, buildLabel, missingBoxes, type BuildLabel, type ModuleDef } from "../modules/capability";
import { dataStatus, recordCount } from "../modules/dataStatus";
import { activeNs, allRecs } from "./entry";

const LABEL_CLASS: Record<BuildLabel, string> = { complete: "ok", partial: "warn", "not-built": "off", blocked: "warn" };
const STATE_CLASS = { built: "ok", missing: "warn", na: "off" } as const;

export const buildTag = (label: BuildLabel, lang: Locale) =>
  h("span", { class: `tag ${LABEL_CLASS[label]}`, "data-build": label }, t(`cap.build.${label}` as Key, lang));

/** The legend row on the status screen: the four labels. */
export const buildLegend = (lang: Locale) => h("div", { class: "tags", "data-cap-legend": "1" }, ...(["complete", "partial", "not-built", "blocked"] as const).map((l) => buildTag(l, lang)));

/** Keep technical descriptions available without filling the everyday workspace. */
export function moduleDetails(tab: ModuleDef["tab"], lang: Locale): HTMLElement {
  return h("details", { class: "card module-details", "data-module-details": tab },
    h("summary", {}, t("cap.details", lang)),
    ...MODULES.filter(m => m.tab === tab).map(m => moduleCard(m, lang)));
}

export function moduleCard(m: ModuleDef, lang: Locale, recs = allRecs(), mode = activeNs()): HTMLElement {
  const label = buildLabel(m);
  const miss = missingBoxes(m);
  const ds = dataStatus(m.id, recs, mode);
  const modeName = t(mode === "real" ? "badge.real" : "badge.demo", lang);
  const dataText = ds === "none" ? t("cap.data.none", lang) : ds === "empty" ? t("cap.data.empty", lang)
    : t(ds === "real" ? "cap.data.real" : "cap.data.demo", lang, { n: recordCount(m.id, recs, mode) });
  return h("div", { class: "card", "data-module": m.id },
    h("div", { class: "row" }, h("h2", { class: "card-h" }, `${m.id} · ${tb(m.name, lang)}`)),
    h("p", { class: "muted" }, tb(m.note, lang)),
    h("div", { class: "tags", "data-cap-build": m.id }, buildTag(label, lang),
      ...(label === "complete" ? [] : [h("span", { class: "tag off" }, t("cap.gate", lang, { g: m.gate }))])),
    h("ul", { class: "plain cap-boxes", "aria-label": t("cap.boxes", lang) },
      ...BUILD_BOXES.map((b) => h("li", { "data-box": b, "data-box-state": m.build[b] }, h("span", { class: "muted" }, `${t(`cap.box.${b}` as Key, lang)}: `),
        h("span", { class: `tag ${STATE_CLASS[m.build[b]]}` }, t(`cap.state.${m.build[b]}` as Key, lang))))),
    ...(miss.length ? [h("p", { class: "muted", "data-cap-missing": m.id }, t("cap.missing", lang, { list: miss.map((b) => t(`cap.box.${b}` as Key, lang)).join(", ") }), " · ", tb(m.missing, lang))] : []),
    ...(m.blockedBy ? [h("p", { class: "muted", "data-cap-blocked": m.id }, t("cap.blocked", lang, { d: m.blockedBy }))] : []),
    h("div", { class: "tags", "data-cap-attrs": m.id }, ...CAP_ATTRS.filter((a) => m.attrs.includes(a)).map((a) => h("span", { class: "tag", "data-attr": a }, t(`cap.attr.${a}` as Key, lang)))),
    h("p", { class: "muted", "data-cap-data": ds }, h("strong", {}, t("cap.data.label", lang, { mode: modeName }), ": "), dataText));
}

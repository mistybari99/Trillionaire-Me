// Settings > Demo or real data (settings redesign PR 3c, second part): the mode switch, the two counts, the permission gate
// (when not given) and links to Delete data, Privacy and Backup. "Start real now" is its own page (modeUi.startRealPage).
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Locale } from "../i18n/registry";
import { consentKv, store } from "./state";
import { num, demoBadge, disclaimers } from "./components";
import { readConsent } from "../core/consent";
import { consentGate } from "./consentGate";
import { modeSwitchCard, startRealPage } from "./modeUi";
import { categorySummary } from "./settingsUi";

const link = (href: string, cls: string, ...kids: Array<Node | string | null>) => h("a", { href, class: cls }, ...kids);

export function dataPage(row: string | undefined, lang: Locale): HTMLElement {
  if (row === "start-real") return startRealPage(lang);
  const realOn = readConsent(consentKv);
  const main = h("main", { class: "scr scr-settings", "data-settings": "data" },
    link("#/settings", "crumb", `← ${t("nav.settings", lang)}`),
    h("h1", {}, t("data.title", lang)),
    h("div", { "data-setting-row": "mode" }, modeSwitchCard()),
    h("div", { class: "card", "data-ns": "real" }, h("h2", { class: "card-h" }, t("data.real", lang)), h("p", {}, t("data.real.count", lang, { n: num(store.real.list().length, lang) })), h("p", { class: "muted" }, t(realOn ? "data.real.on" : "data.real.locked", lang))),
    realOn ? null : consentGate(lang),
    h("div", { class: "card", "data-ns": "demo" }, h("div", { class: "row" }, h("h2", { class: "card-h" }, t("data.demo", lang)), demoBadge(lang)), h("p", {}, t("data.demo.count", lang, { n: num(store.demo.list().length, lang) }))),
    h("p", { class: "muted" }, t("data.nopromote", lang)),
    link("#/settings/delete", "card link", h("h2", { class: "card-h" }, t("set.cat.delete", lang)), h("p", { class: "muted" }, t("set.sum.delete", lang))),
    link("#/settings/privacy", "card link", h("h2", { class: "card-h" }, t("set.cat.privacy", lang)), h("p", { class: "muted" }, categorySummary("privacy", lang))),
    link("#/settings/backup", "card link", h("h2", { class: "card-h" }, t("set.cat.backup", lang)), h("p", { class: "muted" }, categorySummary("backup", lang))),
    disclaimers(lang));
  if (row === "mode") main.querySelector("[data-setting-row=mode]")?.classList.add("set-hl");
  return main;
}

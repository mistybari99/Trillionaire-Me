// Batch 1 UI builders (Q-01..Q-09). Kept out of screens.ts so that file only gets import and call-site lines.
import "./styles_qb1.css";
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { CONCRETE_BANK } from "../core/stuck";
import { TIPS } from "../library/topics";
import { diagram } from "./diagram";

/** Q-01: one calm line shown after any Stuck helper. No judging words. */
export const recoveryLine = (lang: Locale): HTMLElement => h("p", { class: "qb1-recovery", "data-recovery": "1" }, t("qb1.recovery", lang));

/** Q-02: fixed bank; a tap puts the tiny first action into the step name field (nothing is saved until the user adds the step). */
export function concreteBank(lang: Locale, input: HTMLInputElement): HTMLElement {
  const rows = CONCRETE_BANK.map((n) => {
    const tiny = t(`qb1.bank.${n}.tiny` as Key, lang);
    const b = h("button", { type: "button", class: "btn ghost", "data-bank": String(n) }, h("span", { class: "big" }, t(`qb1.bank.${n}.big` as Key, lang)), tiny);
    b.addEventListener("click", () => { input.value = tiny.slice(0, 80); input.focus(); });
    return b;
  });
  return h("div", { class: "qb1-bank-wrap", "data-card": "concrete_bank" }, h("h3", {}, t("qb1.bank.h", lang)), h("p", { class: "muted" }, t("qb1.bank.hint", lang)), h("div", { class: "qb1-bank" }, ...rows));
}

/** Q-03: the 'matrix' diagram tip (Hard now / Easy later) shown on the effort-timing card. diagram() already gives it role=img plus a text label. */
export const effortTip = (lang: Locale): HTMLElement[] => { const tip = TIPS.find((x) => x.id === "pr3"); return tip ? [diagram(tip, lang)] : []; };

/** Q-03: decorative pictures, aria-hidden. The lists next to them stay as the text equivalent. */
export const forkPicture = (lang: Locale): HTMLElement => h("div", { class: "qb1-fork", "aria-hidden": "true", "data-pic": "fork" }, h("span", {}, t("qb1.fork.easy", lang)), h("span", {}, t("qb1.fork.hard", lang)));
export const timeBands = (lang: Locale): HTMLElement => h("div", { class: "qb1-bands", "aria-hidden": "true", "data-pic": "bands" }, h("span", {}, t("qb1.band.time", lang)), h("span", {}, t("qb1.band.dist", lang)), h("span", {}, t("qb1.band.goals", lang)));

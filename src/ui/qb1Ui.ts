// Batch 1 UI builders (Q-01..Q-09). Kept out of screens.ts so that file only gets import and call-site lines.
import "./styles_qb1.css";
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { CONCRETE_BANK } from "../core/stuck";
import { WAY_OPTIONS, weekStart, type WayPick } from "../core/qb1Prefs";
import { weekHabitMatrix } from "../core/weekMatrix";
import type { TMRecord } from "../core/types";
import { prefs } from "./state";
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

/** Q-06: "what got in the way this week": 5 taps plus Skip, kept in prefs for the calendar week. Optional; unanswered stays unknown. */
export function wayCard(today: string, lang: Locale): HTMLElement {
  const week = weekStart(today);
  const cur = () => { const w = prefs.qbMemo.way; return w && w.week === week ? w.pick : null; };
  const note = h("p", { class: "muted", role: "status", "data-way-status": "1" });
  const btns = new Map<WayPick, HTMLButtonElement>();
  const paint = () => { const c = cur(); for (const [k, b] of btns) b.setAttribute("aria-pressed", String(c === k)); note.textContent = c === null ? "" : c === "skip" ? t("qb1.way.skipped", lang) : t("qb1.way.saved", lang); };
  const pick = (p: WayPick) => { prefs.qbMemo = { ...prefs.qbMemo, way: { week, pick: p } }; paint(); };
  const mk = (p: WayPick) => { const b = h("button", { type: "button", class: p === "skip" ? "btn ghost" : "btn ghost qb1-way", "data-way": p, "aria-pressed": "false", onclick: () => pick(p) }, t(`qb1.way.${p}` as Key, lang)); btns.set(p, b); return b; };
  const card = h("section", { class: "card", "data-card": "way" }, h("h2", { class: "card-h" }, t("qb1.way.h", lang)), h("p", { class: "muted" }, t("qb1.way.note", lang)),
    h("div", { class: "qb1-ways", role: "group", "aria-label": t("qb1.way.h", lang) }, ...WAY_OPTIONS.map(mk), mk("skip")), note);
  paint();
  return card;
}

/** Q-06: last 7 days of each habit. A real table (text stays); a day that was not planned is blank, never a miss. No habits = an Unknown note. */
export function weekMatrixCard(recs: readonly TMRecord[], today: string, lang: Locale): HTMLElement {
  const rows = weekHabitMatrix(recs, today);
  const head = h("h2", { class: "card-h" }, t("qb1.wm.h", lang));
  if (!rows) return h("section", { class: "card", "data-card": "week_matrix", "data-matrix-unknown": "1" }, head, h("p", { class: "muted" }, t("qb1.wm.unknown", lang)));
  const sym = { done: "✓", open: "○", none: "" } as const;
  const dates = rows[0]!.days.map((d) => d.date);
  return h("section", { class: "card", "data-card": "week_matrix" }, head,
    h("div", { class: "qb1-scroll" }, h("table", { class: "qb1-matrix" },
      h("thead", {}, h("tr", {}, h("th", { scope: "col" }, t("habits.title", lang)), ...dates.map((d) => h("th", { scope: "col" }, String(Number(d.slice(8))))))),
      h("tbody", {}, ...rows.map((r) => h("tr", { "data-habit-row": r.id }, h("th", { scope: "row" }, r.title),
        ...r.days.map((d) => h("td", { "data-state": d.state, "aria-label": t(`qb1.wm.${d.state}` as Key, lang, { d: d.date }) }, sym[d.state]))))))),
    h("p", { class: "muted" }, t("qb1.wm.legend", lang)));
}

/** Q-04: collapsed details with the user's own goal.why. Empty = a prompt that jumps to the field (the field id is in the SMART form on the same page). */
export function whyCard(why: string, fieldId: string, lang: Locale): HTMLElement {
  const own = why.trim();
  const body = own ? h("p", { "data-why-text": "1" }, own)
    : h("div", { "data-why-empty": "1" }, h("p", { class: "muted" }, t("qb1.why.empty", lang)),
      h("button", { type: "button", class: "btn ghost", "data-why-add": "1", onclick: () => { const el = document.getElementById(fieldId); el?.scrollIntoView?.({ block: "center" }); el?.focus(); } }, t("qb1.why.add", lang)));
  return h("details", { class: "card", "data-card": "show_why" }, h("summary", {}, t("qb1.why.h", lang)), body);
}

/** Q-03: the 'matrix' diagram tip (Hard now / Easy later) shown on the effort-timing card. diagram() already gives it role=img plus a text label. */
export const effortTip = (lang: Locale): HTMLElement[] => { const tip = TIPS.find((x) => x.id === "pr3"); return tip ? [diagram(tip, lang)] : []; };

/** Q-03: decorative pictures, aria-hidden. The lists next to them stay as the text equivalent. */
export const forkPicture = (lang: Locale): HTMLElement => h("div", { class: "qb1-fork", "aria-hidden": "true", "data-pic": "fork" }, h("span", {}, t("qb1.fork.easy", lang)), h("span", {}, t("qb1.fork.hard", lang)));
export const timeBands = (lang: Locale): HTMLElement => h("div", { class: "qb1-bands", "aria-hidden": "true", "data-pic": "bands" }, h("span", {}, t("qb1.band.time", lang)), h("span", {}, t("qb1.band.dist", lang)), h("span", {}, t("qb1.band.goals", lang)));

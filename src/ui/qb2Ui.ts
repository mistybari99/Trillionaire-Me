// Batch 2 UI builders (Q-10, Q-11, Q-30). Kept out of lifeUi.ts so that file only gets import and call-site lines.
import "./styles_qb2.css";
import { h } from "./dom";
import { t, tb } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { fieldById } from "../catalog/fields";
import { allRecs, consentOn, consentPrompt, findRec, labelFor, saveBlockedText, storeOf } from "./entry";
import { checkFreeText } from "../core/safety";
import type { FieldValue, TMRecord } from "../core/types";
import { PROBLEM_FIELDS, TINY_ACTIONS, WFD_FIELDS, isEmptyGoal, textOfField } from "../core/goalWorksheet";

const fid = (f: string): string => `q2-${f.replace(/[^a-z0-9]+/g, "-")}`;
const scrollTo = (id: string): void => { const el = document.getElementById(id); el?.scrollIntoView?.({ block: "start" }); (el?.querySelector("input,textarea") as HTMLElement | null)?.focus(); };

/** A card of short optional text fields. Blank + nothing stored = nothing written; blank over an old value = Unknown (never 0). Same consent and safety gates as the SMART form. */
export function fieldsCard(goalId: string, lang: Locale, o: { card: string; head: Key; intro: Key; fields: readonly string[]; after?: (inputs: Map<string, HTMLInputElement>) => HTMLElement | null }): HTMLElement {
  const rec = findRec(goalId)!;
  const inputs = new Map<string, HTMLInputElement>();
  const rows: HTMLElement[] = [];
  for (const f of o.fields) {
    const fd = fieldById(f)!; const i = h("input", { id: fid(f), type: "text", maxlength: "160", autocomplete: "off", value: textOfField(rec, f) }) as HTMLInputElement;
    inputs.set(f, i); rows.push(h("label", { for: fid(f) }, tb(fd.label, lang)), i);
  }
  const err = h("p", { class: "err", role: "alert" }), ok = h("p", { class: "ok-msg", role: "status", "data-saved": o.card });
  const form = h("form", { novalidate: true, "data-form": o.card }, consentOn() ? null : consentPrompt(lang), ...rows, o.after?.(inputs) ?? null,
    h("p", { class: "muted" }, t("q2.blank", lang)), err, ok, h("button", { class: "btn", type: "submit" }, t("q2.save", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault(); err.textContent = ""; ok.textContent = "";
    if (!consentOn()) { err.textContent = saveBlockedText(lang); return; }
    const cur = findRec(goalId); if (!cur) return;
    for (const i of inputs.values()) if (i.value.trim() && !checkFreeText(i.value).ok) { err.textContent = t("intake.secretRejected", lang); return; }
    const values: Record<string, FieldValue> = { ...cur.values };
    for (const [f, i] of inputs) { const v = i.value.trim(); if (v) values[f] = { state: "value", value: v, label: labelFor(cur.ns) }; else if (values[f]) values[f] = { state: "unknown" }; }
    storeOf(cur).put({ ...cur, values });
    document.querySelector("[data-card=start]")?.remove();
    ok.textContent = t("q2.saved", lang);
  });
  return h("section", { class: "card", id: `${o.card}-card`, "data-card": o.card }, h("h2", { class: "card-h" }, t(o.head, lang)), h("p", { class: "muted" }, t(o.intro, lang)), form);
}

/** Q-10: 4-field problem frame (problem, who, why, outcome). */
export const problemFrameCard = (goalId: string, lang: Locale): HTMLElement => fieldsCard(goalId, lang, { card: "problem_frame", head: "q2.pf.h", intro: "q2.pf.intro", fields: PROBLEM_FIELDS });

/** Q-10: Want / Feel / Do card with five fixed tiny-action examples; a tap fills the Do line only (nothing is saved until Save). */
export const wantFeelDoCard = (goalId: string, lang: Locale): HTMLElement => fieldsCard(goalId, lang, { card: "want_feel_do", head: "q2.wfd.h", intro: "q2.wfd.intro", fields: WFD_FIELDS,
  after: (inputs) => h("div", { class: "q2-tiny", "data-tiny": "1" }, h("h3", {}, t("q2.tiny.h", lang)), h("p", { class: "muted" }, t("q2.tiny.hint", lang)),
    ...TINY_ACTIONS.map((n) => { const txt = t(`q2.tiny.${n}` as Key, lang); return h("button", { type: "button", class: "btn ghost", "data-tiny-n": String(n), onclick: () => { const d = inputs.get("goal.wfd_do")!; d.value = txt.slice(0, 160); d.focus(); } }, txt); })) });

/** Q-10: Start card on an empty goal. Three links: Clarify (problem frame), Break down (backward plan), Begin (first action). Gone as soon as the goal has any text or step. */
export function startCard(goalId: string, lang: Locale): HTMLElement | null {
  const rec: TMRecord | null = findRec(goalId); if (!rec || !isEmptyGoal(rec, allRecs())) return null;
  const jump = (card: string) => ({ type: "button", class: "btn ghost", onclick: () => scrollTo(`${card}-card`) });
  return h("section", { class: "card", "data-card": "start" }, h("h2", { class: "card-h" }, t("q2.start.h", lang)), h("p", { class: "muted" }, t("q2.start.intro", lang)),
    h("div", { class: "q2-start" },
      h("button", { ...jump("problem_frame"), "data-start": "clarify" }, t("q2.start.clarify", lang)),
      h("a", { href: `#/journey/backward/${goalId}`, class: "btn ghost", "data-start": "break" }, t("q2.start.break", lang)),
      h("button", { ...jump("want_feel_do"), "data-start": "begin" }, t("q2.start.begin", lang))));
}

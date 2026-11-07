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
import { PROBLEM_FIELDS, RESOURCES_FIELD, TINY_ACTIONS, WFD_FIELDS, WORKSHEET_FIELDS, isEmptyGoal, planTable, textOfField } from "../core/goalWorksheet";
import { prefs } from "./state";

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
      h("button", { ...jump("worksheet"), "data-start": "begin" }, t("q2.start.begin", lang))));
}

/** Q-11: optional obstacle, if-then backup, first action / when, and resources (the table reads this one too). */
export const worksheetCard = (goalId: string, lang: Locale): HTMLElement => fieldsCard(goalId, lang, { card: "worksheet", head: "q2.ws.h", intro: "q2.ws.intro", fields: [...WORKSHEET_FIELDS, RESOURCES_FIELD] });

/** Q-11: the table itself (a real table, two columns so it fits 360 px). An empty row says "Not set", never 0. */
export function planTableCard(rec: TMRecord, lang: Locale): HTMLElement {
  const rows = planTable(rec, allRecs());
  return h("section", { class: "card", "data-card": "plan_table" }, h("h2", { class: "card-h" }, t("q2.tbl.h", lang)),
    h("table", { class: "q2-table" }, h("tbody", {}, ...rows.map((r) => h("tr", { "data-row": r.key, ...(r.value === null ? { "data-unset": "1" } : {}) },
      h("th", { scope: "row" }, t(`q2.tbl.${r.key}` as Key, lang)),
      h("td", {}, r.value === null ? h("span", { class: "muted" }, t("q2.tbl.notset", lang))
        : r.key === "steps" ? h("div", {}, h("p", {}, t("q2.tbl.stepsn", lang, { n: r.value })), h("ol", { class: "plain" }, ...(r.list ?? []).map((x) => h("li", {}, x)))) : r.value))))),
    rows.some((r) => r.value === null) ? h("p", { class: "muted" }, t("q2.tbl.edit", lang)) : null);
}

/** Q-11: the table view screen, #/journey/goal/<id>/table. */
export function planTableScreen(id: string): HTMLElement {
  const lang = prefs.lang; const rec = findRec(id);
  const back = h("a", { href: rec ? `#/journey/goal/${id}` : "#/journey/goals", class: "crumb" }, `← ${t("q2.tbl.back", lang)}`);
  if (!rec || rec.entity !== "goal" || !textOfField(rec, "goal.title")) return h("main", {}, back, h("h1", {}, t("q2.tbl.h", lang)), h("p", { class: "muted", "data-goal-missing": "1" }, t("q2.tbl.missing", lang)));
  return h("main", { "data-plan-table": id }, back, h("h1", {}, textOfField(rec, "goal.title")), planTableCard(rec, lang));
}

/** Q-11: link from the goal page to the table view. */
export const tableLink = (goalId: string, lang: Locale): HTMLElement => h("a", { href: `#/journey/goal/${goalId}/table`, class: "btn ghost", "data-act": "plan-table" }, t("q2.tbl.link", lang));

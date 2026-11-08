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
import { CHECK_ITEMS, PROBLEM_FIELDS, RESOURCES_FIELD, TINY_ACTIONS, WFD_FIELDS, WIZARD_STEPS, WORKSHEET_FIELDS, checkSummary, isEmptyGoal, parseCheck, planTable, serializeCheck, textOfField } from "../core/goalWorksheet";
import { validDay } from "../core/backwardPlan";
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

let justDone: string | null = null; // the goal whose wizard just finished: its rebuilt page shows the calm "Done" line once
const rerender = (): void => { window.dispatchEvent(new HashChangeEvent("hashchange")); };
const put = (goalId: string, f: string, text: string, lang: Locale): string | null => {
  if (!consentOn()) return saveBlockedText(lang);
  const cur = findRec(goalId); if (!cur) return null;
  if (text && !checkFreeText(text).ok) return t("intake.secretRejected", lang);
  if (f === "goal.target_date" && text && !validDay(text)) return t("intake.invalidNumber", lang);
  const values: Record<string, FieldValue> = { ...cur.values };
  if (text) values[f] = { state: "value", value: text, label: labelFor(cur.ns) }; else if (values[f]) values[f] = { state: "unknown" };
  storeOf(cur).put({ ...cur, values }); return null;
};

/** Q-30: SMART wizard (five questions, one at a time) and a 7-question yes/no checklist. "Not sure" is always allowed and changes nothing. The one-page form and the funnel stay below it and read the same fields. */
export function smartWizardCard(goalId: string, lang: Locale): HTMLElement {
  const rec = findRec(goalId)!;
  let mode: "wiz" | "chk" = "wiz", step = 0, answers = parseCheck(textOfField(rec, "goal.smart_check"));
  const body = h("div", { "data-wizard-body": "1" });
  const modes = (["wiz", "chk"] as const).map((m) => h("button", { type: "button", class: "btn ghost", "data-mode": m, onclick: () => { mode = m; paint(); } }, t(`q2.sm.mode.${m}` as Key, lang)));
  const wiz = (): HTMLElement => {
    const s = WIZARD_STEPS[step]!; const last = step === WIZARD_STEPS.length - 1; const cur = findRec(goalId)!;
    const input = h("input", { id: "q2-wz-input", type: s.kind === "date" ? "date" : "text", maxlength: "160", autocomplete: "off", value: textOfField(cur, s.field) }) as HTMLInputElement;
    const err = h("p", { class: "err", role: "alert" });
    const next = (save: boolean) => { if (save) { const e = put(goalId, s.field, input.value.trim(), lang); if (e) { err.textContent = e; return; } } if (last) { justDone = goalId; rerender(); return; } step++; paint(); };
    return h("div", { "data-wizard-step": s.part }, h("p", { class: "muted", "data-wizard-pos": "1" }, t("q2.wz.of", lang, { n: String(step + 1), m: String(WIZARD_STEPS.length) })),
      h("label", { for: "q2-wz-input" }, t(`q2.wz.q.${s.part}` as Key, lang)), input, err,
      h("div", { class: "q2-start" },
        h("button", { type: "button", class: "btn", "data-wz": "next", onclick: () => next(true) }, t(last ? "q2.wz.finish" : "q2.wz.next", lang)),
        h("button", { type: "button", class: "btn ghost", "data-wz": "skip", onclick: () => next(false) }, t("q2.wz.skip", lang)),
        step > 0 ? h("button", { type: "button", class: "btn ghost", "data-wz": "back", onclick: () => { step--; paint(); } }, t("q2.wz.back", lang)) : null));
  };
  const done = justDone === goalId; if (done) justDone = null;
  const chk = (): HTMLElement => {
    const sum = checkSummary(answers); const msg = h("p", { class: "muted", role: "status", "data-check-sum": "1" }, t("q2.ck.sum", lang, { y: String(sum.yes), n: String(sum.no), u: String(sum.unknown) }));
    const err = h("p", { class: "err", role: "alert" });
    const rows = CHECK_ITEMS.map((id, i) => h("div", { class: "q2-ck", "data-check": id },
      h("p", {}, t(`q2.ck.q.${id}` as Key, lang)),
      h("div", { class: "seg", role: "group", "aria-label": t(`q2.ck.q.${id}` as Key, lang) }, ...(["yes", "no", "unknown"] as const).map((a) =>
        h("button", { type: "button", class: "btn ghost btn-sm", "data-answer": a, "aria-pressed": String(answers[i] === a), onclick: () => {
          const next = answers.map((x, j) => (j === i ? a : x)); const e = put(goalId, "goal.smart_check", serializeCheck(next), lang);
          if (e) { err.textContent = e; return; } answers = next; paint(); } }, t(`q2.ck.${a}` as Key, lang))))));
    return h("div", {}, ...rows, msg, err);
  };
  const paint = (): void => {
    for (const b of modes) b.setAttribute("aria-pressed", String(b.getAttribute("data-mode") === mode));
    body.replaceChildren(done ? h("p", { class: "ok-msg", role: "status", "data-wizard-done": "1" }, t("q2.wz.done", lang)) : mode === "wiz" ? wiz() : chk());
  };
  paint();
  return h("section", { class: "card", id: "smart_wizard-card", "data-card": "smart_wizard" }, h("h2", { class: "card-h" }, t("q2.sm.h", lang)), h("p", { class: "muted" }, t("q2.sm.intro", lang)),
    consentOn() ? null : consentPrompt(lang), h("div", { class: "seg", role: "group", "aria-label": t("q2.sm.h", lang) }, ...modes), body);
}

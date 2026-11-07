// Batch 3 UI builders (Q-12, Q-13, Q-34). Kept out of the big screen files so those only get import and call-site lines.
import "./styles_qb3.css";
import { h } from "./dom";
import { t, fmtNumber } from "../i18n/t";
import type { Locale } from "../i18n/registry";
import type { FieldValue, TMRecord } from "../core/types";
import { canLog } from "../core/habits";
import { checkMicro, checkRange, microOffered, validIso } from "../core/microHabit";
import { checkFreeText } from "../core/safety";
import { consentOn, consentPrompt, saveBlockedText, saveTyped } from "./entry";
import { bufferBar } from "../core/bufferBar";
import { buildTree } from "../core/goalTree";
import { goalStatusOf } from "../core/goalStatus";
import { goalGrid } from "../core/chartData";
import { goalGridTracker } from "./charts";
import { prefs } from "./state";
import { todayIsoKpi } from "./kpiUi";

const minutesOf = (r: TMRecord): number | null => { const v = r.values["task.minutes"]; return v && v.state === "value" && typeof v.value === "number" ? v.value : null; };

/** Q-12: own estimated minutes plus a lighter +25% segment, labelled ESTIMATE. If any step has no minutes: Unknown, no bar. The bar is decorative; the sentence is the content. */
export function bufferStrip(steps: readonly TMRecord[], lang: Locale): HTMLElement | null {
  const b = bufferBar(steps.map(minutesOf)); if (b.kind === "none") return null;
  const head = h("h3", {}, t("q3.bb.h", lang), " ", h("span", { class: "tag", "data-label": "ESTIMATE" }, t("q3.bb.est", lang)));
  if (b.kind === "unknown") return h("div", { class: "qb3-bar", "data-buffer-bar": "unknown" }, head, h("p", { class: "muted" }, t("q3.bb.unknown", lang, { n: fmtNumber(b.missing, lang) })));
  const pct = (n: number) => `${(n / b.total) * 100}%`;
  return h("div", { class: "qb3-bar", "data-buffer-bar": "ok" }, head,
    h("div", { class: "bar", "aria-hidden": "true" }, h("span", { "data-seg": "own", style: `width:${pct(b.own)}` }), h("span", { "data-seg": "extra", style: `width:${pct(b.extra)}` })),
    h("p", {}, t("q3.bb.text", lang, { own: fmtNumber(b.own, lang), total: fmtNumber(b.total, lang), extra: fmtNumber(b.extra, lang) })));
}

/** Q-34: the long view for the active top-level goals on the Goals screen. Uses the same range choice as the Habits long view. */
export function goalGridCard(recs: readonly TMRecord[], lang: Locale): HTMLElement | null {
  const byId = new Map(recs.filter((r) => r.entity === "goal").map((g) => [g.id, g] as const));
  const active = buildTree(recs).filter((n) => !n.orphan && byId.get(n.id) !== undefined && goalStatusOf(byId.get(n.id)!) === "active");
  if (!active.length) return null;
  const rows = goalGrid(active.map((n) => ({ id: n.id, title: n.title, stepIds: n.stepIds })), recs, todayIsoKpi(), prefs.habitGrid);
  return goalGridTracker(rows, prefs.habitGrid, (r) => { prefs.habitGrid = r; window.dispatchEvent(new HashChangeEvent("hashchange")); }, lang);
}

// ---- Q-13: habit extras ----
const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
const typed = (value: unknown): FieldValue => ({ state: "value", value, label: "FACT" });
const strOf = (r: TMRecord, k: string): string => { const v = r.values[k]; return v && v.state === "value" && typeof v.value === "string" ? v.value : ""; };
const numOf = (r: TMRecord, k: string): number | null => { const v = r.values[k]; return v && v.state === "value" && typeof v.value === "number" ? v.value : null; };
/** The optional habit extras of one record. Empty when the habit was saved before they existed. */
export const habitExtras = (r: TMRecord) => ({ category: strOf(r, "habit.category"), start: strOf(r, "habit.start_on"), end: strOf(r, "habit.end_on"), anchor: strOf(r, "habit.anchor"), minutes: numOf(r, "habit.minutes") });

/** Category tag, dates and the "After I..." line on a habit card. Nothing when none is set. */
export function habitMeta(r: TMRecord | null, lang: Locale): HTMLElement | null {
  if (!r) return null; const x = habitExtras(r); const kids: HTMLElement[] = [];
  if (x.category) kids.push(h("span", { class: "tag", "data-habit-category": x.category }, x.category));
  if (x.start || x.end) kids.push(h("span", { class: "muted", "data-habit-range": `${x.start}|${x.end}` }, t(x.start && x.end ? "q3.hb.range.both" : x.start ? "q3.hb.range.from" : "q3.hb.range.until", lang, { a: x.start, b: x.end })));
  if (x.anchor) kids.push(h("span", { class: "muted", "data-habit-anchor": "1" }, t("q3.hb.anchor.line", lang, { a: x.anchor, m: fmtNumber(x.minutes ?? 2, lang) })));
  return kids.length ? h("p", { class: "qb3-meta" }, ...kids.flatMap((k, i) => (i ? [" ", k] : [k]))) : null;
}

/** Optional fields for the new-habit form: category, start day, end day. `read()` gives the values to save, or an error key. */
export function habitExtraInputs(lang: Locale): { nodes: Node[]; read: () => { values: Record<string, FieldValue>; bad: "range" | "secret" | null } } {
  const cat = h("input", { id: "hb-cat", type: "text", maxlength: "40", autocomplete: "off" }) as HTMLInputElement;
  const start = h("input", { id: "hb-start", type: "date" }) as HTMLInputElement; const end = h("input", { id: "hb-end", type: "date" }) as HTMLInputElement;
  const nodes: Node[] = [h("div", { class: "qb3-extra" }, h("label", { for: "hb-cat" }, t("q3.hb.cat", lang)), cat, h("label", { for: "hb-start" }, t("q3.hb.start", lang)), start, h("label", { for: "hb-end" }, t("q3.hb.end", lang)), end)];
  const read = () => {
    const values: Record<string, FieldValue> = {}; if (checkRange(start.value, end.value) === "bad") return { values, bad: "range" as const };
    if (cat.value.trim()) { if (!checkFreeText(cat.value).ok) return { values, bad: "secret" as const }; values["habit.category"] = typed(cat.value.trim()); }
    if (start.value) values["habit.start_on"] = typed(start.value); if (end.value) values["habit.end_on"] = typed(end.value);
    return { values, bad: null };
  };
  return { nodes, read };
}

const backfillMsg = new Map<string, string>();
/** An earlier day (up to today) for one habit. Saving goes through `add`, which returns false when nothing could be saved. */
export function habitBackfill(habitId: string, today: string, add: (date: string) => boolean, lang: Locale): HTMLElement {
  const inp = h("input", { id: `bf-${habitId}`, type: "date", max: today, "data-backfill-date": habitId }) as HTMLInputElement;
  const go = h("button", { type: "button", class: "btn ghost", "data-backfill-add": habitId }, t("q3.hb.day.add", lang));
  go.addEventListener("click", () => {
    const d = inp.value;
    if (!validIso(d) || !canLog(d, today)) backfillMsg.set(habitId, t("q3.hb.day.bad", lang));
    else backfillMsg.set(habitId, add(d) ? t("q3.hb.day.added", lang, { d }) : t("entry.consent.saveBlocked", lang));
    rerender();
  });
  const m = backfillMsg.get(habitId);
  return h("div", { class: "qb3-day" }, h("label", { for: `bf-${habitId}` }, t("q3.hb.day.label", lang)), h("p", { class: "muted" }, t("q3.hb.day.hint", lang)), inp, go, m ? h("p", { class: "muted", role: "status", "data-backfill-msg": habitId }, m) : null);
}

let microSkipped = false;
export const resetMicro = (): void => { microSkipped = false; };
/** Tiny-habit starter. Shown only when no habit is new; "Not now" hides it. It never blocks the rest of the screen. */
export function microHabitCard(recs: readonly TMRecord[], today: string, lang: Locale): HTMLElement | null {
  if (microSkipped || !microOffered(recs.filter((r) => r.entity === "habit").map((r) => r.createdAt), today)) return null;
  const title = h("input", { id: "mh-title", type: "text", maxlength: "80", autocomplete: "off" }) as HTMLInputElement;
  const anchor = h("input", { id: "mh-anchor", type: "text", maxlength: "80", autocomplete: "off" }) as HTMLInputElement;
  const min = h("input", { id: "mh-min", type: "text", inputmode: "numeric", maxlength: "1", autocomplete: "off" }) as HTMLInputElement;
  const err = h("p", { class: "err", role: "alert", "data-micro-err": "1" });
  const form = h("form", { novalidate: true, "data-form": "micro" }, consentOn() ? null : consentPrompt(lang),
    h("label", { for: "mh-title" }, t("q3.hb.micro.title", lang)), title, h("label", { for: "mh-anchor" }, t("q3.hb.micro.anchor", lang)), anchor,
    h("label", { for: "mh-min" }, t("q3.hb.micro.min", lang)), min, err,
    h("button", { class: "btn", type: "submit" }, t("q3.hb.micro.add", lang)), " ", h("button", { class: "btn ghost", type: "button", "data-micro-skip": "1", onclick: () => { microSkipped = true; rerender(); } }, t("q3.hb.micro.skip", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault(); err.textContent = ""; const c = checkMicro({ title: title.value, anchor: anchor.value, minutes: min.value });
    if (!c.ok) { err.textContent = t("q3.hb.micro.bad", lang); return; }
    if (!checkFreeText(c.title).ok || !checkFreeText(c.anchor).ok) { err.textContent = t("intake.secretRejected", lang); return; }
    const id = `habit-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
    if (!saveTyped({ id, entity: "habit", createdAt: new Date().toISOString(), values: { "habit.title": typed(c.title), "habit.days": typed("0,1,2,3,4,5,6"), "habit.days_per_week": typed(7), "habit.anchor": typed(c.anchor), "habit.minutes": typed(c.minutes) } })) { err.textContent = saveBlockedText(lang); return; }
    rerender();
  });
  return h("section", { class: "card", "data-micro-card": "1" }, h("h2", { class: "card-h" }, t("q3.hb.micro.h", lang)), h("p", { class: "muted" }, t("q3.hb.micro.hint", lang)), form);
}

// M08 time blocks on the Plan screen and Today: the committed time the user typed (prayer, family, rest, work, other), how it sits in the week,
// and the weekly hours it adds up to. Times only. Prayer times are worked out on this phone; the length of each prayer block is the user's number.
import { h } from "./dom";
import { resolvedPrayerTimes } from "./prayerSync";
import { t, tb, fmtNumber } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { intlLocale } from "../i18n/registry";
import { prefs, store } from "./state";
import { activeNs, allRecs, consentOn, consentPrompt, entryNs, nsTag, ownerOf, saveBlockedText, saveTyped } from "./entry";
import { fmtClock } from "../core/planInputs";
import { fieldById } from "../catalog/fields";
import { checkFreeText } from "../core/safety";

import "./styles_blocks.css";
import { BLOCK_KINDS, MAX_LABEL, REPEATS, commitRows, expandWorkBlocks, isoOf, protectedPlannerBlocks, toPlannerBlocks, validateCommit, validateWorkBlock, weekBlocks, weeklyBudget, workBlockFromRecord, workBlockRecord, workBlocksFromRecords, workOverlaps, type CommitRow, type Overlap, type Repeat, type TimeBlock, type WeekBlocks, type WorkBlock, type WorkOcc } from "../core/timeBlocks";
import { suggestBlocks, type Suggestion } from "../core/blockSuggest";
import { reminderRecord } from "../core/reminders";
import { SCHEMA_VERSION } from "../schema/entities";
import { parseClock, tasksFrom } from "../core/planInputs";
import type { Block } from "../core/planner";
import type { TMRecord } from "../core/types";
import type { FieldValue } from "../core/types";

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
const typed = (value: unknown): FieldValue => ({ state: "value", value, label: "FACT" });
const kindLabel = (k: string, lang: Locale): string => { const o = fieldById("constraint.kind")?.options?.find((x) => x.code === k); return o ? tb(o.label, lang) : k; };
const dayName = (d: number, lang: Locale) => new Intl.DateTimeFormat(intlLocale(lang), { weekday: "long" }).format(new Date(2023, 0, 1 + d));

/** Rows and the 7 days of blocks from today, for the active mode. The scheduler gets the same blocks, so a task never lands in one. */
export function currentBlocks(): { rows: CommitRow[]; week: WeekBlocks; /** what the planner treats as busy: the committed time plus the work blocks marked protected (none when work blocks are off) */ plannerBlocks: Block[] } {
  const rows = commitRows(allRecs()); const n = new Date();
  const week = weekBlocks(rows, { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() }, prefs.prayerCoords, prefs.prayerSettings, 7, (cd) => resolvedPrayerTimes(cd).times);
  const prot = prefs.workBlocks ? protectedPlannerBlocks(expandWorkBlocks(workBlocksFromRecords(allRecs()), isoOf(n), 7)) : [];
  return { rows, week, plannerBlocks: [...toPlannerBlocks(week.blocks), ...prot] };
}

const blockText = (b: TimeBlock, lang: Locale) => `${fmtClock(b.start)}–${fmtClock(b.end)} · ${b.prayer ? t(`deen.prayer.name.${b.prayer}` as Key, lang) : kindLabel(b.kind, lang)}`;

/** Today: what is kept free today. Nothing is drawn when the user set no block. */
export function blocksTodayCard(lang: Locale): HTMLElement | null {
  const { week } = currentBlocks(); const n = new Date();
  const today = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  const mine = week.blocks.filter((b) => b.date === today);
  if (!mine.length) return null;
  return h("section", { class: "card", "data-blocks-today": String(mine.length), "aria-label": t("blk.today.title", lang) },
    h("div", { class: "row" }, h("h2", { class: "card-h" }, t("blk.today.title", lang)), nsTag(activeNs(), lang)),
    h("ul", { class: "plain" }, ...mine.map((b) => h("li", { "data-block": `${b.kind}${b.prayer ? `-${b.prayer}` : ""}` }, blockText(b, lang)))),
    h("a", { href: "#/diary/plan", class: "crumb" }, t("blk.today.open", lang)));
}

export function commitCard(lang: Locale, freeHours: number | null): HTMLElement {
  const { rows, week } = currentBlocks(); const budget = weeklyBudget(rows, freeHours);
  const kind = h("select", { id: "cm-kind" }, ...BLOCK_KINDS.map((k) => h("option", { value: k }, kindLabel(k, lang))));
  const hours = h("input", { id: "cm-hours", type: "text", inputmode: "decimal", autocomplete: "off" });
  const from = h("input", { id: "cm-from", type: "text", inputmode: "numeric", placeholder: "13:00", autocomplete: "off" });
  const to = h("input", { id: "cm-to", type: "text", inputmode: "numeric", placeholder: "14:00", autocomplete: "off" });
  const minutes = h("input", { id: "cm-minutes", type: "text", inputmode: "numeric", autocomplete: "off" });
  const err = h("p", { class: "err", role: "alert" });
  const form = h("form", { novalidate: true, "data-form": "commit" }, consentOn() ? null : consentPrompt(lang),
    h("label", { for: "cm-kind" }, t("blk.kind", lang)), kind,
    h("label", { for: "cm-hours" }, t("blk.hours", lang)), hours,
    h("label", { for: "cm-from" }, t("blk.from", lang)), from, h("label", { for: "cm-to" }, t("blk.to", lang)), to,
    h("label", { for: "cm-minutes" }, t("blk.minutes", lang)), minutes, h("p", { class: "muted" }, t("blk.minutes.hint", lang)), err,
    h("button", { class: "btn", type: "submit" }, t("blk.add", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault(); err.textContent = "";
    const bad = validateCommit({ kind: kind.value, hours: hours.value, from: from.value, to: to.value, minutes: minutes.value });
    if (bad) { err.textContent = t(`blk.err.${bad}` as Key, lang); return; }
    if (!checkFreeText(from.value).ok || !checkFreeText(to.value).ok) { err.textContent = t("intake.secretRejected", lang); return; }
    const clean = (s: string) => s.trim().replace(/,/g, "").replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6));
    const values: Record<string, FieldValue> = { "constraint.kind": typed(kind.value) };
    if (clean(hours.value) !== "") values["constraint.hours_per_week"] = typed(Number(clean(hours.value)));
    if (kind.value === "prayer") values["constraint.block_minutes"] = typed(Number(clean(minutes.value)));
    else if (from.value.trim()) { values["constraint.block_from"] = typed(from.value.trim()); values["constraint.block_to"] = typed(to.value.trim()); }
    const id = `commit-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    if (!saveTyped({ id, entity: "constraint", createdAt: new Date().toISOString(), values })) { err.textContent = saveBlockedText(lang); return; }
    rerender();
  });
  const shown = rows.map((r) => h("li", { "data-commit": r.id }, nsTag(r.ns, lang), " ", h("strong", {}, kindLabel(r.kind, lang)),
    h("span", { class: "muted" }, ` · ${r.hoursPerWeek === null ? t("blk.hours.unknown", lang) : t("blk.hours.n", lang, { h: fmtNumber(r.hoursPerWeek, lang) })}`),
    r.from !== null ? h("span", { class: "muted" }, ` · ${fmtClock(r.from)}–${fmtClock(r.to!)}`) : null,
    r.prayerMinutes !== null ? h("span", { class: "muted" }, ` · ${t("blk.minutes.n", lang, { m: fmtNumber(r.prayerMinutes, lang) })}`) : null,
    r.kind === "prayer" && r.prayerMinutes === null ? h("span", { class: "muted" }, ` · ${t("blk.prayer.nominutes", lang)}`) : null,
    r.fromDiary ? null : h("button", { class: "btn ghost btn-sm", type: "button", "data-remove": r.id, onclick: () => { store[activeNs()].delete(r.id); rerender(); } }, t("risk.remove", lang))));
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; });
  const byDate = new Map<string, TimeBlock[]>(); for (const b of week.blocks) byDate.set(b.date, [...(byDate.get(b.date) ?? []), b]);
  const dateOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const weekRows = days.filter((d) => byDate.has(dateOf(d))).map((d) => h("div", { "data-block-day": dateOf(d) }, h("strong", {}, dayName(d.getDay(), lang)),
    h("ul", { class: "plain" }, ...byDate.get(dateOf(d))!.map((b) => h("li", {}, blockText(b, lang))))));
  return h("section", { class: "card", "data-commit-card": String(rows.length), "aria-label": t("blk.title", lang) },
    h("div", { class: "row" }, h("h2", { class: "card-h" }, t("blk.title", lang)), nsTag(activeNs(), lang)),
    h("p", { class: "muted" }, t("blk.intro", lang)),
    rows.length ? h("ul", { class: "plain" }, ...shown) : h("p", { class: "muted", "data-commit-none": "1" }, t("blk.none", lang)),
    budget.byKind.length ? h("div", { "data-budget": "1" },
      h("p", {}, h("strong", {}, t("blk.budget.h", lang)), " ", budget.byKind.map((k) => `${kindLabel(k.kind, lang)} ${k.unknownRows === 0 || k.hours > 0 ? t("blk.hours.n", lang, { h: fmtNumber(k.hours, lang) }) : t("blk.hours.unknown", lang)}`).join(" · ")),
      budget.unknownRows ? h("p", { class: "muted", "data-budget-unknown": String(budget.unknownRows) }, t("blk.budget.unknown", lang, { n: fmtNumber(budget.unknownRows, lang) })) : null,
      budget.over === true ? h("p", { class: "muted", "data-budget-over": "1" }, t("blk.budget.over", lang, { c: fmtNumber(budget.committedHours, lang), f: fmtNumber(budget.freeHours ?? 0, lang) })) : null) : null,
    week.unknownPrayer ? h("p", { class: "muted", "data-prayer-unknown": String(week.unknownPrayer) }, t("blk.prayer.unknown", lang, { n: fmtNumber(week.unknownPrayer, lang) })) : null,
    weekRows.length ? h("div", { "data-blocks-week": String(week.blocks.length) }, h("h3", { class: "card-h" }, t("blk.week", lang)), ...weekRows) : null,
    h("h3", { class: "card-h" }, t("blk.add.h", lang)), form,
    h("p", { class: "muted" }, t("blk.note", lang)));
}


// ------------------------------------------------------------------ W3 optional work time blocks (BUILD-01)
// Off by default. The user sets every block by hand; ideas are added only on a tap. Prayer times are information only: nothing here reads them.
const todayIso = () => isoOf(new Date());
const goalTitles = (): Map<string, string> => new Map(allRecs().filter((r) => r.entity === "goal").map((r) => [r.id, ((v) => (v && v.state === "value" && typeof v.value === "string" ? v.value : ""))(r.values["goal.title"])]));
let editingBlock: string | null = null;
const remId = (blockId: string) => `rem-wb-${blockId}`;
const hasReminder = (blockId: string) => allRecs().some((r) => r.id === remId(blockId) && r.entity === "reminder");

/** Every work block of the active mode and the next 14 days of them. Empty when the feature is off. */
export function workState(): { blocks: WorkBlock[]; occs: WorkOcc[]; overlaps: Overlap[] } {
  if (!prefs.workBlocks) return { blocks: [], occs: [], overlaps: [] };
  const blocks = workBlocksFromRecords(allRecs()); const occs = expandWorkBlocks(blocks, todayIso(), 14);
  return { blocks, occs, overlaps: workOverlaps(occs, currentBlocksCommitted()) };
}
const currentBlocksCommitted = (): TimeBlock[] => { const rows = commitRows(allRecs()); const n = new Date(); return weekBlocks(rows, { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() }, prefs.prayerCoords, prefs.prayerSettings, 14, (cd) => resolvedPrayerTimes(cd).times).blocks.filter((b) => b.kind !== "prayer"); };

const rangeText = (o: { date: string; start: number; end: number }, lang: Locale) => t("wkb.when", lang, { d: o.date, a: fmtClock(o.start), b: fmtClock(o.end) });

function saveBlock(existing: TMRecord | null, b: Omit<WorkBlock, "id" | "ns">, remind: boolean): boolean {
  const ns = existing ? existing.ns : entryNs(); if (!ns) return false;
  const id = existing ? existing.id : `wb-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const rec = workBlockRecord({ id, ns, ownerId: ownerOf(ns), schemaVersion: SCHEMA_VERSION, createdAt: existing ? existing.createdAt : new Date().toISOString(), b });
  store[ns].put(rec); setReminder(id, ns, remind); return true;
}
function setReminder(blockId: string, ns: TMRecord["ns"], on: boolean): void {
  const has = hasReminder(blockId);
  if (on && !has) store[ns].put(reminderRecord({ id: remId(blockId), ns, ownerId: ownerOf(ns), schemaVersion: SCHEMA_VERSION, createdAt: new Date().toISOString(), r: { target: "work_block", targetId: blockId, at: null, timeOfDay: null, leadDays: 0, state: "on", snoozedUntil: null } }));
  if (!on && has) store[ns].delete(remId(blockId));
}
function deleteBlock(b: WorkBlock): void { store[b.ns].delete(b.id); setReminder(b.id, b.ns, false); }

/** The add / edit form. `rec` null = a new block (optionally pre-filled from an idea); otherwise the block is changed in place (this is also how a block is moved). */
function blockForm(lang: Locale, rec: TMRecord | null, pre: Partial<{ date: string; start: number; end: number; label: string }> = {}): HTMLElement {
  const cur = rec ? workBlockFromRecord(rec) : null;
  const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const date = h("input", { id: "wb-date", type: "text", inputmode: "numeric", autocomplete: "off", value: cur?.date ?? pre.date ?? todayIso() });
  const from = h("input", { id: "wb-from", type: "text", inputmode: "numeric", autocomplete: "off", placeholder: "09:00", value: cur ? clock(cur.start) : pre.start !== undefined ? clock(pre.start) : "" });
  const to = h("input", { id: "wb-to", type: "text", inputmode: "numeric", autocomplete: "off", placeholder: "10:30", value: cur ? clock(cur.end) : pre.end !== undefined ? clock(pre.end) : "" });
  const label = h("input", { id: "wb-label", type: "text", autocomplete: "off", maxlength: String(MAX_LABEL), value: cur?.label ?? pre.label ?? "" });
  const repeat = h("select", { id: "wb-repeat" }, ...REPEATS.map((r) => h("option", { value: r, ...(cur?.repeat === r ? { selected: true } : {}) }, t(`wkb.repeat.${r}` as Key, lang))));
  const titles = goalTitles();
  const goal = h("select", { id: "wb-goal" }, h("option", { value: "" }, t("wkb.goal.none", lang)), ...[...titles].map(([id, ti]) => h("option", { value: id, ...(cur?.goalId === id ? { selected: true } : {}) }, ti || id)));
  const prot = h("input", { id: "wb-protected", type: "checkbox", ...(cur?.protectedBlock ? { checked: true } : {}) });
  const remind = h("input", { id: "wb-remind", type: "checkbox", ...(rec && hasReminder(rec.id) ? { checked: true } : {}) });
  const err = h("p", { class: "err", role: "alert" });
  const form = h("form", { novalidate: true, class: "wb-form", "data-form": rec ? "work-block-edit" : "work-block-add" }, consentOn() ? null : consentPrompt(lang),
    h("label", { for: "wb-date" }, t("wkb.date", lang)), date, h("label", { for: "wb-from" }, t("wkb.from", lang)), from, h("label", { for: "wb-to" }, t("wkb.to", lang)), to,
    h("label", { for: "wb-label" }, t("wkb.label", lang)), label, h("label", { for: "wb-repeat" }, t("wkb.repeat", lang)), repeat, h("label", { for: "wb-goal" }, t("wkb.goal", lang)), goal,
    h("label", { class: "wb-check" }, prot, " ", t("wkb.protected", lang)), h("label", { class: "wb-check" }, remind, " ", t("wkb.remind", lang)), h("p", { class: "muted" }, t("wkb.remind.hint", lang)), err,
    h("div", { class: "row" }, h("button", { class: "btn", type: "submit" }, t(rec ? "wkb.save" : "wkb.add", lang)),
      rec ? h("button", { class: "btn ghost", type: "button", "data-wb-cancel": "1", onclick: () => { editingBlock = null; rerender(); } }, t("wkb.cancel", lang)) : null));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault(); err.textContent = "";
    const bad = validateWorkBlock({ date: date.value, from: from.value, to: to.value, label: label.value, repeat: repeat.value });
    if (bad) { err.textContent = t(`wkb.err.${bad}` as Key, lang); return; }
    if (!checkFreeText(label.value).ok) { err.textContent = t("intake.secretRejected", lang); return; }
    const a = parseClock(from.value.trim())!, b = parseClock(to.value.trim())!;
    const ok = saveBlock(rec, { date: date.value.trim(), start: a, end: b, label: label.value.trim() || null, repeat: repeat.value as Repeat, goalId: goal.value || null, protectedBlock: prot.checked }, remind.checked);
    if (!ok) { err.textContent = saveBlockedText(lang); return; }
    editingBlock = null; rerender();
  });
  return form;
}

const sugLabel = (s: Suggestion, titles: Map<string, string>, lang: Locale): string =>
  s.source === "task" ? t("wkb.sug.task", lang, { t: titles.get(s.taskId ?? "") || t("next.task.untitled", lang) }) : t(`wkb.sug.${s.windowId}` as Key, lang);

/** Plan screen: the switch, then (when on) my blocks, ideas and the add form. With the feature off only the switch shows. */
export function workBlocksCard(lang: Locale): HTMLElement {
  const on = prefs.workBlocks;
  const sw = h("button", { class: "btn ghost", type: "button", "data-wb-switch": on ? "on" : "off", "aria-pressed": String(on), onclick: () => { prefs.workBlocks = !on; editingBlock = null; rerender(); } }, t(on ? "wkb.turn.off" : "wkb.turn.on", lang));
  const head = h("div", { class: "row" }, h("h2", { class: "card-h" }, t("wkb.h", lang)), h("span", { class: on ? "tag ok" : "tag off", "data-wb-state": on ? "on" : "off" }, t(on ? "wkb.state.on" : "wkb.state.off", lang)));
  if (!on) return h("section", { class: "card wb-card", "data-work-blocks": "off", "aria-label": t("wkb.h", lang) }, head, h("p", { class: "muted" }, t("wkb.intro", lang)), h("p", { class: "muted" }, t("wkb.off.note", lang)), sw);
  const { blocks, overlaps } = workState(); const titles = goalTitles(); const recs = allRecs();
  const n = new Date(); const tasks = tasksFrom(recs);
  const taskTitles = new Map(recs.filter((r) => r.entity === "task").map((r) => [r.id, ((v) => (v && v.state === "value" && typeof v.value === "string" ? v.value : ""))(r.values["task.title"])]));
  const sug = suggestBlocks({ from: todayIso(), days: 3, nowMinute: n.getHours() * 60 + n.getMinutes(), blocked: toPlannerBlocks(currentBlocksCommitted()), existing: expandWorkBlocks(blocks, todayIso(), 3), tasks });
  const rows = blocks.map((b) => {
    if (editingBlock === b.id) return h("li", { "data-work-block": b.id, "data-editing": "1" }, blockForm(lang, recs.find((r) => r.id === b.id) ?? null));
    const warn = overlaps.filter((o) => o.blockId === b.id).sort((x, y) => (x.date < y.date ? -1 : 1));
    const first = warn[0];
    return h("li", { "data-work-block": b.id, class: "wb-row" },
      nsTag(b.ns, lang), " ", h("strong", {}, b.label ?? t("wkb.untitled", lang)), h("span", { class: "muted" }, ` · ${rangeText(b, lang)} · ${t(`wkb.repeat.${b.repeat}` as Key, lang)}`),
      b.protectedBlock ? h("span", { class: "tag ok", "data-wb-protected": "1" }, t("wkb.protected.tag", lang)) : null, hasReminder(b.id) ? h("span", { class: "tag off", "data-wb-reminder": "1" }, t("wkb.remind.tag", lang)) : null,
      b.goalId && titles.get(b.goalId) ? h("span", { class: "muted", "data-wb-goal": b.goalId }, ` · ${titles.get(b.goalId)}`) : null,
      first ? h("p", { class: "muted", role: "status", "data-wb-overlap": first.with }, t(first.with === "work" ? "wkb.overlap.work" : "wkb.overlap.committed", lang, { d: first.date })) : null,
      h("div", { class: "row" }, h("button", { class: "btn ghost btn-sm", type: "button", "data-wb-edit": b.id, onclick: () => { editingBlock = b.id; rerender(); } }, t("wkb.edit", lang)),
        h("button", { class: "btn ghost btn-sm", type: "button", "data-wb-delete": b.id, onclick: () => { deleteBlock(b); rerender(); } }, t("wkb.delete", lang))));
  });
  const ideas = sug.length ? h("ul", { class: "plain wb-ideas", "data-wb-ideas": String(sug.length) }, ...sug.map((s) => h("li", { "data-wb-idea": s.id },
    h("strong", {}, sugLabel(s, taskTitles, lang)), h("span", { class: "muted" }, ` · ${rangeText(s, lang)}`),
    h("button", { class: "btn ghost btn-sm", type: "button", "data-wb-idea-add": s.id, onclick: () => { if (!saveBlock(null, { date: s.date, start: s.start, end: s.end, label: s.source === "task" ? (taskTitles.get(s.taskId ?? "") || null) : t(`wkb.sug.${s.windowId}` as Key, lang), repeat: "none", goalId: null, protectedBlock: false }, false)) return; rerender(); } }, t("wkb.sug.add", lang))))) : h("p", { class: "muted" }, t("wkb.sug.none", lang));
  return h("section", { class: "card wb-card", "data-work-blocks": String(blocks.length), "aria-label": t("wkb.h", lang) }, head, h("p", { class: "muted" }, t("wkb.intro", lang)), h("p", { class: "muted" }, t("wkb.prayer.note", lang)),
    blocks.length ? h("ul", { class: "plain" }, ...rows) : h("p", { class: "muted", "data-wb-none": "1" }, t("wkb.empty", lang)),
    h("h3", { class: "card-h" }, t("wkb.sug.h", lang)), h("p", { class: "muted" }, t("wkb.sug.note", lang)), ideas,
    editingBlock === null ? h("div", {}, h("h3", { class: "card-h" }, t("wkb.add.h", lang)), blockForm(lang, null)) : null, sw);
}

/** Today: the work blocks of today. Nothing is drawn when the feature is off or there is none. */
export function workBlocksTodayCard(lang: Locale): HTMLElement | null {
  if (!prefs.workBlocks) return null;
  const { occs, overlaps } = workState(); const today = todayIso(); const mine = occs.filter((o) => o.date === today);
  if (!mine.length) return null;
  return h("section", { class: "card wb-card", "data-work-blocks-today": String(mine.length), "aria-label": t("wkb.today.h", lang) },
    h("div", { class: "row" }, h("h2", { class: "card-h" }, t("wkb.today.h", lang))),
    h("ul", { class: "plain" }, ...mine.map((o) => h("li", { "data-wb-today": o.blockId }, `${fmtClock(o.start)}–${fmtClock(o.end)} · ${o.label ?? t("wkb.untitled", lang)}`,
      o.protectedBlock ? h("span", { class: "tag ok" }, t("wkb.protected.tag", lang)) : null,
      ((w) => (w ? h("span", { class: "muted", "data-wb-overlap": w.with }, ` · ${t(w.with === "work" ? "wkb.overlap.work" : "wkb.overlap.committed", lang, { d: today })}`) : null))(overlaps.find((x) => x.blockId === o.blockId && x.date === today))))),
    h("a", { href: "#/diary/plan", class: "crumb" }, t("wkb.today.open", lang)));
}

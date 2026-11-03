// M08 time blocks on the Plan screen and Today: the committed time the user typed (prayer, family, rest, work, other), how it sits in the week,
// and the weekly hours it adds up to. Times only. Prayer times are worked out on this phone; the length of each prayer block is the user's number.
import { h } from "./dom";
import { resolvedPrayerTimes } from "./prayerSync";
import { t, tb, fmtNumber } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { intlLocale } from "../i18n/registry";
import { prefs, store } from "./state";
import { activeNs, allRecs, consentOn, consentPrompt, nsTag, saveBlockedText, saveTyped } from "./entry";
import { fieldById } from "../catalog/fields";
import { checkFreeText } from "../core/safety";
import { fmtClock } from "../core/planInputs";
import { BLOCK_KINDS, commitRows, validateCommit, weekBlocks, weeklyBudget, type CommitRow, type TimeBlock, type WeekBlocks } from "../core/timeBlocks";
import type { FieldValue } from "../core/types";

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
const typed = (value: unknown): FieldValue => ({ state: "value", value, label: "FACT" });
const kindLabel = (k: string, lang: Locale): string => { const o = fieldById("constraint.kind")?.options?.find((x) => x.code === k); return o ? tb(o.label, lang) : k; };
const dayName = (d: number, lang: Locale) => new Intl.DateTimeFormat(intlLocale(lang), { weekday: "long" }).format(new Date(2023, 0, 1 + d));

/** Rows and the 7 days of blocks from today, for the active mode. The scheduler gets the same blocks, so a task never lands in one. */
export function currentBlocks(): { rows: CommitRow[]; week: WeekBlocks } {
  const rows = commitRows(allRecs()); const n = new Date();
  return { rows, week: weekBlocks(rows, { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() }, prefs.prayerCoords, prefs.prayerSettings, 7, (cd) => resolvedPrayerTimes(cd).times) };
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
    r.fromDiary ? null : h("button", { class: "btn ghost", type: "button", "data-remove": r.id, style: "width:auto;margin:0 0 0 8px;min-height:44px", onclick: () => { store[activeNs()].delete(r.id); rerender(); } }, t("risk.remove", lang))));
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

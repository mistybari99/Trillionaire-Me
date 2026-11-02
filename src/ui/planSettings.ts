// Settings > Plan & progress (settings redesign PR 3f): automation rules, plan mode, stage names, progress weighting.
// These controls live here and nowhere else; Today, Journey and the Diary plan show a chip with the current value and a link.
import { h } from "./dom";
import { t, tb } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { prefs, screenView } from "./state";
import { viewBar } from "./viewBar";
import { TEMPLATES, TEMPLATE_IDS, type TemplateId } from "../core/stageTemplates";
import { PROGRESS_MODES } from "../core/overallProgress";
import { ruleRows } from "./libraryScreens";
import { settingsHash } from "./settingsRegistry";
import type { PlanMode } from "./state";

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
export const PLAN_MODES: PlanMode[] = ["normal", "minimum_week", "pause"];
const flash = (main: HTMLElement, row: string | undefined) => {
  const el = row ? main.querySelector<HTMLElement>(`[data-setting-row="${row}"]`) : null;
  if (el) { el.classList.add("set-hl"); setTimeout(() => { try { el.scrollIntoView?.({ block: "center" }); } catch { /* ignore */ } }, 0); }
};

/** Current value of each plan setting as plain text (for chips on other screens and for the Settings rows). */
export const planValue = (row: "planmode" | "stages" | "weighting", lang: Locale): string =>
  row === "planmode" ? t(`plan.mode.${prefs.mode}` as Key, lang) : row === "stages" ? tb(TEMPLATES[prefs.stageTemplate].name, lang) : t(prefs.progressMode === "size" ? "overall.mode.size" : "overall.mode.equal", lang);

/** Read-only chip with a link to the one place where the setting is changed. */
export function planChip(row: "planmode" | "stages" | "weighting", what: Key, lang: Locale): HTMLElement {
  return h("p", { class: "muted", "data-plan-chip": row }, t("plan.set.chip", lang, { what: t(what, lang), value: planValue(row, lang) }), " · ",
    h("a", { href: settingsHash("plan", row), class: "crumb" }, t("plan.set.change", lang)));
}

/** Today: while the plan is paused, one calm chip with a way to end the pause. */
export function pauseChip(lang: Locale): HTMLElement | null {
  if (prefs.mode !== "pause") return null;
  return h("aside", { class: "card", role: "status", "data-pause-chip": "1" }, h("p", {}, t("plan.mode.pause.desc", lang)),
    h("button", { class: "btn ghost", type: "button", "data-act": "end-pause", style: "width:auto;margin:0;min-height:44px", onclick: () => { prefs.mode = "normal"; rerender(); } }, t("plan.set.endpause", lang)));
}

const seg = (label: string, active: boolean, on: () => void, attrs: Record<string, string>) => h("button", { type: "button", "aria-pressed": String(active), onclick: on, ...attrs }, label);

export function planPage(row: string | undefined, lang: Locale): HTMLElement {
  const modeCard = h("section", { class: "card", "data-setting-row": "planmode" }, h("h2", { class: "card-h" }, t("set.row.planmode", lang)),
    h("div", { class: "seg", role: "group", "aria-label": t("set.row.planmode", lang) }, ...PLAN_MODES.map((m) => seg(t(`plan.mode.${m}` as Key, lang), prefs.mode === m, () => { prefs.mode = m; rerender(); }, { "data-mode": m }))),
    prefs.mode !== "normal" ? h("p", { class: "muted" }, t(`plan.mode.${prefs.mode}.desc` as Key, lang)) : null);
  const stageCard = h("section", { class: "card", "data-setting-row": "stages", "data-card": "stage_templates" }, h("h2", { class: "card-h" }, t("stage.tpl.h", lang)),
    h("div", { class: "seg", role: "group", "aria-label": t("stage.tpl.h", lang) }, ...TEMPLATE_IDS.map((id: TemplateId) => seg(tb(TEMPLATES[id].name, lang), prefs.stageTemplate === id, () => { prefs.stageTemplate = id; rerender(); }, { "data-tpl": id }))),
    h("p", { class: "muted" }, t("stage.tpl.note", lang)));
  const weightCard = h("section", { class: "card", "data-setting-row": "weighting" }, h("h2", { class: "card-h" }, t("set.row.weighting", lang)),
    h("div", { class: "seg", role: "group", "aria-label": t("overall.weight", lang) }, ...PROGRESS_MODES.map((m) => seg(t(m === "size" ? "overall.mode.size" : "overall.mode.equal", lang), prefs.progressMode === m, () => { prefs.progressMode = m; rerender(); }, { "data-ov-mode": m }))),
    h("p", { class: "muted" }, t("overall.note", lang)));
  const auto = h("section", { "data-setting-row": "rules", ...(screenView("rules") === "compact" ? { class: "view-compact", "data-view": "compact" } : {}) }, h("h2", {}, t("plan.set.automation", lang)), h("p", { class: "sub" }, t("rules.intro", lang)), viewBar("rules", lang), ...ruleRows(lang), h("p", { class: "muted" }, t("rules.note", lang)));
  const main = h("main", { class: "scr scr-settings", "data-settings": "plan" }, h("a", { href: "#/settings", class: "crumb" }, `← ${t("nav.settings", lang)}`), h("h1", {}, t("set.cat.plan", lang)),
    h("p", { class: "sub" }, t("plan.set.intro", lang)), modeCard, weightCard, stageCard, auto);
  flash(main, row === "automation" ? "rules" : row);
  return main;
}

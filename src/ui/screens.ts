import { rootBar } from "./quickNavigationUi";
import { getTabActions } from "./tabActions";
import { getPresentationPreferences } from "./presentationPreferences";
import { todaysInspiration, THEME_LABEL } from "../library/inspiration";
import { groupByHorizon, HORIZONS, type HorizonGoal } from "../core/horizon";
import { h } from "./dom";
import { inputFor } from "./fieldInput";
import { t, tb, fmtNumber } from "../i18n/t";
import type { Key } from "../i18n/packs";
import { intlLocale, type Locale } from "../i18n/registry";
import { prefs, screenView, store, type HorizonView } from "./state";
import { settingsHash } from "./settingsRegistry";
import { pausedCard } from "./privacyUi";
import { disclaimers, fieldHelp, num, showNeed, valueEl } from "./components";
import { STAGES, DEMO_DATE, DEMO_TASKS } from "../demo/seed";
import { MODULES } from "../modules/capability";
import { buildLegend, moduleCard } from "./capabilityUi";
import { ENTITIES } from "../schema/entities";
import { FIELDS, CATALOG_VERSION, intakeSteps, fieldById } from "../catalog/fields";
import { semanticLabel } from "../catalog/labels";
import { completeness, nextStep, stepFields, type Answers } from "../core/intake";
import { checkFreeText } from "../core/safety";
import { type FieldValue, type TMRecord, type UnknownState } from "../core/types";
import type { FieldDef } from "../catalog/types";

import { goalReminders } from "../core/goalStatus";
import { freshnessOf } from "../core/freshness";
import { feasibility, schedule, todaysActions } from "../core/planner";
import { buildPlanInput, capacityState, fmtClock, freeWindow, isOpenTask, isParkedTask } from "../core/planInputs";
import { planFlowData } from "../core/planFlow";
import { assessmentSection } from "./assessment";
import { markNotTrue, realityLogRecord, RealityError } from "../core/reality";
import { weeklySummary } from "../core/weeklyReview";
import { reviewSummary } from "../core/review";
import { stagesFor } from "../core/stageTemplates";
import { planChip, pauseChip } from "./planSettings";
import { movedNoteCard } from "./settingsUi";
import { welcomeBackCard } from "./welcomeUi";
import { hijriCard } from "./hijriUi";
import { prayerLinkRow } from "./prayerSettingsUi";
import { STAGE_CODES, StageError, conditions, currentIndex, passStage, stageStates, type StageCode } from "../core/stages";
import { LAYERS, TOPICS, topicById, relatedTips, type Tip } from "../library/topics";
import { tipsFor } from "../library/packs";
import { journeyArt } from "./rewardArt";
import { messageIndex, milestoneAt } from "../core/reward";
import { diagram } from "./diagram";
import { activityChart, goalRingsChart, habitChart, habitGridTracker, moneyChart } from "./charts";
import type { GridRange } from "../core/chartData";
import { rulesTodayCard } from "./libraryScreens";
import { celebrate, journeyGoalsCard, overallProgressCard } from "./lifeUi";
import { adviceCardsView, homeCountCards, homeSummaryCards, homeNextAction, nextActionCard, nextTaskReason } from "./homeUi";
import { progressRing, isMilestone } from "./ring";
import { logo3d } from "./logo";
import { goalFunnelHero, horizonArc } from "./horizonArt";
import { viewBar, withView } from "./viewBar";
import { concreteBank, effortTip, forkPicture, recoveryLine, timeBands } from "./qb1Ui";
import { kpiSection, kpiTodayCard, todayIsoKpi } from "./kpiUi";
import { realityReportCard, realityTodayCard } from "./realityUi";
import { northStarCard } from "./northStarCard";
import { syncDelegationNow, teamCard } from "./teamCard";
import { riskDueCard } from "./riskCard";
import { printLink } from "./printLink";
import { healthCard } from "./healthUi";
import { deenReportCard, deenTodayCard } from "./deenPlansUi";
import { profileCard } from "./profileCard";
import { blocksTodayCard, commitCard, currentBlocks } from "./blocksUi";
import { toPlannerBlocks } from "../core/timeBlocks";
import { moneyReviewCard, riskReviewCard } from "./monthUi";
import { exitConds, gateDueCard, gateReportCard, stageRulesBlock } from "./gateCard";
import { portfolioCard } from "./ventureCard";
import { ventureRows } from "../core/ventures";
import { backupReminderCard } from "./snapshotsUi";
import { missedTodayCard, remindRow, remindersTodayCard } from "./remindUi";
import { overallProgress } from "../core/overallProgress";
import * as Focus from "../core/focus";
import * as Habits from "../core/habits";
import * as Cards from "../core/cards";
import { CAUSE_TEXT, QUESTIONS, diagnose, type Answer, type Helper } from "../core/stuck";
import { wordChain } from "../core/learning";
import { extract, summarize, type Candidate, type Item } from "../core/capture";
import { netWorth, monthlyCashFlow, runwayFor, type Calc } from "../core/finance";
import { bdtAmount, cashFlow90, financeFrom, foreignOf, parseCurrency, parseRate } from "../core/financeInputs";
import { research, safeQuery } from "../core/research";
import { ownOptions, saveOwnOption, saveSearchResults, savedSearchResults } from "../core/savedLists";
import { wikipedia } from "../adapters/wikipedia";
import { GLOSSARY } from "../catalog/glossary";
import { dhakaNow, isoDate } from "../core/prayer";
import { prayerControls } from "./prayerMarksUi";
import { fastLogId, fastLogRecord, isFastMarked } from "../core/fastLog";
import { goalIdsOf, validateLinks, withGoals } from "../core/taskGoals";
import { linkStats } from "../core/goalPlan";
import { goalChips, goalPicker, whereThisGoes } from "./goalLinks";
import { activeNs, allRecs, asReal, entryNs, putMode, consentOn, consentPrompt, findRec, inNs, labelFor, nsTag, ownerOf, saveBlockedText, saveTyped, storeOf, typed, valueLabel } from "./entry";
import { SCHEMA_VERSION } from "../schema/entities";

const L = () => prefs.lang;
const link = (href: string, cls: string, ...kids: Array<Node | string>) => h("a", { href, class: cls }, ...kids);
const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));

// ---- demo answers persisted per entity in the demo namespace ----
// Answers of the active mode only (demo mode reads demo, real mode reads real). The other mode is never read.
export function loadAnswers(): Answers {
  const a: Answers = {};
  for (const r of allRecs()) if (r.id.startsWith("intake-")) Object.assign(a, r.values);
  return a;
}
function saveAnswers(step: number, vals: Answers): boolean {
  if (!consentOn()) return false; // nothing is saved without consent (D-B)
  const ns = activeNs();
  const byEntity = new Map<string, Answers>();
  for (const [fid, v] of Object.entries(vals)) {
    const f = fieldById(fid); if (!f) continue;
    byEntity.set(f.entity, { ...(byEntity.get(f.entity) ?? {}), [fid]: asReal(v) });
  }
  for (const [entity, values] of byEntity) {
    const id = `intake-${entity}`;
    const prev = store[ns].get(id);
    const rec: TMRecord = { id, entity, ns, ownerId: ownerOf(ns), schemaVersion: SCHEMA_VERSION, createdAt: prev?.createdAt ?? new Date().toISOString(), values: { ...(prev?.values ?? {}), ...values } };
    store[ns].put(rec);
  }
  void step;
  return true;
}

// ---- shared bits ----
// Template chooser shared by the dashboard screens: same records, a different view. Stored per screen in prefs.

function stageLadder(lang: Locale): HTMLElement {
  const compact = screenView("journey") === "compact";
  const ol = h("ol", { class: compact ? "ladder ladder-compact" : "ladder", "data-view": compact ? "compact" : "full", "aria-label": t("stage.ladder", lang) });
  const states = stageStates(stageData().passed);
  stagesFor(prefs.stageTemplate).forEach((g, i) => {
    const st = states[i]!;
    if (compact) { ol.append(h("li", { class: st, "data-stage": g.code }, h("b", {}, g.code), " ", h("span", {}, tb(g.name, lang)), " ", h("span", { class: `tag ${st === "done" ? "ok" : st === "now" ? "warn" : "off"}` }, t(`stage.${st === "now" ? "current" : st}` as Key, lang)))); return; }
    ol.append(h("li", { class: st, "data-stage": g.code }, h("b", {}, g.code), h("div", {}, h("div", {}, tb(g.name, lang)), h("div", { class: "muted" }, tb(g.exit, lang))), h("span", { class: `tag ${st === "done" ? "ok" : st === "now" ? "warn" : "off"}` }, t(`stage.${st === "now" ? "current" : st}` as Key, lang))));
  });
  return ol;
}

// ---- plan (G3 core wired to the UI) ----
// O6: "reality changed". The step stays on record, is no longer scheduled, and the change is appended to the journey log.
function markRealityChanged(taskId: string, lang: Locale) {
  const r = findRec(taskId); if (!r) return;
  const day = new Date(); const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
  try {
    const title = String((r.values["task.title"] as { value?: unknown } | undefined)?.value ?? "");
    storeOf(r).put(inNs(markNotTrue(r, iso), r.ns));
    storeOf(r).put(inNs(realityLogRecord({ id: `reality-${taskId}-${Date.now().toString(36)}`, taskId, text: t("reality.logged", lang, { title, date: iso }), createdAt: day.toISOString() }), r.ns));
    rerender();
  } catch (e) { if (!(e instanceof RealityError)) throw e; }
}
function currentPlan() {
  const a = loadAnswers(); const recs = allRecs();
  const input = buildPlanInput(a, recs, prefs.mode, new Date().getDay(), toPlannerBlocks(currentBlocks().week.blocks));
  const titles = new Map(recs.filter((r) => r.entity === "task").map((r) => [r.id, String((r.values["task.title"] as { value?: unknown })?.value ?? "")]));
  return { a, recs, input, plan: schedule(input), state: capacityState(a), titles, hasTasks: titles.size > 0 };
}
const weekday = (d: number, lang: Locale) => new Intl.DateTimeFormat(intlLocale(lang), { weekday: "long" }).format(new Date(2023, 0, 1 + d));

// B9 (R6): plan flow as inline SVG. Static on purpose (no animation), so reduced motion needs nothing extra.
// Every value comes from the user's own records; a missing value is shown as "unknown", never 0.
const SVG_NS = "http://www.w3.org/2000/svg";
function svgEl(tag: string, attrs: Record<string, string | number>, ...kids: Array<SVGElement | string>): SVGElement {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  for (const c of kids) el.append(typeof c === "string" ? document.createTextNode(c) : c);
  return el;
}
const clip = (s: string, n = 24) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
export function planFlow(cp: ReturnType<typeof currentPlan>, lang: Locale): HTMLElement {
  const W = 320, NODE = 56, GAP = 26, INPUT = 100, AI = 72, VAL_X = 124, MID = W / 2;
  const U = t("plan.flow.unknown", lang), c = completeness(cp.a);
  const d = planFlowData(cp.recs, cp.a, cp.state, new Set(cp.plan.placements.map((p) => p.taskId)), c.addressed, c.total);
  type Row = { id: string; label: string; value: string | null; state?: "later" };
  const inputs: Row[] = [
    { id: "time", label: t("plan.flow.time", lang), value: d.hours === null ? null : t("plan.flow.hours", lang, { h: num(d.hours, lang) }) },
    { id: "tools", label: t("plan.flow.tools", lang), value: d.tools === null ? null : t("plan.flow.listed", lang, { n: num(d.tools, lang) }) },
    { id: "skills", label: t("plan.flow.skills", lang), value: d.skills === null ? null : t("plan.flow.listed", lang, { n: num(d.skills, lang) }) },
  ];
  const research = d.research ? t("plan.flow.answered", lang, { n: num(d.research.answered, lang), total: num(d.research.total, lang) }) : null;
  const plan = d.plan ? t("plan.flow.placed", lang, { n: num(d.plan.placed, lang), total: num(d.plan.tasks, lang) }) : null;
  const goal = d.goal === null ? null : clip(d.goal);
  const aria = [...inputs.map((r) => `${r.label}: ${r.value ?? U}`), `${t("plan.flow.research", lang)}: ${research ?? U}`, `${t("plan.flow.plan", lang)}: ${plan ?? U}`, `${t("plan.flow.ai", lang)}: ${t("plan.flow.later", lang)}`, `${t("plan.flow.goal", lang)}: ${goal ?? U}`];

  const parts: SVGElement[] = [];
  let y = 0;
  const arrow = (y0: number, ai = false) => parts.push(svgEl("line", { x1: MID, y1: y0, x2: MID, y2: y0 + GAP - 4, class: ai ? "fl-arrow fl-arrow-ai" : "fl-arrow", "marker-end": "url(#fl-head)", "aria-hidden": "true" }));
  const valueText = (x: number, yc: number, text: string | null, cls = "fl-val") => svgEl("text", { x: VAL_X, y: yc, "dominant-baseline": "central", class: text === null ? `${cls} fl-unk` : cls }, text ?? U);
  // Input group: three plain lines in one box.
  parts.push(svgEl("rect", { x: 0, y, width: W, height: INPUT, rx: 4, class: "fl-box" }));
  inputs.forEach((r, i) => {
    const yc = y + 28 + i * 24;
    parts.push(svgEl("g", { "data-flow-node": r.id, "data-state": r.value === null ? "unknown" : "value" },
      svgEl("text", { x: 14, y: yc, "dominant-baseline": "central", class: "fl-label" }, r.label), valueText(VAL_X, yc, r.value)));
  });
  y += INPUT; arrow(y); y += GAP;
  // Research, plan, then the AI step (later, disabled), then the goal.
  const row = (id: string, label: string, value: string | null) => {
    const yc = y + NODE / 2;
    parts.push(svgEl("g", { "data-flow-node": id, "data-state": value === null ? "unknown" : "value" },
      svgEl("rect", { x: 0, y, width: W, height: NODE, rx: 4, class: "fl-box" }),
      svgEl("text", { x: 14, y: yc, "dominant-baseline": "central", class: "fl-label" }, label), valueText(VAL_X, yc, value)));
    y += NODE;
  };
  row("research", t("plan.flow.research", lang), research); arrow(y); y += GAP;
  row("plan", t("plan.flow.plan", lang), plan); arrow(y); y += GAP;
  // AI step: shown, disabled, marked later. The app has no AI (decision D-C not approved).
  parts.push(svgEl("g", { "data-flow-node": "ai", "data-state": "later", class: "fl-ai-g", "aria-disabled": "true" },
    svgEl("rect", { x: 0, y, width: W, height: AI, rx: 4, class: "fl-box fl-box-ai" }),
    svgEl("text", { x: 14, y: y + 24, "dominant-baseline": "central", class: "fl-label fl-muted" }, t("plan.flow.ai", lang)),
    valueText(VAL_X, y + 24, t("plan.flow.later", lang), "fl-val fl-muted"),
    svgEl("text", { x: 14, y: y + 50, "dominant-baseline": "central", class: "fl-note" }, t("plan.flow.ai.note", lang))));
  y += AI; arrow(y, true); y += GAP;
  row("goal", t("plan.flow.goal", lang), goal);

  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${y}`, class: "flow", role: "img", "aria-label": `${t("plan.flow.title", lang)}. ${aria.join(". ")}`, "data-flow": "1", focusable: "false" },
    svgEl("defs", {}, svgEl("marker", { id: "fl-head", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto" }, svgEl("path", { d: "M0,0 L10,5 L0,10 z", class: "fl-head" }))),
    ...parts);
  return h("div", { class: "card", "data-flow-card": "1" }, h("h2", { class: "card-h", }, t("plan.flow.title", lang)), h("p", { class: "muted" }, t("plan.flow.intro", lang)), svg);
}

// TM-REQ-015: flagged before scheduling, in calm words. Nothing is deleted or reordered by the flag.
function feasibilityNote(cp: ReturnType<typeof currentPlan>, lang: Locale): HTMLElement | null {
  const f = feasibility(cp.input);
  if (f.state !== "infeasible") return null;
  return h("p", { class: "note", role: "status", "data-infeasible": "1" }, t("plan.infeasible", lang, { need: num(Math.round(f.neededMinutes / 60 * 10) / 10, lang), have: num(Math.round(f.capacityMinutes / 60 * 10) / 10, lang) }));
}

/** Edit a step after it was made: its words, its estimate (blank = not estimated yet, never 0) and how soon. Real mode needs the consent tick. */
/** Writes the goal list of a saved step through the one writer (also keeps the old single link as a mirror). Nothing is added to the plan. */
function saveGoalLinks(id: string, ids: string[]): void {
  const cur = findRec(id); if (!cur) return;
  if (validateLinks(allRecs(), cur, ids) !== null) return;
  const next = withGoals(cur, ids); if (JSON.stringify(next) !== JSON.stringify(cur)) storeOf(cur).put(next);
}

function taskEditForm(r: TMRecord, lang: Locale): HTMLElement {
  const g = (k: string) => (r.values[k] as { value?: unknown } | undefined)?.value;
  const title = h("input", { id: `te-t-${r.id}`, type: "text", maxlength: "120", autocomplete: "off", value: String(g("task.title") ?? "") });
  const mv = g("task.minutes");
  const mins = h("input", { id: `te-m-${r.id}`, type: "text", inputmode: "numeric", value: typeof mv === "number" ? String(mv) : "" });
  const prio = h("select", { id: `te-p-${r.id}` }, ...fieldById("task.priority")!.options!.map((o) => h("option", { value: o.code, ...(o.code === String(g("task.priority") ?? "normal") ? { selected: true } : {}) }, tb(o.label, lang))));
  const msg = h("p", { class: "err", role: "alert" });
  const pick = goalPicker(allRecs(), goalIdsOf(r), lang, `edit-${r.id}`);
  const f = h("form", { novalidate: true, "data-task-edit": r.id },
    h("label", { for: `te-t-${r.id}` }, t("plan.task.title", lang)), title, h("label", { for: `te-m-${r.id}` }, t("plan.task.minutes", lang)), mins,
    h("label", { for: `te-p-${r.id}` }, t("plan.task.priority", lang)), prio, h("p", {}, h("strong", {}, t("gl.pick.label", lang))), pick.el, whereThisGoes(r, lang), msg, h("button", { class: "btn ghost btn-sm", type: "submit" }, t("plan.task.update", lang)));
  f.addEventListener("submit", (ev) => {
    ev.preventDefault(); msg.className = "err"; msg.textContent = "";
    if (!entryNs()) { msg.textContent = saveBlockedText(lang); return; }
    const name = title.value.trim(); if (!name) { showNeed(msg, t("plan.task.err.title", lang)); return; }
    if (!checkFreeText(name).ok) { msg.textContent = t("intake.secretRejected", lang); return; }
    const raw = mins.value.trim().replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6)); let m: FieldValue;
    if (raw === "") m = { state: "later" }; else { const n = Number(raw); if (!Number.isFinite(n) || n <= 0 || n > 1440) { msg.textContent = t("intake.invalidNumber", lang); return; } m = { state: "value", value: Math.round(n), label: labelFor(r.ns) }; }
    const cur = findRec(r.id); if (!cur) return;
    storeOf(cur).put({ ...cur, values: { ...cur.values, "task.title": { state: "value", value: name, label: labelFor(cur.ns) }, "task.minutes": m, "task.priority": { state: "value", value: prio.value, label: labelFor(cur.ns) } } });
    saveGoalLinks(cur.id, pick.ids());
    rerender();
  });
  return h("details", { class: "help" }, h("summary", {}, t("plan.task.edit", lang)), f);
}

export function planScreen(): HTMLElement {
  const lang = L(); const cp = currentPlan();
  const w = freeWindow(cp.a);
  const free = cp.state === "ok"
    ? valueEl(t("plan.hours", lang, { h: num(Number((cp.a["constraint.weekly_free_hours"] as { value: number }).value), lang), from: fmtClock(w!.from), to: fmtClock(w!.to) }), valueLabel(cp.a["constraint.weekly_free_hours"]), lang)
    : h("span", {}, t(cp.state === "need_hours" ? "plan.need_hours" : "plan.need_window", lang), " ", link("#/diary/intake/4", "crumb", t("plan.setup", lang)));
  const title = h("input", { id: "pt-title", type: "text", maxlength: "120", autocomplete: "off" });
  const mins = h("input", { id: "pt-min", type: "text", inputmode: "numeric" });
  const prio = h("select", { id: "pt-prio" }, ...fieldById("task.priority")!.options!.map((o) => h("option", { value: o.code, ...(o.code === "normal" ? { selected: true } : {}) }, tb(o.label, lang))));
  // M06 dependency: "do this after" lists open tasks only; nothing is chosen by default.
  const openTasks = cp.recs.filter(isOpenTask).sort((a, b) => a.id.localeCompare(b.id));
  const sizeSel = h("select", { id: "pt-size" }, h("option", { value: "" }, t("plan.size.none", lang)), ...fieldById("task.size")!.options!.map((o) => h("option", { value: o.code }, tb(o.label, lang))));
  const afterSel = h("select", { id: "pt-after" }, h("option", { value: "" }, t("plan.after.none", lang)),
    ...openTasks.map((r) => h("option", { value: r.id }, cp.titles.get(r.id) ?? r.id)));
  // Goals a step helps: a flat set of toggle chips (multi-goal ruling); the single old link is kept only as a mirror by the one writer.
  const goalPick = goalPicker(cp.recs, [], lang, "new");
  // M10: optional role that does this step. Roles only, no names. A role covered by someone else takes the step out of the user's own schedule.
  const roleRecs = cp.recs.filter((r) => r.entity === "team_role" && r.values["team_role.role"]?.state === "value").sort((a, b) => a.id.localeCompare(b.id));
  const roleTitle = (r: TMRecord) => String((r.values["team_role.role"] as { value?: unknown }).value ?? "");
  const roleSel = h("select", { id: "pt-role" }, h("option", { value: "" }, t("plan.role.none", lang)), ...roleRecs.map((r) => h("option", { value: r.id }, roleTitle(r))));
  const err = h("p", { class: "err", role: "alert" });
  const gate = consentOn() ? null : consentPrompt(lang);
  const form = h("form", { novalidate: true, "data-form": "task" }, gate,
    h("label", { for: "pt-title" }, t("plan.task.title", lang)), title,
    h("label", { for: "pt-min" }, t("plan.task.minutes", lang)), mins,
    h("label", { for: "pt-prio" }, t("plan.task.priority", lang)), prio,
    h("label", { for: "pt-size" }, t("plan.size.label", lang)), sizeSel,
    ...(openTasks.length ? [h("label", { for: "pt-after" }, t("plan.after.label", lang)), afterSel] : []),
    h("p", { class: "label-like" }, h("strong", {}, t("gl.pick.label", lang))), goalPick.el,
    ...(roleRecs.length ? [h("label", { for: "pt-role" }, t("plan.role.label", lang)), roleSel] : []), err,
    h("button", { class: "btn", type: "submit" }, t("plan.task.save", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault(); err.textContent = "";
    const name = title.value.trim(); if (!name) return;
    if (!checkFreeText(name).ok) { err.textContent = t("intake.secretRejected", lang); return; }
    const raw = mins.value.trim().replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6)); let m: FieldValue;
    if (raw === "") m = { state: "later" };
    else { const n = Number(raw); if (!Number.isFinite(n) || n <= 0 || n > 1440) { err.textContent = t("intake.invalidNumber", lang); return; } m = typed(Math.round(n)); }
    const id = `task-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    if (!saveTyped({ id, entity: "task", createdAt: new Date().toISOString(),
      values: { "task.title": typed(name), "task.minutes": m, "task.priority": typed(prio.value), ...(sizeSel.value ? { "task.size": typed(sizeSel.value) } : {}) },
      ...(afterSel.value || roleSel.value ? { links: { ...(afterSel.value ? { after: afterSel.value } : {}), ...(roleSel.value ? { role: roleSel.value } : {}) } } : {}) })) { err.textContent = saveBlockedText(lang); return; }
    saveGoalLinks(id, goalPick.ids());
    syncDelegationNow();
    rerender();
  });
  const afterTitle = (id: string) => cp.titles.get(id) || "";
  const planCompact = screenView("plan") === "compact";
  const taskLines = cp.recs.filter((r) => r.entity === "task").sort((a, b) => a.id.localeCompare(b.id)).map((r) => {
    const mv = r.values["task.minutes"];
    const done = r.values["task.done_on"]?.state === "value";
    return h("li", { "data-task": r.id }, nsTag(r.ns, lang), " ", h("strong", {}, cp.titles.get(r.id) ?? ""), " · ",
      mv && mv.state === "value" ? valueEl(t("task.minutes", lang, { n: num(Number(mv.value), lang) }), mv.label, lang) : t("plan.task.minutes.later", lang),
      done ? h("span", { class: "tag ok" }, t("reward.done", lang)) : null);
  });
  const taskRows = cp.recs.filter((r) => r.entity === "task").sort((a, b) => a.id.localeCompare(b.id)).map((r) => {
    const mv = r.values["task.minutes"];
    const el = h("div", { class: "card", "data-task": r.id }, h("div", { class: "row" },
      h("div", {}, nsTag(r.ns, lang), h("h2", { class: "card-h", }, cp.titles.get(r.id) ?? ""), h("p", { class: "muted" }, mv && mv.state === "value" ? valueEl(t("task.minutes", lang, { n: num(Number(mv.value), lang) }), mv.label, lang) : t("plan.task.minutes.later", lang)),
        r.links?.after ? h("p", { class: "muted", "data-after": r.links.after }, t("plan.after.shown", lang, { title: afterTitle(r.links.after) })) : null,
        h("p", { class: "muted", "data-goals": r.id }, goalChips(r, lang, cp.recs)),
        r.links?.role && roleRecs.some((g) => g.id === r.links!.role) ? h("p", { class: "muted", "data-role-of": r.links.role }, t("plan.role.shown", lang, { title: roleTitle(roleRecs.find((g) => g.id === r.links!.role)!) }), r.values["task.delegated_on"]?.state === "value" && r.values["task.done_on"]?.state !== "value" ? h("span", { class: "tag off", "data-delegated": r.id }, ` ${t("team.step.delegated", lang)}`) : null, " ", link("#/diary/team", "crumb", t("plan.role.open", lang))) : null),
      r.values["task.done_on"]?.state === "value" ? h("span", { class: "tag ok" }, t("reward.done", lang))
        : isParkedTask(r) ? h("div", {}, h("span", { class: "tag off", "data-parked": r.id }, t("rl.parked.tag", lang, { date: String((r.values["task.parked_on"] as { value?: unknown }).value) })), h("p", { class: "muted" }, t("rl.parked.note", lang)), link("#/journey/reality", "crumb", t("rl.parked.open", lang)))
        : r.values["task.not_true_on"]?.state === "value" ? h("div", {}, h("span", { class: "tag off" }, t("reality.tag", lang, { date: String((r.values["task.not_true_on"] as { value?: unknown }).value) })), h("p", { class: "muted" }, t("reality.note", lang)), h("button", { class: "btn ghost btn-sm", type: "button", onclick: () => { storeOf(r).delete(r.id); rerender(); } }, t("plan.task.remove", lang)))
        : h("div", {}, doneBtn(r.id, lang), focusBtn(r.id, lang), h("button", { class: "btn ghost btn-sm", type: "button", "data-act": "reality-changed", "data-task-id": r.id, onclick: () => markRealityChanged(r.id, lang) }, t("reality.btn", lang)), h("button", { class: "btn ghost btn-sm", type: "button", onclick: () => { storeOf(r).delete(r.id); rerender(); } }, t("plan.task.remove", lang)))));
    if (r.values["task.done_on"]?.state !== "value") { el.append(remindRow("task", r.id, lang, { planned: cp.plan.placements.some((p) => p.taskId === r.id) }), taskEditForm(r, lang)); }
    return el;
  });
  const byDay = (d: number) => cp.plan.placements.filter((p) => p.day === d).sort((a, b) => a.start - b.start);
  const week = [0, 1, 2, 3, 4, 5, 6].map((i) => (new Date().getDay() + i) % 7).filter((d) => byDay(d).length).map((d) => h("div", { class: "card", "data-day": String(d) }, h("h2", { class: "card-h", }, weekday(d, lang)),
    ...byDay(d).map((p) => h("p", { "data-placement": p.taskId }, `${fmtClock(p.start)}–${fmtClock(p.end)} · ${cp.titles.get(p.taskId) ?? ""}`))));
  return h("main", { class: "scr scr-plan" },
    link("#/diary", "crumb", `← ${t("diary.title", lang)}`),
    h("h1", {}, t("plan.title", lang)), h("p", { class: "sub" }, t("plan.intro", lang)), printLink("plan", lang),
    h("div", { class: "card", "data-capacity": cp.state }, h("h2", { class: "card-h", }, t("plan.free", lang)), h("p", {}, free)),
    feasibilityNote(cp, lang),
    commitCard(lang, ((x) => (typeof x === "number" ? x : null))((cp.a["constraint.weekly_free_hours"] as { value?: unknown } | undefined)?.value)),
    planFlow(cp, lang),
    assessmentSection(cp.recs, lang),
    h("h2", {}, t("plan.mode", lang)), planChip("planmode", "plan.mode", lang),
    prefs.mode !== "normal" ? h("p", { class: "muted" }, t(`plan.mode.${prefs.mode}.desc` as Key, lang)) : null,
    h("h2", {}, t("plan.add", lang)), form,
    viewBar("plan", lang),
    cp.hasTasks ? (planCompact ? h("ul", { class: "list-compact", "data-view": "compact" }, ...taskLines) : h("div", { "data-view": "full" }, ...taskRows)) : h("p", { class: "muted" }, t("plan.task.empty", lang)),
    h("h2", {}, t("plan.week", lang)),
    week.length ? h("div", {}, ...week, h("p", { class: "muted" }, t("plan.used", lang, { m: num(cp.plan.usedMinutes, lang), c: num(cp.input.weeklyFreeMinutes ?? 0, lang) }))) : h("p", { class: "muted" }, t("plan.nothing", lang)),
    cp.plan.deferred.length ? h("div", {}, h("h2", { class: "card-h", }, t("plan.later", lang)), ...cp.plan.deferred.map((d) => h("p", { class: "muted", "data-deferred": d.reason }, `${cp.titles.get(d.taskId) ?? ""} — ${t(`plan.why.${d.reason}` as Key, lang)}`))) : null,
    disclaimers(lang));
}


// ---- money (finance maths wired to the UI) ----
export function moneyScreen(): HTMLElement {
  const lang = L(); const recs = allRecs(); const fv = financeFrom(recs);
  const mixed = new Set(recs.filter((r) => r.entity === "finance_item").map((r) => r.ns)).size > 1;
  const sel = (id: string, f: string) => h("select", { id }, ...fieldById(f)!.options!.map((o) => h("option", { value: o.code }, tb(o.label, lang))));
  const kind = sel("mf-kind", "finance.kind"), scope = sel("mf-scope", "finance.scope"), period = sel("mf-period", "finance.period");
  const name = h("input", { id: "mf-name", type: "text", maxlength: "80", autocomplete: "off" });
  const amount = h("input", { id: "mf-amount", type: "text", inputmode: "decimal" });
  const unk = h("select", { id: "mf-state", "aria-label": t("intake.valueFor", lang) }, h("option", { value: "value" }, t("intake.valueFor", lang)), ...(["unknown", "later", "prefer_not"] as const).map((u) => h("option", { value: u }, t(`unknown.${u}` as Key, lang))));
  const currency = h("input", { id: "mf-currency", type: "text", maxlength: "3", autocomplete: "off", style: "text-transform:uppercase" });
  const rate = h("input", { id: "mf-rate", type: "text", inputmode: "decimal", autocomplete: "off" });
  const onDate = h("input", { id: "mf-on", type: "date" });
  const err = h("p", { class: "err", role: "alert" });
  const gate = consentOn() ? null : consentPrompt(lang);
  // Optional link to one of the user's ventures (business income or expense lines only). Shown only when a venture exists.
  const vRows = ventureRows(recs);
  const ventureSel = vRows.length ? h("select", { id: "mf-venture" }, h("option", { value: "" }, t("ven.money.none", lang)), ...vRows.map((v) => h("option", { value: v.id }, v.name))) : null;
  const form = h("form", { novalidate: true, "data-form": "money" }, gate,
    h("label", { for: "mf-kind" }, t("money.kind", lang)), kind, h("label", { for: "mf-scope" }, t("money.scope", lang)), scope,
    h("label", { for: "mf-name" }, t("money.name", lang)), name, h("p", { class: "muted" }, t("money.nameHint", lang)),
    h("label", { for: "mf-amount" }, t("money.amount", lang)), amount, unk,
    h("label", { for: "mf-period" }, t("money.period", lang)), period,
    h("label", { for: "mf-on" }, t("money.on", lang)), onDate,
    h("label", { for: "mf-currency" }, t("money.currency", lang)), currency, h("p", { class: "muted" }, t("money.currency.hint", lang)),
    h("label", { for: "mf-rate" }, t("money.rate", lang)), rate, h("p", { class: "muted" }, t("money.rate.hint", lang)),
    ...(ventureSel ? [h("label", { for: "mf-venture" }, t("ven.money.pick", lang)), ventureSel] : []), err,
    h("button", { class: "btn", type: "submit" }, t("money.save", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault(); err.textContent = "";
    const nm = name.value.trim(); if (!nm) return;
    if (!checkFreeText(nm).ok) { err.textContent = t("intake.secretRejected", lang); return; }
    let amt: FieldValue;
    if (unk.value !== "value") amt = { state: unk.value as UnknownState };
    else {
      const raw = amount.value.trim().replace(/,/g, "").replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6));
      if (raw === "") amt = { state: "unknown" };
      else { const n = Number(raw); if (!Number.isFinite(n) || n < 0) { err.textContent = t("intake.invalidNumber", lang); return; } amt = typed(n); }
    }
    const d = (x: string): FieldValue => typed(x);
    const vid = ventureSel?.value ?? "";
    if (vid && (scope.value !== "business" || (kind.value !== "income" && kind.value !== "expense"))) { err.textContent = t("ven.money.err", lang); return; }
    const cur = parseCurrency(currency.value); if (cur === null) { err.textContent = t("money.err.currency", lang); return; }
    const rt = parseRate(rate.value); if (rt === null) { err.textContent = t("money.err.rate", lang); return; }
    const dayOk = (x: string) => /^\d{4}-\d{2}-\d{2}$/.test(x) && new Date(x).toISOString().slice(0, 10) === x;
    if (onDate.value && !dayOk(onDate.value)) { err.textContent = t("money.err.on", lang); return; }
    const extra: Record<string, FieldValue> = {};
    if (cur.state === "code") { extra["finance.currency"] = d(cur.code); if (rt.state === "value") { extra["finance.fx_rate"] = typed(rt.value); extra["finance.fx_on"] = d(todayIsoKpi()); } }
    if (onDate.value && period.value === "once") extra["finance.on"] = d(onDate.value);
    const id = `fin-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    if (!saveTyped({ id, entity: "finance_item", createdAt: new Date().toISOString(), ...(vid ? { links: { venture: vid } } : {}),
      values: { "finance.kind": d(kind.value), "finance.scope": d(scope.value), "finance.label": d(nm), "finance.amount": amt, "finance.period": d(period.value), ...extra } })) { err.textContent = saveBlockedText(lang); return; }
    rerender();
  });
  const show = (c: Calc) => c.ok ? valueEl(t("money.bdt", lang, { v: fmtNum(c.value, lang) }), c.label, lang) : h("span", { class: "muted", "data-unknown": "1" }, t("money.unknown", lang, { n: num(c.missing, lang) }));
  // nothing entered is "nothing yet", not a computed 0
  const has = (sc: "personal" | "business", kinds: string[]) => fv.items.some((i) => i.scope === sc && kinds.includes(i.kind));
  const runwayRow = (sc: "personal" | "business") => {
    const r = runwayFor(fv.items, sc);
    return h("p", { "data-runway": r.state, "data-runway-scope": sc }, t("money.runway", lang), ": ",
      r.state === "baseline_needed" ? h("span", { class: "muted", "data-baseline-needed": sc }, t("money.baselineNeeded", lang))
      : r.state === "unknown_flow" ? h("span", { class: "muted", "data-unknown": "1" }, t("money.unknown", lang, { n: num(r.missing, lang) }))
      : r.state === "steady" ? t("money.runway.steady", lang)
      : valueEl(t("money.runway.months", lang, { n: num(Math.round(r.value * 10) / 10, lang) }), r.label, lang));
  };
  const cash90Row = (sc: "personal" | "business") => {
    const c = cashFlow90(fv, sc, todayIsoKpi());
    const has90 = has(sc, ["income", "expense"]) || fv.oneOff.some((o) => o.scope === sc && o.on !== null);
    return h("div", { "data-cash90": sc }, h("p", {}, t("money.cash90", lang), ": ", !has90 ? h("span", { class: "muted", "data-none": "1" }, t("money.none", lang))
      : c.state === "value" ? valueEl(t("money.bdt", lang, { v: fmtNum(c.value, lang) }), "ESTIMATE", lang) : h("span", { class: "muted", "data-unknown": "1" }, t("money.unknown", lang, { n: num(c.missing, lang) }))),
      c.state === "value" && c.oneOffIn ? h("p", { class: "muted" }, t("money.cash90.extra", lang, { n: num(c.oneOffIn, lang) })) : null,
      c.undated ? h("p", { class: "muted", "data-cash90-undated": String(c.undated) }, t("money.cash90.undated", lang, { n: num(c.undated, lang) })) : null);
  };
  const sum = (sc: "personal" | "business") => h("div", { class: "card", "data-scope": sc }, h("h2", { class: "card-h", }, t(`money.${sc}` as Key, lang)),
    h("p", {}, t("money.networth", lang), ": ", has(sc, ["asset", "liability"]) ? show(netWorth(fv.items, sc)) : h("span", { class: "muted", "data-none": "1" }, t("money.none", lang))),
    h("p", {}, t("money.cashflow", lang), ": ", has(sc, ["income", "expense"]) ? show(monthlyCashFlow(fv.items, sc)) : h("span", { class: "muted", "data-none": "1" }, t("money.none", lang))),
    has(sc, ["income", "expense"]) ? runwayRow(sc) : null,
    cash90Row(sc));
  // One line's amount: BDT as typed, or the other currency with the user's own rate and the BDT result. No rate means the BDT amount is Unknown.
  const amountView = (r: TMRecord): Node => {
    const a = r.values["finance.amount"]!; const f = foreignOf(r);
    if (!f) return a.state === "value" ? valueEl(t("money.bdt", lang, { v: fmtNum(Number(a.value), lang) }), a.label, lang) : document.createTextNode(t(`unknown.${a.state}` as Key, lang));
    if (a.state !== "value") return document.createTextNode(`${f.code} · ${t(`unknown.${a.state}` as Key, lang)}`);
    const b = bdtAmount(r);
    if (b.state !== "value" || f.rate === null) return h("span", { class: "muted", "data-fx-norate": r.id }, t("money.fx.norate", lang, { c: f.code, a: fmtNum(Number(a.value), lang) }));
    return h("span", { "data-fx": r.id }, valueEl(t("money.fx.line", lang, { c: f.code, a: fmtNum(Number(a.value), lang), r: fmtNum(f.rate, lang), b: fmtNum(Number(b.value), lang) }), "ESTIMATE", lang), f.rateOn ? h("small", { class: "muted" }, ` (${t("money.fx.rateOn", lang, { d: f.rateOn })})`) : null);
  };
  // Change the rate of a line in another currency (a rate the user types; nothing is fetched).
  const rateForm = (r: TMRecord): HTMLElement | null => {
    const f = foreignOf(r); if (!f) return null;
    const inp = h("input", { id: `fxr-${r.id}`, type: "text", inputmode: "decimal", autocomplete: "off", value: f.rate === null ? "" : String(f.rate) });
    const msg = h("p", { class: "err", role: "alert" });
    const form2 = h("form", { novalidate: true, "data-fx-edit": r.id }, h("label", { for: `fxr-${r.id}` }, t("money.fx.setRate", lang, { c: f.code })), inp, msg,
      h("button", { class: "btn ghost btn-sm", type: "submit" }, t("money.fx.update", lang)));
    form2.addEventListener("submit", (ev) => {
      ev.preventDefault(); msg.textContent = "";
      const rt = parseRate(inp.value); if (rt === null) { msg.textContent = t("money.err.rate", lang); return; }
      if (!entryNs()) { msg.textContent = saveBlockedText(lang); return; }
      const rec = allRecs().find((x) => x.id === r.id); if (!rec) return;
      const values = { ...rec.values };
      if (rt.state === "value") { values["finance.fx_rate"] = { state: "value", value: rt.value, label: labelFor(rec.ns) }; values["finance.fx_on"] = { state: "value", value: todayIsoKpi(), label: labelFor(rec.ns) }; }
      else { delete values["finance.fx_rate"]; delete values["finance.fx_on"]; }
      storeOf(rec).put({ ...rec, values }); rerender();
    });
    return form2;
  };
  const periodTag = (r: TMRecord): HTMLElement | null => {
    const p = (r.values["finance.period"] as { value?: unknown } | undefined)?.value; const k = (r.values["finance.kind"] as { value?: unknown } | undefined)?.value;
    if (k !== "income" && k !== "expense") return null;
    if (p === "yearly") return h("p", { class: "muted", "data-fin-period": "yearly" }, tb(fieldById("finance.period")!.options!.find((o) => o.code === "yearly")!.label, lang));
    if (p === "once") { const on = (r.values["finance.on"] as { value?: unknown } | undefined)?.value; return h("p", { class: "muted", "data-fin-period": "once" }, typeof on === "string" ? t("money.oneoff.on", lang, { d: on }) : t("money.oneoff.undated", lang)); }
    return null;
  };
  const rows = recs.filter((r) => r.entity === "finance_item").sort((a, b) => a.id.localeCompare(b.id)).map((r) => {
    return h("div", { class: "card", "data-fin": r.id }, h("div", { class: "row" }, h("div", {}, nsTag(r.ns, lang),
      h("h2", { class: "card-h", }, fv.labels.get(r.id) ?? String((r.values["finance.label"] as { value?: unknown })?.value ?? "")),
      h("p", { class: "muted" }, amountView(r)), periodTag(r), rateForm(r),
      r.values["finance.on"]?.state === "value" && ["expense", "liability"].includes(String((r.values["finance.kind"] as { value?: unknown } | undefined)?.value)) ? remindRow("bill", r.id, lang) : null,
      r.links?.venture && vRows.some((v) => v.id === r.links!.venture) ? h("p", { class: "muted", "data-fin-venture": r.links.venture }, t("ven.money.tag", lang, { v: vRows.find((v) => v.id === r.links!.venture)!.name })) : null),
      h("button", { class: "btn ghost btn-sm", type: "button", onclick: () => { storeOf(r).delete(r.id); rerender(); } }, t("money.remove", lang))));
  });
  const moneyCompact = screenView("money") === "compact";
  const moneyTable = h("table", { class: "table-compact", "data-view": "compact" }, h("tbody", {}, ...recs.filter((r) => r.entity === "finance_item").sort((a, b) => a.id.localeCompare(b.id)).map((r) => {
    return h("tr", { "data-fin": r.id }, h("td", {}, nsTag(r.ns, lang)), h("td", {}, fv.labels.get(r.id) ?? String((r.values["finance.label"] as { value?: unknown })?.value ?? "")),
      h("td", {}, amountView(r)));
  })));
  return h("main", { class: "scr scr-money" },
    link("#/diary", "crumb", `← ${t("diary.title", lang)}`), h("h1", {}, t("money.title", lang)), h("p", { class: "sub" }, t("money.intro", lang)),
    h("h2", {}, t("money.summary", lang)), sum("personal"), sum("business"),
    fv.notMonthly ? h("p", { class: "muted" }, t("money.notMonthly", lang, { n: num(fv.notMonthly, lang) })) : null,
    fv.yearly ? h("p", { class: "muted", "data-yearly-note": String(fv.yearly) }, t("money.yearly.note", lang, { n: num(fv.yearly, lang) })) : null,
    fv.foreign ? h("p", { class: "muted", "data-fx-note": String(fv.foreign) }, t("money.fx.note", lang, { n: num(fv.foreign, lang), m: num(fv.foreignNoRate, lang) })) : null,
    mixed ? h("p", { class: "muted", "data-mix": "1" }, t("entry.mixNote", lang)) : null,
    h("h2", {}, t("money.add", lang)), form,
    moneyChart(recs, lang),
    viewBar("money", lang),
    rows.length ? (moneyCompact ? moneyTable : h("div", { "data-view": "full" }, ...rows)) : h("p", { class: "muted" }, t("money.empty", lang)),
    vRows.length ? link("#/diary/ventures", "crumb", t("ven.link", lang)) : null,
    h("p", { class: "muted" }, t("money.note", lang)), disclaimers(lang));
}



// ---- horizon view (R2) ----
function ownHorizonGoals(): HorizonGoal[] {
  return allRecs().filter((r) => r.entity === "goal" && r.values["goal.title"]?.state === "value").map((r) => ({
    id: r.id,
    title: String((r.values["goal.title"] as { value?: unknown }).value ?? ""),
    why: r.values["goal.why"]?.state === "value" ? String((r.values["goal.why"] as { value?: unknown }).value) : undefined,
    horizon: r.values["goal.horizon"]?.state === "value" ? String((r.values["goal.horizon"] as { value?: unknown }).value) : undefined,
  }));
}

export function horizonScreen(): HTMLElement {
  const lang = L();
  const nsById = new Map(allRecs().map((r) => [r.id, r.ns] as const));
  const goals = ownHorizonGoals();
  const g = groupByHorizon(goals);
  const card = (x: HorizonGoal) => h("article", { class: "card", "data-goal": x.id }, nsTag(nsById.get(x.id) ?? "demo", lang), h("strong", {}, x.title),
    x.why ? h("p", { class: "muted" }, `${t("horizon.why", lang)}: ${x.why}`) : null);
  const section = (key: string, list: HorizonGoal[]) => h("section", { "data-horizon": key },
    h("h2", {}, t(`horizon.${key}` as Key, lang)),
    ...(list.length ? list.map(card) : [h("p", { class: "muted" }, t("horizon.empty", lang))]));
  // Template chooser: "stack" = sections (default), "compact" = one line per goal with its horizon label. Same goals, same ids.
  const view = prefs.horizonView;
  const seg = (v: HorizonView) => h("button", { type: "button", "data-view": v, "aria-pressed": String(view === v), onclick: () => { prefs.horizonView = v; rerender(); } }, t(`horizon.view.${v}` as Key, lang));
  const toggle = h("div", { class: "seg", role: "group", "aria-label": t("horizon.view", lang) }, seg("stack"), seg("compact"));
  const line = (x: HorizonGoal, key: string) => h("li", { "data-goal": x.id, "data-line": key },
    h("span", { class: "muted" }, t(`horizon.${key}` as Key, lang)), " · ", h("strong", {}, x.title));
  const body = view === "compact"
    ? h("ul", { class: "horizon-compact", "data-view": "compact" },
      ...HORIZONS.flatMap((k) => g.byHorizon[k].map((x) => line(x, k))),
      ...g.unset.map((x) => line(x, "unset")))
    : h("div", { "data-view": "stack" },
      ...HORIZONS.map((k) => section(k, g.byHorizon[k])),
      g.unset.length ? section("unset", g.unset) : null);
  return h("main", {},
    h("h1", {}, t("horizon.title", lang)),
    horizonArc(goals, lang),
    toggle,
    body);
}

// ---- stages + journey log ----
function stageData() {
  const recs = allRecs();
  const passed = recs.filter((r) => r.entity === "stage_pass").map((r) => String((r.values["stage_pass.stage_code"] as { value?: unknown })?.value ?? ""));
  const goalCount = recs.filter((r) => r.entity === "goal" && r.values["goal.title"]?.state === "value").length;
  return { recs, passed, ctx: { answers: loadAnswers(), goalCount, exits: exitConds() } };
}
const lastProgress = (recs: TMRecord[]) => recs.filter((r) => r.entity === "journey_log").map((r) => Number((r.values["stage_pass.progress_pct"] as { value?: unknown })?.value ?? 0)).pop() ?? 0;

function stagePanel(lang: Locale): HTMLElement {
  const sd = stageData(); const cur = currentIndex(sd.passed);
  if (cur >= STAGE_CODES.length) return h("div", { class: "card" }, h("p", {}, t("stage.alldone", lang)));
  const code = STAGE_CODES[cur] as StageCode; const cs = conditions(sd.ctx, code); const names = stagesFor(prefs.stageTemplate);
  const manual = code !== "A";
  const ev = h("textarea", { id: "st-evidence", rows: "3", maxlength: "300" }) as HTMLTextAreaElement;
  const err = h("p", { class: "err", role: "alert" });
  const autoMet = cs.filter((c) => c.auto).every((c) => c.met);
  const btn = h("button", { class: "btn", type: "button", "data-act": "pass-stage", ...(autoMet ? {} : { disabled: true }) }, t("stage.pass", lang));
  btn.addEventListener("click", () => {
    err.textContent = "";
    if (!checkFreeText(ev.value).ok) { err.textContent = t("intake.secretRejected", lang); return; }
    try {
      const sd2 = stageData(); const rec = passStage(sd2.ctx, sd2.passed, code, ev.value);
      const before = lastProgress(sd2.recs); const d = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" });
      const base = { entity: "", ns: "demo" as const, ownerId: "demo-user", schemaVersion: SCHEMA_VERSION, createdAt: rec.at };
      putMode({ ...base, id: `stagepass-${code}`, entity: "stage_pass", values: { "stage_pass.stage_code": d(code), "stage_pass.evidence": d(rec.evidence || "—"), "stage_pass.progress_pct": d(rec.progressPct) } });
      putMode({ ...base, id: `log-${Date.now().toString(36)}`, entity: "journey_log", values: { "journey_log.entry": d(t("log.entry", lang, { code, before: num(before, lang), after: num(rec.progressPct, lang) })), "stage_pass.progress_pct": d(rec.progressPct) } });
      sessionStorage.setItem("tm:passed", code); rerender();
    } catch (e) { err.textContent = e instanceof StageError ? "" : t("intake.invalidNumber", lang); }
  });
  const left = cs.filter((c) => !c.met && c.auto).length > 0;
  return h("div", { class: "card", "data-stage-panel": code },
    h("h2", { class: "card-h", }, `${t("stage.currentLabel", lang)}: ${code} · ${tb(names[cur]!.name, lang)}`),
    h("p", { class: "muted" }, t("stage.conditions", lang)),
    h("ul", { style: "padding-inline-start:20px" }, ...cs.map((c) => h("li", { "data-cond": c.id, "data-met": String(c.met) }, `${tb(c.text, lang)} — `, h("b", {}, c.auto ? t(c.met ? "stage.met" : "stage.open", lang) : ""))).map((li) => li)),
    left ? h("p", { class: "muted" }, t("stage.leftNote", lang)) : null,
    stageRulesBlock(code, lang),
    manual ? h("div", {}, h("label", { for: "st-evidence" }, t("stage.evidence", lang)), ev) : null, err, btn);
}

function passedBanner(lang: Locale): HTMLElement | null {
  let code: string | null = null;
  try { code = sessionStorage.getItem("tm:passed"); sessionStorage.removeItem("tm:passed"); } catch { /* ignore */ }
  return code ? h("div", { class: "card", role: "status", "data-passed": code }, h("p", { class: "ok-msg" }, t("stage.passedMsg", lang, { code })), h("p", {}, t("reward.stageUnlocked", lang, { code })), link("#/journey/art", "btn ghost", t("reward.see", lang))) : null;
}

export function journeyLog(): HTMLElement { return withView("log", L(), journeyLogInner()); }
function journeyLogInner(): HTMLElement {
  const lang = L(); const logs = allRecs().filter((r) => r.entity === "journey_log").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const passes = allRecs().filter((r) => r.entity === "stage_pass").sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((r) => ({ code: String((r.values["stage_pass.stage_code"] as { value?: unknown } | undefined)?.value ?? ""), note: String((r.values["stage_pass.evidence"] as { value?: unknown } | undefined)?.value ?? "") }));
  const chain = wordChain(passes, 5);
  const learn = h("section", { class: "card", "data-card": "learn_chain" }, h("h2", {}, t("log.learn.h", lang)),
    chain.length ? h("p", { "data-chain": "1" }, chain.join(" → ")) : h("p", { class: "muted" }, t("log.learn.empty", lang)));
  return h("main", {}, link("#/journey", "crumb", `← ${t("journey.title", lang)}`), h("h1", {}, t("log.title", lang)), learn,
    logs.length ? h("div", {}, ...logs.map((r) => h("div", { class: "card", "data-log": r.id }, h("p", { class: "muted" }, valueEl(r.createdAt.slice(0, 10), "DEMO", lang)), h("p", {}, String((r.values["journey_log.entry"] as { value?: unknown })?.value ?? ""))))) : h("p", { class: "muted" }, t("log.empty", lang)),
    disclaimers(lang));
}


// ---- quick capture + report ----
const itemOf = (r: TMRecord): Item => { const g = (k: string) => (r.values[k] as { value?: unknown } | undefined)?.value; return { kind: g("capture_item.kind") as Item["kind"], number: typeof g("capture_item.number") === "number" ? (g("capture_item.number") as number) : undefined, unit: g("capture_item.unit") as string | undefined, text: g("capture_item.text") as string | undefined, date: g("capture_item.date") as string | undefined }; };
const fmtNum = (n: number, lang: Locale) => fmtNumber(n, lang);

export function captureScreen(): HTMLElement {
  const lang = L();
  const ta = h("textarea", { id: "cap-note", rows: "4", maxlength: "500", placeholder: t("capture.placeholder", lang) }) as HTMLTextAreaElement;
  const out = h("div", { role: "status" }); const err = h("p", { class: "err", role: "alert" });
  const stamp = () => Date.now().toString(36);
  const saveAll = (picked: Candidate[], edits: Map<string, string>) => {
    const d = (x: unknown): FieldValue => typed(x); const id = `cap-${stamp()}`;
    const base = { createdAt: new Date().toISOString() };
    if (!saveTyped({ ...base, id, entity: "capture", values: { "capture.note": d(ta.value.trim()) } })) { out.replaceChildren(h("p", { class: "err", role: "alert" }, saveBlockedText(lang))); return; }
    picked.forEach((c, i) => {
      const v: Record<string, FieldValue> = { "capture_item.kind": d(c.kind) };
      const ed = edits.get(c.id);
      if (c.kind === "decision") v["capture_item.text"] = d((ed ?? c.text ?? "").slice(0, 140));
      else if (c.kind === "date") v["capture_item.date"] = d(ed ?? c.date);
      else { const n = ed !== undefined ? Number(ed.replace(/,/g, "")) : c.number; v["capture_item.number"] = Number.isFinite(n) ? d(n) : { state: "unknown" }; if (c.unit) v["capture_item.unit"] = d(c.unit); }
      saveTyped({ ...base, id: `${id}-i${i}`, entity: "capture_item", links: { note: id }, values: v });
    });
    out.replaceChildren(h("p", { class: "ok-msg", "data-saved": "1" }, t("capture.saved", lang))); ta.value = "";
  };
  const understand = h("button", { class: "btn", type: "button", "data-act": "capture-find" }, t("capture.understand", lang));
  understand.addEventListener("click", () => {
    err.className = "err"; err.textContent = ""; const text = ta.value.trim(); if (!text) { showNeed(err, t("capture.empty", lang)); return; }
    if (!checkFreeText(text).ok) { err.textContent = t("intake.secretRejected", lang); return; }
    const cands = extract(text); const edits = new Map<string, string>(); const checks = new Map<string, HTMLInputElement>();
    const rows = cands.map((c) => {
      const cb = h("input", { type: "checkbox", id: `cb-${c.id}`, ...(c.confidence === "high" ? { checked: true } : {}) }) as HTMLInputElement; checks.set(c.id, cb);
      const shown = c.kind === "decision" ? (c.text ?? "") : c.kind === "date" ? (c.date ?? "") : String(c.number ?? "");
      const edit = h("input", { type: "text", value: shown, "data-edit": c.id, "aria-label": t(`capture.kind.${c.kind}` as Key, lang) }) as HTMLInputElement;
      edit.addEventListener("input", () => edits.set(c.id, edit.value));
      return h("div", { class: "card", "data-cand": c.kind }, h("label", { for: `cb-${c.id}`, style: "display:flex;gap:10px;align-items:center;min-height:44px" }, cb,
        h("b", {}, t(`capture.kind.${c.kind}` as Key, lang)), c.unit && c.kind === "amount" ? h("span", { class: "muted" }, c.unit) : null, c.confidence === "low" ? h("span", { class: "tag warn" }, t("capture.confirmLow", lang)) : null), edit);
    });
    const saveSel = h("button", { class: "btn", type: "button", "data-act": "capture-save" }, t("capture.save", lang));
    saveSel.addEventListener("click", () => saveAll(cands.filter((c) => checks.get(c.id)?.checked), edits));
    const saveNote = h("button", { class: "btn ghost", type: "button", "data-act": "capture-note" }, t("capture.saveNote", lang));
    saveNote.addEventListener("click", () => saveAll([], edits));
    out.replaceChildren(cands.length ? h("p", {}, t("capture.found", lang)) : h("p", { class: "muted" }, t("capture.none", lang)), ...rows, ...(cands.length ? [saveSel] : []), saveNote);
  });
  return h("main", {}, link("#/today", "crumb", `← ${t("nav.today", lang)}`), h("h1", {}, t("capture.title", lang)), h("p", { class: "sub" }, t("capture.intro", lang)),
    consentOn() ? null : consentPrompt(lang),
    h("label", { for: "cap-note" }, tb(fieldById("capture.note")!.label, lang)), ta, err, understand, out, fieldHelp(fieldById("capture.note")!, lang), disclaimers(lang));
}

/** The report's cards, in order. The report screen and the print page (Save as PDF) draw the same list. */
function linkFactLine(lang: Locale): HTMLElement | null {
  const st = linkStats(allRecs()); if (!st.steps) return null;
  return h("p", { class: "muted", "data-link-stats": "report" }, t("gl.report.fact", lang, { n: num(st.steps, lang), s: num(st.shared, lang), u: num(st.unlinked, lang) }));
}
export function reportContent(lang: Locale): Array<Node | null> {
  const capRecs = allRecs().filter((r) => r.entity === "capture_item").sort((a, b) => a.id.localeCompare(b.id)); const items = capRecs.map(itemOf); const s = summarize(items);
  const repCompact = screenView("report") === "compact";
  const entryText = (i: Item) => i.text ?? (typeof i.number === "number" ? `${fmtNum(i.number, lang)}${i.unit ? ` ${i.unit}` : ""}` : i.date ?? "");
  const entries = h("ul", { class: "list-compact", "data-entries": "1" }, ...capRecs.map((r, k) => h("li", { "data-item": r.id }, nsTag(r.ns, lang), " ", h("span", { class: "muted" }, t(`capture.kind.${items[k]!.kind}` as Key, lang)), " · ", entryText(items[k]!))));
  const compactBody = h("div", { "data-view": "compact" },
    h("p", {}, s.amountCount ? valueEl(t("report.amountTotal", lang, { n: num(s.amountCount, lang), v: t("money.bdt", lang, { v: fmtNum(s.amountTotal, lang) }) }), "ESTIMATE", lang) : t("report.empty", lang)),
    h("h2", { class: "card-h" }, t("report.entries", lang)), entries);
  const sec = (title: Key, ...kids: Array<Node | string | null>) => h("div", { class: "card" }, h("h2", { class: "card-h", }, t(title, lang)), ...kids);
  return [
    goalRingsChart(allRecs(), lang), linkFactLine(lang),
    kpiSection("week", lang), kpiSection("days90", lang),
    portfolioCard(lang, "report"),
    northStarCard(lang, "report"),
    teamCard(lang, "report"),
    riskDueCard(lang, "report"),
    gateReportCard(lang),
    healthCard(lang, "report"),
    deenReportCard(lang),
    realityReportCard(lang),
    items.length && repCompact ? compactBody : items.length ? h("div", { "data-view": "full" },
      sec("report.decisions", s.decisions.length ? h("ul", { style: "padding-inline-start:20px" }, ...s.decisions.map((x) => h("li", { "data-decision": "1" }, x))) : h("p", { class: "muted" }, t("report.empty", lang))),
      sec("report.amounts", s.amountCount ? valueEl(t("report.amountTotal", lang, { n: num(s.amountCount, lang), v: t("money.bdt", lang, { v: fmtNum(s.amountTotal, lang) }) }), "ESTIMATE", lang) : h("p", { class: "muted" }, t("report.empty", lang))),
      sec("report.durations", s.durationMinutes ? valueEl(t("report.minutes", lang, { m: fmtNum(s.durationMinutes, lang) }), "INFERENCE", lang) : h("p", { class: "muted" }, t("report.empty", lang))),
      sec("report.dates", s.dates.length ? h("div", {}, ...s.dates.map((d) => h("p", {}, valueEl(d, "DEMO", lang)))) : h("p", { class: "muted" }, t("report.empty", lang))),
      sec("report.entries", entries)) : h("p", { class: "muted" }, t("report.empty", lang)),
  ];
}

export function reportScreen(): HTMLElement {
  const lang = L();
  return h("main", {}, link("#/journey", "crumb", `← ${t("journey.title", lang)}`), h("h1", {}, t("report.title", lang)), h("p", { class: "sub" }, t("report.intro", lang)),
    viewBar("report", lang), printLink("report", lang), ...reportContent(lang), disclaimers(lang));
}


// ---- "I'm stuck" ----
export function stuckScreen(): HTMLElement {
  const lang = L(); const ans: Record<string, Answer> = {};
  const out = h("div", { role: "status" });
  const rows = QUESTIONS.map((q) => {
    const set = (a: Answer) => { ans[q.id] = a; row.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute("data-a") === a))); };
    const mk = (a: Answer, label: string) => h("button", { type: "button", "data-a": a, "aria-pressed": "false", onclick: () => set(a) }, label);
    const row = h("div", { class: "field", "data-q": q.id }, h("p", {}, tb(q.text, lang)), h("div", { class: "seg" }, mk("yes", t("stuck.yes", lang)), mk("no", t("stuck.no", lang)), mk("unknown", t("unknown.unknown", lang))));
    return row;
  });
  const log = (d: ReturnType<typeof diagnose>, helper: Helper) => putMode({ id: `stuck-${Date.now().toString(36)}`, entity: "stuck_log", ns: "demo", ownerId: "demo-user", schemaVersion: SCHEMA_VERSION, createdAt: new Date().toISOString(),
    values: { "stuck_log.causes": { state: "value", value: d.causes.join(",") || "none", label: "DEMO" }, "stuck_log.action": { state: "value", value: helper, label: "DEMO" } } });
  const show = h("button", { class: "btn", type: "button", "data-act": "stuck-show" }, t("stuck.show", lang));
  show.addEventListener("click", () => {
    const d = diagnose(ans);
    const helperBtns = d.helpers.map((hp) => {
      if (hp === "tiny_step") {
        const name = h("input", { type: "text", maxlength: "80", id: "stuck-step", "aria-label": t("stuck.stepName", lang) }) as HTMLInputElement;
        const add = h("button", { class: "btn", type: "button", "data-helper": hp }, t("stuck.stepAdd", lang));
        const msg = h("p", { class: "err", role: "alert" });
        add.addEventListener("click", () => {
          const nm = name.value.trim(); if (!nm) return; if (!checkFreeText(nm).ok) { msg.textContent = t("intake.secretRejected", lang); return; }
          putMode({ id: `task-${Date.now().toString(36)}s`, entity: "task", ns: "demo", ownerId: "demo-user", schemaVersion: SCHEMA_VERSION, createdAt: new Date().toISOString(),
            values: { "task.title": { state: "value", value: nm, label: "DEMO" }, "task.minutes": { state: "value", value: 5, label: "DEMO" }, "task.priority": { state: "value", value: "high", label: "DEMO" } } });
          log(d, hp); out.replaceChildren(h("p", { class: "ok-msg", "data-done": hp }, t("stuck.done.tiny_step", lang)), recoveryLine(lang), link("#/diary/plan", "btn ghost", t("plan.title", lang)));
        });
        return h("div", { class: "card" }, h("h2", { class: "card-h", }, t("stuck.h.tiny_step", lang)), h("label", { for: "stuck-step" }, t("stuck.stepName", lang)), name, concreteBank(lang, name), msg, add);
      }
      const b = h("button", { class: "btn", type: "button", "data-helper": hp }, t(`stuck.h.${hp}` as Key, lang));
      b.addEventListener("click", () => { prefs.mode = hp; log(d, hp); out.replaceChildren(h("p", { class: "ok-msg", "data-done": hp }, t(`stuck.done.${hp}` as Key, lang)), h("p", { class: "muted", "data-stuck-back": "1" }, t("plan.set.back", lang), " ", link(settingsHash("plan", "planmode"), "crumb", t("plan.set.change", lang))), recoveryLine(lang), link("#/diary/plan", "btn ghost", t("plan.title", lang))); });
      return h("div", { class: "card" }, b);
    });
    out.replaceChildren(h("h2", {}, t("stuck.causes", lang)),
      d.causes.length ? h("ul", { style: "padding-inline-start:20px" }, ...d.causes.map((c) => h("li", { "data-cause": c }, tb(CAUSE_TEXT[c], lang)))) : h("p", { class: "muted" }, t("stuck.noCause", lang)),
      ...(d.unansweredCount ? [h("p", { class: "muted" }, t("stuck.unanswered", lang, { n: num(d.unansweredCount, lang) }))] : []),
      h("h2", {}, t("stuck.helpers", lang)), ...helperBtns);
  });
  return h("main", { class: "scr scr-stuck" }, link("#/today", "crumb", `← ${t("nav.today", lang)}`), h("h1", {}, t("stuck.title", lang)), h("p", { class: "sub" }, t("stuck.intro", lang)), ...rows, show, out, ...reflectionCards(lang), disclaimers(lang, ["noGuarantee"]));
}

// Calm, static reflection cards (ROADMAP B7/B8). Plain text only: no colour cue, nothing counted or ordered.
function reflectionCards(lang: Locale): HTMLElement[] {
  return [
    h("section", { class: "card", "data-card": "two_paths" }, h("h2", {}, t("stuck.two.h", lang)), forkPicture(lang),
      h("ul", { style: "padding-inline-start:20px" }, h("li", {}, t("stuck.two.fun", lang)), h("li", {}, t("stuck.two.struggle", lang))),
      h("p", { class: "muted" }, t("stuck.two.note", lang))),
    h("section", { class: "card", "data-card": "effort_timing" }, h("h2", {}, t("stuck.timing.h", lang)), h("p", {}, t("stuck.timing.body", lang)), ...effortTip(lang)),
    h("section", { class: "card", "data-card": "where_time_goes" }, h("h2", {}, t("stuck.time.h", lang)), timeBands(lang),
      h("ul", { style: "padding-inline-start:20px" }, h("li", {}, t("stuck.time.1", lang)), h("li", {}, t("stuck.time.2", lang)), h("li", {}, t("stuck.time.3", lang))),
      h("p", { class: "muted" }, t("stuck.time.note", lang))),
  ];
}


// ---- topics (library) ----
function tipCard(tp: Tip, lang: Locale): HTMLElement {
  return h("div", { class: "card", "data-tip": tp.id },
    tp.kind ? h("p", { class: "muted", "data-kind": tp.kind }, t(`topics.kind.${tp.kind}` as Key, lang)) : null,
    h("div", { class: "row" }, h("h2", { class: "card-h", }, tb(tp.title, lang)), h("span", { class: "tag warn" }, t("topics.draft", lang))),
    h("p", {}, tb(tp.how, lang)), tp.source ? h("p", { class: "muted", "data-source": tp.source }, t(`topics.src.${tp.source}` as Key, lang)) : null, diagram(tp, lang),
    tp.appLink ? link(tp.appLink, "btn ghost", t("topics.tryIt", lang)) : null);
}

export function topicsIndex(): HTMLElement {
  const lang = L();
  return h("main", {}, link("#/settings/about", "crumb", `← ${t("set.cat.about", lang)}`), h("h1", {}, t("topics.title", lang)), h("p", { class: "sub" }, t("topics.intro", lang)),
    ...(Object.keys(LAYERS) as (keyof typeof LAYERS)[]).flatMap((ly) => [h("h2", {}, tb(LAYERS[ly], lang)), ...TOPICS.filter((x) => x.layer === ly).map((x) => link(`#/topic/${x.id}`, "card link", h("h2", { class: "card-h", }, tb(x.name, lang)), h("p", { class: "muted" }, `${num(tipsFor(x.id).length, lang)} ${t("topics.tips", lang)}`)))]),
    disclaimers(lang));
}

export function topicScreen(id: string | undefined): HTMLElement {
  const lang = L(); const tp = id ? topicById(id) : undefined;
  if (!tp) return topicsIndex();
  const mine = tipsFor(tp.id); const rel = relatedTips(tp.id);
  return h("main", {}, link("#/topics", "crumb", `← ${t("topics.title", lang)}`), h("h1", {}, tb(tp.name, lang)),
    tp.sensitive ? h("div", { class: "note", role: "note", "data-safety": tp.sensitive }, h("p", {}, t(`topics.safety.${tp.sensitive}` as Key, lang))) : null,
    tp.appLink ? link(tp.appLink, "btn", t("topics.tryIt", lang)) : null,
    h("h2", {}, t("topics.tips", lang)), ...(mine.length ? mine.map((x) => tipCard(x, lang)) : [h("p", { class: "muted" }, t("topics.empty", lang))]),
    ...(rel.length ? [h("h2", {}, t("topics.related", lang)), ...rel.map((x) => tipCard(x, lang))] : []), disclaimers(lang));
}


// ---- finishing tasks + the journey picture ----
const completedCount = () => allRecs().filter((r) => r.entity === "task" && r.values["task.done_on"]?.state === "value").length;
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
function markDone(taskId: string) {
  const r = findRec(taskId); if (!r || r.values["task.done_on"]?.state === "value") return;
  storeOf(r).put({ ...r, values: { ...r.values, "task.done_on": { state: "value", value: todayIso(), label: labelFor(r.ns) } } });
  try { sessionStorage.setItem("tm:newStar", "1"); } catch { /* ignore */ }
  const was = location.hash; location.hash = "#/reward"; if (was === "#/reward") rerender(); // a changed hash re-renders by itself; a second render would eat the one-time "new star" flag
}
const doneBtn = (taskId: string, lang: Locale) => h("button", { class: "btn ghost btn-sm", type: "button", "data-act": "task-done", "data-task-id": taskId, onclick: () => markDone(taskId) }, t("reward.doneBtn", lang));

function pictureBlock(lang: Locale, opts: { newest?: boolean; milestone?: boolean } = {}): HTMLElement {
  const n = completedCount(); const k = Math.min(stageData().passed.length, 8);
  return h("div", {}, h("div", { class: "reward", "data-reward": "1" }, journeyArt(n, k, opts)),
    h("p", { class: "muted", "data-reward-text": "1" }, n ? t("reward.completed", lang, { n: num(n, lang), k: num(k, lang) }) : t("reward.empty", lang)), h("p", { class: "muted" }, t("reward.next", lang)));
}

/** Overall progress ring on the "step done" card. Same sentence as the overall card; nothing when no percent is known. */
function rewardRing(lang: Locale): HTMLElement | null {
  const o = overallProgress(allRecs(), prefs.progressMode); if (o.percent === null) return null;
  const text = t("overall.text", lang, { p: num(o.percent, lang), d: num(o.done, lang), n: num(o.total, lang), how: t(prefs.progressMode === "size" ? "overall.how.size" : "overall.how.equal", lang) });
  return h("div", { class: "pr-row", "data-reward-ring": String(o.percent) }, progressRing(o.percent, text, isMilestone(o.percent)), h("p", {}, text));
}

export function rewardScreen(): HTMLElement {
  const lang = L(); let fresh = false; try { fresh = sessionStorage.getItem("tm:newStar") === "1"; sessionStorage.removeItem("tm:newStar"); } catch { /* ignore */ }
  const n = completedCount(); const ms = fresh ? milestoneAt(n) : null;
  return h("main", { class: "scr scr-reward" }, h("div", { class: "logo-row" }, logo3d(48, lang), h("h1", {}, t("reward.title", lang))),
    fresh && n ? h("div", { class: "card", role: "status", "data-fresh": "1" }, celebrate("step", lang), ms ? h("h2", { class: "card-h",  "data-milestone": String(ms) }, t(`reward.ms${ms}` as Key, lang)) : null, h("p", { class: "ok-msg" }, t(`reward.m${messageIndex(n, 6)}` as Key, lang)), rewardRing(lang)) : null,
    pictureBlock(lang, { newest: fresh && n > 0, milestone: !!ms }), link("#/today", "cta", t("reward.back", lang)), disclaimers(lang, ["noGuarantee"]));
}

export function artScreen(): HTMLElement {
  const lang = L();
  return h("main", { class: "scr scr-reward" }, link("#/journey", "crumb", `← ${t("journey.title", lang)}`), h("h1", {}, t("reward.title", lang)), pictureBlock(lang), disclaimers(lang, ["noGuarantee"]));
}


// ---- focus timer ----
const FOCUS_KEY = "tm:ui:focus";
type Saved = { taskId: string; session: Focus.Session } | null;
const loadFocus = (): Saved => { try { return JSON.parse(localStorage.getItem(FOCUS_KEY) ?? "null") as Saved; } catch { return null; } };
const saveFocus = (v: Saved) => { try { if (v) localStorage.setItem(FOCUS_KEY, JSON.stringify(v)); else localStorage.removeItem(FOCUS_KEY); } catch { /* ignore */ } };
const focusMinutesOf = (taskId: string) => allRecs().filter((r) => r.entity === "focus_session" && r.links?.task === taskId).reduce((a, r) => a + Number((r.values["focus_session.minutes"] as { value?: unknown })?.value ?? 0), 0);
function recordFocus(taskId: string, minutes: number) {
  if (minutes < 1) return;
  // a focus session belongs to its task's namespace: real task, real session
  const ns = findRec(taskId)?.ns ?? activeNs(); const lb = labelFor(ns);
  store[ns].put({ id: `fs-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`, entity: "focus_session", ns, ownerId: ownerOf(ns), schemaVersion: SCHEMA_VERSION, createdAt: new Date().toISOString(), links: { task: taskId },
    values: { "focus_session.minutes": { state: "value", value: minutes, label: lb }, "focus_session.date": { state: "value", value: todayIso(), label: lb } } });
}

export function focusScreen(taskId: string | undefined): HTMLElement {
  const lang = L(); const task = taskId ? findRec(taskId) : null;
  if (!task || task.entity !== "task") return h("main", {}, link("#/today", "crumb", `← ${t("nav.today", lang)}`), h("h1", {}, t("focus.title", lang)), h("p", { class: "muted" }, t("focus.none", lang)));
  const title = String((task.values["task.title"] as { value?: unknown })?.value ?? "");
  const root = h("main", { id: "focus-root", "data-task": task.id, class: "scr scr-focus" });
  const total = h("p", { class: "muted", "data-focus-total": "1" });
  const body = h("div", {});
  let timer: ReturnType<typeof setInterval> | null = null;
  const stopTimer = () => { if (timer) { clearInterval(timer); timer = null; } };
  const refreshTotal = () => { total.replaceChildren(valueEl(t("focus.total", lang, { m: num(focusMinutesOf(task.id), lang) }), "INFERENCE", lang)); };
  const picker = () => {
    stopTimer(); saveFocus(null); refreshTotal();
    body.replaceChildren(h("h2", {}, t("focus.pick", lang)), h("div", { class: "seg" }, ...Focus.PRESETS.map((m) => h("button", { type: "button", "data-preset": String(m), onclick: () => begin("focus", m) }, t("focus.min", lang, { n: num(m, lang) })))));
  };
  const finish = (s: Focus.Session) => {
    stopTimer(); saveFocus(null);
    if (s.phase === "focus") { recordFocus(task.id, s.minutes); prefs.lastFocusEnd = { at: Date.now(), minutes: s.minutes }; } else prefs.lastRestAt = Date.now();
    refreshTotal();
    body.replaceChildren(h("p", { class: "ok-msg", role: "status", "data-focus-finished": s.phase }, t("focus.finished", lang)),
      ...(s.phase === "focus" ? [h("button", { class: "btn", type: "button", "data-act": "focus-done", onclick: () => markDone(task.id) }, t("focus.markDone", lang)), h("button", { class: "btn ghost", type: "button", onclick: () => begin("rest", Focus.REST_MINUTES) }, t("focus.rest", lang)), h("button", { class: "btn ghost", type: "button", onclick: picker }, t("focus.again", lang))]
        : [h("button", { class: "btn", type: "button", onclick: picker }, t("focus.again", lang)), link("#/today", "btn ghost", t("focus.backToday", lang))]));
  };
  const run = (initial: Focus.Session) => {
    let s = initial; saveFocus({ taskId: task.id, session: s });
    const time = h("div", { class: "n", "data-focus-time": "1", role: "timer" }, ""); const ring = h("div", { class: "bar", role: "img", "aria-label": t("focus.title", lang) }, h("i", { style: "width:0%" }));
    const pauseBtn = h("button", { class: "btn", type: "button", "data-act": "focus-pause" }, t("focus.pause", lang));
    const draw = () => { const now = Date.now(); time.textContent = Focus.fmt(Focus.remainingMs(s, now)); (ring.firstChild as HTMLElement).style.width = `${Math.round((Focus.elapsedMs(s, now) / (s.minutes * 60_000)) * 100)}%`; pauseBtn.textContent = t(s.pausedAt === null ? "focus.pause" : "focus.resume", lang); };
    pauseBtn.addEventListener("click", () => { s = s.pausedAt === null ? Focus.pause(s, Date.now()) : Focus.resume(s, Date.now()); saveFocus({ taskId: task.id, session: s }); draw(); });
    const adj = (d: number) => h("button", { class: "btn ghost btn-sm", type: "button", "data-adj": String(d), onclick: () => { s = Focus.adjust(s, d, Date.now()); saveFocus({ taskId: task.id, session: s }); draw(); } }, t(d > 0 ? "focus.plus" : "focus.minus", lang));
    const stop = h("button", { class: "btn ghost", type: "button", "data-act": "focus-stop" }, t("focus.stop", lang));
    stop.addEventListener("click", () => { const m = Focus.focusedMinutes(s, Date.now()); stopTimer(); saveFocus(null); if (s.phase === "focus") { recordFocus(task.id, m); if (m >= 1) prefs.lastFocusEnd = { at: Date.now(), minutes: m }; } else prefs.lastRestAt = Date.now(); refreshTotal(); body.replaceChildren(h("p", { class: "ok-msg", role: "status", "data-focus-stopped": "1" }, t("focus.stopped", lang, { m: num(m, lang) })), h("button", { class: "btn", type: "button", onclick: picker }, t("focus.again", lang))); });
    body.replaceChildren(h("h2", {}, t(s.phase === "focus" ? "focus.title" : "focus.restOn", lang)), h("div", { class: "stage" }, time, ring), h("div", { class: "row" }, adj(-5), adj(5)), pauseBtn, stop);
    draw(); stopTimer();
    timer = setInterval(() => { if (!document.getElementById("focus-root")) { stopTimer(); return; } if (Focus.isFinished(s, Date.now())) finish(s); else draw(); }, 1000);
  };
  const begin = (phase: Focus.Phase, minutes: number) => run(Focus.start(phase, minutes, Date.now()));
  root.append(link("#/today", "crumb", `← ${t("nav.today", lang)}`), h("h1", {}, t("focus.title", lang)), h("p", { class: "sub" }, title), h("p", { class: "muted" }, t("focus.intro", lang)), h("p", { class: "note", "data-focus-tip": "1" }, t("focus.tip", lang)), total, body, ...[disclaimers(lang, ["noGuarantee"])].filter((x): x is HTMLElement => !!x));
  const saved = loadFocus();
  if (saved && saved.taskId === task.id) { if (Focus.isFinished(saved.session, Date.now())) finish(saved.session); else run(saved.session); } else picker();
  return root;
}
const focusBtn = (taskId: string, lang: Locale) => link(`#/focus/${taskId}`, "btn ghost", t("focus.link", lang));

// ---- habits ----
/** Chips for the goals a habit helps, and a small sheet to change them. A habit is traced to goals, never counted in a percent. */
function habitGoalsRow(id: string, lang: Locale): HTMLElement {
  const r = findRec(id); if (!r) return h("span", {});
  const pick = goalPicker(allRecs(), goalIdsOf(r), lang, `habit-${id}`); const ok = h("p", { class: "ok-msg", role: "status" });
  return h("div", { "data-habit-goals": id }, goalChips(r, lang) ?? "", h("details", { class: "help" }, h("summary", {}, t("gl.habit.goals", lang)), pick.el,
    h("button", { class: "btn ghost btn-sm", type: "button", "data-act": "habit-goals-save", onclick: () => { saveGoalLinks(id, pick.ids()); ok.textContent = t("gl.habit.saved", lang); rerender(); } }, t("gl.habit.save", lang)), ok));
}
function habitsFromStore() {
  const recs = allRecs(); const g = (r: TMRecord, k: string) => (r.values[k] as { value?: unknown } | undefined)?.value;
  const habits: Habits.Habit[] = recs.filter((r) => r.entity === "habit" && r.values["habit.title"]?.state === "value").sort((a, b) => a.id.localeCompare(b.id)).map((r) => ({
    id: r.id, title: String(g(r, "habit.title")), days: String(g(r, "habit.days") ?? "0,1,2,3,4,5,6").split(",").filter((x) => x !== "").map(Number),
    target: typeof g(r, "habit.target") === "number" && (g(r, "habit.target") as number) > 0 ? (g(r, "habit.target") as number) : null, unit: String(g(r, "habit.unit") ?? "") }));
  const logs: Habits.Log[] = recs.filter((r) => r.entity === "habit_log").map((r) => ({ habitId: r.links?.habit ?? "", date: String(g(r, "habit_log.date")), count: Number(g(r, "habit_log.count") ?? 0) }));
  return { habits, logs };
}
// A habit's log lives in the same namespace as its habit (real habit, real log).
function setLog(h0: Habits.Habit, date: string, count: number) {
  const id = `hl-${h0.id}-${date}`;
  const ns = findRec(h0.id)?.ns ?? activeNs(); const lb = labelFor(ns);
  if (count <= 0) { store[ns].delete(id); return; }
  if (ns === "real" && !consentOn()) return;
  store[ns].put({ id, entity: "habit_log", ns, ownerId: ownerOf(ns), schemaVersion: SCHEMA_VERSION, createdAt: new Date().toISOString(), links: { habit: h0.id },
    values: { "habit_log.date": { state: "value", value: date, label: lb }, "habit_log.count": { state: "value", value: count, label: lb } } });
}
function removeHabit(id: string) {
  const hr = findRec(id); if (hr) storeOf(hr).delete(id);
  for (const r of allRecs()) if (r.entity === "habit_log" && r.links?.habit === id) storeOf(r).delete(r.id);
}

function gridRange(): GridRange { return prefs.habitGrid; }
function setGridRange(r: GridRange) { prefs.habitGrid = r; }

export function habitsScreen(): HTMLElement {
  const lang = L(); const { habits, logs } = habitsFromStore(); const today = Habits.todayIso();
  const wd = (i: number) => new Intl.DateTimeFormat(intlLocale(lang), { weekday: "short" }).format(new Date(2023, 0, 1 + i));
  const habitCompact = screenView("habits") === "compact";
  // planned days a week: the number saved with the habit, or the count of chosen days for older habits
  const perWeek = (hb: Habits.Habit): number => { const v = findRec(hb.id)?.values["habit.days_per_week"]; return v?.state === "value" && typeof v.value === "number" ? v.value : new Set(hb.days).size; };
  const cards = habits.map((hb) => {
    const done = Habits.isDone(hb, logs, today); const cnt = Habits.countOn(hb, logs, today);
    const main = hb.target === null
      ? h("button", { class: done ? "btn" : "btn ghost", type: "button", "data-act": "habit-tick", "data-habit": hb.id, "aria-pressed": String(done), onclick: () => { setLog(hb, today, done ? 0 : 1); rerender(); } }, `${done ? "✓ " : ""}${t("habits.tick", lang)}`)
      : h("button", { class: done ? "btn" : "btn ghost", type: "button", "data-act": "habit-plus", "data-habit": hb.id, onclick: () => { setLog(hb, today, cnt + 1); rerender(); } }, `${t("habits.plus", lang)} · ${t("habits.of", lang, { c: num(cnt, lang), t: num(hb.target!, lang), u: hb.unit })}`);
    const dots = h("div", { class: "seg", role: "group", "aria-label": t("habits.dots", lang) }, ...Array.from({ length: 7 }, (_, i) => Habits.addDays(today, i - 6)).map((d) => {
      const planned = Habits.isPlanned(hb, d), dn = Habits.isDone(hb, logs, d);
      return h("button", { type: "button", "data-day": d, "data-done": String(dn), "aria-pressed": String(dn), ...(planned ? {} : { style: "opacity:.45" }), "aria-label": `${d} ${dn ? "✓" : ""}`, onclick: () => { setLog(hb, d, dn ? 0 : (hb.target ?? 1)); rerender(); } }, `${wd(Habits.parseIso(d).getDay())} ${dn ? "●" : "○"}`);
    }));
    const c = Habits.consistency(hb, logs, Habits.addDays(today, -27), today, today);
    if (habitCompact) return h("li", { "data-habit-card": hb.id }, nsTag(findRec(hb.id)?.ns ?? activeNs(), lang), " ", h("strong", {}, hb.title), " ", main,
      h("span", { class: "muted", "data-consistency": "1" }, c.planned ? valueEl(t("habits.month", lang, { d: num(c.done, lang), p: num(c.planned, lang) }), "INFERENCE", lang) : t("habits.noPlanned", lang)));
    return h("div", { class: "card", "data-habit-card": hb.id },
      h("div", { class: "row" }, h("div", {}, nsTag(findRec(hb.id)?.ns ?? activeNs(), lang), h("h2", { class: "card-h", }, hb.title)), h("button", { class: "btn ghost btn-sm", type: "button", onclick: () => { removeHabit(hb.id); rerender(); } }, t("habits.remove", lang))),
      main, dots, habitChart(hb, logs, today, lang), habitGoalsRow(hb.id, lang), remindRow("habit", hb.id, lang),
      h("p", { class: "muted", "data-per-week": String(perWeek(hb)) }, t("habits.perWeek", lang, { n: num(perWeek(hb), lang) })),
      h("p", { class: "muted", "data-consistency": "1" }, c.planned ? valueEl(t("habits.month", lang, { d: num(c.done, lang), p: num(c.planned, lang) }), "INFERENCE", lang) : t("habits.noPlanned", lang)),
      Habits.restartPlan(hb, logs, today) === "smallest_version" ? h("p", { class: "note", "data-restart": "1" }, t("habits.restart", lang)) : null);
  });
  // add form
  const name = h("input", { id: "hb-name", type: "text", maxlength: "80", autocomplete: "off" }) as HTMLInputElement;
  const chosen = new Set<number>([0, 1, 2, 3, 4, 5, 6]);
  const chips = h("div", { class: "seg", role: "group" }, ...Array.from({ length: 7 }, (_, i) => h("button", { type: "button", "data-wd": String(i), "aria-pressed": "true", onclick: (e: Event) => { const b = e.currentTarget as HTMLElement; if (chosen.has(i)) chosen.delete(i); else chosen.add(i); b.setAttribute("aria-pressed", String(chosen.has(i))); } }, wd(i))));
  const target = h("input", { id: "hb-target", type: "text", inputmode: "numeric" }) as HTMLInputElement; const unit = h("input", { id: "hb-unit", type: "text", maxlength: "20" }) as HTMLInputElement;
  const err = h("p", { class: "err", role: "alert" });
  const gate = consentOn() ? null : consentPrompt(lang);
  const hbPick = goalPicker(allRecs(), [], lang, "habit-new");
  const form = h("form", { novalidate: true, "data-form": "habit" }, gate, h("label", { for: "hb-name" }, t("habits.name", lang)), name, h("label", {}, t("habits.days", lang)), chips,
    h("label", { for: "hb-target" }, t("habits.target", lang)), target, h("label", { for: "hb-unit" }, t("habits.unit", lang)), unit, h("p", {}, h("strong", {}, t("gl.habit.goals", lang))), hbPick.el, err, h("button", { class: "btn", type: "submit" }, t("habits.save", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault(); err.textContent = ""; const nm = name.value.trim(); if (!nm) return;
    if (!checkFreeText(nm).ok || !checkFreeText(unit.value).ok) { err.textContent = t("intake.secretRejected", lang); return; }
    const raw = target.value.trim().replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6)); let tv: FieldValue | null = null;
    if (raw !== "") { const n = Number(raw); if (!Number.isFinite(n) || n <= 0 || n > 1000) { err.textContent = t("intake.invalidNumber", lang); return; } tv = typed(Math.round(n)); }
    const habitId = `habit-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
    if (!saveTyped({ id: habitId, entity: "habit", createdAt: new Date().toISOString(),
      values: { "habit.title": typed(nm), "habit.days": typed([...chosen].sort().join(",")), "habit.days_per_week": typed(chosen.size), ...(tv ? { "habit.target": tv, "habit.unit": typed(unit.value.trim()) } : {}) } })) { err.textContent = saveBlockedText(lang); return; }
    saveGoalLinks(habitId, hbPick.ids());
    rerender();
  });
  return h("main", {}, link("#/today", "crumb", `← ${t("nav.today", lang)}`), h("h1", {}, t("habits.title", lang)), h("p", { class: "sub" }, t("habits.intro", lang)),
    viewBar("habits", lang),
    habitGridTracker(habits, logs, new Map(allRecs().filter((r) => r.entity === "habit").map((r) => [r.id, Number.isFinite(Date.parse(r.createdAt)) ? Habits.todayIso(new Date(r.createdAt)) : null] as const)), today, gridRange(), (r) => { setGridRange(r); rerender(); }, lang),
    ...(cards.length ? (habitCompact ? [h("ul", { class: "list-compact", "data-view": "compact" }, ...cards)] : cards) : [h("p", { class: "muted" }, t("habits.empty", lang))]), h("p", { class: "muted" }, t("habits.tip", lang)), h("h2", {}, t("habits.add", lang)), form, disclaimers(lang, ["noGuarantee"]));
}

// ---- flashcards ----
function cardsFromStore(): Cards.Card[] {
  const g = (r: TMRecord, k: string) => (r.values[k] as { value?: unknown } | undefined)?.value;
  return allRecs().filter((r) => r.entity === "card" && r.values["card.front"]?.state === "value").sort((a, b) => a.id.localeCompare(b.id))
    .map((r) => ({ id: r.id, front: String(g(r, "card.front")), back: String(g(r, "card.back") ?? ""), box: Number(g(r, "card.box") ?? 1), due: String(g(r, "card.due") ?? Habits.todayIso()) }));
}
/** Saves a card in the active mode (DEMO or FACT). False, and nothing saved, while real mode has no consent tick. */
const putCard = (c: Cards.Card): boolean => saveTyped({ id: c.id, entity: "card", createdAt: new Date().toISOString(),
  values: { "card.front": typed(c.front), "card.back": typed(c.back), "card.box": typed(c.box), "card.due": typed(c.due) } });

export function cardsScreen(): HTMLElement { return withView("cards", L(), cardsScreenInner()); }
function cardsScreenInner(): HTMLElement {
  const lang = L(); const today = Habits.todayIso(); const all = cardsFromStore(); const queue = Cards.dueCards(all, today);
  const study = h("div", { role: "status" });
  const showCard = (i: number) => {
    if (i >= queue.length) { study.replaceChildren(h("p", { class: "ok-msg", "data-cards-done": "1" }, t("cards.done", lang))); return; }
    const c = queue[i]!; const ans = h("div", { class: "card", hidden: true, "data-answer": "1" }, h("p", {}, c.back));
    const reveal = h("button", { class: "btn", type: "button", "data-act": "card-show" }, t("cards.show", lang));
    const grade = (knew: boolean) => h("button", { class: knew ? "btn" : "btn ghost", type: "button", "data-act": knew ? "card-knew" : "card-not", onclick: () => { if (!putCard(Cards.review(c, knew, today))) { study.replaceChildren(h("p", { class: "err", role: "alert" }, saveBlockedText(lang))); return; } showCard(i + 1); } }, t(knew ? "cards.knew" : "cards.notyet", lang));
    const row = h("div", { hidden: true, "data-grade": "1" }, grade(true), grade(false));
    reveal.addEventListener("click", () => { ans.hidden = false; row.hidden = false; reveal.hidden = true; });
    study.replaceChildren(h("div", { class: "card", "data-card-front": c.id }, h("h2", { class: "card-h", }, c.front)), ans, reveal, row);
  };
  const go = h("button", { class: "btn", type: "button", "data-act": "cards-study", onclick: () => showCard(0) }, t("cards.study", lang));
  const front = h("input", { id: "cd-front", type: "text", maxlength: "120", autocomplete: "off" }) as HTMLInputElement; const back = h("input", { id: "cd-back", type: "text", maxlength: "200", autocomplete: "off" }) as HTMLInputElement;
  const err = h("p", { class: "err", role: "alert" });
  const form = h("form", { novalidate: true, "data-form": "card" }, consentOn() ? null : consentPrompt(lang), h("label", { for: "cd-front" }, t("cards.front", lang)), front, h("label", { for: "cd-back" }, t("cards.back", lang)), back, err, h("button", { class: "btn", type: "submit" }, t("cards.save", lang)));
  form.addEventListener("submit", (ev) => { ev.preventDefault(); err.textContent = ""; const f1 = front.value.trim(), b1 = back.value.trim(); if (!f1 || !b1) return;
    if (!checkFreeText(f1).ok || !checkFreeText(b1).ok) { err.textContent = t("intake.secretRejected", lang); return; }
    if (!putCard(Cards.newCard(`card-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`, f1, b1, today))) { err.textContent = saveBlockedText(lang); return; }
    rerender(); });
  const boxes = Cards.byBox(all);
  return h("main", {}, link("#/topics", "crumb", `← ${t("topics.title", lang)}`), h("h1", {}, t("cards.title", lang)), h("p", { class: "sub" }, t("cards.intro", lang)),
    all.length ? h("div", {}, h("p", { "data-cards-due": String(queue.length) }, valueEl(queue.length ? t("cards.due", lang, { n: num(queue.length, lang) }) : t("cards.none", lang), "INFERENCE", lang)), ...(queue.length ? [go] : []), study,
      h("h2", { class: "card-h", }, t("cards.boxes", lang)), h("div", { class: "seg", role: "img", "aria-label": boxes.join(", ") }, ...boxes.map((n, i) => h("span", { class: "tag" }, `${num(i + 1, lang)}: ${num(n, lang)}`)))) : h("p", { class: "muted" }, t("cards.empty", lang)),
    h("h2", {}, t("cards.add", lang)), form, ...all.map((c) => h("div", { class: "card", "data-card": c.id }, h("div", { class: "row" }, h("span", {}, nsTag(activeNs(), lang), " ", c.front), h("button", { class: "btn ghost btn-sm", type: "button", onclick: () => { store[activeNs()].delete(c.id); rerender(); } }, t("cards.remove", lang))))), disclaimers(lang));
}

// ---- screens ----
const todayChips = (id: string, lang: Locale): HTMLElement | null => { const r = findRec(id); return r ? goalChips(r, lang, allRecs(), { fullTitles: true }) : null; };
function todayFromPlan(cp: ReturnType<typeof currentPlan>, lang: Locale, selectedTask: string | null = null): HTMLElement[] {
  const acts = todaysActions(cp.plan, new Date().getDay());
  if (!acts.length) return [h("p", { class: "muted", "data-today": "none" }, t("home.today.none", lang), " ", link("#/diary/plan", "crumb", t("home.today.open", lang)))];
  const attrs = (id: string) => ({ "data-placement": id, ...(id === selectedTask ? { "data-next-action": "do_task", "data-recommended-task": id, class: "action-desk-recommended" } : {}) });
  if (screenView("today") === "compact") return [h("ul", { class: "list-compact", "data-view": "compact" }, ...acts.map((p) => h("li", attrs(p.taskId),
    valueEl(`${fmtClock(p.start)}–${fmtClock(p.end)}`, labelFor(findRec(p.taskId)?.ns ?? activeNs()), lang), " · ", h("strong", { ...(p.taskId === selectedTask ? { "data-next-title": "1" } : {}) }, cp.titles.get(p.taskId) ?? ""), " ", todayChips(p.taskId, lang),
    p.taskId === selectedTask ? nextTaskReason(lang) : null,
    h("div", { class: "row" }, doneBtn(p.taskId, lang), focusBtn(p.taskId, lang)))))];
  return acts.map((p, i) => h("div", { ...attrs(p.taskId), class: `task${p.taskId === selectedTask ? " action-desk-recommended" : ""}` }, h("b", {}, num(i + 1, lang)),
    h("div", {}, h("strong", { ...(p.taskId === selectedTask ? { "data-next-title": "1" } : {}) }, cp.titles.get(p.taskId) ?? ""), " ", todayChips(p.taskId, lang),
      p.taskId === selectedTask ? nextTaskReason(lang) : null,
      h("p", {}, valueEl(`${fmtClock(p.start)}–${fmtClock(p.end)}`, labelFor(findRec(p.taskId)?.ns ?? activeNs()), lang)), h("div", { class: "row" }, doneBtn(p.taskId, lang), focusBtn(p.taskId, lang)))));
}

// TM-REQ-009: calm date reminders for active goals only. Paused and retired goals never appear here.
function goalDateReminders(lang: Locale): HTMLElement | null {
  const list = goalReminders(allRecs(), todayIso()).slice(0, 2);
  if (!list.length) return null;
  return h("section", { class: "card", "data-goal-reminders": String(list.length) }, h("h2", { class: "card-h" }, t("remind.goal.h", lang)),
    ...list.map((r) => h("p", { "data-goal-reminder": r.goalId }, t("remind.goal", lang, { title: r.title, date: r.targetDate }), " ", link(`#/journey/goal/${r.goalId}`, "crumb", t("remind.goal.open", lang)))));
}



export function today(): HTMLElement {
  const lang = L(); const cp = currentPlan();
  const insp = todaysInspiration(new Date());
  const curStage = Math.min(currentIndex(stageData().passed), STAGES.length - 1);
  const stage = stagesFor(prefs.stageTemplate)[curStage]!;
  const nxt = nextStep(loadAnswers());
  const selected = homeNextAction();
  const selectedVisible = selected.taskId !== null && todaysActions(cp.plan, new Date().getDay()).some((p) => p.taskId === selected.taskId);
  const hasSetupAction = activeNs() === "real" && !cp.hasTasks && selected.action.id === "add_goal";
  const section = (name: string, title: Key, ...items: Array<HTMLElement | null>) => {
    const nodes = items.filter((node): node is HTMLElement => node !== null);
    return nodes.length ? h("section", { class: `action-desk-section action-desk-${name}`, "data-desk-section": name, "aria-labelledby": `desk-${name}-title` },
      h("h2", { id: `desk-${name}-title` }, t(title, lang)), ...nodes) : null;
  };
  const rungs = h("ul", { class: "rungs", role: "img", "aria-label": t("home.rungs", lang, { done: num(curStage, lang), total: num(STAGES.length, lang), now: num(curStage + 1, lang) }) },
    ...STAGES.map((_, i) => h("li", { class: i < curStage ? "done" : i === curStage ? "now" : "" })));
  return h("main", { class: "scr scr-today action-desk" },
    pausedCard(lang),
    h("header", { class: "action-desk-header", "data-workspace-header": "today" },
      h("h1", {}, t("home.title", lang)),
      h("p", { class: "muted" }, activeNs() === "real" ? todayIso() : valueEl(tb(DEMO_DATE, lang), "DEMO", lang)),
      pauseChip(lang)),
    rootBar("today", lang),
    // An already-visible recommended task owns its explanation and controls. An unscheduled
    // recommendation keeps one compact navigation band; never invent a placement for it.
    selectedVisible ? null : nextActionCard(lang, selected.action, true),
    h("section", { class: "action-desk-agenda", "data-desk-section": "agenda", "aria-labelledby": "desk-agenda-title" },
      h("h2", { id: "desk-agenda-title" }, t("home.tasks", lang)), viewBar("today", lang),
      ...(cp.hasTasks ? todayFromPlan(cp, lang, selectedVisible ? selected.taskId : null)
        : activeNs() === "real" ? [h("p", { class: "muted", "data-empty-real": "1" }, t("mode.today.empty", lang))]
        : screenView("today") === "compact" ? [h("ul", { class: "list-compact", "data-view": "compact" }, ...DEMO_TASKS.slice(0, 3).map((k) => h("li", {}, h("strong", {}, tb(k.title, lang)), " · ", valueEl(t("task.minutes", lang, { n: num(k.minutes, lang) }), "DEMO", lang))))]
        : DEMO_TASKS.slice(0, 3).map((k, i) => h("div", { class: "task" }, h("b", {}, num(i + 1, lang)),
          h("div", {}, tb(k.title, lang), h("p", {}, valueEl(t("task.minutes", lang, { n: num(k.minutes, lang) }), "DEMO", lang), " · ", tb(k.hint, lang)))))),
      h("div", { class: "actions" },
        hasSetupAction ? null : link("#/diary/intake", "cta", t("home.start", lang)),
        link("#/habits", "btn ghost", t("habits.link", lang)),
        link("#/stuck", "btn ghost", t("stuck.link", lang)))),
    section("attention", "desk.attention", riskDueCard(lang, "today"), gateDueCard(lang, stageData().passed, "today"),
      remindersTodayCard(lang), missedTodayCard(lang), goalDateReminders(lang), backupReminderCard(lang)),
    section("context", "desk.context", welcomeBackCard(lang), movedNoteCard(lang),
      nxt.field ? h("aside", { class: "card next-step", "data-next-step": nxt.field.id }, h("small", {}, "→ "), h("p", {}, t("home.next", lang, { field: tb(nxt.field.label, lang) }))) : null),
    section("summary", "desk.summary", overallProgressCard(lang, "today"), homeCountCards(lang), kpiTodayCard(lang), northStarCard(lang, "today"),
      teamCard(lang, "today"), blocksTodayCard(lang), healthCard(lang, "today"), deenTodayCard(lang), realityTodayCard(lang),
      homeSummaryCards(lang), portfolioCard(lang, "today"), adviceCardsView(lang)),
    h("section", { class: "stage action-desk-stage", "aria-label": t("home.stage", lang) },
      h("h2", { class: "card-h" }, t("home.stage", lang)),
      h("p", {}, tb(stage.name, lang), " · ", valueEl(t("stage.progress", lang, { now: num(curStage + 1, lang), total: num(STAGES.length, lang) }), activeNs() === "real" ? "ESTIMATE" : "DEMO", lang)),
      h("p", { class: "muted" }, t("home.step", lang)), rungs),
    h("aside", { class: `card inspire ${insp.theme}`, "aria-label": "Inspiration" },
      h("span", { class: "chip" }, `${THEME_LABEL[insp.theme].bn} · ${THEME_LABEL[insp.theme].en}`),
      h("p", { class: "inspire-bn" }, insp.bn), h("p", { class: "muted inspire-en" }, insp.en), link("#/diary/inspiration", "crumb", t("qb1.insp.more", lang))),
    rulesTodayCard(lang), disclaimers(lang));
}

// O6: stage names are chosen in Settings > Plan & progress; here only the current choice and a link.
function templatePicker(lang: Locale): HTMLElement {
  return h("section", { class: "card", "data-card": "stage_templates_chip" }, h("h2", { class: "card-h" }, t("stage.tpl.h", lang)), planChip("stages", "stage.tpl.h", lang), h("p", { class: "muted" }, t("stage.tpl.note", lang)));
}

// O6: 90-day review. Counts only; a measure with no record in the window reads "not enough data", never 0.
export function reviewScreen(): HTMLElement {
  const lang = L(); const recs = allRecs();
  const s = reviewSummary(recs, todayIso());
  const card = (id: string, title: Key, value: string | null) => h("section", { class: "card", "data-review": id },
    h("h2", { class: "card-h", }, t(title, lang)),
    value === null ? h("p", { class: "muted", "data-review-empty": id }, t("review.notEnough", lang)) : valueEl(value, "INFERENCE", lang));
  const revCompact = screenView("review") === "compact";
  const measures: Array<[string, Key, string | null]> = [
    ["tasks", "review.tasks", s.tasksDone === null ? null : t("review.tasks.n", lang, { n: num(s.tasksDone, lang) })],
    ["focus", "review.focus", s.focusMinutes === null ? null : t("review.focus.n", lang, { m: num(Math.round(s.focusMinutes), lang) })],
    ["passes", "review.passes", s.stagePasses === null ? null : t("review.passes.n", lang, { n: num(s.stagePasses, lang) })]];
  const revBody = revCompact
    ? [h("table", { class: "table-compact", "data-view": "compact" }, h("tbody", {}, ...measures.map(([id, title, v]) => h("tr", { "data-review": id }, h("th", { scope: "row" }, t(title, lang)),
      h("td", {}, v === null ? h("span", { class: "muted", "data-review-empty": id }, t("review.notEnough", lang)) : valueEl(v, "INFERENCE", lang))))))]
    : [card("tasks", "review.tasks", measures[0]![2]), card("focus", "review.focus", measures[1]![2]), card("passes", "review.passes", measures[2]![2])];
  return h("main", {}, link("#/journey", "crumb", `← ${t("journey.title", lang)}`),
    h("h1", {}, t("review.title", lang)),
    h("p", { class: "sub" }, t("review.intro", lang)),
    h("p", { class: "muted", "data-review-period": "1" }, valueEl(t("review.period", lang, { from: s.from, to: s.to }), "DEMO", lang)),
    viewBar("review", lang),
    activityChart(recs, todayIso(), lang),
    ...revBody,
    kpiSection("days90", lang), moneyReviewCard(lang), riskReviewCard(lang),
    s.focusUnknown > 0 ? h("p", { class: "muted" }, t("review.unknownFocus", lang, { n: num(s.focusUnknown, lang) })) : null,
    h("p", { class: "muted" }, t("review.quiet", lang)), link("#/journey/month", "crumb", t("month.link", lang)),
    disclaimers(lang));
}

// Weekly review: last 7 days from the user's own records. Unknown when empty; neutral wording.
export function weeklyScreen(): HTMLElement {
  const lang = L(); const recs = allRecs(); const w = weeklySummary(recs, todayIso());
  const one = (n: number | null, key: Key) => (n === null ? null : t(key, lang, { n: num(n, lang) }));
  const measures: Array<[string, Key, string | null]> = [
    ["tasks", "week.tasks", one(w.tasksDone, "week.tasks.n")],
    ["focus", "week.focus", w.focusMinutes === null ? null : t("week.focus.n", lang, { m: num(Math.round(w.focusMinutes), lang) })],
    ["habits", "week.habits", one(w.habitCheckins, "week.habits.n")],
    ["notes", "week.notes", one(w.journeyNotes, "week.notes.n")],
    ["open", "week.open", one(w.stillOpen, "week.open.n")]];
  const cell = (id: string, v: string | null) => (v === null ? h("span", { class: "muted", "data-week-empty": id }, t("week.notEnough", lang)) : valueEl(v, "INFERENCE", lang));
  const compact = screenView("weekly") === "compact";
  const body = compact
    ? [h("table", { class: "table-compact", "data-view": "compact" }, h("tbody", {}, ...measures.map(([id, title, v]) => h("tr", { "data-week": id }, h("th", { scope: "row" }, t(title, lang)), h("td", {}, cell(id, v))))))]
    : measures.map(([id, title, v]) => h("section", { class: "card", "data-week": id }, h("h2", { class: "card-h" }, t(title, lang)), cell(id, v)));
  return h("main", {}, link("#/journey", "crumb", `← ${t("journey.title", lang)}`),
    h("h1", {}, t("week.title", lang)),
    h("p", { class: "sub" }, t("week.intro", lang)), remindRow("review", "weekly", lang),
    h("p", { class: "muted", "data-week-period": "1" }, valueEl(t("review.period", lang, { from: w.from, to: w.to }), "DEMO", lang)),
    viewBar("weekly", lang),
    ...body,
    kpiSection("week", lang), moneyReviewCard(lang), riskReviewCard(lang),
    w.focusUnknown > 0 ? h("p", { class: "muted" }, t("week.unknownFocus", lang, { n: num(w.focusUnknown, lang) })) : null,
    h("p", { class: "muted" }, t("week.quiet", lang)), link("#/journey/month", "crumb", t("month.link", lang)),
    disclaimers(lang));
}

export function journey(): HTMLElement {
  const lang = L();
  const cur = currentIndex(stageData().passed);
  const stage = stagesFor(prefs.stageTemplate)[cur];
  const goalsCard = journeyGoalsCard(lang);
  const navigation = getPresentationPreferences().tabNavigation === "navigate";
  if (navigation) goalsCard.querySelector('a[href="#/journey/goals"]')?.remove();
  const promoted = new Set(getTabActions("journey").map((item) => item.href));
  const toolGroup = (group: "plan" | "review" | "explore", routes: Array<[string, Key]>) =>
    h("section", { class: "tool-group", "data-tool-group": group, "aria-labelledby": `journey-tools-${group}` },
      h("h2", { class: "card-h", id: `journey-tools-${group}` }, t(`desk.tools.${group}` as Key, lang)),
      h("div", { class: "tool-grid" }, ...routes.filter(([route]) => !navigation || !promoted.has(route)).map(([route, key]) => link(route, "btn ghost", t(key, lang)))));
  return h("main", { class: "scr scr-journey action-desk journey-workspace" },
    h("div", { class: "logo-row" }, logo3d(48, lang), h("h1", {}, t("journey.title", lang))),
    passedBanner(lang),
    h("section", { class: "journey-stage-strip", "data-stage-current": stage?.code ?? "done", "aria-label": t("stage.currentLabel", lang) },
      h("h2", { class: "card-h" }, t("stage.currentLabel", lang)),
      stage ? valueEl(`${stage.code} · ${tb(stage.name, lang)}`, activeNs() === "real" ? "ESTIMATE" : "DEMO", lang)
        : h("p", {}, t("stage.alldone", lang))),
    rootBar("journey", lang),
    goalsCard,
    goalFunnelHero(ownHorizonGoals(), (() => { const tk = allRecs().filter((r) => r.entity === "task"); return tk.length ? tk.filter(isOpenTask).length : null; })(), lang),
    h("div", { class: "journey-tools" },
      toolGroup("plan", [["#/journey/boards", "bd.link"], ["#/journey/horizon", "horizon.link"], ["#/journey/decide", "dec.link"], ["#/journey/risks", "risk.link"], ["#/journey/reality", "rl.link"], ["#/journey/northstar", "ns.link"], ["#/journey/kpi", "kpi.link"]]),
      toolGroup("review", [["#/journey/log", "log.link"], ["#/journey/report", "report.link"], ["#/journey/week", "week.link"], ["#/journey/month", "month.link"], ["#/journey/review", "review.link"], ["#/journey/history", "hist.link"]]),
      toolGroup("explore", [["#/journey/universe", "univ.link"], ["#/journey/art", "reward.see"], ["#/journey/mine", "tri.link"], ["#/journey/legs", "legs.link"], ["#/journey/leak", "leak.link"]])),
    overallProgressCard(lang, "journey"),
    northStarCard(lang, "journey"),
    templatePicker(lang),
    viewBar("journey", lang),
    stageLadder(lang),
    stagePanel(lang),
    link("#/more/status", "crumb", t("cap.details", lang)),
    disclaimers(lang));
}

export function diary(): HTMLElement {
  const lang = L();
  const a = loadAnswers();
  const c = completeness(a);
  const nxt = nextStep(a);
  const nextText = nxt.field
    ? t(`diary.next.${nxt.reasonKey}` as Key, lang, { field: tb(nxt.field.label, lang), why: tb(nxt.field.help.why, lang) })
    : t("diary.next.all_done", lang);
  return h("main", { class: "scr scr-diary" },
    h("h1", {}, t("diary.title", lang)),
    rootBar("diary", lang),
    h("p", { class: "sub" }, t("diary.intro", lang)),
    profileCard(lang),
    h("section", { class: "card", "aria-label": t("diary.completeness", lang) },
      h("h2", { class: "card-h", }, t("diary.completeness", lang), " ", valueEl(`${num(c.pct, lang)}%`, "INFERENCE", lang)),
      h("div", { class: "bar", role: "img", "aria-label": `${c.pct}%` }, h("i", { style: `width:${c.pct}%` })),
      h("p", { class: "muted" }, t("diary.completeness.detail", lang, { filled: num(c.filled, lang), total: num(c.total, lang), addressed: num(c.addressed, lang) }))),
    h("section", { class: "card", "data-next": "1" }, h("h2", { class: "card-h", }, t("diary.next", lang)), h("p", {}, nextText)),
    getPresentationPreferences().tabNavigation === "menu" ? link("#/diary/intake", "cta", t("diary.start", lang)) : null,
    link("#/diary/team", "btn ghost", t("team.link", lang)),
    link("#/more/status", "crumb", t("cap.details", lang)),
    disclaimers(lang));
}


/** Own options and saved results live in the active mode: demo in demo, real in real (writes need the tick). Reads in real mode without the tick find nothing. */
const listStore = () => (prefs.dataMode === "real" ? store.real : store.demo);

const SUGGESTABLE = new Set(["interest.topic", "skill.name", "strength.name", "value.name", "goal.title"]);

/** Inline option cards: nothing is sent until the user taps the search button (consent). */
// TM-REQ-007: every saved outside option says how old it is. Old ones are marked, never called recent.
export function freshBadge(fetchedAt: string, lang: Locale): HTMLElement {
  const f = freshnessOf(fetchedAt, new Date());
  return h("p", { class: "muted" }, h("span", { class: `tag ${f === "recent" ? "ok" : "warn"}`, "data-fresh": f }, t(`fresh.${f}` as Key, lang)));
}

function suggestPanel(f: FieldDef, lang: Locale, getInput: () => HTMLInputElement): HTMLElement {
  const box = h("div", { class: "suggest", "data-suggest": f.id });
  const out = h("div", { role: "status" });
  // O7 own options: saved on this phone per field (cap 20, oldest removed), shown above the search button.
  const ownBox = h("div", { "data-own-list": f.id });
  const renderOwn = () => {
    const list = ownOptions(listStore(), f.id);
    ownBox.replaceChildren(...(list.length ? [h("p", { class: "muted" }, t("suggest.ownList", lang)),
      ...list.map((text) => h("button", { class: "btn ghost", type: "button", "data-own-option": f.id, onclick: () => { getInput().value = text; out.replaceChildren(); getInput().focus(); } }, text))] : []));
  };
  renderOwn();
  const saveNote = h("p", { class: "muted", role: "status" });
  const saveOwn = h("button", { class: "btn ghost", type: "button", "data-act": "suggest-save-own", onclick: () => {
    let res: ReturnType<typeof saveOwnOption> | "locked";
    try { res = saveOwnOption(listStore(), f.id, getInput().value, new Date()); } catch { res = "locked"; }
    saveNote.textContent = res === "locked" ? t("data.consent.needTick", lang) : res === "empty" ? t("suggest.empty", lang) : res === "secret" ? t("suggest.secret", lang) : t("suggest.ownSaved", lang);
    if (res === "saved" || res === "duplicate_updated") renderOwn();
  } }, t("suggest.saveOwn", lang));
  const go = h("button", { class: "btn ghost", type: "button", "data-act": "suggest-go" }, t("suggest.go", lang));
  go.addEventListener("click", async () => {
    const input = getInput(); const q = input.value.trim();
    if (!q) { out.replaceChildren(h("p", { class: "need" }, t("suggest.empty", lang))); return; }
    const safe = safeQuery(q);
    if (!safe) { out.replaceChildren(h("p", { class: "err" }, t("suggest.secret", lang))); return; }
    out.replaceChildren(h("p", { class: "muted" }, t("suggest.loading", lang)));
    const wasSaved = savedSearchResults(listStore(), f.id, safe).length >= 2;
    const r = await research(safe, true, { provider: wikipedia(lang === "en" ? "en" : "bn"), online: () => navigator.onLine, cached: (qq) => savedSearchResults(listStore(), f.id, qq) });
    // M11 (owner, 24 Oct): the first successful search is saved on this phone right away, so the same term works offline later.
    if (r.status === "options" && !wasSaved) { try { saveSearchResults(listStore(), f.id, safe, r.options, new Date()); } catch { /* real mode without the tick: nothing is saved */ } }
    const cards = r.options.map((o) => h("div", { class: "card", "data-option": o.id },
      h("h2", { class: "card-h", }, o.title), h("p", { class: "muted" }, o.snippet),
      h("p", { class: "muted" }, t("suggest.source", lang, { s: o.sourceName, d: o.fetchedAt.slice(0, 10) })),
      freshBadge(o.fetchedAt, lang),
      h("button", { class: "btn", type: "button", onclick: () => {
        input.value = o.title; out.replaceChildren(); input.focus();
      } }, t("suggest.use", lang))));
    const note = wasSaved && r.status === "options" ? "suggest.savedNote" : r.status === "too_few" ? "suggest.none" : r.status === "offline" ? "suggest.offline" : r.status === "error" ? "suggest.error" : null;
    out.replaceChildren(...cards, ...(note ? [h("p", { class: "muted" }, t(note, lang))] : []),
      h("button", { class: "btn ghost", type: "button", onclick: () => { out.replaceChildren(); getInput().focus(); } }, t("suggest.own", lang)));
  });
  box.append(h("p", { class: "muted" }, t("suggest.consent", lang)), ownBox, saveOwn, saveNote, go, out);
  return h("details", { class: "help" }, h("summary", {}, t("suggest.btn", lang)), box);
}

export function intake(stepParam: string | undefined): HTMLElement {
  const lang = L();
  const steps = intakeSteps();
  const a = loadAnswers();
  // The form pre-fills from the active mode only: a demo answer is never copied into a real record.
  const prefill = loadAnswers();
  const nxt = nextStep(a);
  const step = Number(stepParam) || nxt.step || steps[0]!;
  const idx = steps.indexOf(step);
  const fields = stepFields(step);
  const readers: Array<{ f: FieldDef; read: ReturnType<typeof inputFor>["read"]; err: HTMLElement }> = [];
  const gate = consentOn() ? null : consentPrompt(lang);
  const form = h("form", { novalidate: true });
  const msg = h("p", { class: "err", role: "alert" });
  for (const f of fields) {
    const ip = inputFor(f, lang, prefill[f.id]);
    const err = h("p", { class: "err", role: "alert" });
    readers.push({ f, read: ip.read, err });
    form.append(h("div", { class: "field", "data-field": f.id },
      h("label", { for: `f-${f.id}` }, tb(f.label, lang)), h("div", { class: "tags" }, h("span", { class: "tag" }, t(`requirement.${f.requirement}` as Key, lang))),
      ip.el, err, SUGGESTABLE.has(f.id) ? suggestPanel(f, lang, () => document.getElementById(`f-${f.id}`) as HTMLInputElement) : null, fieldHelp(f, lang)));
  }
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const out: Answers = {}; let bad = false;
    for (const r of readers) {
      r.err.textContent = "";
      const v = r.read();
      if (v === "secret") { r.err.textContent = t("intake.secretRejected", lang); bad = true; }
      else if (v === "invalid") { r.err.textContent = t("intake.invalidNumber", lang); bad = true; }
      else if (v) out[r.f.id] = v;
    }
    if (bad) return; // nothing is saved when any field is rejected
    if (!saveAnswers(step, out)) { msg.textContent = saveBlockedText(lang); return; } // no consent: nothing saved
    const nextIdx = idx + 1;
    location.hash = nextIdx < steps.length ? `#/diary/intake/${steps[nextIdx]}` : "#/diary";
  });
  form.append(h("button", { class: "btn", type: "submit" }, idx === steps.length - 1 ? t("intake.finish", lang) : t("intake.next", lang)));
  return h("main", { class: "scr scr-intake" },
    link("#/diary", "crumb", `← ${t("intake.back", lang)}`), h("h1", { class: "sr-only" }, t("diary.title", lang)),
    h("div", { class: "top", style: "margin-top:8px" }, h("span", {}, t("intake.step", lang, { n: num(idx + 1, lang), total: num(steps.length, lang) })), consentOn() ? nsTag(activeNs(), lang) : null),
    consentOn() ? (activeNs() === "real" ? h("p", { class: "muted" }, t("entry.real.note", lang)) : null) : gate,
    form, msg,
    h("p", { class: "muted" }, t("intake.skipHint", lang)),
    disclaimers(lang, ["noGuarantee"]));
}

// ---- Prayer times, one-tap marks and alert settings (M13). Marks use the prayer_log entity, demo namespace (real stays closed, D-B). ----
function toggleFastMark(day: string) {
  const id = fastLogId(day);
  if (store[activeNs()].get(id)) store[activeNs()].delete(id);
  else putMode(fastLogRecord(day, new Date().toISOString()));
}

/** M13 fasting mark for today (Dhaka date). Only the date is kept; nothing is counted. */
function fastCard(lang: Locale): HTMLElement {
  const day = isoDate(dhakaNow(Date.now()).date);
  const marked = isFastMarked(allRecs(), day);
  return h("div", { class: "card", id: "deen-fasting", "data-fast": day },
    h("h2", { class: "card-h" }, t("deen.fast.title", lang)),
    h("p", { class: "muted" }, t("deen.fast.hint", lang)),
    h("button", { class: marked ? "btn" : "btn ghost", type: "button", "data-act": "fast-mark", "aria-pressed": String(marked),
      onclick: () => { toggleFastMark(day); rerender(); } }, marked ? t("deen.fast.marked", lang) : t("deen.fast.mark", lang)),
    h("p", { class: "note" }, t("deen.fast.note", lang)));
}

export function deen(): HTMLElement {
  const lang = L();
  const ents = ENTITIES.filter((e) => e.module === "M13");
  return h("main", { class: "scr scr-deen" },
    h("h1", {}, t("deen.title", lang)),
    rootBar("deen", lang),
    h("p", { class: "sub" }, t("deen.intro", lang)),
    h("p", { class: "muted" }, t("deen.control", lang)),
    prayerControls(lang, "full"),
    link("#/deen/plans", "btn", t("dp.title", lang)),
    fastCard(lang),
    hijriCard(lang),
    prayerLinkRow(lang),
    ...ents.map((e) => {
      const fs = FIELDS.filter((f) => f.entity === e.id);
      return h("div", { class: "card", "data-entity": e.id },
        h("div", { class: "row" }, h("h2", { class: "card-h", }, tb(e.name, lang)), h("span", { class: "tag ok" }, t("deen.private", lang))),
        h("p", { class: "muted" }, t("deen.fields", lang, { n: num(fs.length, lang) }), " · ", t("access.device_only_per_item_authorisation", lang)),
        ...fs.map((f) => fieldHelp(f, lang)));
    }),
    link("#/more/status", "crumb", t("cap.details", lang)),
    disclaimers(lang, ["noFatwa", "noGuarantee"]));
}

export function status(): HTMLElement {
  const lang = L();
  return h("main", {},
    link("#/settings/about", "crumb", `← ${t("set.cat.about", lang)}`),
    h("h1", {}, t("cap.title", lang)),
    h("p", { class: "sub" }, t("cap.intro", lang)),
    buildLegend(lang), h("p", { class: "muted" }, t("cap.legend", lang)),
    ...MODULES.map((m) => moduleCard(m, lang)),
    disclaimers(lang));
}

export function fieldsGuide(): HTMLElement {
  const lang = L();
  return h("main", {},
    link("#/settings/about", "crumb", `← ${t("set.cat.about", lang)}`),
    h("h1", {}, t("fields.title", lang)),
    h("p", { class: "sub" }, t("fields.count", lang, { n: num(FIELDS.length, lang), v: num(CATALOG_VERSION, lang) })),
    ...ENTITIES.filter((e) => FIELDS.some((f) => f.entity === e.id)).flatMap((e) => [
      h("h2", {}, tb(e.name, lang)),
      ...FIELDS.filter((f) => f.entity === e.id).map((f) => h("div", { class: "card", "data-field-card": f.id },
        h("h2", { class: "card-h", }, tb(f.label, lang)),
        h("div", { class: "tags" }, h("span", { class: "tag" }, t(`privacy.${f.privacy}` as Key, lang)), h("span", { class: "tag" }, valueEl(t(`label.${semanticLabel(f)}` as Key, lang), semanticLabel(f), lang))),
        fieldHelp(f, lang))),
    ]),
    disclaimers(lang));
}

export function safety(): HTMLElement {
  const lang = L();
  return h("main", {},
    link("#/settings/about", "crumb", `← ${t("set.cat.about", lang)}`),
    h("h1", {}, t("safety.title", lang)),
    h("div", { class: "card" }, h("p", {}, t("safety.never", lang))),
    h("div", { class: "card" }, h("p", {}, t("safety.demo", lang))),
    h("div", { class: "card" }, h("p", {}, t("safety.deen", lang))),
    disclaimers(lang, ["noGuarantee", "advice", "noFatwa"]));
}

export function glossary(): HTMLElement {
  const lang = L();
  return h("main", {},
    link("#/settings/about", "crumb", `← ${t("set.cat.about", lang)}`),
    h("h1", {}, t("glossary.title", lang)),
    h("p", { class: "sub" }, t("glossary.unreviewed", lang)),
    ...GLOSSARY.map((g) => h("div", { class: "card", "data-term": g.id },
      h("div", { class: "row" }, h("h2", { class: "card-h", }, tb(g.term, lang)), h("span", { class: "tag warn" }, t("glossary.tag", lang))),
      h("p", {}, tb(g.meaning, lang)))),
    disclaimers(lang, ["noFatwa"]));
}

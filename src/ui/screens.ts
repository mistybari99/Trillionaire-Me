import { todaysInspiration, THEME_LABEL } from "../library/inspiration";
import { groupByHorizon, HORIZONS, type HorizonGoal } from "../core/horizon";
import { h } from "./dom";
import { t, tb, fmtNumber } from "../i18n/t";
import type { Key } from "../i18n/packs";
import { LOCALES, LOCALE_ORDER, intlLocale, type Locale } from "../i18n/registry";
import { applyPrefs, consentKv, prefs, screenView, setScreenView, store, type HorizonView, type PlanMode, type ViewScreen } from "./state";
import { DESIGNS } from "./themes";
import { grantConsent, readConsent, revokeConsent } from "../core/consent";
import { demoBadge, disclaimers, fieldHelp, num, valueEl } from "./components";
import { STAGES, DEMO_DATE, DEMO_TASKS } from "../demo/seed";
import { MODULES, CAP_STATUSES, type ModuleDef } from "../modules/capability";
import { ENTITIES } from "../schema/entities";
import { FIELDS, CATALOG_VERSION, intakeSteps, fieldById } from "../catalog/fields";
import { semanticLabel } from "../catalog/labels";
import { completeness, nextStep, stepFields, type Answers } from "../core/intake";
import { checkFreeText } from "../core/safety";
import { type FieldValue, type TMRecord, type UnknownState } from "../core/types";
import type { FieldDef } from "../catalog/types";
import { StoreRepo } from "../adapters/storeRepo";
import { createBackup, restoreBackup } from "../core/backup";
import { schedule, todaysActions } from "../core/planner";
import { buildPlanInput, capacityState, fmtClock, freeWindow, isOpenTask } from "../core/planInputs";
import { planFlowData } from "../core/planFlow";
import { assessmentSection } from "./assessment";
import { markNotTrue, realityLogRecord, RealityError } from "../core/reality";
import { reviewSummary } from "../core/review";
import { NEUTRAL_TITLE, NOTIFY_CATEGORIES, notifyText } from "../core/notify";
import { stagesFor, TEMPLATE_IDS, TEMPLATES, type TemplateId } from "../core/stageTemplates";
import { STAGE_CODES, StageError, conditions, currentIndex, passStage, stageStates, type StageCode } from "../core/stages";
import { LAYERS, TOPICS, topicById, relatedTips, type Tip } from "../library/topics";
import { tipsFor } from "../library/packs";
import { journeyArt } from "./rewardArt";
import { messageIndex, milestoneAt } from "../core/reward";
import { diagram } from "./diagram";
import { activityChart, goalRingsChart, habitChart, moneyChart } from "./charts";
import { encBackupCard } from "./encBackup";
import { rulesTodayCard } from "./libraryScreens";
import { celebrate, journeyGoalsCard } from "./lifeUi";
import * as Focus from "../core/focus";
import * as Habits from "../core/habits";
import * as Cards from "../core/cards";
import { CAUSE_TEXT, QUESTIONS, diagnose, type Answer, type Helper } from "../core/stuck";
import { wordChain } from "../core/learning";
import { extract, summarize, type Candidate, type Item } from "../core/capture";
import { netWorth, monthlyCashFlow, cashFlow90Days, type Calc } from "../core/finance";
import { financeFrom } from "../core/financeInputs";
import { research, safeQuery } from "../core/research";
import { ownOptions, saveOwnOption, saveSearchResults, savedSearchResults } from "../core/savedLists";
import { wikipedia } from "../adapters/wikipedia";
import { GLOSSARY } from "../catalog/glossary";
import { DHAKA_COORDS, PRAYER_KEYS, dhakaNow, prayerClock, isoDate, parseCoord, prayerTimes, type PrayerKey } from "../core/prayer";
import { markedOn, prayerLogId, prayerLogRecord } from "../core/prayerLog";
import { fastLogId, fastLogRecord, isFastMarked } from "../core/fastLog";
import { DEFAULT_ALERT_PREFS, parseAlertPrefs } from "../core/prayerAlerts";
import { canNotify } from "./prayerAlerts";
import { modeSwitchCard } from "./modeUi";
import { activeNs, allRecs, asReal, putMode, consentOn, consentPrompt, findRec, inNs, labelFor, nsTag, ownerOf, saveBlockedText, saveTyped, storeOf, typed, valueLabel } from "./entry";

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
    const rec: TMRecord = { id, entity, ns, ownerId: ownerOf(ns), schemaVersion: 1, createdAt: prev?.createdAt ?? new Date().toISOString(), values: { ...(prev?.values ?? {}), ...values } };
    store[ns].put(rec);
  }
  void step;
  return true;
}

// ---- shared bits ----
// Template chooser shared by the dashboard screens: same records, a different view. Stored per screen in prefs.
function viewBar(screen: ViewScreen, lang: Locale): HTMLElement {
  const cur = screenView(screen);
  const seg = (v: "full" | "compact") => h("button", { type: "button", "data-view-opt": v, "aria-pressed": String(cur === v), onclick: () => { setScreenView(screen, v); rerender(); } }, t(`view.${v}` as Key, lang));
  return h("div", { class: "seg", role: "group", "data-view-bar": screen, "aria-label": t("view.label", lang) }, seg("full"), seg("compact"));
}

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

function capTag(s: ModuleDef["statuses"][number], lang: Locale) {
  const cls = s === "implemented" || s === "offline-ok" || s === "saved-background" ? "ok" : s === "demo" || s === "internet-needed" || s === "partial" ? "warn" : "off";
  return h("span", { class: `tag ${cls}`, "data-cap": s }, t(`cap.${s}` as Key, lang));
}

function moduleCard(m: ModuleDef, lang: Locale) {
  return h("div", { class: "card", "data-module": m.id },
    h("div", { class: "row" }, h("h2", { class: "card-h", }, `${m.id} · ${tb(m.name, lang)}`)),
    h("p", { class: "muted" }, tb(m.note, lang)),
    h("div", { class: "tags" }, ...m.statuses.map((s) => capTag(s, lang)), ...(m.statuses.includes("implemented") ? [] : [h("span", { class: "tag off" }, t("cap.gate", lang, { g: m.gate }))])));
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
  const input = buildPlanInput(a, recs, prefs.mode, new Date().getDay());
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

export function planScreen(): HTMLElement {
  const lang = L(); const cp = currentPlan();
  const w = freeWindow(cp.a);
  const free = cp.state === "ok"
    ? valueEl(t("plan.hours", lang, { h: num(Number((cp.a["constraint.weekly_free_hours"] as { value: number }).value), lang), from: fmtClock(w!.from), to: fmtClock(w!.to) }), valueLabel(cp.a["constraint.weekly_free_hours"]), lang)
    : h("span", {}, t(cp.state === "need_hours" ? "plan.need_hours" : "plan.need_window", lang), " ", link("#/diary/intake/4", "crumb", t("plan.setup", lang)));
  const seg = (m: PlanMode) => h("button", { type: "button", "data-mode": m, "aria-pressed": String(prefs.mode === m), onclick: () => { prefs.mode = m; rerender(); } }, t(`plan.mode.${m}` as Key, lang));
  const title = h("input", { id: "pt-title", type: "text", maxlength: "120", autocomplete: "off" });
  const mins = h("input", { id: "pt-min", type: "text", inputmode: "numeric" });
  const prio = h("select", { id: "pt-prio" }, ...fieldById("task.priority")!.options!.map((o) => h("option", { value: o.code, ...(o.code === "normal" ? { selected: true } : {}) }, tb(o.label, lang))));
  // M06 dependency: "do this after" lists open tasks only; nothing is chosen by default.
  const openTasks = cp.recs.filter(isOpenTask).sort((a, b) => a.id.localeCompare(b.id));
  const afterSel = h("select", { id: "pt-after" }, h("option", { value: "" }, t("plan.after.none", lang)),
    ...openTasks.map((r) => h("option", { value: r.id }, cp.titles.get(r.id) ?? r.id)));
  // Optional link to a goal of the active mode (goal rings on Report read links.goal).
  const goalRecs = cp.recs.filter((r) => r.entity === "goal" && r.values["goal.title"]?.state === "value").sort((a, b) => a.id.localeCompare(b.id));
  const goalTitle = (r: TMRecord) => String((r.values["goal.title"] as { value?: unknown }).value ?? "");
  const goalSel = h("select", { id: "pt-goal" }, h("option", { value: "" }, t("plan.goal.none", lang)), ...goalRecs.map((r) => h("option", { value: r.id }, goalTitle(r))));
  const err = h("p", { class: "err", role: "alert" });
  const gate = consentOn() ? null : consentPrompt(lang);
  const form = h("form", { novalidate: true, "data-form": "task" }, gate,
    h("label", { for: "pt-title" }, t("plan.task.title", lang)), title,
    h("label", { for: "pt-min" }, t("plan.task.minutes", lang)), mins,
    h("label", { for: "pt-prio" }, t("plan.task.priority", lang)), prio,
    ...(openTasks.length ? [h("label", { for: "pt-after" }, t("plan.after.label", lang)), afterSel] : []),
    ...(goalRecs.length ? [h("label", { for: "pt-goal" }, t("plan.goal.label", lang)), goalSel] : []), err,
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
      values: { "task.title": typed(name), "task.minutes": m, "task.priority": typed(prio.value) },
      ...(afterSel.value || goalSel.value ? { links: { ...(afterSel.value ? { after: afterSel.value } : {}), ...(goalSel.value ? { goal: goalSel.value } : {}) } } : {}) })) { err.textContent = saveBlockedText(lang); return; }
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
    return h("div", { class: "card", "data-task": r.id }, h("div", { class: "row" },
      h("div", {}, nsTag(r.ns, lang), h("h2", { class: "card-h", }, cp.titles.get(r.id) ?? ""), h("p", { class: "muted" }, mv && mv.state === "value" ? valueEl(t("task.minutes", lang, { n: num(Number(mv.value), lang) }), mv.label, lang) : t("plan.task.minutes.later", lang)),
        r.links?.after ? h("p", { class: "muted", "data-after": r.links.after }, t("plan.after.shown", lang, { title: afterTitle(r.links.after) })) : null,
        r.links?.goal && goalRecs.some((g) => g.id === r.links!.goal) ? h("p", { class: "muted", "data-goal": r.links.goal }, t("plan.goal.shown", lang, { title: goalTitle(goalRecs.find((g) => g.id === r.links!.goal)!) })) : null),
      r.values["task.done_on"]?.state === "value" ? h("span", { class: "tag ok" }, t("reward.done", lang))
        : r.values["task.not_true_on"]?.state === "value" ? h("div", {}, h("span", { class: "tag off" }, t("reality.tag", lang, { date: String((r.values["task.not_true_on"] as { value?: unknown }).value) })), h("p", { class: "muted" }, t("reality.note", lang)), h("button", { class: "btn ghost", type: "button", style: "width:auto;margin:6px 0 0;min-height:44px", onclick: () => { storeOf(r).delete(r.id); rerender(); } }, t("plan.task.remove", lang)))
        : h("div", {}, doneBtn(r.id, lang), focusBtn(r.id, lang), h("button", { class: "btn ghost", type: "button", "data-act": "reality-changed", "data-task-id": r.id, style: "width:auto;margin:6px 0 0;min-height:44px", onclick: () => markRealityChanged(r.id, lang) }, t("reality.btn", lang)), h("button", { class: "btn ghost", type: "button", style: "width:auto;margin:6px 0 0;min-height:44px", onclick: () => { storeOf(r).delete(r.id); rerender(); } }, t("plan.task.remove", lang)))));
  });
  const byDay = (d: number) => cp.plan.placements.filter((p) => p.day === d).sort((a, b) => a.start - b.start);
  const week = [0, 1, 2, 3, 4, 5, 6].map((i) => (new Date().getDay() + i) % 7).filter((d) => byDay(d).length).map((d) => h("div", { class: "card", "data-day": String(d) }, h("h2", { class: "card-h", }, weekday(d, lang)),
    ...byDay(d).map((p) => h("p", { "data-placement": p.taskId }, `${fmtClock(p.start)}–${fmtClock(p.end)} · ${cp.titles.get(p.taskId) ?? ""}`))));
  return h("main", { class: "scr scr-plan" },
    link("#/diary", "crumb", `← ${t("diary.title", lang)}`),
    h("h1", {}, t("plan.title", lang)), h("p", { class: "sub" }, t("plan.intro", lang)),
    h("div", { class: "card", "data-capacity": cp.state }, h("h2", { class: "card-h", }, t("plan.free", lang)), h("p", {}, free)),
    planFlow(cp, lang),
    assessmentSection(cp.recs, lang),
    h("h2", {}, t("plan.mode", lang)), h("div", { class: "seg", role: "group" }, seg("normal"), seg("minimum_week"), seg("pause")),
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
  const err = h("p", { class: "err", role: "alert" });
  const gate = consentOn() ? null : consentPrompt(lang);
  const form = h("form", { novalidate: true, "data-form": "money" }, gate,
    h("label", { for: "mf-kind" }, t("money.kind", lang)), kind, h("label", { for: "mf-scope" }, t("money.scope", lang)), scope,
    h("label", { for: "mf-name" }, t("money.name", lang)), name, h("p", { class: "muted" }, t("money.nameHint", lang)),
    h("label", { for: "mf-amount" }, t("money.amount", lang)), amount, unk,
    h("label", { for: "mf-period" }, t("money.period", lang)), period, err,
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
    const id = `fin-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    if (!saveTyped({ id, entity: "finance_item", createdAt: new Date().toISOString(),
      values: { "finance.kind": d(kind.value), "finance.scope": d(scope.value), "finance.label": d(nm), "finance.amount": amt, "finance.period": d(period.value) } })) { err.textContent = saveBlockedText(lang); return; }
    rerender();
  });
  const show = (c: Calc) => c.ok ? valueEl(t("money.bdt", lang, { v: fmtNum(c.value, lang) }), c.label, lang) : h("span", { class: "muted", "data-unknown": "1" }, t("money.unknown", lang, { n: num(c.missing, lang) }));
  // nothing entered is "nothing yet", not a computed 0
  const has = (sc: "personal" | "business", kinds: string[]) => fv.items.some((i) => i.scope === sc && kinds.includes(i.kind));
  const sum = (sc: "personal" | "business") => h("div", { class: "card", "data-scope": sc }, h("h2", { class: "card-h", }, t(`money.${sc}` as Key, lang)),
    h("p", {}, t("money.networth", lang), ": ", has(sc, ["asset", "liability"]) ? show(netWorth(fv.items, sc)) : h("span", { class: "muted", "data-none": "1" }, t("money.none", lang))),
    h("p", {}, t("money.cashflow", lang), ": ", has(sc, ["income", "expense"]) ? show(monthlyCashFlow(fv.items, sc)) : h("span", { class: "muted", "data-none": "1" }, t("money.none", lang))),
    h("p", { "data-cash90": sc }, t("money.cash90", lang), ": ", has(sc, ["income", "expense"]) ? show(cashFlow90Days(fv.items, sc)) : h("span", { class: "muted", "data-none": "1" }, t("money.none", lang))));
  const rows = recs.filter((r) => r.entity === "finance_item").sort((a, b) => a.id.localeCompare(b.id)).map((r) => {
    const a = r.values["finance.amount"]!;
    return h("div", { class: "card", "data-fin": r.id }, h("div", { class: "row" }, h("div", {}, nsTag(r.ns, lang),
      h("h2", { class: "card-h", }, fv.labels.get(r.id) ?? String((r.values["finance.label"] as { value?: unknown })?.value ?? "")),
      h("p", { class: "muted" }, a.state === "value" ? valueEl(t("money.bdt", lang, { v: fmtNum(Number(a.value), lang) }), a.label, lang) : t(`unknown.${a.state}` as Key, lang))),
      h("button", { class: "btn ghost", type: "button", style: "width:auto;margin:0;min-height:44px", onclick: () => { storeOf(r).delete(r.id); rerender(); } }, t("money.remove", lang))));
  });
  const moneyCompact = screenView("money") === "compact";
  const moneyTable = h("table", { class: "table-compact", "data-view": "compact" }, h("tbody", {}, ...recs.filter((r) => r.entity === "finance_item").sort((a, b) => a.id.localeCompare(b.id)).map((r) => {
    const a = r.values["finance.amount"]!;
    return h("tr", { "data-fin": r.id }, h("td", {}, nsTag(r.ns, lang)), h("td", {}, fv.labels.get(r.id) ?? String((r.values["finance.label"] as { value?: unknown })?.value ?? "")),
      h("td", {}, a.state === "value" ? valueEl(t("money.bdt", lang, { v: fmtNum(Number(a.value), lang) }), a.label, lang) : t(`unknown.${a.state}` as Key, lang)));
  })));
  return h("main", { class: "scr scr-money" },
    link("#/diary", "crumb", `← ${t("diary.title", lang)}`), h("h1", {}, t("money.title", lang)), h("p", { class: "sub" }, t("money.intro", lang)),
    h("h2", {}, t("money.summary", lang)), sum("personal"), sum("business"),
    fv.notMonthly ? h("p", { class: "muted" }, t("money.notMonthly", lang, { n: num(fv.notMonthly, lang) })) : null,
    mixed ? h("p", { class: "muted", "data-mix": "1" }, t("entry.mixNote", lang)) : null,
    h("h2", {}, t("money.add", lang)), form,
    moneyChart(recs, lang),
    viewBar("money", lang),
    rows.length ? (moneyCompact ? moneyTable : h("div", { "data-view": "full" }, ...rows)) : h("p", { class: "muted" }, t("money.empty", lang)),
    h("p", { class: "muted" }, t("money.note", lang)), disclaimers(lang));
}



// ---- horizon view (R2) ----
export function horizonScreen(): HTMLElement {
  const lang = L();
  const nsById = new Map(allRecs().map((r) => [r.id, r.ns] as const));
  const goals: HorizonGoal[] = allRecs().filter((r) => r.entity === "goal" && r.values["goal.title"]?.state === "value").map((r) => ({
    id: r.id,
    title: String((r.values["goal.title"] as { value?: unknown }).value ?? ""),
    why: r.values["goal.why"]?.state === "value" ? String((r.values["goal.why"] as { value?: unknown }).value) : undefined,
    horizon: r.values["goal.horizon"]?.state === "value" ? String((r.values["goal.horizon"] as { value?: unknown }).value) : undefined,
  }));
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
    toggle,
    body);
}

// ---- stages + journey log ----
function stageData() {
  const recs = allRecs();
  const passed = recs.filter((r) => r.entity === "stage_pass").map((r) => String((r.values["stage_pass.stage_code"] as { value?: unknown })?.value ?? ""));
  const goalCount = recs.filter((r) => r.entity === "goal" && r.values["goal.title"]?.state === "value").length;
  return { recs, passed, ctx: { answers: loadAnswers(), goalCount } };
}
const lastProgress = (recs: TMRecord[]) => recs.filter((r) => r.entity === "journey_log").map((r) => Number((r.values["stage_pass.progress_pct"] as { value?: unknown })?.value ?? 0)).pop() ?? 0;

function stagePanel(lang: Locale): HTMLElement {
  const sd = stageData(); const cur = currentIndex(sd.passed);
  if (cur >= STAGE_CODES.length) return h("div", { class: "card" }, h("p", {}, t("stage.alldone", lang)));
  const code = STAGE_CODES[cur] as StageCode; const cs = conditions(sd.ctx, code); const names = stagesFor(prefs.stageTemplate);
  const manual = !cs.some((c) => c.auto);
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
      const base = { entity: "", ns: "demo" as const, ownerId: "demo-user", schemaVersion: 1, createdAt: rec.at };
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
    manual ? h("div", {}, h("label", { for: "st-evidence" }, t("stage.evidence", lang)), ev) : null, err, btn);
}

function passedBanner(lang: Locale): HTMLElement | null {
  let code: string | null = null;
  try { code = sessionStorage.getItem("tm:passed"); sessionStorage.removeItem("tm:passed"); } catch { /* ignore */ }
  return code ? h("div", { class: "card", role: "status", "data-passed": code }, h("p", { class: "ok-msg" }, t("stage.passedMsg", lang, { code })), h("p", {}, t("reward.stageUnlocked", lang, { code })), link("#/journey/art", "btn ghost", t("reward.see", lang))) : null;
}

export function journeyLog(): HTMLElement {
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
    err.textContent = ""; const text = ta.value.trim(); if (!text) { err.textContent = t("capture.empty", lang); return; }
    if (!checkFreeText(text).ok) { err.textContent = t("intake.secretRejected", lang); return; }
    const cands = extract(text); const edits = new Map<string, string>(); const checks = new Map<string, HTMLInputElement>();
    const rows = cands.map((c) => {
      const cb = h("input", { type: "checkbox", id: `cb-${c.id}`, ...(c.confidence === "high" ? { checked: true } : {}), style: "width:24px;margin:0" }) as HTMLInputElement; checks.set(c.id, cb);
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

export function reportScreen(): HTMLElement {
  const lang = L(); const capRecs = allRecs().filter((r) => r.entity === "capture_item").sort((a, b) => a.id.localeCompare(b.id)); const items = capRecs.map(itemOf); const s = summarize(items);
  const repCompact = screenView("report") === "compact";
  const entryText = (i: Item) => i.text ?? (typeof i.number === "number" ? `${fmtNum(i.number, lang)}${i.unit ? ` ${i.unit}` : ""}` : i.date ?? "");
  const entries = h("ul", { class: "list-compact", "data-entries": "1" }, ...capRecs.map((r, k) => h("li", { "data-item": r.id }, nsTag(r.ns, lang), " ", h("span", { class: "muted" }, t(`capture.kind.${items[k]!.kind}` as Key, lang)), " · ", entryText(items[k]!))));
  const compactBody = h("div", { "data-view": "compact" },
    h("p", {}, s.amountCount ? valueEl(t("report.amountTotal", lang, { n: num(s.amountCount, lang), v: t("money.bdt", lang, { v: fmtNum(s.amountTotal, lang) }) }), "ESTIMATE", lang) : t("report.empty", lang)),
    h("h2", { class: "card-h" }, t("report.entries", lang)), entries);
  const sec = (title: Key, ...kids: Array<Node | string | null>) => h("div", { class: "card" }, h("h2", { class: "card-h", }, t(title, lang)), ...kids);
  return h("main", {}, link("#/journey", "crumb", `← ${t("journey.title", lang)}`), h("h1", {}, t("report.title", lang)), h("p", { class: "sub" }, t("report.intro", lang)),
    viewBar("report", lang),
    goalRingsChart(allRecs(), lang),
    items.length && repCompact ? compactBody : items.length ? h("div", { "data-view": "full" },
      sec("report.decisions", s.decisions.length ? h("ul", { style: "padding-inline-start:20px" }, ...s.decisions.map((x) => h("li", { "data-decision": "1" }, x))) : h("p", { class: "muted" }, t("report.empty", lang))),
      sec("report.amounts", s.amountCount ? valueEl(t("report.amountTotal", lang, { n: num(s.amountCount, lang), v: t("money.bdt", lang, { v: fmtNum(s.amountTotal, lang) }) }), "ESTIMATE", lang) : h("p", { class: "muted" }, t("report.empty", lang))),
      sec("report.durations", s.durationMinutes ? valueEl(t("report.minutes", lang, { m: fmtNum(s.durationMinutes, lang) }), "INFERENCE", lang) : h("p", { class: "muted" }, t("report.empty", lang))),
      sec("report.dates", s.dates.length ? h("div", {}, ...s.dates.map((d) => h("p", {}, valueEl(d, "DEMO", lang)))) : h("p", { class: "muted" }, t("report.empty", lang))),
      sec("report.entries", entries)) : h("p", { class: "muted" }, t("report.empty", lang)),
    disclaimers(lang));
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
  const log = (d: ReturnType<typeof diagnose>, helper: Helper) => putMode({ id: `stuck-${Date.now().toString(36)}`, entity: "stuck_log", ns: "demo", ownerId: "demo-user", schemaVersion: 1, createdAt: new Date().toISOString(),
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
          putMode({ id: `task-${Date.now().toString(36)}s`, entity: "task", ns: "demo", ownerId: "demo-user", schemaVersion: 1, createdAt: new Date().toISOString(),
            values: { "task.title": { state: "value", value: nm, label: "DEMO" }, "task.minutes": { state: "value", value: 5, label: "DEMO" }, "task.priority": { state: "value", value: "high", label: "DEMO" } } });
          log(d, hp); out.replaceChildren(h("p", { class: "ok-msg", "data-done": hp }, t("stuck.done.tiny_step", lang)), link("#/diary/plan", "btn ghost", t("plan.title", lang)));
        });
        return h("div", { class: "card" }, h("h2", { class: "card-h", }, t("stuck.h.tiny_step", lang)), h("label", { for: "stuck-step" }, t("stuck.stepName", lang)), name, msg, add);
      }
      const b = h("button", { class: "btn", type: "button", "data-helper": hp }, t(`stuck.h.${hp}` as Key, lang));
      b.addEventListener("click", () => { prefs.mode = hp; log(d, hp); out.replaceChildren(h("p", { class: "ok-msg", "data-done": hp }, t(`stuck.done.${hp}` as Key, lang)), link("#/diary/plan", "btn ghost", t("plan.title", lang))); });
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
    h("section", { class: "card", "data-card": "two_paths" }, h("h2", {}, t("stuck.two.h", lang)),
      h("ul", { style: "padding-inline-start:20px" }, h("li", {}, t("stuck.two.fun", lang)), h("li", {}, t("stuck.two.struggle", lang))),
      h("p", { class: "muted" }, t("stuck.two.note", lang))),
    h("section", { class: "card", "data-card": "effort_timing" }, h("h2", {}, t("stuck.timing.h", lang)), h("p", {}, t("stuck.timing.body", lang))),
    h("section", { class: "card", "data-card": "where_time_goes" }, h("h2", {}, t("stuck.time.h", lang)),
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
  return h("main", {}, link("#/more", "crumb", `← ${t("more.title", lang)}`), h("h1", {}, t("topics.title", lang)), h("p", { class: "sub" }, t("topics.intro", lang)),
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
const doneBtn = (taskId: string, lang: Locale) => h("button", { class: "btn ghost", type: "button", "data-act": "task-done", "data-task-id": taskId, style: "width:auto;margin:0;min-height:44px", onclick: () => markDone(taskId) }, t("reward.doneBtn", lang));

function pictureBlock(lang: Locale, opts: { newest?: boolean; milestone?: boolean } = {}): HTMLElement {
  const n = completedCount(); const k = Math.min(stageData().passed.length, 8);
  return h("div", {}, h("div", { class: "reward", "data-reward": "1" }, journeyArt(n, k, opts)),
    h("p", { class: "muted", "data-reward-text": "1" }, n ? t("reward.completed", lang, { n: num(n, lang), k: num(k, lang) }) : t("reward.empty", lang)), h("p", { class: "muted" }, t("reward.next", lang)));
}

export function rewardScreen(): HTMLElement {
  const lang = L(); let fresh = false; try { fresh = sessionStorage.getItem("tm:newStar") === "1"; sessionStorage.removeItem("tm:newStar"); } catch { /* ignore */ }
  const n = completedCount(); const ms = fresh ? milestoneAt(n) : null;
  return h("main", { class: "scr scr-reward" }, h("h1", {}, t("reward.title", lang)),
    fresh && n ? h("div", { class: "card", role: "status", "data-fresh": "1" }, celebrate("step", lang), ms ? h("h2", { class: "card-h",  "data-milestone": String(ms) }, t(`reward.ms${ms}` as Key, lang)) : null, h("p", { class: "ok-msg" }, t(`reward.m${messageIndex(n, 6)}` as Key, lang))) : null,
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
  store[ns].put({ id: `fs-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`, entity: "focus_session", ns, ownerId: ownerOf(ns), schemaVersion: 1, createdAt: new Date().toISOString(), links: { task: taskId },
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
    const adj = (d: number) => h("button", { class: "btn ghost", type: "button", style: "width:auto;margin:0", "data-adj": String(d), onclick: () => { s = Focus.adjust(s, d, Date.now()); saveFocus({ taskId: task.id, session: s }); draw(); } }, t(d > 0 ? "focus.plus" : "focus.minus", lang));
    const stop = h("button", { class: "btn ghost", type: "button", "data-act": "focus-stop" }, t("focus.stop", lang));
    stop.addEventListener("click", () => { const m = Focus.focusedMinutes(s, Date.now()); stopTimer(); saveFocus(null); if (s.phase === "focus") { recordFocus(task.id, m); if (m >= 1) prefs.lastFocusEnd = { at: Date.now(), minutes: m }; } else prefs.lastRestAt = Date.now(); refreshTotal(); body.replaceChildren(h("p", { class: "ok-msg", role: "status", "data-focus-stopped": "1" }, t("focus.stopped", lang, { m: num(m, lang) })), h("button", { class: "btn", type: "button", onclick: picker }, t("focus.again", lang))); });
    body.replaceChildren(h("h2", {}, t(s.phase === "focus" ? "focus.title" : "focus.restOn", lang)), h("div", { class: "stage" }, time, ring), h("div", { class: "row" }, adj(-5), adj(5)), pauseBtn, stop);
    draw(); stopTimer();
    timer = setInterval(() => { if (!document.getElementById("focus-root")) { stopTimer(); return; } if (Focus.isFinished(s, Date.now())) finish(s); else draw(); }, 1000);
  };
  const begin = (phase: Focus.Phase, minutes: number) => run(Focus.start(phase, minutes, Date.now()));
  root.append(link("#/today", "crumb", `← ${t("nav.today", lang)}`), h("h1", {}, t("focus.title", lang)), h("p", { class: "sub" }, title), h("p", { class: "muted" }, t("focus.intro", lang)), h("p", { class: "note", "data-focus-tip": "1" }, t("focus.tip", lang)), total, body, disclaimers(lang, ["noGuarantee"]));
  const saved = loadFocus();
  if (saved && saved.taskId === task.id) { if (Focus.isFinished(saved.session, Date.now())) finish(saved.session); else run(saved.session); } else picker();
  return root;
}
const focusBtn = (taskId: string, lang: Locale) => link(`#/focus/${taskId}`, "btn ghost", t("focus.link", lang));

// ---- habits ----
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
  store[ns].put({ id, entity: "habit_log", ns, ownerId: ownerOf(ns), schemaVersion: 1, createdAt: new Date().toISOString(), links: { habit: h0.id },
    values: { "habit_log.date": { state: "value", value: date, label: lb }, "habit_log.count": { state: "value", value: count, label: lb } } });
}
function removeHabit(id: string) {
  const hr = findRec(id); if (hr) storeOf(hr).delete(id);
  for (const r of allRecs()) if (r.entity === "habit_log" && r.links?.habit === id) storeOf(r).delete(r.id);
}

export function habitsScreen(): HTMLElement {
  const lang = L(); const { habits, logs } = habitsFromStore(); const today = Habits.todayIso();
  const wd = (i: number) => new Intl.DateTimeFormat(intlLocale(lang), { weekday: "short" }).format(new Date(2023, 0, 1 + i));
  const habitCompact = screenView("habits") === "compact";
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
      h("div", { class: "row" }, h("div", {}, nsTag(findRec(hb.id)?.ns ?? activeNs(), lang), h("h2", { class: "card-h", }, hb.title)), h("button", { class: "btn ghost", type: "button", style: "width:auto;margin:0;min-height:44px", onclick: () => { removeHabit(hb.id); rerender(); } }, t("habits.remove", lang))),
      main, dots, habitChart(hb, logs, today, lang),
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
  const form = h("form", { novalidate: true, "data-form": "habit" }, gate, h("label", { for: "hb-name" }, t("habits.name", lang)), name, h("label", {}, t("habits.days", lang)), chips,
    h("label", { for: "hb-target" }, t("habits.target", lang)), target, h("label", { for: "hb-unit" }, t("habits.unit", lang)), unit, err, h("button", { class: "btn", type: "submit" }, t("habits.save", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault(); err.textContent = ""; const nm = name.value.trim(); if (!nm) return;
    if (!checkFreeText(nm).ok || !checkFreeText(unit.value).ok) { err.textContent = t("intake.secretRejected", lang); return; }
    const raw = target.value.trim().replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6)); let tv: FieldValue | null = null;
    if (raw !== "") { const n = Number(raw); if (!Number.isFinite(n) || n <= 0 || n > 1000) { err.textContent = t("intake.invalidNumber", lang); return; } tv = typed(Math.round(n)); }
    if (!saveTyped({ id: `habit-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`, entity: "habit", createdAt: new Date().toISOString(),
      values: { "habit.title": typed(nm), "habit.days": typed([...chosen].sort().join(",")), ...(tv ? { "habit.target": tv, "habit.unit": typed(unit.value.trim()) } : {}) } })) { err.textContent = saveBlockedText(lang); return; }
    rerender();
  });
  return h("main", {}, link("#/today", "crumb", `← ${t("nav.today", lang)}`), h("h1", {}, t("habits.title", lang)), h("p", { class: "sub" }, t("habits.intro", lang)),
    viewBar("habits", lang),
    ...(cards.length ? (habitCompact ? [h("ul", { class: "list-compact", "data-view": "compact" }, ...cards)] : cards) : [h("p", { class: "muted" }, t("habits.empty", lang))]), h("p", { class: "muted" }, t("habits.tip", lang)), h("h2", {}, t("habits.add", lang)), form, disclaimers(lang, ["noGuarantee"]));
}

// ---- flashcards ----
function cardsFromStore(): Cards.Card[] {
  const g = (r: TMRecord, k: string) => (r.values[k] as { value?: unknown } | undefined)?.value;
  return allRecs().filter((r) => r.entity === "card" && r.values["card.front"]?.state === "value").sort((a, b) => a.id.localeCompare(b.id))
    .map((r) => ({ id: r.id, front: String(g(r, "card.front")), back: String(g(r, "card.back") ?? ""), box: Number(g(r, "card.box") ?? 1), due: String(g(r, "card.due") ?? Habits.todayIso()) }));
}
const putCard = (c: Cards.Card) => putMode({ id: c.id, entity: "card", ns: "demo", ownerId: "demo-user", schemaVersion: 1, createdAt: new Date().toISOString(),
  values: { "card.front": { state: "value", value: c.front, label: "DEMO" }, "card.back": { state: "value", value: c.back, label: "DEMO" }, "card.box": { state: "value", value: c.box, label: "DEMO" }, "card.due": { state: "value", value: c.due, label: "DEMO" } } });

export function cardsScreen(): HTMLElement {
  const lang = L(); const today = Habits.todayIso(); const all = cardsFromStore(); const queue = Cards.dueCards(all, today);
  const study = h("div", { role: "status" });
  const showCard = (i: number) => {
    if (i >= queue.length) { study.replaceChildren(h("p", { class: "ok-msg", "data-cards-done": "1" }, t("cards.done", lang))); return; }
    const c = queue[i]!; const ans = h("div", { class: "card", hidden: true, "data-answer": "1" }, h("p", {}, c.back));
    const reveal = h("button", { class: "btn", type: "button", "data-act": "card-show" }, t("cards.show", lang));
    const grade = (knew: boolean) => h("button", { class: knew ? "btn" : "btn ghost", type: "button", "data-act": knew ? "card-knew" : "card-not", onclick: () => { putCard(Cards.review(c, knew, today)); showCard(i + 1); } }, t(knew ? "cards.knew" : "cards.notyet", lang));
    const row = h("div", { hidden: true, "data-grade": "1" }, grade(true), grade(false));
    reveal.addEventListener("click", () => { ans.hidden = false; row.hidden = false; reveal.hidden = true; });
    study.replaceChildren(h("div", { class: "card", "data-card-front": c.id }, h("h2", { class: "card-h", }, c.front)), ans, reveal, row);
  };
  const go = h("button", { class: "btn", type: "button", "data-act": "cards-study", onclick: () => showCard(0) }, t("cards.study", lang));
  const front = h("input", { id: "cd-front", type: "text", maxlength: "120", autocomplete: "off" }) as HTMLInputElement; const back = h("input", { id: "cd-back", type: "text", maxlength: "200", autocomplete: "off" }) as HTMLInputElement;
  const err = h("p", { class: "err", role: "alert" });
  const form = h("form", { novalidate: true, "data-form": "card" }, h("label", { for: "cd-front" }, t("cards.front", lang)), front, h("label", { for: "cd-back" }, t("cards.back", lang)), back, err, h("button", { class: "btn", type: "submit" }, t("cards.save", lang)));
  form.addEventListener("submit", (ev) => { ev.preventDefault(); err.textContent = ""; const f1 = front.value.trim(), b1 = back.value.trim(); if (!f1 || !b1) return;
    if (!checkFreeText(f1).ok || !checkFreeText(b1).ok) { err.textContent = t("intake.secretRejected", lang); return; }
    putCard(Cards.newCard(`card-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`, f1, b1, today)); rerender(); });
  const boxes = Cards.byBox(all);
  return h("main", {}, link("#/more/topics", "crumb", `← ${t("topics.title", lang)}`), h("h1", {}, t("cards.title", lang)), h("p", { class: "sub" }, t("cards.intro", lang)),
    all.length ? h("div", {}, h("p", { "data-cards-due": String(queue.length) }, valueEl(queue.length ? t("cards.due", lang, { n: num(queue.length, lang) }) : t("cards.none", lang), "INFERENCE", lang)), ...(queue.length ? [go] : []), study,
      h("h2", { class: "card-h", }, t("cards.boxes", lang)), h("div", { class: "seg", role: "img", "aria-label": boxes.join(", ") }, ...boxes.map((n, i) => h("span", { class: "tag" }, `${num(i + 1, lang)}: ${num(n, lang)}`)))) : h("p", { class: "muted" }, t("cards.empty", lang)),
    h("h2", {}, t("cards.add", lang)), form, ...all.map((c) => h("div", { class: "card", "data-card": c.id }, h("div", { class: "row" }, h("span", {}, c.front), h("button", { class: "btn ghost", type: "button", style: "width:auto;margin:0;min-height:44px", onclick: () => { store[activeNs()].delete(c.id); rerender(); } }, t("cards.remove", lang))))), disclaimers(lang));
}

// ---- screens ----
function todayFromPlan(cp: ReturnType<typeof currentPlan>, lang: Locale): HTMLElement[] {
  const acts = todaysActions(cp.plan, new Date().getDay());
  if (!acts.length) return [h("p", { class: "muted", "data-today": "none" }, t("home.today.none", lang), " ", link("#/diary/plan", "crumb", t("home.today.open", lang)))];
  if (screenView("today") === "compact") return [h("ul", { class: "list-compact", "data-view": "compact" }, ...acts.map((p) => h("li", { "data-placement": p.taskId },
    valueEl(`${fmtClock(p.start)}–${fmtClock(p.end)}`, labelFor(findRec(p.taskId)?.ns ?? activeNs()), lang), " · ", h("strong", {}, cp.titles.get(p.taskId) ?? ""), " ", doneBtn(p.taskId, lang), focusBtn(p.taskId, lang))))];
  return acts.map((p, i) => h("div", { class: "task", "data-placement": p.taskId }, h("b", {}, num(i + 1, lang)),
    h("div", {}, cp.titles.get(p.taskId) ?? "", h("p", {}, valueEl(`${fmtClock(p.start)}–${fmtClock(p.end)}`, labelFor(findRec(p.taskId)?.ns ?? activeNs()), lang)), h("div", { class: "row" }, doneBtn(p.taskId, lang), focusBtn(p.taskId, lang)))));
}

export function today(): HTMLElement {
  const lang = L(); const cp = currentPlan();
  const insp = todaysInspiration(new Date());
  const curStage = Math.min(currentIndex(stageData().passed), STAGES.length - 1);
  const stage = stagesFor(prefs.stageTemplate)[curStage]!;
  const nxt = nextStep(loadAnswers());
  const rungs = h("ul", { class: "rungs", role: "img", "aria-label": t("home.rungs", lang, { done: num(curStage, lang), total: num(STAGES.length, lang), now: num(curStage + 1, lang) }) },
    ...STAGES.map((_, i) => h("li", { class: i < curStage ? "done" : i === curStage ? "now" : "" })));
  return h("main", { class: "scr scr-today" },
    h("p", { class: "muted" }, activeNs() === "real" ? todayIso() : valueEl(tb(DEMO_DATE, lang), "DEMO", lang)),
    h("h1", {}, t("home.title", lang)),
    h("aside", { class: `card inspire ${insp.theme}`, "aria-label": "Inspiration" },
      h("span", { class: "chip" }, `${THEME_LABEL[insp.theme].bn} · ${THEME_LABEL[insp.theme].en}`),
      h("p", { class: "inspire-bn" }, insp.bn), h("p", { class: "muted inspire-en" }, insp.en)),
    h("p", { class: "sub" }, t("home.step", lang), " — ", valueEl(t("stage.progress", lang, { now: num(curStage + 1, lang), total: num(STAGES.length, lang) }), activeNs() === "real" ? "ESTIMATE" : "DEMO", lang)),
    h("section", { class: "stage", "aria-label": t("home.stage", lang) },
      h("small", {}, `${t("home.stage", lang)} · ${tb(stage.name, lang)}`),
      h("div", { class: "n" }, num(curStage + 1, lang), h("span", { style: "font-size:22px;color:var(--muted)" }, ` / ${num(STAGES.length, lang)}`)),
      rungs),
    h("h2", {}, t("home.tasks", lang)),
    viewBar("today", lang),
    ...(cp.hasTasks ? todayFromPlan(cp, lang) : activeNs() === "real" ? [h("p", { class: "muted", "data-empty-real": "1" }, t("mode.today.empty", lang))] : screenView("today") === "compact" ? [h("ul", { class: "list-compact", "data-view": "compact" }, ...DEMO_TASKS.slice(0, 3).map((k) => h("li", {}, h("strong", {}, tb(k.title, lang)), " · ", valueEl(t("task.minutes", lang, { n: num(k.minutes, lang) }), "DEMO", lang))))] : DEMO_TASKS.slice(0, 3).map((k, i) => h("div", { class: "task" }, h("b", {}, num(i + 1, lang)),
      h("div", {}, tb(k.title, lang), h("p", {}, valueEl(t("task.minutes", lang, { n: num(k.minutes, lang) }), "DEMO", lang), " · ", tb(k.hint, lang)))))),
    h("div", { class: "actions" },
      link("#/diary/intake", "cta", t("home.start", lang)),
      link("#/habits", "btn ghost", t("habits.link", lang)),
      link("#/stuck", "btn ghost", t("stuck.link", lang)),
      link("#/capture", "btn ghost", t("capture.link", lang))),
    nxt.field ? h("aside", { class: "card next-step", "data-next-step": nxt.field.id }, h("small", {}, "→ "), h("p", {}, t("home.next", lang, { field: tb(nxt.field.label, lang) }))) : null,
    rulesTodayCard(lang),
    disclaimers(lang));
}

// O6: stage-name template chooser. Names only; codes, order and past passes are never changed.
function templatePicker(lang: Locale): HTMLElement {
  const cur = prefs.stageTemplate;
  const seg = (id: TemplateId) => h("button", { type: "button", "data-tpl": id, "aria-pressed": String(cur === id), onclick: () => { prefs.stageTemplate = id; rerender(); } }, tb(TEMPLATES[id].name, lang));
  return h("section", { class: "card", "data-card": "stage_templates" }, h("h2", { class: "card-h", }, t("stage.tpl.h", lang)),
    h("div", { class: "seg", role: "group", "aria-label": t("stage.tpl.h", lang) }, ...TEMPLATE_IDS.map(seg)),
    h("p", { class: "muted" }, t("stage.tpl.note", lang)));
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
    s.focusUnknown > 0 ? h("p", { class: "muted" }, t("review.unknownFocus", lang, { n: num(s.focusUnknown, lang) })) : null,
    h("p", { class: "muted" }, t("review.quiet", lang)),
    disclaimers(lang));
}

export function journey(): HTMLElement {
  const lang = L();
  return h("main", { class: "scr scr-journey" },
    h("h1", {}, t("journey.title", lang)),
    passedBanner(lang),
    stagePanel(lang),
    h("div", { class: "actions" },
      link("#/journey/art", "btn ghost", t("reward.see", lang)),
      link("#/journey/log", "btn ghost", t("log.link", lang)),
      link("#/journey/horizon", "btn ghost", t("horizon.link", lang)),
      link("#/journey/report", "btn ghost", t("report.link", lang)),
      link("#/journey/review", "btn ghost", t("review.link", lang)),
      link("#/journey/risks", "btn ghost", t("risk.link", lang)),
      link("#/journey/history", "btn ghost", t("hist.link", lang)),
      link("#/journey/northstar", "btn ghost", t("ns.link", lang))),
    journeyGoalsCard(lang),
    templatePicker(lang),
    viewBar("journey", lang),
    stageLadder(lang),
    h("h2", {}, t("journey.slots", lang)),
    ...MODULES.filter((m) => m.tab === "journey").map((m) => moduleCard(m, lang)),
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
    h("p", { class: "sub" }, t("diary.intro", lang)),
    h("section", { class: "card", "aria-label": t("diary.completeness", lang) },
      h("h2", { class: "card-h", }, t("diary.completeness", lang), " ", valueEl(`${num(c.pct, lang)}%`, "INFERENCE", lang)),
      h("div", { class: "bar", role: "img", "aria-label": `${c.pct}%` }, h("i", { style: `width:${c.pct}%` })),
      h("p", { class: "muted" }, t("diary.completeness.detail", lang, { filled: num(c.filled, lang), total: num(c.total, lang), addressed: num(c.addressed, lang) }))),
    h("section", { class: "card", "data-next": "1" }, h("h2", { class: "card-h", }, t("diary.next", lang)), h("p", {}, nextText)),
    link("#/diary/intake", "cta", t("diary.start", lang)),
    link("#/diary/plan", "btn ghost", t("plan.title", lang)),
    link("#/diary/money", "btn ghost", t("money.title", lang)),
    link("#/diary/ventures", "btn ghost", t("ven.link", lang)),
    link("#/diary/team", "btn ghost", t("team.link", lang)),
    h("h2", {}, t("diary.modules", lang)),
    ...MODULES.filter((m) => m.tab === "diary").map((m) => moduleCard(m, lang)),
    disclaimers(lang));
}

function inputFor(f: FieldDef, lang: Locale, cur: FieldValue | undefined): { el: HTMLElement; read: () => FieldValue | null | "invalid" | "secret" } {
  const unkSel = h("select", { "aria-label": t("intake.valueFor", lang), "data-role": "state" },
    h("option", { value: "value" }, t("intake.valueFor", lang)),
    ...f.unknownStates.map((u) => h("option", { value: u }, t(`unknown.${u}` as Key, lang))));
  if (cur && cur.state !== "value") unkSel.value = cur.state;
  let input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  const curVal = cur && cur.state === "value" ? String(cur.value) : "";
  if (f.options) {
    input = h("select", { id: `f-${f.id}` }, h("option", { value: "" }, t("intake.choose", lang)), ...f.options.map((o) => h("option", { value: o.code }, tb(o.label, lang))));
  } else if (f.type === "number" || f.type === "money") {
    input = h("input", { id: `f-${f.id}`, type: "text", inputmode: "decimal" });
  } else if (f.type === "date") {
    input = h("input", { id: `f-${f.id}`, type: "date" });
  } else {
    input = h("input", { id: `f-${f.id}`, type: "text", maxlength: /\.(note|entry|evidence)$/.test(f.id) ? "200" : "80", autocomplete: "off" });
  }
  input.value = curVal;
  const el = h("div", {}, input, f.unknownStates.length ? h("div", { class: "unk" }, unkSel) : null);
  const read = (): FieldValue | null | "invalid" | "secret" => {
    const st = f.unknownStates.length ? (unkSel.value as UnknownState | "value") : "value";
    if (st !== "value") return { state: st };
    const raw = input.value.trim();
    if (raw === "") return null; // left blank → stays unanswered (never 0)
    if (f.type === "number" || f.type === "money") {
      const n = Number(raw.replace(/,/g, "").replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6)));
      return Number.isFinite(n) ? { state: "value", value: n, label: "DEMO" } : "invalid";
    }
    if (f.type === "text") { if (!checkFreeText(raw).ok) return "secret"; }
    return { state: "value", value: raw, label: "DEMO" };
  };
  return { el, read };
}

const SUGGESTABLE = new Set(["interest.topic", "skill.name", "strength.name", "value.name", "goal.title"]);

/** Inline option cards: nothing is sent until the user taps the search button (consent). */
function suggestPanel(f: FieldDef, lang: Locale, getInput: () => HTMLInputElement): HTMLElement {
  const box = h("div", { class: "suggest", "data-suggest": f.id });
  const out = h("div", { role: "status" });
  // O7 own options: saved on this phone per field (cap 20, oldest removed), shown above the search button.
  const ownBox = h("div", { "data-own-list": f.id });
  const renderOwn = () => {
    const list = ownOptions(store.demo, f.id);
    ownBox.replaceChildren(...(list.length ? [h("p", { class: "muted" }, t("suggest.ownList", lang)),
      ...list.map((text) => h("button", { class: "btn ghost", type: "button", "data-own-option": f.id, onclick: () => { getInput().value = text; out.replaceChildren(); getInput().focus(); } }, text))] : []));
  };
  renderOwn();
  const saveNote = h("p", { class: "muted", role: "status" });
  const saveOwn = h("button", { class: "btn ghost", type: "button", "data-act": "suggest-save-own", onclick: () => {
    const res = saveOwnOption(store.demo, f.id, getInput().value, new Date());
    saveNote.textContent = res === "empty" ? t("suggest.empty", lang) : res === "secret" ? t("suggest.secret", lang) : t("suggest.ownSaved", lang);
    if (res === "saved" || res === "duplicate_updated") renderOwn();
  } }, t("suggest.saveOwn", lang));
  const go = h("button", { class: "btn ghost", type: "button", "data-act": "suggest-go" }, t("suggest.go", lang));
  go.addEventListener("click", async () => {
    const input = getInput(); const q = input.value.trim();
    if (!q) { out.replaceChildren(h("p", { class: "err" }, t("suggest.empty", lang))); return; }
    const safe = safeQuery(q);
    if (!safe) { out.replaceChildren(h("p", { class: "err" }, t("suggest.secret", lang))); return; }
    out.replaceChildren(h("p", { class: "muted" }, t("suggest.loading", lang)));
    const wasSaved = savedSearchResults(store.demo, f.id, safe).length >= 2;
    const r = await research(safe, true, { provider: wikipedia(lang === "en" ? "en" : "bn"), online: () => navigator.onLine, cached: (qq) => savedSearchResults(store.demo, f.id, qq) });
    // M11 (owner, 24 Oct): the first successful search is saved on this phone right away, so the same term works offline later.
    if (r.status === "options" && !wasSaved) saveSearchResults(store.demo, f.id, safe, r.options, new Date());
    const cards = r.options.map((o) => h("div", { class: "card", "data-option": o.id },
      h("h2", { class: "card-h", }, o.title), h("p", { class: "muted" }, o.snippet),
      h("p", { class: "muted" }, t("suggest.source", lang, { s: o.sourceName, d: o.fetchedAt.slice(0, 10) })),
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
      h("label", { for: `f-${f.id}` }, tb(f.label, lang), " ", h("span", { class: "tag" }, t(`requirement.${f.requirement}` as Key, lang))),
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
function togglePrayerMark(day: string, k: PrayerKey) {
  const id = prayerLogId(day, k);
  if (store[activeNs()].get(id)) store[activeNs()].delete(id);
  else putMode(prayerLogRecord(day, k, new Date().toISOString()));
}

function toggleFastMark(day: string) {
  const id = fastLogId(day);
  if (store[activeNs()].get(id)) store[activeNs()].delete(id);
  else putMode(fastLogRecord(day, new Date().toISOString()));
}

/** M13 fasting mark for today (Dhaka date). Only the date is kept; nothing is counted. */
function fastCard(lang: Locale): HTMLElement {
  const day = isoDate(dhakaNow(Date.now()).date);
  const marked = isFastMarked(allRecs(), day);
  return h("div", { class: "card", "data-fast": day },
    h("h2", { class: "card-h" }, t("deen.fast.title", lang)),
    h("p", { class: "muted" }, t("deen.fast.hint", lang)),
    h("button", { class: marked ? "btn" : "btn ghost", type: "button", "data-act": "fast-mark", "aria-pressed": String(marked),
      onclick: () => { toggleFastMark(day); rerender(); } }, marked ? t("deen.fast.marked", lang) : t("deen.fast.mark", lang)),
    h("p", { class: "note" }, t("deen.fast.note", lang)));
}

function prayerTimesCard(lang: Locale): HTMLElement {
  const now = dhakaNow(Date.now()); const day = isoDate(now.date);
  const times = prayerTimes(now.date, prefs.prayerCoords);
  const marked = markedOn(allRecs(), day);
  return h("div", { class: "card", "data-prayer-times": day },
    h("h2", { class: "card-h" }, t("deen.prayer.title", lang)),
    h("p", { class: "muted" }, day),
    h("p", { class: "muted" }, t("deen.prayer.hint", lang)),
    ...PRAYER_KEYS.map((k) => {
      const at = times[k]; const isMarked = marked.has(k);
      const passedNotMarked = at !== null && now.minute >= at && !isMarked;
      return h("div", { class: "row", "data-prayer-row": k },
        h("span", {}, h("strong", {}, t(`deen.prayer.name.${k}` as Key, lang)), " ", h("span", { "data-prayer-time": k }, prayerClock(at) ?? t("deen.prayer.none", lang)),
          ...(passedNotMarked ? [h("br"), h("span", { class: "muted", "data-prayer-pending": k }, t("deen.prayer.notYet", lang))] : [])),
        h("button", { class: isMarked ? "btn" : "btn ghost", type: "button", "data-act": "prayer-mark", "data-prayer": k, "aria-pressed": String(isMarked), style: "width:auto;margin:0;min-height:44px",
          ...(at === null ? { disabled: true } : {}), onclick: () => { togglePrayerMark(day, k); rerender(); } }, isMarked ? t("deen.prayer.marked", lang) : t("deen.prayer.mark", lang)));
    }),
    h("p", { class: "note", "data-prayer-note": "1" }, t("deen.prayer.note", lang)));
}

function prayerSettingsCard(lang: Locale): HTMLElement {
  const coords = prefs.prayerCoords; const alerts = parseAlertPrefs(prefs.prayerAlerts);
  const err = h("p", { class: "err", role: "alert" });
  const lat = h("input", { id: "pr-lat", type: "text", inputmode: "decimal", autocomplete: "off", value: String(coords.lat) }) as HTMLInputElement;
  const lon = h("input", { id: "pr-lon", type: "text", inputmode: "decimal", autocomplete: "off", value: String(coords.lon) }) as HTMLInputElement;
  const save = (c: { lat: number; lon: number }) => { prefs.prayerCoords = c; rerender(); };
  const form = h("form", { novalidate: true, "data-form": "prayer-place" },
    h("label", { for: "pr-lat" }, t("deen.set.lat", lang)), lat,
    h("label", { for: "pr-lon" }, t("deen.set.lon", lang)), lon, err,
    h("button", { class: "btn", type: "submit" }, t("deen.set.save", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const la = parseCoord(lat.value, 90), lo = parseCoord(lon.value, 180);
    if (la === null || lo === null) { err.textContent = t("deen.set.locErr", lang); return; }
    save({ lat: la, lon: lo });
  });
  const dhaka = h("button", { class: "btn ghost", type: "button", "data-act": "prayer-dhaka", style: "width:auto;margin:6px 0 0;min-height:44px", onclick: () => save({ ...DHAKA_COORDS }) }, t("deen.set.dhaka", lang));
  const onOff = (label: Key, active: boolean, on: () => void) => h("button", { type: "button", "aria-pressed": String(active), onclick: on }, t(label, lang));
  const setAlerts = (next: typeof alerts) => { prefs.prayerAlerts = next; rerender(); };
  const toggle = (key: "preAlert" | "azan") => (on: boolean) => {
    const next = { ...alerts, [key]: on };
    // Asking for permission needs a tap, so it happens right here when the user switches an alert on.
    if (on && typeof Notification !== "undefined" && Notification.permission === "default") { try { void Notification.requestPermission().finally(() => setAlerts(next)); return; } catch { /* fall through */ } }
    setAlerts(next);
  };
  const mins = h("input", { id: "pr-min", type: "number", min: "1", max: "60", step: "1", inputmode: "numeric", value: String(alerts.preMinutes), "aria-label": t("deen.set.preMin", lang), style: "width:6em" }) as HTMLInputElement;
  mins.addEventListener("change", () => { const n = Number(mins.value); setAlerts({ ...alerts, preMinutes: Number.isInteger(n) && n >= 1 && n <= 60 ? n : DEFAULT_ALERT_PREFS.preMinutes }); });
  const perm = typeof Notification === "undefined" ? t("deen.set.permNo", lang) : canNotify() ? t("deen.set.permOk", lang) : Notification.permission === "denied" ? t("deen.set.permNo", lang) : t("deen.set.permAsk", lang);
  return h("div", { class: "card", "data-prayer-settings": "1" },
    h("h2", { class: "card-h" }, t("deen.set.title", lang)),
    h("h3", {}, t("deen.set.place", lang)),
    form, dhaka,
    h("h3", {}, t("deen.set.pre", lang)),
    h("div", { class: "row" }, h("div", { class: "seg", "data-pre-alert": String(alerts.preAlert) }, onOff("deen.set.off", !alerts.preAlert, () => setAlerts({ ...alerts, preAlert: false })), onOff("deen.set.on", alerts.preAlert, () => toggle("preAlert")(true)))),
    h("label", { for: "pr-min" }, t("deen.set.preMin", lang)), mins,
    h("h3", {}, t("deen.set.azan", lang)),
    h("div", { class: "row" }, h("div", { class: "seg", "data-azan-alert": String(alerts.azan) }, onOff("deen.set.off", !alerts.azan, () => setAlerts({ ...alerts, azan: false })), onOff("deen.set.on", alerts.azan, () => toggle("azan")(true)))),
    h("p", { class: "muted" }, t("deen.set.defaultNote", lang)),
    h("p", { class: "muted", "data-perm": "1" }, perm),
    h("p", { class: "muted" }, t("deen.set.lock", lang)));
}

export function deen(): HTMLElement {
  const lang = L();
  const ents = ENTITIES.filter((e) => e.module === "M13");
  return h("main", { class: "scr scr-deen" },
    h("h1", {}, t("deen.title", lang)),
    h("p", { class: "sub" }, t("deen.intro", lang)),
    h("p", { class: "muted" }, t("deen.control", lang)),
    fastCard(lang),
    prayerTimesCard(lang),
    prayerSettingsCard(lang),
    ...ents.map((e) => {
      const fs = FIELDS.filter((f) => f.entity === e.id);
      return h("div", { class: "card", "data-entity": e.id },
        h("div", { class: "row" }, h("h2", { class: "card-h", }, tb(e.name, lang)), h("span", { class: "tag ok" }, t("deen.private", lang))),
        h("p", { class: "muted" }, t("deen.fields", lang, { n: num(fs.length, lang) }), " · ", t("access.device_only_per_item_authorisation", lang)),
        ...fs.map((f) => fieldHelp(f, lang)));
    }),
    ...MODULES.filter((m) => m.tab === "deen").map((m) => moduleCard(m, lang)),
    disclaimers(lang, ["noFatwa", "noGuarantee"]));
}

/** Design version chooser: radio cards with a small swatch. Adding a version in themes.ts adds a card here. */
function designCard(lang: Locale): HTMLElement {
  return h("fieldset", { class: "card design-pick", "data-design-pick": "" },
    h("legend", { class: "card-h" }, t("more.design", lang)),
    h("p", { class: "muted" }, t("more.design.desc", lang)),
    ...DESIGNS.map((d) => h("label", { class: "design-opt", "data-design-opt": d.id },
      h("input", { type: "radio", name: "design", value: d.id, checked: prefs.design === d.id, onchange: () => { prefs.design = d.id; applyPrefs(); rerender(); } }),
      h("span", { class: "design-sw", "aria-hidden": "true" }, ...d.swatch.map((c) => h("i", { style: `background:${c}` }))),
      h("span", { class: "design-txt" }, h("strong", {}, t(d.label, lang)), h("span", { class: "muted" }, t(d.desc, lang))))),
    h("p", { class: "muted" }, t("more.design.note", lang)));
}

export function more(): HTMLElement {
  const lang = L();
  const seg = (label: string, active: boolean, on: () => void) => h("button", { type: "button", "aria-pressed": String(active), onclick: on }, label);
  const items: Array<[string, Key, Key]> = [["#/topics", "topics.title", "topics.intro"], ["#/more/status", "more.status", "more.status.desc"], ["#/more/fields", "more.fields", "more.fields.desc"], ["#/more/glossary", "more.glossary", "more.glossary.desc"], ["#/more/safety", "more.safety", "more.safety.desc"], ["#/more/data", "more.data", "more.data.desc"], ["#/more/connections", "more.connections", "more.connections.desc"], ["#/more/library", "more.library", "more.library.desc"], ["#/more/rules", "more.rules", "more.rules.desc"]];
  return h("main", { class: "scr scr-more" },
    h("h1", {}, t("more.title", lang)),
    ...items.map(([href, k, d]) => link(href, "card link", h("h2", { class: "card-h", }, t(k, lang)), h("p", { class: "muted" }, t(d, lang)))),
    h("h2", {}, t("more.display", lang)),
    h("div", { class: "card" }, h("h2", { class: "card-h", }, t("more.language", lang)),
      h("div", { class: "seg" }, ...LOCALE_ORDER.map((c) => seg(LOCALES[c].endonym, prefs.lang === c, () => { prefs.lang = c; applyPrefs(); rerender(); })))),
    h("div", { class: "card" }, h("h2", { class: "card-h", }, t("more.theme", lang)),
      h("div", { class: "seg" }, ...(["auto", "light", "dark"] as const).map((c) => seg(t(`more.theme.${c}` as Key, lang), prefs.theme === c, () => { prefs.theme = c; applyPrefs(); rerender(); })))),
    designCard(lang),
    h("div", { class: "card" }, h("h2", { class: "card-h", }, t("more.textsize", lang)),
      h("div", { class: "seg" }, ...[100, 125, 150, 200].map((c) => seg(`${num(c, lang)}%`, prefs.scale === c, () => { prefs.scale = c; applyPrefs(); rerender(); })))),
    h("div", { class: "card", "data-lock-settings": "" }, h("h2", { class: "card-h", }, t("more.lock", lang)),
      h("p", { class: "muted" }, t("more.lock.desc", lang)),
      ...NOTIFY_CATEGORIES.map((c) => {
        const shown = prefs.notifyShow[c] === true;
        const setTo = (on: boolean) => () => { const cur = { ...prefs.notifyShow, [c]: on }; prefs.notifyShow = cur; rerender(); };
        return h("div", { class: "row", "data-lock-cat": c },
          h("span", {}, t(`privacy.${c}` as Key, lang)),
          h("div", { class: "seg" }, seg(t("more.lock.hide", lang), !shown, setTo(false)), seg(t("more.lock.show", lang), shown, setTo(true))));
      }),
      h("p", { class: "muted" }, t("more.lock.preview", lang, { text: notifyText(NEUTRAL_TITLE, lang) }))),
    h("h2", {}, t("more.modules", lang)),
    ...MODULES.filter((m) => m.tab === "more" && m.id !== "M22").map((m) => moduleCard(m, lang)),
    disclaimers(lang, ["noGuarantee", "advice"]));
}

export function status(): HTMLElement {
  const lang = L();
  return h("main", {},
    link("#/more", "crumb", `← ${t("more.title", lang)}`),
    h("h1", {}, t("cap.title", lang)),
    h("p", { class: "sub" }, t("cap.intro", lang)),
    h("div", { class: "tags" }, ...CAP_STATUSES.map((s) => capTag(s, lang))),
    ...MODULES.map((m) => moduleCard(m, lang)),
    disclaimers(lang));
}

export function fieldsGuide(): HTMLElement {
  const lang = L();
  return h("main", {},
    link("#/more", "crumb", `← ${t("more.title", lang)}`),
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
    link("#/more", "crumb", `← ${t("more.title", lang)}`),
    h("h1", {}, t("safety.title", lang)),
    h("div", { class: "card" }, h("p", {}, t("safety.never", lang))),
    h("div", { class: "card" }, h("p", {}, t("safety.demo", lang))),
    h("div", { class: "card" }, h("p", {}, t("safety.deen", lang))),
    disclaimers(lang, ["noGuarantee", "advice", "noFatwa"]));
}

// Data screen state. Clear-all is two taps (ask, then confirm); the flags live only for this page view.
let realClearAsk = false;
let realClearDone = false;
let consentMissingTick = false;

function consentCard(lang: Locale): HTMLElement {
  return h("div", { class: "card", "data-consent": "real" },
    h("h2", { class: "card-h" }, t("data.consent.title", lang)),
    h("p", {}, t("data.consent.p1", lang)),
    h("p", {}, t("data.consent.p2", lang)),
    h("p", {}, t("data.consent.p3", lang)),
    h("p", {}, t("data.consent.p4", lang)),
    h("label", { style: "display:flex;gap:8px;align-items:center;margin:8px 0" },
      h("input", { type: "checkbox", id: "consent-tick", style: "width:24px;margin:0" }), t("data.consent.tick", lang)),
    h("button", { class: "btn", type: "button", "data-act": "consent", onclick: () => {
      const tick = document.getElementById("consent-tick") as HTMLInputElement | null;
      if (!tick?.checked) { consentMissingTick = true; rerender(); return; }
      consentMissingTick = false;
      grantConsent(consentKv, new Date().toISOString());
      rerender();
    } }, t("data.consent.btn", lang)),
    consentMissingTick ? h("p", { class: "err", role: "alert" }, t("data.consent.needTick", lang)) : null);
}

function clearRealCard(lang: Locale): HTMLElement {
  const kids: Array<Node | string> = [h("h2", { class: "card-h" }, t("data.clearReal", lang))];
  if (!realClearAsk) {
    kids.push(h("button", { class: "btn ghost", type: "button", "data-act": "clear-real", onclick: () => { realClearAsk = true; realClearDone = false; rerender(); } }, t("data.clearReal", lang)));
  } else {
    kids.push(h("p", { role: "alert" }, t("data.clearReal.ask", lang)), h("p", { class: "muted" }, t("data.clearReal.note", lang)),
      h("button", { class: "btn", type: "button", "data-act": "clear-real-yes", onclick: () => {
        store.real.clear();            // real records only; demo is untouched
        revokeConsent(consentKv);      // next real entry needs a new tick
        realClearAsk = false; realClearDone = true; rerender();
      } }, t("data.clearReal.yes", lang)),
      h("button", { class: "btn ghost", type: "button", "data-act": "clear-real-no", onclick: () => { realClearAsk = false; rerender(); } }, t("data.clearReal.no", lang)));
  }
  if (realClearDone && !realClearAsk) kids.push(h("p", { role: "status" }, t("data.clearReal.done", lang)));
  return h("div", { class: "card", "data-clear": "real" }, ...kids);
}

let demoClearAsk = false;
/** Delete only the demo entries: two taps (ask, then confirm). Real data is never touched. */
function clearDemoBlock(lang: Locale): HTMLElement {
  if (!demoClearAsk) return h("button", { class: "btn ghost", type: "button", "data-act": "clear-demo", onclick: () => { demoClearAsk = true; rerender(); } }, t("data.clearDemo", lang));
  return h("div", { class: "card", role: "alert", "data-clear": "demo" }, h("p", {}, t("data.clearDemo.ask", lang)),
    h("button", { class: "btn", type: "button", "data-act": "clear-demo-yes", onclick: () => { store.demo.clear(); demoClearAsk = false; rerender(); } }, t("data.clearDemo.yes", lang)),
    h("button", { class: "btn ghost", type: "button", "data-act": "clear-demo-no", onclick: () => { demoClearAsk = false; rerender(); } }, t("mode.del.cancel", lang)));
}

export function dataScreen(): HTMLElement {
  const lang = L();
  const realOn = readConsent(consentKv);
  return h("main", {},
    link("#/more", "crumb", `← ${t("more.title", lang)}`),
    h("h1", {}, t("data.title", lang)),
    modeSwitchCard(),
    h("div", { class: "card", "data-ns": "real" }, h("h2", { class: "card-h", }, t("data.real", lang)), h("p", {}, t("data.real.count", lang, { n: num(store.real.list().length, lang) })), h("p", { class: "muted" }, t(realOn ? "data.real.on" : "data.real.locked", lang))),
    realOn ? null : consentCard(lang),
    clearRealCard(lang),
    h("div", { class: "card", "data-ns": "demo" }, h("h2", { class: "card-h", }, t("data.demo", lang), " ", demoBadge(lang)), h("p", {}, t("data.demo.count", lang, { n: num(store.demo.list().length, lang) }))),
    h("p", { class: "muted" }, t("data.nopromote", lang)),
    clearDemoBlock(lang),
    h("h2", {}, t("backup.title", lang)),
    h("p", { class: "muted" }, t("backup.note", lang)),
    h("button", { class: "btn", type: "button", "data-act": "backup", onclick: async () => {
      const b = await createBackup(new StoreRepo(store), "demo");
      const a = h("a", { href: URL.createObjectURL(new Blob([JSON.stringify(b)], { type: "application/json" })), download: `tm-demo-backup-${b.createdAt.slice(0, 10)}.json` });
      document.body.append(a); a.click(); a.remove();
    } }, t("backup.save", lang)),
    h("label", { class: "btn ghost", style: "cursor:pointer" }, t("backup.restore", lang),
      h("input", { type: "file", accept: "application/json,.json", "data-act": "restore", class: "sr-only", onchange: async (e: Event) => {
        const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
        const out = document.getElementById("backup-msg")!;
        try { const n = await restoreBackup(new StoreRepo(store), await f.text()); out.className = "ok-msg"; out.textContent = t("backup.ok", lang, { n: num(n, lang) }); }
        catch (err) { out.className = "err"; out.textContent = t("backup.bad", lang, { why: (err as Error).message }); }
      } })),
    h("p", { id: "backup-msg", role: "status" }),
    encBackupCard(lang),
    disclaimers(lang));
}

export function glossary(): HTMLElement {
  const lang = L();
  return h("main", {},
    link("#/more", "crumb", `← ${t("more.title", lang)}`),
    h("h1", {}, t("glossary.title", lang)),
    h("p", { class: "sub" }, t("glossary.unreviewed", lang)),
    ...GLOSSARY.map((g) => h("div", { class: "card", "data-term": g.id },
      h("div", { class: "row" }, h("h2", { class: "card-h", }, tb(g.term, lang)), h("span", { class: "tag warn" }, t("glossary.tag", lang))),
      h("p", {}, tb(g.meaning, lang)))),
    disclaimers(lang, ["noFatwa"]));
}

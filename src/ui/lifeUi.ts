// Step 5 screens: life wheel, goal list with progress, SMART guide and SWOT card, micro-animations.
// Everything reads and writes the active mode only (allRecs / findRec / saveTyped). Unknown is shown as unknown, never as zero.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { prefs, readProgressMemory, writeProgressMemory } from "./state";
import { withView } from "./viewBar";
import { num } from "./components";
import { allRecs, consentOn, consentPrompt, entryNs, findRec, labelFor, nsTag, saveBlockedText, saveTyped, storeOf } from "./entry";
import { AREAS, MAX_RATING, lifeAreaRecord, wedgePath, wheelData, type Area } from "../core/lifeWheel";
import { smartFunnel } from "./smartFunnel";
import { SMART_PARTS, SWOT_KEYS, goalProgress, listValue, milestoneOf, parseList, readList, smartFilled, swotField, type GoalProgress, type SwotKey } from "../core/goalPlan";
import { goalWeighting, overallProgress, nextProgressMemory, progressTrend } from "../core/overallProgress";
import { planChip } from "./planSettings";
import { checkFreeText } from "../core/safety";
import { GOAL_STATUSES, goalStatusOf, withGoalStatus, type GoalStatus } from "../core/goalStatus";
import { goalAreaCard } from "./universeUi";
import { GOAL_KINDS, buildTree, eligibleParents, flatten, nodeById, validateGoalText, validatePlace, type GoalKind, type PlaceError, type TreeNode } from "../core/goalTree";
import { fieldById } from "../catalog/fields";
import { tb } from "../i18n/t";
import { progressRing } from "./ring";
import { goalChips } from "./goalLinks";
import { goalDeleteCard } from "./goalDelete";
import { habitLines } from "../core/habitGoals";
import { goalIdsOf } from "../core/taskGoals";
import { linkStats } from "../core/goalPlan";
import { planByTag } from "./backwardUi";
import { HORIZONS } from "../core/horizon";
import type { FieldValue, TMRecord } from "../core/types";

const L = () => prefs.lang;
const link = (href: string, cls: string, ...kids: Array<Node | string>) => h("a", { href, class: cls }, ...kids);
const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
const NS = "http://www.w3.org/2000/svg";
type A = Record<string, string | number>;
function s<K extends keyof SVGElementTagNameMap>(tag: K, attrs: A = {}, ...kids: Array<Node | string | null>): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  for (const c of kids) if (c !== null) el.append(typeof c === "string" ? document.createTextNode(c) : c);
  return el;
}
const areaName = (a: Area, lang: Locale) => t(`wheel.area.${a}` as Key, lang);

// ---- micro-animations (CSS only; every animation is behind prefers-reduced-motion: no-preference) ----
/** A small tick (step done) or ring pulse (goal milestone). Decorative: the meaning is always in the text next to it. */
export function celebrate(kind: "step" | "milestone", lang: Locale): HTMLElement {
  const svg = s("svg", { viewBox: "0 0 48 48", class: `mm mm-${kind}`, "aria-hidden": "true", focusable: "false", "data-mm": kind },
    s("circle", { cx: 24, cy: 24, r: 18, class: "mm-ring", fill: "none" }),
    kind === "step" ? s("path", { d: "M14 25 l7 7 l13 -15", class: "mm-tick", fill: "none", pathLength: 1 })
      : s("path", { d: "M24 12 l3.5 8 l8.5 .8 l-6.5 5.6 l2 8.4 l-7.5 -4.5 l-7.5 4.5 l2 -8.4 l-6.5 -5.6 l8.5 -.8 z", class: "mm-star" }));
  return h("span", { class: "mm-wrap" }, svg, h("span", { class: "sr-only" }, t(kind === "step" ? "mm.stepDone" : "mm.milestone", lang)));
}

// ---- Life wheel ----
export function wheelScreen(): HTMLElement { return withView("wheel", L(), wheelScreenInner()); }
function wheelScreenInner(): HTMLElement {
  const lang = L(); const d = wheelData(allRecs());
  const title = t("wheel.title", lang);
  const lines = d.areas.map((a) => (a.rating === null ? t("wheel.lineUnknown", lang, { area: areaName(a.area, lang) }) : t("wheel.line", lang, { area: areaName(a.area, lang), n: num(a.rating, lang) })));
  const summary = d.rated ? `${t("wheel.summary", lang, { r: num(d.rated, lang), t: num(AREAS.length, lang), u: num(d.unknown, lang) })} ${lines.join(". ")}.` : t("wheel.none", lang);
  const CX = 180, CY = 160, R = 90, n = AREAS.length;
  const svg = s("svg", { viewBox: "0 0 360 320", class: "chart-svg wheel-svg", role: "img", "aria-label": title, focusable: "false", "data-wheel": "1" }, s("title", {}, title), s("desc", {}, summary));
  for (let k = 1; k <= MAX_RATING; k++) svg.append(s("circle", { cx: CX, cy: CY, r: (R * k) / MAX_RATING, class: "wheel-guide", fill: "none" }));
  d.areas.forEach((a, i) => {
    const mid = ((i + 0.5) / n) * 2 * Math.PI - Math.PI / 2;
    if (a.rating === null) {
      svg.append(s("path", { d: wedgePath(CX, CY, R, i, n), class: "wheel-unk", "stroke-dasharray": "4 3", "data-unknown": a.area }),
        s("text", { x: CX + R * 0.6 * Math.cos(mid), y: CY + R * 0.6 * Math.sin(mid) + 4, class: "chart-t chart-mid" }, "?"));
    } else svg.append(s("path", { d: wedgePath(CX, CY, (R * a.rating) / MAX_RATING, i, n), class: "wheel-w", "data-area": a.area, "data-level": a.rating }));
    const lx = CX + (R + 14) * Math.cos(mid), ly = CY + (R + 14) * Math.sin(mid) + 4;
    svg.append(s("text", { x: lx, y: ly, class: `chart-s ${Math.cos(mid) > 0.3 ? "" : Math.cos(mid) < -0.3 ? "chart-end" : "chart-mid"}` }, areaName(a.area, lang)));
  });
  const err = h("p", { class: "err", role: "alert" });
  const save = (area: Area, rating: number | null) => {
    if (!saveTyped(lifeAreaRecord(area, rating, new Date().toISOString()))) { err.textContent = saveBlockedText(lang); return; }
    rerender();
  };
  const rows = d.areas.map((a) => h("div", { class: "wheel-row", "data-wheel-area": a.area },
    h("p", { class: "wheel-name" }, areaName(a.area, lang)),
    h("div", { class: "seg", role: "group", "aria-label": t("wheel.pick", lang, { area: areaName(a.area, lang) }) },
      ...Array.from({ length: MAX_RATING }, (_, k) => k + 1).map((v) => h("button", { type: "button", "data-set": String(v), "aria-pressed": String(a.rating === v), onclick: () => save(a.area, v) }, num(v, lang))),
      h("button", { type: "button", "data-set": "unknown", "aria-pressed": String(a.answered && a.rating === null), onclick: () => save(a.area, null) }, t("wheel.unknownBtn", lang)))));
  return h("main", {}, link("#/journey", "crumb", `← ${t("journey.title", lang)}`), h("h1", {}, title), h("p", { class: "sub" }, t("wheel.intro", lang)),
    consentOn() ? null : consentPrompt(lang),
    h("section", { class: "card chart", "data-chart": "wheel" }, h("h2", { class: "card-h" }, title), svg,
      h("p", { class: "sr-only", "data-chart-summary": "wheel" }, summary),
      d.rated ? null : h("p", { class: "muted", "data-wheel-none": "1" }, t("wheel.none", lang)),
      h("details", { class: "help", "data-chart-text": "wheel" }, h("summary", {}, t("chart.showText", lang)), h("ul", { class: "chart-lines" }, ...lines.map((l) => h("li", {}, l))))),
    h("div", { class: "card" }, h("p", { class: "muted" }, t("wheel.hint", lang)), ...rows, err),
    h("p", { class: "muted" }, t("wheel.note", lang)));
}

// ---- Goal progress text (Journey, goal list, goal page) ----
export const progressLine = (g: GoalProgress, lang: Locale): string =>
  g.mode === "manual" ? (g.percent === null ? t("goals.progressUnknownManual", lang, { title: g.title }) : t("goals.progressManual", lang, { title: g.title, p: num(g.percent, lang) }))
  : g.percent === null ? t("goals.progressUnknown", lang, { title: g.title }) : t("goals.progress", lang, { title: g.title, p: num(g.percent, lang), d: num(g.done, lang), n: num(g.total, lang) });

/** Journey card: one line per goal of the active mode with its progress (unknown when no task is linked). */
export function journeyGoalsCard(lang: Locale): HTMLElement {
  const recs = allRecs(); const list = goalProgress(recs); const ns = new Map(recs.map((r) => [r.id, r.ns] as const));
  return h("section", { class: "card", "data-journey-goals": "1" }, h("h2", { class: "card-h" }, t("goals.title", lang)),
    list.length
      ? h("ul", { class: "list-compact" }, ...list.map((g) => h("li", { "data-journey-goal": g.id, "data-percent": g.percent === null ? "unknown" : String(g.percent) }, nsTag(ns.get(g.id) ?? "demo", lang), " ", link(`#/journey/goal/${g.id}`, "crumb", progressLine(g, lang)))))
      : h("p", { class: "muted" }, t("goals.none", lang)),
    h("div", { class: "actions" }, link("#/journey/goals", "btn ghost", t("goals.link", lang)), link("#/journey/wheel", "btn ghost", t("wheel.link", lang))));
}

// ---- Goal tree (M06): Goal -> Sub-goal -> Project; steps (tasks) are added on the Plan screen and linked to any of them ----
const kindLabel = (k: GoalKind, lang: Locale) => t(`gt.kind.${k}` as Key, lang);
const MAIN_FORM = "goal-new";
/** Percent text for a branch: pooled steps of the goal and everything under it. */
function branchLine(n: TreeNode, lang: Locale): string {
  if (n.mode === "manual") return n.branch.percent === null ? t("gt.branch.manualUnknown", lang) : t("gt.branch.manual", lang, { p: num(n.branch.percent, lang) });
  if (n.branch.percent === null) return t("gt.branch.unknown", lang);
  return n.children.length ? t("gt.branch.pooled", lang, { p: num(n.branch.percent, lang), d: num(n.branch.done, lang), n: num(n.branch.total, lang) }) : t("gt.branch.own", lang, { p: num(n.branch.percent, lang), d: num(n.branch.done, lang), n: num(n.branch.total, lang) });
}
const placeErrText = (e: PlaceError, lang: Locale) => t(`gt.err.${e}` as Key, lang);

function treeView(roots: TreeNode[], lang: Locale): HTMLElement {
  const item = (n: TreeNode): HTMLElement => h("li", { "data-tree-node": n.id, "data-kind": n.kind, "data-depth": String(n.depth), "data-tree-percent": n.branch.percent === null ? "unknown" : String(n.branch.percent) },
    nsTag(n.ns, lang), " ", h("span", { class: "tag off" }, kindLabel(n.kind, lang)), " ", link(`#/journey/goal/${n.id}`, "crumb", n.title),
    n.orphan ? h("span", { class: "muted", "data-orphan": "1" }, ` ${t("gt.orphan", lang)}`) : null,
    h("p", { class: "muted" }, branchLine(n, lang), n.metricLabel ? ` · ${t("gt.metric.shown", lang, { m: n.metricLabel })}` : ""),
    n.branch.percent === null ? null : h("div", { class: "bar", role: "img", "aria-label": branchLine(n, lang) }, h("i", { style: `width:${n.branch.percent}%` })),
    n.children.length ? h("ul", { class: "plain gt-children" }, ...n.children.map(item)) : null);
  return h("section", { class: "card", "data-goal-tree": String(flatten(roots).length), "aria-label": t("gt.title", lang) },
    h("h2", { class: "card-h" }, t("gt.title", lang)), h("p", { class: "muted" }, t("gt.intro", lang)),
    roots.length ? h("ul", { class: "plain" }, ...roots.map(item)) : h("p", { class: "muted" }, t("goals.none", lang)));
}

function newGoalForm(lang: Locale): HTMLElement {
  const title = h("input", { id: "gn-title", type: "text", maxlength: "120", autocomplete: "off" });
  const kind = h("select", { id: "gn-kind" }, ...GOAL_KINDS.map((k) => h("option", { value: k }, kindLabel(k, lang))));
  const parent = h("select", { id: "gn-parent" });
  const metric = h("input", { id: "gn-metric", type: "text", maxlength: "80", autocomplete: "off" });
  // Per-goal weighting: the choice starts on the device setting (Settings > Plan), so a new goal behaves as the person already chose.
  const weight = h("select", { id: "gn-weight" }, ...(["equal", "size"] as const).map((m) => h("option", { value: m, ...(prefs.progressMode === m ? { selected: true } : {}) }, t(m === "size" ? "overall.mode.size" : "overall.mode.equal", lang)))) as HTMLSelectElement;
  const date = h("input", { id: "gn-date", type: "date" });
  const err = h("p", { class: "err", role: "alert" });
  const fillParents = () => {
    const k = kind.value as GoalKind; const opts = eligibleParents(allRecs(), k);
    parent.replaceChildren(h("option", { value: "" }, t("gt.parent.none", lang)), ...opts.map((o) => h("option", { value: o.id }, `${kindLabel(o.kind, lang)} · ${o.title}`)));
    parent.disabled = k === "goal";
  };
  kind.addEventListener("change", fillParents); fillParents();
  const form = h("form", { novalidate: true, "data-form": MAIN_FORM }, consentOn() ? null : consentPrompt(lang),
    h("label", { for: "gn-title" }, t("gt.title.label", lang)), title,
    h("label", { for: "gn-kind" }, tb(fieldById("goal.kind")!.label, lang)), kind,
    h("label", { for: "gn-parent" }, t("gt.parent.label", lang)), parent,
    h("label", { for: "gn-metric" }, tb(fieldById("goal.metric_label")!.label, lang)), metric,
    h("label", { for: "gn-weight" }, tb(fieldById("goal.weighting")!.label, lang)), weight,
    h("label", { for: "gn-date" }, tb(fieldById("goal.target_date")!.label, lang)), date, err,
    h("button", { class: "btn", type: "submit" }, t("gt.add", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault(); err.textContent = "";
    if (!checkFreeText(title.value).ok || !checkFreeText(metric.value).ok) { err.textContent = t("intake.secretRejected", lang); return; }
    const k = kind.value as GoalKind; const pid = k === "goal" ? null : parent.value || null;
    const bad = validateGoalText({ title: title.value, metric: metric.value }) ?? validatePlace(allRecs(), { kind: k, parentId: pid });
    if (bad) { err.textContent = placeErrText(bad, lang); return; }
    if (date.value && !validDate(date.value)) { err.textContent = t("intake.invalidNumber", lang); return; }
    const typed = (value: unknown): FieldValue => ({ state: "value", value, label: "FACT" });
    const values: Record<string, FieldValue> = { "goal.title": typed(title.value.trim()), "goal.kind": typed(k), "goal.weighting": typed(weight.value === "size" ? "size" : "equal") };
    if (metric.value.trim()) values["goal.metric_label"] = typed(metric.value.trim());
    if (date.value) values["goal.target_date"] = typed(date.value);
    const id = `goal-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    if (!saveTyped({ id, entity: "goal", createdAt: new Date().toISOString(), values, ...(pid ? { links: { parent: pid } } : {}) })) { err.textContent = saveBlockedText(lang); return; }
    rerender();
  });
  return h("section", { class: "card" }, h("h2", { class: "card-h" }, t("gt.add.title", lang)), form);
}

export function goalsScreen(): HTMLElement { return withView("goals", L(), goalsScreenInner()); }
/** One card per top-level goal: its own tree opens from here. Ordered by title, never by progress. */
function rootCard(n: TreeNode, recs: readonly TMRecord[], lang: Locale): HTMLElement {
  const steps = new Set(n.stepIds); const goals = new Set(recs.filter((r) => r.entity === "goal").map((r) => r.id));
  const shared = recs.filter((r) => r.entity === "task" && steps.has(r.id) && goalIdsOf(r).filter((x) => goals.has(x) && !flatten([n]).some((m) => m.id === x)).length > 0).length;
  const pc = n.branch.percent;
  const text = pc === null ? t("gl.card.unknown", lang) : t("gl.card.steps", lang, { d: num(n.branch.done, lang), n: num(n.branch.total, lang) });
  return h("article", { class: "card", "data-root-goal": n.id, "data-percent": pc === null ? "unknown" : String(pc) }, nsTag(n.ns, lang),
    h("h2", { class: "card-h" }, n.title),
    h("div", { class: "pr-row" }, progressRing(pc, `${n.title}: ${text}`, pc === 100), h("p", {}, pc === null ? text : `${num(pc, lang)}% · ${text}`)),
    shared ? h("p", { class: "muted", "data-shared": String(shared) }, t("gl.card.shared", lang, { n: num(shared, lang) })) : null,
    link(`#/journey/goal/${n.id}`, "btn ghost", t("gl.card.open", lang)));
}

function goalsScreenInner(): HTMLElement {
  const lang = L(); const recs = allRecs();
  const roots = buildTree(recs); const byId = new Map(recs.filter((r) => r.entity === "goal").map((g) => [g.id, g] as const));
  const active = roots.filter((r) => goalStatusOf(byId.get(r.id)!) === "active"), quiet = roots.filter((r) => goalStatusOf(byId.get(r.id)!) !== "active");
  const st = linkStats(recs);
  return h("main", {}, link("#/journey", "crumb", `← ${t("journey.title", lang)}`), h("h1", {}, t("goals.title", lang)), h("p", { class: "sub" }, t("goals.intro", lang)),
    overallProgressCard(lang, "journey"),
    link("#/journey/backward", "btn ghost", t("bw.link", lang)),
    st.steps ? h("p", { class: "muted", "data-link-stats": "1" }, t("gl.ov.fact", lang, { n: num(st.steps, lang), s: num(st.shared, lang), u: num(st.unlinked, lang) }), " ", t("gl.ov.note", lang)) : null,
    ...active.map((n) => rootCard(n, recs, lang)),
    st.unlinked ? h("a", { href: "#/diary/plan", class: "card link", "data-unlinked-card": String(st.unlinked) }, h("p", {}, t("gl.unlinked", lang, { n: num(st.unlinked, lang) }))) : null,
    quiet.length ? h("details", { class: "card", "data-quiet-goals": String(quiet.length) }, h("summary", { style: "min-height:44px" }, t("gl.paused.row", lang, { n: num(quiet.length, lang) })),
      ...quiet.map((n) => h("div", { "data-root-goal": n.id }, h("strong", {}, n.title), " ", h("span", { class: "tag off" }, t(`gl.status.${goalStatusOf(byId.get(n.id)!)}` as Key, lang)), " ", link(`#/journey/goal/${n.id}`, "crumb", t("gl.card.open", lang))))) : null,
    roots.length ? null : h("p", { class: "muted" }, t("goals.none", lang)),
    treeView(roots, lang),
    newGoalForm(lang));
}

// ---- One goal: steps grouped by node (the goal, then each part). A shared step appears under every goal it serves, with an "Also" chip. ----
function habitRows(n: TreeNode, recs: readonly TMRecord[], lang: Locale): HTMLElement[] {
  const d = new Date(); const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return habitLines(recs, new Set([n.id]), today).map((x) => h("p", { class: "muted", "data-goal-habit": x.id },
    !x.started ? t("gl.habit.none", lang, { title: x.title }) : x.planned === 0 ? t("gl.habit.noplan", lang, { title: x.title }) : t("gl.habit.week", lang, { title: x.title, d: num(x.done, lang), p: num(x.planned, lang) })));
}

function stepsCard(rec: TMRecord, lang: Locale): HTMLElement {
  const recs = allRecs(); const node = nodeById(buildTree(recs), rec.id)!; const all = recs.filter((r) => r.entity === "task");
  const doneOf = (r: TMRecord) => r.values["task.done_on"]?.state === "value";
  const block = (n: TreeNode) => {
    const mine = all.filter((r) => r.values["task.not_true_on"]?.state !== "value" && goalIdsOf(r).includes(n.id)).sort((a, b) => a.id.localeCompare(b.id));
    return h("div", { "data-steps-of": n.id }, h("h3", {}, n.depth === 0 ? n.title : `${"· ".repeat(n.depth)}${n.title}`),
      ...habitRows(n, recs, lang),
      mine.length ? h("ul", { class: "plain" }, ...mine.map((r) => h("li", { "data-step": r.id }, h("strong", {}, textOf(r, "task.title")), doneOf(r) ? h("span", { class: "tag ok" }, ` ${t("gl.steps.done", lang)}`) : null, " ", planByTag(r, lang), " ", goalChips(r, lang, recs, { exclude: n.id, prefix: "gl.also" }))))
        : h("p", { class: "muted" }, t("gl.steps.none", lang)));
  };
  return h("section", { class: "card", "data-goal-steps": rec.id }, h("h2", { class: "card-h" }, t("gl.steps.title", lang)), ...flatten([node]).map(block),
    link(`#/journey/backward/${rec.id}`, "btn ghost", t("bw.link", lang)));
}

// ---- One goal: progress, SMART guide, SWOT card ----
const textOf = (r: TMRecord, f: string): string => { const v = r.values[f]; return v && v.state === "value" && typeof v.value === "string" ? v.value : ""; };
const typedFor = (r: TMRecord, value: unknown): FieldValue => ({ state: "value", value, label: labelFor(r.ns) });
const validDate = (x: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(x) && !Number.isNaN(Date.parse(x)) && new Date(x).toISOString().slice(0, 10) === x;

// TM-REQ-009: active / paused / retired. Paused and retired goals give no reminders; their history stays on this page.
function statusCard(rec: TMRecord, lang: Locale): HTMLElement {
  const cur = goalStatusOf(rec);
  const seg = (st: GoalStatus) => h("button", { type: "button", "data-goal-status": st, "aria-pressed": String(cur === st), onclick: () => {
    if (!consentOn() && rec.ns === "real") return;
    const latest = findRec(rec.id); if (!latest) return;
    storeOf(latest).put(withGoalStatus(latest, st)); rerender();
  } }, t(`goal.status.${st}` as Key, lang));
  return h("section", { class: "card", "data-goal-status-card": cur }, h("h2", { class: "card-h" }, t("goal.status.h", lang)),
    h("div", { class: "seg", role: "group", "aria-label": t("goal.status.h", lang) }, ...GOAL_STATUSES.map(seg)),
    h("p", { class: "muted" }, t("goal.status.note", lang)));
}

// Where this goal sits in the tree, what it is made of, and how to change its level, parent and the way it is measured.
function placeCard(rec: TMRecord, lang: Locale): HTMLElement {
  const roots = buildTree(allRecs()); const node = nodeById(roots, rec.id)!;
  const parentNode = node.parentId ? nodeById(roots, node.parentId) : null;
  const kind = h("select", { id: "gp-kind" }, ...GOAL_KINDS.map((k) => h("option", { value: k, ...(node.kind === k ? { selected: true } : {}) }, kindLabel(k, lang))));
  const parent = h("select", { id: "gp-parent" });
  const metric = h("input", { id: "gp-metric", type: "text", maxlength: "80", autocomplete: "off", value: node.metricLabel ?? "" });
  const err = h("p", { class: "err", role: "alert" }), ok = h("p", { class: "ok-msg", role: "status", "data-saved": "place" });
  const fill = () => {
    const k = kind.value as GoalKind; const opts = eligibleParents(allRecs(), k, rec.id);
    parent.replaceChildren(h("option", { value: "" }, t("gt.parent.none", lang)), ...opts.map((o) => h("option", { value: o.id, ...(o.id === node.parentId ? { selected: true } : {}) }, `${kindLabel(o.kind, lang)} · ${o.title}`)));
    parent.disabled = k === "goal";
  };
  kind.addEventListener("change", fill); fill();
  const form = h("form", { novalidate: true, "data-form": "goal-place" },
    h("label", { for: "gp-kind" }, tb(fieldById("goal.kind")!.label, lang)), kind, h("label", { for: "gp-parent" }, t("gt.parent.label", lang)), parent,
    h("label", { for: "gp-metric" }, tb(fieldById("goal.metric_label")!.label, lang)), metric, err, ok,
    h("button", { class: "btn ghost", type: "submit", style: "width:auto;margin:0;min-height:44px" }, t("gt.save", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault(); err.textContent = ""; ok.textContent = "";
    if (!entryNs()) { err.textContent = saveBlockedText(lang); return; }
    if (!checkFreeText(metric.value).ok) { err.textContent = t("intake.secretRejected", lang); return; }
    const cur = findRec(rec.id); if (!cur) return;
    const k = kind.value as GoalKind; const pid = k === "goal" ? null : parent.value || null;
    const bad = validateGoalText({ title: "x", metric: metric.value }) ?? validatePlace(allRecs(), { kind: k, parentId: pid, selfId: cur.id });
    if (bad) { err.textContent = placeErrText(bad, lang); return; }
    const values = { ...cur.values, "goal.kind": typedFor(cur, k) } as Record<string, FieldValue>;
    if (metric.value.trim()) values["goal.metric_label"] = typedFor(cur, metric.value.trim()); else if (values["goal.metric_label"]) values["goal.metric_label"] = { state: "unknown" };
    const { parent: _p, ...rest } = cur.links ?? {}; const links = pid ? { ...rest, parent: pid } : rest;
    const { links: _l, ...base } = cur;
    storeOf(cur).put({ ...base, values, ...(Object.keys(links).length ? { links } : {}) } as TMRecord);
    ok.textContent = t("gt.saved", lang); rerender();
  });
  return h("section", { class: "card", "data-goal-place": node.kind },
    h("h2", { class: "card-h" }, t("gt.place.title", lang)),
    h("p", {}, kindLabel(node.kind, lang), parentNode ? " · " : null, parentNode ? `${t("gt.partof", lang)} ` : null, parentNode ? link(`#/journey/goal/${parentNode.id}`, "crumb", parentNode.title) : null, !parentNode && node.orphan ? ` · ${t("gt.orphan", lang)}` : null),
    h("p", { class: "muted", "data-branch": node.branch.percent === null ? "unknown" : String(node.branch.percent) }, branchLine(node, lang)),
    node.metricLabel ? h("p", { "data-metric-label": "1" }, t("gt.metric.shown", lang, { m: node.metricLabel })) : null,
    node.children.length ? h("div", {}, h("h3", {}, t("gt.parts", lang)), h("ul", { class: "plain", "data-parts": String(node.children.length) }, ...node.children.map((c) => h("li", { "data-part": c.id }, kindLabel(c.kind, lang), " · ", link(`#/journey/goal/${c.id}`, "crumb", c.title), h("span", { class: "muted" }, ` · ${branchLine(c, lang)}`))))) : null,
    form);
}

export function goalScreen(id: string): HTMLElement {
  const lang = L(); const back = link("#/journey/goals", "crumb", `← ${t("goals.back", lang)}`);
  const rec = findRec(id);
  if (!rec || rec.entity !== "goal" || !textOf(rec, "goal.title")) return h("main", {}, back, h("h1", {}, t("goals.title", lang)), h("p", { class: "muted", "data-goal-missing": "1" }, t("goals.notFound", lang)));
  const gp = goalProgress(allRecs()).find((g) => g.id === id)!;
  const ms = milestoneOf(gp.percent);
  const gate = consentOn() ? null : consentPrompt(lang);
  const progress = h("section", { class: "card", "data-goal-progress": gp.percent === null ? "unknown" : String(gp.percent) }, nsTag(rec.ns, lang), h("h2", { class: "card-h" }, t("goal.progress", lang)),
    gp.percent === null ? h("p", { class: "muted" }, t("goal.progress.unknown", lang))
      : h("div", {}, h("div", { class: "pr-row" }, progressRing(gp.percent, t("goal.progress.known", lang, { p: num(gp.percent, lang), d: num(gp.done, lang), n: num(gp.total, lang) }), ms !== null),
          h("p", {}, t("goal.progress.known", lang, { p: num(gp.percent, lang), d: num(gp.done, lang), n: num(gp.total, lang) }))),
        h("div", { class: "bar", role: "img", "aria-label": t("goal.progress.known", lang, { p: num(gp.percent, lang), d: num(gp.done, lang), n: num(gp.total, lang) }) }, h("i", { style: `width:${gp.percent}%` }))),
    ms ? h("p", { class: "ok-msg", role: "status", "data-milestone": String(ms) }, celebrate("milestone", lang), " ", t(`goal.ms.${ms}` as Key, lang)) : null,
    gp.mode !== "manual" && gp.percent !== null ? h("p", { class: "muted", "data-goal-more": "1" }, t("overall.more", lang), " ", link("#/diary/plan", "crumb", t("overall.addMore", lang))) : null);

  // SMART
  const inp = (idv: string, f: string) => h("input", { id: idv, type: "text", value: textOf(rec, f), maxlength: "160", autocomplete: "off" });
  const sp = inp("sm-s", "goal.smart_specific"), me = inp("sm-m", "goal.success"), ac = inp("sm-a", "goal.smart_achievable"), re = inp("sm-r", "goal.why");
  const hz = h("select", { id: "sm-h" }, h("option", { value: "" }, t("smart.horizon.none", lang)), ...HORIZONS.map((k) => h("option", { value: k, ...(textOf(rec, "goal.horizon") === k ? { selected: true } : {}) }, t(`horizon.${k}` as Key, lang))));
  const dt = h("input", { id: "sm-d", type: "date", value: textOf(rec, "goal.target_date") });
  const smartErr = h("p", { class: "err", role: "alert" }), smartOk = h("p", { class: "ok-msg", role: "status", "data-saved": "smart" });
  const filledEl = h("p", { class: "muted", "data-smart-filled": "1" });
  const funnelHost = h("div", { "data-smart-funnel-host": "1" });
  const paintFilled = (r: TMRecord) => { const f = smartFilled(r); funnelHost.replaceChildren(smartFunnel(f, lang)); filledEl.textContent = t("smart.filled", lang, { n: num(SMART_PARTS.filter((p) => f[p]).length, lang) }); };
  paintFilled(rec);
  const smartForm = h("form", { class: "card", novalidate: true, "data-form": "smart" }, h("h2", { class: "card-h" }, t("smart.title", lang)), h("p", { class: "muted" }, t("smart.intro", lang)), funnelHost, gate,
    h("label", { for: "sm-s" }, t("smart.s", lang)), sp, h("label", { for: "sm-m" }, t("smart.m", lang)), me, h("label", { for: "sm-a" }, t("smart.a", lang)), ac,
    h("label", { for: "sm-r" }, t("smart.r", lang)), re, h("label", { for: "sm-h" }, `${t("smart.t", lang)} ${t("smart.horizon", lang)}`), hz, h("label", { for: "sm-d" }, t("smart.date", lang)), dt,
    filledEl, smartErr, smartOk, h("button", { class: "btn", type: "submit" }, t("smart.save", lang)));
  smartForm.addEventListener("submit", (ev) => {
    ev.preventDefault(); smartErr.textContent = ""; smartOk.textContent = "";
    if (!consentOn()) { smartErr.textContent = saveBlockedText(lang); return; }
    const cur = findRec(id); if (!cur) return;
    const texts: Array<[string, string]> = [["goal.smart_specific", sp.value], ["goal.success", me.value], ["goal.smart_achievable", ac.value], ["goal.why", re.value]];
    for (const [, v] of texts) if (v.trim() && !checkFreeText(v).ok) { smartErr.textContent = t("intake.secretRejected", lang); return; }
    const date = dt.value.trim(); if (date && !validDate(date)) { smartErr.textContent = t("intake.invalidNumber", lang); return; }
    const values = { ...cur.values };
    const put = (f: string, v: string) => { if (v) values[f] = typedFor(cur, v); else if (values[f]) values[f] = { state: "unknown" }; };
    for (const [f, v] of texts) put(f, v.trim());
    put("goal.horizon", hz.value); put("goal.target_date", date);
    const next = { ...cur, values }; storeOf(cur).put(next); paintFilled(next); smartOk.textContent = t("smart.saved", lang);
  });

  // SWOT
  const boxes = SWOT_KEYS.map((k) => ({ k, area: h("textarea", { id: `sw-${k}`, rows: "4", "aria-label": t(`swot.${k}` as Key, lang), "data-swot": k }) }));
  for (const b of boxes) b.area.value = (readList(rec.values[swotField(b.k)]) ?? []).join("\n");
  const swotErr = h("p", { class: "err", role: "alert" }), swotOk = h("p", { class: "ok-msg", role: "status", "data-saved": "swot" });
  const swotForm = h("form", { class: "card", novalidate: true, "data-form": "swot" }, h("h2", { class: "card-h" }, t("swot.title", lang)), h("p", { class: "muted" }, t("swot.intro", lang)), gate,
    ...boxes.flatMap((b) => [h("label", { for: `sw-${b.k}` }, t(`swot.${b.k}` as Key, lang)), b.area]), swotErr, swotOk, h("button", { class: "btn", type: "submit" }, t("swot.save", lang)));
  swotForm.addEventListener("submit", (ev) => {
    ev.preventDefault(); swotErr.textContent = ""; swotOk.textContent = "";
    if (!consentOn()) { swotErr.textContent = saveBlockedText(lang); return; }
    const cur = findRec(id); if (!cur) return;
    const lists = boxes.map((b) => [b.k, parseList(b.area.value)] as [SwotKey, string[]]);
    for (const [, items] of lists) for (const it of items) if (!checkFreeText(it).ok) { swotErr.textContent = t("intake.secretRejected", lang); return; }
    const values = { ...cur.values };
    for (const [k, items] of lists) { const v = listValue(items); values[swotField(k)] = v.state === "value" ? { ...v, label: labelFor(cur.ns) } : v; }
    storeOf(cur).put({ ...cur, values });
    for (const [k, items] of lists) boxes.find((b) => b.k === k)!.area.value = items.join("\n");
    swotOk.textContent = t("swot.saved", lang);
  });
  // Read-only SWOT summary so the four lists are visible as text; unknown lists say so.
  const swotView = h("section", { class: "card", "data-swot-view": "1" }, h("h2", { class: "card-h" }, t("swot.title", lang)),
    h("div", { class: "swot-grid" }, ...SWOT_KEYS.map((k) => { const items = readList(rec.values[swotField(k)]); return h("div", { "data-swot-box": k }, h("h3", {}, t(`swot.${k}` as Key, lang)), items ? h("ul", {}, ...items.map((i) => h("li", {}, i))) : h("p", { class: "muted", "data-swot-empty": k }, t("swot.empty", lang))); })));
  return h("main", {}, back, h("h1", {}, textOf(rec, "goal.title")), progress, stepsCard(rec, lang), weightCard(rec, lang), placeCard(rec, lang), statusCard(rec, lang), goalAreaCard(rec, lang), smartForm, swotView, swotForm, goalDeleteCard(rec, lang));
}

// Weighting of this goal's steps: equal or by size. Changing it never changes the overall percent (each step is counted once there).
function weightCard(rec: TMRecord, lang: Locale): HTMLElement {
  const cur = goalWeighting(rec);
  const seg = (m: "equal" | "size") => h("button", { type: "button", "data-goal-weight": m, "aria-pressed": String(cur === m), onclick: () => {
    if (!entryNs()) return; const latest = findRec(rec.id); if (!latest) return;
    storeOf(latest).put({ ...latest, values: { ...latest.values, "goal.weighting": typedFor(latest, m) } }); rerender();
  } }, t(m === "size" ? "overall.mode.size" : "overall.mode.equal", lang));
  return h("section", { class: "card", "data-goal-weighting": cur }, h("h2", { class: "card-h" }, tb(fieldById("goal.weighting")!.label, lang)),
    h("div", { class: "seg", role: "group", "aria-label": tb(fieldById("goal.weighting")!.label, lang) }, seg("equal"), seg("size")),
    h("p", { class: "muted" }, t("gl.weight.note", lang)));
}

// ---- Overall progress card (Today and Journey) ----
/** One overall percent from the user's own tasks in the active mode. Unknown when there is no task. Never red, never a grade. */
export function overallProgressCard(lang: Locale, where: "today" | "journey"): HTMLElement {
  const recs = allRecs(); const mode = prefs.progressMode; const o = overallProgress(recs, mode);
  const key = `${recs.find((r) => r.entity === "task")?.ns ?? "none"}:${mode}`;
  const mem = nextProgressMemory(readProgressMemory(key), o.percent); writeProgressMemory(key, mem);
  const trend = progressTrend(mem.from, o.percent);
  const text = o.percent === null ? t("overall.unknown", lang)
    : t("overall.text", lang, { p: num(o.percent, lang), d: num(o.done, lang), n: num(o.total, lang), how: t(mode === "size" ? "overall.how.size" : "overall.how.equal", lang) });
  const bar = h("div", { class: "ov-bar", role: "img", "aria-label": text, "data-ov-bar": o.percent === null ? "unknown" : String(o.percent) },
    h("i", { style: `width:${o.percent ?? 0}%`, class: o.percent === null ? "ov-unk" : "" }));
  return h("section", { class: "card", "data-overall": where, "data-percent": o.percent === null ? "unknown" : String(o.percent), "data-trend": trend },
    h("h2", { class: "card-h" }, t("overall.title", lang)),
    h("div", { class: "pr-row" }, progressRing(o.percent, text, o.percent === 100), h("p", { class: "ov-big", "data-overall-text": "1" }, text)), bar,
    mode === "size" && o.withoutSize > 0 ? h("p", { class: "muted" }, t("overall.nosize", lang, { n: num(o.withoutSize, lang) })) : null,
    trend === "down" ? h("p", { class: "muted", "data-overall-fall": "1" }, t("overall.fall", lang)) : null,
    o.percent === null ? h("p", { class: "muted" }, link("#/diary/plan", "crumb", t("overall.add", lang)))
      : h("p", { class: "muted", "data-overall-prompt": "1" }, t("overall.more", lang), " ", link("#/diary/plan", "crumb", t("overall.addMore", lang))),
    planChip("weighting", "overall.weight", lang),
    h("p", { class: "muted" }, t("overall.note", lang)));
}

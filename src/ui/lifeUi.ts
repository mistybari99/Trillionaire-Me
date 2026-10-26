// Step 5 screens: life wheel, goal list with progress, SMART guide and SWOT card, micro-animations.
// Everything reads and writes the active mode only (allRecs / findRec / saveTyped). Unknown is shown as unknown, never as zero.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { prefs, readProgressMemory, writeProgressMemory } from "./state";
import { num } from "./components";
import { allRecs, consentOn, consentPrompt, findRec, labelFor, nsTag, saveBlockedText, saveTyped, storeOf } from "./entry";
import { AREAS, MAX_RATING, lifeAreaRecord, wedgePath, wheelData, type Area } from "../core/lifeWheel";
import { smartFunnel } from "./smartFunnel";
import { SMART_PARTS, SWOT_KEYS, goalProgress, listValue, milestoneOf, parseList, readList, smartFilled, swotField, type GoalProgress, type SwotKey } from "../core/goalPlan";
import { overallProgress, nextProgressMemory, progressTrend, PROGRESS_MODES } from "../core/overallProgress";
import { checkFreeText } from "../core/safety";
import { goalAreaCard } from "./universeUi";
import { progressRing } from "./ring";
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
export function wheelScreen(): HTMLElement {
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

export function goalsScreen(): HTMLElement {
  const lang = L(); const recs = allRecs(); const list = goalProgress(recs); const ns = new Map(recs.map((r) => [r.id, r.ns] as const));
  return h("main", {}, link("#/journey", "crumb", `← ${t("journey.title", lang)}`), h("h1", {}, t("goals.title", lang)), h("p", { class: "sub" }, t("goals.intro", lang)),
    ...(list.length ? list.map((g) => h("article", { class: "card", "data-goal": g.id },
      nsTag(ns.get(g.id) ?? "demo", lang), h("h2", { class: "card-h" }, g.title), h("p", { class: "muted", "data-progress": g.percent === null ? "unknown" : String(g.percent) }, progressLine(g, lang)),
      link(`#/journey/goal/${g.id}`, "btn ghost", t("goals.open", lang)))) : [h("p", { class: "muted" }, t("goals.none", lang))]));
}

// ---- One goal: progress, SMART guide, SWOT card ----
const textOf = (r: TMRecord, f: string): string => { const v = r.values[f]; return v && v.state === "value" && typeof v.value === "string" ? v.value : ""; };
const typedFor = (r: TMRecord, value: unknown): FieldValue => ({ state: "value", value, label: labelFor(r.ns) });
const validDate = (x: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(x) && !Number.isNaN(Date.parse(x)) && new Date(x).toISOString().slice(0, 10) === x;

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
    ms ? h("p", { class: "ok-msg", role: "status", "data-milestone": String(ms) }, celebrate("milestone", lang), " ", t(`goal.ms.${ms}` as Key, lang)) : null);

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
  return h("main", {}, back, h("h1", {}, textOf(rec, "goal.title")), progress, goalAreaCard(rec, lang), smartForm, swotView, swotForm);
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
    h("div", { class: "seg", role: "group", "aria-label": t("overall.weight", lang) },
      ...PROGRESS_MODES.map((m) => h("button", { type: "button", "data-ov-mode": m, "aria-pressed": String(mode === m), onclick: () => { prefs.progressMode = m; rerender(); } }, t(m === "size" ? "overall.mode.size" : "overall.mode.equal", lang)))),
    h("p", { class: "muted" }, t("overall.note", lang)));
}

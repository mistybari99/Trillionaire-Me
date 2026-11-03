// M18 boards page (`#/journey/boards`): a drawn timeline of goal dates, a task board (Kanban) and an option board. Own data only.
// Every picture has the same content as a written list ("Show as text"). Colours come from CSS variables; nothing moves; past dates are plain, never red.
import { h } from "./dom";
import { t, tb, fmtNumber } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { prefs } from "./state";
import { allRecs, nsTag, activeNs } from "./entry";
import { box, s, svgRoot } from "./charts";
import { disclaimers } from "./components";
import { todayIsoKpi } from "./kpiUi";
import { BOARD_COLUMNS, optionBoard, taskBoard, timeline } from "../core/boards";
import { assessmentFrom, pathFit, weightsFrom } from "../core/assessment";
import { THEME_LABEL } from "../library/paths";
import { goalTreeChart, planChangesChart, readinessChart, resourceMapChart } from "./mapsUi";

const link = (href: string, cls: string, ...kids: Array<Node | string>) => h("a", { href, class: cls }, ...kids);
const cut = (x: string, n: number) => (x.length > n ? `${x.slice(0, n - 1)}…` : x);

export function timelineChart(lang: Locale): HTMLElement {
  const title = t("bd.tl.title", lang); const tl = timeline(allRecs(), todayIsoKpi());
  const ns = activeNs();
  if (!tl.items.length) return h("section", { class: "card chart", "data-chart": "timeline", "data-chart-empty": "1" }, h("div", { class: "row" }, h("h2", { class: "card-h" }, title), nsTag(ns, lang)), h("p", { class: "muted" }, t("bd.tl.none", lang)),
    tl.undated.length ? h("p", { class: "muted", "data-timeline-undated": String(tl.undated.length) }, t("bd.tl.undated", lang, { list: tl.undated.map((u) => u.title).join(", ") })) : null);
  const W = 320, X0 = 12, X1 = W - 12, AXIS = 26, ROW = 24; const H = AXIS + 18 + tl.items.length * ROW + 6;
  const svg = svgRoot(W, H, title, t("bd.tl.summary", lang, { n: fmtNumber(tl.items.length, lang) }));
  const xAt = (f: number) => Math.round(X0 + f * (X1 - X0));
  svg.append(s("line", { x1: X0, y1: AXIS, x2: X1, y2: AXIS, class: "chart-axis" }));
  const tx = xAt(tl.todayAt);
  svg.append(s("line", { x1: tx, y1: AXIS - 8, x2: tx, y2: H - 4, class: "chart-unk", "stroke-dasharray": "3 3", "data-today": "1" }), s("text", { x: tx, y: 10, class: `chart-s ${tx > W / 2 ? "chart-end" : ""}` }, t("bd.tl.today", lang)));
  tl.items.forEach((it, i) => {
    const x = xAt(it.at); const y = AXIS + 22 + i * ROW;
    svg.append(s("line", { x1: x, y1: AXIS, x2: x, y2: y - 5, class: "chart-axis" }), s("circle", { cx: x, cy: AXIS, r: 5, class: it.status === "paused" ? "chart-unk" : "chart-in", "data-goal-dot": it.id }),
      s("text", { x: x > W / 2 ? Math.min(x + 4, W) : Math.max(x - 4, 0), y, class: `chart-t ${x > W / 2 ? "chart-end" : ""}`, "data-goal-label": it.id }, `${cut(it.title, 22)} · ${it.date}`));
  });
  const lines = tl.items.map((it) => t("bd.tl.line", lang, { title: it.title, date: it.date }) + (it.status === "paused" ? ` (${t("bd.tl.paused", lang)})` : "") + (it.passed ? ` (${t("bd.tl.passed", lang)})` : ""));
  if (tl.undated.length) lines.push(t("bd.tl.undated", lang, { list: tl.undated.map((u) => u.title).join(", ") }));
  return box("timeline", title, t("bd.tl.summary", lang, { n: fmtNumber(tl.items.length, lang) }), lines, lang, svg,
    tl.undated.length ? h("p", { class: "muted", "data-timeline-undated": String(tl.undated.length) }, t("bd.tl.undated", lang, { list: tl.undated.map((u) => u.title).join(", ") })) : null);
}

export function taskBoardView(lang: Locale): HTMLElement {
  const title = t("bd.kb.title", lang); const b = taskBoard(allRecs());
  if (!b.anyTask) return h("section", { class: "card", "data-board": "kanban", "data-board-empty": "1" }, h("h2", { class: "card-h" }, title), h("p", { class: "muted" }, t("bd.kb.none", lang)));
  return h("section", { class: "card", "data-board": "kanban" }, h("div", { class: "row" }, h("h2", { class: "card-h" }, title), nsTag(activeNs(), lang)), h("p", { class: "muted" }, t("bd.kb.hint", lang)),
    h("div", { style: "display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px" },
      ...BOARD_COLUMNS.map((c) => h("div", { role: "group", "aria-label": t(`bd.kb.${c}` as Key, lang), "data-column": c, style: "border:1px solid var(--rule);border-radius:10px;padding:8px;min-width:0" },
        h("h3", { style: "margin:0 0 6px;font-size:1em" }, t(`bd.kb.${c}` as Key, lang), " ", h("span", { class: "muted", "data-count": c }, fmtNumber(b.totals[c], lang))),
        b.columns[c].length ? h("ul", { class: "plain", style: "margin:0;padding:0;list-style:none" }, ...b.columns[c].map((k) => h("li", { "data-card": k.id, style: "border:1px solid var(--rule);border-radius:8px;padding:6px;margin-bottom:6px;overflow-wrap:anywhere" },
          h("strong", {}, k.title), k.goalTitle ? h("div", { class: "muted" }, t("bd.kb.goal", lang, { g: k.goalTitle })) : null,
          k.goalId ? link(`#/journey/goal/${k.goalId}`, "crumb", t("bd.kb.open.goal", lang)) : null))) : h("p", { class: "muted", "data-column-empty": c }, t("bd.kb.empty", lang)),
        c === "done" && b.hiddenDone ? h("p", { class: "muted", "data-hidden-done": String(b.hiddenDone) }, t("bd.kb.more", lang, { n: fmtNumber(b.hiddenDone, lang) })) : null))));
}

export function optionBoardView(lang: Locale): HTMLElement {
  const title = t("bd.op.title", lang); const recs = allRecs();
  const fit = pathFit(assessmentFrom(recs), undefined, weightsFrom(recs).weights); const cols = optionBoard(fit);
  const head = [h("div", { class: "row" }, h("h2", { class: "card-h" }, title), nsTag(activeNs(), lang)), h("p", { class: "muted" }, t("bd.op.intro", lang))];
  if (!cols.length) return h("section", { class: "card", "data-board": "options", "data-board-empty": "1" }, ...head, h("p", { class: "muted" }, t("bd.op.none", lang)), link("#/diary/intake/2", "crumb", t("fit.add", lang)));
  return h("section", { class: "card", "data-board": "options" }, ...head,
    h("div", { style: "display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px" },
      ...cols.map(({ id, match: m }) => h("article", { "data-option": id, style: "border:1px solid var(--rule);border-radius:10px;padding:8px;min-width:0;overflow-wrap:anywhere" },
        h("h3", { style: "margin:0 0 4px;font-size:1em" }, tb(m.path.name, lang)), h("p", {}, tb(m.path.summary, lang)),
        h("p", { class: "muted", "data-option-why": "1" }, t("bd.op.why", lang, { list: m.reasons.map((r) => `${r.text} (${tb(THEME_LABEL[r.theme], lang)})`).join(", ") })),
        h("p", {}, t("fit.needs", lang, { text: tb(m.path.needs, lang) })), h("p", {}, t("fit.test", lang, { text: tb(m.path.firstTest, lang) })),
        m.path.caution ? h("p", { class: "muted", "data-option-caution": "1" }, t("fit.caution", lang, { text: tb(m.path.caution, lang) })) : null))),
    h("p", { class: "muted" }, t("fit.draft", lang)), link("#/diary/plan", "crumb", t("bd.op.more", lang)));
}

export function boardsScreen(): HTMLElement {
  const lang = prefs.lang;
  return h("main", { class: "scr scr-boards" }, link("#/journey", "crumb", `← ${t("journey.title", lang)}`), h("h1", {}, t("bd.title", lang)), h("p", { class: "sub" }, t("bd.intro", lang)),
    timelineChart(lang), goalTreeChart(lang), taskBoardView(lang), optionBoardView(lang), resourceMapChart(lang), readinessChart(lang), planChangesChart(lang), disclaimers(lang, ["noGuarantee", "advice"]));
}

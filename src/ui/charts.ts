// Simple charts drawn as inline SVG (no library, no network). Every chart has a title, a visually hidden summary
// and a visible "Show as text" list built from the same data. Unknown values get an "unknown" mark, never a zero bar.
// Static drawing: no animation, so reduced motion is respected by design. Colours come from CSS variables only.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { num } from "./components";
import { activityBars, flowBars, goalRings, habitGrid, weekdayIndex, type Cell } from "../core/chartData";
import type { Habit, Log } from "../core/habits";
import type { TMRecord } from "../core/types";

const NS = "http://www.w3.org/2000/svg";
type A = Record<string, string | number>;
function s<K extends keyof SVGElementTagNameMap>(tag: K, attrs: A = {}, ...kids: Array<Node | string | null>): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  for (const c of kids) if (c !== null) el.append(typeof c === "string" ? document.createTextNode(c) : c);
  return el;
}
const svgRoot = (w: number, hgt: number, label: string, desc: string): SVGSVGElement => {
  const el = s("svg", { viewBox: `0 0 ${w} ${hgt}`, class: "chart-svg", role: "img", "aria-label": label, focusable: "false" }, s("title", {}, label), s("desc", {}, desc));
  return el;
};

/** Title + drawing + hidden summary + visible "Show as text". `lines` are the text equivalent, one per data point. */
function box(kind: string, title: string, summary: string, lines: string[], lang: Locale, ...drawing: Array<Node | null>): HTMLElement {
  return h("section", { class: "card chart", "data-chart": kind },
    h("h2", { class: "card-h" }, title),
    ...drawing,
    h("p", { class: "sr-only", "data-chart-summary": kind }, summary),
    h("details", { class: "help", "data-chart-text": kind }, h("summary", {}, t("chart.showText", lang)), h("ul", { class: "chart-lines" }, ...lines.map((l) => h("li", {}, l)))));
}
const empty = (kind: string, title: string, msg: string): HTMLElement => h("section", { class: "card chart", "data-chart": kind, "data-chart-empty": "1" }, h("h2", { class: "card-h" }, title), h("p", { class: "muted" }, msg));

// ---- Money ----
export function moneyChart(recs: readonly TMRecord[], lang: Locale): HTMLElement {
  const title = t("chart.money.title", lang); const scopes = flowBars(recs);
  if (!scopes.length) return empty("money", title, t("chart.money.none", lang));
  const known = scopes.flatMap((x) => [x.income.value, x.spending.value]).filter((v): v is number => v !== null);
  const max = Math.max(1, ...known); const W = 320, X0 = 84, BW = 170, RH = 28;
  const bdt = (v: number | null) => (v === null ? t("chart.unknown", lang) : t("money.bdt", lang, { v: num(v, lang) }));
  const rows: Node[] = []; let y = 0; const lines: string[] = [];
  for (const sc of scopes) {
    const sname = t(`money.${sc.scope}` as Key, lang);
    rows.push(s("text", { x: 0, y: y + 14, class: "chart-h" }, sname)); y += 20;
    for (const [k, bar, cls] of [["chart.income", sc.income, "chart-in"], ["chart.spending", sc.spending, "chart-out"]] as const) {
      const label = t(k, lang);
      rows.push(s("text", { x: 0, y: y + 17, class: "chart-t" }, label));
      if (bar.value === null) {
        rows.push(s("rect", { x: X0, y: y + 3, width: 60, height: 18, class: "chart-unk", "stroke-dasharray": "4 3", "data-unknown": "1" }), s("text", { x: X0 + 30, y: y + 16, class: "chart-t chart-mid" }, "?"),
          s("text", { x: X0 + 68, y: y + 17, class: "chart-t" }, bar.count ? t("chart.unknown", lang) : t("chart.noRecord", lang)));
      } else {
        const w = Math.max(2, Math.round((bar.value / max) * BW));
        rows.push(s("rect", { x: X0, y: y + 3, width: w, height: 18, class: cls, "data-bar": `${sc.scope}-${cls}` }), s("text", { x: Math.min(X0 + w + 6, W - 70), y: y + 17, class: "chart-t" }, bdt(bar.value)));
      }
      y += RH;
    }
    lines.push(t("chart.money.line", lang, { scope: sname, i: sc.income.value === null ? (sc.income.count ? bdt(null) : t("chart.noRecord", lang)) : bdt(sc.income.value), s: sc.spending.value === null ? (sc.spending.count ? bdt(null) : t("chart.noRecord", lang)) : bdt(sc.spending.value) }));
    y += 6;
  }
  const svg = svgRoot(W, y, title, lines.join(" "));
  svg.append(...rows);
  return box("money", title, `${title}. ${lines.join(" ")}`, lines, lang, svg);
}

// ---- Report: progress ring per goal ----
export function goalRingsChart(recs: readonly TMRecord[], lang: Locale): HTMLElement {
  const title = t("chart.goal.title", lang); const rings = goalRings(recs);
  if (!rings.length) return empty("goals", title, t("chart.goal.none", lang));
  const R = 26, C = 2 * Math.PI * R; const lines: string[] = [];
  const figs = rings.map((g) => {
    const line = g.fraction === null ? t("chart.goal.unknownLine", lang, { title: g.title }) : t("chart.goal.line", lang, { title: g.title, d: num(g.done, lang), n: num(g.total, lang), p: num(g.percent ?? 0, lang) });
    lines.push(line);
    const svg = svgRoot(64, 64, g.title, line);
    svg.append(s("circle", { cx: 32, cy: 32, r: R, class: g.fraction === null ? "ring-track ring-unk" : "ring-track", fill: "none", ...(g.fraction === null ? { "stroke-dasharray": "4 4" } : {}) }));
    if (g.fraction === null) svg.append(s("text", { x: 32, y: 38, class: "chart-t chart-mid", "data-unknown": "1" }, "?"));
    else {
      if (g.fraction > 0) svg.append(s("circle", { cx: 32, cy: 32, r: R, fill: "none", class: "ring-arc", "data-ring": g.id, "stroke-dasharray": `${(C * g.fraction).toFixed(2)} ${C.toFixed(2)}`, transform: "rotate(-90 32 32)" }));
      svg.append(s("text", { x: 32, y: 37, class: "chart-t chart-mid", "data-percent": g.percent ?? "" }, `${g.percent}%`));
    }
    return h("figure", { class: "ring", "data-goal-ring": g.id }, svg, h("figcaption", { class: "muted" }, g.title, g.fraction === null ? ` · ${t("chart.unknown", lang)}` : ""));
  });
  return box("goals", title, `${title}. ${lines.join(" ")}`, lines, lang, h("div", { class: "rings" }, ...figs));
}

// ---- Review: 90-day activity, weekly bars ----
export function activityChart(recs: readonly TMRecord[], today: string, lang: Locale): HTMLElement {
  const title = t("chart.act.title", lang); const a = activityBars(recs, today);
  if (!a.enough) return empty("activity", title, t("chart.act.notEnough", lang));
  const W = 320, H = 130, base = 104, top = 14, colW = W / 13; const max = Math.max(1, ...a.weeks.map((w) => w.count ?? 0));
  const lines = a.weeks.map((w) => (w.count === null ? t("chart.act.noneLine", lang, { from: w.from, to: w.to }) : t("chart.act.line", lang, { from: w.from, to: w.to, n: num(w.count, lang) })));
  const summary = `${title}. ${t("chart.act.total", lang, { n: num(a.total, lang), from: a.from, to: a.to })}`;
  const svg = svgRoot(W, H, title, summary);
  svg.append(s("line", { x1: 0, y1: base, x2: W, y2: base, class: "chart-axis" }));
  a.weeks.forEach((w, i) => {
    const cx = i * colW + colW / 2;
    if (w.count === null) { svg.append(s("line", { x1: cx - 6, y1: base - 3, x2: cx + 6, y2: base - 3, class: "chart-unk", "stroke-dasharray": "4 3", "data-week-empty": w.from })); return; }
    const bh = Math.max(3, Math.round((w.count / max) * (base - top)));
    svg.append(s("rect", { x: cx - 9, y: base - bh, width: 18, height: bh, class: "chart-in", "data-week": w.from }), s("text", { x: cx, y: base - bh - 3, class: "chart-s chart-mid" }, String(w.count)));
  });
  svg.append(s("text", { x: 0, y: H - 6, class: "chart-s" }, a.from), s("text", { x: W, y: H - 6, class: "chart-s chart-end" }, a.to));
  return box("activity", title, summary, lines, lang, svg, h("p", { class: "muted" }, t("chart.act.note", lang)));
}

// ---- Habits: 14-day grid, planned days only, no run-count ----
const CELL_KEY: Record<Cell, Key> = { done: "chart.cell.done", open: "chart.cell.open", rest: "chart.cell.rest" };
export function habitChart(hb: Habit, logs: Log[], today: string, lang: Locale): HTMLElement {
  const title = t("chart.habit.title", lang, { name: hb.title }); const g = habitGrid(hb, logs, today);
  if (!g.planned) return empty("habit", title, t("chart.habit.none", lang));
  const CW = 46, RH = 44, W = CW * 7, H = RH * 2 + 4;
  const summary = t("chart.habit.line", lang, { name: hb.title, d: num(g.done, lang), p: num(g.planned, lang) });
  const lines = g.cells.map((c) => `${c.date}: ${t(CELL_KEY[c.state], lang)}`);
  const svg = svgRoot(W, H, title, summary); svg.setAttribute("data-habit-grid", hb.id);
  g.cells.forEach((c, i) => {
    const cx = (i % 7) * CW + CW / 2, cy = Math.floor(i / 7) * RH + 16;
    if (c.state === "done") svg.append(s("circle", { cx, cy, r: 11, class: "cell-done", "data-cell": c.date, "data-state": "done" }), s("path", { d: `M${cx - 5} ${cy} l3.5 3.5 l7 -7`, class: "cell-tick", fill: "none" }));
    else if (c.state === "open") svg.append(s("circle", { cx, cy, r: 11, class: "cell-open", fill: "none", "data-cell": c.date, "data-state": "open" }));
    else svg.append(s("line", { x1: cx - 5, y1: cy, x2: cx + 5, y2: cy, class: "cell-rest", "data-cell": c.date, "data-state": "rest" }));
    svg.append(s("text", { x: cx, y: cy + 24, class: "chart-s chart-mid" }, String(Number(c.date.slice(8)))));
  });
  void weekdayIndex;
  return box("habit", title, summary, lines, lang, svg, h("p", { class: "muted chart-legend" }, `● ${t("chart.cell.done", lang)} · ○ ${t("chart.cell.open", lang)} · – ${t("chart.cell.rest", lang)}`));
}

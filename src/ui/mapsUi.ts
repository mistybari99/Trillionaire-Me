// M18 boards, part 3: drawn goal tree, resource map, readiness map and plan-change board (`#/journey/boards`).
// Every picture is an SVG with a title and a description, and has the same content as a written list ("Show as text"). Own data only.
// Unknown stays unknown ("not entered yet"), nothing is graded, shapes (not only colour) tell the states apart, nothing moves, nothing is red.
import { h } from "./dom";
import { t, fmtNumber } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { allRecs, nsTag, activeNs } from "./entry";
import { box, s, svgRoot } from "./charts";
import { todayIsoKpi } from "./kpiUi";
import { diffText } from "./realityUi";
import { READY_FACTS, readinessMap, resourceMap, treeRows, type Ready } from "../core/maps";
import { versionRows, type VersionRow } from "../core/realityLoop";
import type { DiffRow } from "../core/realityLoop";

const link = (href: string, cls: string, ...kids: Array<Node | string>) => h("a", { href, class: cls }, ...kids);
const cut = (x: string, n: number) => (x.length > n ? `${x.slice(0, n - 1)}…` : x);
const head = (title: string, lang: Locale) => h("div", { class: "row" }, h("h2", { class: "card-h" }, title), nsTag(activeNs(), lang));

// ---------------------------------------------------------------- goal tree
export function goalTreeChart(lang: Locale): HTMLElement {
  const title = t("bd.gt.title", lang); const rows = treeRows(allRecs());
  if (!rows.length) return h("section", { class: "card chart", "data-chart": "goaltree", "data-chart-empty": "1" }, head(title, lang), h("p", { class: "muted" }, t("bd.gt.none", lang)));
  const W = 320, ROW = 28, X0 = 12, IND = 16; const H = rows.length * ROW + 8;
  const summary = t("bd.gt.summary", lang, { n: fmtNumber(rows.length, lang) });
  const svg = svgRoot(W, H, title, summary); const yOf = (i: number) => 14 + i * ROW; const xOf = (d: number) => X0 + d * IND;
  rows.forEach((r, i) => {
    if (r.parentRow !== null) { const p = rows[r.parentRow]!; svg.append(s("path", { d: `M${xOf(p.depth)} ${yOf(r.parentRow) + 5} V${yOf(i)} H${xOf(r.depth) - 5}`, class: "chart-axis", fill: "none", "data-edge": r.id })); }
  });
  rows.forEach((r, i) => {
    const x = xOf(r.depth), y = yOf(i); const maxLen = Math.max(8, 28 - r.depth * 3);
    svg.append(s("circle", { cx: x, cy: y, r: 5, class: r.status === "paused" ? "chart-unk" : r.percent === null ? "chart-unk" : "chart-in", "data-tree-node": r.id }),
      s("text", { x: x + 10, y: y + 4, class: "chart-t", "data-tree-label": r.id }, cut(r.title, maxLen)),
      s("text", { x: W - 4, y: y + 4, class: "chart-s chart-end" }, r.total ? `${fmtNumber(r.done, lang)}/${fmtNumber(r.total, lang)}` : "–"));
  });
  const lines = rows.map((r) => `${"· ".repeat(r.depth)}${r.total ? t("bd.gt.line", lang, { title: r.title, d: fmtNumber(r.done, lang), n: fmtNumber(r.total, lang) }) : t("bd.gt.nosteps", lang, { title: r.title })}${r.status === "paused" ? ` (${t("bd.gt.paused", lang)})` : ""}`);
  return box("goaltree", title, summary, lines, lang, svg, link("#/journey/goals", "crumb", t("bd.gt.open", lang)));
}

// ---------------------------------------------------------------- resource map
export function resourceMapChart(lang: Locale): HTMLElement {
  const title = t("bd.rm.title", lang); const areas = resourceMap(allRecs()); const have = areas.filter((a) => a.count !== null).length;
  const summary = t("bd.rm.summary", lang, { n: fmtNumber(have, lang), m: fmtNumber(areas.length - have, lang) });
  // A hub at the top, a spine below it, and one tile per area on either side of the spine (no crossing lines, no text over lines).
  const W = 320, TILE_W = 144, TILE_H = 44, ROW = 54, TOP = 64; const rowsN = Math.ceil(areas.length / 2); const H = TOP + rowsN * ROW + 4; const SPINE = W / 2;
  const svg = svgRoot(W, H, title, summary);
  svg.append(s("line", { x1: SPINE, y1: 40, x2: SPINE, y2: TOP + (rowsN - 1) * ROW + TILE_H / 2, class: "chart-axis", "data-spine": "1" }),
    s("rect", { x: SPINE - 60, y: 6, width: 120, height: 34, rx: 17, class: "chart-unk" }), s("text", { x: SPINE, y: 28, class: "chart-t chart-mid" }, cut(t("bd.rm.centre", lang), 16)));
  const whatOf = (a: (typeof areas)[number]) => (a.area === "time" ? (a.hours !== null ? t("bd.rm.hours", lang, { h: fmtNumber(a.hours, lang) }) : t("bd.rm.unknown", lang)) : a.count === null ? t("bd.rm.unknown", lang) : t("bd.rm.entries", lang, { n: fmtNumber(a.count, lang) }));
  areas.forEach((a, i) => {
    const left = i % 2 === 0; const r = Math.floor(i / 2); const x = left ? 8 : W - 8 - TILE_W; const y = TOP + r * ROW; const known = a.count !== null;
    const cy = y + TILE_H / 2;
    svg.append(s("line", { x1: left ? x + TILE_W : x, y1: cy, x2: SPINE, y2: cy, class: "chart-axis", "data-spoke": a.area }),
      s("rect", { x, y, width: TILE_W, height: TILE_H, rx: 8, class: "chart-unk", "stroke-dasharray": known ? "0" : "4 3", "data-node": a.area, "data-known": known ? "1" : "0" }),
      s("circle", { cx: x + 14, cy, r: 5, class: known ? "chart-in" : "chart-unk", "stroke-dasharray": known ? "0" : "3 2" }),
      s("text", { x: x + 26, y: y + 18, class: "chart-t" }, cut(t(`bd.rm.area.${a.area}` as Key, lang), 14)),
      s("text", { x: x + 26, y: y + 35, class: "chart-s" }, cut(whatOf(a), 22)));
  });
  const lines = areas.map((a) => `${t(`bd.rm.area.${a.area}` as Key, lang)}: ${a.area === "time" || a.count === null ? whatOf(a) : `${whatOf(a)}${a.items.length ? ` (${a.items.slice(0, 4).join(", ")}${a.items.length > 4 ? "…" : ""})` : ""}`}`);
  return box("resourcemap", title, summary, lines, lang, h("p", { class: "muted" }, t("bd.rm.intro", lang)), svg,
    h("ul", { class: "plain", "data-rm-links": "1" }, ...areas.filter((a) => a.count === null).map((a) => h("li", { "data-rm-add": a.area }, link(a.href, "crumb", `${t(`bd.rm.area.${a.area}` as Key, lang)} →`)))));
}

// ---------------------------------------------------------------- readiness map
const SHAPE: Record<Ready, (x: number, y: number) => SVGElement> = {
  known: (x, y) => s("circle", { cx: x, cy: y, r: 6, class: "chart-in", "data-shape": "disc" }),
  missing: (x, y) => s("circle", { cx: x, cy: y, r: 6, class: "chart-unk", "stroke-dasharray": "3 2", "data-shape": "ring" }),
  stale: (x, y) => s("rect", { x: x - 5, y: y - 5, width: 10, height: 10, class: "chart-unk", transform: `rotate(45 ${x} ${y})`, "data-shape": "diamond" }),
  conflict: (x, y) => s("path", { d: `M${x} ${y - 7} L${x + 7} ${y + 6} L${x - 7} ${y + 6} Z`, class: "chart-out", "data-shape": "triangle" }),
};
const twoLines = (label: string): [string, string | null] => { const k = label.indexOf(" "); return k < 0 ? [label, null] : [label.slice(0, k), label.slice(k + 1)]; };
export function readinessChart(lang: Locale): HTMLElement {
  const title = t("bd.rd.title", lang); const rows = readinessMap(allRecs(), todayIsoKpi());
  if (!rows.length) return h("section", { class: "card chart", "data-chart": "readiness", "data-chart-empty": "1" }, head(title, lang), h("p", { class: "muted" }, t("bd.rd.none", lang)));
  const W = 320, LX = 8, COL0 = 158, COLW = 46, ROW = 30, HEAD = 44; const LEG = 56; const H = HEAD + rows.length * ROW + LEG;
  const summary = t("bd.rd.summary", lang, { n: fmtNumber(rows.length, lang) }); const svg = svgRoot(W, H, title, summary);
  READY_FACTS.forEach((f, c) => { const [a, b] = twoLines(t(`bd.rd.fact.${f}` as Key, lang)); svg.append(s("text", { x: COL0 + c * COLW, y: 12, class: "chart-s chart-mid" }, cut(a, 9)), ...(b ? [s("text", { x: COL0 + c * COLW, y: 25, class: "chart-s chart-mid" }, cut(b, 9))] : [])); });
  rows.forEach((r, i) => {
    const y = HEAD + i * ROW; svg.append(s("text", { x: LX, y: y + 4, class: "chart-t", "data-ready-goal": r.id }, cut(r.title, 19)));
    READY_FACTS.forEach((f, c) => { const el = SHAPE[r.cells[f].status](COL0 + c * COLW, y); el.setAttribute("data-cell", `${r.id}:${f}:${r.cells[f].status}`); svg.append(el); });
  });
  const ly = HEAD + rows.length * ROW + 14;
  (["known", "missing", "stale", "conflict"] as const).forEach((k, i) => { const x = 14 + (i % 2) * 156; const y = ly + Math.floor(i / 2) * 22; const sh = SHAPE[k](x, y); sh.setAttribute("data-legend-item", k); svg.append(sh, s("text", { x: x + 14, y: y + 4, class: "chart-s" }, cut(t(`bd.rd.${k}` as Key, lang), 18))); });
  const lines = rows.map((r) => `${r.title}: ${READY_FACTS.map((f) => { const c = r.cells[f]; return `${t(`bd.rd.fact.${f}` as Key, lang)}: ${t(`bd.rd.${c.status}` as Key, lang)}${c.why !== "none" ? ` (${t(`bd.rd.why.${c.why}` as Key, lang)})` : ""}`; }).join("; ")}`);
  return box("readiness", title, summary, lines, lang, h("p", { class: "muted" }, t("bd.rd.intro", lang)), svg, h("p", { class: "muted", "data-rd-legend": "1" }, t("bd.rd.legend", lang)));
}

// ---------------------------------------------------------------- plan changes (drawn plan-diff)
const SHOWN_VERSIONS = 3;
function sides(r: DiffRow, lang: Locale, titles: ReadonlyMap<string, string>): { title: string; from: string; to: string } {
  const none = t("rl.state.none", lang);
  const state = (x: string | null) => (x === null ? none : t(`rl.state.${x}` as Key, lang));
  if (r.kind === "mode") return { title: t("bd.pd.mode", lang), from: t(`plan.mode.${r.from}` as Key, lang), to: t(`plan.mode.${r.to}` as Key, lang) };
  if (r.field === "date") return { title: r.title, from: r.from ?? t("rl.date.none", lang), to: r.to ?? t("rl.date.none", lang) };
  if (r.field === "link") { const names = (x: string | null) => (x ? x.split(",").map((id) => titles.get(id) ?? id).join(", ") : none); return { title: r.title || "—", from: names(r.from), to: names(r.to) }; }
  if (r.field === "status") return { title: r.title, from: r.from ?? none, to: r.to ?? none };
  return { title: r.title || "—", from: state(r.from), to: state(r.to) };
}
function versionDrawing(v: VersionRow, lang: Locale): { svg: SVGElement | null; lines: string[] } {
  const titles = new Map([...(v.before?.goals ?? []), ...(v.after?.goals ?? [])].map((g) => [g.id, g.title] as const));
  if (!v.diff) return { svg: null, lines: [t("bd.pd.unreadable", lang)] };
  if (!v.diff.length) return { svg: null, lines: [t("bd.pd.nochange", lang)] };
  const W = 320, ROW = 52, H = 22 + v.diff.length * ROW; const svg = svgRoot(W, H, `${t("bd.pd.version", lang, { n: fmtNumber(v.number, lang) })}`, t("bd.pd.summary", lang, { n: "1", k: "1" }));
  svg.append(s("text", { x: 8, y: 12, class: "chart-s" }, t("bd.pd.before", lang)), s("text", { x: W - 8, y: 12, class: "chart-s chart-end" }, t("bd.pd.after", lang)));
  v.diff.forEach((r, i) => {
    const y = 22 + i * ROW; const x = sides(r, lang, titles);
    svg.append(s("text", { x: 8, y: y + 10, class: "chart-t" }, cut(x.title, 36)),
      s("rect", { x: 8, y: y + 16, width: 126, height: 24, rx: 4, class: "chart-unk" }), s("text", { x: 14, y: y + 32, class: "chart-s", "data-pd-from": String(i) }, cut(x.from, 20)),
      s("path", { d: `M140 ${y + 28} H178 M172 ${y + 23} L178 ${y + 28} L172 ${y + 33}`, class: "chart-axis", fill: "none" }),
      s("rect", { x: 186, y: y + 16, width: 126, height: 24, rx: 4, class: "chart-unk", "stroke-width": 2.5 }), s("text", { x: 192, y: y + 32, class: "chart-s", "data-pd-to": String(i) }, cut(x.to, 20)));
  });
  return { svg, lines: v.diff.map((r) => diffText(r, lang, titles)) };
}
export function planChangesChart(lang: Locale): HTMLElement {
  const title = t("bd.pd.title", lang); const vs = versionRows(allRecs());
  if (!vs.length) return h("section", { class: "card chart", "data-chart": "plandiff", "data-chart-empty": "1" }, head(title, lang), h("p", { class: "muted" }, t("bd.pd.none", lang)), link("#/journey/reality", "crumb", t("bd.pd.open", lang)));
  const shown = vs.slice(0, SHOWN_VERSIONS); const summary = t("bd.pd.summary", lang, { n: fmtNumber(vs.length, lang), k: fmtNumber(shown.length, lang) });
  const parts = shown.map((v) => ({ v, d: versionDrawing(v, lang) }));
  const lines = parts.flatMap((p) => [`${t("bd.pd.version", lang, { n: fmtNumber(p.v.number, lang) })}${p.v.on ? ` · ${p.v.on}` : ""}`, ...p.d.lines.map((l) => `· ${l}`)]);
  return box("plandiff", title, summary, lines, lang, ...parts.flatMap((p) => [h("h3", { "data-pd-version": String(p.v.number), style: "margin:8px 0 2px;font-size:1em" }, t("bd.pd.version", lang, { n: fmtNumber(p.v.number, lang) }), p.v.on ? ` · ${p.v.on}` : ""), p.d.svg ?? h("p", { class: "muted" }, p.d.lines[0]!)]), link("#/journey/reality", "crumb", t("bd.pd.open", lang)));
}

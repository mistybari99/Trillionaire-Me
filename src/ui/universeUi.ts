// Goal Universe screen: life areas around one centre goal as inline SVG, plus a list view with the same lines.
// Only the user's own entries (active mode). Unknown stays "?" / "Unknown", never 0. Deen is drawn as private, with no figures.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { prefs } from "./state";
import { num } from "./components";
import { s } from "./svg";
import { allRecs, consentOn, consentPrompt, findRec, labelFor, saveBlockedText, storeOf } from "./entry";
import { UNIVERSE_AREAS, goalAreaOf, nodeAngle, universeData, type Universe, type UniverseArea, type UniverseNode } from "../core/goalUniverse";
import type { TMRecord } from "../core/types";

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
const link = (href: string, cls: string, ...kids: Array<Node | string>) => h("a", { href, class: cls }, ...kids);
const areaName = (a: UniverseArea, lang: Locale) => t(`univ.area.${a}` as Key, lang);

/** One plain sentence per area. The map's text description and the list view both use exactly these lines. */
export function universeLines(u: Universe, lang: Locale): string[] {
  return u.nodes.map((n) => {
    const area = areaName(n.area, lang);
    if (n.isPrivate) return t("univ.line.private", lang, { area });
    if (n.goals === null) return t("univ.line.unknown", lang, { area });
    if (n.tasks === null || n.done === null || n.percent === null) return t("univ.line.noTasks", lang, { area, g: num(n.goals, lang) });
    return t("univ.line.known", lang, { area, g: num(n.goals, lang), n: num(n.tasks, lang), d: num(n.done, lang), p: num(n.percent, lang) });
  });
}

const clip = (x: string, n: number) => (x.length > n ? `${x.slice(0, n - 1)}…` : x);

/** The map. Centre disc = the centre goal (or "?"); a node per area. Progress shows as an arc around a node, only when known. */
export function universeSvg(u: Universe, lang: Locale, lines: string[]): SVGSVGElement {
  const W = 360, H = 400, CX = 180, CY = 190, R = 130, NR = 25;
  const title = t("univ.title", lang);
  const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, class: "chart-svg univ-svg", role: "img", "aria-label": title, focusable: "false", "data-universe-map": "1" },
    s("title", {}, title), s("desc", {}, `${u.centre ? t("univ.centre", lang, { title: u.centre.title }) : t("univ.centreNone", lang)}. ${lines.join(" ")}`));
  const pos = (i: number) => { const a = nodeAngle(i, u.nodes.length); return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) }; };
  u.nodes.forEach((_, i) => { const p = pos(i); svg.append(s("line", { x1: CX, y1: CY, x2: p.x, y2: p.y, class: "univ-link" })); });
  svg.append(s("circle", { cx: CX, cy: CY, r: 46, class: u.centre ? "univ-centre" : "univ-centre univ-unk", ...(u.centre ? {} : { "stroke-dasharray": "4 3" }), "data-centre": u.centre ? "known" : "unknown" }),
    s("text", { x: CX, y: CY + (u.centre ? -2 : 6), class: "chart-t chart-mid univ-centre-t" }, u.centre ? clip(u.centre.title, 14) : "?"));
  if (u.centre) svg.append(s("text", { x: CX, y: CY + 14, class: "chart-s chart-mid" }, t("univ.centreTag", lang)));
  u.nodes.forEach((n, i) => {
    const p = pos(i);
    const g = s("g", { "data-node": n.area, "data-state": n.isPrivate ? "private" : n.goals === null ? "unknown" : "known" });
    g.append(s("circle", { cx: p.x, cy: p.y, r: NR, class: n.isPrivate ? "univ-node univ-private" : n.goals === null ? "univ-node univ-unk" : "univ-node", ...(n.goals === null ? { "stroke-dasharray": "4 3" } : {}) }));
    if (n.percent !== null) g.append(s("circle", { cx: p.x, cy: p.y, r: NR + 5, class: "univ-arc", pathLength: 100, "stroke-dasharray": `${n.percent} 100`, transform: `rotate(-90 ${p.x} ${p.y})`, "data-percent": n.percent }));
    if (n.isPrivate) g.append(s("path", { d: `M${p.x - 7} ${p.y - 1} h14 v10 h-14 z M${p.x - 4} ${p.y - 1} v-4 a4 4 0 0 1 8 0 v4`, class: "univ-lock" }));
    else g.append(s("text", { x: p.x, y: p.y + 5, class: "chart-t chart-mid" }, n.goals === null ? "?" : num(n.goals, lang)));
    g.append(s("text", { x: p.x, y: p.y + NR + 20, class: "chart-s chart-mid" }, areaName(n.area, lang)));
    svg.append(g);
  });
  return svg;
}

function listView(u: Universe, lines: string[], lang: Locale): HTMLElement {
  return h("ul", { class: "univ-list", "data-universe-list": "1" }, ...u.nodes.map((n: UniverseNode, i) => h("li", { "data-universe-line": n.area, "data-state": n.isPrivate ? "private" : n.goals === null ? "unknown" : "known" },
    h("span", { class: "univ-line" }, lines[i]!), n.isPrivate || n.goals === null ? null : link("#/journey/goals", "crumb", t("univ.open", lang)))));
}

export function universeScreen(): HTMLElement {
  const lang = prefs.lang; const u = universeData(allRecs()); const lines = universeLines(u, lang);
  const view = prefs.universeView;
  const toggle = h("div", { class: "seg", role: "group", "aria-label": t("univ.view", lang), "data-universe-toggle": "1" },
    ...(["map", "list"] as const).map((v) => h("button", { type: "button", "data-view": v, "aria-pressed": String(view === v), onclick: () => { prefs.universeView = v; rerender(); } }, t(v === "map" ? "univ.view.map" : "univ.view.list", lang))));
  const centreLine = u.centre ? t("univ.centre", lang, { title: u.centre.title }) : t("univ.centreNone", lang);
  return h("main", { class: "scr scr-universe" }, link("#/journey", "crumb", `← ${t("journey.title", lang)}`), h("h1", {}, t("univ.title", lang)), h("p", { class: "sub" }, t("univ.intro", lang)),
    h("section", { class: "card chart", "data-chart": "universe" }, h("p", { class: "univ-centre-line", "data-universe-centre": u.centre ? "known" : "unknown" }, centreLine), toggle,
      view === "map" ? h("div", {}, universeSvg(u, lang, lines), h("p", { class: "sr-only", "data-chart-summary": "universe" }, lines.join(" ")), h("p", { class: "muted" }, t("univ.mapAlt", lang))) : listView(u, lines, lang),
      u.unassigned ? h("p", { class: "muted", "data-universe-unassigned": String(u.unassigned) }, t("univ.unassigned", lang, { n: num(u.unassigned, lang) })) : null,
      link("#/journey/goals", "btn ghost", t("univ.open", lang))),
    h("p", { class: "muted" }, t("univ.note", lang)));
}

/** Goal page: choose the life area. Empty choice stores Unknown, never a default area. */
export function goalAreaCard(rec: TMRecord, lang: Locale): HTMLElement {
  const cur = goalAreaOf(rec);
  const sel = h("select", { id: "ga-area", "data-goal-area": "1" }, h("option", { value: "" }, t("univ.areaNone", lang)),
    ...UNIVERSE_AREAS.map((a) => h("option", { value: a, ...(cur === a ? { selected: true } : {}) }, areaName(a, lang))));
  const err = h("p", { class: "err", role: "alert" }), ok = h("p", { class: "ok-msg", role: "status", "data-saved": "area" });
  const form = h("form", { class: "card", novalidate: true, "data-form": "goal-area" }, h("h2", { class: "card-h" }, t("univ.areaLabel", lang)), h("p", { class: "muted" }, t("univ.areaHint", lang)),
    consentOn() ? null : consentPrompt(lang), h("label", { for: "ga-area" }, t("univ.areaLabel", lang)), sel, err, ok, h("button", { class: "btn", type: "submit" }, t("univ.areaSave", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault(); err.textContent = ""; ok.textContent = "";
    if (!consentOn()) { err.textContent = saveBlockedText(lang); return; }
    const c = findRec(rec.id); if (!c) return;
    const values = { ...c.values };
    values["goal.area"] = sel.value ? { state: "value", value: sel.value, label: labelFor(c.ns) } : { state: "unknown" };
    storeOf(c).put({ ...c, values }); ok.textContent = t("univ.areaSaved", lang);
  });
  return form;
}

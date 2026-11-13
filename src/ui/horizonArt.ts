// Goal funnel hero (Journey) and horizon arc (Horizon screen). Inline SVG, colours from design tokens, text equivalent for each.
// Counts come from the user's own goals and open tasks only; a band with nothing to count is dashed and says "Not set" (never 0).
import { s } from "./svg";
import { h } from "./dom";
import { t, fmtNumber } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { ARC_ORDER, arcMarker, funnelBands, groupByHorizon, type HorizonGoal } from "../core/horizon";

const W = 320, BH = 30, GAP = 4;

export function goalFunnelHero(goals: readonly HorizonGoal[], openTasks: number | null, lang: Locale): HTMLElement {
  const bands = funnelBands(goals, openTasks);
  const name = (l: string) => t(`funnel.${l}` as Key, lang);
  const known = bands.filter((b) => b.count !== null).length;
  const svg = s("svg", { viewBox: `0 0 ${W} ${bands.length * (BH + GAP)}`, class: "gfun", role: "img", "aria-label": `${t("funnel.title", lang)}. ${t(known ? "funnel.summary" : "funnel.empty", lang, { n: fmtNumber(goals.length, lang) })}`, focusable: "false", "data-goal-funnel": String(known) });
  bands.forEach((b, i) => {
    const wTop = W - i * 30, wBot = wTop - 26, y = i * (BH + GAP), cx = W / 2;
    const on = b.count !== null;
    svg.append(s("g", { class: `gfun-band${on ? " on" : ""}`, "data-level": b.level, style: `--i:${i}` },
      s("path", { d: `M${cx - wTop / 2} ${y}H${cx + wTop / 2}L${cx + wBot / 2} ${y + BH}H${cx - wBot / 2}Z`, ...(on ? {} : { "stroke-dasharray": "4 3" }) }),
      s("text", { x: cx, y: y + BH / 2 + 5, class: "gfun-t" }, on ? `${name(b.level)} · ${fmtNumber(b.count!, lang)}` : name(b.level))));
  });
  return h("section", { class: "card gfun-wrap", "data-goal-funnel-box": "1" }, h("h2", { class: "card-h" }, t("funnel.title", lang)), svg,
    h("ol", { class: "sr-only", "data-goal-funnel-text": "1" }, ...bands.map((b) => h("li", { "data-level": b.level }, `${name(b.level)}: ${b.count === null ? t("funnel.notset", lang) : fmtNumber(b.count, lang)}`))),
    h("p", { class: "muted", "data-goal-funnel-summary": "1" }, t(known ? "funnel.summary" : "funnel.empty", lang, { n: fmtNumber(goals.length, lang) })));
}

export function horizonArc(goals: readonly HorizonGoal[], lang: Locale): HTMLElement {
  const g = groupByHorizon(goals), marker = arcMarker(goals);
  const R = 120, cx = 160, cy = 140;
  const pt = (i: number) => { const a = Math.PI * (i / (ARC_ORDER.length - 1)); return [cx - R * Math.cos(a), cy - R * Math.sin(a)] as const; };
  const name = (k: string) => t(`horizon.${k}` as Key, lang);
  const svg = s("svg", { viewBox: "0 0 320 176", class: "harc", role: "img", focusable: "false", "data-arc-marker": marker ?? "none",
    "aria-label": `${t("arc.title", lang)}. ${marker ? t("arc.marker", lang, { h: name(marker) }) : t("arc.none", lang)}` });
  svg.append(s("path", { d: `M${cx - R} ${cy}A${R} ${R} 0 0 1 ${cx + R} ${cy}`, class: "harc-line", "stroke-dasharray": "6 4" }));
  ARC_ORDER.forEach((k, i) => {
    const [x, y] = pt(i); const n = g.byHorizon[k].length;
    svg.append(s("g", { class: `harc-stop${n ? " on" : ""}${marker === k ? " now" : ""}`, "data-stop": k },
      s("circle", { cx: x, cy: y, r: marker === k ? 10 : 7 }),
      s("text", { x, y: y + (i === 0 || i === ARC_ORDER.length - 1 ? 26 : -16), class: "harc-t" }, `${name(k)} · ${fmtNumber(n, lang)}`)));
  });
  return h("section", { class: "card harc-wrap", "data-arc-box": "1" }, h("h2", { class: "card-h" }, t("arc.title", lang)), svg,
    h("p", { class: "muted", "data-arc-text": "1" }, marker ? t("arc.marker", lang, { h: name(marker) }) : t("arc.none", lang)));
}

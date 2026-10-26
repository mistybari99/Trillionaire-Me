// SMART funnel: five bands (Specific, Measurable, Achievable, Relevant, Time-bound) narrowing to "Committed goal".
// Inline SVG, colours from design tokens only (works in every Design version, light and dark). A band is solid when the
// user filled that part and outlined when not; this is a fill-in guide, not a grade. The same meaning is in text (aria-label + list).
import { s } from "./svg";
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { fmtNumber } from "../i18n/t";
import { SMART_PARTS, type SmartPart } from "../core/goalPlan";

const LETTER: Record<SmartPart, string> = { specific: "S", measurable: "M", achievable: "A", relevant: "R", timebound: "T" };
const KEY: Record<SmartPart, Key> = { specific: "smart.f.s", measurable: "smart.f.m", achievable: "smart.f.a", relevant: "smart.f.r", timebound: "smart.f.t" };
const W = 320, BAND_H = 38, GAP = 4, TOP_W = 316, STEP = 28;

export function smartFunnel(filled: Record<SmartPart, boolean>, lang: Locale): HTMLElement {
  const count = SMART_PARTS.filter((p) => filled[p]).length;
  const all = count === SMART_PARTS.length;
  const summary = t("smart.f.summary", lang, { n: fmtNumber(count, lang) });
  const goalText = t("smart.f.goal", lang);
  const svg = s("svg", { viewBox: `0 0 ${W} ${SMART_PARTS.length * (BAND_H + GAP) + 44}`, class: "sfun", role: "img", "aria-label": `${t("smart.f.title", lang)}. ${summary}`, focusable: "false", "data-smart-funnel": String(count) });
  SMART_PARTS.forEach((p, i) => {
    const wTop = TOP_W - i * STEP, wBot = wTop - STEP + 4, y = i * (BAND_H + GAP), cx = W / 2;
    const d = `M${cx - wTop / 2} ${y}H${cx + wTop / 2}L${cx + wBot / 2} ${y + BAND_H}H${cx - wBot / 2}Z`;
    svg.append(s("g", { class: `sfun-band${filled[p] ? " on" : ""}`, "data-band": p, style: `--i:${i}` },
      s("path", { d }),
      s("text", { x: cx, y: y + BAND_H / 2 + 5, class: "sfun-t" }, `${LETTER[p]} · ${t(KEY[p], lang)}`)));
  });
  const gy = SMART_PARTS.length * (BAND_H + GAP) + 2;
  svg.append(s("g", { class: `sfun-goal${all ? " on" : ""}`, "data-band": "goal", style: "--i:5" },
    s("rect", { x: W / 2 - 80, y: gy, width: 160, height: 38, rx: 19, ...(all ? {} : { "stroke-dasharray": "4 3" }) }),
    s("text", { x: W / 2, y: gy + 24, class: "sfun-t" }, goalText)));
  return h("div", { class: "sfun-wrap", "data-smart-funnel-box": "1" }, svg,
    h("ol", { class: "sr-only", "data-smart-funnel-text": "1" },
      ...SMART_PARTS.map((p) => h("li", {}, `${t(KEY[p], lang)}: ${t(filled[p] ? "smart.f.done" : "smart.f.todo", lang)}`)),
      h("li", {}, `${goalText}: ${t(all ? "smart.f.done" : "smart.f.todo", lang)}`)),
    h("p", { class: "muted", "data-smart-funnel-summary": "1" }, summary));
}

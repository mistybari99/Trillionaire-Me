// Small visuals built from HTML so Bangla text wraps properly. Every visual is also a plain list (text equivalent, TM-REQ-068).
import { h } from "./dom";
import type { Tip } from "../library/topics";
import { labels } from "../library/topics";
import type { Locale } from "../i18n/registry";
import { tb } from "../i18n/t";

export function diagram(tip: Tip, lang: Locale): HTMLElement {
  const items = labels(tip.diagram, lang);
  const label = `${tb(tip.title, lang)}: ${items.join(" → ")}`;
  if (tip.diagram.type === "matrix") {
    return h("div", { class: "dg dg-matrix", role: "img", "aria-label": label, "data-diagram": "matrix" }, ...items.slice(0, 4).map((x, i) => h("div", { class: `cell c${i}` }, x)));
  }
  const cycle = tip.diagram.type === "cycle";
  return h("div", { class: `dg dg-steps${cycle ? " dg-cycle" : ""}`, role: "img", "aria-label": label, "data-diagram": tip.diagram.type },
    ...items.flatMap((x, i) => [h("div", { class: "node" }, h("b", {}, String(i + 1)), h("span", {}, x)), i < items.length - 1 ? h("div", { class: "arrow", "aria-hidden": "true" }, "↓") : null]),
    cycle ? h("div", { class: "arrow back", "aria-hidden": "true" }, "↻") : null);
}

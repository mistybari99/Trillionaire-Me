// 3D-style logo: champagne T-bar and M monogram on an obsidian tile. Drawn as inline SVG (gradients + a stepped back layer for depth).
// Bundled in the app, no file, no network, no 3D engine. Static by default; a single short shine passes only when motion is allowed.
import { s, nextId } from "./svg";
import { t } from "../i18n/t";
import type { Locale } from "../i18n/registry";

// Brand colours from the design board: Obsidian #0B1216, Champagne Gold #C9A96E.
const OBSIDIAN = ["#1E2A31", "#0B1216"], GOLD = ["#F1E3BC", "#C9A96E", "#8F7440"], GOLD_DEEP = "#5E4B28";
const T_BAR = "M24 20 H96 V31 H24 Z";
const M_MARK = "M28 100 V45 H38 L60 77 L82 45 H92 V100 H83 V61 L64 89 H56 L37 61 V100 Z";

/** size in px. animate: true on the splash only (a single shine pass, never looping, off under reduced motion). */
export function logo3d(size: number, lang: Locale, opts: { animate?: boolean } = {}): SVGSVGElement {
  const id = nextId("lg");
  const svg = s("svg", { viewBox: "0 0 120 120", width: size, height: size, class: `logo3d${opts.animate ? " logo-anim" : ""}`, role: "img", "aria-label": t("logo.alt", lang), focusable: "false", "data-logo": "3d" });
  const defs = s("defs", {},
    s("linearGradient", { id: `${id}-base`, x1: 0, y1: 0, x2: 1, y2: 1 }, s("stop", { offset: 0, "stop-color": OBSIDIAN[0]! }), s("stop", { offset: 1, "stop-color": OBSIDIAN[1]! })),
    s("linearGradient", { id: `${id}-gold`, x1: 0, y1: 0, x2: 1, y2: 1 }, s("stop", { offset: 0, "stop-color": GOLD[0]! }), s("stop", { offset: 0.5, "stop-color": GOLD[1]! }), s("stop", { offset: 1, "stop-color": GOLD[2]! })),
    s("linearGradient", { id: `${id}-rim`, x1: 0, y1: 0, x2: 1, y2: 1 }, s("stop", { offset: 0, "stop-color": GOLD[0]!, "stop-opacity": 0.9 }), s("stop", { offset: 1, "stop-color": GOLD[2]!, "stop-opacity": 0.5 })),
    s("radialGradient", { id: `${id}-floor`, cx: 0.5, cy: 0.5, r: 0.5 }, s("stop", { offset: 0, "stop-color": "#000", "stop-opacity": 0.45 }), s("stop", { offset: 1, "stop-color": "#000", "stop-opacity": 0 })),
    s("clipPath", { id: `${id}-clip` }, s("rect", { x: 6, y: 6, width: 108, height: 108, rx: 22 })));
  svg.append(defs,
    s("rect", { x: 6, y: 6, width: 108, height: 108, rx: 22, fill: `url(#${id}-base)` }),
    s("rect", { x: 7.5, y: 7.5, width: 105, height: 105, rx: 20.5, fill: "none", stroke: `url(#${id}-rim)`, "stroke-width": 1.5 }),
    s("ellipse", { cx: 62, cy: 104, rx: 38, ry: 5, fill: `url(#${id}-floor)` }));
  // depth: stepped back copies in deep gold, then the lit front face and a thin highlight along the top edges
  for (const d of [3, 2, 1]) svg.append(s("g", { transform: `translate(${d * 0.9} ${d * 1.1})`, fill: GOLD_DEEP }, s("path", { d: T_BAR }), s("path", { d: M_MARK })));
  svg.append(s("g", { fill: `url(#${id}-gold)` }, s("path", { d: T_BAR, "data-part": "t-bar" }), s("path", { d: M_MARK, "data-part": "m-mark" })),
    s("path", { d: "M24.8 20.8 H95.2 M29 45.8 H37.4 M28.8 99 V46", fill: "none", stroke: "#FFF6DC", "stroke-opacity": 0.55, "stroke-width": 0.9, "stroke-linecap": "round" }));
  if (opts.animate) svg.append(s("g", { "clip-path": `url(#${id}-clip)` }, s("rect", { class: "logo-shine", x: -50, y: 0, width: 26, height: 120, fill: "#FFFFFF", "fill-opacity": 0.22, transform: "skewX(-20)" })));
  return svg;
}

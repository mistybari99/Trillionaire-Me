// The "journey picture": night sky (one star per finished task) over a garden (one layer per passed stage). Pure SVG, no text.
import { gardenLayers, stars, tier } from "../core/reward";

const NS = "http://www.w3.org/2000/svg";
const el = (tag: string, a: Record<string, string | number> = {}, ...kids: SVGElement[]) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(a)) e.setAttribute(k, String(v)); kids.forEach((c) => e.append(c)); return e as SVGElement; };

const STAIRS = 4;
const stagesPassedSafe = (n: number) => Math.max(0, Math.min(8, Math.floor(n)));

export function journeyArt(completed: number, stagesPassed: number, opts: { newest?: boolean; milestone?: boolean } = {}): SVGElement {
  const t = tier(completed); const g = gardenLayers(stagesPassed); const ss = stars(completed);
  const gold = ["#E9E3D0", "#F3D98B", "#F3D98B", "#F6C453", "#F6C453", "#FFB347", "#FFB347"][t]!;
  const defs = el("defs", {}, el("linearGradient", { id: "sky", x1: 0, y1: 0, x2: 0, y2: 1 }, el("stop", { offset: "0", "stop-color": g >= 8 ? "#1E3A5F" : "#0F1630" }), el("stop", { offset: "1", "stop-color": g >= 7 ? "#7A4B6B" : g >= 4 ? "#2A3A66" : "#1B2447" })));
  const root = el("svg", { viewBox: "0 0 300 220", role: "img", "data-stars": ss.length, "data-layers": g, "data-tier": t, "aria-label": `${ss.length} stars, garden stage ${g} of 8` }, defs, el("rect", { width: 300, height: 220, fill: "url(#sky)" }));
  // constellation lines
  ss.forEach((s, i) => { if (i > 0 && Math.hypot(s.x - ss[i - 1]!.x, s.y - ss[i - 1]!.y) < 80) root.append(el("line", { x1: ss[i - 1]!.x, y1: ss[i - 1]!.y, x2: s.x, y2: s.y, stroke: gold, "stroke-opacity": 0.28, "stroke-width": 0.8 })); });
  ss.forEach((s, i) => { const isNew = !!opts.newest && i === ss.length - 1; root.append(el("circle", { cx: s.x, cy: s.y, r: s.r * (isNew ? 1.6 : 1), fill: gold, class: isNew ? "star new" : "star" })); if (isNew && opts.milestone) root.append(el("circle", { cx: s.x, cy: s.y, r: 14, fill: "none", stroke: gold, "stroke-opacity": 0.6 })); });
  if (opts.milestone && ss.length) root.append(el("path", { d: "M20 20 L60 36", stroke: "#fff", "stroke-width": 1.6, "stroke-linecap": "round", class: "shoot" }));
  // just-finished step: an arrow draws from the sky toward the garden, and the newest stair step lights (motion only without reduced-motion)
  if (opts.newest && ss.length) root.append(el("path", { d: "M24 120 Q70 40 128 70 M128 70 l-9 -3 M128 70 l-3 9", pathLength: 1, stroke: gold, "stroke-width": 1.6, "stroke-linecap": "round", fill: "none", class: "arrow-draw" }));
  if (opts.newest && stagesPassedSafe(stagesPassed) > 0) {
    const lit = Math.min(STAIRS, stagesPassedSafe(stagesPassed)) - 1;
    for (let i = 0; i < STAIRS; i++) root.append(el("rect", { x: 8 + 12 * i, y: 220 - 8 * (i + 1), width: 12, height: 8 * (i + 1), fill: i <= lit ? gold : "#243021", ...(i === lit ? { class: "step-lit" } : {}) }));
  }
  // garden: each passed stage adds one layer
  root.append(el("rect", { x: 0, y: 178, width: 300, height: 42, fill: g >= 1 ? "#2F5D3A" : "#243021" }));              // ground
  if (g >= 1) root.append(el("path", { d: "M150 178 q-2 -14 0 -22", stroke: "#7BC47F", "stroke-width": 3, fill: "none" }), el("ellipse", { cx: 146, cy: 158, rx: 6, ry: 3, fill: "#7BC47F" })); // sprout
  if (g >= 2) root.append(el("path", { d: "M150 156 q0 -26 0 -44", stroke: "#8B5E3C", "stroke-width": 5, fill: "none" }), el("ellipse", { cx: 160, cy: 130, rx: 9, ry: 4, fill: "#7BC47F" })); // stem
  if (g >= 3) root.append(el("path", { d: "M150 178 L150 100", stroke: "#8B5E3C", "stroke-width": 8, "stroke-linecap": "round" }));                         // trunk
  if (g >= 4) root.append(el("circle", { cx: 150, cy: 88, r: 30, fill: "#3E8E4E" }), el("circle", { cx: 128, cy: 104, r: 20, fill: "#4BA05B" }), el("circle", { cx: 174, cy: 102, r: 22, fill: "#4BA05B" })); // canopy
  if (g >= 5) [[96, 190], [212, 192], [60, 186], [248, 188]].forEach(([x, y]) => root.append(el("circle", { cx: x!, cy: y!, r: 3.5, fill: "#F28DB2" }), el("circle", { cx: x!, cy: y!, r: 1.2, fill: "#FFE08A" }))); // flowers
  if (g >= 6) [[140, 92], [160, 84], [150, 104]].forEach(([x, y]) => root.append(el("circle", { cx: x!, cy: y!, r: 3.4, fill: "#F6C453" })));            // fruit
  if (g >= 7) root.append(el("circle", { cx: 252, cy: 150, r: 14, fill: "#FFD27A", "fill-opacity": 0.9 }), el("path", { d: "M96 70 q6 -6 12 0 q6 -6 12 0", stroke: "#E9E3D0", "stroke-width": 1.6, fill: "none" })); // sun + bird
  if (g >= 8) root.append(el("path", { d: "M0 60 Q150 20 300 60", stroke: "#8FE0C0", "stroke-opacity": 0.5, "stroke-width": 10, fill: "none" }), el("circle", { cx: 150, cy: 88, r: 46, fill: "none", stroke: "#F6C453", "stroke-opacity": 0.5, "stroke-width": 2 })); // aurora + golden halo
  return root;
}

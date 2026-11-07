// Progress ring: draws in once, pops and glows softly at a milestone. CSS only (no script timers); every animation lives inside
// prefers-reduced-motion: no-preference, so the final picture is shown still when motion is reduced.
// The meaning is always in text: callers pass the same sentence that sits beside the ring.
import { s } from "./svg";

/**
 * percent: whole 0..100, or null (Unknown: dashed ring with "?", nothing drawn as progress).
 * milestone: true when the value just reached 25, 50, 75 or 100 (adds the pop and the soft glow).
 */
export function progressRing(percent: number | null, text: string, milestone = false): SVGSVGElement {
  const known = percent !== null && Number.isFinite(percent);
  const p = known ? Math.max(0, Math.min(100, Math.round(percent as number))) : 0;
  const svg = s("svg", { viewBox: "0 0 64 64", class: `pr${known && milestone ? " pr-ms" : ""}`, role: "img", "aria-label": text, focusable: "false", "data-ring": known ? String(p) : "unknown", ...(known && milestone ? { "data-ring-ms": "1" } : {}) });
  if (!known) { svg.append(s("circle", { cx: 32, cy: 32, r: 26, class: "pr-track pr-unk", "stroke-dasharray": "4 3" }), s("text", { x: 32, y: 37, class: "pr-num" }, "?")); return svg; }
  svg.append(s("circle", { cx: 32, cy: 32, r: 26, class: "pr-glow" }), s("circle", { cx: 32, cy: 32, r: 26, class: "pr-track" }));
  if (p > 0) svg.append(s("circle", { cx: 32, cy: 32, r: 26, class: "pr-arc", pathLength: 100, "stroke-dasharray": 100, "stroke-dashoffset": 100 - p, transform: "rotate(-90 32 32)" }));
  svg.append(s("text", { x: 32, y: 37, class: "pr-num" }, `${p}%`));
  return svg;
}

/** True when the percent sits exactly on a milestone (25, 50, 75, 100). */
export const isMilestone = (p: number | null): boolean => p === 25 || p === 50 || p === 75 || p === 100;

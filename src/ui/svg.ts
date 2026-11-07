// Tiny SVG helper shared by the newer screens. Text nodes are plain text (never HTML).
const NS = "http://www.w3.org/2000/svg";
export type SvgAttrs = Record<string, string | number>;
export function s<K extends keyof SVGElementTagNameMap>(tag: K, attrs: SvgAttrs = {}, ...kids: Array<Node | string | null>): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  for (const c of kids) if (c !== null) el.append(typeof c === "string" ? document.createTextNode(c) : c);
  return el;
}
let uid = 0;
/** Unique id for gradients and clip paths, so two copies of one picture on a page never clash. */
export const nextId = (prefix: string): string => `${prefix}-${++uid}`;

/** Q-09: four small level icons (mission = tree, goal = apple, project = slice, task = seed). Decorative: aria-hidden, drawn in the text colour, the level name always sits beside them. */
export type LevelIcon = "mission" | "goal" | "project" | "task";
export const LEVEL_ICONS: readonly LevelIcon[] = ["mission", "goal", "project", "task"];
export function levelIcon(level: LevelIcon): SVGSVGElement {
  const p = { fill: "none", stroke: "currentColor", "stroke-width": 1.6, "stroke-linecap": "round", "stroke-linejoin": "round" } as const;
  const shapes: Record<LevelIcon, SVGElement[]> = {
    mission: [s("circle", { cx: 8, cy: 6, r: 4.2, ...p }), s("path", { d: "M8 10.2V15M5.5 15h5", ...p })],
    goal: [s("circle", { cx: 8, cy: 9.5, r: 4.6, ...p }), s("path", { d: "M8 4.9C8 3.5 8.8 2.5 10 2.2", ...p })],
    project: [s("path", { d: "M2.5 12.5A6.5 6.5 0 0 1 13.5 12.5Z", ...p }), s("path", { d: "M8 12.5V8.6", ...p })],
    task: [s("ellipse", { cx: 8, cy: 8, rx: 3, ry: 4.8, ...p }), s("path", { d: "M8 4V12", ...p })],
  };
  return s("svg", { viewBox: "0 0 16 16", width: 16, height: 16, "aria-hidden": "true", focusable: "false", class: "lvl-icon", "data-level-icon": level }, ...shapes[level]);
}

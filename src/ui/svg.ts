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

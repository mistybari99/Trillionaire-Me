// Design versions registry. A version is a set of CSS-variable tokens applied through <html data-design="...">.
// To add a version: add ONE entry to DESIGNS below (plus its 2 label keys in src/i18n/packs.ts). Nothing else changes.
// "classic" has no tokens: it is the base block in styles.css, so choosing it changes nothing.
import type { Key } from "../i18n/packs";

export type Tokens = Record<"paper" | "card" | "ink" | "muted" | "rule" | "primary" | "on-primary" | "ember" | "moss" | "demo" | "demo-bg" | "danger", string>;
export interface Design {
  id: string;
  label: Key; desc: Key;
  /** Light tokens and dark tokens. Dark follows the phone (data-theme auto) or the Theme choice. Omit both to use styles.css as is. */
  light?: Tokens; dark?: Tokens;
  /** Extra rules after the tokens (gradients, glass). Must use the tokens; no animation outside prefers-reduced-motion: no-preference. */
  extraCss?: string;
  /** Three colours for the preview swatch in the chooser. */
  swatch: [string, string, string];
}

export const DEFAULT_DESIGN = "classic";

export const DESIGNS: Design[] = [
  { id: "classic", label: "design.classic", desc: "design.classic.desc", swatch: ["#F5F1E8", "#243B6B", "#B0431A"] },
  {
    id: "light-futuristic", label: "design.lf", desc: "design.lf.desc",
    swatch: ["#EEF2FF", "#4B3FD8", "#C2185B"],
    light: { paper: "#F2F5FF", card: "#FFFFFF", ink: "#12162B", muted: "#4A5370", rule: "#6B7699", primary: "#4B3FD8", "on-primary": "#FFFFFF", ember: "#B3135A", moss: "#0A7656", demo: "#7A4B00", "demo-bg": "#FFEFC7", danger: "#B3261E" },
    dark: { paper: "#0B0E1F", card: "#151A33", ink: "#EEF1FF", muted: "#A9B2CF", rule: "#7882A6", primary: "#A9B8FF", "on-primary": "#0B0E1F", ember: "#FF8DB8", moss: "#6EE0B4", demo: "#FFD27A", "demo-bg": "#2E2410", danger: "#FF9A8F" },
    extraCss: `
:root[data-design="light-futuristic"] body{background:radial-gradient(120% 60% at 100% 0,color-mix(in srgb,var(--primary) 16%,transparent),transparent 60%),radial-gradient(90% 50% at 0 8%,color-mix(in srgb,var(--ember) 12%,transparent),transparent 60%),var(--paper)}
:root[data-design="light-futuristic"] .card{background:color-mix(in srgb,var(--card) 86%,transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-radius:16px;box-shadow:0 6px 22px color-mix(in srgb,var(--primary) 14%,transparent)}
:root[data-design="light-futuristic"] .cta,:root[data-design="light-futuristic"] .btn{background:linear-gradient(135deg,var(--primary),color-mix(in srgb,var(--primary) 70%,var(--ink)));border-radius:14px}
:root[data-design="light-futuristic"] nav{background:color-mix(in srgb,var(--card) 90%,transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
:root[data-design="light-futuristic"] .seg button{border-radius:12px}
@media (prefers-reduced-motion:no-preference){:root[data-design="light-futuristic"] .card,:root[data-design="light-futuristic"] .cta{transition:box-shadow .2s ease}}`,
  },
];

export const isDesignId = (v: unknown): v is string => typeof v === "string" && DESIGNS.some((d) => d.id === v);
export const designOf = (id: string): Design => DESIGNS.find((d) => d.id === id) ?? DESIGNS[0]!;

const block = (t: Tokens) => Object.entries(t).map(([k, v]) => `--${k}:${v}`).join(";");
/** CSS for every non-classic version. Light first, then dark (explicit dark, then phone dark in auto). */
export function designCss(list: Design[] = DESIGNS): string {
  return list.filter((d) => d.light && d.dark).map((d) => {
    const s = `:root[data-design="${d.id}"]`;
    return `${s}:not([data-theme="dark"]){${block(d.light!)}}\n${s}[data-theme="dark"]{${block(d.dark!)}}\n@media (prefers-color-scheme:dark){${s}[data-theme="auto"]{${block(d.dark!)}}}${d.extraCss ?? ""}`;
  }).join("\n");
}

/** Put the version CSS in the page once, and set data-design on the root. Safe to call repeatedly. */
export function applyDesign(id: string, root: HTMLElement = document.documentElement): void {
  let el = document.getElementById("tm-design-css");
  if (!el) { el = document.createElement("style"); el.id = "tm-design-css"; el.textContent = designCss(); document.head.appendChild(el); }
  root.dataset.design = designOf(id).id;
}

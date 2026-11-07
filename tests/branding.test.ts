// Branding (T-ME, owner 3 Nov 2026): one original T + M emblem (inline SVG, no 3D engine, no network), app icons (any + maskable), a short reduced-motion-safe splash,
// brand palette tokens. Nothing third-party. The default Light Futuristic look must stay exactly as it was.
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { T_BAR, M_MARK } from "../src/ui/logo";
import { DESIGNS, BRAND_LINE_CSS, designCss } from "../src/ui/themes";

const read = (f: string) => readFileSync(f, "utf8");
const icon = read("public/icon.svg"), maskable = read("public/icon-maskable.svg"), html = read("index.html"), css = read("src/ui/styles.css"), manifest = JSON.parse(read("public/manifest.webmanifest"));
const hex = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (h: string) => { const c = hex(h).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!; };
const cr = (a: string, b: string) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const png = (f: string) => { const b = readFileSync(f); expect(b.subarray(1, 4).toString()).toBe("PNG"); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };

describe("emblem: one geometry everywhere", () => {
  it("logo, both icon files and the splash draw the same T bar and M", () => {
    for (const [name, text] of [["icon.svg", icon], ["icon-maskable.svg", maskable], ["index.html splash", html]] as const) { expect(text, name).toContain(`d="${T_BAR}"`); expect(text, name).toContain(`d="${M_MARK}"`); }
  });
  it("uses the brand palette: obsidian, champagne, emerald; no gradient, image, script or network address in the icons", () => {
    expect(icon).toContain("#0B1216"); expect(icon).toContain("#C9A96E"); expect(icon).toContain("#1B6F57"); expect(maskable).toContain("#0B1216"); expect(maskable).toContain("#C9A96E");
    for (const x of [icon, maskable]) expect(x).not.toMatch(/https?:\/\/(?!www\.w3\.org)|<image|<script|<foreignObject|href=/i);
  });
  it("champagne on obsidian reads at 4.5:1 or better (emblem and splash)", () => { expect(cr("#C9A96E", "#0B1216")).toBeGreaterThanOrEqual(4.5); });
});

describe("app icons and manifest", () => {
  it("manifest lists any and maskable PNGs at 192 and 512, the SVG, and an obsidian splash background; every file exists with the right size", () => {
    const by = (p: string, s: string) => manifest.icons.find((i: { purpose: string; sizes: string }) => i.purpose === p && i.sizes === s);
    for (const [p, s] of [["any", "192x192"], ["any", "512x512"], ["maskable", "192x192"], ["maskable", "512x512"]]) { const i = by(p!, s!); expect(i, `${p} ${s}`).toBeTruthy(); expect(existsSync(`public/${i.src}`), i.src).toBe(true); const d = png(`public/${i.src}`); expect(`${d.w}x${d.h}`).toBe(s); }
    expect(manifest.icons.some((i: { src: string }) => i.src === "icon.svg")).toBe(true); expect(manifest.background_color).toBe("#0B1216"); expect(png("public/icon-180.png")).toEqual({ w: 180, h: 180 });
    expect(html).toContain('rel="apple-touch-icon" href="./icon-180.png"');
  });
  it("the maskable icon keeps the emblem inside the safe zone (a circle of 40% of the size), and is full-bleed", () => {
    expect(maskable).toMatch(/<rect width="120" height="120" fill="#0B1216"\/>/); const sc = Number(maskable.match(/scale\(([\d.]+)\)/)![1]);
    const corners = [[24, 20], [96, 20], [28, 100], [92, 100]].map(([x, y]) => Math.hypot((x! - 60) * sc, (y! - 60) * sc)); expect(Math.max(...corners)).toBeLessThanOrEqual(48);
  });
  it("the page and the manifest still agree on the theme colour", () => { expect(manifest.theme_color).toBe(html.match(/name="theme-color" content="([^"]+)"/)![1]); });
});

describe("splash", () => {
  it("is in the page before any script, hidden from assistive tech, never takes taps, and has no network address", () => {
    const m = html.match(/<div id="tm-splash"[^>]*>[\s\S]*?<\/div>/)!; expect(m[0]).toContain('aria-hidden="true"'); expect(html).toMatch(/#tm-splash\{[^}]*pointer-events:none/); expect(m[0]).not.toMatch(/https?:|<script|<image/);
    expect(html.indexOf('id="tm-splash"')).toBeLessThan(html.indexOf('id="app"'));
  });
  it("its animation runs only when motion is allowed, once, and is switched off under reduced motion; the static emblem stays", () => {
    const css2 = html.match(/<style id="tm-splash-css">([\s\S]*?)<\/style>/)![1]!; const outside = css2.replace(/@media \(prefers-reduced-motion:no-preference\)\{[\s\S]*?\n\}/, "");
    expect(outside).not.toMatch(/animation:(?!none)/); expect(css2).toMatch(/@media \(prefers-reduced-motion:reduce\)\{#tm-splash,#tm-splash \*\{animation:none!important/);
    expect(css2).toMatch(/forwards/); expect(css2).not.toMatch(/infinite/); expect(css2).toMatch(/\.7s/);
  });
  it("is removed by the app after the first screen is drawn", () => { const main = read("src/main.ts"); expect(main).toContain('getElementById("tm-splash")'); expect(main).toMatch(/renderApp\(\); hideSplash\(\)/); });
  it("CSP still allows it: inline style only, no inline script", () => { expect(html).toMatch(/style-src 'self' 'unsafe-inline'/); expect(html).not.toMatch(/<script(?![^>]*src=)[^>]*>/); });
});

describe("brand tokens and the four looks", () => {
  it("brand tokens exist once, with the three board colours, for every look", () => { expect(css).toMatch(/html\{--brand-obsidian:#0B1216;--brand-champagne:#C9A96E;--brand-emerald:#1B6F57\}/); });
  it("the brand hairline applies to the three other looks and not to Light Futuristic", () => {
    expect(BRAND_LINE_CSS).toContain(':not([data-design="light-futuristic"])'); expect(BRAND_LINE_CSS).toContain("var(--brand-champagne)"); expect(BRAND_LINE_CSS).toContain("var(--brand-emerald)"); expect(designCss()).toContain(BRAND_LINE_CSS);
    expect(DESIGNS.find((d) => d.id === "light-futuristic")!.extraCss).not.toContain("brand");
  });
  it("the default look is unchanged: Light Futuristic keeps its exact tokens", () => {
    const lf = DESIGNS.find((d) => d.id === "light-futuristic")!; expect(DESIGNS[0]!.id).toBe("light-futuristic");
    expect(lf.light).toMatchObject({ paper: "#F2F5FF", card: "#FFFFFF", ink: "#12162B", primary: "#4B3FD8", ember: "#B3135A", danger: "#B3261E" });
    expect(lf.dark).toMatchObject({ paper: "#0B0E1F", card: "#151A33", primary: "#A9B8FF" });
  });
  it("Emerald Obsidian already carries the board palette (obsidian page, champagne accent, emerald action)", () => {
    const eo = DESIGNS.find((d) => d.id === "emerald-obsidian")!; expect(eo.dark!.paper).toBe("#0B1216"); expect(eo.dark!.primary).toBe("#C9A96E"); expect(eo.light!.primary).toBe("#1B6F57");
  });
});

// Renders the app icons from the two SVG files in public/ (brand emblem: champagne T + M on obsidian, emerald ring on the "any" icon).
// Run: node tools/make-icons.mjs. Output: icon-192.png, icon-512.png (purpose any), icon-maskable-192.png, icon-maskable-512.png (purpose maskable), icon-180.png (apple-touch-icon).
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const any = readFileSync("public/icon.svg", "utf8"), maskable = readFileSync("public/icon-maskable.svg", "utf8");
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const jobs = [["icon-192.png", any, 192], ["icon-512.png", any, 512], ["icon-180.png", maskable, 180], ["icon-maskable-192.png", maskable, 192], ["icon-maskable-512.png", maskable, 512]];
for (const [file, svg, size] of jobs) {
  const p = await b.newPage({ viewport: { width: size, height: size } });
  await p.setContent(`<body style="margin:0;background:transparent">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body>`);
  await p.screenshot({ path: `public/${file}`, omitBackground: true });
}
await b.close();

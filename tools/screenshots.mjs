// Screenshot report: every route at 360 px, Bangla and English (G1 definition of done).
import { chromium } from "playwright";
import { preview } from "vite";
import { mkdirSync, writeFileSync } from "node:fs";

const routes = ["today", "journey", "diary", "diary/intake/1", "diary/intake/2", "diary/intake/3", "diary/intake/4", "diary/intake/5", "diary/intake/6", "diary/intake/7", "deen", "more", "more/status", "more/fields", "more/safety", "more/data"];
const out = "evidence/screenshots";
mkdirSync(out, { recursive: true });
const server = await preview({ preview: { port: 4173, strictPort: true } });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const report = [];
for (const lang of ["bn", "en"]) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2 });
  await ctx.addInitScript((l) => localStorage.setItem("tm:ui:lang", l), lang);
  const page = await ctx.newPage();
  for (const r of routes) {
    await page.goto(`http://localhost:4173/#/${r}`);
    await page.waitForSelector("main");
    const file = `${out}/${lang}-${r.replace(/\//g, "_")}.png`;
    await page.screenshot({ path: file, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    report.push({ lang, route: r, file, horizontalOverflow: overflow });
  }
  await ctx.close();
}
await browser.close(); await server.close();
writeFileSync("evidence/screenshot-report.json", JSON.stringify({ viewport: "360x740", generated: new Date().toISOString(), screens: report }, null, 2));
console.log(report.length, "screens;", report.filter((x) => x.horizontalOverflow).length, "with horizontal overflow");

// Screenshot report: every route at 360 px, Bangla and English (G1 definition of done).
import { chromium } from "playwright";
import { preview } from "vite";
import { mkdirSync, writeFileSync } from "node:fs";

const routes = ["today", "journey", "diary", "diary/intake/1", "diary/intake/2", "diary/intake/3", "diary/intake/4", "diary/intake/5", "diary/intake/6", "diary/intake/7", "diary/plan", "diary/money", "journey/log", "journey/report", "journey/horizon", "capture", "stuck", "topics", "topic/procrastination", "topic/emotions", "reward", "journey/art", "habits", "cards", "deen", "more", "more/status", "more/fields", "more/glossary", "more/safety", "more/data", "focus/shot-task"];
// Demo task seeded only for the focus screenshot (demo namespace, DEMO-labelled values, never real data).
const SEED_TASK = { id: "shot-task", entity: "task", ns: "demo", ownerId: "demo-user", schemaVersion: 1, createdAt: new Date().toISOString(), values: { "task.title": { state: "value", value: "Write the report outline", label: "DEMO" }, "task.minutes": { state: "value", value: 25, label: "DEMO" }, "task.priority": { state: "value", value: "high", label: "DEMO" } } };
const out = "evidence/screenshots";
mkdirSync(out, { recursive: true });
const server = await preview({ preview: { port: 4173, strictPort: true } });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const report = [];
for (const lang of ["bn", "en"]) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2 });
  await ctx.addInitScript((l) => localStorage.setItem("tm:ui:lang", l), lang);
  // Seed the demo task before the app boots, and only for the focus route (a hash change alone would not re-run this).
  await ctx.addInitScript((rec) => { try { if (location.hash.startsWith("#/focus/")) localStorage.setItem(`tm:demo:${rec.id}`, JSON.stringify(rec)); } catch { /* storage blocked */ } }, SEED_TASK);
  const page = await ctx.newPage();
  for (const r of routes) {
    if (r.startsWith("focus/")) await page.goto("about:blank"); // fresh document so the init script seeds the task
    await page.goto(`http://localhost:4173/#/${r.replace("shot-task", SEED_TASK.id)}`);
    await page.waitForSelector("main");
    await page.waitForTimeout(1500); // let fade-in and journey micro-animations settle before capture
    const file = `${out}/${lang}-${r.replace(/\//g, "_")}.png`;
    await page.screenshot({ path: file, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    const langBtn = await page.evaluate(() => { const b = document.querySelector('[data-act="lang-open"]'); if (!b) return null; const r = b.getBoundingClientRect(); return { w: r.width, h: r.height, inView: r.right <= window.innerWidth }; });
    report.push({ lang, route: r, file, horizontalOverflow: overflow, langIcon: !!langBtn && langBtn.w >= 44 && langBtn.h >= 44 && langBtn.inView });
  }
  await ctx.close();
}
await browser.close(); await server.close();
writeFileSync("evidence/screenshot-report.json", JSON.stringify({ viewport: "360x740", generated: new Date().toISOString(), screens: report }, null, 2));
console.log(report.filter((x) => !x.langIcon).length, "screens without a 44px language icon;");
console.log(report.length, "screens;", report.filter((x) => x.horizontalOverflow).length, "with horizontal overflow");

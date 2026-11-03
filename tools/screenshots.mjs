// Screenshot report: every route at 360 px, Bangla and English (G1 definition of done).
import { existsSync } from "node:fs";
const SANDBOX_CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
import { chromium } from "playwright";
import { preview } from "vite";
import { mkdirSync, writeFileSync } from "node:fs";

const routes = ["today", "journey", "diary", "diary/intake/1", "diary/intake/2", "diary/intake/3", "diary/intake/4", "diary/intake/5", "diary/intake/6", "diary/intake/7", "diary/plan", "diary/money", "journey/log", "journey/report", "journey/horizon", "capture", "stuck", "topics", "topic/procrastination", "topic/emotions", "reward", "journey/art", "habits", "cards", "deen", "settings", "more/status", "more/fields", "more/glossary", "more/safety", "settings/data", "focus/shot-task", "settings/look", "settings/prayer", "settings/backup", "settings/backup/restore", "settings/privacy", "settings/data/start-real", "settings/plan", "settings/connections", "settings/delete", "settings/about"];
// Demo task seeded only for the focus screenshot (demo namespace, DEMO-labelled values, never real data).
const SEED_TASK = { id: "shot-task", entity: "task", ns: "demo", ownerId: "demo-user", schemaVersion: 1, createdAt: new Date().toISOString(), values: { "task.title": { state: "value", value: "Write the report outline", label: "DEMO" }, "task.minutes": { state: "value", value: 25, label: "DEMO" }, "task.priority": { state: "value", value: "high", label: "DEMO" } } };
const out = "evidence/screenshots";
mkdirSync(out, { recursive: true });
const server = await preview({ preview: { port: 4173, strictPort: true } });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync(SANDBOX_CHROME) ? SANDBOX_CHROME : undefined) });
const report = [];
// Look matrix (TM_SHOT_LOOKS=1): all 4 Design versions x light/dark x normal/reduced motion at 360 px, English, with a seeded DEMO goal and tasks.
const LOOKS = process.env.TM_SHOT_LOOKS === "1";
const ALL_DESIGNS = ["light-futuristic", "ink-paper", "emerald-obsidian", "broadsheet"];
// TM_SHOT_ONLY_DESIGN=<id> runs one look (smaller memory use); the parts are merged by hand into evidence/matrix-report.json.
const DESIGNS = process.env.TM_SHOT_ONLY_DESIGN ? ALL_DESIGNS.filter((d) => d === process.env.TM_SHOT_ONLY_DESIGN) : ALL_DESIGNS;
const mkRec = (id, entity, values, links) => ({ id, entity, ns: "demo", ownerId: "demo-user", schemaVersion: 1, createdAt: new Date().toISOString(), values: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, { state: "value", value: v, label: "DEMO" }])), ...(links ? { links } : {}) });
const SEED = [mkRec("shot-goal", "goal", { "goal.title": "Save for a laptop", "goal.smart_specific": "Put 500 BDT aside each week", "goal.success": "Jar holds 6000 BDT" }), mkRec("shot-t1", "task", { "task.title": "Open a savings jar", "task.done_on": "2026-10-20" }, { goal: "shot-goal" }), mkRec("shot-t2", "task", { "task.title": "Set a weekly reminder" }, { goal: "shot-goal" }), mkRec("shot-t3", "task", { "task.title": "Read the bill" })];
// Matrix (TM_SHOT_MATRIX=1): 4 Design versions x English/Bangla x light/dark x normal/200% text at 360 px over the main screens, with a seeded DEMO goal and tasks.
// Writes evidence/matrix-report.json (numbers) and keeps pictures only for screens that overflow or have a too-small target, in evidence/screenshots-matrix/.
// 200% text is set the same way the e2e check does it (root font size), so the page shows what a person with large text sees.
if (process.env.TM_SHOT_MATRIX === "1") {
  const routes = ["today", "journey", "journey/goal/shot-goal", "journey/month", "deen", "settings", "settings/prayer", "settings/privacy", "settings/backup", "diary/plan"];
  const mdir = "evidence/screenshots-matrix"; mkdirSync(mdir, { recursive: true });
  const visit = new Date(Date.now() - 6 * 86400000); const lastOpen = `${visit.getFullYear()}-${String(visit.getMonth() + 1).padStart(2, "0")}-${String(visit.getDate()).padStart(2, "0")}`;
  for (const design of DESIGNS) for (const lang of ["en", "bn"]) for (const scheme of ["light", "dark"]) for (const big of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, colorScheme: scheme });
    await ctx.addInitScript(([d, l, recs, lo]) => { try { localStorage.setItem("tm:ui:lang", l); localStorage.setItem("tm:ui:design", d); localStorage.setItem("tm:ui:dataMode", "demo"); localStorage.setItem("tm:ui:visit", JSON.stringify({ lastOpen: lo, welcome: null })); for (const r of recs) localStorage.setItem(`tm:demo:${r.id}`, JSON.stringify(r)); } catch { /* storage blocked */ } }, [design, lang, SEED, lastOpen]);
    const page = await ctx.newPage();
    for (const r of routes) {
      await page.goto("about:blank"); await page.goto(`http://localhost:4173/#/${r}`);
      await page.waitForSelector("main"); if (big) await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; }); await page.waitForTimeout(500);
      const m = await page.evaluate(() => {
        const vw = window.innerWidth; const vis = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
        const wide = [...document.querySelectorAll("main *")].filter((e) => vis(e) && e.getBoundingClientRect().right > vw + 1 && !e.closest("svg, .sr-only, [aria-hidden=true], pre, table")).length;
        const small = [...document.querySelectorAll("main button, main a.btn, main select, main input:not([type=checkbox]):not([type=radio]):not([type=hidden])")].filter((e) => vis(e) && e.getBoundingClientRect().height < 43).length;
        return { overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, wide, small, tabsInView: [...document.querySelectorAll("nav a.tab")].every((a) => a.getBoundingClientRect().right <= vw + 1) };
      });
      const id = `${design}/${lang}/${scheme}/${big ? "200" : "100"}`;
      let file = null;
      if (m.overflow || m.wide || m.small || !m.tabsInView) { file = `${mdir}/${id.replace(/\//g, "-")}-${r.replace(/\//g, "_")}.png`; await page.screenshot({ path: file, fullPage: true }); }
      report.push({ combo: id, route: r, ...m, file });
    }
    await ctx.close();
  }
  await browser.close(); await server.close();
  const bad = report.filter((x) => x.overflow || x.wide || x.small || !x.tabsInView);
  writeFileSync(process.env.TM_SHOT_ONLY_DESIGN ? `evidence/matrix-part-${process.env.TM_SHOT_ONLY_DESIGN}.json` : "evidence/matrix-report.json", JSON.stringify({ viewport: "360x740", generated: new Date().toISOString(), combos: DESIGNS.length * 2 * 2 * 2, screens: report.length, problems: bad.length, bad }, null, 2));
  console.log(report.length, "matrix screens;", bad.length, "with a problem;", report.filter((x) => x.overflow).length, "overflow,", report.filter((x) => x.wide).length, "wide elements,", report.filter((x) => x.small).length, "small targets");
  process.exit(0);
}
if (LOOKS) {
  const lookRoutes = ["today", "journey", "journey/goal/shot-goal", "deen", "settings"];
  for (const design of DESIGNS) for (const scheme of ["light", "dark"]) for (const motion of ["no-preference", "reduce"]) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, colorScheme: scheme, reducedMotion: motion });
    await ctx.addInitScript(([d, th, recs]) => { try { localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:design", d); localStorage.setItem("tm:ui:theme", th); localStorage.setItem("tm:ui:dataMode", "demo"); for (const r of recs) localStorage.setItem(`tm:demo:${r.id}`, JSON.stringify(r)); } catch { /* storage blocked */ } }, [design, scheme, SEED]);
    const page = await ctx.newPage();
    for (const r of lookRoutes) {
      await page.goto("about:blank"); await page.goto(`http://localhost:4173/#/${r}`);
      await page.waitForSelector("main"); await page.waitForTimeout(1300);
      const file = `${out}/look-${design}-${scheme}-${motion === "reduce" ? "rm" : "mo"}-${r.replace(/\//g, "_")}.png`;
      await page.screenshot({ path: file, fullPage: true });
      const m = await page.evaluate(() => { const bad = [...document.querySelectorAll("main *")].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.right > window.innerWidth + 1; }).length; const small = [...document.querySelectorAll("main a, main button, main input, main select")].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && !e.classList.contains("sr-only") && (b.height < 43.5); }).length; return { overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, wideElements: bad, under44: small, anim: document.getAnimations().filter((a) => a.playState === "running").length }; });
      report.push({ look: `${design}/${scheme}/${motion}`, route: r, file, ...m });
    }
    await ctx.close();
  }
  await browser.close(); await server.close();
  writeFileSync("evidence/looks-report.json", JSON.stringify({ viewport: "360x740", generated: new Date().toISOString(), screens: report }, null, 2));
  console.log(report.length, "look screens;", report.filter((x) => x.overflow || x.wideElements).length, "with overflow;", report.filter((x) => x.look.endsWith("reduce") && x.anim > 0).length, "reduced-motion screens with running animations");
  process.exit(0);
}
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

// Screenshot report: every route at 360 px, Bangla and English (G1 definition of done).
import { TOUCHING_FN, ADJACENT_FN } from "./touching.mjs";
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
const PORT = Number(process.env.TM_SHOT_PORT || 4173);
const server = await preview({ preview: { port: PORT, strictPort: true } });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync(SANDBOX_CHROME) ? SANDBOX_CHROME : undefined) });
const report = [];
// Look matrix (TM_SHOT_LOOKS=1): all 4 Design versions x light/dark x normal/reduced motion at 360 px, English, with a seeded DEMO goal and tasks.
const LOOKS = process.env.TM_SHOT_LOOKS === "1";
const ALL_DESIGNS = ["light-futuristic", "ink-paper", "emerald-obsidian", "broadsheet"];
// TM_SHOT_ONLY_DESIGN=<id> runs one look (smaller memory use); the parts are merged by hand into evidence/matrix-report.json.
const DESIGNS = process.env.TM_SHOT_ONLY_DESIGN ? ALL_DESIGNS.filter((d) => d === process.env.TM_SHOT_ONLY_DESIGN) : ALL_DESIGNS;
const mkRec = (id, entity, values, links) => ({ id, entity, ns: "demo", ownerId: "demo-user", schemaVersion: 1, createdAt: new Date().toISOString(), values: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, { state: "value", value: v, label: "DEMO" }])), ...(links ? { links } : {}) });
const SEED = [mkRec("shot-goal-empty", "goal", { "goal.title": "Learn a new skill" }), mkRec("shot-goal", "goal", { "goal.title": "Save for a laptop", "goal.smart_specific": "Put 500 BDT aside each week", "goal.success": "Jar holds 6000 BDT" }), mkRec("shot-t1", "task", { "task.title": "Open a savings jar", "task.done_on": "2026-10-20" }, { goal: "shot-goal" }), mkRec("shot-t2", "task", { "task.title": "Set a weekly reminder" }, { goal: "shot-goal" }), mkRec("shot-t3", "task", { "task.title": "Read the bill" })];
// TM_SHOT_SEED_Q3=1 (batch 3 screens): adds an old DEMO habit with a category, dates and an "After I..." line, so its card, the earlier-day input and the tiny-habit starter all show.
if (process.env.TM_SHOT_SEED_Q3 === "1") for (const r of SEED) if (r.id === "shot-t1" || r.id === "shot-t2") r.values["task.minutes"] = { state: "value", value: r.id === "shot-t1" ? 30 : 50, label: "DEMO" };
if (process.env.TM_SHOT_SEED_Q3 === "1") SEED.push({ ...mkRec("shot-habit", "habit", { "habit.title": "Walk after dinner", "habit.days": "0,1,2,3,4,5,6", "habit.category": "Health", "habit.start_on": "2026-10-10", "habit.end_on": "2026-12-31", "habit.anchor": "finish dinner", "habit.minutes": 2 }), createdAt: new Date(Date.now() - 40 * 86400000).toISOString() });
// Matrix (TM_SHOT_MATRIX=1): 4 Design versions x English/Bangla x light/dark x normal/200% text at 360 px over the main screens, with a seeded DEMO goal and tasks.
// Writes evidence/matrix-report.json (numbers) and keeps pictures only for screens that overflow or have a too-small target, in evidence/screenshots-matrix/.
// 200% text is set the same way the e2e check does it (root font size), so the page shows what a person with large text sees.
// TM_SHOT_MATRIX_MERGE=1: merge the four per-look parts (run each with TM_SHOT_ONLY_DESIGN=<id> in parallel) into evidence/matrix-report.json.
if (process.env.TM_SHOT_MATRIX_MERGE === "1") {
  const { readFileSync: rf, unlinkSync } = await import("node:fs");
  const parts = ["light-futuristic", "ink-paper", "emerald-obsidian", "broadsheet"].map((d) => JSON.parse(rf(`evidence/matrix-part-${d}.json`, "utf8")));
  const bad = parts.flatMap((p) => p.bad);
  writeFileSync("evidence/matrix-report.json", JSON.stringify({ viewport: "360x740", generated: new Date().toISOString(), combos: parts.reduce((a, p) => a + p.combos, 0), screens: parts.reduce((a, p) => a + p.screens, 0), problems: bad.length, bad, routes: parts[0].routes, matrix: "4 looks x en/bn x light/dark x 100%/200% text" }, null, 2));
  for (const d of ["light-futuristic", "ink-paper", "emerald-obsidian", "broadsheet"]) unlinkSync(`evidence/matrix-part-${d}.json`);
  console.log("merged", parts.length, "parts;", bad.length, "problems"); process.exit(0);
}
if (process.env.TM_SHOT_MATRIX === "1") {
  const routes0 = ["today", "journey", "journey/goal/shot-goal", "journey/month", "deen", "settings", "settings/prayer", "settings/privacy", "settings/backup", "diary/plan", "journey/boards", "journey/backward/shot-goal", "more/where",
    "settings/look", "settings/data", "settings/data/start-real", "settings/plan", "settings/connections", "settings/delete", "settings/about", "settings/backup/restore", "journey/risks", "diary/team", "diary/ventures", "diary/money", "habits", "journey/goals", "more/status",
    "diary/intake/4", "journey/week", "journey/review", "journey/universe", "topics", "topic/procrastination", "print/plan", "settings/lock", "capture", "stuck", "focus/shot-t2", "reward", "deen/plans", "more/glossary", "more/safety", "more/fields"];
  // TM_SHOT_ROUTES (comma list) / TM_SHOT_LANGS / TM_SHOT_OUT: extra verification runs (VERIFY-02); defaults keep the committed matrix unchanged.
  const routes = process.env.TM_SHOT_ROUTES ? process.env.TM_SHOT_ROUTES.split(",") : routes0;
  // TM_SHOT_FONT=50,100,150 runs the given text-size percents instead of 100/200. TM_SHOT_HEAD=1 turns the floating head on and checks it never overlaps the bottom bar, primary buttons or fields.
  const BIGS = process.env.TM_SHOT_FONT ? process.env.TM_SHOT_FONT.split(",").map(Number) : [false, true]; const HEAD = process.env.TM_SHOT_HEAD === "1";
  const LANGS = process.env.TM_SHOT_LANGS ? process.env.TM_SHOT_LANGS.split(",") : ["en", "bn"];
  const dvw = (v) => ({ state: "value", value: v, label: "DEMO" }); const tdy = new Date(); const tdyIso = `${tdy.getFullYear()}-${String(tdy.getMonth() + 1).padStart(2, "0")}-${String(tdy.getDate()).padStart(2, "0")}`;
  // TM_SHOT_WORKBLOCKS=1 (BUILD-01): the optional work blocks are switched on and two overlapping DEMO blocks are seeded for today.
  const wbRec = (id, a, b, ex = {}) => ({ id, entity: "work_block", ns: "demo", ownerId: "demo-user", schemaVersion: 4, createdAt: new Date().toISOString(), values: { "work_block.date": dvw(tdyIso), "work_block.from": dvw(a), "work_block.to": dvw(b), "work_block.repeat": dvw("none"), "work_block.protected": dvw(false), ...ex } });
  const WB_SEED = process.env.TM_SHOT_WORKBLOCKS === "1" ? [wbRec("shot-wb1", "09:00", "10:30", { "work_block.label": dvw("Write the report"), "work_block.protected": dvw(true) }), wbRec("shot-wb2", "10:00", "11:00")] : [];
  // TM_SHOT_AI=1 (W1): the AI card is approved and on, a demo-shaped key (not a real key), host, model and a request limit are saved, so every part of the Connect AI screen shows.
  // TM_SHOT_SECTOR=1 (BUILD-02): a DEMO venture with a business type (retail) and two answers, a monthly income line and a "now" measure are seeded; every business type panel is opened before measuring.
  const SECTOR = process.env.TM_SHOT_SECTOR === "1";
  const WHATIF = process.env.TM_SHOT_WHATIF === "1";
  const SEC_SEED = SECTOR ? [
    { id: "shot-v1", entity: "venture", ns: "demo", ownerId: "demo-user", schemaVersion: 5, createdAt: new Date().toISOString(), values: { "venture.name": dvw("Test fixture venture, not data"), "venture.sector_id": dvw("retail"), "venture.sector_inputs": dvw(JSON.stringify({ price: 50, varCost: 30, fixed: 4000 })), "venture.sector_checks": dvw(JSON.stringify({ q: [0], r: [] })) } },
    { id: "shot-fin1", entity: "finance_item", ns: "demo", ownerId: "demo-user", schemaVersion: 5, createdAt: new Date().toISOString(), links: { venture: "shot-v1" }, values: { "finance.kind": dvw("income"), "finance.scope": dvw("business"), "finance.label": dvw("Test fixture income"), "finance.amount": dvw(12000), "finance.period": dvw("monthly") } },
    { id: "shot-ns1", entity: "north_star", ns: "demo", ownerId: "demo-user", schemaVersion: 5, createdAt: new Date().toISOString(), values: { "north_star.metric": dvw("Test fixture measure"), "north_star.source": dvw("own"), "north_star.baseline": dvw(0), "north_star.target": dvw(100) } },
  ] : [];
  const mdir = "evidence/screenshots-matrix"; mkdirSync(mdir, { recursive: true });
  const visit = new Date(Date.now() - 6 * 86400000); const lastOpen = `${visit.getFullYear()}-${String(visit.getMonth() + 1).padStart(2, "0")}-${String(visit.getDate()).padStart(2, "0")}`;
  for (const design of DESIGNS) for (const lang of LANGS) for (const scheme of ["light", "dark"]) for (const big of BIGS) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 1, colorScheme: scheme });
    await ctx.addInitScript(([d, l, recs, lo, wb, head, ai]) => { try { if (ai) { localStorage.setItem("tm:ui:conn:approved:aiAssistant", JSON.stringify({ v: 1, at: "2026-11-08T00:00:00.000Z" })); localStorage.setItem("tm:ui:conn:on:aiAssistant", "1"); localStorage.setItem("tm:secret:conn:aiAssistant", "SHOT-KEY-DEMO-1234"); localStorage.setItem("tm:ui:ai:conf", JSON.stringify({ style: "chat", host: "api.example.com", path: "", model: "model-typed", headers: {} })); localStorage.setItem("tm:ui:ai:cap", JSON.stringify({ mode: "calls", limit: 20 })); localStorage.setItem("tm:ui:ai:usage", JSON.stringify({ calls: 3, inputTokens: 0, outputTokens: 0, unknownCalls: 3 })); } localStorage.setItem("tm:ui:lang", l); localStorage.setItem("tm:ui:design", d); localStorage.setItem("tm:ui:dataMode", "demo"); if (head) localStorage.setItem("tm:ui:floatingHead", "on"); localStorage.setItem("tm:ui:visit", JSON.stringify({ lastOpen: lo, welcome: null })); for (const r of recs) localStorage.setItem(`tm:demo:${r.id}`, JSON.stringify(r)); if (wb.length) { localStorage.setItem("tm:ui:workBlocks", "on"); for (const r of wb) localStorage.setItem(`tm:demo:${r.id}`, JSON.stringify(r)); } } catch { /* storage blocked */ } }, [design, lang, [...SEED, ...SEC_SEED], lastOpen, WB_SEED, HEAD, process.env.TM_SHOT_AI === "1"]);
    const page = await ctx.newPage();
    for (const r of routes) {
      await page.goto("about:blank"); await page.goto(`http://localhost:${PORT}/#/${r}`);
      await page.waitForSelector("main"); if (WHATIF) await page.evaluate(() => {
        // TM_SHOT_WHATIF=1 (LIVECALC-01): calculators are shown with typed fixture numbers, compare mode on and the 10% tax chosen, so cards, bars and notes are all measured.
        const fire = (e, n) => e.dispatchEvent(new Event(n, { bubbles: true }));
        if (location.hash === "#/diary/money" && !document.querySelector("[data-wi-sheet]")) { const b = document.querySelector('[data-act="whatif-open"]'); if (b) b.click(); }
        const cmp = document.getElementById("wi-compare"); if (cmp) { cmp.checked = true; fire(cmp, "change"); }
        document.querySelectorAll('[data-wi-set="now"] input[type=text]').forEach((e, i) => { e.value = String((i + 2) * 3); fire(e, "input"); });
        document.querySelectorAll('[data-wi-set="what"] input[type=text]').forEach((e, i) => { e.value = String((i + 2) * 2); fire(e, "input"); });
        const tax = document.getElementById("wi-what-tax-r-10"); if (tax) { tax.checked = true; fire(tax, "change"); }
      }); if (SECTOR) await page.evaluate(() => document.querySelectorAll("details[data-sector-block]").forEach((d) => { d.open = true; })); if (big) await page.evaluate((b) => { document.documentElement.style.fontSize = b === true ? "200%" : `${b}%`; }, big); await page.waitForTimeout(500);
      const touching = [...(await page.evaluate(TOUCHING_FN)), ...(await page.evaluate(ADJACENT_FN))];
      const m = await page.evaluate(() => {
        const vw = window.innerWidth; const vis = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
        const wide = [...document.querySelectorAll("main *, .wi-sheet *")].filter((e) => vis(e) && e.getBoundingClientRect().right > vw + 1 && !e.closest("svg, .sr-only, [aria-hidden=true], pre, table")).length;
        const small = [...document.querySelectorAll("main button, main a.btn, main select, main input:not([type=checkbox]):not([type=radio]):not([type=hidden]), .wi-sheet button, .wi-sheet select, .wi-sheet input:not([type=checkbox]):not([type=radio]):not([type=hidden])")].filter((e) => vis(e) && e.getBoundingClientRect().height < 43).length;
        return { overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, wide, small, tabsInView: [...document.querySelectorAll("nav a.tab")].every((a) => a.getBoundingClientRect().right <= vw + 1) && [...document.querySelectorAll("nav a.tab")].every((a) => { const r = document.createRange(); r.selectNodeContents(a); return r.getClientRects().length <= 1; }) };
      });
      if (HEAD) {
        const hm = await page.evaluate(() => {
          const el = document.querySelector("[data-floating-head]"); if (!el) return { headMissing: true, headOverlap: 0, headShown: false, headState: "missing" };
          const shown = !el.hidden; const hb = el.getBoundingClientRect(); const bar = document.querySelector(".bottom-tabs")?.getBoundingClientRect();
          const hit = (b) => hb.left < b.right && hb.right > b.left && hb.top < b.bottom && hb.bottom > b.top;
          let n = 0; if (shown) { if (bar && hit(bar)) n++; for (const c of document.querySelectorAll(".cta,.btn:not(.ghost),button[type=submit],input:not([type=hidden]),textarea,select")) { if (el.contains(c)) continue; const b = c.getBoundingClientRect(); if (b.width > 0 && b.height > 0 && hit(b)) n++; } }
          return { headMissing: false, headOverlap: n, headShown: shown, headState: el.dataset.state, headSize: Math.round(hb.width) };
        });
        Object.assign(m, hm); if (hm.headMissing) m.headOverlap = 1;
      }
      const id = `${design}/${lang}/${scheme}/${big === true ? "200" : big ? String(big) : "100"}`;
      let file = null;
      if (process.env.TM_SHOT_KEEP) { mkdirSync(process.env.TM_SHOT_KEEP, { recursive: true }); await page.screenshot({ path: `${process.env.TM_SHOT_KEEP}/${id.replace(/\//g, "-")}-${r.replace(/\//g, "_")}.png` }); }
      m.touching = touching.length;
      if (m.overflow || m.wide || m.small || !m.tabsInView || m.touching || m.headOverlap) { file = `${mdir}/${id.replace(/\//g, "-")}-${r.replace(/\//g, "_")}.png`; await page.screenshot({ path: file, fullPage: true }); }
      report.push({ combo: id, route: r, ...m, file });
    }
    await ctx.close();
  }
  await browser.close(); await server.close();
  const bad = report.filter((x) => x.overflow || x.wide || x.small || !x.tabsInView || x.touching || x.headOverlap);
  writeFileSync(process.env.TM_SHOT_OUT ? process.env.TM_SHOT_OUT : process.env.TM_SHOT_ONLY_DESIGN ? `evidence/matrix-part-${process.env.TM_SHOT_ONLY_DESIGN}.json` : "evidence/matrix-report.json", JSON.stringify({ viewport: "360x740", generated: new Date().toISOString(), combos: DESIGNS.length * LANGS.length * 2 * BIGS.length, screens: report.length, problems: bad.length, bad, routes, matrix: "4 looks x en/bn x light/dark x 100%/200% text" }, null, 2));
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
      await page.goto("about:blank"); await page.goto(`http://localhost:${PORT}/#/${r}`);
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
    await page.goto(`http://localhost:${PORT}/#/${r.replace("shot-task", SEED_TASK.id)}`);
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

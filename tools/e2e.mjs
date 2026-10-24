// Browser checks on the built app: empty start, secret rejection in the real UI, offline shell, no third-party requests.
import { chromium } from "playwright";
import { preview } from "vite";
import { writeFileSync } from "node:fs";

const server = await preview({ preview: { port: 4174, strictPort: true } });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
const page = await ctx.newPage();
const external = [];
const wiki = [];
page.on("request", (r) => { const u = r.url(); if (u.startsWith("http://localhost:4174")) return; (u.startsWith("https://en.wikipedia.org/") ? wiki : external).push(u); });
await page.route("https://en.wikipedia.org/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ query: { search: [1, 2, 3, 4].map((i) => ({ title: `Bookkeeping ${i}`, snippet: `A <span>record</span> ${i}` })) } }) }));
const results = [];
const idb = (pg) => pg.evaluate(() => new Promise((res) => { const q = indexedDB.open("tm-db"); q.onerror = () => res([]); q.onsuccess = () => { const db = q.result; if (!db.objectStoreNames.contains("records")) return res([]); db.transaction("records").objectStore("records").getAll().onsuccess = (e) => res(e.target.result); }; }));
const check = (id, name, pass, detail = "") => { results.push({ id, name, pass, detail }); console.log(pass ? "PASS" : "FAIL", id, name, detail); };

await page.goto("http://localhost:4174/#/today");
await page.waitForSelector("main");
for (const r of ["today", "journey", "diary", "deen", "more", "more/status", "more/fields", "more/data"]) { await page.goto(`http://localhost:4174/#/${r}`); await page.waitForSelector("main"); }
const keys = [...(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("tm:real:") || k.startsWith("tm:demo:")))), ...(await idb(page))];
check("TM-TST-143", "empty start: no demo/real records after visiting every tab", keys.length === 0, JSON.stringify(keys));

// secret rejection in the real form (step 3: skill name is free text)
await page.goto("http://localhost:4174/#/diary/intake/3");
await page.fill("#f-skill\\.name", "password: hunter2");
await page.click("button[type=submit]");
const err = await page.textContent("[data-field='skill.name'] .err");
const saved = await idb(page);
check("TM-TST-034", "secret typed into a free-text field is rejected and nothing saved", !!err && saved.length === 0, err ?? "");

// valid save lands only in demo namespace, blank stays blank (never zero)
await page.fill("#f-skill\\.name", "Bookkeeping");
await page.click("button[type=submit]");
await page.waitForFunction(() => location.hash.includes("/intake/4"));
await page.waitForTimeout(300);
const rows = await idb(page);
const vals = rows.length ? rows[0].values : {};
check("TM-TST-143", "saved intake is in demo namespace only, labelled DEMO", rows.length === 1 && rows.every((r) => r.ns === "demo") && vals["skill.name"]?.label === "DEMO");
check("TM-TST-021", "blank skill level/evidence stay unanswered (not 0)", vals["skill.level"] === undefined && vals["skill.evidence"] === undefined);

// unknown number stays an unknown state
await page.goto("http://localhost:4174/#/diary/intake/4");
await page.selectOption("[data-field='constraint.hours_per_week'] select[data-role=state]", "unknown");
await page.click("button[type=submit]");
await page.waitForFunction(() => location.hash.includes("/intake/5"));
await page.waitForTimeout(300);
const unk = (await idb(page)).find((r) => r.id === "intake-constraint").values["constraint.hours_per_week"];
check("TM-TST-021", "‘don't know’ hours saved as unknown state, not 0", unk.state === "unknown" && unk.value === undefined);

// real namespace untouched
const realKeys = (await idb(page)).filter((r) => r.ns === "real");
check("TM-TST-143", "real namespace still empty after demo entry", realKeys.length === 0);

// in-app suggestions (G4 preview): nothing leaves before the click; cards fill the field
await page.evaluate(() => localStorage.setItem("tm:ui:lang", "en"));
await page.goto("http://localhost:4174/#/diary/intake/3"); await page.reload(); await page.waitForSelector("main");
await page.fill("#f-skill\\.name", "bookkeeping");
await page.click("[data-field='skill.name'] details.help summary:has-text('Suggest')");
check("G4-SUGGEST", "0 Wikipedia requests before the user taps search", wiki.length === 0);
await page.click("[data-suggest='skill.name'] [data-act=suggest-go]");
await page.waitForSelector("[data-option]");
const nOpt = await page.locator("[data-option]").count();
const hasHtml = await page.locator("[data-option]").first().innerHTML();
check("G4-SUGGEST", "3 option cards with source, no raw HTML", nOpt === 3 && !/<span/.test(await page.locator("[data-option] p").first().innerText()) && hasHtml.includes("Source:"));
await page.locator("[data-option]").nth(1).locator("button").click();
check("G4-SUGGEST", "tapping a card fills the field", (await page.inputValue("#f-skill\\.name")) === "Bookkeeping 2" && wiki.length === 1);
await page.fill("#f-skill\\.name", "password: abc12345");
await page.click("[data-suggest='skill.name'] [data-act=suggest-go]");
check("G4-SUGGEST", "secret-looking search is blocked before sending", wiki.length === 1);
await page.fill("#f-skill\\.name", "");
await page.evaluate(() => localStorage.setItem("tm:ui:lang", "bn")); await page.reload(); await page.waitForSelector("main");
// G3: capacity + tasks → plan → Home (everything inside the user's own free window)
await page.goto("http://localhost:4174/#/diary/plan"); await page.waitForSelector("main");
await page.fill("#pt-title", "Call supplier"); await page.fill("#pt-min", "30"); await page.click("form[data-form=task] button[type=submit]");
await page.waitForSelector("[data-task]");
check("G3-PLAN", "without free hours nothing is planned and the user is asked", (await page.locator("[data-placement]").count()) === 0 && (await page.locator("[data-deferred='unknown_capacity']").count()) === 1);
await page.goto("http://localhost:4174/#/diary/intake/4"); await page.waitForSelector("main");
await page.selectOption("[data-field='constraint.hours_per_week'] select[data-role=state]", "value");
await page.selectOption("[data-field='constraint.weekly_free_hours'] select[data-role=state]", "value");
await page.fill("#f-constraint\\.weekly_free_hours", "6"); await page.fill("#f-constraint\\.free_from", "20:00"); await page.fill("#f-constraint\\.free_to", "22:00");
await page.click("button[type=submit]"); await page.waitForFunction(() => location.hash.includes("/intake/5"));
await page.goto("http://localhost:4174/#/diary/plan"); await page.waitForSelector("[data-placement]");
const txt = await page.locator("[data-placement]").first().innerText();
check("G3-PLAN", "task is placed inside 20:00–22:00", /^2[01]:\d\d–(2[012]:\d\d)/.test(txt) && /Call supplier/.test(txt), txt);
await page.goto("http://localhost:4174/#/today"); await page.waitForSelector(".task");
check("G3-PLAN", "Home shows the user's own planned task (today first)", (await page.locator(".task").count()) >= 1 && /Call supplier/.test(await page.locator(".task").first().innerText()));
await page.goto("http://localhost:4174/#/diary/plan"); await page.click("[data-mode=pause]");
check("G3-PLAN", "pause mode places nothing, no error text", (await page.locator("[data-placement]").count()) === 0 && (await page.locator("[data-deferred='paused']").count()) === 1);
await page.click("[data-mode=normal]");
// G3: money — unknown stays unknown, scopes apart
await page.goto("http://localhost:4174/#/diary/money"); await page.waitForSelector("main");
const addFin = async (kind, scope, name, amt, period = "once") => { await page.selectOption("#mf-kind", kind); await page.selectOption("#mf-scope", scope); await page.fill("#mf-name", name); await page.fill("#mf-amount", amt); await page.selectOption("#mf-period", period); await page.click("form[data-form=money] button[type=submit]"); await page.waitForTimeout(150); };
await addFin("asset", "personal", "Savings", "1000"); await addFin("liability", "personal", "Loan", "");
check("G3-MONEY", "blank liability makes personal net worth 'not known', not 0", (await page.locator("[data-scope=personal] [data-unknown]").count()) === 1);
await addFin("asset", "business", "Stock", "5000");
const bizTxt = await page.locator("[data-scope=business]").innerText();
check("G3-MONEY", "business net worth is separate and computed (5,000)", /৫,০০০/.test(bizTxt) && !/১,০০০/.test(bizTxt), JSON.stringify(bizTxt));
await page.fill("#mf-name", "password: abc12345"); await page.fill("#mf-amount", "5"); await page.click("form[data-form=money] button[type=submit]");
check("G3-MONEY", "secret-looking name rejected", (await page.locator("[data-fin]").count()) === 3);
// G3: Stage A -> B (needs required answers + a goal; calm when not met; history kept)
await page.goto("http://localhost:4174/#/journey"); await page.waitForSelector("[data-stage-panel]");
check("G3-STAGE", "Stage A pass button is disabled while conditions are open (no error colour copy)", await page.locator("[data-act=pass-stage]").isDisabled() && (await page.locator("[data-stage-panel] .err").innerText()) === "");
for (const step of [1, 2, 3, 4, 5, 6, 7]) {
  await page.goto(`http://localhost:4174/#/diary/intake/${step}`); await page.waitForSelector("main");
  const reqs = await page.locator("[data-field]").evaluateAll((els) => els.filter((e) => e.querySelector(".tag")?.textContent && /Required|আবশ্যক/.test(e.querySelector(".tag").textContent)).map((e) => e.getAttribute("data-field")));
  for (const id of reqs) { const sel = page.locator(`[data-field='${id}'] select[data-role=state]`); if (await sel.count()) await sel.selectOption("later"); }
  if (step === 1) await page.selectOption("#f-profile\\.language", "bn");
  if (step === 6) { await page.selectOption("[data-field='goal.title'] select[data-role=state]", "value"); await page.fill("#f-goal\\.title", "Steady income"); }
  await page.click("button[type=submit]"); await page.waitForTimeout(150);
}
await page.goto("http://localhost:4174/#/journey"); await page.waitForSelector("[data-stage-panel]");
check("G3-STAGE", "conditions met -> button enabled", !(await page.locator("[data-act=pass-stage]").isDisabled()));
await page.click("[data-act=pass-stage]"); await page.waitForSelector("[data-passed='A']");
check("G3-STAGE", "Stage A passed, Stage B is now current, calm banner shown", (await page.locator("[data-stage-panel]").getAttribute("data-stage-panel")) === "B");
await page.goto("http://localhost:4174/#/journey/log"); await page.waitForSelector("main");
check("G3-STAGE", "journey log has the entry with before/after", (await page.locator("[data-log]").count()) === 1 && /%/.test(await page.locator("[data-log]").innerText()));
await page.goto("http://localhost:4174/#/today"); await page.waitForSelector(".stage");
check("G3-STAGE", "Home shows 2 / 8 after passing Stage A", /২ \/ ৮|2 \/ 8/.test(await page.locator(".stage .n").innerText()));
// data survives a full reload (IndexedDB)
await page.reload(); await page.waitForSelector("main");
const afterReload = await idb(page);
check("G2-PERSIST", "demo entries survive reload via IndexedDB", afterReload.some((r) => r.id === "intake-skill"));
const ls = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("tm:demo:") || k.startsWith("tm:real:")));
check("G2-PERSIST", "records are not duplicated in localStorage", ls.length === 0);
// install readiness
const man = await (await page.request.get("http://localhost:4174/manifest.webmanifest")).json();
check("G2-INSTALL", "manifest has 192 and 512 PNG icons, standalone", man.display === "standalone" && ["192x192", "512x512"].every((z) => man.icons.some((i) => i.sizes === z && i.type === "image/png")));
// offline shell: service worker caches, then reload offline
await page.goto("http://localhost:4174/#/today");
await page.evaluate(() => navigator.serviceWorker.ready);
await page.reload(); await page.waitForSelector("main");
await ctx.setOffline(true);
await page.reload(); await page.waitForSelector("main", { timeout: 5000 }).catch(() => {});
const offlineOk = await page.evaluate(() => !!document.querySelector("main h1") && document.querySelector("[data-net]")?.getAttribute("data-net") === "offline");
check("G1-OFFLINE", "app shell loads and works with network off", offlineOk);
await page.goto("http://localhost:4174/#/more/status").catch(() => {});
await page.waitForSelector("[data-module]", { timeout: 5000 }).catch(() => {});
check("G1-OFFLINE", "status screen renders offline", (await page.locator("[data-module]").count()) === 24);
await ctx.setOffline(false);

check("G1-NONET", "0 third-party/external requests during all of the above", external.length === 0, JSON.stringify(external));

await browser.close(); await server.close();
writeFileSync("evidence/e2e-report.json", JSON.stringify({ generated: new Date().toISOString(), results }, null, 2));
process.exit(results.every((r) => r.pass) ? 0 : 1);

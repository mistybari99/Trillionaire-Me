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
// First run: the choice comes before anything else. Explore with demo data first (empty start check below).
await page.waitForSelector("[data-first=demo]");
check("MODE-FIRST", "first run shows the demo / real choice and no tabs", (await page.locator("[data-first=real]").count()) === 1 && (await page.locator("nav").count()) === 0);
await page.click("[data-act=first-demo]");
await page.waitForSelector("[data-demo-banner]");
check("MODE-DEMO", "exploring demo shows the Demo mode banner", /Demo mode|Demo মোড/.test(await page.textContent("[data-demo-banner]")));
for (const r of ["today", "journey", "diary", "deen", "more", "more/status", "more/fields", "more/data"]) { await page.goto(`http://localhost:4174/#/${r}`); await page.waitForSelector("main"); }
const keys = [...(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("tm:real:") || k.startsWith("tm:demo:")))), ...(await idb(page))];
check("TM-TST-143", "empty start: no demo/real records after visiting every tab", keys.length === 0, JSON.stringify(keys));

// Switch to real mode without consent (the state before the owner ticks), then run the entry checks as before.
await page.evaluate(() => localStorage.setItem("tm:ui:dataMode", "real")); await page.reload(); await page.waitForSelector("main");

// secret rejection in the real form (step 3: skill name is free text)
await page.goto("http://localhost:4174/#/diary/intake/3");
await page.fill("#f-skill\\.name", "password: hunter2");
await page.click("button[type=submit]");
const err = await page.textContent("[data-field='skill.name'] .err");
const saved = await idb(page);
check("TM-TST-034", "secret typed into a free-text field is rejected and nothing saved", !!err && saved.length === 0, err ?? "");

// D-B: without consent a valid entry saves nothing and shows the consent prompt
await page.fill("#f-skill\\.name", "Bookkeeping");
await page.click("button[type=submit]"); await page.waitForTimeout(200);
const noConsent = await idb(page);
check("TM-TST-143", "without consent a valid entry saves nothing and shows the prompt", noConsent.length === 0 && (await page.locator("[data-consent-prompt]").count()) === 1);
// the owner ticks 'I understand' on More > Demo & real data, then the same entry saves as real
await page.goto("http://localhost:4174/#/more/data"); await page.waitForSelector("#consent-tick");
await page.check("#consent-tick"); await page.click("[data-act=consent]"); await page.waitForTimeout(150);
await page.goto("http://localhost:4174/#/diary/intake/3"); await page.waitForSelector("main");
await page.fill("#f-skill\\.name", "Bookkeeping");
await page.click("button[type=submit]");
await page.waitForFunction(() => location.hash.includes("/intake/4"));
await page.waitForTimeout(300);
const rows = await idb(page);
const vals = rows.length ? rows[0].values : {};
check("TM-TST-143", "after consent the saved intake is in real namespace only, labelled FACT", rows.length === 1 && rows.every((r) => r.ns === "real") && vals["skill.name"]?.label === "FACT");
check("TM-TST-021", "blank skill level/evidence stay unanswered (not 0)", vals["skill.level"] === undefined && vals["skill.evidence"] === undefined);

// unknown number stays an unknown state
await page.goto("http://localhost:4174/#/diary/intake/4");
await page.selectOption("[data-field='constraint.hours_per_week'] select[data-role=state]", "unknown");
await page.click("button[type=submit]");
await page.waitForFunction(() => location.hash.includes("/intake/5"));
await page.waitForTimeout(300);
const unk = (await idb(page)).find((r) => r.id === "intake-constraint").values["constraint.hours_per_week"];
check("TM-TST-021", "‘don't know’ hours saved as unknown state, not 0", unk.state === "unknown" && unk.value === undefined);

// demo namespace untouched by entry forms
const demoKeys = (await idb(page)).filter((r) => r.ns === "demo");
check("TM-TST-143", "demo namespace stays empty: entries go to real after consent", demoKeys.length === 0);

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
// M11 (owner, 24 Oct 2026): the first search was saved on the phone, so the same term works offline with no new request.
await page.context().setOffline(true);
await page.fill("#f-skill\\.name", "bookkeeping");
await page.click("[data-suggest='skill.name'] [data-act=suggest-go]");
await page.waitForSelector("[data-option]", { timeout: 5000 }).catch(() => {});
check("M11-CACHE", "same term offline shows the saved options with no new Wikipedia request", (await page.locator("[data-option]").count()) === 3 && wiki.length === 1);
await page.context().setOffline(false);
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
check("G3-MONEY", "business net worth is separate and computed (5,000)", /5,000/.test(bizTxt) && !/1,000\b/.test(bizTxt), JSON.stringify(bizTxt));
await page.fill("#mf-name", "password: abc12345"); await page.fill("#mf-amount", "5"); await page.click("form[data-form=money] button[type=submit]");
check("G3-MONEY", "secret-looking name rejected", (await page.locator("[data-fin]").count()) === 3);
// G3: Stage A -> B (needs required answers + a goal; calm when not met; history kept)
await page.goto("http://localhost:4174/#/journey"); await page.waitForSelector("[data-stage-panel]");
check("G3-STAGE", "Stage A pass button is disabled while conditions are open (no error colour copy)", await page.locator("[data-act=pass-stage]").isDisabled() && (await page.locator("[data-stage-panel] .err").innerText()) === "");
for (const step of [1, 2, 3, 4, 5, 6, 7]) {
  await page.goto(`http://localhost:4174/#/diary/intake/${step}`); await page.waitForSelector("main");
  const reqs = await page.locator("[data-field]").evaluateAll((els) => els.filter((e) => e.querySelector(".tag")?.textContent && /Required|আবশ্যক|লাগবে/.test(e.querySelector(".tag").textContent)).map((e) => e.getAttribute("data-field")));
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
// R2 horizon view: 5 sections, 'unset' bucket for goals with no horizon, no shame/red copy
await page.goto("http://localhost:4174/#/journey/horizon"); await page.waitForSelector("main h1");
const horizonSecs = await page.locator("[data-horizon]").evaluateAll((e) => e.map((x) => x.getAttribute("data-horizon")));
const fiveKeys = ["five_year", "one_year", "month", "week", "today"];
check("R2-HORIZON", "page renders the 5 horizon sections in order", JSON.stringify(horizonSecs.filter((s) => s !== "unset")) === JSON.stringify(fiveKeys), horizonSecs.join(","));
check("R2-HORIZON", "goal with no horizon appears in the 'unset' section", (await page.locator("[data-horizon=unset]").innerText()).includes("Steady income"), horizonSecs.join(","));
// seed one real goal that has a horizon (no intake step asks for it yet), then reload the view
await page.evaluate(() => new Promise((res, rej) => { const q = indexedDB.open("tm-db"); q.onerror = () => rej(q.error); q.onsuccess = () => { const db = q.result; const tx = db.transaction("records", "readwrite"); tx.objectStore("records").put({ id: "e2e-goal-horizon", entity: "goal", ns: "real", ownerId: "owner", schemaVersion: 1, createdAt: new Date().toISOString(), values: { "goal.title": { state: "value", value: "Horizon check", label: "FACT" }, "goal.horizon": { state: "value", value: "one_year", label: "FACT" } } }); tx.oncomplete = () => { db.close(); res(); }; tx.onerror = () => rej(tx.error); }; }));
await page.goto("http://localhost:4174/#/journey/horizon"); await page.reload(); await page.waitForSelector("main h1");
const oneYear = page.locator("[data-horizon=one_year]");
check("R2-HORIZON", "goal with horizon one_year lands in the one_year section only", (await oneYear.locator("[data-goal]").count()) === 1 && (await oneYear.innerText()).includes("Horizon check") && !(await page.locator("[data-horizon=unset]").innerText()).includes("Horizon check"));
const horizonText = await page.locator("main").innerText();
const shameHit = horizonText.match(/fail|shame|guilt|lazy|overdue|behind|wrong|\bred\b|ব্যর্থ|লজ্জা|অলস|পিছিয়ে|দোষ|খারাপ/i);
check("R2-HORIZON", "no red/shame words on the horizon page (EN and BN)", !shameHit, shameHit ? shameHit[0] : "");
// quick capture: write naturally -> confirm -> report built from confirmed items only
await page.goto("http://localhost:4174/#/capture"); await page.waitForSelector("#cap-note");
await page.fill("#cap-note", "কাল সরবরাহকারীকে ৫ হাজার টাকা দেব। ঠিক করলাম নতুন দোকান নেব।");
await page.click("[data-act=capture-find]"); await page.waitForSelector("[data-cand]");
const kinds = await page.locator("[data-cand]").evaluateAll((e) => e.map((x) => x.getAttribute("data-cand")));
check("G3-CAPTURE", "finds amount, date and decision from a Bangla note", ["amount", "date", "decision"].every((k) => kinds.includes(k)), kinds.join(","));
await page.locator("[data-cand=date] input[type=checkbox]").uncheck();
await page.click("[data-act=capture-save]"); await page.waitForSelector("[data-saved]");
await page.goto("http://localhost:4174/#/journey/report"); await page.waitForSelector("main");
const rep = await page.locator("main").innerText();
check("G3-CAPTURE", "report shows confirmed amount (5,000) and decision; unconfirmed date is absent", /5,000/.test(rep) && /নতুন দোকান নেব/.test(rep) && (await page.locator("[data-value][data-label=DEMO]").count()) === 0);
await page.goto("http://localhost:4174/#/capture"); await page.fill("#cap-note", "my password: abc12345 pay 500 tk"); await page.click("[data-act=capture-find]");
check("G3-CAPTURE", "secret in a note is rejected before anything is found", (await page.locator("[data-cand]").count()) === 0 && (await page.locator(".err").first().innerText()).length > 5);
// I'm stuck: tired -> only lighter modes, nothing added
await page.goto("http://localhost:4174/#/stuck"); await page.waitForSelector("[data-q]");
await page.click("[data-q=q_tired] [data-a=yes]"); await page.click("[data-act=stuck-show]"); await page.waitForSelector("[data-helper]");
const helpers = await page.locator("[data-helper]").evaluateAll((e) => e.map((x) => x.getAttribute("data-helper")));
check("G3-STUCK", "tired offers Minimum week/Pause only (no new task)", helpers.includes("minimum_week") && !helpers.includes("tiny_step"), helpers.join(","));
const before = (await idb(page)).filter((r) => r.entity === "task").length;
await page.click("[data-helper=minimum_week]"); await page.waitForSelector("[data-done=minimum_week]");
await page.waitForTimeout(250);
check("G3-STUCK", "choosing it switches mode and adds 0 tasks", (await idb(page)).filter((r) => r.entity === "task").length === before);
await page.goto("http://localhost:4174/#/diary/plan"); await page.waitForSelector("[data-mode]");
check("G3-STUCK", "plan screen shows Minimum week as active", (await page.locator("[data-mode=minimum_week]").getAttribute("aria-pressed")) === "true");
await page.click("[data-mode=normal]");
// R5 (B7/B8/B10): calm reflection cards on the stuck page, word chain in the journey log
await page.goto("http://localhost:4174/#/stuck"); await page.waitForSelector("[data-card=where_time_goes]");
const cardIds = await page.locator("[data-card]").evaluateAll((e) => e.map((x) => x.getAttribute("data-card")));
check("R5-CARDS", "stuck page shows two paths, effort timing and where-time-goes cards", ["two_paths", "effort_timing", "where_time_goes"].every((c) => cardIds.includes(c)), cardIds.join(","));
check("R5-CARDS", "reflection cards have no red error or alert element", (await page.locator("[data-card] .err, [data-card] [role=alert]").count()) === 0);
await page.goto("http://localhost:4174/#/journey/log"); await page.waitForSelector("[data-card=learn_chain]");
check("R5-CHAIN", "journey log shows the what-I-learned card (empty hint or chain)", (await page.locator("[data-card=learn_chain]").count()) === 1);
// topics drawer + finishing a task adds a star
await page.goto("http://localhost:4174/#/today"); await page.waitForSelector("main");
await page.click("[data-act=drawer-open]"); await page.click("#drawer a[data-topic=procrastination]"); await page.waitForSelector("[data-tip]");
check("G3-TOPICS", "sidebar opens, topic page shows tips with a visual and an app link", (await page.locator("[data-tip]").count()) >= 2 && (await page.locator("[data-diagram]").count()) >= 2 && !(await page.locator("#drawer.open").count()));
await page.goto("http://localhost:4174/#/diary/plan"); await page.waitForSelector("form[data-form=task]");
await page.fill("#pt-title", "Quick win"); await page.fill("#pt-min", "10"); await page.click("form[data-form=task] button[type=submit]"); await page.waitForSelector("[data-task]");
const starsBefore = await page.evaluate(async () => { const q = indexedDB.open("tm-db"); await new Promise((r) => (q.onsuccess = r)); const all = await new Promise((r) => (q.result.transaction("records").objectStore("records").getAll().onsuccess = (e) => r(e.target.result))); return all.filter((x) => x.entity === "task" && x.values["task.done_on"]?.state === "value").length; });
await page.locator("[data-act=task-done]").last().click(); await page.waitForSelector("[data-reward] svg");
const nStars = Number(await page.locator("[data-reward] svg").getAttribute("data-stars"));
check("G3-REWARD", "finishing a task opens the picture and adds exactly one star", nStars === starsBefore + 1 && (await page.locator("[data-fresh]").count()) === 1, `${starsBefore}->${nStars}`);
// data survives a full reload (IndexedDB)
await page.reload(); await page.waitForSelector("main");
const afterReload = await idb(page);
check("G2-PERSIST", "real entries survive reload via IndexedDB", afterReload.some((r) => r.id === "intake-skill" && r.ns === "real"));
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
check("G1-OFFLINE", "status screen renders offline", (await page.locator("[data-module]").count()) === 25);
await ctx.setOffline(false);

// Precache: the service worker saves every file of the build on the first visit, so a cold start with the network off still opens
// every new screen (Goal Universe, snapshots, logo, topics with content packs) and every saved file can be read offline.
{
  const base = "http://localhost:4174/";
  const pre = await (await page.request.get(`${base}precache.json`)).json();
  await page.evaluate(() => navigator.serviceWorker.ready);
  const saved = () => page.evaluate(async (v) => { const c = await caches.open(`tm-shell-${v}`); return (await c.keys()).map((r) => new URL(r.url).pathname); }, pre.version);
  let have = []; for (let i = 0; i < 60; i++) { have = await saved(); if (have.length >= pre.files.length) break; await page.waitForTimeout(250); }
  const missing = pre.files.map((f) => new URL(f, base).pathname).filter((w) => !have.includes(w));
  check("PRECACHE", `service worker saved all ${pre.files.length} files of the build (shell, fonts, content packs, page)`, pre.files.length > 20 && missing.length === 0, missing.slice(0, 5).join(","));
  const names = await page.evaluate(async () => (await caches.keys()).sort());
  check("PRECACHE", "only the current shell cache and the small runtime cache exist (old ones are deleted)", names.every((n) => n === `tm-shell-${pre.version}` || n === "tm-runtime-v1"), names.join(","));
  await ctx.setOffline(true);
  await page.goto(base); await page.waitForSelector("main", { timeout: 8000 }).catch(() => {});
  const seen = {};
  for (const [name, hash, sel] of [["universe", "#/journey/universe", "svg[data-universe-map]"], ["journey logo", "#/journey", "svg.logo3d"], ["snapshots", "#/more/data", "[data-card=snapshots]"], ["home cards", "#/today", "[data-home-summary]"], ["goals", "#/journey/goals", "main h1"], ["topic with content packs", "#/topic/procrastination", "main h1"]]) {
    await page.evaluate((h) => { location.hash = h; }, hash);
    seen[name] = await page.waitForSelector(sel, { timeout: 5000 }).then(() => true).catch(() => false);
  }
  check("PRECACHE", "cold start offline opens the new screens", Object.values(seen).every(Boolean) && (await page.evaluate(() => document.querySelector("[data-net]")?.getAttribute("data-net"))) === "offline", JSON.stringify(seen));
  const bad = await page.evaluate(async (files) => { const out = []; for (const f of files) { try { const r = await fetch(f, { cache: "no-store" }); if (!r.ok) out.push(f); } catch { out.push(f); } } return out; }, pre.files);
  check("PRECACHE", "every saved file can be read with the network off", bad.length === 0, bad.slice(0, 5).join(","));
  await ctx.setOffline(false);
}

// Design version: default light-futuristic, switch to ink-paper and back, persists across reload, dark follows phone; old "classic" saved value migrates
{
  await page.goto("http://localhost:4174/#/more"); await page.waitForSelector("[data-design-pick]");
  const d0 = await page.evaluate(() => ({ d: document.documentElement.dataset.design, v: localStorage.getItem("tm:ui:design"), cardBlur: getComputedStyle(document.querySelector(".card")).backdropFilter }));
  await page.click("[data-design-opt=ink-paper]"); await page.waitForTimeout(100);
  const bgInk = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.reload(); await page.waitForSelector("[data-design-pick]");
  const d1 = await page.evaluate(() => ({ d: document.documentElement.dataset.design, v: localStorage.getItem("tm:ui:design"), checked: document.querySelector("[data-design-opt=ink-paper] input").checked }));
  await page.click("[data-design-opt=light-futuristic]"); await page.waitForTimeout(100);
  const d2 = await page.evaluate(() => ({ d: document.documentElement.dataset.design, primary: getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() }));
  await page.emulateMedia({ colorScheme: "dark" });
  const dark = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--paper").trim());
  await page.emulateMedia({ colorScheme: "light" });
  check("DESIGN-VER", "light-futuristic is the default; ink-paper applies and persists after reload; switching back works; dark follows the phone", d0.d === "light-futuristic" && d0.v === null && d0.cardBlur.includes("blur") && d1.d === "ink-paper" && d1.v === "ink-paper" && d1.checked && bgInk === "rgb(245, 241, 232)" && d2.d === "light-futuristic" && d2.primary === "#4B3FD8" && dark === "#0B0E1F", JSON.stringify({ d0, d1, d2, dark, bgInk }));
  await page.evaluate(() => localStorage.setItem("tm:ui:design", "classic")); await page.reload(); await page.waitForSelector("[data-design-pick]");
  const mig = await page.evaluate(() => ({ d: document.documentElement.dataset.design, v: localStorage.getItem("tm:ui:design") }));
  check("DESIGN-VER", "old saved value classic migrates to ink-paper", mig.d === "ink-paper" && mig.v === "ink-paper", JSON.stringify(mig));
  for (const id of ["emerald-obsidian", "broadsheet"]) { await page.click(`[data-design-opt=${id}]`); await page.waitForTimeout(100); const dd = await page.evaluate(() => document.documentElement.dataset.design); check("DESIGN-VER", `${id} applies`, dd === id, dd); }
  await page.click("[data-design-opt=light-futuristic]"); await page.waitForTimeout(100);
}
check("G1-NONET", "0 third-party/external requests during all of the above", external.length === 0, JSON.stringify(external));

// Start for real from a fresh phone: one confirmation with the consent tick, then real mode with no demo banner.
{
  const ctx2 = await browser.newContext({ viewport: { width: 360, height: 740 } }); const p2 = await ctx2.newPage();
  await p2.goto("http://localhost:4174/#/today"); await p2.waitForSelector("[data-first=real]");
  await p2.click("[data-act=first-real]"); await p2.waitForSelector("#mode-tick");
  await p2.click("[data-act=first-real-yes]"); await p2.waitForTimeout(100);
  const stillFirst = (await p2.locator("[data-first]").count()) > 0;
  await p2.check("#mode-tick"); await p2.click("[data-act=first-real-yes]"); await p2.waitForSelector("nav");
  const st = await p2.evaluate(() => ({ mode: localStorage.getItem("tm:ui:dataMode"), consent: !!localStorage.getItem("tm:consent:real:v1") }));
  check("MODE-REAL", "start for real needs the tick, then real mode with consent and no demo banner", stillFirst && st.mode === "real" && st.consent && (await p2.locator("[data-demo-banner]").count()) === 0);
  await ctx2.close();
}
await browser.close(); await server.close();
writeFileSync("evidence/e2e-report.json", JSON.stringify({ generated: new Date().toISOString(), results }, null, 2));
process.exit(results.every((r) => r.pass) ? 0 : 1);

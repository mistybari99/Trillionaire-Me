// Browser checks on the built app: empty start, secret rejection in the real UI, offline shell, no third-party requests.
import { chromium } from "playwright";
import { preview } from "vite";
import { writeFileSync } from "node:fs";

const server = await preview({ preview: { port: 4174, strictPort: true } });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
const page = await ctx.newPage();
const external = [];
page.on("request", (r) => { if (!r.url().startsWith("http://localhost:4174")) external.push(r.url()); });
const results = [];
const check = (id, name, pass, detail = "") => { results.push({ id, name, pass, detail }); console.log(pass ? "PASS" : "FAIL", id, name, detail); };

await page.goto("http://localhost:4174/#/today");
await page.waitForSelector("main");
for (const r of ["today", "journey", "diary", "deen", "more", "more/status", "more/fields", "more/data"]) { await page.goto(`http://localhost:4174/#/${r}`); await page.waitForSelector("main"); }
const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("tm:real:") || k.startsWith("tm:demo:")));
check("TM-TST-143", "empty start: no demo/real records after visiting every tab", keys.length === 0, JSON.stringify(keys));

// secret rejection in the real form (step 3: skill name is free text)
await page.goto("http://localhost:4174/#/diary/intake/3");
await page.fill("#f-skill\\.name", "password: hunter2");
await page.click("button[type=submit]");
const err = await page.textContent("[data-field='skill.name'] .err");
const saved = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("tm:")  && k.includes("intake")));
check("TM-TST-034", "secret typed into a free-text field is rejected and nothing saved", !!err && saved.length === 0, err ?? "");

// valid save lands only in demo namespace, blank stays blank (never zero)
await page.fill("#f-skill\\.name", "Bookkeeping");
await page.click("button[type=submit]");
await page.waitForFunction(() => location.hash.includes("/intake/4"));
const stored = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith("tm:demo:")).map((k) => [k, JSON.parse(localStorage.getItem(k))])));
const ks = Object.keys(stored);
const vals = ks.length ? stored[ks[0]].values : {};
check("TM-TST-143", "saved intake is in demo namespace only, labelled DEMO", ks.length === 1 && ks.every((k) => k.startsWith("tm:demo:")) && vals["skill.name"]?.label === "DEMO");
check("TM-TST-021", "blank skill level/evidence stay unanswered (not 0)", vals["skill.level"] === undefined && vals["skill.evidence"] === undefined);

// unknown number stays an unknown state
await page.goto("http://localhost:4174/#/diary/intake/4");
await page.selectOption("[data-field='constraint.hours_per_week'] select[data-role=state]", "unknown");
await page.click("button[type=submit]");
await page.waitForFunction(() => location.hash.includes("/intake/5"));
const unk = await page.evaluate(() => JSON.parse(localStorage.getItem("tm:demo:intake-constraint")).values["constraint.hours_per_week"]);
check("TM-TST-021", "‘don't know’ hours saved as unknown state, not 0", unk.state === "unknown" && unk.value === undefined);

// real namespace untouched
const realKeys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("tm:real:")));
check("TM-TST-143", "real namespace still empty after demo entry", realKeys.length === 0);

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

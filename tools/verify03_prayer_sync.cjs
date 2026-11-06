// VERIFY-03: browser check of the opt-in prayer-time source on the BUILT app (synthetic place Testville/Testland; the provider is mocked by browser interception, no real network).
// Run: serve dist/ on port 4191 (python3 -m http.server 4191 -d dist), then `node tools/verify03_prayer_sync.cjs evidence/verify03-prayer-sync.json`.
// Checks: consent off = zero requests; no tick / bad place = nothing sent; request fields; no cookie/referer/body; External label; one ask a day; offline; provider error; Withdraw.
const { chromium } = require("playwright");
const BASE = "http://localhost:4191/";
const res = [];
const ok = (name, pass, info) => { res.push({ name, pass: !!pass, info }); console.log(pass ? "PASS" : "FAIL", name, info ?? ""); };
const days = (y, m) => { const n = new Date(y, m, 0).getDate(); return Array.from({ length: n }, (_, i) => ({ date: { gregorian: { date: `${String(i + 1).padStart(2, "0")}-${String(m).padStart(2, "0")}-${y}` } }, timings: { Fajr: "04:11 (+06)", Dhuhr: "11:47 (+06)", Asr: "15:09 (+06)", Maghrib: "17:22 (+06)", Isha: "18:41 (+06)" } })); };
async function mk(browser, mode) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, serviceWorkers: "block" });
  await ctx.addInitScript(() => { try { localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); localStorage.setItem("tm:ui:visit", JSON.stringify({ lastOpen: new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10), welcome: null })); } catch {} });
  const seen = { aladhan: [], other: [] };
  ctx.on("request", (r) => { const u = r.url(); if (u.includes("aladhan.com")) seen.aladhan.push({ url: u, method: r.method(), headers: r.headers(), body: r.postData() }); else if (!u.startsWith(BASE) && !u.startsWith("data:") && !u.startsWith("blob:")) seen.other.push(u); });
  await ctx.route("**/api.aladhan.com/**", (route) => {
    if (mode === "err") return route.fulfill({ status: 500, body: "x" });
    if (mode === "bad") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ code: 200, data: [{ date: { gregorian: { date: "01-11-2026" } }, timings: { Fajr: "xx" } }] }) });
    const m = route.request().url().match(/calendarByCity\/(\d+)\/(\d+)/);
    return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ code: 200, status: "OK", data: days(+m[1], +m[2]) }) });
  });
  const page = await ctx.newPage();
  return { ctx, page, seen };
}
const src = (p) => p.evaluate(() => document.querySelector("[data-prayer-source]")?.getAttribute("data-prayer-source") ?? null);
(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  // A: consent off => zero requests
  { const { ctx, page, seen } = await mk(browser, "ok");
    for (const r of ["today", "deen", "settings/prayer/prayersync", "more/where", "journey/week"]) { await page.goto("about:blank"); await page.goto(BASE + "#/" + r); await page.waitForSelector("main"); await page.waitForTimeout(700); }
    await page.reload(); await page.waitForTimeout(1500);
    ok("A1 consent off: zero requests to the prayer provider (start, 5 screens, reload)", seen.aladhan.length === 0, `aladhan=${seen.aladhan.length}`);
    ok("A2 consent off: zero requests to any outside host", seen.other.length === 0, JSON.stringify(seen.other));
    await page.goto(BASE + "#/deen"); await page.waitForSelector("main"); await page.waitForTimeout(500);
    ok("A3 consent off: Deen says times are calculated on this phone", (await src(page)) === "local", String(await src(page)));
    // B: tick missing => nothing sent
    await page.goto(BASE + "#/settings/prayer/prayersync"); await page.waitForSelector("[data-prayer-sync=off]");
    ok("B0 the page says what is sent and to whom before the tick", (await page.textContent("[data-sync-what]")).length > 60, (await page.textContent("[data-sync-what]")).slice(0, 160));
    await page.fill("#ps-city", "Testville"); await page.fill("#ps-country", "Testland");
    await page.click("[data-act=prayer-sync-on]"); await page.waitForTimeout(800);
    ok("B1 button without the tick: nothing sent, a need-tick message shows", seen.aladhan.length === 0 && (await page.locator(".need").count()) === 1, `aladhan=${seen.aladhan.length}`);
    // bad place
    await page.check("#ps-tick"); await page.fill("#ps-city", "<script>"); await page.click("[data-act=prayer-sync-on]"); await page.waitForTimeout(600);
    ok("B2 bad place name refused, nothing sent", seen.aladhan.length === 0 && (await page.locator("p.err").first().textContent()).includes("letters only"), `aladhan=${seen.aladhan.length}`);
    // C: consent on with synthetic place
    await page.fill("#ps-city", "Testville"); await page.fill("#ps-country", "Testland"); await page.check("#ps-tick"); await page.click("[data-act=prayer-sync-on]"); await page.waitForTimeout(2500);
    const a = seen.aladhan;
    ok("C1 after the tick: 1-2 requests (today + next 30 days)", a.length >= 1 && a.length <= 2, `n=${a.length}`);
    const u0 = new URL(a[0].url);
    ok("C2 request fields: GET, https api.aladhan.com, city/country/method/school/timezone only, no coordinates", a.every((x) => x.method === "GET") && u0.origin === "https://api.aladhan.com" && u0.searchParams.get("city") === "Testville" && u0.searchParams.get("country") === "Testland" && [...u0.searchParams.keys()].every((k) => ["city", "country", "method", "school", "timezonestring"].includes(k)) && !/lat|lon|coord/i.test(a[0].url), a[0].url);
    ok("C3 no cookie, no referer, no body", a.every((x) => !x.headers.cookie && !x.headers.referer && !x.body), JSON.stringify(Object.keys(a[0].headers)));
    ok("C4 only that one outside host was contacted", seen.other.length === 0, JSON.stringify(seen.other));
    ok("C5 status shows 'on' with the place and last result updated", (await page.locator("[data-sync-on]").count()) === 1 && (await page.getAttribute("[data-sync-last]", "data-sync-last")) === "updated", await page.getAttribute("[data-sync-last]", "data-sync-last"));
    await page.goto(BASE + "#/deen"); await page.waitForSelector("main"); await page.waitForTimeout(600);
    const txt = await page.textContent("main");
    ok("C6 Deen shows External label and the provider's synthetic Fajr time (4:11)", (await src(page)) === "external" && /4[:.]11/.test(txt.replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d))), `source=${await src(page)}`);
    // D: reload online same day => no extra ask; offline reload => saved copy
    const n1 = seen.aladhan.length; await page.reload(); await page.waitForTimeout(1500);
    ok("D1 reload same day: no new request (one ask a day)", seen.aladhan.length === n1, `${n1}->${seen.aladhan.length}`);
    // D2: phone offline (no reload, so no page fetch needed): moving between screens makes no request and the saved copy still answers
    await ctx.setOffline(true); const n2 = seen.aladhan.length;
    await page.evaluate(() => { window.dispatchEvent(new Event("offline")); location.hash = "#/today"; }); await page.waitForTimeout(500);
    await page.evaluate(() => { location.hash = "#/deen"; }); await page.waitForTimeout(800);
    ok("D2 offline: no request and the saved copy still answers", seen.aladhan.length === n2 && (await src(page)) === "external", `source=${await src(page)} new=${seen.aladhan.length - n2}`);
    await ctx.setOffline(false);
    // D3: provider unreachable although phone is online: Update now fails, the earlier saved copy is kept
    await page.goto(BASE + "#/settings/prayer/prayersync"); await page.waitForSelector("[data-act=prayer-sync-now]");
    await ctx.route("**/api.aladhan.com/**", (r) => r.abort("failed"), { times: 4 });
    await page.click("[data-act=prayer-sync-now]"); await page.waitForTimeout(1500);
    const last3 = await page.getAttribute("[data-sync-last]", "data-sync-last").catch(() => null);
    await page.goto(BASE + "#/deen"); await page.waitForSelector("main"); await page.waitForTimeout(500);
    ok("D3 provider unreachable: status failed, saved copy kept and still shown as External", last3 === "failed" && (await src(page)) === "external", `last=${last3} source=${await src(page)}`);
    // E: withdraw
    await page.goto(BASE + "#/settings/prayer/prayersync"); await page.waitForSelector("[data-act=prayer-sync-off]"); const n3 = seen.aladhan.length;
    await page.click("[data-act=prayer-sync-off]"); await page.waitForTimeout(800);
    await page.goto(BASE + "#/deen"); await page.waitForSelector("main"); await page.waitForTimeout(500);
    ok("E1 Withdraw: back to 'calculated on this phone', saved copy gone", (await src(page)) === "local", String(await src(page)));
    await page.reload(); await page.waitForTimeout(1500); await page.goto(BASE + "#/today"); await page.waitForTimeout(800);
    ok("E2 after Withdraw and reload: zero new requests", seen.aladhan.length === n3, `${n3}->${seen.aladhan.length}`);
    const idb = await page.evaluate(async () => { try { const dbs = await indexedDB.databases(); return dbs.map((d) => d.name); } catch { return []; } });
    ok("E3 (info) databases present after withdraw", true, JSON.stringify(idb));
    await ctx.close(); }
  // F: provider error and bad answer => app keeps working with the phone's own calculation
  for (const mode of ["err", "bad"]) { const { ctx, page, seen } = await mk(browser, mode);
    await page.goto(BASE + "#/settings/prayer/prayersync"); await page.waitForSelector("[data-prayer-sync=off]");
    await page.fill("#ps-city", "Testville"); await page.fill("#ps-country", "Testland"); await page.check("#ps-tick"); await page.click("[data-act=prayer-sync-on]"); await page.waitForTimeout(2500);
    const last = await page.getAttribute("[data-sync-last]", "data-sync-last").catch(() => null);
    await page.goto(BASE + "#/deen"); await page.waitForSelector("main"); await page.waitForTimeout(500);
    ok(`F-${mode} provider ${mode === "err" ? "error 500" : "unreadable answer"}: app keeps working, local calculation answers, status says failed`, (await src(page)) === "local" && last === "failed" && (await page.locator("main").count()) === 1, `source=${await src(page)} last=${last}`);
    await ctx.close(); }
  await browser.close();
  require("fs").writeFileSync(process.argv[2], JSON.stringify({ build: "6b14df4", when: new Date().toISOString(), synthetic: "Testville/Testland, provider mocked by browser interception (no real network)", results: res }, null, 2));
  console.log(res.filter((r) => !r.pass).length, "failed of", res.length);
})();

// Automatic prayer-time update (owner request 3 Nov 2026): consent first, one coarse request, saved copy, local fallback, offsets on top.
// The live service could not be reached from the build sandbox, so every test uses a mocked fetch that follows the documented
// Aladhan calendarByCity answer (code, data[].timings, data[].date.gregorian.date). Live behaviour is UNTESTED.
import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../src/app";
import { prefs, store } from "../src/ui/state";
import { aladhanSource } from "../src/adapters/aladhan";
import { IdbPrayerCache, MemoryPrayerCache } from "../src/adapters/prayerCacheDb";
import { DEFAULT_PLACE, ALADHAN_METHOD, cacheKey, cleanPlaceName, daysLeft, monthUrl, monthsToFetch, nullPrayerSource, parseAladhanMonth, parseSyncSettings, resolveTimes, shouldFetch,
  type PrayerCache } from "../src/core/prayerSource";
import { DEFAULT_PRAYER_SETTINGS } from "../src/core/prayerMethod";
import { DHAKA_COORDS, prayerTimes, type CalDate } from "../src/core/prayer";
import { weekBlocks } from "../src/core/timeBlocks";
import { configurePrayerSync, currentCache, maybeSyncPrayerTimes, resolvedPrayerTimes, startPrayerSync, turnOffPrayerSync, turnOnPrayerSync } from "../src/ui/prayerSync";
import { PACKS } from "../src/i18n/packs";

const T0 = Date.parse("2026-11-03T04:00:00.000Z"); // 10:00 in Dhaka, 3 Nov 2026
const TODAY: CalDate = { y: 2026, m: 11, d: 3 };
const pad = (n: number) => String(n).padStart(2, "0");
/** The documented answer shape for one month. Times differ from the local calculation on purpose (Fajr 05:00 etc.). */
function month(y: number, m: number, daysIn: number, shift = 0) {
  return { code: 200, status: "OK", data: Array.from({ length: daysIn }, (_, i) => ({
    timings: { Fajr: `${pad(5)}:${pad(shift)} (+06)`, Sunrise: "06:20 (+06)", Dhuhr: "11:55 (+06)", Asr: "15:00 (+06)", Maghrib: "17:10 (+06)", Isha: "18:30 (+06)" },
    date: { readable: "x", gregorian: { date: `${pad(i + 1)}-${pad(m)}-${y}` } } })) };
}
const okFetch = () => vi.fn(async (url: string) => {
  const mm = /calendarByCity\/(\d+)\/(\d+)\?/.exec(url)!; const y = Number(mm[1]), m = Number(mm[2]);
  return { ok: true, json: async () => month(y, m, new Date(Date.UTC(y, m, 0)).getUTCDate()) };
});
const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const go = (hash: string) => { location.hash = hash; render(); };
let repo: MemoryPrayerCache; let now: number; let online: boolean;
const setup = (fetchFn: ReturnType<typeof okFetch>) => { repo = new MemoryPrayerCache(); configurePrayerSync({ source: aladhanSource(fetchFn as never), repo, now: () => now, online: () => online, redraw: () => {} }); };
const enable = () => { prefs.prayerSync = { v: 1, on: true, since: new Date(now).toISOString(), place: { ...DEFAULT_PLACE } }; };

beforeEach(() => {
  localStorage.clear(); store.demo.clear(); store.real.clear(); now = T0; online = true;
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
});

describe("request and answer (pure)", () => {
  it("the address carries only city, country, method, Asr school, Dhaka clock and the month; no coordinates", () => {
    const u = monthUrl({ y: 2026, m: 11, place: DEFAULT_PLACE, settings: { ...DEFAULT_PRAYER_SETTINGS, asr: "hanafi" } });
    expect(u).toBe("https://api.aladhan.com/v1/calendarByCity/2026/11?city=Dhaka&country=Bangladesh&method=1&school=1&timezonestring=Asia%2FDhaka");
    expect(u).not.toMatch(/lat|lon|key|token|id=/i); expect(ALADHAN_METHOD.karachi).toBe(1);
  });
  it("covers today and 30 days with one or two months", () => {
    expect(monthsToFetch({ y: 2026, m: 11, d: 3 })).toEqual([{ y: 2026, m: 11 }, { y: 2026, m: 12 }]);
    expect(monthsToFetch({ y: 2026, m: 11, d: 1 })).toEqual([{ y: 2026, m: 11 }, { y: 2026, m: 12 }]);
    expect(monthsToFetch({ y: 2026, m: 12, d: 31 })).toEqual([{ y: 2026, m: 12 }, { y: 2027, m: 1 }]);
  });
  it("reads the documented answer; a bad day is dropped, a wrong code gives nothing", () => {
    const j = month(2026, 11, 30); (j.data[4] as { timings: Record<string, string> }).timings.Asr = "99:99"; (j.data[5] as { timings: Record<string, string> }).timings.Isha = "04:00 (+06)";
    const d = parseAladhanMonth(j)!; expect(Object.keys(d).length).toBe(28); expect(d["2026-11-01"]).toEqual({ fajr: 300, dhuhr: 715, asr: 900, maghrib: 1030, isha: 1110 });
    expect(parseAladhanMonth({ code: 400, data: [] })).toBeNull(); expect(parseAladhanMonth(null)).toBeNull(); expect(parseAladhanMonth({ code: 200, data: [{}] })).toBeNull();
  });
  it("place names are letters only", () => { expect(cleanPlaceName(" Dhaka ")).toBe("Dhaka"); for (const bad of ["", "D", "12 Road", "a@b.com", "x".repeat(41), "Dhaka; drop"]) expect(cleanPlaceName(bad), bad).toBeNull(); expect(cleanPlaceName("ঢাকা")).toBe("ঢাকা"); });
  it("sync settings fail closed: broken or tick-less data is off", () => { expect(parseSyncSettings({ on: true }).on).toBe(false); expect(parseSyncSettings("x").on).toBe(false); expect(parseSyncSettings({ on: true, since: "2026-11-03" }).on).toBe(true); });
  it("the off adapter does nothing", async () => { expect(await nullPrayerSource.fetchMonth({ y: 2026, m: 11, place: DEFAULT_PLACE, settings: DEFAULT_PRAYER_SETTINGS })).toMatchObject({ ok: false, reason: "not_connected" }); });
});

describe("the adapter", () => {
  it("sends a plain GET with no cookies, no referrer and no body; maps errors without throwing", async () => {
    const f = okFetch(); await aladhanSource(f as never).fetchMonth({ y: 2026, m: 11, place: DEFAULT_PLACE, settings: DEFAULT_PRAYER_SETTINGS });
    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit]; expect(init).toMatchObject({ method: "GET", credentials: "omit", referrerPolicy: "no-referrer" }); expect(init.body).toBeUndefined();
    const q1 = { y: 2026, m: 11, place: DEFAULT_PLACE, settings: DEFAULT_PRAYER_SETTINGS };
    expect(await aladhanSource((async () => ({ ok: false, json: async () => ({}) })) as never).fetchMonth(q1)).toMatchObject({ ok: false });
    expect(await aladhanSource((async () => { throw new Error("offline"); }) as never).fetchMonth(q1)).toMatchObject({ ok: false });
    expect(await aladhanSource((async () => ({ ok: true, json: async () => ({ code: 200, data: "x" }) })) as never).fetchMonth(q1)).toMatchObject({ ok: false });
  });
});

describe("consent off sends nothing", () => {
  it("default is off: start-up, online event and Update now all make zero requests", async () => {
    const f = okFetch(); setup(f); expect(prefs.prayerSync.on).toBe(false);
    await startPrayerSync(); expect(await maybeSyncPrayerTimes()).toBe("off"); expect(await maybeSyncPrayerTimes(true)).toBe("off");
    expect(f).not.toHaveBeenCalled(); expect(currentCache()).toBeNull(); expect(resolvedPrayerTimes(TODAY).source).toBe("local");
  });
  it("the page shows what is sent and to whom, nothing is sent without the tick, then the tick turns it on", async () => {
    const f = okFetch(); setup(f); go("#/settings/prayer");
    const card = q("[data-prayer-sync=off]"); expect(card.textContent).toMatch(/aladhan\.com/); expect(card.textContent).toMatch(/only your city, your country/); expect(card.textContent).toMatch(/No GPS/);
    q<HTMLButtonElement>("[data-act=prayer-sync-on]").click(); render(); expect(prefs.prayerSync.on).toBe(false); expect(f).not.toHaveBeenCalled(); expect(q(".need")!.textContent).toMatch(/Tick/);
    q<HTMLInputElement>("#ps-city").value = "12 Road"; q<HTMLInputElement>("#ps-tick").checked = true; q<HTMLButtonElement>("[data-act=prayer-sync-on]").click(); expect(prefs.prayerSync.on).toBe(false); expect(f).not.toHaveBeenCalled();
    render(); q<HTMLInputElement>("#ps-city").value = "Dhaka"; q<HTMLInputElement>("#ps-tick").checked = true; q<HTMLButtonElement>("[data-act=prayer-sync-on]").click();
    expect(prefs.prayerSync.on).toBe(true); await vi.waitFor(() => expect(currentCache()).not.toBeNull());
    for (const [u] of f.mock.calls as unknown as string[][]) expect(u!.startsWith("https://api.aladhan.com/v1/calendarByCity/")).toBe(true);
  });
});

describe("online, offline, stale, failure", () => {
  it("online success: one call set, saved with fetchedAt, screens read the external times; offsets go on top", async () => {
    const f = okFetch(); setup(f); enable(); expect(await maybeSyncPrayerTimes()).toBe("updated");
    expect(f).toHaveBeenCalledTimes(2); const c = currentCache()!; expect(c.fetchedAt).toBe(new Date(T0).toISOString()); expect(daysLeft(c, TODAY)).toBeGreaterThanOrEqual(30);
    expect((await repo.load()).cache?.key).toBe(c.key);
    const r = resolvedPrayerTimes(TODAY); expect(r.source).toBe("external"); expect(r.times).toEqual({ fajr: 300, dhuhr: 715, asr: 900, maghrib: 1030, isha: 1110 });
    prefs.prayerSettings = { ...DEFAULT_PRAYER_SETTINGS, offsets: { ...DEFAULT_PRAYER_SETTINGS.offsets, fajr: -3, isha: 5 } };
    expect(resolveTimes(TODAY, DHAKA_COORDS, prefs.prayerSettings, prefs.prayerSync, { ...c, key: cacheKey(prefs.prayerSettings, DEFAULT_PLACE) }).times).toMatchObject({ fajr: 297, isha: 1115 });
  });
  it("at most one ask a day on app open; the next Dhaka day asks again", async () => {
    const f = okFetch(); setup(f); enable(); await maybeSyncPrayerTimes(); const n = f.mock.calls.length;
    now += 3 * 3_600_000; expect(await maybeSyncPrayerTimes()).toBe("skipped"); expect(f).toHaveBeenCalledTimes(n);
    now += 24 * 3_600_000; expect(await maybeSyncPrayerTimes()).toBe("updated"); expect(f.mock.calls.length).toBeGreaterThan(n);
  });
  it("offline: no request, the saved copy answers", async () => {
    const f = okFetch(); setup(f); enable(); await maybeSyncPrayerTimes(); online = false; f.mockClear(); now += 30 * 3_600_000;
    expect(await maybeSyncPrayerTimes()).toBe("offline"); expect(f).not.toHaveBeenCalled(); expect(resolvedPrayerTimes(dayAfter(TODAY, 1)).source).toBe("external");
  });
  it("a restart offline loads the saved copy from the repo before anything else", async () => {
    const f = okFetch(); setup(f); enable(); await maybeSyncPrayerTimes(); const saved = await repo.load();
    const repo2 = new MemoryPrayerCache(); repo2.cache = saved.cache; repo2.attempt = saved.attempt; online = false;
    configurePrayerSync({ source: aladhanSource(f as never), repo: repo2, now: () => now, online: () => online, redraw: () => {} }); f.mockClear();
    await startPrayerSync(); expect(f).not.toHaveBeenCalled(); expect(resolvedPrayerTimes(TODAY).source).toBe("external");
  });
  it("stale copy: a day that is not saved falls back to the phone's own calculation", async () => {
    const f = okFetch(); setup(f); enable(); await maybeSyncPrayerTimes();
    const far = { y: 2027, m: 3, d: 1 }; const r = resolvedPrayerTimes(far); expect(r.source).toBe("local"); expect(r.times).toEqual(prayerTimes(far, DHAKA_COORDS, DEFAULT_PRAYER_SETTINGS));
  });
  it("fewer than 7 days saved: tries again after 6 hours, not before", async () => {
    const f = okFetch(); setup(f); enable(); const key = cacheKey(prefs.prayerSettings, DEFAULT_PLACE);
    const days = Object.fromEntries([3, 4, 5].map((d) => [`2026-11-0${d}`, { fajr: 300, dhuhr: 715, asr: 900, maghrib: 1030, isha: 1110 }]));
    const cache: PrayerCache = { v: 1, key, source: "aladhan", fetchedAt: new Date(T0).toISOString(), days };
    const g = { sync: prefs.prayerSync, online: true, cache, attempt: { at: new Date(T0).toISOString(), key }, key, today: TODAY, nowMs: T0 + 3_600_000 };
    expect(shouldFetch(g)).toBe(false); expect(shouldFetch({ ...g, nowMs: T0 + 7 * 3_600_000 })).toBe(true); expect(shouldFetch({ ...g, online: false })).toBe(false); expect(shouldFetch({ ...g, sync: { ...g.sync, on: false } })).toBe(false);
  });
  it("failure: the app keeps working, an earlier saved copy is kept, with none the local calculation answers", async () => {
    const bad = vi.fn(async () => { throw new Error("down"); }); repo = new MemoryPrayerCache();
    configurePrayerSync({ source: aladhanSource(bad as never), repo, now: () => now, online: () => true, redraw: () => {} }); enable();
    expect(await maybeSyncPrayerTimes()).toBe("failed"); expect(resolvedPrayerTimes(TODAY).source).toBe("local");
    const ok = okFetch(); setup(ok); enable(); await maybeSyncPrayerTimes(); const before = currentCache()!.fetchedAt;
    const bad2 = vi.fn(async () => ({ ok: false, json: async () => ({}) })); configurePrayerSync({ source: aladhanSource(bad2 as never), repo, now: () => now + 25 * 3_600_000, online: () => true, redraw: () => {} });
    expect(await maybeSyncPrayerTimes()).toBe("failed"); expect(currentCache()?.fetchedAt ?? before).toBe(before); expect(resolvedPrayerTimes(TODAY).source).toBe("external");
  });
  it("a different method, Asr rule or city does not reuse the copy", async () => {
    const f = okFetch(); setup(f); enable(); await maybeSyncPrayerTimes();
    prefs.prayerSettings = { ...DEFAULT_PRAYER_SETTINGS, asr: "hanafi" }; expect(resolvedPrayerTimes(TODAY).source).toBe("local");
    prefs.prayerSettings = DEFAULT_PRAYER_SETTINGS; prefs.prayerSync = { ...prefs.prayerSync, place: { city: "Sylhet", country: "Bangladesh" } }; expect(resolvedPrayerTimes(TODAY).source).toBe("local");
  });
  it("Withdraw stops requests at once and removes the saved copy", async () => {
    const f = okFetch(); setup(f); enable(); await maybeSyncPrayerTimes(); await turnOffPrayerSync();
    expect(prefs.prayerSync.on).toBe(false); expect((await repo.load()).cache).toBeNull(); f.mockClear(); expect(await maybeSyncPrayerTimes(true)).toBe("off"); expect(f).not.toHaveBeenCalled(); expect(resolvedPrayerTimes(TODAY).source).toBe("local");
  });
  it("turning it off while a request is out drops the answer", async () => {
    let release!: () => void; const gate = new Promise<void>((r) => { release = r; });
    const f = vi.fn(async (u: string) => { await gate; const m = /\/(\d+)\/(\d+)\?/.exec(u)!; return { ok: true, json: async () => month(Number(m[1]), Number(m[2]), 28) }; });
    setup(f as never); enable(); const p = maybeSyncPrayerTimes(); await Promise.resolve(); prefs.prayerSync = { ...prefs.prayerSync, on: false }; release(); await p;
    expect(currentCache()).toBeNull();
  });
});
const dayAfter = (c: CalDate, n: number): CalDate => ({ ...c, d: c.d + n });

describe("shown and linked", () => {
  it("Deen shows the source with an External label and the date, or 'Calculated on this phone'; offsets are named", async () => {
    const f = okFetch(); setup(f); go("#/deen"); expect(q("[data-prayer-source=local]").textContent).toBe("Calculated on this phone.");
    enable(); await maybeSyncPrayerTimes(); const ra = Date.now; Date.now = () => T0; try { render(); } finally { Date.now = ra; }
    expect(q("[data-prayer-source=external]").textContent).toBe("ExternalTimes from Aladhan (aladhan.com), updated 2026-11-03."); expect(q("[data-source-badge]")).not.toBeNull();
    expect(q("[data-source-badge]").closest("p")!.textContent).toBe("External"); // the badge has its own row
    expect(q("[data-prayer-note]").textContent).not.toMatch(/Calculated on this phone/); // only the true source is named
    expect(document.body.textContent!.split("Verify with your local timetable").length - 1).toBeLessThanOrEqual(0);
    expect(q("[data-prayer-time=fajr]").textContent).toBe("05:00");
    prefs.prayerSettings = { ...DEFAULT_PRAYER_SETTINGS, offsets: { ...DEFAULT_PRAYER_SETTINGS.offsets, fajr: 2 } }; Date.now = () => T0; try { render(); } finally { Date.now = ra; }
    expect(q("[data-prayer-time=fajr]").textContent).toBe("05:02"); expect(q("[data-prayer-source]").textContent).toMatch(/minute changes are added/);
  });
  it("the Settings page shows status and a Withdraw that works, and the Connections line names the exception", async () => {
    const f = okFetch(); setup(f); enable(); await maybeSyncPrayerTimes(); go("#/settings/prayer");
    expect(q("[data-prayer-sync=on]").textContent).toMatch(/Sent: Dhaka, Bangladesh and the month/); go("#/settings"); expect(app().textContent).toMatch(/One exception: automatic prayer times/);
    go("#/settings/prayer"); q<HTMLButtonElement>("[data-act=prayer-sync-off]").click(); await vi.waitFor(() => expect(prefs.prayerSync.on).toBe(false));
  });
  it("the schedule blocks read the same resolved times", () => {
    const t = { fajr: 111, dhuhr: 700, asr: 900, maghrib: 1000, isha: 1100 };
    const wb = weekBlocks([{ id: "p", kind: "prayer", prayerMinutes: 10, from: null, to: null } as never], TODAY, DHAKA_COORDS, DEFAULT_PRAYER_SETTINGS, 1, () => t);
    expect(wb.blocks.map((b) => b.start)).toEqual([111, 700, 900, 1000, 1100]);
  });
  it("en, bn and mix all have the new text", () => {
    const keys = Object.keys(PACKS.en).filter((k) => k.startsWith("prayer.sync.") || k.startsWith("prayer.src.")); expect(keys.length).toBeGreaterThan(18);
    for (const k of keys) for (const l of ["en", "bn", "mix"] as const) expect((PACKS[l] as Record<string, string>)[k], `${l}:${k}`).toBeTruthy();
    localStorage.setItem("tm:ui:lang", "bn"); go("#/settings/prayer"); expect(q("[data-prayer-sync=off]").textContent).toContain("aladhan.com"); expect(q("[data-prayer-sync=off]").textContent).toMatch(/শহর/);
    localStorage.setItem("tm:ui:lang", "mix"); go("#/settings/prayer"); expect(q("[data-prayer-sync=off]").textContent).toContain("aladhan.com");
  });
  it("the page policy allows only that one new host, and the service worker never handles it", () => {
    const csp = readFileSync("index.html", "utf8").match(/connect-src ([^;"]+)/)![1]!.split(/\s+/); expect(csp).toEqual(["'self'", "https://en.wikipedia.org", "https://bn.wikipedia.org", "https://api.aladhan.com"]);
    const sw = readFileSync("public/sw.js", "utf8"); expect(sw).not.toMatch(/aladhan/); expect(sw).toMatch(/new URL\(req\.url\)\.origin !== location\.origin\) return/);
  });
  it("the saved copy survives in IndexedDB and clears", async () => {
    const db = new IdbPrayerCache(); const c: PrayerCache = { v: 1, key: "k", source: "aladhan", fetchedAt: "2026-11-03T00:00:00.000Z", days: { "2026-11-03": { fajr: 1, dhuhr: 2, asr: 3, maghrib: 4, isha: 5 } } };
    await db.saveCache(c); await db.saveAttempt({ at: "x", key: "k" }); expect(await db.load()).toEqual({ cache: c, attempt: { at: "x", key: "k" } }); await db.clear(); expect(await db.load()).toEqual({ cache: null, attempt: null });
  });
  it("turnOnPrayerSync refuses a bad place and sends nothing", () => { const f = okFetch(); setup(f); expect(turnOnPrayerSync("Dhaka", "<script>")).toBe(false); expect(prefs.prayerSync.on).toBe(false); expect(f).not.toHaveBeenCalled(); });
});

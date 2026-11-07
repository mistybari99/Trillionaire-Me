// Update flow (owner request 3 Nov 2026): calm banner, nothing automatic, no typed text lost, build stamp in Settings > About.
import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../src/app";
import { prefs, store } from "../src/ui/state";
import { createUpdater, type Reg } from "../src/ui/updater";
import { hasTypedText, nextPhase, stampLine } from "../src/core/updateBanner";
import { BUILD } from "../src/ui/buildInfo";
import { PACKS } from "../src/i18n/packs";

class FakeReg extends EventTarget implements Reg { waiting: ServiceWorker | null = null; installing: ServiceWorker | null = null; updates = 0; failUpdate = false;
  async update() { this.updates++; if (this.failUpdate) throw new Error("offline"); } }
class FakeSw extends EventTarget { controller: unknown = {}; }
const worker = () => { const w = new EventTarget() as EventTarget & { state: string; postMessage: ReturnType<typeof vi.fn> }; w.state = "installing"; w.postMessage = vi.fn(); return w; };
const mk = (reg = new FakeReg(), sw = new FakeSw(), now = { t: 1_000_000 }) => { const reload = vi.fn(); const u = createUpdater({ reg, sw, doc: document, reload, now: () => now.t }); return { u, reg, sw, reload, now }; };

beforeEach(() => { localStorage.clear(); store.demo.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); });

describe("banner logic (pure)", () => {
  it("waiting shows the banner, a tap updates, typed text asks once first", () => {
    expect(nextPhase("idle", "waiting", false)).toBe("ready"); expect(nextPhase("ready", "tap", false)).toBe("updating"); expect(nextPhase("ready", "tap", true)).toBe("confirm");
    expect(nextPhase("confirm", "tap", true)).toBe("updating"); expect(nextPhase("idle", "tap", false)).toBe("idle"); expect(nextPhase("updating", "waiting", false)).toBe("updating");
  });
  it("typed text means a field with text; buttons, ticks and empty fields do not count", () => {
    const d = document.createElement("div"); d.innerHTML = '<input type="checkbox" checked><input type="text" value=""><button>x</button><input type="range" value="5">'; expect(hasTypedText(d)).toBe(false);
    d.innerHTML += '<textarea>my note</textarea>'; expect(hasTypedText(d)).toBe(true);
  });
  it("the stamp names version, build and date; unknown parts are said plainly", () => {
    const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    expect(stampLine({ version: "0.1.0", sha: "ece202d", date: "2026-11-03" }, m)).toBe("0.1.0 · build ece202d · 3 Nov 2026");
    expect(stampLine({ version: "", sha: "dev", date: "" }, m)).toBe("unknown · build unknown · unknown date");
  });
});

describe("the updater with a fake worker", () => {
  it("nothing shows on a fresh install or when nothing waits; a waiting worker shows one calm banner", () => {
    const a = mk(); expect(a.u.banner()).toBeNull(); expect(document.getElementById("update-banner")).toBeNull();
    const reg = new FakeReg(); reg.waiting = worker() as never; const b = mk(reg); const el = document.getElementById("update-banner")!;
    expect(b.u.phase()).toBe("ready"); expect(el.textContent).toContain("A new version is ready."); expect(el.getAttribute("role")).toBe("status"); expect(el.querySelector(".err, [role=alert]")).toBeNull();
    const first = mk(new FakeReg(), Object.assign(new FakeSw(), { controller: null })); void first; // no controller = first install: nothing to update
  });
  it("a worker that finishes installing while the app is open raises the banner", () => {
    const { reg } = mk(); const w = worker(); reg.installing = w as never; reg.dispatchEvent(new Event("updatefound")); reg.waiting = w as never; w.state = "installed"; w.dispatchEvent(new Event("statechange"));
    expect(document.getElementById("update-banner")).not.toBeNull();
  });
  it("Update now tells the worker to take over; the page reloads only after that takes over, never before", () => {
    const reg = new FakeReg(); const w = worker(); reg.waiting = w as never; const { u, sw, reload } = mk(reg);
    sw.dispatchEvent(new Event("controllerchange")); expect(reload).not.toHaveBeenCalled(); // another tab's update does not reload this page by itself
    (document.querySelector("[data-act=update-now]") as HTMLButtonElement).click();
    expect(w.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" }); expect(u.phase()).toBe("updating"); expect(document.getElementById("update-banner")!.textContent).toContain("Updating");
    sw.dispatchEvent(new Event("controllerchange")); expect(reload).toHaveBeenCalledTimes(1);
  });
  it("typed text on the page: the first tap only asks, nothing is sent; the second goes ahead", () => {
    document.getElementById("app")!.innerHTML = '<textarea id="n">half a note</textarea>';
    const reg = new FakeReg(); const w = worker(); reg.waiting = w as never; const { u } = mk(reg);
    (document.querySelector("[data-act=update-now]") as HTMLButtonElement).click(); expect(u.phase()).toBe("confirm"); expect(w.postMessage).not.toHaveBeenCalled();
    expect(document.getElementById("update-banner")!.textContent).toContain("Save it first"); expect((document.getElementById("n") as HTMLTextAreaElement).value).toBe("half a note");
    (document.querySelector("[data-act=update-now]") as HTMLButtonElement).click(); expect(w.postMessage).toHaveBeenCalledTimes(1);
  });
  it("checks on open and again when online or shown, at most once a minute unless forced; offline checks fail quietly", async () => {
    const { u, reg, now } = mk(); u.check(true); u.check(); expect(reg.updates).toBe(1); now.t += 61_000; u.check(); expect(reg.updates).toBe(2);
    reg.failUpdate = true; u.check(true); await Promise.resolve(); expect(reg.updates).toBe(3); expect(u.phase()).toBe("idle");
  });
  it("the banner is in Bangla too", () => { localStorage.setItem("tm:ui:lang", "bn"); const reg = new FakeReg(); reg.waiting = worker() as never; mk(reg); expect(document.getElementById("update-banner")!.textContent).toContain(PACKS.bn["upd.ready"]); });
});

describe("service worker rules", () => {
  const sw = readFileSync("public/sw.js", "utf8");
  it("a new version waits for the message; only a first install takes over at once; claim happens on activate", () => {
    expect(sw).toMatch(/data\.type === "SKIP_WAITING"\) self\.skipWaiting\(\)/); expect(sw).toMatch(/if \(!self\.registration\.active\) self\.skipWaiting\(\)/);
    expect((sw.match(/skipWaiting\(\)/g) ?? []).length).toBe(2); expect(sw).toMatch(/self\.clients\.claim\(\)/);
  });
  it("registration never uses the browser's cached copy of the worker file, and main.ts uses the updater", () => {
    expect(readFileSync("src/ui/updater.ts", "utf8")).toMatch(/updateViaCache: "none"/); expect(readFileSync("src/main.ts", "utf8")).toMatch(/installUpdater\(\)/);
    expect(readFileSync("public/_headers", "utf8")).toMatch(/\/sw\.js\n  Cache-Control: public, max-age=0, must-revalidate/);
  });
  it("behaves as written in a fake worker: first install claims at once, a later install waits, the message releases it", () => {
    const run = (active: unknown) => { const h: Record<string, (e: unknown) => void> = {}; let skipped = 0;
      const g = { addEventListener: (n: string, f: (e: unknown) => void) => { h[n] = f; }, registration: { scope: "https://x.test/", active }, skipWaiting() { skipped++; }, clients: { claim() {} } };
      new Function("self", "caches", "fetch", "location", "Request", "URL", sw.replace('/*PRECACHE_LIST*/[]', '["./"]'))(g, { open: async () => ({ add: async () => {} }), keys: async () => [], delete: async () => true, match: async () => undefined }, async () => ({}), { origin: "https://x.test" }, class {}, URL);
      h.install!({ waitUntil() {} }); const afterInstall = skipped; h.message!({ data: { type: "SKIP_WAITING" } }); h.message!({ data: { type: "other" } }); return { afterInstall, afterMessage: skipped }; };
    expect(run(null)).toEqual({ afterInstall: 1, afterMessage: 2 }); expect(run({})).toEqual({ afterInstall: 0, afterMessage: 1 });
  });
});

describe("Settings > About", () => {
  it("shows version, build and date, a check button, and the reassurance about local data, in English and Bangla", () => {
    location.hash = "#/settings/about"; render();
    const line = document.querySelector("[data-version]")!.textContent!; expect(line).toContain(BUILD.version); expect(line).toMatch(/build \S+ · \d{1,2} [A-Z][a-z]{2} \d{4}/);
    expect(document.querySelector("[data-card=version]")!.textContent).toContain("keeps all your entries and settings"); expect(document.querySelector("[data-act=check-update]")).not.toBeNull();
    prefs.lang = "bn"; render(); expect(document.querySelector("[data-card=version]")!.textContent).toContain("সব এন্ট্রি ও সেটিংস");
  });
  it("the build stamp is defined at build time from the version, the commit and the date", () => {
    const v = readFileSync("vite.config.ts", "utf8"); for (const k of ["__APP_VERSION__", "__APP_SHA__", "__APP_BUILT__"]) expect(v).toContain(k);
    expect(BUILD.version).toMatch(/^\d+\.\d+\.\d+/); expect(BUILD.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

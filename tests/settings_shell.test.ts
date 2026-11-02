// Settings redesign PR 2: registry completeness, link check, routes, tab, quick card, status strip, compact banner, lock precedence.
import "fake-indexeddb/auto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { ROUTES, render } from "../src/app";
import { consentKv, prefs, store } from "../src/ui/state";
import { grantConsent, revokeConsent } from "../src/core/consent";
import { setPin } from "../src/core/appLock";
import { lockNow } from "../src/ui/lockUi";
import { CATEGORIES, GUIDES, ROWS, rowsOf, settingsHash } from "../src/ui/settingsRegistry";
import { PACKS } from "../src/i18n/packs";

const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const go = (hash: string) => { location.hash = hash; render(); };
const routeOk = (hash: string) => ROUTES.some(([re]) => re.test(hash.replace(/^#/, "")));
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = `${d}/${f}`; return statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") ? [p] : []; });

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear(); revokeConsent(consentKv);
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
});

describe("registry", () => {
  it("row ids are unique and every label exists in the en and bn packs", () => {
    expect(new Set(ROWS.map((r) => r.id)).size).toBe(ROWS.length);
    for (const r of ROWS) { expect(PACKS.en[r.label], r.id).toBeTruthy(); expect(PACKS.bn[r.label], r.id).toBeTruthy(); }
    for (const g of GUIDES) for (const k of [g.label, g.desc]) { expect(PACKS.en[k], g.id).toBeTruthy(); expect(PACKS.bn[k], g.id).toBeTruthy(); }
  });
  it("every prefs field is owned by exactly one row", () => {
    const src = readFileSync("src/ui/state.ts", "utf8"); const block = src.slice(src.indexOf("export const prefs = {"));
    const fields = [...new Set([...block.matchAll(/^\s{2}get ([a-zA-Z]+)\(\)/gm)].map((m) => m[1]!))];
    expect(fields.length).toBeGreaterThan(20);
    for (const f of fields) expect(ROWS.filter((r) => r.prefs.includes(f)).length, `prefs.${f}`).toBe(1);
    for (const r of ROWS) for (const f of r.prefs) expect(fields, `${r.id} lists unknown prefs.${f}`).toContain(f);
  });
  it("every tm:ui / consent / secret storage key in the source belongs to a row (or is listed as internal state)", () => {
    const INTERNAL = new Set(["tm:ui:focus", "tm:ui:listsNs"]); // running focus timer and a one-time migration marker: not settings
    const owned = ROWS.flatMap((r) => r.keys);
    const covered = (k: string) => owned.some((o) => o === k || (o.endsWith("*") && k.startsWith(o.slice(0, -1))));
    const found = new Set<string>();
    for (const f of walk("src")) { if (f.endsWith("settingsRegistry.ts")) continue; for (const m of readFileSync(f, "utf8").matchAll(/["`](tm:(?:ui|consent|secret):[A-Za-z0-9:_.]*)/g)) found.add(m[1]!.replace(/:$/, "")); }
    for (const k of found) { if (k === "tm:secret" || k === "tm:ui:view" || k === "tm:ui:conn" || k === "tm:ui:overallMem" || k === "tm:secret:conn") continue; if (INTERNAL.has(k)) continue; expect(covered(k), k).toBe(true); }
  });
  it("every category has rows, and the home holds language, theme and text size", () => {
    for (const c of CATEGORIES) if (c !== "delete" && c !== "connections") expect(rowsOf(c).length, c).toBeGreaterThan(0);
    expect(rowsOf("home").map((r) => r.id)).toEqual(["language", "theme", "textsize"]);
  });
});

describe("link check", () => {
  it("every route a row, guide or category points to is a real route", () => {
    for (const r of ROWS) expect(routeOk(r.route), `${r.id} -> ${r.route}`).toBe(true);
    for (const g of GUIDES) expect(routeOk(g.route), g.id).toBe(true);
    for (const c of [...CATEGORIES, "about"] as const) expect(routeOk(settingsHash(c)), c).toBe(true);
  });
  it("every link on every Settings page resolves, in all three languages", () => {
    for (const lang of ["en", "bn", "mix"]) {
      localStorage.setItem("tm:ui:lang", lang);
      for (const p of ["#/settings", ...[...CATEGORIES, "about"].map((c) => `#/settings/${c}`)]) {
        go(p); expect(q("h1").textContent, p).toBeTruthy();
        for (const a of app().querySelectorAll("a[href^='#/']")) expect(routeOk(a.getAttribute("href")!), `${p} -> ${a.getAttribute("href")}`).toBe(true);
      }
    }
  });
  it("old More crumbs no longer point at /more", () => {
    for (const p of ["#/more/status", "#/more/fields", "#/more/glossary", "#/more/safety", "#/more/dictionary", "#/more/library", "#/more/halal-flags", "#/topics", "#/more/data", "#/more/rules"]) { go(p); expect(app().querySelector("a.crumb[href='#/more']"), p).toBeNull(); }
  });
});

describe("shell", () => {
  it("the fifth tab is Settings, points at /settings, and is highlighted on Settings and content routes", () => {
    go("#/today"); const tabs = [...app().querySelectorAll("nav a.tab")]; expect(tabs).toHaveLength(5); expect(tabs[4]!.textContent).toBe("Settings"); expect(tabs[4]!.getAttribute("href")).toBe("#/settings");
    for (const p of ["#/settings", "#/settings/look", "#/more/glossary", "#/topics", "#/more/data"]) { go(p); expect(q("nav a[aria-current=page]").getAttribute("href"), p).toBe("#/settings"); }
  });
  it("home shows quick card, status strip, 8 category cards and the Guides row in order", () => {
    go("#/settings");
    expect([...app().querySelectorAll("main > *")].map((e) => e.tagName + (e.getAttribute("data-card") ?? ""))).toEqual(["H1", "P", "SECTIONquick", "SECTIONstatus", ...Array(9).fill("A")]);
    expect([...app().querySelectorAll("main > a")].map((a) => a.getAttribute("href"))).toEqual([...CATEGORIES, "about"].map((c) => `#/settings/${c}`));
    const last = app().querySelectorAll("main > a")[7]!; expect(last.getAttribute("href")).toBe("#/settings/delete"); // Delete data is the last category
  });
  it("quick card changes language, theme and text size; nothing destructive is on the home", () => {
    go("#/settings"); q<HTMLButtonElement>("[data-lang=bn]").click(); expect(prefs.lang).toBe("bn");
    go("#/settings"); q<HTMLButtonElement>("[data-theme-set=dark]").click(); expect(prefs.theme).toBe("dark");
    go("#/settings"); q<HTMLButtonElement>("[data-scale='150']").click(); expect(prefs.scale).toBe(150);
    expect(app().querySelector("[data-act*=clear], [data-act*=delete]")).toBeNull();
  });
  it("status strip is computed from real state", () => {
    go("#/settings"); expect(q("[data-status=backup]").textContent).toBe("No backup file yet"); expect(q("[data-status=data]").textContent).toBe("Demo data only"); expect(q("[data-status=privacy]").textContent).toBe("App lock: off");
    prefs.fileBackupAt = "2026-10-12T10:00:00.000Z"; grantConsent(consentKv, "2026-10-26T10:00:00.000Z"); localStorage.setItem("tm:ui:dataMode", "real"); go("#/settings");
    expect(q("[data-status=backup]").textContent).toMatch(/Last backup file: 2026-10-12/); expect(q("[data-status=data]").textContent).toBe("Real data: permission on");
  });
  it("category summaries come from state (connections: nothing leaves this phone)", () => {
    go("#/settings"); expect(q("[data-summary=connections]").textContent).toBe("0 of 4 on. Nothing leaves this phone."); expect(q("[data-summary=data]").textContent).toBe("Showing: Demo");
  });
  it("a known row id is highlighted once; an unknown row id and unknown category still render", () => {
    go("#/settings/look/design"); expect(q("[data-setting-row=design]").classList.contains("set-hl")).toBe(true);
    go("#/settings/look/nope"); expect(q("h1").textContent).toBe("Look & screens"); expect(app().querySelector(".set-hl")).toBeNull();
    go("#/settings/home/textsize"); expect(q("[data-setting=textsize]").classList.contains("set-hl")).toBe(true);
    go("#/settings/zzz"); expect(q("[data-settings=home]")).not.toBeNull();
  });
  it("rows show current values; each row opens where the setting is changed", () => {
    go("#/settings/plan"); expect(q("[data-row-value=planmode]").textContent).toBe("Normal"); expect(q("[data-setting-row=rules]").getAttribute("href")).toBe("#/more/rules");
    go("#/settings/connections"); expect(q("[data-row-value=connections]").textContent).toBe("0/4");
  });
  it("on Settings the DEMO banner is one compact line and the daily ask card is not shown", () => {
    go("#/settings"); expect(q("[data-demo-banner]").getAttribute("data-compact")).toBe("1"); expect(app().querySelector("[data-mode-ask]")).toBeNull(); expect(app().querySelector("[data-act=start-real-banner]")).toBeNull();
    go("#/today"); expect(app().querySelector("[data-act=start-real-banner]")).not.toBeNull();
  });
  it("/more still renders (old routes untouched until the redirect step)", () => { go("#/more"); expect(q("h1").textContent).toBeTruthy(); expect(q("nav a[aria-current=page]").getAttribute("href")).toBe("#/settings"); });
  it("with the app lock on, a deep link to Settings shows the lock screen first and the same route after unlock", async () => {
    await setPin(consentKv, "4821", "4821", 1000); lockNow(); location.hash = "#/settings/privacy"; render();
    expect(app().querySelector("[data-lock-screen]")).not.toBeNull(); expect(app().querySelector("[data-settings]")).toBeNull();
    const input = q<HTMLInputElement>("#lock-pin"); input.value = "4821"; (q("form") as HTMLFormElement).dispatchEvent(new Event("submit", { cancelable: true }));
    await new Promise((r) => setTimeout(r, 200)); render();
    expect(location.hash).toBe("#/settings/privacy"); expect(app().querySelector("[data-settings=privacy]")).not.toBeNull();
  });
  it("the welcome replay button is on Guides & info and deletes nothing", () => {
    store.demo.put({ id: "g", entity: "goal", ns: "demo", ownerId: "demo-user", schemaVersion: 1, createdAt: "2026-10-26T10:00:00.000Z", values: { "goal.title": { state: "value", value: "x", label: "DEMO" } } });
    go("#/settings/about"); q<HTMLButtonElement>("[data-act=welcome-again]").click(); expect(location.hash).toBe("#/start"); expect(store.demo.list().length).toBe(1);
  });
});

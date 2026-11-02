// Settings redesign PR 4: old addresses redirect inside render() with history.replaceState; one-time "what moved" note.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { REDIRECTS, ROUTES, render } from "../src/app";
import { prefs, store } from "../src/ui/state";
import { movedNoteCard } from "../src/ui/settingsUi";
import { ROWS, GUIDES } from "../src/ui/settingsRegistry";
import { readFileSync, readdirSync, statSync } from "node:fs";

const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = `${d}/${f}`; return statSync(p).isDirectory() ? walk(p) : /\.(ts|mjs)$/.test(p) ? [p] : []; });
beforeEach(() => {
  localStorage.clear(); store.demo.clear(); store.real.clear();
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
});

describe("redirects", () => {
  it("each old address ends on the new screen with the address bar updated, no extra hashchange, and Back does not loop", () => {
    let hashchanges = 0; const on = () => { hashchanges++; }; window.addEventListener("hashchange", on);
    for (const [from, to] of Object.entries(REDIRECTS)) {
      history.replaceState(null, "", "#/today"); location.hash = `#${from}`; const before = history.length; hashchanges = 0;
      render();
      expect(location.hash, from).toBe(`#${to}`); expect(history.length, "no new history entry").toBe(before); expect(q("h1").textContent, from).toBeTruthy();
    }
    expect(q("[data-settings=plan]")).not.toBeNull(); // last one: /more/rules -> plan page, automation section highlighted
    expect(q("[data-setting-row=rules]").classList.contains("set-hl")).toBe(true);
    window.removeEventListener("hashchange", on);
  });
  it("/more, /more/data and /more/connections land on Settings, Demo or real data and Connections", async () => {
    location.hash = "#/more"; render(); expect(q("[data-settings=home]")).not.toBeNull();
    location.hash = "#/more/data"; render(); expect(q("[data-settings=data]")).not.toBeNull();
    await (await import("../src/ui/lazy")).preloadLazy(); location.hash = "#/more/connections"; render(); expect(q("[data-conn-summary]")).not.toBeNull(); expect(location.hash).toBe("#/settings/connections");
  });
  it("every target is a real route, content routes did not move, and the lock check still comes first", () => {
    for (const to of Object.values(REDIRECTS)) expect(ROUTES.some(([re]) => re.test(to)), to).toBe(true);
    for (const p of ["/more/status", "/more/fields", "/more/glossary", "/more/safety", "/more/dictionary", "/more/library", "/more/halal-flags", "/topics", "/cards"]) expect(ROUTES.some(([re]) => re.test(p)), p).toBe(true);
    const src = readFileSync("src/app.ts", "utf8"); expect(src.indexOf("isLocked()")).toBeLessThan(src.indexOf("REDIRECTS[path]"));
  });
  it("no source or test still points at a removed /more address (only the redirect table and this test)", () => {
    const removed = /["'`(]#?\/more(?:\/(?:data|connections|rules))?["'`)]/;
    for (const f of [...walk("src"), ...walk("tests"), "tools/e2e.mjs", "tools/screenshots.mjs"]) {
      if (f.endsWith("src/app.ts") || f.endsWith("settings_redirects.test.ts")) continue;
      expect(removed.test(readFileSync(f, "utf8")), f).toBe(false);
    }
    for (const r of ROWS) expect(r.route.startsWith("#/more") && !GUIDES.some((g) => g.route === r.route) ? r.route : "").toBe("");
  });
});

describe("what moved note", () => {
  const ago = (days: number) => new Date(Date.now() - days * 86400_000).toISOString();
  it("shows once on Today with an Open Settings link, hides after a tap, and never shows on Settings", () => {
    location.hash = "#/today"; render(); expect(q("[data-moved-note]").textContent).toMatch(/Settings and Guides are now in the last tab/); expect(prefs.movedNote).not.toBe("");
    q<HTMLButtonElement>("[data-act=moved-ok]").click(); expect(prefs.movedNote).toBe("done"); render(); expect(app().querySelector("[data-moved-note]")).toBeNull();
    prefs.movedNote = ""; location.hash = "#/settings"; render(); expect(app().querySelector("[data-moved-note]")).toBeNull();
  });
  it("disappears 14 days after it first appeared", () => {
    prefs.movedNote = ago(13); expect(movedNoteCard("en")).not.toBeNull(); prefs.movedNote = ago(15); expect(movedNoteCard("en")).toBeNull();
  });
  it("opening Settings from the note also ends it", () => { location.hash = "#/today"; render(); q<HTMLAnchorElement>("[data-act=moved-open]").click(); expect(prefs.movedNote).toBe("done"); });
});

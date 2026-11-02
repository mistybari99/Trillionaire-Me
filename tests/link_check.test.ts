// Link check (CLAUDE.md "Definition of done"): every internal link the app draws, and every "#/..." address written in the code,
// must open a real route (or an old address that redirects). Covers all routes in en, bn and mix.
import "fake-indexeddb/auto";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { REDIRECTS, ROUTES, render } from "../src/app";
import { preloadLazy } from "../src/ui/lazy";
import { STATIC, allPaths } from "./helpers_paths";
import { consentKv, store } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";

const resolves = (path: string): boolean => path in REDIRECTS || ROUTES.some(([re]) => re.test(path));
const pathOf = (href: string) => href.replace(/^#/, "").split("?")[0]!;

beforeAll(async () => { await preloadLazy(); });
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear(); grantConsent(consentKv, "2026-11-02T00:00:00.000Z"); localStorage.setItem("tm:ui:dataMode", "demo"); });

describe("link check: links drawn on every screen", () => {
  for (const lang of ["en", "bn", "mix"] as const) {
    it(`every internal link opens a real route (${lang})`, () => {
      const broken: string[] = []; let seen = 0;
      for (const path of allPaths()) {
        document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", lang); location.hash = "#" + path; render();
        for (const a of document.querySelectorAll<HTMLAnchorElement>("a[href^='#/']")) {
          seen++;
          const target = pathOf(a.getAttribute("href")!);
          if (!resolves(target)) broken.push(`${path} -> ${a.getAttribute("href")}`);
        }
      }
      expect(seen).toBeGreaterThan(100);
      expect(broken).toEqual([]);
    });
  }
  it("every route in the table is reached by at least one link or is a tab, a redirect target or a deliberate entry point", () => {
    const linked = new Set<string>(); const lang = "en";
    for (const path of allPaths()) {
      document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", lang); location.hash = "#" + path; render();
      for (const a of document.querySelectorAll<HTMLAnchorElement>("a[href^='#/']")) linked.add(pathOf(a.getAttribute("href")!));
    }
    // Entry points that nothing needs to link to: the first-run screen has its own flow.
    const ENTRY = new Set(["/start"]);
    const orphan = STATIC.filter((p) => !ENTRY.has(p) && !linked.has(p) && !(p in REDIRECTS));
    expect(orphan).toEqual([]);
  });
});

describe("link check: addresses written in the code", () => {
  const files: string[] = [];
  const walk = (d: string) => { for (const n of readdirSync(d)) { const f = join(d, n); statSync(f).isDirectory() ? walk(f) : /\.ts$/.test(n) && files.push(f); } };
  walk(resolve(__dirname, "../src"));
  it("every literal '#/...' address in src resolves", () => {
    const bad: string[] = [];
    for (const f of files) {
      // "startsWith('#/topic')" style prefix checks are not links
      const src = readFileSync(f, "utf8").replace(/startsWith\([^)]*\)/g, "startsWith()");
      for (const m of src.matchAll(/["'`](#\/[a-z][a-z0-9\/\-]*)(?=["'`?])/g)) {
        const path = pathOf(m[1]!);
        // a trailing "/" means a parameter is appended at run time
        const base = path.endsWith("/") ? `${path}x1` : path;
        if (!resolves(base)) bad.push(`${f.replace(/.*\/src\//, "src/")}: ${m[1]}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

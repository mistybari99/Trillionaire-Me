// W5c: manifest shortcuts (Android installed PWA long-press only). Targets must be real routes inside scope and start_url.
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ROUTES } from "../src/app";
import { TAB_ACTIONS } from "../src/ui/tabActions";
import { precacheList } from "../tools/precache";

const man = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8")) as { start_url: string; scope: string; shortcuts: Array<{ name: string; short_name: string; url: string; icons: Array<{ src: string }> }> };
const all = Object.values(TAB_ACTIONS).flat();
const base = new URL("https://app.example/x/");
const abs = (u: string) => new URL(u, base);

describe("manifest shortcuts", () => {
  it("has Capture and Prayer mark, with names and an existing icon", () => {
    expect(man.shortcuts.map((s) => s.short_name)).toEqual(["Capture", "Prayer mark"]);
    for (const s of man.shortcuts) { expect(s.name.length).toBeGreaterThan(3); expect(s.name).toMatch(/[ঀ-৿]/); for (const i of s.icons) expect(existsSync(`public/${i.src}`), i.src).toBe(true); }
  });
  it("each target is the href of a shared TAB_ACTIONS entry and a route the router matches", () => {
    const capture = all.find((a) => a.id === "capture")!, prayer = all.find((a) => a.quickPrayer)!;
    const targets = man.shortcuts.map((s) => s.url);
    expect(targets).toEqual([`./${capture.href}`, `./${prayer.href}`]);
    for (const u of targets) { const path = u.split("#")[1]!; expect(ROUTES.some(([re]) => re.test(path)), path).toBe(true); }
  });
  it("targets sit inside scope and start_url", () => {
    const scope = abs(man.scope), start = abs(man.start_url);
    expect(start.href.startsWith(scope.href)).toBe(true);
    for (const s of man.shortcuts) { const u = abs(s.url); expect(u.href.startsWith(scope.href), s.url).toBe(true); expect(u.origin).toBe(base.origin); expect(u.pathname).toBe(start.pathname); }
  });
  it("the manifest and the shortcut icons are precached; the manifest cache header is unchanged", () => {
    const list = precacheList(["index.html", "manifest.webmanifest", ...man.shortcuts.flatMap((s) => s.icons.map((i) => i.src))]);
    expect(list).toContain("./manifest.webmanifest");
    for (const s of man.shortcuts) for (const i of s.icons) expect(list).toContain(`./${i.src}`);
    const headers = readFileSync("public/_headers", "utf8");
    expect(headers).toMatch(/\/manifest\.webmanifest\n\s+Cache-Control: public, max-age=0, must-revalidate/);
  });
});

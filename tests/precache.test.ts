// Service worker precache: the build stamps the full file list into sw.js so the whole app works offline after the first visit.
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { precacheList, precacheVersion, stampServiceWorker } from "../tools/precache";

const sw = readFileSync("public/sw.js", "utf8");

describe("precacheList", () => {
  const files = ["index.html", "sw.js", "precache.json", "manifest.webmanifest", "icon.svg", "assets/index-ab12.js", "assets/index-ab12.js.map", "assets/f-1.woff2", "assets/f-2.woff", "content/pack-001.json", "assets/pack-001-xyz.js"];
  it("lists the page, assets, packs and icons; leaves out sw.js, the list itself, source maps and old-format fonts", () => {
    const l = precacheList(files);
    expect(l).toContain("./"); expect(l).toContain("./index.html"); expect(l).toContain("./manifest.webmanifest"); expect(l).toContain("./icon.svg");
    expect(l).toContain("./assets/index-ab12.js"); expect(l).toContain("./assets/pack-001-xyz.js"); expect(l).toContain("./content/pack-001.json"); expect(l).toContain("./assets/f-1.woff2");
    for (const x of ["./sw.js", "./precache.json", "./assets/index-ab12.js.map", "./assets/f-2.woff"]) expect(l).not.toContain(x);
    expect([...l].sort()).toEqual(l);
  });
  it("keeps WOFF when there is no WOFF2, and handles Windows separators", () => {
    expect(precacheList(["assets/f.woff"])).toContain("./assets/f.woff");
    expect(precacheList(["assets\\x.js".replace("\\", "/")])).toContain("./assets/x.js");
  });
  it("version changes when any file changes and not otherwise", () => {
    const d = mkdtempSync(join(tmpdir(), "tm-pre-")); mkdirSync(join(d, "assets")); writeFileSync(join(d, "index.html"), "a"); writeFileSync(join(d, "assets/x.js"), "1");
    const v1 = precacheVersion(d, ["index.html", "assets/x.js"]); expect(precacheVersion(d, ["assets/x.js", "index.html"])).toBe(v1);
    writeFileSync(join(d, "assets/x.js"), "2"); expect(precacheVersion(d, ["index.html", "assets/x.js"])).not.toBe(v1);
  });
});

describe("service worker source", () => {
  it("stamps version and list; the unstamped source is a safe empty list", () => {
    const out = stampServiceWorker(sw, "abc123", ["./", "./a.js"]);
    expect(out).toContain('const VERSION = "abc123";'); expect(out).toContain('const PRECACHE = ["./","./a.js"];'); expect(out).not.toContain("/*PRECACHE");
    expect(sw).toContain('/*PRECACHE_VERSION*/"dev"'); expect(sw).toContain("/*PRECACHE_LIST*/[]");
  });
  it("saves the list on install (one missing file does not stop the rest), drops old caches, and never touches another origin", () => {
    expect(sw).toMatch(/addEventListener\("install"[\s\S]*Promise\.allSettled\(PRECACHE\.map/);
    expect(sw).toMatch(/k !== SHELL && k !== RUNTIME/); expect(sw).toMatch(/origin !== location\.origin\) return/);
    expect(sw).not.toMatch(/https?:\/\//); expect(sw).not.toMatch(/importScripts/);
  });
  it("falls back offline to the saved copy, then to the page", () => { expect(sw).toMatch(/caches\.match\(req\)[\s\S]*caches\.match\("\.\/"\)/); });
});

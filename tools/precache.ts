// Build step: lists every file of the built app and writes the list (and a version) into dist/sw.js, so the service worker can
// save the whole app on the first visit. Offline use then works for every screen, font, content pack and logo, not only the ones visited.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { Plugin } from "vite";

const SKIP = (p: string) => p === "sw.js" || p === "precache.json" || p.endsWith(".map") || p.endsWith(".DS_Store");

/** Relative URLs ("./x") of the files to save, sorted. The page itself is saved under "./" and "./index.html"; sw.js, source maps and old-format fonts are left out. */
export function precacheList(files: readonly string[]): string[] {
  const out = new Set<string>(["./"]);
  const all = files.map((f) => f.split(sep).join("/").replace(/^\.?\//, "")).filter((p) => p && !SKIP(p));
  // Phones that can run this app load the WOFF2 fonts; the older WOFF copies are fallbacks that would only double the download.
  const hasWoff2 = all.some((p) => p.endsWith(".woff2"));
  for (const p of all) if (!(hasWoff2 && p.endsWith(".woff"))) out.add(`./${p}`);
  return [...out].sort();
}

const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });

/** Version = hash of the file names and contents, so a changed app gets a new cache and the old one is deleted. */
export function precacheVersion(root: string, files: readonly string[]): string {
  const h = createHash("sha1");
  for (const f of [...files].sort()) { h.update(f); h.update(readFileSync(join(root, f))); }
  return h.digest("hex").slice(0, 12);
}

export function stampServiceWorker(swSource: string, version: string, list: readonly string[]): string {
  return swSource.replace('/*PRECACHE_VERSION*/"dev"', JSON.stringify(version)).replace("/*PRECACHE_LIST*/[]", JSON.stringify(list));
}

export function precachePlugin(): Plugin {
  let outDir = "dist";
  return {
    name: "tm-precache", apply: "build",
    configResolved(c) { outDir = c.build.outDir.startsWith("/") ? c.build.outDir : join(c.root, c.build.outDir); },
    closeBundle() {
      if (!existsSync(join(outDir, "sw.js"))) return;
      const rel = walk(outDir).map((p) => relative(outDir, p));
      const list = precacheList(rel); const version = precacheVersion(outDir, rel.filter((f) => !SKIP(f.split(sep).join("/"))));
      writeFileSync(join(outDir, "sw.js"), stampServiceWorker(readFileSync(join(outDir, "sw.js"), "utf8"), version, list));
      writeFileSync(join(outDir, "precache.json"), JSON.stringify({ version, files: list }));
    },
  };
}

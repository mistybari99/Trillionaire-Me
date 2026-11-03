// Hosting files (audit AU-04, AU-05, AU-09, AU-13): security headers, cache rules, stale-while-revalidate, CI config, no test writes into evidence/.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { precacheList } from "../tools/precache";

const headers = readFileSync("public/_headers", "utf8");
const block = (path: string) => { const m = new RegExp(`^${path.replace(/[*/.]/g, "\\$&")}\\n((?:  .+\\n?)+)`, "m").exec(headers); return m ? m[1]! : ""; };
const dirs = (csp: string) => Object.fromEntries(csp.split(";").map((x) => x.trim().split(/\s+/)).filter((x) => x[0]).map((x) => [x[0]!, x.slice(1).join(" ")]));

describe("public/_headers", () => {
  it("sends the same Content-Security-Policy as the page, plus frame-ancestors none", () => {
    const meta = readFileSync("index.html", "utf8").match(/Content-Security-Policy" content="([^"]+)"/)![1]!;
    const h = /Content-Security-Policy: (.+)/.exec(block("/*"))![1]!;
    const dm = dirs(meta), dh = dirs(h); expect(dh["frame-ancestors"]).toBe("'none'"); delete dh["frame-ancestors"]; expect(dh).toEqual(dm);
  });
  it("has the basic hardening headers and no camera, microphone, location or payment permission", () => {
    const b = block("/*");
    for (const x of ["X-Content-Type-Options: nosniff", "X-Frame-Options: DENY", "Referrer-Policy: no-referrer", "Strict-Transport-Security:"]) expect(b).toContain(x);
    for (const p of ["camera=()", "microphone=()", "geolocation=()", "payment=()"]) expect(b).toContain(p);
    expect(b).not.toMatch(/Cache-Control/); // cache rules sit on their own paths, so the host never merges two values
  });
  it("checks the page, service worker and install file every time; keeps hashed files for a year", () => {
    for (const p of ["/", "/index.html", "/sw.js", "/manifest.webmanifest"]) expect(block(p), p).toMatch(/Cache-Control: public, max-age=0, must-revalidate/);
    expect(block("/assets/*")).toMatch(/max-age=31536000, immutable/);
    expect(block("/content/*")).toMatch(/max-age=86400/);
  });
  it("contains no secret, key or token, and the file itself is not saved for offline use", () => {
    expect(headers.replace(/^#.*$/gm, "")).not.toMatch(/api[_-]?key|secret|token|password/i);
    expect(precacheList(["index.html", "_headers", "assets/a.js"])).not.toContain("./_headers");
  });
  it("manifest and page agree on the theme colour", () => {
    const man = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8")); const m = readFileSync("index.html", "utf8").match(/name="theme-color" content="([^"]+)"/)![1];
    expect(man.theme_color).toBe(m); expect(man.display).toBe("standalone"); expect(man.start_url).toBe("./");
  });
});

describe("service worker: stale-while-revalidate for content that is not saved", () => {
  const sw = readFileSync("public/sw.js", "utf8");
  it("saved app files keep the fresh-first behaviour with offline fallback, others answer from the copy and refresh in the background", () => {
    expect(sw).toMatch(/staleWhileRevalidate/); expect(sw).toMatch(/isSaved\(req\.url\)/); expect(sw).toMatch(/e\.waitUntil\(refresh/);
    expect(sw).toMatch(/caches\.match\("\.\/", MATCH\)/); expect(sw).toMatch(/Promise\.allSettled\(PRECACHE\.map/);
  });
  it("behaves as written: a fake worker answers the saved copy first and refreshes it, and still serves offline", async () => {
    const store = new Map<string, string>(); const handlers: Record<string, (e: unknown) => void> = {}; let fetchCalls = 0; let net = "v1";
    const url = (u: string) => new URL(u, "https://x.test/").href;
    const caches = { open: async () => ({ put: async (r: { url: string }, res: { text(): Promise<string> }) => { store.set(r.url, await res.text()); }, add: async () => {} }),
      match: async (r: { url: string } | string) => { const k = typeof r === "string" ? url(r) : r.url; return store.has(k) ? { text: async () => store.get(k)!, clone() { return this; } } : undefined; }, keys: async () => [], delete: async () => true };
    const g = { addEventListener: (n: string, f: (e: unknown) => void) => { handlers[n] = f; }, registration: { scope: "https://x.test/" }, skipWaiting() {}, clients: { claim() {} }, navigator: { onLine: true } };
    const run = new Function("self", "caches", "fetch", "location", "Request", "URL", `${sw.replace('/*PRECACHE_LIST*/[]', '["./", "./index.html"]')}`);
    run(g, caches, async (r: { url: string }) => { fetchCalls++; if (net === "down") throw new Error("offline"); return { ok: true, text: async () => net, clone() { return this; } }; }, { origin: "https://x.test" }, class { constructor(public url: string) {} }, URL);
    const ask = async (path: string) => { let p: Promise<{ text(): Promise<string> }> | undefined; const waits: Promise<unknown>[] = []; handlers.fetch!({ request: { url: url(path), method: "GET", headers: new Headers() }, respondWith: (x: Promise<{ text(): Promise<string> }>) => { p = x; }, waitUntil: (x: Promise<unknown>) => { waits.push(x); } }); const r = await p!; const body = await r.text(); await Promise.all(waits); return body; };
    expect(await ask("extra/file.json")).toBe("v1");           // first time: network
    net = "v2"; expect(await ask("extra/file.json")).toBe("v1"); // stale copy answers at once
    expect(await ask("extra/file.json")).toBe("v2");           // the background refresh landed
    net = "down"; expect(await ask("extra/file.json")).toBe("v2"); // offline: still answers
    expect(fetchCalls).toBeGreaterThan(2);
  });
});

describe("CI workflow and evidence hygiene", () => {
  it("ci.yml runs tsc, vitest, build and the browser checks, with read-only permissions and no secrets", () => {
    const y = readFileSync(".github/workflows/ci.yml", "utf8").replace(/^\s*#.*$/gm, "");
    for (const c of ["npx tsc --noEmit", "npx vitest run", "npm run build", "node tools/e2e.mjs"]) expect(y).toContain(c);
    expect(y).toMatch(/permissions:\s+contents: read/); expect(y).not.toMatch(/secrets\./); expect(y).not.toMatch(/deploy|wrangler|publish/i);
  });
  it("the field-catalog test no longer writes into evidence/ unless asked", () => {
    const src = readFileSync("tests/g1.test.ts", "utf8"); expect(src).not.toMatch(/writeFileSync\("evidence\//); expect(src).toMatch(/TM_WRITE_EVIDENCE/);
    expect(readFileSync("tools/evidence.mjs", "utf8")).toContain("TM_WRITE_EVIDENCE");
  });
  it("a normal test run leaves tracked evidence files unchanged", () => {
    if (!existsSync(".git")) return;
    const before = execFileSync("git", ["status", "--porcelain", "--", "evidence/catalog-report.json"]).toString();
    execFileSync("npx", ["vitest", "run", "tests/g1.test.ts"], { stdio: "ignore" });
    expect(execFileSync("git", ["status", "--porcelain", "--", "evidence/catalog-report.json"]).toString()).toBe(before);
  }, 120_000);
});

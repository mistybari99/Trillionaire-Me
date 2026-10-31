// Block 6 security review: keys and secrets never leave the device, never enter backups/exports/snapshots, and the app code has
// no network use except the one user-tapped Wikipedia search file and same-origin file checks (azan slot).
import "fake-indexeddb/auto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createBackup } from "../src/core/backup";
import { encryptBackup } from "../src/core/cryptoBackup";
import { exportNamespace } from "../src/core/export";
import { MemorySnapshotRepo, snapshotToFile, takeSnapshot } from "../src/core/snapshots";
import { Store, MemoryKV } from "../src/core/store";
import { StoreRepo } from "../src/adapters/storeRepo";
import { grantConsent } from "../src/core/consent";
import { secretKey } from "../src/core/connections";
import { FACILITY_IDS } from "../src/core/ports";
import type { TMRecord } from "../src/core/types";

const KEY = "sk-test-0123456789abcdefABCDEF-device-only";
const rec = (ns: "demo" | "real", id: string): TMRecord => ({ id, entity: "task", ns, ownerId: ns === "demo" ? "demo-user" : "owner", schemaVersion: 1, createdAt: "2026-10-31T00:00:00.000Z", values: { "task.title": { state: "value", value: "Walk " + id, label: ns === "demo" ? "DEMO" : "FACT" } } });

describe("keys and secrets stay out of every copy of the data", () => {
  it("backup, export, encrypted backup, snapshot and snapshot file never contain a stored key or any tm:secret / tm:ui key", async () => {
    const kv = new MemoryKV(); const ck = new MemoryKV(); grantConsent(ck, "2026-10-31T00:00:00.000Z");
    for (const id of FACILITY_IDS) ck.set(secretKey(id), KEY + id);
    ck.set("tm:ui:prayerCoords", JSON.stringify({ lat: 23.7, lon: 90.4 })); ck.set("tm:ui:conn:approved:aiAssistant", "yes");
    const st = new Store(kv, { realEnabled: true, consentKv: ck });
    st.demo.put(rec("demo", "d1")); st.real.put(rec("real", "r1"));
    const repo = new StoreRepo(st);
    const demo = await createBackup(repo, "demo"), real = await createBackup(repo, "real");
    const enc = await encryptBackup({ demo, real }, "correct horse battery", 1000);
    const snaps = new MemorySnapshotRepo();
    const snap = (await takeSnapshot(repo, snaps, { reason: "manual", keep: 5, realOk: true }))!;
    const blobs = [JSON.stringify(demo), JSON.stringify(real), JSON.stringify(exportNamespace(st, "demo")), JSON.stringify(exportNamespace(st, "real")), JSON.stringify(enc), JSON.stringify(snapshotToFile(snap)), JSON.stringify(await snaps.list())];
    for (const b of blobs) { expect(b).not.toContain(KEY); expect(b).not.toContain("tm:secret"); expect(b).not.toContain("tm:ui:"); expect(b).not.toContain("lat"); }
    // the main data store never holds a key either
    expect(kv.keys().filter((k) => k.startsWith("tm:secret"))).toEqual([]);
    // keys live only in the per-device settings store, under a prefix that is not a record prefix
    for (const id of FACILITY_IDS) expect(secretKey(id).startsWith("tm:secret:")).toBe(true);
  });
});

describe("no network at runtime", () => {
  const walk = (d: string): string[] => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
  const files = walk("src").filter((f) => f.endsWith(".ts"));
  const read = (f: string) => readFileSync(f, "utf8");
  it("only the Wikipedia adapter and the azan presence check call fetch; nothing uses sockets, beacons or workers' importScripts", () => {
    for (const f of files) {
      const s = read(f);
      expect(s, f).not.toMatch(/XMLHttpRequest|WebSocket|sendBeacon|EventSource|importScripts|navigator\.share|gtag\(|analytics/);
      const usesFetch = /\bfetch\b/.test(s.replace(/\/\/.*$/gm, ""));
      if (usesFetch) expect(["src/adapters/wikipedia.ts", "src/ui/prayerAlerts.ts"], f).toContain(f);
    }
  });
  it("the azan check only asks for the app's own relative files", () => {
    const s = read("src/core/prayerSound.ts");
    for (const m of s.matchAll(/(AZAN_FILE|AZAN_FAJR_FILE)\s*=\s*"([^"]+)"/g)) expect(m[2]).toMatch(/^\.\/audio\/[a-z-]+\.mp3$/);
    expect(s).not.toMatch(/https?:/);
  });
  it("the only absolute web address in the code is the Wikipedia host; no remote scripts, styles, fonts or images in the page", () => {
    for (const f of files) {
      const s = read(f).replace(/xmlns|http:\/\/www\.w3\.org\/2000\/svg/g, "");
      for (const m of s.matchAll(/https?:\/\/[^\s"'`)]+/g)) { const ok = /wikipedia\.org/.test(m[0]) || /^https?:\/\/(?:\$\{|localhost)/.test(m[0]); if (!ok) expect(`${f}: ${m[0]}`, "external address").toMatch(/^$/); }
    }
    const html = read("index.html");
    expect(html).not.toMatch(/(?:src|href)=["']https?:/);
    expect(read("src/ui/styles.css")).not.toMatch(/url\(\s*["']?https?:|@import\s+(?:url\()?["']?https?:/);
  });
  it("the page carries a policy that allows only its own files plus the two Wikipedia hosts for the user-tapped search", () => {
    const m = read("index.html").match(/Content-Security-Policy" content="([^"]+)"/);
    expect(m).not.toBeNull();
    const dirs = Object.fromEntries(m![1]!.split(";").map((x) => x.trim().split(/\s+/)).filter((x) => x[0]).map((x) => [x[0]!, x.slice(1)]));
    expect(dirs["default-src"]).toEqual(["'self'"]); expect(dirs["script-src"]).toEqual(["'self'"]); expect(dirs["object-src"]).toEqual(["'none'"]);
    expect(dirs["connect-src"]).toEqual(["'self'", "https://en.wikipedia.org", "https://bn.wikipedia.org"]);
    expect(dirs["media-src"]).toEqual(["'self'"]);
  });
  it("the service worker only handles same-origin GET requests", () => {
    const sw = read("public/sw.js");
    expect(sw).toMatch(/new URL\(req\.url\)\.origin !== location\.origin\) return/);
    expect(sw).toMatch(/req\.method !== "GET"/);
  });
});

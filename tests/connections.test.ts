// Ports and Connections: all facilities off by default, no network while off, approval gate, keys stay on the device.
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FACILITY_IDS, NULL_ADAPTERS, NotEnabledError } from "../src/core/ports";
import { MemoryKV } from "../src/core/store";
import { checkConnectionKey, connectionStatus, grantApproval, isApproved, saveKey, secretKey, setEnabled, withdrawApproval } from "../src/core/connections";
import { createRegistry } from "../src/adapters/registry";
import { CONNECTED_STUBS } from "../src/adapters/connectedStubs";
import { exportNamespace } from "../src/core/export";
import { createBackup } from "../src/core/backup";
import { decryptBackup, encryptBackup } from "../src/core/cryptoBackup";
import { StoreRepo } from "../src/adapters/storeRepo";
import { PACKS } from "../src/i18n/packs";
import { render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import type { TMRecord } from "../src/core/types";
import { read, srcFiles } from "./helpers";

const KEY = "sk-test-ZZTOPSECRET12345";
const app = () => document.getElementById("app")!;
const go = (hash: string) => { location.hash = hash; render(); };
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const click = (s: string) => { q<HTMLElement>(s).click(); render(); };

beforeEach(() => {
  localStorage.clear(); store.demo.clear(); store.real.clear();
  document.body.innerHTML = '<div id="app"></div>';
  localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
});
afterEach(() => { vi.restoreAllMocks(); });

describe("ports: null adapters are the default", () => {
  it("every facility is off and the registry returns its null adapter", async () => {
    const reg = createRegistry(new MemoryKV());
    for (const id of FACILITY_IDS) {
      expect(reg.status(id)).toBe("off");
      expect(reg.get(id)).toBe(NULL_ADAPTERS[id]);
    }
    for (const r of [await reg.get("aiAssistant").ask("hi"), await reg.get("cloudSync").push({ data: "x", createdAt: "t" }), await reg.get("cloudSync").pull(), await reg.get("webSearch").search("q"), await reg.get("licensedContent").getPack("p1")]) {
      expect(r).toMatchObject({ ok: false, reason: "not_connected" });
    }
  });

  it("no fetch, XHR or beacon is called while off", async () => {
    const f = vi.fn(); vi.stubGlobal("fetch", f);
    const x = vi.fn(); vi.stubGlobal("XMLHttpRequest", x);
    const reg = createRegistry(new MemoryKV());
    await reg.get("aiAssistant").ask("hi"); await reg.get("webSearch").search("q"); await reg.get("cloudSync").pull(); await reg.get("licensedContent").getPack("p");
    go("#/more/connections"); app().querySelectorAll<HTMLElement>("button").forEach((b) => b.click());
    expect(f).not.toHaveBeenCalled(); expect(x).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("connected stubs throw 'not enabled in this build' and call nothing", () => {
    const f = vi.fn(); vi.stubGlobal("fetch", f);
    expect(() => CONNECTED_STUBS.aiAssistant.ask("x")).toThrow(NotEnabledError);
    expect(() => CONNECTED_STUBS.cloudSync.push({ data: "", createdAt: "" })).toThrow(/not enabled in this build/);
    expect(() => CONNECTED_STUBS.cloudSync.pull()).toThrow(/not enabled in this build/);
    expect(() => CONNECTED_STUBS.webSearch.search("x")).toThrow(/not enabled in this build/);
    expect(() => CONNECTED_STUBS.licensedContent.getPack("x")).toThrow(/not enabled in this build/);
    expect(f).not.toHaveBeenCalled(); vi.unstubAllGlobals();
  });

  it("registry statuses: off, needs approval, connected; enable needs approval", () => {
    const kv = new MemoryKV(); const reg = createRegistry(kv);
    expect(setEnabled(kv, "aiAssistant", true)).toBe(false);
    expect(reg.status("aiAssistant")).toBe("off");
    saveKey(kv, "aiAssistant", KEY);
    expect(reg.status("aiAssistant")).toBe("needs_approval");
    grantApproval(kv, "aiAssistant", "2026-10-26T00:00:00Z");
    expect(reg.status("aiAssistant")).toBe("off");
    expect(setEnabled(kv, "aiAssistant", true)).toBe(true);
    expect(reg.status("aiAssistant")).toBe("connected");
    expect(reg.get("aiAssistant")).toBe(CONNECTED_STUBS.aiAssistant);
    withdrawApproval(kv, "aiAssistant");
    expect(reg.status("aiAssistant")).toBe("needs_approval");
    expect(reg.get("aiAssistant")).toBe(NULL_ADAPTERS.aiAssistant);
  });

  it("core ports and stubs hold no network, UI or storage code", () => {
    for (const f of ["src/core/ports.ts", "src/core/connections.ts"]) expect(/from "\.\.\/ui|document\.|window\.|fetch\s*\(|XMLHttpRequest/.test(read(f)), f).toBe(false);
    for (const f of ["src/adapters/connectedStubs.ts", "src/adapters/registry.ts"]) expect(/fetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|import\(/.test(read(f)), f).toBe(false);
  });
});

describe("keys: accepted shapes and refusals", () => {
  it("accepts an API key and an endpoint", () => {
    expect(checkConnectionKey(KEY).ok).toBe(true);
    expect(checkConnectionKey("https://example.test/v1/sync").ok).toBe(true);
  });
  it("refuses empty, spaces, cards, passwords, OTP, PIN, account and recovery text", () => {
    expect(checkConnectionKey("   ")).toMatchObject({ ok: false, problem: "empty" });
    expect(checkConnectionKey("abc def ghi jkl")).toMatchObject({ ok: false, problem: "spaces" });
    expect(checkConnectionKey("4111 1111 1111 1111")).toMatchObject({ ok: false });
    expect(checkConnectionKey("4111111111111111")).toMatchObject({ ok: false, problem: "secret" });
    expect(checkConnectionKey("password:hunter2hunter2")).toMatchObject({ ok: false, problem: "secret" });
    expect(checkConnectionKey("otp:123456")).toMatchObject({ ok: false });
    expect(checkConnectionKey("12345678")).toMatchObject({ ok: false });
    expect(checkConnectionKey("short")).toMatchObject({ ok: false, problem: "length" });
    const kv = new MemoryKV(); saveKey(kv, "cloudSync", "4111111111111111");
    expect(kv.keys()).toEqual([]);
  });
});

describe("Connections screen", () => {
  it("one card per facility, all off, Enable disabled without approval", () => {
    go("#/more/connections");
    for (const id of FACILITY_IDS) {
      expect(q(`[data-conn="${id}"]`).getAttribute("data-conn-status")).toBe("off");
      expect(q<HTMLButtonElement>(`[data-conn-enable="${id}"]`).disabled).toBe(true);
    }
    expect(app().querySelectorAll("[data-conn]").length).toBe(4);
    q<HTMLButtonElement>('[data-conn-enable="webSearch"]').click(); render();
    expect(q('[data-conn="webSearch"]').getAttribute("data-conn-status")).toBe("off");
  });

  it("confirm states cost, data leaving the device and real data; no tick saves nothing", () => {
    go("#/more/connections"); click('[data-conn-approve="aiAssistant"]');
    const txt = q('[data-conn-confirm="aiAssistant"]').textContent!;
    expect(txt).toMatch(/cost/i); expect(txt).toMatch(/leaving your phone/i); expect(txt).toMatch(/real data is never sent/i);
    click('[data-conn-confirm-btn="aiAssistant"]');
    expect(isApproved(consentKv, "aiAssistant")).toBe(false);
    expect(q<HTMLButtonElement>('[data-conn-enable="aiAssistant"]').disabled).toBe(true);
    expect(app().textContent).toMatch(/Tick the box first/);
  });

  it("approval then Enable works for that facility only; withdraw switches it off", () => {
    go("#/more/connections"); click('[data-conn-approve="cloudSync"]');
    q<HTMLInputElement>('[data-conn-tick="cloudSync"]').checked = true; click('[data-conn-confirm-btn="cloudSync"]');
    expect(isApproved(consentKv, "cloudSync")).toBe(true); expect(isApproved(consentKv, "aiAssistant")).toBe(false);
    expect(q<HTMLButtonElement>('[data-conn-enable="cloudSync"]').disabled).toBe(false);
    expect(q<HTMLButtonElement>('[data-conn-enable="aiAssistant"]').disabled).toBe(true);
    click('[data-conn-enable="cloudSync"]');
    expect(q('[data-conn="cloudSync"]').getAttribute("data-conn-status")).toBe("connected");
    click('[data-conn-withdraw="cloudSync"]');
    expect(q('[data-conn="cloudSync"]').getAttribute("data-conn-status")).toBe("off");
  });

  it("key field is masked, never echoed, and a refused value is not saved", () => {
    go("#/more/connections");
    const f = q<HTMLInputElement>('[data-conn-key="webSearch"]'); expect(f.type).toBe("password");
    f.value = KEY; click('[data-conn-key-save="webSearch"]');
    expect(localStorage.getItem(secretKey("webSearch"))).toBe(KEY);
    expect(app().innerHTML).not.toContain(KEY);
    expect(q<HTMLInputElement>('[data-conn-key="webSearch"]').value).toBe("");
    expect(q('[data-conn="webSearch"]').getAttribute("data-conn-status")).toBe("needs_approval");
    q<HTMLInputElement>('[data-conn-key="aiAssistant"]').value = "4111111111111111"; click('[data-conn-key-save="aiAssistant"]');
    expect(localStorage.getItem(secretKey("aiAssistant"))).toBeNull();
    expect(q('[data-conn-key-msg="aiAssistant"]').textContent).toMatch(/card number/);
    click('[data-conn-key-remove="webSearch"]'); expect(localStorage.getItem(secretKey("webSearch"))).toBeNull();
  });

  it("is reachable from More", () => {
    go("#/more"); expect(app().querySelector('a[href="#/more/connections"]')).not.toBeNull();
  });
});

describe("keys never leave in backups, exports or logs", () => {
  const rec = (ns: "demo" | "real"): TMRecord => ({ id: `t-${ns}`, entity: "task", ns, ownerId: "o", schemaVersion: 1, createdAt: "2026-10-26T00:00:00Z", values: { "task.title": { state: "value", value: "x", label: ns === "demo" ? "DEMO" : "FACT" } } });
  it("plain backup, export, encrypted bundle and record stores exclude the key", async () => {
    grantConsent(consentKv, "2026-10-26T00:00:00Z");
    saveKey(consentKv, "aiAssistant", KEY); saveKey(consentKv, "cloudSync", "https://example.test/secret-endpoint");
    store.demo.put(rec("demo")); store.real.put(rec("real"));
    const repo = new StoreRepo(store);
    const demo = await createBackup(repo, "demo"), real = await createBackup(repo, "real");
    const all = JSON.stringify([demo, real, exportNamespace(store, "demo"), exportNamespace(store, "real"), store.demo.list(), store.real.list()]);
    expect(all).not.toContain("ZZTOPSECRET"); expect(all).not.toContain("secret-endpoint");
    const env = await encryptBackup({ demo, real }, "a-long-passphrase", 1000);
    expect(JSON.stringify(await decryptBackup(JSON.stringify(env), "a-long-passphrase"))).not.toContain("ZZTOPSECRET");
    expect(Object.keys(localStorage).filter((k) => /^tm:(demo|real):/.test(k) && localStorage.getItem(k)!.includes("ZZTOPSECRET"))).toEqual([]);
    expect(secretKey("aiAssistant").startsWith("tm:secret:")).toBe(true);
  });
  it("source files for connections do not log", () => {
    for (const f of srcFiles().filter((x) => /connect|ports|registry/i.test(x))) expect(/console\./.test(read(f)), f).toBe(false);
  });
});

describe("demo and real separation is unaffected", () => {
  it("connection settings write no record and no namespace is touched", () => {
    const before = [store.demo.list().length, store.real.list().length];
    const kv = new MemoryKV(); grantApproval(kv, "webSearch", "t"); saveKey(kv, "webSearch", KEY); setEnabled(kv, "webSearch", true);
    go("#/more/connections");
    expect([store.demo.list().length, store.real.list().length]).toEqual(before);
    expect(connectionStatus(kv, "webSearch")).toBe("connected");
  });
});

describe("statuses and text in en, bn and mix", () => {
  it.each(["en", "bn", "mix"] as const)("%s: status tags and card text render, Latin digits, parity", (lang) => {
    localStorage.setItem("tm:ui:lang", lang);
    saveKey(consentKv, "webSearch", KEY);
    go("#/more/connections");
    const tags = FACILITY_IDS.map((id) => q(`[data-conn-tag="${id}"]`).textContent);
    expect(tags).toContain(PACKS[lang]["conn.status.needs_approval"]); expect(tags).toContain(PACKS[lang]["conn.status.off"]);
    expect(app().textContent).toContain(PACKS[lang]["conn.aiAssistant.does"]);
    expect(/[০-৯]/.test(app().textContent!)).toBe(false);
    for (const s of ["off", "needs_approval", "connected"]) expect(PACKS[lang][`conn.status.${s}` as "conn.status.off"].trim()).not.toBe("");
  });
});

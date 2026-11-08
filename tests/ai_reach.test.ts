// W1: reach and wiring. The Connect AI screen is reachable from Connections; the Suggest-options flow only adds Google cards through the gated provider;
// everything is the null adapter / hidden while the layer is off; no request leaves while off.
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { FACILITY_IDS, NULL_ADAPTERS } from "../src/core/ports";
import { createRegistry } from "../src/adapters/registry";
import { grantApproval, setEnabled, withdrawApproval } from "../src/core/connections";
import { saveSearchBase } from "../src/adapters/googleSearch";
import { setKill } from "../src/core/aiGuard";
import { read } from "./helpers";
import { ROWS } from "../src/ui/settingsRegistry";

const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const settle = async () => { for (let i = 0; i < 8; i++) await new Promise((r) => setTimeout(r, 0)); };
const go = (h: string) => { location.hash = h; render(); };

beforeEach(() => {
  localStorage.clear(); store.demo.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
  for (const id of FACILITY_IDS) withdrawApproval(consentKv, id);
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("route reachable", () => {
  it("Connections links to Connect AI, and the screen opens with everything off", () => {
    go("#/settings/connections");
    const link = q<HTMLAnchorElement>("[data-conn-ai-link]"); expect(link.getAttribute("href")).toBe("#/settings/connections/ai");
    expect(q<HTMLAnchorElement>("[data-conn-search-link]").getAttribute("href")).toBe("#/settings/connections/ai");
    go(link.getAttribute("href")!);
    expect(q("h1").textContent).toBe("Connect AI"); expect(q("[data-ai-state]").getAttribute("data-ai-state")).toBe("off");
    expect(q<HTMLButtonElement>("[data-ai-master]").disabled).toBe(true); expect(q("[data-ai-need]")).not.toBeNull();
    expect(q("nav a[aria-current=page]").getAttribute("href")).toBe("#/settings");
    expect(q("[data-ai-sent]").children.length).toBe(3); expect(q("[data-ai-never]").children.length).toBe(3);
    expect(q<HTMLInputElement>("[data-ai-key]").type).toBe("password");
  });
  it("works in Bangla and Mix, with the page title and the draft label translated", () => {
    for (const lang of ["bn", "mix"]) { localStorage.setItem("tm:ui:lang", lang); go("#/settings/connections/ai"); expect(q("h1").textContent!.length).toBeGreaterThan(2); expect(app().textContent).not.toMatch(/\{\w+\}/); }
  });
  it("Settings knows the new storage keys (link and registry check)", () => {
    const row = ROWS.find((r) => r.id === "connections")!; expect(row.keys).toContain("tm:ui:ai:*");
    expect(read("src/ui/routes_ai.ts")).toMatch(/settings\\\/connections\\\/ai/); expect(read("src/app.ts")).toContain("...ROUTES_AI");
  });
  it("master switch turns on only after the approval on Connections", () => {
    go("#/settings/connections/ai"); q<HTMLButtonElement>("[data-ai-master]").click(); expect(q("[data-ai-state]").getAttribute("data-ai-state")).toBe("off");
    grantApproval(consentKv, "aiAssistant", "2026-11-08T00:00:00Z"); go("#/settings/connections/ai");
    q<HTMLButtonElement>("[data-ai-master]").click(); render(); expect(q("[data-ai-state]").getAttribute("data-ai-state")).toBe("on");
    q<HTMLButtonElement>("[data-ai-kill]").click(); render(); expect(q("[data-ai-kill-on]")).not.toBeNull(); expect(q("[data-ai-state]").getAttribute("data-ai-state")).toBe("off");
  });
});

describe("null adapters while off", () => {
  it("the registry gives the null adapters and they refuse", async () => {
    const reg = createRegistry(consentKv);
    for (const id of FACILITY_IDS) expect(reg.get(id)).toBe(NULL_ADAPTERS[id]);
    expect(await reg.get("aiAssistant").ask("x")).toMatchObject({ ok: false, reason: "not_connected" });
  });
  it("opening and clicking every button on the screen sends no request", async () => {
    const f = vi.fn(); vi.stubGlobal("fetch", f); const x = vi.fn(); vi.stubGlobal("XMLHttpRequest", x);
    go("#/settings/connections/ai"); app().querySelectorAll<HTMLElement>("button").forEach((b) => b.click()); await settle();
    expect(f).not.toHaveBeenCalled(); expect(x).not.toHaveBeenCalled();
  });
});

describe("Suggest options uses the gated provider", () => {
  const rows = [1, 2, 3].map((i) => ({ title: `Wiki ${i}`, snippet: "s" }));
  const items = [1, 2, 3].map((i) => ({ title: `Goog ${i}`, snippet: "s", link: `https://example.org/${i}` }));
  const stub = () => { const f = vi.fn(async (u: string) => ({ ok: true, json: async () => (String(u).startsWith("/api/search") ? { items } : { query: { search: rows } }) })); vi.stubGlobal("fetch", f); return f; };
  async function search() {
    go("#/diary/intake/2"); const panel = q("[data-suggest='interest.topic']");
    (document.getElementById("f-interest.topic") as HTMLInputElement).value = "Calligraphy";
    panel.querySelector<HTMLButtonElement>("[data-act=suggest-go]")!.click(); await settle(); return panel;
  }
  it("off: only Wikipedia cards, no Google request, no Google note", async () => {
    const f = stub(); saveSearchBase(consentKv, "/api/search"); const panel = await search();
    expect(panel.querySelectorAll("[data-option]").length).toBe(3); expect(panel.querySelector("[data-option-source=google]")).toBeNull(); expect(panel.querySelector("[data-google-note]")).toBeNull();
    expect(f.mock.calls.every((c) => !String(c[0]).startsWith("/api/search"))).toBe(true);
  });
  it("on with a typed path: Wikipedia first, then Google cards, after the tap only", async () => {
    grantApproval(consentKv, "webSearch", "2026-11-08T00:00:00Z"); setEnabled(consentKv, "webSearch", true); saveSearchBase(consentKv, "/api/search");
    const f = stub(); go("#/diary/intake/2"); expect(f).not.toHaveBeenCalled();
    const panel = await search(); const cards = [...panel.querySelectorAll("[data-option]")];
    expect(cards.length).toBe(6); expect(cards.slice(0, 3).every((c) => !c.hasAttribute("data-option-source"))).toBe(true); expect(cards.slice(3).every((c) => c.getAttribute("data-option-source") === "google")).toBe(true);
    expect(f.mock.calls.filter((c) => String(c[0]).startsWith("/api/search")).length).toBe(1);
  });
  it("kill switch hides the Google cards again", async () => {
    grantApproval(consentKv, "webSearch", "2026-11-08T00:00:00Z"); setEnabled(consentKv, "webSearch", true); saveSearchBase(consentKv, "/api/search"); setKill(consentKv, true);
    const f = stub(); const panel = await search(); expect(panel.querySelector("[data-option-source=google]")).toBeNull();
    expect(f.mock.calls.some((c) => String(c[0]).startsWith("/api/search"))).toBe(false);
  });
});

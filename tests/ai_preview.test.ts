// W1: the preview sheet shows exactly what is sent (same bytes), the host, a cost only when a price is typed; real data only when ticked; Deen records never.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { grantApproval, setEnabled, saveKey } from "../src/core/connections";
import { grantConsent } from "../src/core/consent";
import { saveConf, setKill } from "../src/core/aiGuard";
import { saveCap, savePrice } from "../src/core/aiUsage";
import { aiWiring } from "../src/ui/aiConnectUi";
import { blockedTransport } from "../src/adapters/ai/transport";
import { fakeTransport, okChat } from "../src/adapters/ai/fakeProvider";
import { openPreviewSheet } from "../src/ui/aiPreviewSheet";
import type { TMRecord } from "../src/core/types";

const q = <T extends Element>(s: string) => document.querySelector(s) as T;
const settle = async () => { for (let i = 0; i < 8; i++) await new Promise((r) => setTimeout(r, 0)); };
const go = () => { location.hash = "#/settings/connections/ai"; render(); };
const rec = (id: string, entity: string, ns: "demo" | "real", values: TMRecord["values"]): TMRecord => ({ id, entity, ns, ownerId: "o", schemaVersion: 4, createdAt: "2026-11-08T00:00:00Z", values });
const dv = (v: string) => ({ state: "value" as const, value: v, label: "DEMO" as const });
const fv = (v: string) => ({ state: "value" as const, value: v, label: "FACT" as const });
const original = aiWiring.transport;

function setup(price = false) {
  grantApproval(consentKv, "aiAssistant", "2026-11-08T00:00:00Z"); setEnabled(consentKv, "aiAssistant", true);
  saveKey(consentKv, "aiAssistant", "KEY-SENTINEL-9999"); saveConf(consentKv, { style: "chat", host: "api.example.com", path: "", model: "m1", headers: {} }); saveCap(consentKv, "calls", 5);
  if (price) savePrice(consentKv, 2, 4, "USD");
}
beforeEach(() => {
  localStorage.clear(); store.demo.clear(); store.real.clear(); aiWiring.transport = original;
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
  grantConsent(consentKv, "2026-11-08T00:00:00Z");
  store.demo.put(rec("g-demo", "goal", "demo", { "goal.title": dv("Demo plan alpha") }));
  store.real.put(rec("g-real", "goal", "real", { "goal.title": fv("Real goal beta") }));
  store.real.put(rec("p-real", "prayer_log", "real", { "prayer_log.note": fv("Deen secret fajr note") }));
  store.real.put(rec("d-real", "deen_plan", "real", { "deen_plan.title": fv("Deen plan gamma"), "goal.title": fv("Deen plan sneaky title") }));
});

async function ask(text: string, ctx: boolean) {
  go(); q<HTMLTextAreaElement>("[data-ai-q]").value = text; q<HTMLInputElement>("[data-ai-ctx]").checked = ctx;
  q<HTMLButtonElement>("[data-ai-preview]").click(); await settle(); render();
}

describe("sheet", () => {
  it("is a dialog, Esc cancels and sends nothing", async () => {
    const p = openPreviewSheet("en", () => ({ host: "h.example.com", path: "/p", body: "BODY", costText: null, hasDemo: false }), false);
    const s = q<HTMLElement>("[data-ai-sheet]"); expect(s.getAttribute("role")).toBe("dialog"); expect(s.getAttribute("aria-modal")).toBe("true");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(await p).toEqual({ send: false, realData: false }); expect(document.querySelector("[data-ai-sheet]")).toBeNull();
  });
});

describe("preview equals the bytes sent", () => {
  it("shows host and exact body; Send transmits the same body; the answer is labelled and not stored", async () => {
    setup(); const t = fakeTransport(okChat("A short answer")); aiWiring.transport = t;
    await ask("What is a budget?", false);
    expect(q("[data-ai-host]").textContent).toContain("api.example.com");
    const shown = q("[data-ai-payload]").textContent!; expect(shown).not.toContain("KEY-SENTINEL-9999"); expect(q("[data-ai-cost]")).toBeNull();
    q<HTMLButtonElement>("[data-ai-send]").click(); await settle(); render();
    expect(t.calls).toHaveLength(1); expect(t.calls[0]!.body).toBe(shown); expect(t.calls[0]!.host).toBe("api.example.com");
    expect(q("[data-ai-answer] h3").textContent).toBe("AI draft, check it"); expect(q("[data-ai-answer-text]").textContent).toBe("A short answer");
    expect(Object.keys(localStorage).some((k) => (localStorage.getItem(k) ?? "").includes("A short answer"))).toBe(false);
  });
  it("cost appears only when a price was typed", async () => {
    setup(true); aiWiring.transport = fakeTransport(okChat()); await ask("What is a budget?", false);
    expect(q("[data-ai-cost]").textContent).toMatch(/USD/);
  });
  it("Cancel sends nothing", async () => {
    setup(); const t = fakeTransport(okChat()); aiWiring.transport = t; await ask("hello there", false);
    q<HTMLButtonElement>("[data-ai-cancel]").click(); await settle(); expect(t.calls).toHaveLength(0);
  });
});

describe("what may be sent", () => {
  it("goal titles: demo ones carry DEMO; real ones only when ticked; Deen records never", async () => {
    setup(); const t = fakeTransport(okChat()); aiWiring.transport = t; await ask("Help me plan", true);
    let shown = q("[data-ai-payload]").textContent!;
    expect(shown).toContain("[DEMO] goal: Demo plan alpha"); expect(shown).not.toContain("Real goal beta");
    for (const w of ["Deen", "fajr", "sneaky"]) expect(shown).not.toContain(w);
    const tick = q<HTMLInputElement>("[data-ai-real]"); expect(tick.checked).toBe(false);
    tick.checked = true; tick.dispatchEvent(new Event("change")); shown = q("[data-ai-payload]").textContent!;
    expect(shown).toContain("goal: Real goal beta"); for (const w of ["Deen", "fajr", "sneaky"]) expect(shown).not.toContain(w);
    q<HTMLButtonElement>("[data-ai-send]").click(); await settle();
    expect(t.calls[0]!.body).toBe(shown);
    // next request starts unticked
    await ask("Help me plan again", true); expect(q<HTMLInputElement>("[data-ai-real]").checked).toBe(false); expect(q("[data-ai-payload]").textContent).not.toContain("Real goal beta");
  });
  it("secrets and private topics are refused before the sheet opens", async () => {
    setup(); const t = fakeTransport(okChat()); aiWiring.transport = t;
    await ask("my pin 123456 and password: abc12345678", false); expect(document.querySelector("[data-ai-sheet]")).toBeNull(); expect(q("[data-ai-refusal]").textContent).toMatch(/Not sent/);
    await ask("explain my prayer log", false); expect(document.querySelector("[data-ai-sheet]")).toBeNull(); expect(t.calls).toHaveLength(0);
  });
  it("kill switch and the shipped transport: nothing is sent", async () => {
    setup(); expect(aiWiring.transport).toBe(blockedTransport);
    await ask("hello there", false); q<HTMLButtonElement>("[data-ai-send]").click(); await settle(); render();
    expect(q("[data-ai-refusal]").textContent).toMatch(/Blocked/);
    setKill(consentKv, true); await ask("hello there", false); expect(document.querySelector("[data-ai-sheet]")).toBeNull(); expect(q("[data-ai-refusal]").textContent).toMatch(/kill switch/);
  });
});

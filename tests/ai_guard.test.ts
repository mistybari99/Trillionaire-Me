// W1: the single gate. Order: master, kill, key, consent, cap, secrets, real data. Nothing reaches the transport unless all pass.
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryKV } from "../src/core/store";
import { VaultSession } from "../src/core/dataVault";
import { grantApproval, setEnabled } from "../src/core/connections";
import { RequestConsent, checkGuard, saveConf, sendThroughGuard, setKill, type GuardDeps } from "../src/core/aiGuard";
import { saveAiKey } from "../src/core/aiKey";
import { readUsage, saveCap, savePrice, usageView, recordUsage } from "../src/core/aiUsage";
import type { AssistantRequest } from "../src/core/assistant";
import { chatCompletions } from "../src/adapters/ai/chatCompletions";
import { messagesStyle } from "../src/adapters/ai/messagesStyle";
import { blockedTransport } from "../src/adapters/ai/transport";
import { fakeTransport, okChat } from "../src/adapters/ai/fakeProvider";

const mk = (text: string, real = false): AssistantRequest => ({ purpose: "explain", includeRealData: real, messages: [{ role: "user", content: text }] });
let kv: MemoryKV, consent: RequestConsent, session: VaultSession;
const deps = (t = fakeTransport(okChat("fine"))): GuardDeps & { transport: ReturnType<typeof fakeTransport> } => ({ kv, vault: session, transport: t, providers: { chat: chatCompletions, messages: messagesStyle }, consent });
async function ready() {
  grantApproval(kv, "aiAssistant", "2026-11-08T00:00:00Z"); setEnabled(kv, "aiAssistant", true);
  await saveAiKey(kv, session, "KEY-SENTINEL-9999"); saveConf(kv, { style: "chat", host: "api.example.com", path: "", model: "m1", headers: {} }); saveCap(kv, "calls", 2);
}
beforeEach(() => { kv = new MemoryKV(); consent = new RequestConsent(); session = new VaultSession(kv); });

describe("gate order", () => {
  it("everything off by default: the first refusal is off and the transport is never called", async () => {
    const d = deps(); consent.tick(true, false);
    const r = await sendThroughGuard(d, mk("hello"));
    expect(r).toMatchObject({ ok: false, code: "off" }); expect(d.transport.calls).toHaveLength(0);
  });
  it("walks the order: off, kill, no key, config, consent, cap, secret, private topic, real data", async () => {
    const d = deps(); const seen: string[] = []; const go = async (text = "hello", tick: [boolean, boolean] = [true, false], real = false) => { consent.tick(tick[0], tick[1]); const r = await sendThroughGuard(d, mk(text, real)); if (!r.ok) seen.push(r.code); else seen.push("ok"); };
    await go();                                                                                   // off
    grantApproval(kv, "aiAssistant", "t"); setEnabled(kv, "aiAssistant", true); setKill(kv, true); await go();   // kill
    setKill(kv, false); await go();                                                              // no key
    await saveAiKey(kv, session, "KEY-SENTINEL-9999"); await go();                                // config
    saveConf(kv, { style: "chat", host: "api.example.com", path: "", model: "m1", headers: {} }); await go("hello", [false, false]);   // no consent
    await go("hello", [true, false]);                                                            // cap not typed
    saveCap(kv, "calls", 1); await go("my password: hunter22222");                                // secret
    await go("my prayer times");                                                                  // private topic
    await go("plain", [true, false], true);                                                       // real data not ticked
    expect(seen).toEqual(["off", "kill", "no_key", "config", "no_consent", "cap", "secret", "never", "real"]);
    expect(d.transport.calls).toHaveLength(0);
  });
  it("sends when every check passes, and records the request and tokens", async () => {
    await ready(); const d = deps(); consent.tick(true, false);
    const r = await sendThroughGuard(d, mk("What is a budget?"));
    expect(r).toMatchObject({ ok: true, value: { text: "fine" } }); expect(d.transport.calls).toHaveLength(1);
    expect(readUsage(kv)).toMatchObject({ calls: 1, inputTokens: 10, outputTokens: 5 });
  });
  it("real data goes only when ticked for this request, and the tick is cleared after every call", async () => {
    await ready(); const d = deps();
    consent.tick(true, true); expect((await sendThroughGuard(d, mk("with real", true))).ok).toBe(true);
    consent.tick(true, false); const second = await sendThroughGuard(d, mk("with real again", true));
    expect(second).toMatchObject({ ok: false, code: "real" });
    // the confirm tick is cleared too: a call without ticking again is refused
    expect(await sendThroughGuard(d, mk("no tick"))).toMatchObject({ ok: false, code: "no_consent" });
    const flagged: AssistantRequest = { purpose: "explain", includeRealData: false, messages: [{ role: "user", content: "items", fromRealData: true }] };
    consent.tick(true, false); expect(await sendThroughGuard(d, flagged)).toMatchObject({ ok: false, code: "real" });
  });
});

describe("spend limit and unknown", () => {
  it("refuses at the request-count limit", async () => {
    await ready(); const d = deps();
    for (let i = 0; i < 2; i++) { consent.tick(true, false); expect((await sendThroughGuard(d, mk(`q${i}`))).ok).toBe(true); }
    consent.tick(true, false); expect(await sendThroughGuard(d, mk("q3"))).toMatchObject({ ok: false, code: "cap" }); expect(d.transport.calls).toHaveLength(2);
  });
  it("no price: cost is Unknown (null), never 0; an amount limit needs a price", () => {
    expect(usageView(kv).spend).toBeNull(); expect(saveCap(kv, "amount", 5)).toBe("needs_price");
    recordUsage(kv, { inputTokens: 100, outputTokens: 50 }); expect(usageView(kv).spend).toBeNull();
    expect(savePrice(kv, 0.5, 1, "USD")).toBe("ok"); expect(usageView(kv).spend).toBeCloseTo(0.1, 6);
    recordUsage(kv, { inputTokens: null, outputTokens: null }); expect(usageView(kv).spend).toBeNull(); expect(usageView(kv).inputTokens).toBeNull();
  });
  it("an amount limit refuses at the amount and when the spend cannot be known", async () => {
    await ready(); savePrice(kv, 1, 1, "USD"); saveCap(kv, "amount", 0.02);
    const d = deps(fakeTransport(okChat("a", { prompt_tokens: 10000, completion_tokens: 10000 }))); consent.tick(true, false);
    expect((await sendThroughGuard(d, mk("q"))).ok).toBe(true);
    consent.tick(true, false); expect(await sendThroughGuard(d, mk("q"))).toMatchObject({ ok: false, code: "cap" });
    const d2 = deps(fakeTransport(okChat("a", null))); kv.remove("tm:ui:ai:usage"); consent.tick(true, false);
    expect((await sendThroughGuard(d2, mk("q"))).ok).toBe(true);
    consent.tick(true, false); expect(await sendThroughGuard(d2, mk("q"))).toMatchObject({ ok: false, code: "cap" });
  });
});

describe("kill switch and the shipped transport", () => {
  it("kill switch stops a ready setup at once", async () => {
    await ready(); setKill(kv, true); const d = deps(); consent.tick(true, false);
    expect(await sendThroughGuard(d, mk("hello"))).toMatchObject({ ok: false, code: "kill" }); expect(d.transport.calls).toHaveLength(0);
  });
  it("with the shipped blocked transport a fully ready setup still sends nothing and says blocked", async () => {
    await ready(); const d = { ...deps(), transport: blockedTransport }; consent.tick(true, false);
    const r = await sendThroughGuard(d, mk("hello")); expect(r).toMatchObject({ ok: false, code: "blocked" });
    expect(readUsage(kv).calls).toBe(0);
  });
  it("refusals and errors never contain the key", async () => {
    await ready(); const t = fakeTransport({ status: 500, body: "KEY-SENTINEL-9999" }); const d = deps(t); consent.tick(true, false);
    const r = await sendThroughGuard(d, mk("hello")); expect(JSON.stringify(r)).not.toContain("KEY-SENTINEL-9999");
    expect(checkGuard(kv, mk("x"), { confirmed: true, realData: false }, { ok: true, key: "KEY-SENTINEL-9999" })).toBeNull();
  });
});

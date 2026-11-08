// W1: the two request styles, the blocked shipped transport and the fake provider. No network: every transport is a mock.
import { describe, expect, it } from "vitest";
import { AssistantError, sendRaw, type AssistantRequest, type ProviderCredentials } from "../src/core/assistant";
import { chatCompletions } from "../src/adapters/ai/chatCompletions";
import { messagesStyle } from "../src/adapters/ai/messagesStyle";
import { blockedTransport } from "../src/adapters/ai/transport";
import { fakeTransport, okChat, okMessages } from "../src/adapters/ai/fakeProvider";
import { read } from "./helpers";

const creds: ProviderCredentials = { apiKey: "KEY-SENTINEL-9999", host: "api.example.com", model: "m-typed-by-owner" };
const req: AssistantRequest = { purpose: "explain", includeRealData: false, messages: [{ role: "system", content: "Be brief." }, { role: "user", content: "What is a budget?" }] };

describe("chat completions style", () => {
  it("builds host, path, headers and body from what the owner typed", () => {
    const s = chatCompletions.buildRequest(req, creds);
    expect(s.host).toBe("api.example.com"); expect(s.path).toBe("/v1/chat/completions");
    expect(s.headers.authorization).toBe("Bearer KEY-SENTINEL-9999");
    const b = JSON.parse(s.body); expect(b.model).toBe("m-typed-by-owner"); expect(b.messages).toEqual([{ role: "system", content: "Be brief." }, { role: "user", content: "What is a budget?" }]);
  });
  it("reads text and tokens; missing tokens are null, not 0", () => {
    expect(chatCompletions.parseResponse(okChat("hi", { prompt_tokens: 3, completion_tokens: 4 }))).toEqual({ text: "hi", usage: { inputTokens: 3, outputTokens: 4 } });
    expect(chatCompletions.parseResponse(okChat("hi", null)).usage).toEqual({ inputTokens: null, outputTokens: null });
    expect(() => chatCompletions.parseResponse({ status: 200, body: "{}" })).toThrow();
  });
});

describe("messages style", () => {
  it("puts system text apart, uses the key header and an owner path", () => {
    const s = messagesStyle.buildRequest(req, { ...creds, path: "/custom/path", extraHeaders: { "X-Version": "1" } });
    expect(s.path).toBe("/custom/path"); expect(s.headers["x-api-key"]).toBe("KEY-SENTINEL-9999"); expect(s.headers["X-Version"]).toBe("1");
    const b = JSON.parse(s.body); expect(b.system).toBe("Be brief."); expect(b.messages).toEqual([{ role: "user", content: "What is a budget?" }]); expect(typeof b.max_tokens).toBe("number");
  });
  it("reads content blocks and tokens", () => {
    expect(messagesStyle.parseResponse(okMessages("yo", { input_tokens: 1, output_tokens: 2 }))).toEqual({ text: "yo", usage: { inputTokens: 1, outputTokens: 2 } });
    expect(messagesStyle.parseResponse(okMessages("yo", null)).usage).toEqual({ inputTokens: null, outputTokens: null });
  });
});

describe("sendRaw: shape, error, timeout", () => {
  it("hands the built request to the transport and returns the answer", async () => {
    const t = fakeTransport(okChat("answer"));
    const r = await sendRaw(chatCompletions, creds, req, t);
    expect(r).toMatchObject({ ok: true, value: { text: "answer" } }); expect(t.calls).toHaveLength(1); expect(t.calls[0]!.host).toBe("api.example.com");
  });
  it("a refused status, an unreadable answer and a thrown error become plain results without the key", async () => {
    for (const [tr, code] of [[fakeTransport({ status: 401, body: `denied ${creds.apiKey}` }), "http"], [fakeTransport({ status: 200, body: "not json" }), "parse"],
      [fakeTransport(() => { throw new Error(`boom ${creds.apiKey}`); }), "blocked"]] as const) {
      const r = await sendRaw(chatCompletions, creds, req, tr);
      expect(r.ok).toBe(false); if (!r.ok) { expect(r.code).toBe(code); expect(JSON.stringify(r)).not.toContain("KEY-SENTINEL-9999"); }
    }
  });
  it("stops waiting after the timeout", async () => {
    const r = await sendRaw(chatCompletions, creds, req, () => new Promise(() => { /* never answers */ }), 20);
    expect(r).toMatchObject({ ok: false, code: "timeout" });
  });
});

describe("shipped transport", () => {
  it("always refuses with code blocked and never touches fetch", async () => {
    await expect(blockedTransport({ host: "api.example.com", path: "/", headers: {}, body: "" })).rejects.toBeInstanceOf(AssistantError);
    const r = await sendRaw(chatCompletions, creds, req, blockedTransport);
    expect(r).toMatchObject({ ok: false, code: "blocked" });
  });
  it("adapter files hold no network call, no vendor name and no price", () => {
    for (const f of ["src/adapters/ai/chatCompletions.ts", "src/adapters/ai/messagesStyle.ts", "src/adapters/ai/transport.ts", "src/adapters/ai/fakeProvider.ts", "src/core/assistant.ts"]) {
      const s = read(f).replace(/\/\/.*$/gm, "");
      expect(/\bfetch\b|XMLHttpRequest|WebSocket|sendBeacon|https?:\/\//.test(s), f).toBe(false);
      expect(/openai|anthropic|claude|gemini|gpt-|sdk/i.test(s), f).toBe(false);
    }
  });
});

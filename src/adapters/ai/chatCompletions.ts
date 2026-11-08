// Provider adapter, "chat completions" request style. Neutral: no vendor name, no SDK, no default model, no price.
// Pure: builds the request and reads the answer. The network is the injected Transport.
import type { AssistantProvider, AssistantRequest, AssistantResponse, HttpRequestSpec, ProviderCredentials, TransportResult } from "../../core/assistant";

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);

export const chatCompletions: AssistantProvider = {
  id: "chat",
  buildRequest(req: AssistantRequest, c: ProviderCredentials): HttpRequestSpec {
    const body: Record<string, unknown> = { model: c.model, messages: req.messages.map((m) => ({ role: m.role, content: m.content })) };
    if (c.maxTokens) body.max_tokens = c.maxTokens;
    return { host: c.host, path: c.path || "/v1/chat/completions", headers: { ...(c.extraHeaders ?? {}), "content-type": "application/json", authorization: `Bearer ${c.apiKey}` }, body: JSON.stringify(body) };
  },
  parseResponse(raw: TransportResult): AssistantResponse {
    const j = JSON.parse(raw.body) as { choices?: { message?: { content?: unknown } }[]; usage?: { prompt_tokens?: unknown; completion_tokens?: unknown } };
    const text = j.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) throw new Error("no text");
    return { text, usage: { inputTokens: num(j.usage?.prompt_tokens), outputTokens: num(j.usage?.completion_tokens) } };
  },
};

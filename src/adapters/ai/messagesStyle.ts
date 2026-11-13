// Provider adapter, "messages" request style (system text apart, content blocks in the answer). Neutral: no vendor name, no SDK, no default model, no price.
// Header names a provider needs (for example a version header) are typed by the owner as extra headers.
import type { AssistantProvider, AssistantRequest, AssistantResponse, HttpRequestSpec, ProviderCredentials, TransportResult } from "../../core/assistant";

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
/** This style needs an upper limit on the answer length. The owner can type one; otherwise this plain size is used. */
export const MESSAGES_STYLE_MAX_TOKENS = 1024;

export const messagesStyle: AssistantProvider = {
  id: "messages",
  buildRequest(req: AssistantRequest, c: ProviderCredentials): HttpRequestSpec {
    const system = req.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const body: Record<string, unknown> = { model: c.model, max_tokens: c.maxTokens ?? MESSAGES_STYLE_MAX_TOKENS, messages: req.messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content })) };
    if (system) body.system = system;
    return { host: c.host, path: c.path || "/v1/messages", headers: { ...(c.extraHeaders ?? {}), "content-type": "application/json", "x-api-key": c.apiKey }, body: JSON.stringify(body) };
  },
  parseResponse(raw: TransportResult): AssistantResponse {
    const j = JSON.parse(raw.body) as { content?: { type?: string; text?: unknown }[]; usage?: { input_tokens?: unknown; output_tokens?: unknown } };
    const text = (j.content ?? []).filter((b) => b.type === "text" && typeof b.text === "string").map((b) => b.text as string).join("");
    if (!text.trim()) throw new Error("no text");
    return { text, usage: { inputTokens: num(j.usage?.input_tokens), outputTokens: num(j.usage?.output_tokens) } };
  },
};

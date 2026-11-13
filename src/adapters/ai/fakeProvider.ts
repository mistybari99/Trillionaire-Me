// Test helpers: a transport that records what it was given and answers from a script. Used only by tests; never wired into the app.
import type { HttpRequestSpec, Transport, TransportResult } from "../../core/assistant";

export interface FakeTransport extends Transport { calls: HttpRequestSpec[] }
export function fakeTransport(answer: TransportResult | ((spec: HttpRequestSpec) => TransportResult | Promise<TransportResult>)): FakeTransport {
  const calls: HttpRequestSpec[] = [];
  const f = (async (spec: HttpRequestSpec) => { calls.push(spec); return typeof answer === "function" ? answer(spec) : answer; }) as FakeTransport;
  f.calls = calls; return f;
}
export const okChat = (text = "ok", usage: { prompt_tokens?: number; completion_tokens?: number } | null = { prompt_tokens: 10, completion_tokens: 5 }): TransportResult =>
  ({ status: 200, body: JSON.stringify({ choices: [{ message: { content: text } }], ...(usage ? { usage } : {}) }) });
export const okMessages = (text = "ok", usage: { input_tokens?: number; output_tokens?: number } | null = { input_tokens: 10, output_tokens: 5 }): TransportResult =>
  ({ status: 200, body: JSON.stringify({ content: [{ type: "text", text }], ...(usage ? { usage } : {}) }) });

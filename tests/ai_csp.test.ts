// W1: the content security policy is unchanged. No AI provider host is allowed; connecting needs the owner steps in docs/design/ai-connect.md.
import { describe, expect, it } from "vitest";
import { read } from "./helpers";

const dirs = (p: string) => Object.fromEntries(p.split(";").map((x) => x.trim().split(/\s+/)).filter((x) => x[0]).map((x) => [x[0]!, x.slice(1)]));
describe("connect-src allow-list", () => {
  const meta = dirs(read("index.html").match(/Content-Security-Policy" content="([^"]+)"/)![1]!);
  const hdr = dirs(read("public/_headers").match(/Content-Security-Policy: ([^\n]+)/)![1]!);
  it("is exactly the app itself, two Wikipedia hosts and the prayer-time host", () => {
    const want = ["'self'", "https://en.wikipedia.org", "https://bn.wikipedia.org", "https://api.aladhan.com"];
    expect(meta["connect-src"]).toEqual(want); expect(hdr["connect-src"]).toEqual(want);
  });
  it("names no AI or search provider and no wildcard", () => {
    const all = JSON.stringify([meta, hdr]);
    expect(all).not.toMatch(/openai|anthropic|google|googleapis|gemini|mistral|cohere|\*/i);
  });
  it("the guide says what the owner must do to connect", () => {
    const doc = read("docs/design/ai-connect.md");
    for (const w of ["connect-src", "proxy", "key", "kill switch", "limit", "owner"]) expect(doc.toLowerCase()).toContain(w.toLowerCase());
  });
});

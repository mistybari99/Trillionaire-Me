// W1: Google cards through an owner-run proxy on the app's own address. Hidden and refusing when off; Wikipedia stays first; no call without a click.
import { describe, expect, it, vi } from "vitest";
import { MemoryKV } from "../src/core/store";
import { grantApproval, setEnabled } from "../src/core/connections";
import { googleSearch, googleSearchFor, isProxyBase, saveSearchBase } from "../src/adapters/googleSearch";
import { setKill } from "../src/core/aiGuard";
import { research } from "../src/core/research";

const items = (n: number) => ({ items: Array.from({ length: n }, (_, i) => ({ title: `T${i}`, snippet: `S${i}`, link: `https://example.org/${i}` })) });
const doer = (body: unknown, ok = true) => vi.fn(async () => ({ ok, json: async () => body }));
function on(kv: MemoryKV) { grantApproval(kv, "webSearch", "2026-11-08T00:00:00Z"); setEnabled(kv, "webSearch", true); }

describe("proxy base", () => {
  it("is empty by default and only a same-app path is accepted", () => {
    const kv = new MemoryKV(); expect(googleSearchFor(kv)).toBeNull();
    for (const bad of ["https://evil.example/x", "//evil.example", "api/search", "/a b", "/a//b", "/"]) { expect(isProxyBase(bad), bad).toBe(false); expect(saveSearchBase(kv, bad)).toBe("bad"); }
    expect(saveSearchBase(kv, "/api/search")).toBe("ok"); expect(saveSearchBase(kv, "")).toBe("ok");
  });
});

describe("hidden and refusing when off", () => {
  it("needs Web search on, a typed path and the kill switch off", () => {
    const kv = new MemoryKV(); saveSearchBase(kv, "/api/search"); expect(googleSearchFor(kv)).toBeNull();
    on(kv); expect(googleSearchFor(kv)).not.toBeNull();
    setKill(kv, true); expect(googleSearchFor(kv)).toBeNull();
  });
  it("a provider with a bad base refuses and asks nothing", async () => {
    const d = doer(items(3)); await expect(googleSearch("https://evil.example", d).search("q")).rejects.toThrow(); expect(d).not.toHaveBeenCalled();
  });
});

describe("cards", () => {
  it("asks only the app's own path and maps results to cards with the source Google", async () => {
    const d = doer(items(3)); const r = await research("budget", true, { provider: googleSearch("/api/search", d), online: () => true });
    expect(d).toHaveBeenCalledTimes(1); expect((d.mock.calls[0] as unknown[])[0]).toBe("/api/search?q=budget");
    expect(r.status).toBe("options"); expect(r.options.map((o) => o.sourceName)).toEqual(["Google", "Google", "Google"]);
  });
  it("fewer than 2 results show none", async () => {
    const r = await research("budget", true, { provider: googleSearch("/api/search", doer(items(1))), online: () => true });
    expect(r).toMatchObject({ status: "too_few", options: [] });
  });
  it("no call without a click", async () => {
    const d = doer(items(3)); await expect(research("budget", false, { provider: googleSearch("/api/search", d), online: () => true })).rejects.toThrow(); expect(d).not.toHaveBeenCalled();
  });
  it("links that are not web addresses are dropped", async () => {
    const d = doer({ items: [{ title: "A", snippet: "", link: "javascript:alert(1)" }, { title: "B", snippet: "", link: "https://example.org/b" }] });
    expect(await googleSearch("/api/search", d).search("q")).toHaveLength(1);
  });
});

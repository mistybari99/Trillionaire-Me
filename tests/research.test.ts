import { describe, expect, it, vi } from "vitest";
import { research, safeQuery, type SearchProvider } from "../src/core/research";

const mk = (n: number): SearchProvider => ({ name: "fake", search: vi.fn(async () => Array.from({ length: n }, (_, i) => ({ title: `T${i}`, snippet: "s", sourceName: "Src", sourceUrl: `https://example.org/${i}` }))) });
const online = () => true;

describe("TM-REQ-146 research contract (G4 groundwork)", () => {
  it("makes 0 provider calls without a click", async () => {
    const p = mk(3); await expect(research("x", false, { provider: p, online })).rejects.toThrow();
    expect(p.search).not.toHaveBeenCalled();
  });
  it("returns at most 3 options, each with source + date, plus own-option", async () => {
    const r = await research("x", true, { provider: mk(8), online, now: () => new Date("2026-10-23T00:00:00Z") });
    expect(r.status).toBe("options"); expect(r.options).toHaveLength(3); expect(r.allowOwn).toBe(true);
    for (const o of r.options) { expect(o.sourceName).toBeTruthy(); expect(o.sourceUrl).toMatch(/^https:/); expect(o.fetchedAt).toBe("2026-10-23T00:00:00.000Z"); }
  });
  it("fewer than 2 results → no options are invented", async () => {
    for (const n of [0, 1]) { const r = await research("x", true, { provider: mk(n), online }); expect(r.status).toBe("too_few"); expect(r.options).toEqual([]); }
  });
  it("offline → no network call, falls back to cached list", async () => {
    const p = mk(3); const cached = [{ id: "c1", title: "Saved", snippet: "", sourceName: "S", sourceUrl: "https://e.org", fetchedAt: "2026-01-01T00:00:00Z" }];
    const r = await research("x", true, { provider: p, online: () => false, cached: () => cached });
    expect(r.status).toBe("offline"); expect(r.options).toEqual(cached); expect(p.search).not.toHaveBeenCalled();
  });
  it("provider failure never blocks the user: error + own option", async () => {
    const p: SearchProvider = { name: "bad", search: async () => { throw new Error("boom"); } };
    const r = await research("x", true, { provider: p, online }); expect(r.status).toBe("error"); expect(r.allowOwn).toBe(true);
  });
  it("secret-looking queries never leave the device", () => {
    expect(safeQuery("password: abc123")).toBeNull(); expect(safeQuery("  best bookkeeping course ")).toBe("best bookkeeping course");
  });
});

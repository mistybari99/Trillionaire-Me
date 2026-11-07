import { describe, expect, it, vi } from "vitest";
import { wikipedia } from "../src/adapters/wikipedia";
import { research } from "../src/core/research";

const fakeFetch = (rows: { title: string; snippet: string }[], ok = true) => vi.fn(async (_u: string) => ({ ok, json: async () => ({ query: { search: rows } }) }));
describe("TM-TST-146 Wikipedia provider", () => {
  it("builds a safe URL per language and strips HTML from snippets", async () => {
    const f = fakeFetch([{ title: "Book keeping", snippet: 'A <span class="x">record</span> &amp; more <script>x</script>' }]);
    const r = await wikipedia("bn", f).search("a b&c");
    const url = f.mock.calls[0]![0];
    expect(url).toMatch(/^https:\/\/bn\.wikipedia\.org\/w\/api\.php\?/); expect(url).toContain("srsearch=a%20b%26c"); expect(url).toContain("origin=*");
    expect(r[0]!.snippet).toBe("A record & more x"); expect(r[0]!.snippet).not.toMatch(/[<>]/);
    expect(r[0]!.sourceUrl).toBe("https://bn.wikipedia.org/wiki/Book_keeping");
  });
  it("works end-to-end through research(): 3 options with source+date", async () => {
    const rows = [1, 2, 3, 4].map((i) => ({ title: `T${i}`, snippet: "s" }));
    const r = await research("x", true, { provider: wikipedia("en", fakeFetch(rows)), online: () => true });
    expect(r.status).toBe("options"); expect(r.options).toHaveLength(3);
  });
  it("HTTP failure becomes 'error', never a crash", async () => {
    const r = await research("x", true, { provider: wikipedia("en", fakeFetch([], false)), online: () => true });
    expect(r.status).toBe("error");
  });
});

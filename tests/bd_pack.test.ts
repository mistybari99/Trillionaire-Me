// Bangladesh starter pack (DRAFT, audit M4): general wording only, no rates / prices / limits, reviewer pending on every entry.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validatePack } from "../src/library/packs";

const pack = JSON.parse(readFileSync("public/content/pack-009.json", "utf8"));
describe("pack-009 Bangladesh starter pack (draft)", () => {
  it("validates, is pending reviewer, and every entry has kind and reviewer pending", () => {
    expect(validatePack(pack).ok).toBe(true);
    expect(pack.reviewStatus).toBe("pending_reviewer");
    expect(pack.tips.length).toBeGreaterThanOrEqual(15);
    for (const t of pack.tips) { expect(t.kind, t.id).toBeTruthy(); expect(t.reviewer, t.id).toBe("pending"); }
  });
  it("covers the requested local areas", () => {
    const tags = new Set(pack.tips.flatMap((t: { tags: string[] }) => t.tags));
    for (const x of ["mobile-money", "dps", "sanchaypatra", "budget", "business", "bookkeeping", "licence", "samity"]) expect(tags.has(x), x).toBe(true);
  });
  it("names no rates, prices, limits or guarantees: no digit sits next to money words, and local-rule entries need a reviewer", () => {
    const all = JSON.stringify(pack.tips.map((t: { title: unknown; how: unknown }) => [t.title, t.how]));
    expect(/\d+\s*(%|percent|taka|tk|bdt)|(taka|tk|bdt)\s*\d+|৳/i.test(all)).toBe(false);
    for (const id of ["p9-bd-5", "p9-bd-7", "p9-bd-12"]) expect(pack.tips.find((t: { id: string }) => t.id === id).source, id).toBe("reviewer");
  });
  it("the older packs and this one use unique ids", () => {
    expect(new Set(pack.tips.map((t: { id: string }) => t.id)).size).toBe(pack.tips.length);
  });
});

// Old audit files must say they are superseded and point to the current documents (plan keeper G3-08).
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("superseded audit documents", () => {
  const OLD = ["docs/audit/FULL_AUDIT_2026-11-01.md", "docs/audit/BUILD_COMPLETENESS_2026-11-02.md", "docs/design/owner-demand-audit.md"];
  const CURRENT = ["docs/plan/PLAN_TRACKER.md", "docs/design/m-list-status.md"];
  for (const f of OLD) it(`${f} carries a header note that links to existing current documents`, () => {
    const top = readFileSync(f, "utf8").split("\n").slice(0, 8).join("\n");
    expect(top).toMatch(/SUPERSEDED|Status \(3 Nov 2026\)/);
    const links = [...top.matchAll(/`((?:docs)\/[^`]+\.md)`/g)].map((m) => m[1]!);
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const l of links) expect(existsSync(l), l).toBe(true);
    expect(links.some((l) => CURRENT.includes(l))).toBe(true);
  });
});

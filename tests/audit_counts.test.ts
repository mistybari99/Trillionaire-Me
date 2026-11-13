// The owner-demand audit summary must match its own table (re-run 3 Nov 2026).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("owner-demand audit counts", () => {
  const rows = readFileSync("docs/design/owner-demand-audit.md", "utf8").split("\n").filter((l) => l.startsWith("|")).map((l) => l.split("|").map((x) => x.trim())).filter((c) => ["DONE", "PARTIAL", "MISSING"].includes(c[3] ?? ""));
  const count = (s: string) => rows.filter((c) => c[3] === s).length;
  it("the table has 132 rows and the summary page states the same counts", () => {
    expect(rows.length).toBe(132);
    const page = readFileSync("docs/audit/OWNER_DEMAND_AUDIT_2026-11-03.md", "utf8");
    for (const s of ["DONE", "PARTIAL", "MISSING"]) expect(page).toMatch(new RegExp(`\\| ${s} \\|[^\\n]*\\| ${count(s)} \\|\\s*$`, "m"));
    expect(page).toContain(`DONE ${count("DONE")}, PARTIAL ${count("PARTIAL")}, MISSING ${count("MISSING")}`.replace(/.*/, "132 rows"));
    expect(readFileSync("docs/design/owner-demand-audit.md", "utf8")).toContain(`DONE ${count("DONE")}, PARTIAL ${count("PARTIAL")}, MISSING ${count("MISSING")} (132 rows)`);
    const pct = Math.round(((count("DONE") + count("PARTIAL") / 2) / 132) * 100); expect(page).toContain(`3 Nov ${pct} percent`);
  });
});

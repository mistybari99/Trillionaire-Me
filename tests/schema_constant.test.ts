// Multi-goal build step 1: record writers use SCHEMA_VERSION, never a number, so a version bump needs no hunt through the source.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = `${d}/${f}`; return statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") ? [p] : []; });
describe("no numeric record schemaVersion in src", () => {
  it("only the migration table writes a literal version", () => {
    const bad = walk("src").filter((f) => !f.endsWith("core/migrate.ts")).filter((f) => /schemaVersion:\s*\d/.test(readFileSync(f, "utf8")));
    expect(bad).toEqual([]);
  });
});

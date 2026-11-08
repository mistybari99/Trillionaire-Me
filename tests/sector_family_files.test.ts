// BUILD-02: the check every family data file must pass (writer agents run this before handing in).
import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { getFamily, validateFamily } from "../src/core/sectors";
import type { SectorFamily } from "../src/core/sectors";

const dir = "src/core/sectors/families";
const files = readdirSync(dir).filter((f) => f.endsWith(".ts")).sort();

describe("family data files", () => {
  for (const file of files) {
    it(`${file}: one valid SectorFamily export, id = file name, registered`, async () => {
      const mod = (await import(`../src/core/sectors/families/${file}`)) as Record<string, SectorFamily>;
      const fams = Object.values(mod);
      expect(fams.length, "exactly one export per file").toBe(1);
      const fam = fams[0] as SectorFamily;
      expect(fam.id).toBe(file.replace(/\.ts$/, ""));
      expect(validateFamily(fam)).toEqual([]);
      expect(getFamily(fam.id), "add the import and one line to ALL_FAMILIES in src/core/sectors/index.ts").toBe(fam);
    });
  }
});

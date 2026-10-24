import { describe, expect, it } from "vitest";
import { CATEGORIES, EVIDENCE_LEVELS } from "../src/library/categories";
import { MODULES } from "../src/modules/capability";
import { LOCALES } from "../src/i18n/registry";

describe("Life Success library skeleton", () => {
  it("20 owner categories + Deen, unique ids, bilingual names", () => {
    expect(CATEGORIES.length).toBe(21); expect(new Set(CATEGORIES.map((c) => c.id)).size).toBe(21);
    for (const c of CATEGORIES) { expect(LOCALES.bn.scripts.test(c.name.bn)).toBe(true); expect(c.name.en.length).toBeGreaterThan(3); }
  });
  it("Deen is present, private-worship flagged, and lives under the Deen tab", () => {
    const d = CATEGORIES.find((c) => c.id === "deen")!; expect(d.sensitive).toBe("worship"); expect(d.tab).toBe("deen");
  });
  it("every category is wired to existing modules (or the planned M25) and a navigation tab", () => {
    const known = new Set([...MODULES.map((m) => m.id), "M25"]);
    for (const c of CATEGORIES) { expect(c.modules.length).toBeGreaterThan(0); for (const m of c.modules) expect(known.has(m), `${c.id}:${m}`).toBe(true); }
  });
  it("health and mental-health categories are flagged so the UI adds safety notes", () => {
    expect(CATEGORIES.find((c) => c.id === "emotions")!.sensitive).toBe("mental_health");
    expect(CATEGORIES.find((c) => c.id === "health-energy")!.sensitive).toBe("health");
  });
  it("evidence levels include an explicit 'unverified' so nothing is passed off as proven", () => { expect(EVIDENCE_LEVELS).toContain("unverified"); });
});

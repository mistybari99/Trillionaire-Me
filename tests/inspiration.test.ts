import { describe, it, expect } from "vitest";
import { INSPIRATIONS, todaysInspiration, dayIndex } from "../src/library/inspiration";

describe("daily inspiration board (batch 7 owner request)", () => {
  it("every card has Bangla and English text", () => {
    for (const c of INSPIRATIONS) { expect(c.bn.length).toBeGreaterThan(0); expect(c.en.length).toBeGreaterThan(0); }
  });
  it("same day gives the same card; next day changes", () => {
    const d = new Date(2026, 9, 24, 8); const later = new Date(2026, 9, 24, 22);
    expect(todaysInspiration(d)).toEqual(todaysInspiration(later));
    expect(dayIndex(new Date(2026, 9, 25))).toBe(dayIndex(d) + 1);
    expect(todaysInspiration(new Date(2026, 9, 25))).not.toEqual(todaysInspiration(d));
  });
  it("copy avoids streak / shame words", () => {
    const text = INSPIRATIONS.map((c) => c.bn + c.en).join(" ").toLowerCase();
    expect(text).not.toMatch(/streak|fail|broken|lost|shame|score|rank/);
  });
});

import { THEME_LABEL } from "../src/library/inspiration";
describe("inspiration theme labels", () => {
  it("every theme has a Bangla and English label", () => {
    for (const k of Object.keys(THEME_LABEL) as (keyof typeof THEME_LABEL)[]) {
      expect(THEME_LABEL[k].bn.length).toBeGreaterThan(0);
      expect(THEME_LABEL[k].en.length).toBeGreaterThan(0);
    }
  });
});

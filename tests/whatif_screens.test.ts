// Screen evidence for the Live Calculator / What-if (LIVECALC-01). Report written by
// `TM_SHOT_WHATIF=1 TM_SHOT_MATRIX=1 TM_SHOT_ONLY_DESIGN=light-futuristic TM_SHOT_LANGS=en,bn,mix TM_SHOT_ROUTES=whatif,whatif/r-pages,whatif/m-fdr,whatif/h-gap,whatif/d-zakat,diary/money TM_SHOT_OUT=evidence/whatif-screens-2026-11-13.json node tools/screenshots.mjs`
// (diary/money is measured with the What-if sheet open). Fails if the report is incomplete or shows any problem
// (overflow, element wider than the screen, tap target under 44 px, touching targets).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const report = JSON.parse(readFileSync("evidence/whatif-screens-2026-11-13.json", "utf8")) as { viewport: string; combos: number; screens: number; problems: number; bad: unknown[]; routes?: string[] };
describe("evidence/whatif-screens-2026-11-13.json", () => {
  it("covers the index, four calculators (reading, FDR, habits, Deen) and the open sheet in English, Bangla and Mix, light and dark, 100 and 200 percent text at 360 px", () => {
    expect(report.viewport).toBe("360x740");
    for (const r of ["whatif", "whatif/r-pages", "whatif/m-fdr", "whatif/h-gap", "whatif/d-zakat", "diary/money"]) expect(report.routes).toContain(r);
    expect(report.combos).toBe(12);
    expect(report.screens).toBe((report.routes ?? []).length * 12);
  });
  it("shows no problem", () => { expect(report.bad).toEqual([]); expect(report.problems).toBe(0); });
});

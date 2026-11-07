// Screen evidence for the optional work time blocks (BUILD-01). Report written by
// `TM_SHOT_WORKBLOCKS=1 TM_SHOT_MATRIX=1 TM_SHOT_ONLY_DESIGN=light-futuristic TM_SHOT_LANGS=en,bn,mix TM_SHOT_ROUTES=diary/plan,today TM_SHOT_OUT=evidence/work-blocks-screens-2026-11-07.json node tools/screenshots.mjs`
// (the feature switched on and two overlapping DEMO blocks seeded for today). Fails if the report is incomplete or shows any problem.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const report = JSON.parse(readFileSync("evidence/work-blocks-screens-2026-11-07.json", "utf8")) as { viewport: string; combos: number; screens: number; problems: number; bad: unknown[]; routes?: string[] };
describe("evidence/work-blocks-screens-2026-11-07.json", () => {
  it("covers Plan and Today in English, Bangla and Mix, light and dark, 100 and 200 percent text at 360 px", () => {
    expect(report.viewport).toBe("360x740");
    for (const r of ["diary/plan", "today"]) expect(report.routes).toContain(r);
    expect(report.combos).toBe(12);
    expect(report.screens).toBe((report.routes ?? []).length * 12);
  });
  it("shows no problem", () => { expect(report.bad).toEqual([]); expect(report.problems).toBe(0); });
});

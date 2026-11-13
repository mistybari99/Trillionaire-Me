// Screen evidence for the business type panel (BUILD-02 phase C). Report written by
// `TM_SHOT_SECTOR=1 TM_SHOT_MATRIX=1 TM_SHOT_ONLY_DESIGN=light-futuristic TM_SHOT_LANGS=en,bn,mix TM_SHOT_ROUTES=diary/ventures,today,journey/report,diary/money TM_SHOT_OUT=evidence/sector-screens-2026-11-08.json node tools/screenshots.mjs`
// (a DEMO venture with a business type, an income line and a measure seeded; every panel opened). Fails if the report is incomplete or shows any problem.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const report = JSON.parse(readFileSync("evidence/sector-screens-2026-11-08.json", "utf8")) as { viewport: string; combos: number; screens: number; problems: number; bad: unknown[]; routes?: string[] };
describe("evidence/sector-screens-2026-11-08.json", () => {
  it("covers Ventures, Today, Report and Money in English, Bangla and Mix, light and dark, 100 and 200 percent text at 360 px", () => {
    expect(report.viewport).toBe("360x740");
    for (const r of ["diary/ventures", "today", "journey/report", "diary/money"]) expect(report.routes).toContain(r);
    expect(report.combos).toBe(12);
    expect(report.screens).toBe((report.routes ?? []).length * 12);
  });
  it("shows no problem", () => { expect(report.bad).toEqual([]); expect(report.problems).toBe(0); });
});

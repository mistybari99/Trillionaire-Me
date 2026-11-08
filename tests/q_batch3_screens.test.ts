// Screen evidence for build-queue batch 3 (Q-12, Q-13, Q-34). Report written by
// `TM_SHOT_SEED_Q3=1 TM_SHOT_MATRIX=1 TM_SHOT_ONLY_DESIGN=light-futuristic TM_SHOT_LANGS=en,bn,mix TM_SHOT_ROUTES=journey/backward/shot-goal,journey/goals,habits TM_SHOT_OUT=evidence/q-batch3-screens-2026-11-07.json node tools/screenshots.mjs`
// Fails if the report is incomplete or shows any problem (overflow, element wider than the screen, tap target under 44 px, touching targets).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const report = JSON.parse(readFileSync("evidence/q-batch3-screens-2026-11-07.json", "utf8")) as { viewport: string; combos: number; screens: number; problems: number; bad: unknown[]; routes?: string[] };
describe("evidence/q-batch3-screens-2026-11-07.json", () => {
  it("covers the batch 3 screens in English, Bangla and Mix, light and dark, 100 and 200 percent text at 360 px", () => {
    expect(report.viewport).toBe("360x740");
    for (const r of ["journey/backward/shot-goal", "journey/goals", "habits"]) expect(report.routes).toContain(r);
    expect(report.combos).toBe(12);
    expect(report.screens).toBe((report.routes ?? []).length * 12);
  });
  it("shows no problem", () => { expect(report.bad).toEqual([]); expect(report.problems).toBe(0); });
});

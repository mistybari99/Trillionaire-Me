// Screen evidence for the Connect AI screen (W1). Report written by
// `TM_SHOT_AI=1 TM_SHOT_MATRIX=1 TM_SHOT_ONLY_DESIGN=light-futuristic TM_SHOT_LANGS=en,bn,mix TM_SHOT_ROUTES=settings/connections/ai,settings/connections TM_SHOT_OUT=evidence/ai-screens-2026-11-08.json node tools/screenshots.mjs`
// Fails if the report is incomplete or shows any problem (overflow, element wider than the screen, tap target under 44 px, touching targets).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const report = JSON.parse(readFileSync("evidence/ai-screens-2026-11-08.json", "utf8")) as { viewport: string; combos: number; screens: number; problems: number; bad: unknown[]; routes?: string[] };
describe("evidence/ai-screens-2026-11-08.json", () => {
  it("covers Connect AI and Connections in English, Bangla and Mix, light and dark, 100 and 200 percent text at 360 px", () => {
    expect(report.viewport).toBe("360x740");
    for (const r of ["settings/connections/ai", "settings/connections"]) expect(report.routes).toContain(r);
    expect(report.combos).toBe(12);
    expect(report.screens).toBe((report.routes ?? []).length * 12);
  });
  it("shows no problem", () => { expect(report.bad).toEqual([]); expect(report.problems).toBe(0); });
});

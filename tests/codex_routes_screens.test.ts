// Screen evidence for the screens added by the Codex merge (7d34280): /profile, /deen/prayers, /deen/fasting, plus the screens that now carry the
// bottom navigation and Help (i). Report written by `TM_SHOT_MATRIX=1 TM_SHOT_ONLY_DESIGN=light-futuristic TM_SHOT_LANGS=en,bn,mix TM_SHOT_ROUTES=<list> TM_SHOT_OUT=evidence/codex-merge-screens-2026-11-06.json node tools/screenshots.mjs`.
// Fails if the report is incomplete or shows any problem (overflow, element wider than the screen, tap target under 44 px, touching targets).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const report = JSON.parse(readFileSync("evidence/codex-merge-screens-2026-11-06.json", "utf8")) as { viewport: string; combos: number; screens: number; problems: number; bad: unknown[]; routes?: string[] };
describe("evidence/codex-merge-screens-2026-11-06.json", () => {
  it("covers the new routes in English, Bangla and Mix, light and dark, 100 and 200 percent text at 360 px", () => {
    expect(report.viewport).toBe("360x740");
    for (const r of ["profile", "deen/prayers", "deen/fasting", "capture", "today", "deen", "settings"]) expect(report.routes).toContain(r);
    expect(report.combos).toBe(12);
    expect(report.screens).toBe((report.routes ?? []).length * 12);
  });
  it("shows no problem", () => { expect(report.bad).toEqual([]); expect(report.problems).toBe(0); });
});

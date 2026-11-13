// Screen evidence for the "Encrypt real data" card (Settings > Privacy) and the Safety box link. Report written by
// `TM_SHOT_MATRIX=1 TM_SHOT_ONLY_DESIGN=light-futuristic TM_SHOT_LANGS=en,bn,mix TM_SHOT_ROUTES=settings/privacy/vault,settings/privacy,more/safety TM_SHOT_OUT=evidence/vault-screens-2026-11-07.json node tools/screenshots.mjs`.
// The report shows the card in its Off state (the other states are covered by tests/vault_ui.test.ts and tools/e2e.mjs).
// Fails if the report is incomplete or shows any problem (overflow, element wider than the screen, tap target under 44 px, touching targets).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const report = JSON.parse(readFileSync("evidence/vault-screens-2026-11-07.json", "utf8")) as { viewport: string; combos: number; screens: number; problems: number; bad: unknown[]; routes?: string[] };
describe("evidence/vault-screens-2026-11-07.json", () => {
  it("covers the card and the Safety box in English, Bangla and Mix, light and dark, 100 and 200 percent text at 360 px", () => {
    expect(report.viewport).toBe("360x740");
    for (const r of ["settings/privacy/vault", "settings/privacy", "more/safety"]) expect(report.routes).toContain(r);
    expect(report.combos).toBe(12);
    expect(report.screens).toBe((report.routes ?? []).length * 12);
  });
  it("shows no problem", () => { expect(report.bad).toEqual([]); expect(report.problems).toBe(0); });
});

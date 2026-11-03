// Screenshot matrix evidence (owner order 3 Nov 2026): 4 looks x English/Bangla x light/dark x 100/200 % text x 10 screens at 360 px.
// The report is written by `TM_SHOT_MATRIX=1 node tools/screenshots.mjs`. This test fails if the report is incomplete or shows any problem
// (page overflow, element wider than the screen, tap target under 44 px, tab labels outside the screen or broken across lines).
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ROUTES = ["today", "journey", "journey/goal/shot-goal", "journey/month", "deen", "settings", "settings/prayer", "settings/privacy", "settings/backup", "diary/plan", "journey/boards", "journey/backward/shot-goal", "more/where",
    "settings/look", "settings/data", "settings/data/start-real", "settings/plan", "settings/connections", "settings/delete", "settings/about", "settings/backup/restore", "journey/risks", "diary/team", "diary/ventures", "diary/money", "habits", "journey/goals", "more/status"]
const report = JSON.parse(readFileSync("evidence/matrix-report.json", "utf8")) as { viewport: string; combos: number; screens: number; problems: number; bad: unknown[]; routes?: string[]; matrix?: string };
describe("evidence/matrix-report.json", () => {
  it("covers 32 combinations and every listed screen at 360 px (28 screens x 32 = 896)", () => { expect(report.viewport).toBe("360x740"); expect(report.combos).toBe(32); expect(report.routes).toEqual(ROUTES); expect(report.screens).toBe(32 * ROUTES.length); });
  it("shows no problem (a failing row is listed in `bad`)", () => { expect(report.bad).toEqual([]); expect(report.problems).toBe(0); });
  it("full-page pictures of the Boards page with the new drawings exist (4 looks, English and Bangla, 200 % text)", () => {
    for (const n of ["light-futuristic-en-light", "light-futuristic-bn-dark", "light-futuristic-en-light-200", "ink-paper-en-dark", "emerald-obsidian-en-light", "broadsheet-bn-light"]) expect(existsSync(`evidence/looks-sheets/boards-fullpage-${n}.jpg`), n).toBe(true);
  });
  it("the contact sheets that show the screens exist for every look and screen (docs/audit/LOOKS_EVIDENCE_2026-11-03.md)", () => {
    for (const d of ["light-futuristic", "ink-paper", "emerald-obsidian", "broadsheet"]) for (const r of ROUTES) expect(existsSync(`evidence/looks-sheets/${d}-${r.replace(/\//g, "_")}.jpg`), `${d}-${r}`).toBe(true);
  });
});

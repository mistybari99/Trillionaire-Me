// Screen evidence for W5. Reports written by tools/screenshots.mjs:
//  head: TM_SHOT_MATRIX=1 TM_SHOT_HEAD=1 TM_SHOT_FONT=50,100,150 TM_SHOT_ONLY_DESIGN=light-futuristic TM_SHOT_LANGS=en,bn,mix TM_SHOT_ROUTES=<list> TM_SHOT_OUT=evidence/floating-head-screens-2026-11-07.json
//  brand: same without HEAD/FONT, routes profile,settings/about, out evidence/brand-screens-2026-11-07.json
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
type R = { viewport: string; combos: number; screens: number; problems: number; bad: unknown[]; routes: string[] };
const load = (f: string) => JSON.parse(readFileSync(f, "utf8")) as R;
describe("floating head never covers the bottom bar, primary buttons or fields (360 px, EN/BN/Mix, text 50/100/150 percent, light and dark)", () => {
  const r = load("evidence/floating-head-screens-2026-11-07.json");
  it("covers the routes and combinations", () => { expect(r.viewport).toBe("360x740"); for (const x of ["today", "capture", "stuck", "deen", "settings/look", "diary/plan"]) expect(r.routes).toContain(x); expect(r.combos).toBe(18); expect(r.screens).toBe(r.routes.length * 18); });
  it("shows no problem (overlap, overflow, small or touching targets)", () => { expect(r.bad).toEqual([]); expect(r.problems).toBe(0); });
});
describe("brand cards on Profile and About", () => {
  const r = load("evidence/brand-screens-2026-11-07.json");
  it("cover both screens in three languages with no problem", () => { for (const x of ["profile", "settings/about"]) expect(r.routes).toContain(x); expect(r.bad).toEqual([]); expect(r.problems).toBe(0); });
});

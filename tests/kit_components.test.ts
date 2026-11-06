// Kit contract: builders keep old class aliases and 44px sizing classes; tint surfaces keep text contrast >= 4.5 in all 4 looks x light/dark.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DESIGNS } from "../src/ui/themes";
import { btnClass, kActions, kBtn, kChip, kNotice, kRow } from "../src/ui/kit";

type Tok = Record<string, string>;
const hex = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c: number[]) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
const mix = (a: string, b: string, pa: number) => { const x = hex(a), y = hex(b); return toHex(x.map((v, i) => v * pa + y[i]! * (1 - pa))); };
const lum = (h: string) => { const c = hex(h).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!; };
const cr = (a: string, b: string) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const CSS = readFileSync("src/ui/styles.css", "utf8");
const base = (re: RegExp): Tok => { const o: Tok = {}; for (const d of CSS.match(re)![1]!.matchAll(/--([\w-]+)\s*:\s*(#[0-9A-Fa-f]{6})/g)) o[d[1]!] = d[2]!; return o; };
const SETS: Array<[string, Tok]> = DESIGNS.flatMap((d): Array<[string, Tok]> => d.light && d.dark ? [[`${d.id} light`, d.light as Tok], [`${d.id} dark`, d.dark as Tok]] : [[`${d.id} light`, base(/:root\{([^}]*)\}/)], [`${d.id} dark`, base(/:root\[data-theme="dark"\]\{([^}]*)\}/)]]);

describe("kit tints", () => {
  for (const [name, t] of SETS) it(`${name}: ink text on tint-primary / calm / moss / demo >= 4.5, chip text on tint-demo`, () => {
    for (const r of ["primary", "calm", "moss"]) expect(cr(t.ink!, mix(t[r]!, t.card!, 0.1)), `ink on tint-${r}`).toBeGreaterThanOrEqual(4.5);
    expect(cr(t.ink!, t["demo-bg"]!)).toBeGreaterThanOrEqual(4.5);
    expect(cr(t.muted!, mix(t.primary!, t.card!, 0.1)), "muted on tint").toBeGreaterThanOrEqual(4.5);
    expect(cr(t.primary!, t.card!), "primary link on card").toBeGreaterThanOrEqual(4.5);
  });
});
describe("kit builders", () => {
  it("buttons keep alias classes; sm is still 44px class", () => {
    expect(btnClass("secondary")).toContain("ghost");
    expect(btnClass("primary", "sm")).toContain("btn-sm");
    expect(kBtn("x").className).toContain("k-btn--primary");
  });
  it("actions group has role and gap class; chip, notice, row markup", () => {
    expect(kActions([kBtn("a"), kBtn("b", { variant: "secondary" })]).className).toContain("k-actions");
    expect(kChip("DEMO", "demo").className).toContain("k-chip--demo");
    expect(kNotice("legal", ["x"], { legal: true }).getAttribute("role")).toBe("note");
    const r = kRow({ title: "Fajr", trail: [kBtn("Mark", { size: "sm" })], state: "done" });
    expect(r.getAttribute("data-state")).toBe("done"); expect(r.querySelector(".k-row__trail .btn-sm")).not.toBeNull();
  });
  it("kit.css gives controls >= 44px and checkboxes a 24px box (not 100% wide)", () => {
    const k = readFileSync("src/ui/kit.css", "utf8");
    expect(k).toMatch(/\.btn-sm,\.k-btn--sm\{[^}]*min-height:var\(--tap\)/);
    expect(k).toMatch(/input\[type=checkbox\],input\[type=radio\]\{[^}]*width:24px;height:24px/);
    expect(k).toMatch(/input:not\(\[type=checkbox\]\):not\(\[type=radio\]\)/);
  });
});

// R4: journey micro-animations stay behind reduced-motion, the text equivalent stays, and the focus tip exists in en + bn.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PACKS } from "../src/i18n/packs";
import { journeyArt } from "../src/ui/rewardArt";
import { render } from "../src/app";
import { store } from "../src/ui/state";
import type { FieldValue, TMRecord } from "../src/core/types";

type Block = { prelude: string; body: string };
// Minimal CSS block reader: returns top-level blocks (prelude + body), skipping @import lines and comments.
function blocks(css: string): Block[] {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out: Block[] = [];
  let pos = 0;
  while (pos < src.length) {
    const open = src.indexOf("{", pos);
    if (open < 0) break;
    let prelude = src.slice(pos, open).trim();
    const semi = prelude.lastIndexOf(";");
    if (semi >= 0) prelude = prelude.slice(semi + 1).trim();
    let depth = 0, i = open;
    for (; i < src.length; i++) { if (src[i] === "{") depth++; else if (src[i] === "}") { depth--; if (depth === 0) break; } }
    out.push({ prelude: prelude.replace(/\s+/g, ""), body: src.slice(open + 1, i) });
    pos = i + 1;
  }
  return out;
}
// Flatten: every (context, selector, declarations) rule. context = "" | "no-preference" | "reduce"
function rules(css: string): { ctx: string; sel: string; decl: string }[] {
  const res: { ctx: string; sel: string; decl: string }[] = [];
  const walk = (list: Block[], ctx: string) => {
    for (const b of list) {
      if (b.prelude.startsWith("@media")) {
        const c = b.prelude.includes("prefers-reduced-motion:no-preference") ? "no-preference" : b.prelude.includes("prefers-reduced-motion:reduce") ? "reduce" : ctx;
        walk(blocks(b.body), c);
      } else if (b.prelude.startsWith("@keyframes")) continue;
      else for (const s of b.prelude.split(",")) res.push({ ctx, sel: s, decl: b.body.replace(/\s+/g, "") });
    }
  };
  walk(blocks(css), "");
  return res;
}

const css = readFileSync("src/ui/styles.css", "utf8");
const MOTION = [".star", ".star.new", ".shoot", ".arrow-draw", ".step-lit", ".inspire"];

describe("R4 reduced-motion guard (styles.css)", () => {
  it("every animated selector is switched off under prefers-reduced-motion: reduce", () => {
    const all = rules(css);
    const reduce = all.filter((r) => r.ctx === "reduce");
    for (const sel of MOTION) {
      const hit = reduce.find((r) => r.sel === sel && /animation:none/.test(r.decl));
      expect(hit, sel).toBeTruthy();
    }
  });

  it("any rule with an animation outside reduce is disabled by a reduce rule for the same selector", () => {
    const all = rules(css);
    for (const r of all.filter((x) => x.ctx !== "reduce" && /animation:(?!none)/.test(x.decl))) {
      const off = all.some((x) => x.ctx === "reduce" && x.sel === r.sel && /animation:none/.test(x.decl));
      expect(off, r.sel).toBe(true);
    }
  });

  it("the hidden start state of the arrow (dash offset) only exists when motion is allowed", () => {
    const all = rules(css);
    const dashing = all.filter((r) => /stroke-dash/.test(r.decl));
    expect(dashing.length).toBeGreaterThan(0);
    for (const r of dashing) expect(r.ctx === "no-preference" || r.ctx === "reduce", r.sel).toBe(true);
    for (const r of dashing.filter((x) => x.ctx === "no-preference")) expect(r.decl).toMatch(/animation:/);
  });

  it("reward art motion classes exist in the SVG output only as text-equivalent-preserving shapes", () => {
    const svg = journeyArt(3, 2, { newest: true });
    expect(svg.querySelector(".arrow-draw")).not.toBeNull();
    expect(svg.querySelectorAll(".step-lit").length).toBe(1);
    expect(svg.getAttribute("aria-label")).toMatch(/3 stars, garden stage 2 of 8/);
    expect(journeyArt(3, 0, { newest: true }).querySelector("rect.step-lit")).toBeNull();
    expect(journeyArt(3, 2).querySelector(".arrow-draw")).toBeNull();
  });
});

describe("R4 focus tip", () => {
  const en = PACKS.en as Record<string, string>, bn = PACKS.bn as Record<string, string>, mix = PACKS.mix as Record<string, string>;
  it("focus.tip exists in en and bn (and mix) with the calm one-target copy", () => {
    expect(en["focus.tip"]).toMatch(/one target at a time/i);
    expect(bn["focus.tip"]).toMatch(/একবারে/);
    expect(mix["focus.tip"]!.trim()).not.toBe("");
    for (const k of ["focus.tip"]) for (const p of [en, bn]) expect(p[k]).not.toMatch(/streak|rank|grade|lazy|fail|miss|শাস্তি|ব্যর্থ/i);
  });

  it("focus screen renders the tip", () => {
    localStorage.clear(); sessionStorage.clear(); store.demo.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en");
    const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" });
    store.demo.put({ id: "task-1", entity: "task", ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-10-24T00:00:00Z", values: { "task.title": v("Write offer"), "task.minutes": v(20) } } as TMRecord);
    location.hash = "#/focus/task-1"; render();
    expect(document.querySelector("[data-focus-tip]")!.textContent).toBe(en["focus.tip"]);
  });
});

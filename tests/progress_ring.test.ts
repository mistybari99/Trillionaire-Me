// Progress ring: draw-in, pop and soft glow at milestones. Short, CSS only, off under prefers-reduced-motion; the text carries the meaning.
import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { store } from "../src/ui/state";
import { isMilestone, progressRing } from "../src/ui/ring";
import type { FieldValue, TMRecord } from "../src/core/types";

const mk = (id: string, entity: string, values: Record<string, unknown>, links?: Record<string, string>): TMRecord => {
  const vals: Record<string, FieldValue> = {}; for (const [k, x] of Object.entries(values)) vals[k] = { state: "value", value: x, label: "DEMO" } as FieldValue;
  return { id, entity, ns: "demo", ownerId: "demo-user", schemaVersion: 1, createdAt: "2026-10-26T00:00:00.000Z", values: vals, ...(links ? { links } : {}) };
};
const app = () => document.getElementById("app")!;
const go = (hash: string) => { location.hash = hash; render(); };
const css = readFileSync("src/ui/styles.css", "utf8");
const part = css.slice(css.indexOf("/* progress ring"), css.indexOf("/* language icon menu"));

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear();
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
});

describe("progressRing (DOM)", () => {
  it("known value: arc length equals the percent, label equals the given text, number shown", () => {
    const r = progressRing(40, "40% of tasks done");
    expect(r.getAttribute("aria-label")).toBe("40% of tasks done"); expect(r.getAttribute("role")).toBe("img"); expect(r.getAttribute("data-ring")).toBe("40");
    const arc = r.querySelector(".pr-arc")!; expect(arc.getAttribute("stroke-dashoffset")).toBe("60"); expect(arc.getAttribute("stroke-dasharray")).toBe("100");
    expect(r.querySelector(".pr-num")!.textContent).toBe("40%"); expect(r.classList.contains("pr-ms")).toBe(false);
  });
  it("0% draws no arc; 100% is a full arc", () => {
    expect(progressRing(0, "x").querySelector(".pr-arc")).toBeNull();
    expect(progressRing(100, "x", true).querySelector(".pr-arc")!.getAttribute("stroke-dashoffset")).toBe("0");
  });
  it("unknown: dashed ring with '?', no arc, no glow, never a 0", () => {
    const r = progressRing(null, "Unknown");
    expect(r.getAttribute("data-ring")).toBe("unknown"); expect(r.querySelector(".pr-arc")).toBeNull(); expect(r.querySelector(".pr-glow")).toBeNull();
    expect(r.querySelector(".pr-num")!.textContent).toBe("?"); expect(r.querySelector(".pr-unk")!.getAttribute("stroke-dasharray")).toBe("4 3");
  });
  it("milestone adds the pop and glow marker only for a known value; values are clamped", () => {
    expect(progressRing(50, "x", true).classList.contains("pr-ms")).toBe(true);
    expect(progressRing(null, "x", true).classList.contains("pr-ms")).toBe(false);
    expect(progressRing(250, "x").getAttribute("data-ring")).toBe("100");
    expect([25, 50, 75, 100].every(isMilestone) && !isMilestone(40) && !isMilestone(null)).toBe(true);
  });
});

describe("rings on screens", () => {
  it("overall card (Today) shows a ring whose label is the visible sentence; Unknown with no tasks", () => {
    go("#/today"); let r = app().querySelector("[data-overall=today] svg.pr")!;
    expect(r.getAttribute("data-ring")).toBe("unknown");
    store.demo.put(mk("t1", "task", { "task.title": "A", "task.done_on": "2026-10-26" })); store.demo.put(mk("t2", "task", { "task.title": "B" }));
    go("#/today"); r = app().querySelector("[data-overall=today] svg.pr")!;
    expect(r.getAttribute("data-ring")).toBe("50"); expect(r.getAttribute("aria-label")).toBe(app().querySelector("[data-overall=today] [data-overall-text]")!.textContent);
    expect(r.classList.contains("pr-ms")).toBe(false);
  });
  it("goal page: ring at 50% has the milestone marker and the milestone sentence is still there", () => {
    store.demo.put(mk("g1", "goal", { "goal.title": "G" })); store.demo.put(mk("t1", "task", { "task.title": "A", "task.done_on": "2026-10-26" }, { goal: "g1" })); store.demo.put(mk("t2", "task", { "task.title": "B" }, { goal: "g1" }));
    go("#/journey/goal/g1");
    const r = app().querySelector("[data-goal-progress] svg.pr")!; expect(r.getAttribute("data-ring")).toBe("50"); expect(r.getAttribute("data-ring-ms")).toBe("1");
    expect(app().querySelector("[data-goal-progress] [data-milestone]")!.textContent).toMatch(/Half of the linked tasks/);
  });
  it("goal page with no linked task: no ring, plain Unknown text", () => {
    store.demo.put(mk("g1", "goal", { "goal.title": "G" })); go("#/journey/goal/g1");
    expect(app().querySelector("[data-goal-progress] svg.pr")).toBeNull(); expect(app().querySelector("[data-goal-progress]")!.textContent).toMatch(/unknown/i);
  });
  it("reward card after a finished task shows the overall ring (milestone when exactly 50%)", () => {
    store.demo.put(mk("t1", "task", { "task.title": "A", "task.done_on": "2026-10-26" })); store.demo.put(mk("t2", "task", { "task.title": "B" })); sessionStorage.setItem("tm:newStar", "1");
    go("#/reward");
    const w = app().querySelector("[data-reward-ring]")!; expect(w.getAttribute("data-reward-ring")).toBe("50");
    expect(w.querySelector("svg.pr")!.getAttribute("data-ring-ms")).toBe("1"); expect(w.querySelector("p")!.textContent).toMatch(/50% — 1 of 2 tasks done/);
  });
});

describe("ring motion rules", () => {
  it("every animation is inside no-preference, short (1.7s at most including delay), and switched off under reduce for the same selector", () => {
    const noPref = [...part.matchAll(/@media \(prefers-reduced-motion:no-preference\)\{([\s\S]*?)\n\}/g)].map((m) => m[1]!).join("\n");
    const outside = part.replace(/@media \(prefers-reduced-motion:no-preference\)\{[\s\S]*?\n\}/g, "").replace(/@keyframes[^{]+\{[\s\S]*?\}\}/g, "");
    expect(noPref).toMatch(/animation:prDraw/); expect(noPref).toMatch(/animation:prPop/); expect(noPref).toMatch(/animation:prGlow/);
    expect(outside).not.toMatch(/animation:(?!none)/); expect(outside).not.toMatch(/transition:(?!none)/);
    let seen = 0;
    for (const m of noPref.matchAll(/([^{}\n]+)\{[^}]*animation:\w+ ([\d.]+)s [\w-]+(?: ([\d.]+)s)? both/g)) {
      expect(Number(m[2]) + Number(m[3] ?? 0), m[1]).toBeLessThanOrEqual(1.7);
      seen++; const sel = m[1]!.trim(); const reduce = part.match(/@media \(prefers-reduced-motion:reduce\)\{([^\n]*)\}/)![1]!;
      expect(reduce.split("{")[0]!.split(",").map((x) => x.trim())).toContain(sel); expect(reduce).toMatch(/animation:none!important/);
    }
    expect(seen).toBe(3); expect(part).not.toMatch(/infinite/);
  });
  it("the arc length is an attribute, so the still picture is correct when motion is off; no script timers or SMIL", () => {
    expect(part).not.toMatch(/stroke-dasharray|stroke-dashoffset:\s*\d+\s*;/); // only inside keyframes
    const src = readFileSync("src/ui/ring.ts", "utf8"); expect(src).not.toMatch(/<animate|animateTransform|requestAnimationFrame|setInterval|setTimeout|fetch\(/);
  });
  it("colours are tokens only (no hex, no red)", () => { expect(part.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/#[0-9a-f]{3,6}|\bred\b|--danger/i); });
});

import { beforeEach, describe, expect, it } from "vitest";
import { QUESTIONS, diagnose, type Answer } from "../src/core/stuck";
import { render } from "../src/app";
import { store, prefs } from "../src/ui/state";

const all = (a: Answer) => Object.fromEntries(QUESTIONS.map((q) => [q.id, a]));
function rng(seed: number) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

describe("TM-REQ-174/175 'I'm stuck' diagnosis", () => {
  it("unknown answers never create a cause", () => { const d = diagnose(all("unknown")); expect(d.causes).toEqual([]); expect(d.unansweredCount).toBe(6); expect(d.helpers).toEqual(["tiny_step"]); });
  it("tired or overloaded NEVER adds work: no tiny_step helper, only lighter modes (500 random answer sets)", () => {
    const r = rng(174);
    for (let i = 0; i < 500; i++) {
      const a: Record<string, Answer> = {}; for (const q of QUESTIONS) a[q.id] = (["yes", "no", "unknown"] as const)[Math.floor(r() * 3)]!;
      const d = diagnose(a);
      expect(d.helpers.length).toBeLessThanOrEqual(3);
      const load = a["q_overloaded"] === "yes" || a["q_tired"] === "yes";
      if (load) { expect(d.helpers).not.toContain("tiny_step"); expect(d.helpers.length).toBeGreaterThan(0); }
      for (const c of d.causes) expect(QUESTIONS.some((q) => q.cause === c && a[q.id] === "yes")).toBe(true); // only 'yes' answers count
    }
  });
  it("unclear / too big / fear / missing → one tiny step", () => { for (const q of ["q_unclear", "q_too_big", "q_fear", "q_missing"]) expect(diagnose({ ...all("no"), [q]: "yes" }).helpers).toEqual(["tiny_step"]); });
  it("deterministic and calm: no judging words in the stuck copy", async () => {
    expect(JSON.stringify(diagnose(all("yes")))).toBe(JSON.stringify(diagnose(all("yes"))));
    const { PACKS } = await import("../src/i18n/packs");
    expect(Object.entries(PACKS.en).filter(([k]) => k.startsWith("stuck.")).map(([, v]) => v).join(" ").toLowerCase()).not.toMatch(/lazy|fail|wrong with you|weak|shame|should have/);
  });
});

describe("stuck screen uses the running app", () => {
  beforeEach(() => { localStorage.clear(); store.demo.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); });
  const go = (h: string) => { location.hash = h; render(); };
  const tap = (q: string, a: string) => (document.querySelector(`[data-q=${q}] [data-a=${a}]`) as HTMLButtonElement).click();
  it("'too big' → adds a 5-minute high-priority task to the plan and logs it", () => {
    go("#/stuck"); tap("q_too_big", "yes"); (document.querySelector("[data-act=stuck-show]") as HTMLButtonElement).click();
    (document.getElementById("stuck-step") as HTMLInputElement).value = "Open the supplier list";
    (document.querySelector("[data-helper=tiny_step]") as HTMLButtonElement).click();
    const t = store.demo.list().find((r) => r.entity === "task")!; expect(t.values["task.minutes"]).toMatchObject({ value: 5 }); expect(t.values["task.priority"]).toMatchObject({ value: "high" });
    expect(store.demo.list().some((r) => r.entity === "stuck_log")).toBe(true);
  });
  it("'tired' → offers Minimum week / Pause only; choosing it switches the mode and adds nothing", () => {
    go("#/stuck"); tap("q_tired", "yes"); (document.querySelector("[data-act=stuck-show]") as HTMLButtonElement).click();
    expect(document.querySelector("[data-helper=tiny_step]")).toBeNull();
    (document.querySelector("[data-helper=minimum_week]") as HTMLButtonElement).click();
    expect(prefs.mode).toBe("minimum_week"); expect(store.demo.list().filter((r) => r.entity === "task")).toEqual([]);
  });
  it("a secret typed as the step is rejected and nothing is added", () => {
    go("#/stuck"); tap("q_unclear", "yes"); (document.querySelector("[data-act=stuck-show]") as HTMLButtonElement).click();
    (document.getElementById("stuck-step") as HTMLInputElement).value = "password: abc12345";
    (document.querySelector("[data-helper=tiny_step]") as HTMLButtonElement).click();
    expect(store.demo.list().filter((r) => r.entity === "task")).toEqual([]);
  });
});

// Q-01 recovery line, Q-02 make-it-concrete bank, Q-03 Stuck card pictures (batch 1).
import { describe, expect, it } from "vitest";
import { render } from "../src/app";
import { store } from "../src/ui/state";
import { PACKS } from "../src/i18n/packs";

const JUDGING = /\b(shame\w*|guilt\w*|fail\w*|grade\w*|rank\w*|streak\w*|score\w*|lazy|overdue|behind|punish\w*|penalt\w*|mistake\w*|weak|wrong with you)\b/i;
const go = (h: string) => { location.hash = h; render(); };
const tap = (q: string, a: string) => (document.querySelector(`[data-q=${q}] [data-a=${a}]`) as HTMLButtonElement).click();
const show = () => (document.querySelector("[data-act=stuck-show]") as HTMLButtonElement).click();
const setup = (lang: string) => { localStorage.clear(); store.demo.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", lang); };

describe("Q-01 recovery line after any Stuck helper", () => {
  for (const lang of ["en", "bn", "mix"] as const) {
    it(`shows one calm line after the tiny step (${lang})`, () => {
      setup(lang); go("#/stuck"); tap("q_unclear", "yes"); show();
      expect(document.querySelector("[data-recovery]")).toBeNull(); // not before a helper is used
      (document.getElementById("stuck-step") as HTMLInputElement).value = "Open the supplier list";
      (document.querySelector("[data-helper=tiny_step]") as HTMLButtonElement).click();
      const lines = document.querySelectorAll("[data-recovery]"); expect(lines.length).toBe(1);
      expect(lines[0]!.textContent).toBe(PACKS[lang]["qb1.recovery"]);
    });
    it(`shows it after Minimum week and after Pause (${lang})`, () => {
      for (const hp of ["minimum_week", "pause"]) {
        setup(lang); go("#/stuck"); tap("q_tired", "yes"); tap("q_overloaded", "yes"); show();
        (document.querySelector(`[data-helper=${hp}]`) as HTMLButtonElement | null)?.click();
        expect(document.querySelectorAll("[data-recovery]").length, hp).toBe(1);
      }
    });
  }
  it("(Q-03 below) EN line is the agreed words; BN has Bangla; Mix keeps it; no judging words", () => {
    expect(PACKS.en["qb1.recovery"]).toBe("A pause is part of the path. Come back when ready.");
    expect(PACKS.bn["qb1.recovery"]).toMatch(/[ঀ-৿]/); expect(PACKS.mix["qb1.recovery"]).toMatch(/[ঀ-৿]/);
    for (const l of ["en", "bn", "mix"] as const) expect(PACKS[l]["qb1.recovery"]).not.toMatch(JUDGING);
  });
});

describe("Q-03 Stuck card pictures", () => {
  for (const lang of ["en", "bn", "mix"] as const) {
    it(`two-branch picture, matrix tip and three bands exist, are decorative where needed, and the text stays (${lang})`, () => {
      setup(lang); go("#/stuck");
      const two = document.querySelector("[data-card=two_paths]")!;
      expect(two.querySelector("[data-pic=fork]")!.getAttribute("aria-hidden")).toBe("true");
      expect(two.querySelectorAll("li").length).toBe(2); // the text lines stay
      const timing = document.querySelector("[data-card=effort_timing]")!;
      const m = timing.querySelector("[data-diagram=matrix]")!; expect(m.querySelectorAll(".cell").length).toBe(4);
      expect(m.getAttribute("role")).toBe("img"); expect(m.getAttribute("aria-label")).toBeTruthy();
      expect(timing.textContent).toContain(PACKS[lang]["stuck.timing.body"]);
      const funnel = document.querySelector("[data-card=where_time_goes]")!;
      const bands = funnel.querySelector("[data-pic=bands]")!; expect(bands.getAttribute("aria-hidden")).toBe("true"); expect(bands.children.length).toBe(3);
      expect(bands.textContent).not.toMatch(/\d/); // no counts
      expect(funnel.querySelectorAll("li").length).toBe(3);
      expect(document.getElementById("app")!.textContent).not.toMatch(JUDGING);
    });
  }
  it("the new tip is in the library with 4 labels in both languages and a link back to Stuck", async () => {
    const { TIPS, labels } = await import("../src/library/topics");
    const tip = TIPS.find((x) => x.id === "pr3")!; expect(tip.diagram.type).toBe("matrix");
    expect(labels(tip.diagram, "en").length).toBe(4); expect(labels(tip.diagram, "bn").length).toBe(4); expect(tip.appLink).toBe("#/stuck");
    expect(labels(tip.diagram, "en")[0]).toMatch(/^Hard now/); expect(labels(tip.diagram, "en")[1]).toMatch(/^Easy later/);
  });
});

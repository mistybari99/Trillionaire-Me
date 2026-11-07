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
  it("EN line is the agreed words; BN has Bangla; Mix keeps it; no judging words", () => {
    expect(PACKS.en["qb1.recovery"]).toBe("A pause is part of the path. Come back when ready.");
    expect(PACKS.bn["qb1.recovery"]).toMatch(/[ঀ-৿]/); expect(PACKS.mix["qb1.recovery"]).toMatch(/[ঀ-৿]/);
    for (const l of ["en", "bn", "mix"] as const) expect(PACKS[l]["qb1.recovery"]).not.toMatch(JUDGING);
  });
});

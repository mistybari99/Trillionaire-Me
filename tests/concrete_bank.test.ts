// Q-02: eight fixed big-task to tiny-first-action pairs on Stuck; a tap fills the step name.
import { describe, expect, it } from "vitest";
import { render } from "../src/app";
import { store } from "../src/ui/state";
import { PACKS } from "../src/i18n/packs";
import { CONCRETE_BANK } from "../src/core/stuck";

const go = (h: string) => { location.hash = h; render(); };
const setup = (lang: string) => { localStorage.clear(); store.demo.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", lang); };
const open = () => { go("#/stuck"); (document.querySelector("[data-q=q_unclear] [data-a=yes]") as HTMLButtonElement).click(); (document.querySelector("[data-act=stuck-show]") as HTMLButtonElement).click(); };
const JUDGING = /\b(shame\w*|guilt\w*|fail\w*|grade\w*|rank\w*|streak\w*|score\w*|lazy|overdue|behind|punish\w*|penalt\w*|mistake\w*|weak)\b/i;

describe("Q-02 make-it-concrete bank", () => {
  it("has exactly 8 fixed pairs in EN, BN and Mix, none empty, tiny fits the 80-character step field", () => {
    expect(CONCRETE_BANK.length).toBe(8);
    for (const l of ["en", "bn", "mix"] as const) for (const n of CONCRETE_BANK) {
      const big = PACKS[l][`qb1.bank.${n}.big` as keyof typeof PACKS.en]; const tiny = PACKS[l][`qb1.bank.${n}.tiny` as keyof typeof PACKS.en];
      expect(big.length, `${l}${n}`).toBeGreaterThan(2); expect(tiny.length).toBeGreaterThan(2); expect(tiny.length).toBeLessThanOrEqual(80);
      expect(big + tiny).not.toMatch(JUDGING);
    }
    expect(PACKS.bn["qb1.bank.1.tiny"]).toMatch(/[ঀ-৿]/);
  });
  for (const lang of ["en", "bn", "mix"] as const) {
    it(`a tap fills the step name; adding it still saves one 5-minute task (${lang})`, () => {
      setup(lang); open();
      expect(document.querySelectorAll("[data-bank]").length).toBe(8);
      const input = document.getElementById("stuck-step") as HTMLInputElement; expect(input.value).toBe("");
      (document.querySelector("[data-bank='3']") as HTMLButtonElement).click();
      expect(input.value).toBe(PACKS[lang]["qb1.bank.3.tiny"]);
      expect(store.demo.list().filter((r) => r.entity === "task")).toEqual([]); // a tap alone saves nothing
      (document.querySelector("[data-helper=tiny_step]") as HTMLButtonElement).click();
      const task = store.demo.list().filter((r) => r.entity === "task"); expect(task.length).toBe(1);
      expect(task[0]!.values["task.title"]).toMatchObject({ value: PACKS[lang]["qb1.bank.3.tiny"] });
    });
  }
  it("the bank is not offered when the user is tired (no extra work on a rest day)", () => {
    setup("en"); go("#/stuck"); (document.querySelector("[data-q=q_tired] [data-a=yes]") as HTMLButtonElement).click(); (document.querySelector("[data-act=stuck-show]") as HTMLButtonElement).click();
    expect(document.querySelector("[data-bank]")).toBeNull();
  });
});

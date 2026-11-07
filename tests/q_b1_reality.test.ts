// Q-08: "Does this still matter?" Yes / No / Not sure in the reality loop. Not sure never reads as No; only a plain No hides the options.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import { PACKS } from "../src/i18n/packs";
import { resetMatters } from "../src/ui/qb1Ui";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" }) as FieldValue;
const rec = (id: string, entity: string, values: Record<string, FieldValue>, links?: Record<string, string>): TMRecord => ({ id, entity, ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-11-02T08:00:00.000Z", values, ...(links ? { links } : {}) });
const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector(sel) as T | null;
const go = (h: string) => { location.hash = h; render(); };
const open = (lang: string) => {
  localStorage.setItem("tm:ui:lang", lang);
  for (const r of [rec("g1", "goal", { "goal.title": v("Launch shop"), "goal.target_date": v("2030-12-01") }), rec("t1", "task", { "task.title": v("Plan"), "task.priority": v("high") }, { goal: "g1" }), rec("t2", "task", { "task.title": v("Build") }, { goal: "g1" }), rec("t3", "task", { "task.title": v("Ship") }, { goal: "g1" })]) store.demo.put(r);
  store.demo.put(rec("ev1", "reality_event", { "reality_event.kind": v("time_less"), "reality_event.on": v("2026-11-02"), "reality_event.status": v("open") }));
  go("#/journey/reality");
};
const JUDGING = /\b(shame\w*|guilt\w*|fail\w*|grade\w*|rank\w*|streak\w*|score\w*|lazy|overdue|behind|punish\w*|weak|wrong|lost|missed)\b/i;
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear(); resetMatters(); document.body.innerHTML = '<div id="app"></div>';
  localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, "2026-11-02T00:00:00.000Z");
});

describe("Q-08 still-matters tap", () => {
  for (const lang of ["en", "bn", "mix"] as const) {
    it(`the question sits right above the options with three taps (${lang})`, () => {
      open(lang); const step = $("[data-matters-step=ev1]")!; expect(step).not.toBeNull();
      expect([...step.querySelectorAll("[data-matters]")].map((b) => b.getAttribute("data-matters"))).toEqual(["yes", "no", "unsure"]);
      expect(step.textContent).toContain(PACKS[lang]["qb1.matters.q"]);
      expect(step.compareDocumentPosition($("[data-options]")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); // step comes before the options
      expect($("[data-options]")!.hasAttribute("hidden")).toBe(false); // unanswered = nothing is hidden
    });
    it(`Yes and Not sure keep the options; only No hides them and changes nothing (${lang})`, () => {
      open(lang); const before = JSON.stringify(store.demo.list());
      ($("[data-matters=unsure]") as HTMLButtonElement).click();
      expect($("[data-options]")!.hasAttribute("hidden")).toBe(false); expect($("[data-matters-said]")!.textContent).toBe(PACKS[lang]["qb1.matters.said.unsure"]);
      expect($("[data-matters=unsure]")!.getAttribute("aria-pressed")).toBe("true"); expect($("[data-matters=no]")!.getAttribute("aria-pressed")).toBe("false");
      ($("[data-matters=yes]") as HTMLButtonElement).click(); expect($("[data-options]")!.hasAttribute("hidden")).toBe(false);
      ($("[data-matters=no]") as HTMLButtonElement).click(); expect($("[data-options]")!.hasAttribute("hidden")).toBe(true); expect($("[data-matters-said]")!.textContent).toBe(PACKS[lang]["qb1.matters.said.no"]);
      expect($("[data-act=note-only]")).not.toBeNull(); // the user can still note it
      expect(JSON.stringify(store.demo.list())).toBe(before); // a tap saves nothing and changes no plan
    });
  }
  it("the answer survives a re-render in the same visit, and the copy has no judging words in any language", () => {
    open("en"); ($("[data-matters=no]") as HTMLButtonElement).click(); go("#/journey/reality");
    expect($("[data-matters=no]")!.getAttribute("aria-pressed")).toBe("true"); expect($("[data-options]")!.hasAttribute("hidden")).toBe(true);
    for (const l of ["en", "bn", "mix"] as const) for (const k of Object.keys(PACKS.en).filter((x) => x.startsWith("qb1.matters."))) expect(PACKS[l][k as keyof typeof PACKS.en]).not.toMatch(JUDGING);
  });
  it("an event with no options shows no question (nothing to decide)", () => {
    localStorage.setItem("tm:ui:lang", "en"); store.demo.put(rec("ev2", "reality_event", { "reality_event.kind": v("opportunity"), "reality_event.status": v("open") })); go("#/journey/reality");
    expect($("[data-matters-step=ev2]")).toBeNull();
  });
});

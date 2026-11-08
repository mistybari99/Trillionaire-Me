// Q-10 goal-page starter cards: Start card, 4-field problem frame, Want/Feel/Do with five fixed tiny actions (batch 2).
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { render } from "../src/app";
import { store } from "../src/ui/state";
import { PACKS } from "../src/i18n/packs";
import { fieldById } from "../src/catalog/fields";
import { isEmptyGoal, PROBLEM_FIELDS, WFD_FIELDS, TINY_ACTIONS } from "../src/core/goalWorksheet";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" } as FieldValue);
const rec = (id: string, entity: string, vals: Record<string, unknown>, links?: Record<string, string>): TMRecord => ({ id, entity, ns: "demo", ownerId: "demo-user", schemaVersion: 2, createdAt: "2026-11-01T00:00:00.000Z", values: Object.fromEntries(Object.entries(vals).map(([k, x]) => [k, v(x)])), ...(links ? { links } : {}) } as TMRecord);
const app = () => document.getElementById("app")!;
const go = (h: string) => { location.hash = h; render(); };
const setup = (lang: string) => { localStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", lang); localStorage.setItem("tm:ui:dataMode", "demo"); };
const submit = (name: string) => (app().querySelector(`form[data-form=${name}]`) as HTMLFormElement).dispatchEvent(new Event("submit", { cancelable: true }));
const inp = (f: string) => document.getElementById(`q2-${f.replace(/[^a-z0-9]+/g, "-")}`) as HTMLInputElement;

describe("Q-10 data", () => {
  it("every new field exists in the catalog as optional goal text with help", () => {
    for (const f of [...PROBLEM_FIELDS, ...WFD_FIELDS]) { const d = fieldById(f)!; expect(d.entity).toBe("goal"); expect(d.type).toBe("text"); expect(d.importance).toBe("optional"); expect(d.requirement).not.toBe("required"); }
  });
  it("isEmptyGoal: title only is empty; any text or any linked step is not", () => {
    const g = rec("a", "goal", { "goal.title": "Shop" });
    expect(isEmptyGoal(g, [g])).toBe(true);
    expect(isEmptyGoal(rec("a", "goal", { "goal.title": "Shop", "goal.problem": "x" }), [g])).toBe(false);
    expect(isEmptyGoal(g, [g, rec("t1", "task", { "task.title": "s", "task.goals": ["a"] }, { goal: "a" })])).toBe(false);
  });
  it("five fixed tiny actions exist in all three languages", () => {
    expect(TINY_ACTIONS.length).toBe(5);
    for (const l of ["en", "bn", "mix"] as const) for (const n of TINY_ACTIONS) expect(PACKS[l][`q2.tiny.${n}` as keyof typeof PACKS.en].length).toBeGreaterThan(3);
  });
});

describe("Q-10 goal page", () => {
  for (const lang of ["en", "bn", "mix"] as const) {
    it(`empty goal shows the Start card with three links, the targets exist (${lang})`, () => {
      setup(lang); store.demo.put(rec("a", "goal", { "goal.title": "Shop" })); go("#/journey/goal/a");
      const c = app().querySelector("[data-card=start]")!; expect(c).not.toBeNull();
      expect(c.querySelector("h2")!.textContent).toBe(PACKS[lang]["q2.start.h"]);
      expect(c.querySelector("[data-start=clarify]")!.textContent).toBe(PACKS[lang]["q2.start.clarify"]);
      expect((c.querySelector("[data-start=break]") as HTMLAnchorElement).getAttribute("href")).toBe("#/journey/backward/a");
      expect(c.querySelector("[data-start=begin]")).not.toBeNull();
      expect(document.getElementById("problem_frame-card")).not.toBeNull(); expect(document.getElementById("want_feel_do-card")).not.toBeNull();
      expect(c.textContent).not.toMatch(/DEMO/);
    });
  }
  it("the Break down link opens the backward plan for the same goal", () => {
    setup("en"); store.demo.put(rec("a", "goal", { "goal.title": "Shop" })); go("#/journey/goal/a"); go("#/journey/backward/a");
    expect(app().querySelector("[data-backward]")).not.toBeNull();
  });
  it("a goal that already has a why or a step shows no Start card", () => {
    setup("en"); store.demo.put(rec("a", "goal", { "goal.title": "Shop", "goal.why": "family" })); go("#/journey/goal/a");
    expect(app().querySelector("[data-card=start]")).toBeNull();
    setup("en"); store.demo.put(rec("a", "goal", { "goal.title": "Shop" })); store.demo.put(rec("t1", "task", { "task.title": "s", "task.goals": ["a"] }, { goal: "a" })); go("#/journey/goal/a");
    expect(app().querySelector("[data-card=start]")).toBeNull();
  });
  it("problem frame has four fields; saving stores them, blank ones are not written, Start card goes away", () => {
    setup("en"); store.demo.put(rec("a", "goal", { "goal.title": "Shop" })); go("#/journey/goal/a");
    expect(app().querySelectorAll("form[data-form=problem_frame] input").length).toBe(4);
    inp("goal.problem").value = "No money at month end"; inp("goal.problem_who").value = "My family";
    submit("problem_frame");
    const g = store.demo.get("a")!; expect(g.values["goal.problem"]).toMatchObject({ state: "value", value: "No money at month end", label: "DEMO" });
    expect(g.values["goal.problem_who"]).toMatchObject({ value: "My family" });
    expect(g.values["goal.problem_why"]).toBeUndefined(); expect(g.values["goal.problem_outcome"]).toBeUndefined();
    expect(app().querySelector("[data-saved=problem_frame]")!.textContent).toBe(PACKS.en["q2.saved"]);
    expect(app().querySelector("[data-card=start]")).toBeNull();
  });
  it("clearing a saved line makes it Unknown, not empty text and not zero", () => {
    setup("en"); store.demo.put(rec("a", "goal", { "goal.title": "Shop", "goal.problem": "x" })); go("#/journey/goal/a");
    inp("goal.problem").value = ""; submit("problem_frame");
    expect(store.demo.get("a")!.values["goal.problem"]).toEqual({ state: "unknown" });
  });
  it("a secret-looking line is refused and nothing is saved", () => {
    setup("en"); store.demo.put(rec("a", "goal", { "goal.title": "Shop" })); go("#/journey/goal/a");
    inp("goal.problem").value = "password: hunter2 otp 123456"; submit("problem_frame");
    expect(store.demo.get("a")!.values["goal.problem"]).toBeUndefined();
  });
  for (const lang of ["en", "bn", "mix"] as const) {
    it(`tiny action tap fills only the Do line; Save then stores it (${lang})`, () => {
      setup(lang); store.demo.put(rec("a", "goal", { "goal.title": "Shop" })); go("#/journey/goal/a");
      expect(app().querySelectorAll("[data-tiny-n]").length).toBe(5);
      (app().querySelector("[data-tiny-n='3']") as HTMLButtonElement).click();
      expect(inp("goal.wfd_do").value).toBe(PACKS[lang]["q2.tiny.3"]); expect(inp("goal.wfd_want").value).toBe("");
      expect(store.demo.get("a")!.values["goal.wfd_do"]).toBeUndefined();
      submit("want_feel_do"); expect(store.demo.get("a")!.values["goal.wfd_do"]).toMatchObject({ value: PACKS[lang]["q2.tiny.3"] });
    });
  }
});

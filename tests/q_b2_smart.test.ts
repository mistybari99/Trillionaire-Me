// Q-30 SMART wizard (five questions) and 7 yes/no checklist with Unknown allowed; the one-page form and funnel stay (batch 2).
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { render } from "../src/app";
import { store } from "../src/ui/state";
import { PACKS } from "../src/i18n/packs";
import { fieldById } from "../src/catalog/fields";
import { CHECK_ITEMS, checkSummary, parseCheck, serializeCheck, WIZARD_STEPS } from "../src/core/goalWorksheet";
import { SMART_FIELDS } from "../src/core/goalPlan";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" } as FieldValue);
const rec = (id: string, entity: string, vals: Record<string, unknown>): TMRecord => ({ id, entity, ns: "demo", ownerId: "demo-user", schemaVersion: 2, createdAt: "2026-11-01T00:00:00.000Z", values: Object.fromEntries(Object.entries(vals).map(([k, x]) => [k, v(x)])) } as TMRecord);
const app = () => document.getElementById("app")!;
const go = (h: string) => { location.hash = h; render(); };
const setup = (lang: string) => { localStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", lang); localStorage.setItem("tm:ui:dataMode", "demo"); };
const click = (sel: string) => (app().querySelector(sel) as HTMLElement).click();
const input = () => document.getElementById("q2-wz-input") as HTMLInputElement;
const own = (f: string) => store.demo.get("a")!.values[f];

describe("Q-30 core", () => {
  it("wizard has five questions that write the same fields the one-page form reads", () => {
    expect(WIZARD_STEPS.map((s) => s.field)).toEqual([...SMART_FIELDS.specific, ...SMART_FIELDS.measurable, ...SMART_FIELDS.achievable, ...SMART_FIELDS.relevant, "goal.target_date"]);
    expect(CHECK_ITEMS.length).toBe(7);
  });
  it("checklist codes round-trip; a broken value reads as all Unknown (fails closed)", () => {
    const a = parseCheck("y,n,u,y,u,u,n"); expect(a).toEqual(["yes", "no", "unknown", "yes", "unknown", "unknown", "no"]); expect(serializeCheck(a)).toBe("y,n,u,y,u,u,n");
    for (const bad of ["", "y,n", "y,n,u,y,u,u,x", "y,y,y,y,y,y,y,y"]) expect(parseCheck(bad)).toEqual(Array(7).fill("unknown"));
    expect(checkSummary(a)).toEqual({ yes: 2, no: 2, unknown: 3 });
  });
  it("smart_check is an optional catalog field", () => { const d = fieldById("goal.smart_check")!; expect(d.entity).toBe("goal"); expect(d.importance).toBe("optional"); });
});

describe("Q-30 wizard", () => {
  for (const lang of ["en", "bn", "mix"] as const) {
    it(`goes through five questions, saves into the SMART fields, ends calmly (${lang})`, () => {
      setup(lang); store.demo.put(rec("a", "goal", { "goal.title": "Shop" })); go("#/journey/goal/a");
      window.addEventListener("hashchange", () => render(), { once: true }); // main.ts does this in the real app
      expect(app().querySelector("[data-card=smart_wizard] h2")!.textContent).toBe(PACKS[lang]["q2.sm.h"]);
      expect(app().querySelector("[data-wizard-pos]")!.textContent).toBe(PACKS[lang]["q2.wz.of"].replace("{n}", "1").replace("{m}", "5"));
      const texts = ["Sell 20 items a week", "20 sales in a week", "I have 3 free hours", "For my family", "2027-03-01"];
      WIZARD_STEPS.forEach((s, i) => {
        expect(app().querySelector(`[data-wizard-step=${s.part}]`)).not.toBeNull();
        expect(input().type).toBe(s.kind); input().value = texts[i]!; click("[data-wz=next]");
        if (i < 4) expect(own(s.field)).toMatchObject({ state: "value", value: texts[i], label: "DEMO" });
      });
      expect(own("goal.target_date")).toMatchObject({ value: "2027-03-01" });
      expect(own("goal.why")).toMatchObject({ value: "For my family" });
      // finishing rebuilds the page: the one-page form now shows the answers and the funnel is full
      expect((document.getElementById("sm-s") as HTMLInputElement).value).toBe("Sell 20 items a week");
      expect(app().querySelector("[data-smart-funnel]")!.getAttribute("data-smart-funnel")).toBe("5");
      expect(app().querySelector("[data-wizard-done]")!.textContent).toBe(PACKS[lang]["q2.wz.done"]);
    });
  }
  it("Not sure, skip changes nothing; Back returns; a bad date is refused and nothing is saved", () => {
    setup("en"); store.demo.put(rec("a", "goal", { "goal.title": "Shop", "goal.smart_specific": "Keep me" })); go("#/journey/goal/a");
    input().value = ""; click("[data-wz=skip]"); expect(own("goal.smart_specific")).toMatchObject({ value: "Keep me" });
    expect(app().querySelector("[data-wizard-step=measurable]")).not.toBeNull(); expect(app().querySelector("[data-wz=back]")).not.toBeNull();
    click("[data-wz=back]"); expect(app().querySelector("[data-wizard-step=specific]")).not.toBeNull(); expect(input().value).toBe("Keep me");
    for (let i = 0; i < 4; i++) click("[data-wz=skip]");
    expect(app().querySelector("[data-wizard-step=timebound]")).not.toBeNull();
    input().value = "2027-13-45"; // a date input refuses an impossible date by itself, so nothing is saved
    expect(input().value).toBe(""); click("[data-wz=next]"); expect(own("goal.target_date")).toBeUndefined(); go("#/journey/goal/a"); // finishing asked for a page rebuild; do it here so the "Done" line is shown once and not left for the next test
  });
  it("a secret-looking answer is refused", () => {
    setup("en"); store.demo.put(rec("a", "goal", { "goal.title": "Shop" })); go("#/journey/goal/a");
    input().value = "password: hunter2 otp 123456"; click("[data-wz=next]"); expect(own("goal.smart_specific")).toBeUndefined();
  });
  it("the existing one-page form, funnel and SWOT are still on the page", () => {
    setup("en"); store.demo.put(rec("a", "goal", { "goal.title": "Shop" })); go("#/journey/goal/a");
    for (const s of ["form[data-form=smart]", "[data-smart-funnel]", "form[data-form=swot]"]) expect(app().querySelector(s), s).not.toBeNull();
  });
});

describe("Q-30 checklist", () => {
  for (const lang of ["en", "bn", "mix"] as const) {
    it(`seven questions, each Yes / No / Not sure, saved on tap, no score (${lang})`, () => {
      setup(lang); store.demo.put(rec("a", "goal", { "goal.title": "Shop" })); go("#/journey/goal/a"); click("[data-mode=chk]");
      expect(app().querySelectorAll("[data-check]").length).toBe(7);
      expect(app().querySelector("[data-check=date] p")!.textContent).toBe(PACKS[lang]["q2.ck.q.date"]);
      expect(app().querySelector("[data-check-sum]")!.textContent).toBe(PACKS[lang]["q2.ck.sum"].replace("{y}", "0").replace("{n}", "0").replace("{u}", "7"));
      click("[data-check=specific] [data-answer=yes]"); click("[data-check=reach] [data-answer=no]");
      expect(own("goal.smart_check")).toMatchObject({ value: "y,u,n,u,u,u,u", label: "DEMO" });
      expect(app().querySelector("[data-check=specific] [data-answer=yes]")!.getAttribute("aria-pressed")).toBe("true");
      expect(app().querySelector("[data-check-sum]")!.textContent).toBe(PACKS[lang]["q2.ck.sum"].replace("{y}", "1").replace("{n}", "1").replace("{u}", "5"));
      expect(app().querySelector("[data-card=smart_wizard]")!.textContent).not.toMatch(/\b\d+\s*(%|\/\s*7)|grade|score/i);
    });
  }
  it("saved answers come back after reopening the page", () => {
    setup("en"); store.demo.put(rec("a", "goal", { "goal.title": "Shop", "goal.smart_check": "n,y,u,u,u,u,y" })); go("#/journey/goal/a"); click("[data-mode=chk]");
    expect(app().querySelector("[data-check=measure] [data-answer=yes]")!.getAttribute("aria-pressed")).toBe("true");
    expect(app().querySelector("[data-check=written] [data-answer=yes]")!.getAttribute("aria-pressed")).toBe("true");
    expect(app().querySelector("[data-check=first] [data-answer=unknown]")!.getAttribute("aria-pressed")).toBe("true");
  });
});

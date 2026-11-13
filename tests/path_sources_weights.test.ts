// M04 sources and weights, end to end: every path entry carries a source and a date and goes stale when old; the weights behind the order are
// shown, changeable and resettable; a match shows its strength; halal-check questions are linked from each card; the user's own venture is an option.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import { PACKS } from "../src/i18n/packs";
import { SOURCE_WEIGHT, assessmentFrom, parseWeight, pathFit, weightsFrom } from "../src/core/assessment";
import { PATHS, PATH_STALE_DAYS, PATH_WRITTEN_ON } from "../src/library/paths";
import { freshnessOf } from "../src/core/freshness";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" }) as FieldValue;
const rec = (id: string, entity: string, values: Record<string, FieldValue>): TMRecord => ({ id, entity, ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-11-02T08:00:00.000Z", values });
const skill = (id: string, name: string) => rec(id, "skill", { "skill.name": v(name) });
const interest = (id: string, name: string) => rec(id, "interest", { "interest.topic": v(name) });
const weightsRec = (o: Record<string, number>) => rec("pw", "path_weights", Object.fromEntries(Object.entries(o).map(([k, n]) => [`path_weights.${k}`, v(n)])));

describe("sources and dates (pure)", () => {
  it("every built-in path has a source text in both languages and a readable date", () => {
    expect(PATHS.length).toBeGreaterThan(0);
    for (const p of PATHS) { expect(p.source.bn.length).toBeGreaterThan(5); expect(p.source.en.length).toBeGreaterThan(5); expect(p.writtenOn).toBe(PATH_WRITTEN_ON); expect(Number.isNaN(Date.parse(p.writtenOn))).toBe(false); }
  });
  it("an entry is recent for 180 days, then stale; an unreadable date is unknown, never recent", () => {
    const day = (n: number) => new Date(Date.parse(PATH_WRITTEN_ON) + n * 86400000);
    expect(PATH_STALE_DAYS).toBe(180);
    expect(freshnessOf(PATH_WRITTEN_ON, day(10), PATH_STALE_DAYS)).toBe("recent"); expect(freshnessOf(PATH_WRITTEN_ON, day(181), PATH_STALE_DAYS)).toBe("stale");
    expect(freshnessOf("not a date", day(1), PATH_STALE_DAYS)).toBe("unknown");
  });
});

describe("weights (pure)", () => {
  it("no record: built-in weights, not custom", () => { expect(weightsFrom([])).toEqual({ weights: SOURCE_WEIGHT, custom: false }); });
  it("a saved weight replaces only itself; out-of-range or non-integer values are ignored", () => {
    expect(weightsFrom([weightsRec({ skill: 5 })])).toEqual({ weights: { skill: 5, interest: 2, strength: 1 }, custom: true });
    expect(weightsFrom([weightsRec({ skill: 0, interest: 11, strength: 2.5 })])).toEqual({ weights: SOURCE_WEIGHT, custom: false });
  });
  it("parseWeight: blank = built-in, 1-10 whole numbers, Bangla digits accepted, anything else invalid", () => {
    expect(parseWeight("")).toBeNull(); expect(parseWeight("4")).toBe(4); expect(parseWeight("১০")).toBe(10);
    for (const bad of ["0", "11", "2.5", "x", "-1"]) expect(parseWeight(bad), bad).toBeUndefined();
  });
  it("weights change the order of paths, and the same input gives the same order each time", () => {
    const a = assessmentFrom([skill("s1", "Excel bookkeeping"), interest("i1", "Drawing")]);
    const base = pathFit(a); const heavyInterest = pathFit(a, undefined, { skill: 1, interest: 9, strength: 1 });
    expect(base.matches[0]!.path.id).not.toBe(heavyInterest.matches[0]!.path.id);
    expect(pathFit(a, undefined, { skill: 1, interest: 9, strength: 1 }).matches.map((m) => m.path.id)).toEqual(heavyInterest.matches.map((m) => m.path.id));
    expect(base.matches[0]!.weight).toBeGreaterThan(0);
  });
});

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector(sel) as T | null;
const go = (h: string) => { location.hash = h; render(); };
const set = (id: string, val: string) => { (document.getElementById(id) as HTMLInputElement).value = val; };
const submit = (sel: string) => { $<HTMLFormElement>(sel)!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true })); };
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>';
  localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, "2026-11-02T00:00:00.000Z");
});
const seed = () => { store.demo.put(skill("s1", "Excel bookkeeping")); store.demo.put(interest("i1", "Drawing")); };

describe("Plan screen cards", () => {
  it("each matched path shows its source, date, match strength, the weight of each reason, and a halal-check link", () => {
    seed(); go("#/diary/plan");
    const c = $("[data-path]")!; expect(c).not.toBeNull();
    expect(c.querySelector("[data-path-source]")!.textContent).toMatch(/Built-in draft written by the builder/); expect(c.querySelector("[data-path-source]")!.textContent).toContain(PATH_WRITTEN_ON);
    expect(c.querySelector("[data-match-weight]")!.textContent).toMatch(/Match strength: \d+/);
    expect(c.querySelector("[data-reason]")!.textContent).toMatch(/weight \d/);
    expect(c.querySelector("a[data-halal-link]")!.getAttribute("href")).toBe("#/more/halal-flags");
    expect(c.textContent).toMatch(/Not a fatwa/);
  });
  it("saving a weight changes the card text and the order; resetting returns to the built-in ones", () => {
    seed(); go("#/diary/plan");
    expect($("[data-path-weights]")!.getAttribute("data-path-weights")).toBe("default"); expect($("[data-weights-now]")!.getAttribute("data-weights-now")).toBe("3,2,1");
    set("pw-skill", "1"); set("pw-interest", "9"); submit('form[data-form="path-weights"]'); render();
    expect($("[data-path-weights]")!.getAttribute("data-path-weights")).toBe("custom"); expect($("[data-weights-now]")!.getAttribute("data-weights-now")).toBe("1,9,1");
    expect(weightsFrom(store.demo.list()).weights).toEqual({ skill: 1, interest: 9, strength: 1 });
    $<HTMLButtonElement>('[data-act="pw-reset"]')!.click(); render();
    expect($("[data-path-weights]")!.getAttribute("data-path-weights")).toBe("default"); expect(store.demo.list().filter((r) => r.entity === "path_weights").length).toBe(0);
  });
  it("a weight outside 1-10 is refused in calm text and nothing is saved", () => {
    seed(); go("#/diary/plan"); set("pw-skill", "11"); submit('form[data-form="path-weights"]');
    expect($('[data-err="weights"]')!.textContent).toMatch(/whole number from 1 to 10/); expect(store.demo.list().filter((r) => r.entity === "path_weights").length).toBe(0);
    expect($("[data-assessment] .err")).toBeNull();
  });
  it("saving the built-in numbers again stores nothing (no custom flag for the defaults)", () => {
    seed(); go("#/diary/plan"); submit('form[data-form="path-weights"]'); expect(store.demo.list().filter((r) => r.entity === "path_weights").length).toBe(0);
  });
  it("real mode without the tick saves no weight", () => {
    localStorage.setItem("tm:ui:dataMode", "real"); localStorage.removeItem("tm:consent:real:v1");
    go("#/diary/plan"); set("pw-skill", "5"); submit('form[data-form="path-weights"]'); expect(store.real.list().length).toBe(0);
  });
  it("the user's own venture is listed as an option, unranked; nothing without a venture", () => {
    seed(); go("#/diary/plan"); expect($("[data-own-options]")).toBeNull();
    store.demo.put(rec("v1", "venture", { "venture.name": v("My tailoring shop"), "venture.stage": v("running") })); go("#/diary/plan");
    expect($('[data-own-option="v1"]')!.textContent).toMatch(/My tailoring shop/); expect($('[data-own-options]')!.textContent).toMatch(/no number and no order/);
  });
});

describe("words and a11y", () => {
  it("keys in en, bn, mix; Bangla loanword rule; no Bangla digits", () => {
    const keys = Object.keys(PACKS.en).filter((k) => /^fit\.(matchWeight|weightOf|source|stale|dateUnknown|halal|w\.|own\.)/.test(k));
    expect(keys.length).toBeGreaterThanOrEqual(18);
    for (const k of keys) { for (const l of ["en", "bn", "mix"] as const) { const s = (PACKS[l] as Record<string, string>)[k]!; expect(s.length, `${l}:${k}`).toBeGreaterThan(1); if (l !== "en") expect(s, `${l}:${k}`).not.toMatch(/[০-৯]/); }
      expect((PACKS.bn as Record<string, string>)[k], k).not.toMatch(/পরিকল্পনা|ঝুঁকি|প্রতিবেদন|আয়\b|উৎস/); }
  });
  it("labelled weight inputs; Bangla and mix pages draw", () => {
    seed();
    for (const l of ["en", "bn", "mix"]) { localStorage.setItem("tm:ui:lang", l); go("#/diary/plan"); for (const s of ["skill", "interest", "strength"]) expect(document.querySelector(`label[for="pw-${s}"]`), `${l}:${s}`).not.toBeNull(); expect($("[data-path-source]")).not.toBeNull(); }
  });
});

// M03 North Star current value and metric weights, end to end: form -> storage -> progress (typed or taken from Money / Ventures) -> weighted overall ->
// page, Journey, Today, report. Unknown is never 0. Weights are the user's own. EN / BN / mix, real mode needs the consent tick.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { ROUTES, render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import { PACKS, type Key } from "../src/i18n/packs";
import { ladder, nowOf, overallProgress, parseWeight, progressOf, starRows, starViews } from "../src/core/northStar";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" }) as FieldValue;
const UNK: FieldValue = { state: "unknown" };
const rec = (id: string, entity: string, values: Record<string, FieldValue>, links?: Record<string, string>): TMRecord => ({ id, entity, ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-11-02T08:00:00.000Z", values, ...(links ? { links } : {}) });
const star = (id: string, o: { metric?: string; base?: number | null; target?: number | null; current?: number; source?: string; weight?: number; unit?: string }) => rec(id, "north_star", {
  "north_star.metric": v(o.metric ?? id), "north_star.baseline": o.base === null ? UNK : v(o.base ?? 0), "north_star.target": o.target === null ? UNK : v(o.target ?? 100),
  ...(o.current !== undefined ? { "north_star.current": v(o.current), "north_star.current_on": v("2026-11-01") } : {}), ...(o.source ? { "north_star.source": v(o.source) } : {}),
  ...(o.weight !== undefined ? { "north_star.weight": v(o.weight) } : {}), ...(o.unit ? { "north_star.unit": v(o.unit) } : {}) });
const fin = (id: string, kind: string, scope: string, amount: number | null) => rec(id, "finance_item", { "finance.kind": v(kind), "finance.scope": v(scope), "finance.label": v(id), "finance.amount": amount === null ? UNK : v(amount), "finance.period": v("monthly") });
const venture = (id: string, valuation: number | null, own: number | null) => rec(id, "venture", { "venture.name": v(id), ...(valuation !== null ? { "venture.valuation": v(valuation) } : {}), ...(own !== null ? { "venture.ownership_pct": v(own) } : {}) });
const on = (r: TMRecord) => starViews([r])[0]!;

describe("where I am now", () => {
  it("typed number: shown as typed; blank is Unknown (not entered), never 0", () => {
    expect(on(star("a", { current: 40 })).now).toEqual({ state: "value", value: 40, source: "own", asOf: "2026-11-01" });
    expect(on(star("b", {})).now).toEqual({ state: "unknown", why: "not_entered", source: "own" });
    expect(on(star("z", { current: 0 })).now).toMatchObject({ state: "value", value: 0 });   // a real zero is a value
  });
  it("net worth source: from the Money screen (personal or business); no lines is Unknown; an unknown amount is Unknown", () => {
    const s = star("n", { source: "net_worth" });
    expect(nowOf(starRows([s])[0]!, [s])).toEqual({ state: "unknown", why: "no_money_lines", source: "net_worth" });
    const recs = [s, fin("a", "asset", "personal", 500), fin("l", "liability", "personal", 120), fin("ba", "asset", "business", 9000)];
    expect(nowOf(starRows([s])[0]!, recs)).toEqual({ state: "value", value: 380, source: "net_worth", asOf: null });
    const b = star("b", { source: "business_net_worth" }); expect(nowOf(starRows([b])[0]!, [b, ...recs])).toMatchObject({ value: 9000 });
    expect(nowOf(starRows([s])[0]!, [...recs, fin("u", "asset", "personal", null)])).toEqual({ state: "unknown", why: "incomplete", source: "net_worth" });
  });
  it("venture sources: total value and my share, only when every venture has the figure", () => {
    const s = star("v", { source: "venture_value" }), sh = star("h", { source: "venture_share" });
    expect(nowOf(starRows([s])[0]!, [s])).toEqual({ state: "unknown", why: "no_ventures", source: "venture_value" });
    const two = [s, venture("a", 1000, 50), venture("b", 3000, 10)];
    expect(nowOf(starRows([s])[0]!, two)).toMatchObject({ state: "value", value: 4000 });
    expect(nowOf(starRows([sh])[0]!, [sh, ...two.slice(1)])).toMatchObject({ state: "value", value: 800 });
    expect(nowOf(starRows([s])[0]!, [s, venture("a", 1000, 50), venture("c", null, 10)])).toEqual({ state: "unknown", why: "incomplete", source: "venture_value", known: 1, of: 2 });
  });
});

describe("progress", () => {
  const val = (n: number) => ({ state: "value", value: n, source: "own", asOf: null }) as const;
  it("works from start to target; counts the steps passed; reaching it is said calmly", () => {
    expect(progressOf(0, 100, val(50))).toEqual({ state: "value", pct: 50, reached: false, below: false, passed: 2, of: 4 });
    expect(progressOf(0, 100, val(100))).toMatchObject({ pct: 100, reached: true, passed: 4 });
    expect(progressOf(0, 100, val(250))).toMatchObject({ pct: 100, reached: true });
  });
  it("below the starting number is not a failure state: 0 percent with a flag", () => {
    expect(progressOf(10, 100, val(5))).toMatchObject({ pct: 0, below: true, passed: 0 });
  });
  it("a target below the start works too (bringing a number down)", () => {
    expect(progressOf(1000, 0, val(400))).toMatchObject({ pct: 60, reached: false });
  });
  it("unknown start, target or now gives no percent, and names what is missing", () => {
    expect(progressOf(null, 100, val(5))).toEqual({ state: "unknown", missing: ["baseline"] });
    expect(progressOf(0, null, { state: "unknown", why: "not_entered", source: "own" })).toEqual({ state: "unknown", missing: ["target", "current"] });
    expect(progressOf(5, 5, val(5))).toEqual({ state: "same" });
  });
  it("the ladder is unchanged", () => { expect(ladder(0, 100)).toEqual({ status: "ok", levels: [0, 25, 50, 75, 100] }); });
});

describe("weights and the overall figure", () => {
  const two = (w1?: number, w2?: number) => starViews([star("a", { current: 100, weight: w1 }), star("b", { current: 0, weight: w2 })]);
  it("weighted by the user's own weights; blank counts equally", () => {
    expect(overallProgress(two())).toEqual({ state: "value", pct: 50, weights: [{ id: "a", share: 50 }, { id: "b", share: 50 }] });
    expect(overallProgress(two(75, 25))).toMatchObject({ state: "value", pct: 75 });
    expect(overallProgress(two(1, 99))).toMatchObject({ pct: 1 });
    expect(overallProgress(two(60, undefined))).toMatchObject({ pct: 98 });     // 60 against the default 1
  });
  it("no overall figure unless every measure has a progress figure; it says how many do, never counts the rest as 0", () => {
    const views = starViews([star("a", { current: 100 }), star("b", {})]);
    expect(overallProgress(views)).toEqual({ state: "incomplete", known: 1, of: 2 });
    expect(overallProgress(starViews([star("a", { current: 100 })]))).toEqual({ state: "none" });
    expect(overallProgress([])).toEqual({ state: "none" });
  });
  it("weights are 1 to 100; Bangla digits accepted; blank is unknown", () => {
    expect(parseWeight("")).toEqual({ state: "unknown" }); expect(parseWeight("০")).toBeNull(); expect(parseWeight("0")).toBeNull(); expect(parseWeight("101")).toBeNull(); expect(parseWeight("abc")).toBeNull();
    expect(parseWeight("৬০")).toEqual({ state: "value", value: 60 }); expect(parseWeight("1")).toEqual({ state: "value", value: 1 });
  });
  it("a stored weight outside 1..100 is ignored, not trusted", () => { expect(starRows([star("a", { weight: 500 })])[0]!.weight).toBeNull(); });
});

// ---------------------------------------------------------------- screens
const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector(sel) as T | null;
const set = (id: string, value: string) => { ($(`#${id}`) as HTMLInputElement).value = value; };
const go = (h: string) => { location.hash = h; render(); };
const raw = (sel: string) => $<HTMLFormElement>(sel)!.dispatchEvent(new Event("submit", { cancelable: true }));
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>';
  localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, "2026-11-02T00:00:00.000Z");
});

describe("North Star screens (demo mode)", () => {
  it("the form has a label for every input; blank 'now' and weight are allowed; the measure is saved with its source", () => {
    go("#/journey/northstar");
    for (const id of ["ns-metric", "ns-unit", "ns-base", "ns-target", "ns-source", "ns-current", "ns-weight"]) expect($(`label[for="${id}"]`), id).not.toBeNull();
    set("ns-metric", "Net worth"); set("ns-base", "0"); set("ns-target", "1000"); set("ns-source", "net_worth"); raw("form[data-form=north-star]");
    const r = store.demo.list().filter((x) => x.entity === "north_star"); expect(r).toHaveLength(1);
    expect(r[0]!.values["north_star.source"]).toMatchObject({ value: "net_worth", label: "DEMO" }); expect(r[0]!.values["north_star.current"]).toBeUndefined(); expect(r[0]!.values["north_star.weight"]).toBeUndefined();
  });
  it("bad numbers and weights are refused with a message and nothing is saved; a secret-like name is refused", () => {
    go("#/journey/northstar"); set("ns-metric", "X"); set("ns-current", "abc"); raw("form[data-form=north-star]"); expect($("form[data-form=north-star] .err")!.textContent).toMatch(/Numbers only/);
    set("ns-current", ""); set("ns-weight", "0"); raw("form[data-form=north-star]"); expect($("form[data-form=north-star] .err")!.textContent).toMatch(/1 to 100/);
    set("ns-weight", ""); set("ns-metric", "my password is hunter2"); raw("form[data-form=north-star]"); expect($("form[data-form=north-star] .err")!.textContent).not.toBe("");
    expect(store.demo.list().filter((x) => x.entity === "north_star")).toHaveLength(0);
  });
  it("typed 'now' number: progress, steps passed and the date are saved and shown on the page", () => {
    go("#/journey/northstar"); set("ns-metric", "Customers"); set("ns-base", "0"); set("ns-target", "100"); set("ns-current", "50"); set("ns-weight", "40"); raw("form[data-form=north-star]"); render();
    const c = $('[data-north-star]')!; expect(c.textContent).toMatch(/Now: 50/); expect(c.textContent).toMatch(/50% of the way/); expect(c.textContent).toMatch(/passed 2 of 4 steps/);
    expect(c.querySelector('[data-star-bar="50"]')!.getAttribute("aria-label")).toMatch(/50 percent/); expect(c.querySelector("[data-weight]")!.textContent).toBe("Weight: 40");
    expect(store.demo.list().find((x) => x.entity === "north_star")!.values["north_star.current_on"]).toMatchObject({ state: "value", label: "DEMO" });
  });
  it("taken from Money: no lines is Unknown with a sentence; after adding lines the figure and progress appear, labelled as an estimate", () => {
    store.demo.put(star("n", { metric: "Net worth", base: 0, target: 1000, source: "net_worth" }));
    go("#/journey/northstar"); expect($('[data-now-unknown="no_money_lines"]')!.textContent).toBe("No asset or liability lines on the Money screen yet");
    expect($('[data-star-text="unknown"]')!.textContent).toMatch(/where you are now/); expect($("[data-star-bar]")).toBeNull();
    store.demo.put(fin("a", "asset", "personal", 250)); render();
    expect($('[data-north-star="n"]')!.textContent).toMatch(/25% of the way/); expect($('[data-now-source="net_worth"]')).not.toBeNull();
    expect($('[data-north-star="n"] [data-label="ESTIMATE"]')).not.toBeNull();
  });
  it("taken from Ventures: an incomplete set says how many have the figure", () => {
    store.demo.put(star("s", { metric: "Ventures", base: 0, target: 100, source: "venture_value" })); store.demo.put(venture("a", 20, 50)); store.demo.put(venture("b", null, 50));
    go("#/journey/northstar"); expect($('[data-now-unknown="incomplete"]')!.textContent).toBe("Not complete yet: 1 of 2 ventures have this figure");
  });
  it("two measures: weights give one overall figure on the page, Journey, Today and the report; one unknown measure removes it and says why", () => {
    store.demo.put(star("a", { metric: "Alpha", current: 100, weight: 75 })); store.demo.put(star("b", { metric: "Beta", current: 0, weight: 25 }));
    for (const [p, sel] of [["#/journey/northstar", "[data-overall=value]"], ["#/journey", '[data-star-card="journey"] [data-overall=value]'], ["#/today", '[data-star-card="today"] [data-overall=value]'], ["#/journey/report", '[data-star-card="report"] [data-overall=value]']] as const) {
      go(p); expect($(sel), p).not.toBeNull(); expect($(sel)!.textContent, p).toMatch(/Overall progress: 75%/);
    }
    store.demo.put(star("c", { metric: "Gamma" })); go("#/today");
    expect($('[data-star-card="today"] [data-overall=incomplete]')!.textContent).toMatch(/2 of 3 measures/); expect($("[data-overall=value]")).toBeNull();
  });
  it("Today and Journey stay quiet with no measure; Today shows at most 3 rows and says how many more", () => {
    go("#/today"); expect($("[data-star-card]")).toBeNull(); go("#/journey"); expect($("[data-star-card]")).toBeNull();
    for (const id of ["a", "b", "c", "d"]) store.demo.put(star(id, { current: 10 }));
    go("#/today"); expect(document.querySelectorAll('[data-star-card="today"] .star-row')).toHaveLength(3); expect($('[data-star-card="today"]')!.textContent).toMatch(/and 1 more measures/);
  });
  it("edit: change start, target, source, now number and weight; blank is Unknown; the date follows a changed number", () => {
    store.demo.put(star("e", { metric: "Sales", base: 0, target: 100, current: 10 }));
    go("#/journey/northstar");
    set("ns-ec-e", "30"); set("ns-ew-e", "20"); set("ns-et-e", "200"); raw('form[data-star-edit="e"]');
    let r = store.demo.get("e")!;
    expect(r.values["north_star.current"]).toMatchObject({ value: 30 }); expect(r.values["north_star.weight"]).toMatchObject({ value: 20 }); expect(r.values["north_star.target"]).toMatchObject({ value: 200 });
    render(); set("ns-ec-e", ""); set("ns-ew-e", ""); raw('form[data-star-edit="e"]'); r = store.demo.get("e")!;
    expect(r.values["north_star.current"]).toEqual({ state: "unknown" }); expect(r.values["north_star.weight"]).toEqual({ state: "unknown" });
    render(); set("ns-ec-e", "-"); raw('form[data-star-edit="e"]'); expect($('form[data-star-edit="e"] .err')!.textContent).toMatch(/Numbers only/);
  });
  it("changing the source to a linked one keeps the typed number untouched but stops using it", () => {
    store.demo.put(star("e", { metric: "Worth", base: 0, target: 1000, current: 900 }));
    go("#/journey/northstar"); set("ns-es-e", "net_worth"); raw('form[data-star-edit="e"]'); render();
    expect(store.demo.get("e")!.values["north_star.current"]).toMatchObject({ value: 900 }); expect($('[data-now-unknown="no_money_lines"]')).not.toBeNull();
  });
  it("links to Money and Ventures, and the card links back; nothing red or punishing", () => {
    store.demo.put(star("a", { current: 5 }));
    go("#/journey/northstar"); expect($('a[href="#/diary/money"]')).not.toBeNull(); expect($('a[href="#/diary/ventures"]')).not.toBeNull();
    go("#/journey"); expect($('[data-star-card="journey"] a[href="#/journey/northstar"]')).not.toBeNull();
    expect($("main")!.textContent).not.toMatch(/fail|behind|overdue|missed|lost/i);
  });
  it("remove deletes only that measure", () => {
    store.demo.put(star("a", {})); store.demo.put(star("b", {})); go("#/journey/northstar"); $<HTMLButtonElement>('[data-remove="a"]')!.click();
    expect(store.demo.list().filter((x) => x.entity === "north_star").map((x) => x.id)).toEqual(["b"]);
  });
});

describe("real mode and languages", () => {
  it("without the consent tick nothing is saved; with it the record is real (FACT); demo measures never show", () => {
    localStorage.setItem("tm:ui:dataMode", "real");
    for (const k of Object.keys(localStorage)) if (k.includes("consent")) localStorage.removeItem(k);
    go("#/journey/northstar"); expect($("[data-consent-prompt]")).not.toBeNull();
    set("ns-metric", "Worth"); raw("form[data-form=north-star]"); expect(store.real.list().length + store.demo.list().length).toBe(0);
    grantConsent(consentKv, "2026-11-02T00:00:00.000Z"); store.demo.put(star("d", { metric: "Demo only" }));
    go("#/journey/northstar"); set("ns-metric", "Worth"); set("ns-current", "5"); raw("form[data-form=north-star]");
    const r = store.real.list().filter((x) => x.entity === "north_star"); expect(r).toHaveLength(1); expect(r[0]!.values["north_star.current"]).toMatchObject({ label: "FACT" });
    render(); expect(document.body.textContent).not.toMatch(/Demo only/);
  });
  it("edit in real mode without the tick saves nothing", () => {
    localStorage.setItem("tm:ui:dataMode", "real"); grantConsent(consentKv, "2026-11-02T00:00:00.000Z");
    go("#/journey/northstar"); set("ns-metric", "Worth"); raw("form[data-form=north-star]"); render();
    const id = store.real.list().find((x) => x.entity === "north_star")!.id;
    for (const k of Object.keys(localStorage)) if (k.includes("consent")) localStorage.removeItem(k);
    go("#/journey/northstar"); set(`ns-ec-${id}`, "99"); raw(`form[data-star-edit="${id}"]`);
    expect(store.real.get(id)!.values["north_star.current"]).toBeUndefined();
  });
  const KEYS = Object.keys(PACKS.en).filter((k) => k.startsWith("ns.")) as Key[];
  it("every ns text exists in English, Bangla and Mix with the same placeholders; loanwords are used", () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    for (const k of KEYS) { expect(PACKS.bn[k]?.trim(), k).toBeTruthy(); expect(PACKS.mix[k]?.trim(), k).toBeTruthy(); expect(ph(PACKS.bn[k]), k).toBe(ph(PACKS.en[k])); }
    const bn = KEYS.map((k) => PACKS.bn[k]).join(" ");
    for (const bad of ["কর্মী", "পরিকল্পনা", "দক্ষতা", "ঝুঁকি", "অগ্রগতি", "বিকল্প", "সংরক্ষণ", "বিজ্ঞপ্তি", "মুছুন", "সংস্করণ", "তালিকা"]) expect(bn, bad).not.toContain(bad);
    expect(PACKS.bn["ns.overall"]).toContain("প্রোগ্রেস"); expect(PACKS.mix["ns.overall"]).toContain("Progress");
  });
  for (const lang of ["bn", "mix"] as const) it(`the page and cards render in ${lang} with Latin digits and no raw keys`, () => {
    localStorage.setItem("tm:ui:lang", lang);
    store.demo.put(star("a", { metric: "Alpha", current: 100, weight: 75 })); store.demo.put(star("b", { metric: "Beta", source: "net_worth" }));
    for (const p of ["#/journey/northstar", "#/journey", "#/today", "#/journey/report"]) { go(p); expect(document.body.textContent, p).not.toMatch(/[০-৯]|\bns\.[a-z]/); }
    expect(ROUTES.some(([re]) => re.test("/journey/northstar"))).toBe(true);
  });
});

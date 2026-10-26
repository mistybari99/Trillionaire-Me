// Step 5: life wheel, SWOT, SMART guide, goal progress, micro-animations. Unknown is never 0; demo and real never mix.
import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { store, consentKv } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import type { FieldValue, Namespace, TMRecord } from "../src/core/types";
import { AREAS, lifeAreaRecord, wedgePath, wheelData } from "../src/core/lifeWheel";
import { goalProgress, listValue, milestoneOf, parseList, readList, smartFilled } from "../src/core/goalPlan";
import { FIELDS } from "../src/catalog/fields";
import { entityById } from "../src/schema/entities";
import { validateCatalog } from "../src/catalog/validate";

const NOW = "2026-10-26T00:00:00.000Z";
const mk = (ns: Namespace, id: string, entity: string, values: Record<string, unknown>, links?: Record<string, string>): TMRecord => {
  const label = ns === "demo" ? "DEMO" : "FACT"; const vals: Record<string, FieldValue> = {};
  for (const [k, x] of Object.entries(values)) vals[k] = (x === null ? { state: "unknown" } : { state: "value", value: x, label }) as FieldValue;
  return { id, entity, ns, ownerId: ns === "demo" ? "demo-user" : "owner", schemaVersion: 1, createdAt: NOW, values: vals, ...(links ? { links } : {}) };
};
const go = (hash: string) => { location.hash = hash; render(); };
const app = () => document.getElementById("app")!;
const click = (sel: string) => (app().querySelector(sel) as HTMLElement).click();
const submit = (sel: string) => (app().querySelector(sel) as HTMLFormElement).dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
const setVal = (sel: string, v: string) => { (app().querySelector(sel) as HTMLInputElement).value = v; };
const lines = (k: string) => [...app().querySelectorAll(`[data-chart=${k}] [data-chart-text] li`)].map((l) => l.textContent);

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear();
  document.body.innerHTML = '<div id="app"></div>';
  localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, NOW);
});

describe("catalog", () => {
  it("new entity and fields are declared, bilingual and valid", () => {
    expect(entityById("life_area")).toBeDefined();
    for (const id of ["life_area.key", "life_area.rating", "goal.smart_specific", "goal.smart_achievable", "goal.swot_strengths", "goal.swot_weaknesses", "goal.swot_opportunities", "goal.swot_threats"]) expect(FIELDS.some((f) => f.id === id), id).toBe(true);
    expect(validateCatalog().problems).toEqual([]);
  });
});

describe("life wheel: data", () => {
  it("no records: every area unknown, nothing is 0", () => {
    const d = wheelData([]); expect(d.rated).toBe(0); expect(d.unknown).toBe(7); expect(d.areas.every((a) => a.rating === null && !a.answered)).toBe(true);
  });
  it("partial: rated and unknown are kept apart; invalid values read as unknown", () => {
    const rec = (a: string, v: unknown) => mk("demo", `life-${a}`, "life_area", { "life_area.key": a, "life_area.rating": v });
    const d = wheelData([rec("health", 4), rec("money", null), rec("family", 0), rec("work", 9), rec("rest", 2.5)]);
    expect(d.areas.find((a) => a.area === "health")!.rating).toBe(4);
    expect(d.areas.find((a) => a.area === "money")).toMatchObject({ rating: null, answered: true });
    expect(d.rated).toBe(1); expect(d.unknown).toBe(6);
  });
  it("record builder stores unknown, never 0; wedge path is a closed sector", () => {
    expect(lifeAreaRecord("rest", null, NOW).values["life_area.rating"]).toEqual({ state: "unknown" });
    expect(lifeAreaRecord("rest", 0, NOW).values["life_area.rating"]).toEqual({ state: "unknown" });
    expect(lifeAreaRecord("rest", 3, NOW).values["life_area.rating"]).toMatchObject({ state: "value", value: 3 });
    expect(wedgePath(0, 0, 10, 0, 7)).toMatch(/^M0 0 L.* A10 10 0 0 1 .* Z$/);
  });
});

describe("life wheel: screen", () => {
  it("none: all unknown, text equivalent says so, no total anywhere", () => {
    go("#/journey/wheel");
    expect(app().querySelector("[data-wheel-none]")).not.toBeNull();
    expect(app().querySelectorAll("[data-unknown]")).toHaveLength(7);
    expect(lines("wheel")).toHaveLength(7); expect(lines("wheel").every((l) => l!.endsWith("unknown"))).toBe(true);
    expect(app().textContent).not.toMatch(/total:|\btotal\s*\d/i);
  });
  it("tap saves a number; Not sure saves unknown; text equals the drawing", () => {
    go("#/journey/wheel");
    click("[data-wheel-area=health] [data-set='4']"); click("[data-wheel-area=money] [data-set=unknown]"); render();
    expect(store.demo.get("life-health")!.values["life_area.rating"]).toMatchObject({ state: "value", value: 4, label: "DEMO" });
    expect(store.demo.get("life-money")!.values["life_area.rating"]).toEqual({ state: "unknown" });
    expect(app().querySelector("[data-area=health]")!.getAttribute("data-level")).toBe("4");
    expect(app().querySelectorAll("[data-unknown]")).toHaveLength(6);
    expect(lines("wheel")[0]).toBe("Health: 4 of 5"); expect(lines("wheel")[1]).toBe("Money: unknown");
    expect(app().querySelector("[data-chart-summary=wheel]")!.textContent).toContain("1 of 7 areas have a number");
    expect(app().querySelector("[data-wheel-area=health] [data-set='4']")!.getAttribute("aria-pressed")).toBe("true");
  });
  it("mode isolation: real mode shows no demo rating and demo shows no real one", () => {
    store.demo.put(mk("demo", "life-health", "life_area", { "life_area.key": "health", "life_area.rating": 5 }));
    store.real.put(mk("real", "life-work", "life_area", { "life_area.key": "work", "life_area.rating": 2 }));
    go("#/journey/wheel"); expect(lines("wheel")[0]).toBe("Health: 5 of 5"); expect(lines("wheel")[3]).toBe("Work: unknown");
    localStorage.setItem("tm:ui:dataMode", "real"); go("#/journey/wheel"); expect(lines("wheel")[0]).toBe("Health: unknown"); expect(lines("wheel")[3]).toBe("Work: 2 of 5");
  });
  it("real mode without consent saves nothing", () => {
    localStorage.clear(); localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "real");
    go("#/journey/wheel"); expect(app().querySelector("[data-consent-prompt]")).not.toBeNull();
    click("[data-wheel-area=health] [data-set='3']"); expect(store.real.list()).toHaveLength(0); expect(app().querySelector(".err")!.textContent).toContain("Nothing saved");
  });
  it("Bangla copy has Latin digits and all seven names", () => {
    localStorage.setItem("tm:ui:lang", "bn"); go("#/journey/wheel");
    expect(app().textContent).toContain("জীবনের চক্র"); expect(app().textContent).not.toMatch(/[০-৯]/); expect(AREAS).toHaveLength(7);
  });
});

describe("goal progress", () => {
  const g = (id: string) => mk("demo", id, "goal", { "goal.title": id.toUpperCase() });
  it("data, partial and none", () => {
    const r = goalProgress([g("g1"), g("g2"), g("g3"), mk("demo", "a", "task", { "task.done_on": "2026-10-01" }, { goal: "g1" }), mk("demo", "b", "task", { "task.title": "x" }, { goal: "g1" }), mk("demo", "c", "task", { "task.done_on": "2026-10-02" }, { goal: "g3" })]);
    expect(r.map((x) => x.percent)).toEqual([50, null, 100]); expect(r[1]).toMatchObject({ done: 0, total: 0 });
    expect(milestoneOf(null)).toBeNull(); expect(milestoneOf(10)).toBeNull(); expect(milestoneOf(50)).toBe(50); expect(milestoneOf(100)).toBe(100);
  });
  it("Report rings and Journey show the same number; unknown shows as unknown", () => {
    store.demo.put(g("g1")); store.demo.put(g("g2"));
    store.demo.put(mk("demo", "a", "task", { "task.done_on": "2026-10-01" }, { goal: "g1" })); store.demo.put(mk("demo", "b", "task", { "task.title": "x" }, { goal: "g1" }));
    go("#/journey/report"); expect(app().querySelector("[data-goal-ring=g1] [data-percent]")!.getAttribute("data-percent")).toBe("50"); expect(app().querySelector("[data-goal-ring=g2] [data-unknown]")).not.toBeNull();
    go("#/journey");
    expect(app().querySelector("[data-journey-goal=g1]")!.getAttribute("data-percent")).toBe("50");
    expect(app().querySelector("[data-journey-goal=g2]")!.getAttribute("data-percent")).toBe("unknown");
    expect(app().querySelector("[data-journey-goal=g2]")!.textContent).toContain("progress unknown");
  });
  it("Journey with no goals says so; mode isolation", () => {
    go("#/journey"); expect(app().querySelector("[data-journey-goals]")!.textContent).toContain("No goals yet");
    store.real.put(mk("real", "g9", "goal", { "goal.title": "RealGoal" })); go("#/journey"); expect(app().textContent).not.toContain("RealGoal");
    localStorage.setItem("tm:ui:dataMode", "real"); go("#/journey"); expect(app().textContent).toContain("RealGoal");
  });
  it("goal page: milestone text with animation mark; unknown note when nothing linked", () => {
    store.demo.put(g("g1")); store.demo.put(g("g2"));
    store.demo.put(mk("demo", "a", "task", { "task.done_on": "2026-10-01" }, { goal: "g1" }));
    go("#/journey/goal/g1"); expect(app().querySelector("[data-milestone='100']")!.textContent).toContain("All linked tasks are done"); expect(app().querySelector("[data-mm=milestone]")).not.toBeNull();
    go("#/journey/goal/g2"); expect(app().querySelector("[data-goal-progress=unknown]")).not.toBeNull(); expect(app().textContent).toContain("Progress is unknown"); expect(app().querySelector("[data-mm]")).toBeNull();
    go("#/journey/goal/nope"); expect(app().querySelector("[data-goal-missing]")).not.toBeNull();
  });
});

describe("SMART guide", () => {
  it("fill state reads existing goal fields", () => {
    const f = smartFilled(mk("demo", "g", "goal", { "goal.title": "x", "goal.success": "met", "goal.horizon": "month", "goal.why": "  " }));
    expect(f).toEqual({ specific: false, measurable: true, achievable: false, relevant: false, timebound: true });
  });
  it("saves into the goal record (success, why, horizon, date) and shows the count", () => {
    store.demo.put(mk("demo", "g1", "goal", { "goal.title": "Save" })); go("#/journey/goal/g1");
    expect(app().querySelector("[data-smart-filled]")!.textContent).toBe("0 of 5 parts filled");
    setVal("#sm-s", "Put 500 BDT aside"); setVal("#sm-m", "Savings jar has 6000"); setVal("#sm-a", "I earn weekly"); setVal("#sm-r", "Safety for family"); setVal("#sm-h", "one_year"); setVal("#sm-d", "2027-10-01");
    submit("[data-form=smart]");
    const v = store.demo.get("g1")!.values;
    expect(v["goal.smart_specific"]).toMatchObject({ value: "Put 500 BDT aside", label: "DEMO" }); expect(v["goal.success"]).toMatchObject({ value: "Savings jar has 6000" });
    expect(v["goal.horizon"]).toMatchObject({ value: "one_year" }); expect(v["goal.target_date"]).toMatchObject({ value: "2027-10-01" });
    expect(app().querySelector("[data-smart-filled]")!.textContent).toBe("5 of 5 parts filled");
    expect(store.demo.get("g1")!.values["goal.title"]).toMatchObject({ value: "Save" });
  });
  it("refuses secret-looking text and a bad date; nothing saved", () => {
    store.demo.put(mk("demo", "g1", "goal", { "goal.title": "Save" })); go("#/journey/goal/g1");
    setVal("#sm-s", "my password: hunter2hunter2"); submit("[data-form=smart]");
    expect(store.demo.get("g1")!.values["goal.smart_specific"]).toBeUndefined();
    setVal("#sm-s", "ok"); setVal("#sm-d", "2027-13-45"); submit("[data-form=smart]"); expect(store.demo.get("g1")!.values["goal.target_date"]).toBeUndefined();
  });
  it("real goal needs consent; real save uses FACT and stays in real", () => {
    localStorage.setItem("tm:ui:dataMode", "real"); store.real.put(mk("real", "g1", "goal", { "goal.title": "Real" }));
    go("#/journey/goal/g1"); setVal("#sm-s", "Plain words"); submit("[data-form=smart]");
    expect(store.real.get("g1")!.values["goal.smart_specific"]).toMatchObject({ value: "Plain words", label: "FACT" }); expect(store.demo.list()).toHaveLength(0);
  });
});

describe("SWOT card", () => {
  it("list helpers: trim, drop blanks, cap at 5 lines of 80 characters; empty is unknown", () => {
    expect(parseList(" a \n\n b\n c\nd\ne\nf")).toEqual(["a", "b", "c", "d", "e"]); expect(parseList("x".repeat(200))[0]).toHaveLength(80);
    expect(listValue([])).toEqual({ state: "unknown" }); expect(readList(listValue(["a"]))).toEqual(["a"]); expect(readList({ state: "unknown" })).toBeNull();
  });
  it("none: all four boxes say not filled; saving writes four lists; partial keeps the empty ones unknown", () => {
    store.demo.put(mk("demo", "g1", "goal", { "goal.title": "Save" })); go("#/journey/goal/g1");
    expect(app().querySelectorAll("[data-swot-empty]")).toHaveLength(4);
    setVal("#sw-strengths", "Keeps accounts\nCalm"); setVal("#sw-threats", "Prices may rise"); submit("[data-form=swot]");
    const v = store.demo.get("g1")!.values;
    expect(v["goal.swot_strengths"]).toMatchObject({ value: ["Keeps accounts", "Calm"], label: "DEMO" }); expect(v["goal.swot_weaknesses"]).toEqual({ state: "unknown" });
    go("#/journey/goal/g1"); expect(app().querySelectorAll("[data-swot-empty]")).toHaveLength(2);
    expect(app().querySelector("[data-swot-box=strengths]")!.textContent).toContain("Calm");
    expect((app().querySelector("#sw-strengths") as HTMLTextAreaElement).value).toBe("Keeps accounts\nCalm");
  });
  it("mode isolation: a demo SWOT is not visible from real mode", () => {
    store.demo.put(mk("demo", "g1", "goal", { "goal.title": "Save", "goal.swot_strengths": ["Secret demo"] }));
    localStorage.setItem("tm:ui:dataMode", "real"); go("#/journey/goal/g1"); expect(app().querySelector("[data-goal-missing]")).not.toBeNull(); expect(app().textContent).not.toContain("Secret demo");
  });
});

describe("micro-animations and reduced motion", () => {
  const css = readFileSync("src/ui/styles.css", "utf8");
  it("step done shows the tick on the reward screen with a text label", () => {
    store.demo.put(mk("demo", "task-1", "task", { "task.title": "T" })); sessionStorage.setItem("tm:newStar", "1");
    store.demo.put({ ...mk("demo", "task-1", "task", { "task.title": "T", "task.done_on": "2026-10-26" }) }); go("#/reward");
    expect(app().querySelector("[data-mm=step]")).not.toBeNull(); expect(app().textContent).toContain("Step done");
  });
  it("every animation of the new classes sits inside no-preference and is switched off under reduce", () => {
    const part = css.slice(css.indexOf("/* step 5"));
    const noPref = [...part.matchAll(/@media \(prefers-reduced-motion:no-preference\)\{([\s\S]*?)\n\}/g)].map((m) => m[1]!).join("\n");
    const outside = part.replace(/@media \(prefers-reduced-motion:no-preference\)\{[\s\S]*?\n\}/g, "").replace(/@keyframes[^{]+\{[\s\S]*?\}\}/g, "");
    expect(noPref).toMatch(/animation:mmDraw/); expect(noPref).toMatch(/animation:mmPulse/);
    expect(outside).not.toMatch(/animation:(?!none)/); expect(outside).not.toMatch(/stroke-dasharray:1/);
    expect(part).toMatch(/@media \(prefers-reduced-motion:reduce\)\{[^}]*\.mm \.mm-tick[^}]*animation:none!important/);
  });
  it("the drawings have no SMIL or script animation", () => {
    const src = readFileSync("src/ui/lifeUi.ts", "utf8"); expect(src).not.toMatch(/<animate|animateTransform|requestAnimationFrame|setInterval/);
  });
});

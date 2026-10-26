// Goal Universe: life areas around one centre goal (SVG + list view). Own entries only, Unknown otherwise, Deen private, no total.
import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { store, consentKv } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import type { FieldValue, Namespace, TMRecord } from "../src/core/types";
import { UNIVERSE_AREAS, centreGoal, universeData } from "../src/core/goalUniverse";
import { PACKS } from "../src/i18n/packs";

const NOW = "2026-10-26T00:00:00.000Z";
const mk = (ns: Namespace, id: string, entity: string, values: Record<string, unknown>, links?: Record<string, string>): TMRecord => {
  const label = ns === "demo" ? "DEMO" : "FACT"; const vals: Record<string, FieldValue> = {};
  for (const [k, x] of Object.entries(values)) vals[k] = (x === null ? { state: "unknown" } : { state: "value", value: x, label }) as FieldValue;
  return { id, entity, ns, ownerId: ns === "demo" ? "demo-user" : "owner", schemaVersion: 1, createdAt: NOW, values: vals, ...(links ? { links } : {}) };
};
const goal = (id: string, title: string, extra: Record<string, unknown> = {}, ns: Namespace = "demo") => mk(ns, id, "goal", { "goal.title": title, ...extra });
const task = (id: string, goalId: string, done: boolean, ns: Namespace = "demo") => mk(ns, id, "task", { "task.title": id, ...(done ? { "task.done_on": "2026-10-26" } : {}) }, { goal: goalId });
const go = (hash: string) => { location.hash = hash; render(); };
const app = () => document.getElementById("app")!;

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear();
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
});

describe("universeData (pure)", () => {
  it("no entries: no centre, every area Unknown, Deen private, nothing is 0", () => {
    const u = universeData([]);
    expect(u.centre).toBeNull(); expect(u.nodes.map((n) => n.area)).toEqual([...UNIVERSE_AREAS]);
    for (const n of u.nodes) { expect(n.goals).toBeNull(); expect(n.tasks).toBeNull(); expect(n.percent).toBeNull(); }
    expect(u.nodes.find((n) => n.area === "deen")!.isPrivate).toBe(true);
  });
  it("counts only the user's goals and linked tasks per area; area with a goal but no task has unknown progress", () => {
    const recs = [goal("g1", "Fit", { "goal.area": "health" }), goal("g2", "Shop", { "goal.area": "business" }), goal("g3", "Loose"),
      task("t1", "g1", true), task("t2", "g1", false), task("t3", "g1", true)];
    const u = universeData(recs);
    const h = u.nodes.find((n) => n.area === "health")!, b = u.nodes.find((n) => n.area === "business")!;
    expect([h.goals, h.tasks, h.done, h.percent]).toEqual([1, 3, 2, 67]);
    expect([b.goals, b.tasks, b.percent]).toEqual([1, null, null]);
    expect(u.unassigned).toBe(1);
  });
  it("Deen goals and tasks never produce a figure, and a Deen goal is never the centre", () => {
    const recs = [goal("a", "Private one", { "goal.area": "deen", "goal.horizon": "five_year" }), goal("b", "Open one", { "goal.horizon": "one_year" }), task("t", "a", true)];
    const d = universeData(recs).nodes.find((n) => n.area === "deen")!;
    expect([d.goals, d.tasks, d.done, d.percent]).toEqual([null, null, null, null]);
    expect(centreGoal(recs)).toEqual({ id: "b", title: "Open one" });
  });
  it("centre goal is the longest horizon, ties by id", () => {
    expect(centreGoal([goal("b", "B", { "goal.horizon": "one_year" }), goal("a", "A", { "goal.horizon": "five_year" })])!.id).toBe("a");
    expect(centreGoal([goal("z", "Z"), goal("y", "Y")])!.id).toBe("y");
  });
});

describe("Goal Universe screen", () => {
  it("empty: centre Unknown, '?' on every non-private node, Deen shows a lock and 'Private'", () => {
    go("#/journey/universe");
    expect(app().querySelector("[data-universe-centre]")!.getAttribute("data-universe-centre")).toBe("unknown");
    const svg = app().querySelector("svg[data-universe-map]")!;
    expect(svg.querySelectorAll("[data-node]").length).toBe(7);
    expect(svg.querySelectorAll("[data-node][data-state=unknown]").length).toBe(6);
    expect(svg.querySelector("[data-node=deen]")!.getAttribute("data-state")).toBe("private");
    expect(svg.querySelector("[data-node=deen] .univ-lock")).not.toBeNull();
    expect(svg.querySelector("desc")!.textContent).toMatch(/Deen: Private/);
    expect(svg.textContent).not.toMatch(/\b0\b/);
  });
  it("list view shows exactly the same lines as the map description; the choice is remembered", () => {
    store.demo.put(goal("g1", "Grow shop", { "goal.area": "business", "goal.horizon": "one_year" })); store.demo.put(task("t1", "g1", true)); store.demo.put(task("t2", "g1", false));
    go("#/journey/universe");
    const mapText = app().querySelector("[data-chart-summary=universe]")!.textContent!;
    expect(app().querySelector("[data-universe-centre]")!.textContent).toBe("Centre goal: Grow shop");
    (app().querySelector("[data-universe-toggle] [data-view=list]") as HTMLElement).click(); render();
    expect(localStorage.getItem("tm:ui:universeView")).toBe("list");
    const list = [...app().querySelectorAll("[data-universe-line] .univ-line")].map((x) => x.textContent!);
    expect(list.length).toBe(7); expect(list.join(" ")).toBe(mapText);
    expect(list.find((l) => l.startsWith("Business"))).toBe("Business: 1 goal(s), 2 linked tasks, 1 done (50%)");
    expect(app().querySelector("svg[data-universe-map]")).toBeNull();
    expect(app().querySelector("[data-view=list]")!.getAttribute("aria-pressed")).toBe("true");
  });
  it("Deen goal title and progress never appear on the screen", () => {
    store.demo.put(goal("d1", "Secret plan", { "goal.area": "deen" })); store.demo.put(task("t1", "d1", true));
    go("#/journey/universe");
    expect(app().textContent).not.toMatch(/Secret plan/); expect(app().textContent).toMatch(/Deen: Private/);
    (app().querySelector("[data-view=list]") as HTMLElement).click(); render();
    expect(app().textContent).not.toMatch(/Secret plan/);
  });
  it("demo and real never mix: real mode ignores demo goals", () => {
    store.demo.put(goal("g1", "Demo goal", { "goal.area": "family" }));
    localStorage.setItem("tm:ui:dataMode", "real"); grantConsent(consentKv, NOW);
    go("#/journey/universe");
    expect(app().querySelector("[data-universe-centre]")!.getAttribute("data-universe-centre")).toBe("unknown");
    expect(app().querySelector("svg [data-node=family]")!.getAttribute("data-state")).toBe("unknown");
  });
  it("Bangla and Mix use Latin digits and Bangla area names", () => {
    store.demo.put(goal("g1", "L", { "goal.area": "health" })); store.demo.put(task("t1", "g1", true));
    for (const l of ["bn", "mix"]) { localStorage.setItem("tm:ui:lang", l); go("#/journey/universe"); expect(app().textContent).not.toMatch(/[০-৯]/); expect(app().textContent).toMatch(/স্বাস্থ্য/); }
    expect(PACKS.mix["univ.title"]).toBe(PACKS.bn["univ.title"]);
  });
  it("Journey links to it; the goal page saves a life area (and an empty choice stores Unknown)", () => {
    store.demo.put(goal("g1", "G"));
    go("#/journey"); expect(app().querySelector("a[href='#/journey/universe']")).not.toBeNull();
    go("#/journey/goal/g1");
    const sel = app().querySelector("select[data-goal-area]") as HTMLSelectElement; sel.value = "travel";
    (app().querySelector("form[data-form=goal-area]") as HTMLFormElement).dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    expect(store.demo.get("g1")!.values["goal.area"]).toMatchObject({ state: "value", value: "travel", label: "DEMO" });
    sel.value = "";
    (app().querySelector("form[data-form=goal-area]") as HTMLFormElement).dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    expect(store.demo.get("g1")!.values["goal.area"]).toEqual({ state: "unknown" });
  });
  it("accessibility: toggle buttons and list rows are 44px, no network, no animation in the Universe CSS", () => {
    const css = readFileSync("src/ui/styles.css", "utf8"); const part = css.slice(css.indexOf("/* Goal Universe"));
    expect(part).toMatch(/\.univ-list li\{[^}]*min-height:44px/); expect(part).not.toMatch(/animation|transition|url\(/);
    const src = readFileSync("src/ui/universeUi.ts", "utf8") + readFileSync("src/core/goalUniverse.ts", "utf8");
    expect(src).not.toMatch(/fetch\(|XMLHttpRequest|https?:\/\//);
  });
});

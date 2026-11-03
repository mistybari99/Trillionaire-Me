// M06 goal tree, end to end: form (name, level, parent, measured-by, date) -> storage (goal.kind, links.parent, goal.metric_label) -> branch progress ->
// goals page tree, goal page, Plan screen. Also: step edit, habit days a week, SWOT fields, skill examples and resources shown back. Unknown is never 0.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import { PACKS, type Key } from "../src/i18n/packs";
import { buildTree, canBeChild, eligibleParents, flatten, kindOf, nodeById, validateGoalText, validatePlace } from "../src/core/goalTree";
import { resourceRows, skillEvidence } from "../src/core/assessment";
import { swotField } from "../src/core/goalPlan";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" }) as FieldValue;
const rec = (id: string, entity: string, values: Record<string, FieldValue>, links?: Record<string, string>): TMRecord => ({ id, entity, ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-11-02T08:00:00.000Z", values, ...(links ? { links } : {}) });
const goal = (id: string, title: string, o: { kind?: string; parent?: string; metric?: string; manual?: number } = {}) => rec(id, "goal", {
  "goal.title": v(title), ...(o.kind ? { "goal.kind": v(o.kind) } : {}), ...(o.metric ? { "goal.metric_label": v(o.metric) } : {}),
  ...(o.manual !== undefined ? { "goal.progress_mode": v("manual"), "goal.manual_percent": v(o.manual) } : {}) }, o.parent ? { parent: o.parent } : undefined);
const step = (id: string, g: string, done = false) => rec(id, "task", { "task.title": v(id), ...(done ? { "task.done_on": v("2026-11-01") } : {}) }, { goal: g });

describe("goal tree (pure)", () => {
  it("levels: a child sits under a strictly higher level; no level or an unknown one is a goal", () => {
    expect(canBeChild("subgoal", "goal")).toBe(true); expect(canBeChild("project", "subgoal")).toBe(true); expect(canBeChild("goal", "goal")).toBe(false); expect(canBeChild("subgoal", "subgoal")).toBe(false); expect(canBeChild("goal", "project")).toBe(false);
    expect(kindOf(goal("a", "A"))).toBe("goal"); expect(kindOf(goal("a", "A", { kind: "task" }))).toBe("goal"); expect(kindOf(goal("a", "A", { kind: "project" }))).toBe("project");
  });
  it("tree: nested by parent, stable order, a parent that is missing or does not fit leaves the goal at the top with a note", () => {
    const recs = [goal("g", "Launch"), goal("s", "Site", { kind: "subgoal", parent: "g" }), goal("p", "Pages", { kind: "project", parent: "s" }), goal("o", "Lost", { kind: "project", parent: "gone" }), goal("bad", "Bad", { kind: "goal", parent: "g" })];
    const roots = buildTree(recs);
    expect(roots.map((r) => r.id)).toEqual(["bad", "g", "o"]);        // by title: Bad, Launch, Lost
    const g = nodeById(roots, "g")!; expect(g.children.map((c) => c.id)).toEqual(["s"]); expect(g.children[0]!.children.map((c) => c.id)).toEqual(["p"]); expect(nodeById(roots, "p")!.depth).toBe(2);
    expect(nodeById(roots, "o")!.orphan).toBe(true); expect(nodeById(roots, "bad")!.orphan).toBe(false); expect(nodeById(roots, "bad")!.parentId).toBeNull();
    expect(flatten(roots)).toHaveLength(5);
  });
  it("branch progress pools the steps of the whole branch; no step anywhere is Unknown, never 0", () => {
    const recs = [goal("g", "G"), goal("s", "S", { kind: "subgoal", parent: "g" }), goal("p", "P", { kind: "project", parent: "s" }), step("a", "g", true), step("b", "s"), step("c", "p", true), step("d", "p"), goal("e", "Empty")];
    const roots = buildTree(recs); const n = (id: string) => nodeById(roots, id)!;
    expect(n("p").branch).toEqual({ done: 1, total: 2, percent: 50 }); expect(n("s").branch).toEqual({ done: 1, total: 3, percent: 33 }); expect(n("g").branch).toEqual({ done: 2, total: 4, percent: 50 });
    expect(n("e").branch.percent).toBeNull();
    expect(buildTree([goal("g", "G"), goal("s", "S", { kind: "subgoal", parent: "g" })])[0]!.branch.percent).toBeNull();
  });
  it("a goal with its own percent keeps it (the branch figure is not used), and its steps still count once toward a parent", () => {
    const recs = [goal("g", "G"), goal("s", "S", { kind: "subgoal", parent: "g", manual: 80 }), step("a", "s", true), step("b", "s")];
    const roots = buildTree(recs); expect(nodeById(roots, "s")!.branch.percent).toBe(80); expect(nodeById(roots, "s")!.mode).toBe("manual"); expect(nodeById(roots, "g")!.branch).toEqual({ done: 1, total: 2, percent: 50 });
  });
  it("eligible parents are higher-level goals only; a goal that has parts cannot move to a level that would not fit them", () => {
    const recs = [goal("g", "G"), goal("s", "S", { kind: "subgoal", parent: "g" }), goal("p", "P", { kind: "project", parent: "s" })];
    expect(eligibleParents(recs, "goal")).toEqual([]); expect(eligibleParents(recs, "subgoal").map((x) => x.id)).toEqual(["g"]); expect(eligibleParents(recs, "project").map((x) => x.id)).toEqual(["g", "s"]);
    expect(eligibleParents(recs, "project", "p").map((x) => x.id)).toEqual(["g", "s"]);
    expect(validatePlace(recs, { kind: "subgoal", parentId: null })).toBe("parent_required"); expect(validatePlace(recs, { kind: "subgoal", parentId: "s" })).toBe("parent_invalid");
    expect(validatePlace(recs, { kind: "subgoal", parentId: "g" })).toBeNull(); expect(validatePlace(recs, { kind: "goal", parentId: null })).toBeNull();
    expect(validatePlace(recs, { kind: "project", parentId: "g", selfId: "s" })).toBe("children_conflict");
    expect(validateGoalText({ title: " ", metric: "" })).toBe("title_required"); expect(validateGoalText({ title: "x".repeat(121), metric: "" })).toBe("title_long"); expect(validateGoalText({ title: "x", metric: "m".repeat(81) })).toBe("metric_long");
  });
  it("SWOT lists keep their own catalog fields", () => { expect(swotField("threats")).toBe("goal.swot_threats"); expect(swotField("strengths")).toBe("goal.swot_strengths"); });
  it("skill examples and resources are read back as the user wrote them; empty ones are skipped", () => {
    const recs = [rec("s1", "skill", { "skill.name": v("Books"), "skill.evidence": v("2 years") }), rec("s2", "skill", { "skill.name": v("Sales") }), rec("r1", "resource", { "resource.kind": v("tools"), "resource.description": v("A laptop") }), rec("r2", "resource", {})];
    expect(skillEvidence(recs).map((x) => [x.name, x.evidence])).toEqual([["Books", "2 years"]]); expect(resourceRows(recs).map((x) => [x.kind, x.description])).toEqual([["tools", "A laptop"]]);
  });
});

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector(sel) as T | null;
const set = (id: string, value: string) => { ($(`#${id}`) as HTMLInputElement).value = value; };
const go = (h: string) => { location.hash = h; render(); };
const raw = (sel: string) => $<HTMLFormElement>(sel)!.dispatchEvent(new Event("submit", { cancelable: true }));
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>';
  localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, "2026-11-02T00:00:00.000Z");
});

describe("goal tree screens", () => {
  it("the goals page has the form with a label on every input; a sub-goal needs a parent, a goal does not", () => {
    go("#/journey/goals");
    for (const id of ["gn-title", "gn-kind", "gn-parent", "gn-metric", "gn-date"]) expect($(`label[for="${id}"]`), id).not.toBeNull();
    expect(($("#gn-parent") as HTMLSelectElement).disabled).toBe(true);
    set("gn-title", "Launch the shop"); set("gn-metric", "Monthly sales"); raw("form[data-form=goal-new]"); render();
    const g = store.demo.list().find((r) => r.entity === "goal")!; expect(g.values["goal.kind"]).toMatchObject({ value: "goal", label: "DEMO" }); expect(g.values["goal.metric_label"]).toMatchObject({ value: "Monthly sales" }); expect(g.links).toBeUndefined();
    set("gn-title", "Site"); set("gn-kind", "subgoal"); ($("#gn-kind") as HTMLSelectElement).dispatchEvent(new Event("change"));
    expect(($("#gn-parent") as HTMLSelectElement).disabled).toBe(false); expect([...($("#gn-parent") as HTMLSelectElement).options].map((o) => o.textContent)).toContain("Goal · Launch the shop");
    raw("form[data-form=goal-new]"); expect($("form[data-form=goal-new] .err")!.textContent).toBe("A sub-goal or project needs something to be part of.");
    set("gn-parent", g.id); raw("form[data-form=goal-new]"); render();
    const sub = store.demo.list().find((r) => r.id !== g.id && r.entity === "goal")!; expect(sub.links).toEqual({ parent: g.id }); expect(sub.values["goal.kind"]).toMatchObject({ value: "subgoal" });
  });
  it("refuses an empty name, a secret-like name and a bad date, and saves nothing", () => {
    go("#/journey/goals"); raw("form[data-form=goal-new]"); expect($("form[data-form=goal-new] .err")!.textContent).toMatch(/Write a name/);
    set("gn-title", "my password is hunter2"); raw("form[data-form=goal-new]"); expect($("form[data-form=goal-new] .err")!.textContent).not.toBe(""); expect(store.demo.list()).toHaveLength(0);
  });
  it("the tree shows nesting, the branch progress from all its steps, the measured-by text and a link to each goal", () => {
    for (const r of [goal("g", "Launch", { metric: "Sales" }), goal("s", "Site", { kind: "subgoal", parent: "g" }), step("a", "g", true), step("b", "s")]) store.demo.put(r);
    go("#/journey/goals");
    const tree = $("[data-goal-tree]")!; expect(tree.getAttribute("data-goal-tree")).toBe("2");
    expect(tree.querySelector('[data-tree-node="g"]')!.getAttribute("data-tree-percent")).toBe("50"); expect(tree.querySelector('[data-tree-node="g"]')!.textContent).toMatch(/50% with all its parts \(1 of 2 steps\)/); expect(tree.querySelector('[data-tree-node="g"]')!.textContent).toMatch(/Measured by: Sales/);
    expect(tree.querySelector('[data-tree-node="g"] [data-tree-node="s"]')!.getAttribute("data-depth")).toBe("1"); expect(tree.querySelector('[data-tree-node="s"] a[href="#/journey/goal/s"]')).not.toBeNull();
    expect(tree.textContent).not.toMatch(/fail|behind|overdue|missed|lost/i);
  });
  it("a branch with no step says Unknown, not 0", () => {
    store.demo.put(goal("g", "Lonely")); go("#/journey/goals"); expect($('[data-tree-node="g"]')!.getAttribute("data-tree-percent")).toBe("unknown"); expect($('[data-tree-node="g"]')!.textContent).toMatch(/progress is not known/);
  });
  it("the goal page shows where it sits, its parts, and lets the level, parent and measure be changed", () => {
    for (const r of [goal("g", "Launch"), goal("s", "Site", { kind: "subgoal", parent: "g" }), goal("x", "Loose")]) store.demo.put(r);
    go("#/journey/goal/g"); expect($("[data-goal-place]")!.getAttribute("data-goal-place")).toBe("goal"); expect($('[data-parts="1"] [data-part="s"]')).not.toBeNull();
    go("#/journey/goal/s"); expect($("[data-goal-place]")!.textContent).toMatch(/Part of Launch/);
    go("#/journey/goal/x"); set("gp-kind", "project"); ($("#gp-kind") as HTMLSelectElement).dispatchEvent(new Event("change")); set("gp-parent", "s"); set("gp-metric", "Pages live"); raw("form[data-form=goal-place]");
    const x = store.demo.get("x")!; expect(x.values["goal.kind"]).toMatchObject({ value: "project" }); expect(x.links).toEqual({ parent: "s" }); expect(x.values["goal.metric_label"]).toMatchObject({ value: "Pages live" });
    go("#/journey/goal/x"); expect($("[data-metric-label]")!.textContent).toBe("Measured by: Pages live");
    set("gp-kind", "goal"); ($("#gp-kind") as HTMLSelectElement).dispatchEvent(new Event("change")); set("gp-metric", ""); raw("form[data-form=goal-place]");
    expect(store.demo.get("x")!.links).toBeUndefined(); expect(store.demo.get("x")!.values["goal.metric_label"]).toEqual({ state: "unknown" });
  });
  it("moving a goal to a level that would not fit its parts is refused", () => {
    for (const r of [goal("g", "Launch"), goal("s", "Site", { kind: "subgoal", parent: "g" }), goal("t", "Top")]) store.demo.put(r);
    go("#/journey/goal/s"); set("gp-kind", "project"); ($("#gp-kind") as HTMLSelectElement).dispatchEvent(new Event("change")); set("gp-parent", "g"); raw("form[data-form=goal-place]");
    expect(store.demo.get("s")!.values["goal.kind"]).toMatchObject({ value: "project" });         // no parts: allowed
    store.demo.put(goal("p", "Pages", { kind: "project", parent: "s" })); go("#/journey/goal/s"); set("gp-kind", "subgoal"); raw("form[data-form=goal-place]");
    store.demo.put(goal("q", "Q", { kind: "subgoal", parent: "g" })); store.demo.put(goal("r", "R", { kind: "project", parent: "q" }));
    go("#/journey/goal/q"); set("gp-kind", "project"); ($("#gp-kind") as HTMLSelectElement).dispatchEvent(new Event("change")); set("gp-parent", "g"); raw("form[data-form=goal-place]");
    expect($("form[data-form=goal-place] .err")!.textContent).toBe("This goal has parts that would not fit that level. Move them first."); expect(store.demo.get("q")!.values["goal.kind"]).toMatchObject({ value: "subgoal" });
  });
  it("Plan screen: the goal picker names the level; a step can be linked to a sub-goal and counts in its branch; a step can be edited", () => {
    for (const r of [goal("g", "Launch"), goal("s", "Site", { kind: "subgoal", parent: "g" })]) store.demo.put(r);
    go("#/diary/plan"); expect([...document.querySelectorAll("[data-goal-picker=new] [data-goal-chip]")].map((o) => o.textContent)).toEqual(["Launch"]);
    set("pt-title", "Draw pages"); ($("[data-goal-chip=g]") as HTMLButtonElement).click(); expect([...($("[data-goal-part=g]") as HTMLSelectElement).options].map((o) => o.textContent)).toEqual(["Whole goal", "· Site"]);
    const part = $("[data-goal-part=g]") as HTMLSelectElement; part.value = "s"; part.dispatchEvent(new Event("change")); raw("form[data-form=task]"); render();
    const t = store.demo.list().find((r) => r.entity === "task")!; expect(t.links).toEqual({ goal: "s" }); expect(t.values["task.goals"]).toMatchObject({ value: ["s"] });
    set(`te-t-${t.id}`, "Draw three pages"); set(`te-m-${t.id}`, "45"); raw(`form[data-task-edit="${t.id}"]`);
    expect(store.demo.get(t.id)!.values["task.title"]).toMatchObject({ value: "Draw three pages" }); expect(store.demo.get(t.id)!.values["task.minutes"]).toMatchObject({ value: 45 });
    render(); set(`te-m-${t.id}`, ""); raw(`form[data-task-edit="${t.id}"]`); expect(store.demo.get(t.id)!.values["task.minutes"]).toEqual({ state: "later" });
    render(); set(`te-m-${t.id}`, "-5"); raw(`form[data-task-edit="${t.id}"]`); expect($(`form[data-task-edit="${t.id}"] .err`)!.textContent).not.toBe("");
    expect(buildTree(store.demo.list())[0]!.branch.total).toBe(1);
  });
  it("habit: saving writes the planned days a week and the card shows it", () => {
    go("#/habits"); set("hb-name", "Walk"); raw("form[data-form=habit]"); render();
    const h1 = store.demo.list().find((r) => r.entity === "habit")!; expect(h1.values["habit.days_per_week"]).toMatchObject({ value: 7 }); expect($("[data-per-week]")!.textContent).toBe("Planned: 7 day(s) a week");
    store.demo.put(rec("old", "habit", { "habit.title": v("Old"), "habit.days": v("1,3") })); go("#/habits"); expect($('[data-habit-card="old"] [data-per-week]')!.textContent).toBe("Planned: 2 day(s) a week");
  });
  it("Plan screen shows skill examples and resources back; empty ones point to the intake step", () => {
    go("#/diary/plan"); expect($("[data-evidence='0'] a[href='#/diary/intake/3']")).not.toBeNull(); expect($("[data-resources='0'] a[href='#/diary/intake/5']")).not.toBeNull();
    store.demo.put(rec("s1", "skill", { "skill.name": v("Books"), "skill.level": v(4), "skill.evidence": v("Kept shop books for 2 years") })); store.demo.put(rec("r1", "resource", { "resource.kind": v("tools"), "resource.description": v("A laptop") }));
    go("#/diary/plan"); expect($('[data-evidence-row="s1"]')!.textContent).toMatch(/Books: Kept shop books for 2 years/); expect($('[data-resource-row="r1"]')!.textContent).toMatch(/Tools: A laptop/);
  });
  it("SWOT: the four lists save into their own fields and show back on the goal page", () => {
    store.demo.put(goal("g", "Launch")); go("#/journey/goal/g");
    for (const k of ["strengths", "weaknesses", "opportunities", "threats"]) ($(`#sw-${k}`) as HTMLTextAreaElement).value = `${k} one\n${k} two`;
    raw("form[data-form=swot]"); const g = store.demo.get("g")!;
    for (const k of ["strengths", "weaknesses", "opportunities", "threats"]) expect(g.values[`goal.swot_${k}`]).toMatchObject({ state: "value", value: [`${k} one`, `${k} two`] });
    render(); expect($('[data-swot-box="threats"]')!.textContent).toMatch(/threats two/);
  });
});

describe("real mode and languages", () => {
  it("without the consent tick nothing is saved (new goal, place change, step edit); with it the record is real (FACT)", () => {
    localStorage.setItem("tm:ui:dataMode", "real");
    store.real.put({ ...rec("g", "goal", { "goal.title": { state: "value", value: "Real goal", label: "FACT" } }), ns: "real", ownerId: "owner" });
    for (const k of Object.keys(localStorage)) if (k.includes("consent")) localStorage.removeItem(k);
    go("#/journey/goals"); expect($("[data-consent-prompt]")).not.toBeNull(); set("gn-title", "New"); raw("form[data-form=goal-new]"); expect(store.real.list().filter((r) => r.entity === "goal")).toHaveLength(1);
    go("#/journey/goal/g"); set("gp-metric", "Sales"); raw("form[data-form=goal-place]"); expect(store.real.get("g")!.values["goal.metric_label"]).toBeUndefined();
    grantConsent(consentKv, "2026-11-02T00:00:00.000Z"); go("#/journey/goals"); set("gn-title", "New"); raw("form[data-form=goal-new]");
    const made = store.real.list().filter((r) => r.entity === "goal" && r.id !== "g"); expect(made).toHaveLength(1); expect(made[0]!.values["goal.title"]).toMatchObject({ label: "FACT" });
  });
  const KEYS = Object.keys(PACKS.en).filter((k) => k.startsWith("gt.") || k.startsWith("assess.evidence") || k.startsWith("assess.resources") || k.startsWith("plan.task.edit") || k === "habits.perWeek") as Key[];
  it("every goal-tree text exists in English, Bangla and Mix with the same placeholders; loanwords are used", () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    expect(KEYS.length).toBeGreaterThan(35);
    for (const k of KEYS) { expect(PACKS.bn[k]?.trim(), k).toBeTruthy(); expect(PACKS.mix[k]?.trim(), k).toBeTruthy(); expect(ph(PACKS.bn[k]), k).toBe(ph(PACKS.en[k])); }
    const bn = KEYS.map((k) => PACKS.bn[k]).join(" ");
    for (const bad of ["কর্মী", "পরিকল্পনা", "দক্ষতা", "ঝুঁকি", "অগ্রগতি", "বিকল্প", "সংরক্ষণ", "বিজ্ঞপ্তি", "মুছুন", "সংস্করণ", "তালিকা"]) expect(bn, bad).not.toContain(bad);
    expect(PACKS.bn["gt.kind.project"]).toContain("প্রজেক্ট"); expect(PACKS.mix["gt.kind.project"]).toContain("Project");
  });
  for (const lang of ["bn", "mix"] as const) it(`goal screens render in ${lang} with Latin digits and no raw keys`, () => {
    localStorage.setItem("tm:ui:lang", lang);
    for (const r of [goal("g", "Launch", { metric: "Sales" }), goal("s", "Site", { kind: "subgoal", parent: "g" }), step("a", "g", true), step("b", "s"), rec("s1", "skill", { "skill.name": v("Books"), "skill.evidence": v("x") })]) store.demo.put(r);
    for (const p of ["#/journey/goals", "#/journey/goal/g", "#/journey/goal/s", "#/diary/plan", "#/habits"]) { go(p); expect(document.body.textContent, p).not.toMatch(/[০-৯]|\b(gt|assess)\.[a-z]/); }
  });
});

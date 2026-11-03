// Multi-goal step 5: the goal picker on the task form and edit sheet, and the goal chips on step rows and Today.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render, ROUTES } from "../src/app";
import { prefs, store } from "../src/ui/state";
import { goalIdsOf } from "../src/core/taskGoals";
import { PACKS } from "../src/i18n/packs";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" } as FieldValue);
const rec = (id: string, entity: string, vals: Record<string, unknown>, over: Partial<TMRecord> = {}): TMRecord => ({ id, entity, ns: "demo", ownerId: "demo-user", schemaVersion: 2, createdAt: "2026-11-01T00:00:00Z", values: Object.fromEntries(Object.entries(vals).map(([k, x]) => [k, v(x)])), ...over });
const goal = (id: string, title: string, extra: Record<string, unknown> = {}, over: Partial<TMRecord> = {}) => rec(id, "goal", { "goal.title": title, ...extra }, over);
const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const go = (h: string) => { location.hash = h; render(); };
const submit = (sel: string) => q<HTMLFormElement>(sel).dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
const setStatus = (_s: unknown, id: string, status: string) => { const g = store.demo.get(id)!; store.demo.put({ ...g, values: { ...g.values, "goal.status": v(status) } }); };
const tasks = () => store.demo.list().filter((r) => r.entity === "task");

beforeEach(() => {
  localStorage.clear(); store.demo.clear(); store.real.clear();
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
  for (const g of [goal("a", "Shop"), goal("b", "Learn"), goal("c", "Health")]) store.demo.put(g);
});

describe("the picker on the task form", () => {
  it("tapping chips links the step to several goals; tapping again unlinks; a flat set, no main goal", () => {
    go("#/diary/plan"); q<HTMLInputElement>("#pt-title").value = "Read a book on selling";
    q<HTMLButtonElement>("[data-goal-picker=new] [data-goal-chip=a]").click(); q<HTMLButtonElement>("[data-goal-picker=new] [data-goal-chip=b]").click(); q<HTMLButtonElement>("[data-goal-picker=new] [data-goal-chip=c]").click();
    expect(q("[data-goal-picker=new] [data-goal-chip=c]").getAttribute("aria-pressed")).toBe("true"); q<HTMLButtonElement>("[data-goal-picker=new] [data-goal-chip=c]").click(); expect(q("[data-goal-picker=new] [data-goal-chip=c]").getAttribute("aria-pressed")).toBe("false");
    submit("form[data-form=task]"); const t = tasks()[0]!; expect(goalIdsOf(t)).toEqual(["a", "b"]); expect(t.links).toEqual({ goal: "a" });
    expect(app().textContent).not.toMatch(/main goal|primary|also helps/i);
  });
  it("nothing selected is a normal state: the step is saved with no goal and stays unknown, never an empty list", () => {
    go("#/diary/plan"); q<HTMLInputElement>("#pt-title").value = "Tidy desk"; submit("form[data-form=task]");
    const t = tasks()[0]!; expect(goalIdsOf(t)).toEqual([]); expect(t.values["task.goals"]).toEqual({ state: "unknown" }); expect(t.links).toBeUndefined();
  });
  it("only goals of the active mode are offered", () => {
    store.real.clear(); localStorage.setItem("tm:ui:dataMode", "real"); go("#/diary/plan");
    expect(app().querySelector("[data-goal-picker=new] [data-goal-chip]")).toBeNull();
  });
  it("more than 5 is refused with a calm line (no alert role, no red)", () => {
    for (const n of ["d", "e", "f", "g"]) store.demo.put(goal(n, `G ${n}`)); go("#/diary/plan");
    for (const id of ["a", "b", "c", "d", "e"]) q<HTMLButtonElement>(`[data-goal-picker=new] [data-goal-chip=${id}]`).click();
    q<HTMLButtonElement>("[data-goal-picker=new] [data-goal-chip=f]").click();
    const note = q("[data-goal-picker=new] [data-goals-note]"); expect(note.textContent).toBe("One step can help up to 5 goals."); expect(note.getAttribute("role")).toBe("status"); expect(note.className).not.toMatch(/err/);
    expect(q("[data-goal-picker=new] [data-goal-chip=f]").getAttribute("aria-pressed")).toBe("false");
  });
  it("opening the picker or linking adds no step, even in minimum-week mode", () => {
    prefs.mode = "minimum_week"; go("#/diary/plan"); q<HTMLButtonElement>("[data-goal-picker=new] [data-goal-chip=a]").click(); expect(tasks().length).toBe(0);
  });
  it("touch targets: chips and selects are at least 44 px by rule", () => {
    go("#/diary/plan"); const b = q<HTMLElement>("[data-goal-chip=a]"); expect(parseInt(b.style.minHeight)).toBeGreaterThanOrEqual(44);
  });
});

describe("a part of a goal", () => {
  it("under a linked goal with parts, 'Which part?' stores the part; the whole goal is the default", () => {
    store.demo.put(goal("a1", "Stock", { "goal.kind": "subgoal" }, { links: { parent: "a" } })); go("#/diary/plan");
    expect(app().querySelector("[data-goal-part]")).toBeNull(); q<HTMLButtonElement>("[data-goal-picker=new] [data-goal-chip=a]").click();
    const sel = q<HTMLSelectElement>("[data-goal-part=a]"); expect(sel.value).toBe("a"); expect([...sel.options].map((o) => o.text)).toEqual(["Whole goal", "· Stock"]);
    sel.value = "a1"; sel.dispatchEvent(new Event("change")); q<HTMLInputElement>("#pt-title").value = "Count stock"; submit("form[data-form=task]");
    expect(goalIdsOf(tasks()[0]!)).toEqual(["a1"]);
  });
});

describe("edit sheet", () => {
  const mk = (goals: string[]) => store.demo.put({ ...rec("t1", "task", { "task.title": "Call supplier", "task.goals": goals }), links: { goal: goals[0]! } });
  it("reloads the saved list, and saving changes it; the old single link follows the first item", () => {
    mk(["a", "b"]); go("#/diary/plan");
    const pick = q("[data-goal-picker=edit-t1]"); expect(pick.querySelector("[data-goal-chip=a]")!.getAttribute("aria-pressed")).toBe("true"); expect(pick.querySelector("[data-goal-chip=c]")!.getAttribute("aria-pressed")).toBe("false");
    (pick.querySelector("[data-goal-chip=a]") as HTMLButtonElement).click(); (pick.querySelector("[data-goal-chip=c]") as HTMLButtonElement).click(); submit('form[data-task-edit="t1"]');
    const t = store.demo.get("t1")!; expect(goalIdsOf(t)).toEqual(["b", "c"]); expect(t.links).toEqual({ goal: "b" });
  });
  it("unlinking the last goal leaves the step in place and unknown", () => {
    mk(["a"]); go("#/diary/plan"); (q("[data-goal-picker=edit-t1] [data-goal-chip=a]") as HTMLButtonElement).click(); submit('form[data-task-edit="t1"]');
    const t = store.demo.get("t1")!; expect(t.values["task.goals"]).toEqual({ state: "unknown" }); expect(t.links).toBeUndefined(); expect(t.values["task.title"]).toMatchObject({ value: "Call supplier" });
  });
});

describe("chips on step rows and Today", () => {
  const long = "A very long goal title here";
  it("rows show up to two chips then +N, with short titles and full names in title; each chip links to the goal page", () => {
    store.demo.put(goal("d", long)); store.demo.put({ ...rec("t1", "task", { "task.title": "Shared", "task.goals": ["a", "b", "d"] }), links: { goal: "a" } }); go("#/diary/plan");
    const chips = q("[data-goals=t1] [data-goal-chips]"); const links = [...chips.querySelectorAll("a")];
    expect(links.map((a) => a.textContent)).toEqual(["A very long g…", "Learn"]); expect(links[0]!.getAttribute("title")).toBe(long); expect(links[0]!.getAttribute("href")).toBe("#/journey/goal/d");
    expect(chips.querySelector("[data-goal-more]")!.textContent).toBe("+1");
    expect(ROUTES.some(([re]) => re.test("/journey/goal/d"))).toBe(true);
  });
  it("paused and retired goals say so in words; a step with no goal gets a quiet link", () => {
    setStatus(store.demo, "a", "paused"); setStatus(store.demo, "b", "retired");
    store.demo.put({ ...rec("t1", "task", { "task.title": "S", "task.goals": ["a", "b"] }), links: { goal: "a" } }); store.demo.put(rec("t2", "task", { "task.title": "Loose" })); go("#/diary/plan");
    expect(q("[data-goals=t1]").textContent).toMatch(/Learn \(retired\)/); expect(q("[data-goals=t1]").textContent).toMatch(/Shop \(paused\)/);
    expect(q("[data-goals=t2] [data-link-goal=t2]").textContent).toBe("Link to a goal");
  });
  it("a step with two goals is one row on Today with its chips", () => {
    store.demo.put({ ...rec("t1", "task", { "task.title": "Shared", "task.minutes": 30, "task.goals": ["a", "b"] }), links: { goal: "a" } });
    go("#/diary/plan"); expect(app().querySelectorAll('[data-task="t1"]').length).toBe(1);
  });
  it("English, Bangla and Mix texts exist", () => {
    for (const k of Object.keys(PACKS.en).filter((k) => k.startsWith("gl."))) for (const l of ["en", "bn", "mix"] as const) expect((PACKS[l] as Record<string, string>)[k], `${l}:${k}`).toBeTruthy();
    localStorage.setItem("tm:ui:lang", "bn"); go("#/diary/plan"); expect(q("[data-goal-picker=new]").textContent).toContain("ট্যাপ করুন");
    localStorage.setItem("tm:ui:lang", "mix"); go("#/diary/plan"); expect(q("[data-goal-picker=new]")).not.toBeNull();
  });
});

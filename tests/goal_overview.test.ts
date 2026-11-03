// Multi-goal step 6: the goals overview (one card per top-level goal), the fact line, the "not linked" card, the collapsed paused row, and the Steps section on a goal page.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { store } from "../src/ui/state";
import { PACKS } from "../src/i18n/packs";
import { withGoals } from "../src/core/taskGoals";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" } as FieldValue);
const rec = (id: string, entity: string, vals: Record<string, unknown>, over: Partial<TMRecord> = {}): TMRecord => ({ id, entity, ns: "demo", ownerId: "demo-user", schemaVersion: 2, createdAt: "2026-11-01T00:00:00Z", values: Object.fromEntries(Object.entries(vals).map(([k, x]) => [k, v(x)])), ...over });
const goal = (id: string, title: string, extra: Record<string, unknown> = {}, over: Partial<TMRecord> = {}) => rec(id, "goal", { "goal.title": title, ...extra }, over);
const step = (id: string, goals: string[], done = false, extra: Record<string, unknown> = {}) => withGoals(rec(id, "task", { "task.title": `Step ${id}`, ...(done ? { "task.done_on": "2026-11-02" } : {}), ...extra }), goals);
const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const go = (h: string) => { location.hash = h; render(); };

beforeEach(() => {
  localStorage.clear(); store.demo.clear(); store.real.clear();
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
});

describe("overview", () => {
  it("no steps yet: goal cards say 'Not known yet' (never 0), no fact line, no 'not linked' card", () => {
    store.demo.put(goal("a", "Shop")); go("#/journey/goals");
    expect(q("[data-root-goal=a]").textContent).toContain("Not known yet"); expect(q("[data-root-goal=a]").getAttribute("data-percent")).toBe("unknown");
    expect(app().querySelector("[data-link-stats]")).toBeNull(); expect(app().querySelector("[data-unlinked-card]")).toBeNull();
  });
  it("three goals make three stacked cards ordered by title (not by progress), a shared step shows on both, the fact line explains the total", () => {
    for (const g of [goal("c", "Zoo"), goal("a", "Apple"), goal("b", "Mango")]) store.demo.put(g);
    for (const s of [step("t1", ["a"], true), step("t2", ["a", "b"], true), step("t3", ["b"]), step("t4", []) ]) store.demo.put(s);
    go("#/journey/goals");
    expect([...app().querySelectorAll("article[data-root-goal]")].map((e) => e.getAttribute("data-root-goal"))).toEqual(["a", "b", "c"]);
    expect(q("[data-root-goal=a]").textContent).toContain("2 of 2 steps"); expect(q("[data-root-goal=b]").textContent).toContain("1 of 2 steps"); expect(q("[data-root-goal=c]").getAttribute("data-percent")).toBe("unknown");
    expect(q("[data-root-goal=a] [data-shared]").textContent).toBe("1 steps also help other goals");
    expect(q("[data-link-stats]").textContent).toContain("4 steps counted once · 1 help more than one goal · 1 not linked to a goal yet.");
    expect(q("[data-unlinked-card]").textContent).toBe("1 steps are not linked to a goal. Link them."); expect(q("[data-unlinked-card]").querySelector(".err, [role=alert]")).toBeNull();
    expect(q("[data-overall=journey]").getAttribute("data-percent")).toBe("50"); // 2 of 4 steps, each once
  });
  it("paused and retired goals sit under one collapsed row", () => {
    store.demo.put(goal("a", "Live")); store.demo.put(goal("p", "Later", { "goal.status": "paused" })); store.demo.put(goal("r", "Old", { "goal.status": "retired" }));
    go("#/journey/goals"); expect([...app().querySelectorAll("article[data-root-goal]")].map((e) => e.getAttribute("data-root-goal"))).toEqual(["a"]);
    const d = q<HTMLDetailsElement>("[data-quiet-goals]"); expect(d.open).toBe(false); expect(d.textContent).toContain("Paused or retired goals (2)"); expect(d.querySelectorAll("[data-root-goal]").length).toBe(2);
  });
  it("sub-goals roll up into their top-level card once; the tree and form are still on the page", () => {
    store.demo.put(goal("a", "Shop")); store.demo.put(goal("s1", "Stock", { "goal.kind": "subgoal" }, { links: { parent: "a" } })); store.demo.put(goal("s2", "Site", { "goal.kind": "subgoal" }, { links: { parent: "a" } }));
    store.demo.put(step("t1", ["s1", "s2"], true)); store.demo.put(step("t2", ["a"])); go("#/journey/goals");
    expect(q("[data-root-goal=a]").textContent).toContain("1 of 2 steps"); expect(app().querySelectorAll("article[data-root-goal]").length).toBe(1); expect(q("[data-goal-tree]")).not.toBeNull(); expect(q("form[data-form=goal-new]")).not.toBeNull();
  });
  it("English, Bangla and Mix all carry the new text", () => {
    for (const k of Object.keys(PACKS.en).filter((k) => /^gl\.(ov|card|steps|also|unlinked|paused|status)/.test(k))) for (const l of ["en", "bn", "mix"] as const) expect((PACKS[l] as Record<string, string>)[k], `${l}:${k}`).toBeTruthy();
    store.demo.put(goal("a", "Shop")); store.demo.put(step("t1", ["a"])); localStorage.setItem("tm:ui:lang", "bn"); go("#/journey/goals"); expect(q("[data-root-goal=a]").textContent).toContain("এই লক্ষ্য খুলুন");
    localStorage.setItem("tm:ui:lang", "mix"); go("#/journey/goals"); expect(q("[data-root-goal=a]")).not.toBeNull();
  });
});

describe("goal page: Steps", () => {
  it("lists the steps of the goal and of each part; a shared step appears under every goal it serves with an 'Also' chip", () => {
    store.demo.put(goal("a", "Shop")); store.demo.put(goal("b", "Learn")); store.demo.put(goal("s1", "Stock", { "goal.kind": "subgoal" }, { links: { parent: "a" } }));
    store.demo.put(step("t1", ["a", "b"], true)); store.demo.put(step("t2", ["s1"])); store.demo.put(step("t3", ["s1", "a"]));
    go("#/journey/goal/a"); const a = q("[data-steps-of=a]"); expect([...a.querySelectorAll("[data-step]")].map((e) => e.getAttribute("data-step"))).toEqual(["t1", "t3"]);
    expect(a.querySelector("[data-step=t1]")!.textContent).toContain("Also: Learn"); expect(a.querySelector("[data-step=t1] .tag.ok")).not.toBeNull();
    expect(q("[data-steps-of=s1]").textContent).toContain("Step t2"); expect(q("[data-steps-of=s1] [data-step=t3]").textContent).toContain("Also: Shop");
    go("#/journey/goal/b"); expect(q("[data-steps-of=b] [data-step=t1]").textContent).toContain("Also: Shop");
  });
  it("a goal with no step says so plainly", () => { store.demo.put(goal("a", "Shop")); go("#/journey/goal/a"); expect(q("[data-steps-of=a]").textContent).toContain("No step is linked here yet."); });
});

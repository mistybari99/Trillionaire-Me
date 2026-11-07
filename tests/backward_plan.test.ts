// Backward-planning wizard (plan tracker AU-22 / G3-02): core maths (end date to today over the user's own steps) and the screens.
// No invented tasks, unknown stays unknown, nothing saved until Save, Remove puts it back, en / bn / mix, linked from Goals and the goal page.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { ROUTES, render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { revokeConsent } from "../src/core/consent";
import { daysBetween, openSteps, planByOf, validDay, withPlanDates, withoutPlanDates, workBack } from "../src/core/backwardPlan";
import { resetBackward } from "../src/ui/backwardUi";
import { todayIsoKpi } from "../src/ui/kpiUi";
import { PACKS } from "../src/i18n/packs";
import type { FieldValue, TMRecord } from "../src/core/types";

const NOW = "2026-10-26T10:00:00.000Z";
const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" } as FieldValue);
const goal = (id: string, extra: Record<string, unknown> = {}): TMRecord => ({ id, entity: "goal", ns: "demo", ownerId: "demo-user", schemaVersion: 2, createdAt: NOW, values: { "goal.title": v(id), ...Object.fromEntries(Object.entries(extra).map(([k, x]) => [k, v(x)])) } });
const task = (id: string, goals: string[], extra: Record<string, unknown> = {}): TMRecord => ({ id, entity: "task", ns: "demo", ownerId: "demo-user", schemaVersion: 2, createdAt: NOW, values: { "task.title": v(`step ${id}`), "task.goals": v(goals), ...Object.fromEntries(Object.entries(extra).map(([k, x]) => [k, v(x)])) } });

describe("core", () => {
  it("dates: valid days only, day counting", () => { expect(validDay("2026-11-03")).toBe(true); expect(validDay("2026-02-30")).toBe(false); expect(validDay("11/03/2026")).toBe(false); expect(daysBetween("2026-11-03", "2026-11-13")).toBe(10); });
  it("works back from the end date: the last step lands on the end date, the first one is the earliest, dates never go backwards", () => {
    const r = workBack(["d", "c", "b", "a"], "2026-11-13", "2026-11-03"); if (r.kind !== "ok") throw new Error(r.kind);
    expect(r.rows.map((x) => x.id)).toEqual(["a", "b", "c", "d"]); expect(r.rows.at(-1)!.date).toBe("2026-11-13");
    for (let i = 1; i < r.rows.length; i++) expect(r.rows[i]!.date >= r.rows[i - 1]!.date).toBe(true);
    expect(r.rows.map((x) => x.date)).toEqual(["2026-11-06", "2026-11-08", "2026-11-11", "2026-11-13"]); expect(r.shared).toBe(false);
  });
  it("more steps than days share days; a date today or in the past gives no plan; no date gives no plan; no steps gives none", () => {
    const r = workBack(["c", "b", "a"], "2026-11-05", "2026-11-04"); expect(r.kind === "ok" && r.shared).toBe(true); expect(r.kind === "ok" && r.rows.every((x) => x.date === "2026-11-05")).toBe(true);
    expect(workBack(["a"], "2026-11-03", "2026-11-03").kind).toBe("past"); expect(workBack(["a"], "2026-10-01", "2026-11-03").kind).toBe("past");
    expect(workBack(["a"], "", "2026-11-03").kind).toBe("no-date"); expect(workBack([], "2026-12-01", "2026-11-03").kind).toBe("none");
  });
  it("open steps are only the user's own: this goal, counted, not done, not parked; nothing is made up", () => {
    const recs = [goal("g"), goal("h"), task("a", ["g"]), task("b", ["g", "h"]), task("c", ["g"], { "task.done_on": "2026-10-01" }), task("d", ["g"], { "task.parked_on": "2026-10-01" }), task("e", ["g"], { "task.not_true_on": "2026-10-01" }), task("f", ["h"])];
    expect(openSteps(recs, "g").map((s) => s.id)).toEqual(["a", "b"]); expect(openSteps(recs, "none")).toEqual([]);
  });
  it("planned dates are written onto copies and can be removed again; other fields stay", () => {
    const recs = [goal("g"), task("a", ["g"], { "task.minutes": 20 }), task("z", ["g"])]; const put = withPlanDates(recs, [{ id: "a", date: "2026-12-01" }], "DEMO");
    expect(put).toHaveLength(1); expect(planByOf(put[0]!)).toBe("2026-12-01"); expect(put[0]!.values["task.minutes"]).toEqual(v(20)); expect(recs[1]!.values["task.plan_by"]).toBeUndefined();
    const back = withoutPlanDates([put[0]!, recs[2]!], "g"); expect(back).toHaveLength(1); expect(back[0]!.values["task.plan_by"]).toBeUndefined(); expect(back[0]!.values["task.minutes"]).toEqual(v(20));
  });
});

const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const go = (hash: string) => { location.hash = hash; render(); };
const setDate = (d: string) => { const i = q<HTMLInputElement>("[data-bw=date]"); i.value = d; i.dispatchEvent(new Event("change")); render(); };
const plus = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
beforeEach(() => { localStorage.clear(); store.demo.clear(); store.real.clear(); revokeConsent(consentKv); resetBackward(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); });

describe("screens", () => {
  it("routes exist and are linked from Goals and the goal page", () => {
    expect(ROUTES.some(([re]) => re.test("/journey/backward"))).toBe(true); expect(ROUTES.some(([re]) => re.test("/journey/backward/g1"))).toBe(true);
    store.demo.put(goal("g1")); go("#/journey/goals"); expect(app().querySelector('a[href="#/journey/backward"]')).not.toBeNull();
    go("#/journey/goal/g1"); expect(app().querySelector('a[href="#/journey/backward/g1"]')).not.toBeNull();
  });
  it("no goals: calm message; goal without steps: says to add your own steps and creates none", () => {
    go("#/journey/backward"); expect(app().textContent).toMatch(/no goals yet/); store.demo.put(goal("g1")); go("#/journey/backward"); expect(q("[data-bw-goal=g1]")).not.toBeNull();
    go("#/journey/backward/g1"); expect(q("[data-bw=nosteps]").textContent).toMatch(/Add your own steps first/); expect(store.demo.list().filter((r) => r.entity === "task")).toHaveLength(0);
  });
  it("end date from the goal, user picks the last step then what comes before, dates appear; nothing saved until Save", () => {
    const end = plus(20); store.demo.put(goal("g1", { "goal.target_date": end })); for (const id of ["a", "b", "c"]) store.demo.put(task(id, ["g1"]));
    go("#/journey/backward/g1"); expect(q<HTMLInputElement>("[data-bw=date]").value).toBe(end); expect(q("[data-bw=pick] h3").textContent).toBe("Which of your own steps comes last?");
    q<HTMLButtonElement>("[data-bw-step=c]").click(); render(); expect(q("[data-bw=pick] h3").textContent).toMatch(/right before “step c”/);
    q<HTMLButtonElement>("[data-bw-step=a]").click(); render(); q<HTMLButtonElement>("[data-bw-step=b]").click(); render(); expect(q("[data-bw=allplaced]")).not.toBeNull();
    expect([...app().querySelectorAll("[data-bw-placed]")].map((e) => e.getAttribute("data-bw-placed"))).toEqual(["c", "a", "b"]);
    const rows = [...app().querySelectorAll("[data-bw-row]")]; expect(rows.map((e) => e.getAttribute("data-bw-row"))).toEqual(["b", "a", "c"]); expect(rows.at(-1)!.getAttribute("data-date")).toBe(end);
    expect(store.demo.list().some((r) => planByOf(r) !== null)).toBe(false);
  });
  it("Save writes planned-by dates only on the placed steps, shows them on the goal page; Remove takes them away; unplaced steps get none", () => {
    store.demo.put(goal("g1", { "goal.target_date": plus(10) })); for (const id of ["a", "b"]) store.demo.put(task(id, ["g1"])); go("#/journey/backward/g1");
    q<HTMLButtonElement>("[data-bw-step=b]").click(); render(); expect(q("[data-bw=unplaced]").textContent).toMatch(/1 steps are not placed/);
    q<HTMLButtonElement>("[data-act=bw-save]").click(); render(); expect(q("[data-bw=msg]").textContent).toMatch(/1 steps now show/);
    expect(planByOf(store.demo.get("b")!)).toBe(plus(10)); expect(store.demo.get("a")!.values["task.plan_by"]).toBeUndefined();
    go("#/journey/goal/g1"); expect(q("[data-step=b] [data-plan-by]").textContent).toMatch(/planned by/); expect(app().querySelector("[data-step=a] [data-plan-by]")).toBeNull();
    go("#/journey/backward/g1"); q<HTMLButtonElement>("[data-act=bw-clear]").click(); render(); expect(store.demo.get("b")!.values["task.plan_by"]).toBeUndefined(); expect(q("[data-bw=msg]").textContent).toMatch(/Removed the dates from 1/);
  });
  it("a past or empty end date shows a calm prompt (not the error style) and no dates; Take back the last pick works", () => {
    store.demo.put(goal("g1")); store.demo.put(task("a", ["g1"])); go("#/journey/backward/g1"); expect(q("[data-bw=nodate]").className).toBe("need"); expect(app().querySelector("[data-bw=result]")).toBeNull();
    setDate("2020-01-01"); q<HTMLButtonElement>("[data-bw-step=a]").click(); render(); expect(q("[data-bw=past]").className).toBe("need"); expect(app().querySelector("p.err")).toBeNull(); expect(app().querySelector("[data-bw=result]")).toBeNull();
    setDate(plus(5)); expect(app().querySelector("[data-bw=result]")).not.toBeNull(); q<HTMLButtonElement>("[data-act=bw-undo]").click(); render(); expect(app().querySelector("[data-bw=placed]")).toBeNull();
  });
  it("more steps than days: says so calmly", () => {
    store.demo.put(goal("g1", { "goal.target_date": plus(1) })); for (const id of ["a", "b", "c"]) store.demo.put(task(id, ["g1"])); go("#/journey/backward/g1");
    for (const id of ["a", "b", "c"]) { q<HTMLButtonElement>(`[data-bw-step=${id}]`).click(); render(); } expect(q("[data-bw=shared]").textContent).toMatch(/some steps share a day/); expect(todayIsoKpi()).toMatch(/^\d{4}-/);
  });
  for (const lang of ["bn", "mix"]) it(`works in ${lang}`, () => {
    localStorage.setItem("tm:ui:lang", lang); store.demo.put(goal("g1", { "goal.target_date": plus(6) })); store.demo.put(task("a", ["g1"])); go("#/journey/backward/g1"); q<HTMLButtonElement>("[data-bw-step=a]").click(); render();
    expect(app().querySelector("h1")!.textContent).toMatch(/[ঀ-৿]/); expect(q("[data-bw=result]").textContent).toMatch(/[ঀ-৿]/); expect(app().textContent).not.toMatch(/[০-৯]/);
  });
  it("every bw key exists in en and bn with no score or guarantee wording", () => {
    for (const k of Object.keys(PACKS.en).filter((x) => x.startsWith("bw."))) { expect(PACKS.bn[k as keyof typeof PACKS.bn], k).toBeTruthy(); expect(PACKS.en[k as keyof typeof PACKS.en], k).not.toMatch(/\b(score|rank|streak|guarantee|overdue|fail|behind)/i); }
  });
});

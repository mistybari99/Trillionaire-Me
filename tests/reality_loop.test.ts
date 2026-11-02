// M12 reality-changed loop, end to end: event form -> storage -> rule-based impact -> up to 3 options -> old/new plan diff -> approval ->
// new plan version (old one kept) -> history, Today, report, plan screen. Unknown is never 0. No option adds work. EN / BN / mix.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { ROUTES, render } from "../src/app";
import { consentKv, prefs, store } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import { PACKS, type Key } from "../src/i18n/packs";
import { isOpenTask, tasksFrom } from "../src/core/planInputs";
import { schedule } from "../src/core/planner";
import {
  addDays, applyToRecords, eventRows, impactOf, nextVersionNumber, noImpact, optionsFor, parkedRows, parseSnapshot, planChange, planDiff, resumeChange, snapshotOf, validateEvent, versionRows,
} from "../src/core/realityLoop";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" }) as FieldValue;
const rec = (id: string, entity: string, values: Record<string, FieldValue>, links?: Record<string, string>): TMRecord => ({ id, entity, ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-11-02T08:00:00.000Z", values, ...(links ? { links } : {}) });
const goal = (id: string, title: string, o: { date?: string; area?: string; status?: string } = {}) => rec(id, "goal", { "goal.title": v(title), ...(o.date ? { "goal.target_date": v(o.date) } : {}), ...(o.area ? { "goal.area": v(o.area) } : {}), ...(o.status ? { "goal.status": v(o.status) } : {}) });
const task = (id: string, title: string, o: { goal?: string; after?: string; prio?: string; min?: number } = {}) => rec(id, "task", { "task.title": v(title), "task.priority": v(o.prio ?? "normal"), "task.minutes": v(o.min ?? 30) },
  o.goal || o.after ? { ...(o.goal ? { goal: o.goal } : {}), ...(o.after ? { after: o.after } : {}) } : undefined);
const TODAY = "2026-11-02";

describe("event rows and input rules", () => {
  it("reads kind, date, note, state, goal link; unreadable kind drops from view; newest first", () => {
    const rows = eventRows([
      rec("a", "reality_event", { "reality_event.kind": v("time_less"), "reality_event.on": v("2026-10-01"), "reality_event.status": v("open") }),
      rec("b", "reality_event", { "reality_event.kind": v("illness"), "reality_event.on": v("2026-10-20"), "reality_event.status": v("decided"), "reality_event.option": v("pause") }, { goal: "g1" }),
      rec("bad", "reality_event", { "reality_event.kind": v("nope") })]);
    expect(rows.map((r) => r.id)).toEqual(["b", "a"]);
    expect(rows[0]).toMatchObject({ status: "decided", option: "pause", goalId: "g1" });
  });
  it("validation: kind required, note up to 200, real date only", () => {
    expect(validateEvent({ kind: "", note: "", on: "" })).toBe("kind_required");
    expect(validateEvent({ kind: "setback", note: "x".repeat(201), on: "" })).toBe("note_long");
    expect(validateEvent({ kind: "setback", note: "", on: "2026-02-30" })).toBe("date_invalid");
    expect(validateEvent({ kind: "setback", note: "ok", on: "2026-11-02" })).toBeNull();
    expect(addDays("2026-12-25", 14)).toBe("2027-01-08");
  });
});

describe("impact (dependency graph and rules)", () => {
  const base = [goal("g1", "Launch", { date: "2026-12-01", area: "business" }), goal("g2", "Read", { date: "2027-01-01" }), goal("g3", "No date"),
    task("t1", "Plan", { goal: "g1", prio: "high" }), task("t2", "Build", { goal: "g1", after: "t1" }), task("t3", "Ship", { goal: "g1", after: "t2", prio: "low" }), task("t4", "Page", { goal: "g2" }), task("t5", "Idea", { goal: "g3" }),
    rec("risk1", "risk", { "risk.text": v("Late launch") }), rec("f1", "finance_item", { "finance.kind": v("income"), "finance.label": v("Sales"), "finance.amount": v(100) }, { venture: "v1" }), rec("v1", "venture", { "venture.name": v("Shop") })];
  it("time_less touches every open step, the goals they belong to, and the dates of those goals; undated goals are not invented a date", () => {
    const i = impactOf(base, { kind: "time_less", goalId: null });
    expect(i.tasks.map((x) => x.id).sort()).toEqual(["t1", "t2", "t3", "t4", "t5"]);
    expect(i.goals.map((g) => g.id).sort()).toEqual(["g1", "g2", "g3"]);
    expect(i.dates.map((d) => d.goalId).sort()).toEqual(["g1", "g2"]);
    expect(i.money).toBeNull(); expect(i.risks).toEqual([]);
  });
  it("a chosen goal narrows the scope and follows 'after' links to steps that wait for it", () => {
    const rest = base.map((r) => (r.id === "t4" ? { ...r, links: { goal: "g2", after: "t3" } } : r));   // a step of another goal waits for t3
    const i = impactOf(rest, { kind: "illness", goalId: "g1" });
    expect(i.tasks.map((x) => x.id).sort()).toEqual(["t1", "t2", "t3", "t4"]);
    expect(i.tasks.find((x) => x.id === "t4")!.viaDependency).toBe(true);
    expect(i.goals.map((g) => g.id)).toEqual(["g1"]);
  });
  it("income, spending and market changes touch money lines, ventures, risks and business goals, not the schedule", () => {
    const i = impactOf(base, { kind: "income_change", goalId: null });
    expect(i.tasks).toEqual([]); expect(i.goals.map((g) => g.id)).toEqual(["g1"]); expect(i.money).toEqual({ lines: 1, ventures: [{ id: "v1", name: "Shop" }] }); expect(i.risks).toHaveLength(1);
    expect(i.assumptions).toEqual(["income", "dates"]);
  });
  it("an opportunity with no chosen goal touches nothing; done, parked and no-longer-true steps are never affected; paused goals are left out", () => {
    expect(noImpact(impactOf(base, { kind: "opportunity", goalId: null }))).toBe(true);
    const recs = [goal("g1", "A", { date: "2026-12-01" }), goal("g2", "B", { status: "paused", date: "2026-12-01" }), task("a", "A1", { goal: "g1" }), task("b", "B1", { goal: "g2" }),
      rec("d", "task", { "task.title": v("done"), "task.done_on": v(TODAY) }, { goal: "g1" }), rec("p", "task", { "task.title": v("parked"), "task.parked_on": v(TODAY) }, { goal: "g1" }), rec("n", "task", { "task.title": v("nt"), "task.not_true_on": v(TODAY) }, { goal: "g1" })];
    const i = impactOf(recs, { kind: "time_less", goalId: null });
    expect(i.tasks.map((x) => x.id).sort()).toEqual(["a", "b"]); expect(i.goals.map((g) => g.id)).toEqual(["g1"]); expect(i.markedNotTrue).toBe(1);
  });
});

describe("options: at most 3, only what would really change, never adds a task", () => {
  const recs = [goal("g1", "Launch", { date: "2026-12-01" }), task("t1", "A", { goal: "g1", prio: "high" }), task("t2", "B", { goal: "g1", after: "t1" }), task("t3", "C", { goal: "g1", prio: "low" }), task("t4", "D", { goal: "g1", prio: "low" })];
  it("time_less offers reduce scope, move dates, pause (3 at most)", () => {
    expect(optionsFor(impactOf(recs, { kind: "time_less", goalId: null }), "normal")).toEqual(["reduce_scope", "move_dates", "pause"]);
  });
  it("pause is not offered while already paused; change path needs one chosen goal; move dates needs a dated goal", () => {
    expect(optionsFor(impactOf(recs, { kind: "illness", goalId: null }), "pause")).toEqual(["reduce_scope", "move_dates"]);
    expect(optionsFor(impactOf(recs, { kind: "setback", goalId: null }), "normal")).toEqual(["move_dates", "pause"]);
    expect(optionsFor(impactOf(recs, { kind: "setback", goalId: "g1" }), "normal")).toEqual(["move_dates", "change_path", "pause"]);
    const undated = [goal("g1", "Launch"), task("t1", "A", { goal: "g1" })];
    expect(optionsFor(impactOf(undated, { kind: "time_less", goalId: null }), "normal")).toEqual(["pause"]);
  });
  it("reduce scope needs 2 or more steps", () => {
    expect(optionsFor(impactOf([goal("g1", "L", { date: "2026-12-01" }), task("t1", "A", { goal: "g1" })], { kind: "time_less", goalId: null }), "pause")).toEqual(["move_dates"]);
  });
  it("no option is offered when nothing is affected", () => {
    expect(optionsFor(impactOf([], { kind: "opportunity", goalId: null }), "normal")).toEqual(["pause"].filter(() => false));
  });
  it("move dates: dated goals move by the chosen days; a date already past moves from today; undated goals are left alone", () => {
    const rs = [goal("g1", "A", { date: "2026-12-01" }), goal("g2", "B", { date: "2026-10-01" }), goal("g3", "C"), task("a", "A1", { goal: "g1" }), task("b", "B1", { goal: "g2" }), task("c", "C1", { goal: "g3" })];
    const imp = impactOf(rs, { kind: "time_less", goalId: null });
    const ch = planChange(rs, imp, "move_dates", { today: TODAY, days: 14, mode: "normal" });
    const dates = Object.fromEntries(ch.puts.map((r) => [r.id, (r.values["goal.target_date"] as { value: string }).value]));
    expect(dates).toEqual({ g1: "2026-12-15", g2: "2026-11-16" });
    expect(applyToRecords(rs, ch).find((r) => r.id === "g3")!.values["goal.target_date"]).toBeUndefined();
  });
  it("reduce scope keeps the more important half and every step a kept step waits for; the others are parked, not deleted, and no task is added", () => {
    const imp = impactOf(recs, { kind: "time_less", goalId: null });
    const ch = planChange(recs, imp, "reduce_scope", { today: TODAY, days: 14, mode: "normal" });
    expect(ch.puts.map((r) => r.id).sort()).toEqual(["t3", "t4"]);
    const after = applyToRecords(recs, ch);
    expect(after).toHaveLength(recs.length);
    expect(after.filter(isOpenTask).map((r) => r.id).sort()).toEqual(["t1", "t2"]);
    expect(parkedRows(after).map((r) => r.id).sort()).toEqual(["t3", "t4"]);
    // a kept step's prerequisite is never parked
    const chain = [goal("g", "G"), task("p1", "P1", { goal: "g", prio: "low" }), task("p2", "P2", { goal: "g", after: "p1", prio: "high" }), task("p3", "P3", { goal: "g", prio: "low" })];
    const c2 = planChange(chain, impactOf(chain, { kind: "time_less", goalId: null }), "reduce_scope", { today: TODAY, days: 14, mode: "normal" });
    expect(c2.puts.map((r) => r.id)).toEqual(["p3"]);
  });
  it("a parked step is not scheduled (schedule places fewer steps); pause changes only the mode; change path pauses the chosen goal", () => {
    const imp = impactOf(recs, { kind: "time_less", goalId: null });
    const after = applyToRecords(recs, planChange(recs, imp, "reduce_scope", { today: TODAY, days: 14, mode: "normal" }));
    const mk = (rs: TMRecord[]) => schedule({ weeklyFreeMinutes: 600, blocked: [], tasks: tasksFrom(rs), mode: "normal" });
    expect(mk(recs).placements).toHaveLength(4); expect(mk(after).placements).toHaveLength(2);
    expect(planChange(recs, imp, "pause", { today: TODAY, days: 14, mode: "normal" })).toMatchObject({ puts: [], mode: "pause" });
    const cp = planChange(recs, impactOf(recs, { kind: "setback", goalId: "g1" }), "change_path", { today: TODAY, days: 14, mode: "normal" });
    expect(cp.big).toBe(true); expect(cp.puts[0]!.values["goal.status"]).toMatchObject({ value: "paused" });
  });
  it("resume gently: ends the mode and brings back at most 3 parked steps, most important first", () => {
    const parked = ["a", "b", "c", "d"].map((id, i) => rec(id, "task", { "task.title": v(id), "task.priority": v(i === 3 ? "high" : "low"), "task.parked_on": v(TODAY) }));
    const ch = resumeChange(parked, { today: TODAY, mode: "pause" });
    expect(ch.puts.map((r) => r.id)).toEqual(["d", "a", "b"]); expect(ch.mode).toBe("normal");
    expect(ch.puts.every((r) => r.values["task.parked_on"] === undefined)).toBe(true);
    expect(resumeChange([], { today: TODAY, mode: "normal" })).toMatchObject({ puts: [], mode: null });
  });
});

describe("snapshots and plan-diff", () => {
  it("diff lists changed rows only: date, status, step state, mode", () => {
    const recs = [goal("g1", "A", { date: "2026-12-01" }), task("t1", "S1", { goal: "g1" }), task("t2", "S2", { goal: "g1" })];
    const b = snapshotOf(recs, "normal");
    const ch = planChange(recs, impactOf(recs, { kind: "time_less", goalId: null }), "move_dates", { today: TODAY, days: 7, mode: "normal" });
    const a = snapshotOf(applyToRecords(recs, ch), "pause");
    expect(planDiff(b, a)).toEqual([{ kind: "mode", id: "mode", title: "", field: "mode", from: "normal", to: "pause" }, { kind: "goal", id: "g1", title: "A", field: "date", from: "2026-12-01", to: "2026-12-08" }]);
    expect(planDiff(b, b)).toEqual([]);
  });
  it("a snapshot survives a round trip; garbage is not trusted", () => {
    const s = snapshotOf([goal("g1", "A")], "normal");
    expect(parseSnapshot(JSON.stringify(s))).toEqual(s);
    expect(parseSnapshot("{bad")).toBeNull(); expect(parseSnapshot(JSON.stringify({ v: 2 }))).toBeNull(); expect(parseSnapshot(null)).toBeNull();
    expect(versionRows([rec("pv", "plan_version", { "plan_version.number": v(1), "plan_version.option": v("pause"), "plan_version.snapshot": v("garbage") })])[0]!.diff).toBeNull();
    expect(nextVersionNumber([])).toBe(1);
  });
});

// ---------------------------------------------------------------- screens
const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector(sel) as T | null;
const $$ = <T extends Element = HTMLElement>(sel: string) => [...document.querySelectorAll(sel)] as T[];
const set = (id: string, value: string) => { ($(`#${id}`) as HTMLInputElement).value = value; };
const go = (h: string) => { location.hash = h; render(); };
const submit = (form: string) => { $<HTMLFormElement>(`form[data-form="${form}"]`)!.dispatchEvent(new Event("submit", { cancelable: true })); render(); };
const raw = (form: string) => $<HTMLFormElement>(`form[data-form="${form}"]`)!.dispatchEvent(new Event("submit", { cancelable: true }));
const click = (sel: string) => { $<HTMLButtonElement>(sel)!.click(); render(); };
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const seed = () => {
  for (const r of [goal("g1", "Launch shop", { date: "2030-12-01" }), task("t1", "Plan", { goal: "g1", prio: "high" }), task("t2", "Build", { goal: "g1", after: "t1" }), task("t3", "Ship", { goal: "g1", prio: "low" }), task("t4", "Page", { goal: "g1", prio: "low" })]) store.demo.put(r);
};
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>';
  localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, "2026-11-02T00:00:00.000Z");
});

describe("reality screen, demo mode", () => {
  it("the page is routed, linked from Journey, Today-independent, and every input has a label", () => {
    expect(ROUTES.some(([re]) => re.test("/journey/reality"))).toBe(true);
    go("#/journey"); expect($('a[href="#/journey/reality"]')).not.toBeNull();
    go("#/journey/reality");
    for (const id of ["rl-kind", "rl-date", "rl-note"]) expect($(`label[for="${id}"]`), id).not.toBeNull();
    expect($("form .err")!.getAttribute("role")).toBe("alert"); expect($('[data-waiting="0"]')).not.toBeNull();
  });
  it("form -> storage: nothing chosen is refused; a note that looks like a secret is refused; a valid event is saved as an open event", () => {
    seed(); go("#/journey/reality");
    raw("reality-event"); expect($("form[data-form=reality-event] .err")!.textContent).toMatch(/Choose what changed/);
    set("rl-kind", "time_less"); set("rl-note", "my password is hunter2"); raw("reality-event");
    expect(store.demo.list().filter((r) => r.entity === "reality_event")).toHaveLength(0);
    set("rl-note", "New job hours"); set("rl-goal", "g1"); submit("reality-event");
    const ev = store.demo.list().filter((r) => r.entity === "reality_event"); expect(ev).toHaveLength(1);
    expect(ev[0]!.values["reality_event.status"]).toMatchObject({ value: "open", label: "DEMO" }); expect(ev[0]!.links).toEqual({ goal: "g1" });
  });
  it("calculation -> screen: impact, at most 3 options, each with an old-to-new list; nothing is saved before approval", () => {
    seed(); go("#/journey/reality"); set("rl-kind", "time_less"); submit("reality-event");
    const card = $('[data-event-state="open"]')!;
    expect(card.querySelector('[data-impact="tasks"]')!.textContent).toMatch(/Steps: 4/);
    expect(card.querySelector('[data-impact="dates"]')!.textContent).toMatch(/Launch shop \(2030-12-01\)/);
    const opts = $$("section[data-option]"); expect(opts.length).toBeLessThanOrEqual(3); expect(opts.map((o) => o.getAttribute("data-option"))).toEqual(["reduce_scope", "move_dates", "pause"]);
    expect($('[data-option="move_dates"] [data-diff-row="goal:date"]')!.textContent).toBe("Goal Launch shop: date 2030-12-01 to 2030-12-15");
    expect($('[data-option="pause"] [data-diff-row="mode:mode"]')!.textContent).toBe("Plan mode: Normal to Pause");
    expect(store.demo.list().filter((r) => r.entity === "plan_version")).toHaveLength(0);
    expect(store.demo.get("g1")!.values["goal.target_date"]).toMatchObject({ value: "2030-12-01" });
    expect(card.textContent).not.toMatch(/fail|behind|overdue|missed|lost|wrong/i);
  });
  it("changing the number of days updates the preview before approval", () => {
    seed(); go("#/journey/reality"); set("rl-kind", "time_less"); submit("reality-event");
    const sel = $<HTMLSelectElement>('[data-option="move_dates"] select')!; sel.value = "30"; sel.dispatchEvent(new Event("change"));
    expect($('[data-option="move_dates"] [data-diff-row="goal:date"]')!.textContent).toMatch(/2030-12-31/);
  });
  it("approve move dates: the goal date moves, version 1 keeps old and new, the event is decided, a log line is written, history/Today/report show it", () => {
    seed(); go("#/journey/reality"); set("rl-kind", "time_less"); submit("reality-event");
    click('[data-option="move_dates"] [data-act="approve"]');
    expect(store.demo.get("g1")!.values["goal.target_date"]).toMatchObject({ value: "2030-12-15" });
    const vs = store.demo.list().filter((r) => r.entity === "plan_version"); expect(vs).toHaveLength(1);
    expect(vs[0]!.values["plan_version.number"]).toMatchObject({ value: 1 }); expect(vs[0]!.values["plan_version.option"]).toMatchObject({ value: "move_dates" });
    const row = versionRows(store.demo.list())[0]!; expect(row.before!.goals[0]!.date).toBe("2030-12-01"); expect(row.after!.goals[0]!.date).toBe("2030-12-15");
    const ev = store.demo.list().find((r) => r.entity === "reality_event")!; expect(ev.values["reality_event.status"]).toMatchObject({ value: "decided" }); expect(ev.values["reality_event.option"]).toMatchObject({ value: "move_dates" });
    expect(store.demo.list().some((r) => r.entity === "journey_log" && r.links?.event === ev.id)).toBe(true);
    expect($('[data-saved-version="1"]')!.textContent).toMatch(/version 1/); expect($('[data-waiting="0"]')).not.toBeNull();
    go("#/journey/history"); expect($('[data-version="1"]')!.textContent).toMatch(/Version 1 · Move dates/); expect($('[data-version="1"] [data-diff-row="goal:date"]')!.textContent).toMatch(/2030-12-01 to 2030-12-15/);
    expect($('[data-event-row] , [data-events]')).not.toBeNull();
    go("#/journey/report"); expect($('[data-reality-report="1"]')!.textContent).toMatch(/1 saved plan version/);
    go("#/today"); expect($("[data-reality-today]")).toBeNull();
  });
  it("Today shows a calm card while an event waits, and it links to the page", () => {
    seed(); go("#/journey/reality"); set("rl-kind", "time_less"); submit("reality-event");
    go("#/today"); const c = $("[data-reality-today]")!; expect(c.textContent).toMatch(/1 event\(s\) wait/); expect(c.querySelector('a[href="#/journey/reality"]')).not.toBeNull();
  });
  it("reduce scope needs more than 5 steps or a tick only for big changes; here 2 steps park without a tick, they leave the schedule and show on the Plan screen with a link", () => {
    seed(); go("#/journey/reality"); set("rl-kind", "time_less"); submit("reality-event");
    expect($('[data-option="reduce_scope"] input[type=checkbox]')).toBeNull();
    click('[data-option="reduce_scope"] [data-act="approve"]');
    expect(parkedRows(store.demo.list()).map((r) => r.id).sort()).toEqual(["t3", "t4"]);
    expect(store.demo.list().filter((r) => r.entity === "task")).toHaveLength(4);
    expect($('[data-parked-list="2"]')).not.toBeNull();
    go("#/diary/plan"); expect($('[data-parked="t3"]')!.textContent).toMatch(/Parked since/); expect($('[data-task="t3"] a[href="#/journey/reality"]')).not.toBeNull();
    go("#/today"); expect($("[data-rl-parked]")!.textContent).toMatch(/2 step\(s\) are parked/);
  });
  it("change path is a big change: approval needs the tick, then the goal is paused and the old goal state stays in the version", () => {
    seed(); go("#/journey/reality"); set("rl-kind", "setback"); set("rl-goal", "g1"); submit("reality-event");
    const approve = $<HTMLButtonElement>('[data-option="change_path"] [data-act="approve"]')!;
    approve.click(); expect($('[data-option="change_path"] .err')!.textContent).toBe("Tick the box first.");
    expect(store.demo.get("g1")!.values["goal.status"]).toBeUndefined();
    ($('[data-option="change_path"] input[type=checkbox]') as HTMLInputElement).checked = true; approve.click();
    expect(store.demo.get("g1")!.values["goal.status"]).toMatchObject({ value: "paused" });
    const row = versionRows(store.demo.list())[0]!; expect(row.diff).toEqual([{ kind: "goal", id: "g1", title: "Launch shop", field: "status", from: "active", to: "paused" }]);
  });
  it("pause sets the plan mode, Resume gently ends it and brings parked steps back; each makes a version; versions only grow", () => {
    seed(); go("#/journey/reality"); set("rl-kind", "illness"); submit("reality-event");
    expect($$("section[data-option]").map((o) => o.getAttribute("data-option"))).toEqual(["pause", "reduce_scope", "move_dates"]);
    click('[data-option="pause"] [data-act="approve"]');
    expect(prefs.mode).toBe("pause");
    expect($("[data-resume]")).not.toBeNull();
    click('[data-act="resume"]');
    expect(prefs.mode).toBe("normal");
    expect(versionRows(store.demo.list()).map((x) => [x.number, x.option])).toEqual([[2, "resume"], [1, "pause"]]);
    expect($("[data-resume]")).toBeNull();
  });
  it("bring back one parked step", () => {
    seed(); store.demo.put({ ...store.demo.get("t3")!, values: { ...store.demo.get("t3")!.values, "task.parked_on": v(today()) } });
    go("#/journey/reality"); click('[data-parked="t3"] [data-act="bring-back"]');
    expect(store.demo.get("t3")!.values["task.parked_on"]).toBeUndefined(); expect(parkedRows(store.demo.list())).toHaveLength(0);
  });
  it("an event that touches nothing can only be noted; the plan stays as it is", () => {
    go("#/journey/reality"); set("rl-kind", "opportunity"); submit("reality-event");
    expect($('[data-impact="none"]')).not.toBeNull(); expect($('[data-options="0"]')).not.toBeNull();
    click('[data-act="note-only"]');
    expect(store.demo.list().find((r) => r.entity === "reality_event")!.values["reality_event.status"]).toMatchObject({ value: "noted" });
    expect(store.demo.list().filter((r) => r.entity === "plan_version")).toHaveLength(0);
  });
  it("Today stays quiet with no event and no parked step", () => { go("#/today"); expect($("[data-reality-today]")).toBeNull(); });
  it("the old 'no longer true' button still works and stays in the history list", () => {
    seed(); go("#/diary/plan"); click('[data-act="reality-changed"][data-task-id="t1"]');
    expect(store.demo.get("t1")!.values["task.not_true_on"]?.state).toBe("value"); go("#/journey/history"); expect($('[data-hist="not_true"]')).not.toBeNull();
  });
});

describe("real mode, labels and languages", () => {
  it("real mode without the consent tick saves nothing; with the tick the records are real (FACT) and demo events never show", () => {
    localStorage.setItem("tm:ui:dataMode", "real"); localStorage.removeItem("tm:consent");
    for (const k of Object.keys(localStorage)) if (k.includes("consent")) localStorage.removeItem(k);
    go("#/journey/reality"); expect($("[data-consent-prompt]")).not.toBeNull();
    set("rl-kind", "time_less"); submit("reality-event"); expect(store.real.list().length + store.demo.list().length).toBe(0);
    grantConsent(consentKv, "2026-11-02T00:00:00.000Z"); store.demo.put(rec("dev", "reality_event", { "reality_event.kind": v("illness"), "reality_event.status": v("open") }));
    go("#/journey/reality"); set("rl-kind", "time_less"); submit("reality-event");
    const r = store.real.list().filter((x) => x.entity === "reality_event"); expect(r).toHaveLength(1); expect(r[0]!.values["reality_event.kind"]).toMatchObject({ label: "FACT" });
    expect($$("[data-event]")).toHaveLength(1);
  });
  const KEYS = Object.keys(PACKS.en).filter((k) => k.startsWith("rl.")) as Key[];
  it("every rl text exists in English, Bangla and Mix with the same placeholders; loanwords are used", () => {
    expect(KEYS.length).toBeGreaterThan(90);
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    for (const k of KEYS) { expect(PACKS.bn[k]?.trim(), k).toBeTruthy(); expect(PACKS.mix[k]?.trim(), k).toBeTruthy(); expect(ph(PACKS.bn[k]), k).toBe(ph(PACKS.en[k])); }
    const bn = KEYS.map((k) => PACKS.bn[k]).join(" ");
    for (const bad of ["কর্মী", "পরিকল্পনা", "দক্ষতা", "ঝুঁকি", "অগ্রগতি", "বিকল্প", "সংরক্ষণ", "বিজ্ঞপ্তি", "মুছুন", "সংস্করণ", "তালিকা", "ইতিহাস্"]) expect(bn, bad).not.toContain(bad);
    expect(PACKS.bn["rl.hist.versions"]).toContain("ভার্সন"); expect(PACKS.mix["rl.hist.versions"]).toContain("Version"); expect(PACKS.bn["rl.opt.change_path"]).toContain("পথ");
  });
  for (const lang of ["bn", "mix"] as const) it(`all reality screens render in ${lang}: Latin digits, no raw keys, nothing punishing`, () => {
    localStorage.setItem("tm:ui:lang", lang); seed();
    go("#/journey/reality"); set("rl-kind", "time_less"); submit("reality-event");
    click('[data-option="reduce_scope"] [data-act="approve"]');
    go("#/journey/reality"); set("rl-kind", "illness"); submit("reality-event");
    for (const p of ["#/journey/reality", "#/journey/history", "#/journey/report", "#/today", "#/diary/plan", "#/journey"]) { go(p); expect(document.body.textContent, p).not.toMatch(/[০-৯]|\brl\.[a-z]/); }
    go("#/journey/reality"); expect($("[data-impact-box]")).not.toBeNull();
  });
});

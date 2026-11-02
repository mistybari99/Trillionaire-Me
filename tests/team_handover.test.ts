// M10 team and delegation, end to end: roles -> steps tied to roles -> hand-over plan and done -> hiring step -> gap analysis ->
// Team page, Plan screen, Today, report. Roles only (no names). Unknown is never 0. A handed-over step leaves the user's schedule but still counts toward its goal.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { consentKv, prefs, store } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import { PACKS, type Key } from "../src/i18n/packs";
import { analyseTeam, assignTask, completeHandover, roleViews, syncDelegation, validateHandover, withHolder, handoverRows } from "../src/core/team";
import { isDelegatedTask, isOpenTask, tasksFrom } from "../src/core/planInputs";
import { schedule } from "../src/core/planner";
import { goalProgress } from "../src/core/goalPlan";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" }) as FieldValue;
const rec = (id: string, entity: string, values: Record<string, FieldValue>, links?: Record<string, string>): TMRecord => ({ id, entity, ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-11-02T08:00:00.000Z", values, ...(links ? { links } : {}) });
const role = (id: string, name: string, holder?: string) => rec(id, "team_role", { "team_role.role": v(name), ...(holder ? { "team_role.holder": v(holder) } : { "team_role.holder": { state: "unknown" } }) });
const task = (id: string, o: { role?: string; min?: number; goal?: string; done?: boolean } = {}) => rec(id, "task", { "task.title": v(id), "task.priority": v("normal"), ...(o.min ? { "task.minutes": v(o.min) } : {}), ...(o.done ? { "task.done_on": v("2026-11-01") } : {}) },
  o.role || o.goal ? { ...(o.role ? { role: o.role } : {}), ...(o.goal ? { goal: o.goal } : {}) } : undefined);
const TODAY = "2026-11-02";

describe("role views and gap analysis", () => {
  it("each role shows its open steps, known minutes (never 0 for a missing estimate), and a gap state", () => {
    const recs = [role("r1", "Books", "open"), role("r2", "Sales", "me"), role("r3", "Ops"), role("r4", "Legal", "someone"), role("r5", "Idle", "open"),
      task("a", { role: "r1", min: 30 }), task("b", { role: "r1" }), task("c", { role: "r2", min: 60 }), task("d", { role: "r1", done: true })];
    const vs = Object.fromEntries(roleViews(recs).map((x) => [x.row.id, x]));
    expect(vs.r1!.tasks.map((x) => x.id)).toEqual(["a", "b"]); expect(vs.r1!.knownMinutes).toBe(30); expect(vs.r1!.unknownEstimates).toBe(1); expect(vs.r1!.gap).toBe("gap");
    expect(vs.r2!.gap).toBe("mine"); expect(vs.r3!.gap).toBe("unanswered"); expect(vs.r4!.gap).toBe("covered"); expect(vs.r5!.gap).toBe("open_no_steps");
  });
  it("analysis: gaps, unanswered, unassigned steps, my load against free time; free time unknown gives no comparison", () => {
    const recs = [role("r1", "Books", "open"), role("r2", "Sales", "me"), role("r3", "Ops"), task("a", { role: "r1", min: 30 }), task("c", { role: "r2", min: 60 }), task("e", { role: "r2" }), task("f")];
    const a = analyseTeam(recs, 90);
    expect(a).toMatchObject({ roles: 3, gaps: 1, unanswered: 1, unassigned: 1, mine: { steps: 2, knownMinutes: 60, unknownEstimates: 1, freeMinutes: 90, over: false } });
    expect(analyseTeam(recs, 30).mine.over).toBe(true); expect(analyseTeam(recs, null).mine).toMatchObject({ freeMinutes: null, over: null });
    expect(analyseTeam([], 100)).toMatchObject({ roles: 0, gaps: 0, mine: { steps: 0, over: null } });
  });
  it("a step whose role is gone counts as unassigned, not as covered", () => {
    expect(analyseTeam([task("a", { role: "missing" })], null).unassigned).toBe(1);
  });
});

describe("tying steps to roles and delegation", () => {
  it("assignTask sets and removes links.role and keeps other links", () => {
    const t0 = task("a", { goal: "g1" }); const t1 = assignTask(t0, "r1");
    expect(t1.links).toEqual({ goal: "g1", role: "r1" }); expect(assignTask(t1, null).links).toEqual({ goal: "g1" }); expect(assignTask(task("b", { role: "r1" }), null).links).toBeUndefined();
  });
  it("a step of a role held by someone else is delegated; changing the holder undoes it; done steps are never touched", () => {
    let recs = [role("r1", "Books", "someone"), task("a", { role: "r1", min: 30 }), task("b", { role: "r1", done: true }), task("c")];
    let put = syncDelegation(recs, TODAY); expect(put.map((r) => r.id)).toEqual(["a"]);
    recs = recs.map((r) => put.find((p) => p.id === r.id) ?? r); expect(isDelegatedTask(recs[1]!)).toBe(true); expect(isOpenTask(recs[1]!)).toBe(false);
    expect(syncDelegation(recs, TODAY)).toEqual([]);                                   // already in step
    recs = recs.map((r) => (r.id === "r1" ? withHolder(r, "me") : r)); put = syncDelegation(recs, TODAY);
    expect(put.map((r) => r.id)).toEqual(["a"]); expect(put[0]!.values["task.delegated_on"]).toBeUndefined();
  });
  it("a delegated step leaves the user's schedule but still counts toward its goal's progress", () => {
    const g = rec("g1", "goal", { "goal.title": v("Launch") });
    const base = [g, task("a", { goal: "g1", min: 30 }), task("b", { goal: "g1", min: 30, role: "r1" }), role("r1", "Books", "me")];
    const mk = (rs: TMRecord[]) => schedule({ weeklyFreeMinutes: 600, blocked: [], tasks: tasksFrom(rs), mode: "normal" }).placements.length;
    expect(mk(base)).toBe(2);
    const after = base.map((r) => (r.id === "r1" ? withHolder(r, "someone") : r)).map((r) => syncDelegation(base.map((x) => (x.id === "r1" ? withHolder(x, "someone") : x)), TODAY).find((p) => p.id === r.id) ?? r);
    expect(mk(after)).toBe(1);
    expect(goalProgress(after)[0]).toMatchObject({ total: 2, done: 0 });
  });
});

describe("hand-over", () => {
  const role1 = role("r1", "Books", "me");
  it("validation: one plan per role, not for a role someone else already covers, note up to 200, real date", () => {
    const view = (planned: boolean, holder: string) => ({ row: { id: "r", role: "x", holder: holder as never }, planned: planned ? ({} as never) : null });
    expect(validateHandover({ note: "", due: "" }, view(true, "me"))).toBe("already_planned"); expect(validateHandover({ note: "", due: "" }, view(false, "someone"))).toBe("already_someone");
    expect(validateHandover({ note: "x".repeat(201), due: "" }, view(false, "me"))).toBe("note_long"); expect(validateHandover({ note: "", due: "2026-02-30" }, view(false, "me"))).toBe("date_invalid");
    expect(validateHandover({ note: "ok", due: "2026-12-01" }, view(false, "me"))).toBeNull();
  });
  it("completing: plan marked done with the day, role becomes 'someone', its open steps are delegated; done twice does nothing", () => {
    const ho = rec("h1", "handover", { "handover.status": v("planned"), "handover.note": v("monthly close") }, { role: "r1" });
    const recs = [role1, ho, task("a", { role: "r1", min: 30 })];
    const res = completeHandover(recs, "h1", TODAY)!;
    const ids = res.puts.map((r) => r.id).sort(); expect(ids).toEqual(["a", "h1", "r1"]);
    const doneHo = res.puts.find((r) => r.id === "h1")!; expect(doneHo.values["handover.status"]).toMatchObject({ value: "done" }); expect(doneHo.values["handover.done_on"]).toMatchObject({ value: TODAY });
    expect(res.puts.find((r) => r.id === "r1")!.values["team_role.holder"]).toMatchObject({ value: "someone" });
    expect(res.puts.find((r) => r.id === "a")!.values["task.delegated_on"]).toMatchObject({ value: TODAY });
    expect(completeHandover(recs.map((r) => res.puts.find((p) => p.id === r.id) ?? r), "h1", TODAY)).toBeNull();
    expect(handoverRows(recs)).toEqual([{ id: "h1", roleId: "r1", status: "planned", note: "monthly close", due: null, doneOn: null }]);
  });
});

// ---------------------------------------------------------------- screens
const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector(sel) as T | null;
const set = (id: string, value: string) => { ($(`#${id}`) as HTMLInputElement).value = value; };
const go = (h: string) => { location.hash = h; render(); };
const raw = (sel: string) => $<HTMLFormElement>(sel)!.dispatchEvent(new Event("submit", { cancelable: true }));
const click = (sel: string) => { $<HTMLButtonElement>(sel)!.click(); render(); };
const put = (...rs: TMRecord[]) => rs.forEach((r) => store.demo.put(r));
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>';
  localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, "2026-11-02T00:00:00.000Z");
});

describe("team screens (demo mode)", () => {
  it("role form still refuses names and contact details; a role is saved; empty start stays quiet on Today", () => {
    go("#/today"); expect($("[data-team-card]")).toBeNull();
    go("#/diary/team"); set("tm-role", "call me on 01711223344"); raw("form[data-form=team]"); expect($("form[data-form=team] .err")!.textContent).toMatch(/Do not write a name/);
    set("tm-role", "Books"); set("tm-holder", "open"); raw("form[data-form=team]"); expect(store.demo.list().filter((r) => r.entity === "team_role")).toHaveLength(1);
  });
  it("tie an open step to a role from the role card; the gap line and load appear; untie works", () => {
    put(role("r1", "Books", "open"), task("a", { min: 30 }));
    go("#/diary/team"); expect($('[data-role="r1"]')!.getAttribute("data-gap")).toBe("open_no_steps");
    click('[data-assign="r1"]');
    expect(store.demo.get("a")!.links).toEqual({ role: "r1" }); expect($('[data-role="r1"] [data-gap-text]')!.textContent).toBe("Nobody covers this role and 1 step(s) wait.");
    expect($('[data-role="r1"] [data-role-load]')!.textContent).toMatch(/1 step\(s\) · known estimates 30 min/); expect($("[data-team-analysis] [data-gaps]")!.textContent).toMatch(/1 role\(s\) have nobody covering/);
    click('[data-untie="a"]'); expect(store.demo.get("a")!.links).toBeUndefined();
  });
  it("change who covers a role: someone else delegates its steps (they leave the schedule), me brings them back", () => {
    put(role("r1", "Books", "me"), task("a", { role: "r1", min: 30 }));
    go("#/diary/team"); set("tm-h-r1", "someone"); raw('form[data-team-holder="r1"]'); render();
    expect(store.demo.get("a")!.values["task.delegated_on"]?.state).toBe("value"); expect($('[data-role-step="a"] [data-delegated]')).not.toBeNull();
    go("#/diary/plan"); expect($('[data-role-of="r1"]')!.textContent).toMatch(/Role: Books/); expect($('[data-delegated="a"]')).not.toBeNull();
    go("#/diary/team"); set("tm-h-r1", "me"); raw('form[data-team-holder="r1"]'); expect(store.demo.get("a")!.values["task.delegated_on"]).toBeUndefined();
  });
  it("hand-over: plan it (note, date), see its effect, mark it handed over; role, steps, log and history are updated; the plan cannot be made twice", () => {
    put(role("r1", "Books", "me"), task("a", { role: "r1", min: 30 }), task("b", { role: "r1" }));
    go("#/diary/team"); set("ho-n-r1", "Close the month"); set("ho-d-r1", "2026-12-01"); raw('form[data-handover="r1"]'); render();
    const planned = $('[data-handover-planned]')!; expect(planned.textContent).toMatch(/Close the month/); expect(planned.textContent).toMatch(/By 2026-12-01/); expect(planned.textContent).toMatch(/its 2 open step/);
    expect($('form[data-handover="r1"]')).toBeNull();
    click('[data-act="handover-done"]');
    expect(store.demo.get("r1")!.values["team_role.holder"]).toMatchObject({ value: "someone" });
    expect(store.demo.get("a")!.values["task.delegated_on"]?.state).toBe("value"); expect(store.demo.get("b")!.values["task.delegated_on"]?.state).toBe("value");
    expect(store.demo.list().find((r) => r.entity === "handover")!.values["handover.status"]).toMatchObject({ value: "done" });
    expect(store.demo.list().some((r) => r.entity === "journey_log" && String((r.values["journey_log.entry"] as { value: string }).value).includes("‘Books’ was handed over"))).toBe(true);
    expect($('[data-role="r1"] [data-handed-over="1"]')!.textContent).toMatch(/Handed over on/); expect($('[data-gap-text="covered"]')).not.toBeNull();
    expect(tasksFrom(store.demo.list())).toHaveLength(0);
  });
  it("a hand-over plan can be removed before it is done; a secret-looking or contact note is refused", () => {
    put(role("r1", "Books", "me"));
    go("#/diary/team"); set("ho-n-r1", "mail bob@example.com"); raw('form[data-handover="r1"]'); expect($('[data-role="r1"] .err')!.textContent).not.toBe("");
    expect(store.demo.list().filter((r) => r.entity === "handover")).toHaveLength(0);
    set("ho-n-r1", "ok"); raw('form[data-handover="r1"]'); render(); click('[data-act="handover-cancel"]');
    expect(store.demo.list().filter((r) => r.entity === "handover")).toHaveLength(0);
  });
  it("hiring step: only for a role with nobody; adds one step tied to the role, with no estimate; not twice", () => {
    put(role("r1", "Books", "open"), role("r2", "Sales", "me"));
    go("#/diary/team"); expect($('[data-role="r2"] [data-act="hire"]')).toBeNull();
    click('[data-act="hire"]');
    const hire = store.demo.list().filter((r) => r.entity === "task"); expect(hire).toHaveLength(1);
    expect(hire[0]!.values["task.title"]).toMatchObject({ value: "Find someone for: Books" }); expect(hire[0]!.links).toEqual({ role: "r1" }); expect(hire[0]!.values["task.minutes"]).toEqual({ state: "later" });
    expect($('[data-role="r1"] [data-act="hire"]')).toBeNull(); expect($('[data-role="r1"]')!.getAttribute("data-gap")).toBe("gap");
  });
  it("Plan screen: the step form offers roles, saving ties the step, and a role held by someone delegates it at once", () => {
    put(role("r1", "Books", "someone"), role("r2", "Sales", "me"));
    go("#/diary/plan"); set("pt-title", "Reconcile"); set("pt-role", "r1"); raw("form[data-form=task]");
    const t0 = store.demo.list().find((r) => r.entity === "task")!; expect(t0.links).toEqual({ role: "r1" }); expect(t0.values["task.delegated_on"]?.state).toBe("value");
    expect(document.querySelector('label[for="pt-role"]')).not.toBeNull();
  });
  it("Today shows a calm card when a role is uncovered with steps waiting or a hand-over is planned, and the report always shows roles", () => {
    put(role("r1", "Books", "open"), task("a", { role: "r1" }));
    go("#/today"); const c = $('[data-team-card="today"]')!; expect(c.textContent).toMatch(/1 role\(s\) have nobody covering/); expect(c.querySelector('a[href="#/diary/team"]')).not.toBeNull();
    expect(c.textContent).not.toMatch(/fail|behind|overdue|missed|lost/i);
    go("#/journey/report"); expect($('[data-team-card="report"]')).not.toBeNull();
    store.demo.clear(); put(role("r2", "Sales", "me")); go("#/today"); expect($('[data-team-card="today"]')).toBeNull(); go("#/journey/report"); expect($('[data-team-card="report"]')).not.toBeNull();
  });
  it("my own roles against free time: over is a neutral hint; free time unknown says no comparison", () => {
    put(role("r1", "Sales", "me"), task("a", { role: "r1", min: 600 }));
    go("#/diary/team"); expect($("[data-free]")!.getAttribute("data-free")).toBe("unknown"); expect($("[data-free]")!.textContent).toMatch(/not known yet/);
    prefs.mode = "normal";
    store.demo.put(rec("intake-constraint", "constraint", { "constraint.weekly_free_hours": v(2), "constraint.free_from": v("18:00"), "constraint.free_to": v("22:00") }));
    go("#/diary/team"); expect($("[data-free]")!.getAttribute("data-free")).toBe("120"); expect($("[data-free]")!.textContent).toMatch(/more than your free time/);
  });
  it("removing a role unties its steps and clears their delegation", () => {
    put(role("r1", "Books", "someone"), task("a", { role: "r1" })); store.demo.put({ ...store.demo.get("a")!, values: { ...store.demo.get("a")!.values, "task.delegated_on": v(TODAY) } });
    go("#/diary/team"); click('[data-remove="r1"]');
    expect(store.demo.get("a")!.links).toBeUndefined(); expect(store.demo.get("a")!.values["task.delegated_on"]).toBeUndefined(); expect(isOpenTask(store.demo.get("a")!)).toBe(true);
  });
});

describe("real mode and languages", () => {
  it("without the consent tick nothing changes (holder, hand-over, tie); with it records are real", () => {
    localStorage.setItem("tm:ui:dataMode", "real"); grantConsent(consentKv, "2026-11-02T00:00:00.000Z");
    store.real.put({ ...rec("r1", "team_role", { "team_role.role": { state: "value", value: "Books", label: "FACT" }, "team_role.holder": { state: "value", value: "me", label: "FACT" } }), ns: "real", ownerId: "owner" });
    for (const k of Object.keys(localStorage)) if (k.includes("consent")) localStorage.removeItem(k);
    go("#/diary/team"); set("tm-h-r1", "someone"); raw('form[data-team-holder="r1"]'); expect(store.real.get("r1")!.values["team_role.holder"]).toMatchObject({ value: "me" });
    set("ho-n-r1", "x"); raw('form[data-handover="r1"]'); expect(store.real.list().filter((r) => r.entity === "handover")).toHaveLength(0);
    grantConsent(consentKv, "2026-11-02T00:00:00.000Z"); go("#/diary/team"); set("ho-n-r1", "x"); raw('form[data-handover="r1"]');
    const h1 = store.real.list().filter((r) => r.entity === "handover"); expect(h1).toHaveLength(1); expect(h1[0]!.ns).toBe("real"); expect(h1[0]!.values["handover.status"]).toMatchObject({ label: "FACT" });
    expect(store.demo.list()).toHaveLength(0);
  });
  const KEYS = [...Object.keys(PACKS.en).filter((k) => k.startsWith("team.") || k.startsWith("plan.role."))] as Key[];
  it("every team text exists in English, Bangla and Mix with the same placeholders; loanwords are used", () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    expect(KEYS.length).toBeGreaterThan(55);
    for (const k of KEYS) { expect(PACKS.bn[k]?.trim(), k).toBeTruthy(); expect(PACKS.mix[k]?.trim(), k).toBeTruthy(); expect(ph(PACKS.bn[k]), k).toBe(ph(PACKS.en[k])); }
    const bn = KEYS.map((k) => PACKS.bn[k]).join(" ");
    for (const bad of ["কর্মী", "পরিকল্পনা", "দক্ষতা", "ঝুঁকি", "অগ্রগতি", "বিকল্প", "সংরক্ষণ", "বিজ্ঞপ্তি", "মুছুন", "সংস্করণ", "তালিকা"]) expect(bn, bad).not.toContain(bad);
    expect(PACKS.bn["team.card.title"]).toContain("রোল"); expect(PACKS.mix["team.card.title"]).toContain("Role");
  });
  for (const lang of ["bn", "mix"] as const) it(`team screens render in ${lang} with Latin digits and no raw keys`, () => {
    localStorage.setItem("tm:ui:lang", lang);
    put(role("r1", "Books", "open"), role("r2", "Sales", "me"), task("a", { role: "r1", min: 30 }), task("b", { role: "r2", min: 60 }), task("c"));
    store.demo.put(rec("h1", "handover", { "handover.status": v("planned"), "handover.note": v("x") }, { role: "r2" }));
    for (const p of ["#/diary/team", "#/diary/plan", "#/today", "#/journey/report"]) { go(p); expect(document.body.textContent, p).not.toMatch(/[০-৯]|\b(team|plan)\.[a-z]/); }
  });
});

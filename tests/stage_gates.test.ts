// M05 stage gates B-H, end to end: rules form (entry, review date, pause rule) and measurable exit conditions -> storage ->
// calculation from the user's own records (Unknown is never 0) -> stage pass needs every exit reached + own evidence ->
// stage page, Today (review date) and report. EN / BN / mix.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import { PACKS } from "../src/i18n/packs";
import { EXIT_MEASURES, dueGates, exitActual, exitRows, exitStatus, exitStatuses, gateDue, gateRows, summariseExits, validateExit, validateGate } from "../src/core/stageGates";
import { StageError, conditions, passStage } from "../src/core/stages";
import { parseTarget } from "../src/core/kpi";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" }) as FieldValue;
const rec = (id: string, entity: string, values: Record<string, FieldValue>, links?: Record<string, string>): TMRecord =>
  ({ id, entity, ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-11-02T08:00:00.000Z", values, ...(links ? { links } : {}) });
const gate = (code: string, o: { entry?: string; review?: string; pause?: string } = {}) => rec(`gate-${code}`, "stage_gate", { "stage_gate.stage_code": v(code),
  ...(o.entry ? { "stage_gate.entry_condition": v(o.entry) } : {}), ...(o.review ? { "stage_gate.review_on": v(o.review) } : {}), ...(o.pause ? { "stage_gate.pause_rule": v(o.pause) } : {}) });
const exit = (id: string, code: string, o: { name?: string; measure?: string; target?: number | null; actual?: number; unit?: string } = {}) => rec(id, "stage_exit", {
  "stage_exit.stage_code": v(code), "stage_exit.name": v(o.name ?? "Income"), "stage_exit.measure": v(o.measure ?? "own"), "stage_exit.target": o.target === null ? { state: "unknown" } : v(o.target ?? 100),
  ...(o.actual !== undefined ? { "stage_exit.actual": v(o.actual), "stage_exit.actual_on": v("2026-11-01") } : {}), ...(o.unit ? { "stage_exit.unit": v(o.unit) } : {}) });
const fin = (id: string, kind: string, scope: string, amount: number | null, period = "monthly") => rec(id, "finance_item", { "finance.kind": v(kind), "finance.scope": v(scope), "finance.period": v(period), "finance.label": v(id), "finance.amount": amount === null ? { state: "unknown" } : v(amount) });
const TODAY = "2026-11-02";

describe("gate rules (pure)", () => {
  it("always seven rows, B to H; empty rows have nothing written", () => {
    const rows = gateRows([gate("C", { entry: "x", review: "2026-12-01", pause: "y" })]);
    expect(rows.map((r) => r.code)).toEqual(["B", "C", "D", "E", "F", "G", "H"]);
    expect(rows.find((r) => r.code === "C")).toMatchObject({ entry: "x", reviewOn: "2026-12-01", pauseRule: "y" });
    expect(rows.find((r) => r.code === "B")).toMatchObject({ entry: null, reviewOn: null, pauseRule: null });
  });
  it("review date: due on or after, soon within 7 days, later beyond, none without a valid date; passed stages never due", () => {
    const g = (reviewOn: string | null) => ({ reviewOn });
    expect(gateDue(g("2026-11-02"), TODAY)).toBe("due"); expect(gateDue(g("2026-11-09"), TODAY)).toBe("soon"); expect(gateDue(g("2026-11-10"), TODAY)).toBe("later");
    expect(gateDue(g(null), TODAY)).toBe("none"); expect(gateDue(g("2026-13-01"), TODAY)).toBe("none");
    const rows = gateRows([gate("B", { review: "2026-10-01" }), gate("C", { review: "2026-10-01" })]);
    expect(dueGates(rows, ["A", "B"], TODAY).map((x) => x.code)).toEqual(["C"]);
  });
  it("validation: long text, bad date format, impossible date", () => {
    expect(validateGate({ entry: "x".repeat(301), reviewOn: "", pauseRule: "" })).toBe("entry_long");
    expect(validateGate({ entry: "", reviewOn: "", pauseRule: "x".repeat(301) })).toBe("pause_long");
    expect(validateGate({ entry: "", reviewOn: "12/12", pauseRule: "" })).toBe("date_format");
    expect(validateGate({ entry: "", reviewOn: "2026-02-31", pauseRule: "" })).toBe("date_invalid");
    expect(validateGate({ entry: "a", reviewOn: "2026-12-01", pauseRule: "b" })).toBeNull();
    expect(validateExit({ name: " ", unit: "", target: "" }, parseTarget)).toBe("name_required");
    expect(validateExit({ name: "a", unit: "", target: "-3" }, parseTarget)).toBe("target_invalid");
    expect(validateExit({ name: "a", unit: "", target: "" }, parseTarget)).toBeNull();
  });
});

describe("exit conditions (pure): real numbers or Unknown", () => {
  it("rows: a bad stage, name or measure is dropped from view; a target of 0 or less is 'no target'", () => {
    const rows = exitRows([exit("a", "B"), exit("bad1", "A"), exit("bad2", "B", { measure: "nope" }), exit("z", "B", { target: 0, name: "Zero" })]);
    expect(rows.map((r) => r.id)).toEqual(["a", "z"]); expect(rows.find((r) => r.id === "z")!.target).toBeNull();
  });
  it("every built-in measure with no records is Unknown, never 0", () => {
    for (const m of EXIT_MEASURES.filter((x) => x !== "own")) {
      const row = exitRows([exit("k", "B", { measure: m })])[0]!;
      const a = exitActual(row, [], TODAY); expect(a.state, m).toBe("unknown");
    }
    expect(exitActual(exitRows([exit("k", "B")])[0]!, [], TODAY)).toEqual({ state: "unknown", why: "not_entered" });
  });
  it("own number: value, state met / not_yet with the gap, no target and unknown stay apart", () => {
    const at = (target: number | null, actual?: number) => exitStatus(exitRows([exit("k", "B", { target, actual })])[0]!, [], TODAY);
    expect(at(100, 100)).toMatchObject({ state: "met", toGo: 0 }); expect(at(100, 130).state).toBe("met");
    expect(at(100, 40)).toMatchObject({ state: "not_yet", toGo: 60 }); expect(at(100).state).toBe("unknown"); expect(at(null, 5).state).toBe("no_target");
    expect(at(100, 0)).toMatchObject({ state: "not_yet", toGo: 100 }); // a typed 0 is a real 0
  });
  it("monthly income from Money lines: personal and business apart; an unknown amount makes it incomplete, not smaller", () => {
    const recs = [fin("i1", "income", "personal", 30000), fin("i2", "income", "personal", 20000), fin("b1", "income", "business", 9000), fin("y1", "income", "personal", 99999, "once")];
    const p = exitRows([exit("p", "B", { measure: "monthly_income" })])[0]!; const b = exitRows([exit("b", "B", { measure: "business_income" })])[0]!;
    expect(exitActual(p, recs, TODAY)).toMatchObject({ state: "value", value: 50000 }); expect(exitActual(b, recs, TODAY)).toMatchObject({ value: 9000 });
    expect(exitActual(p, [...recs, fin("i3", "income", "personal", null)], TODAY)).toEqual({ state: "unknown", why: "incomplete" });
    expect(exitActual(p, [fin("e1", "expense", "personal", 10)], TODAY)).toEqual({ state: "unknown", why: "no_money_lines" });
  });
  it("net worth, ventures running, hand-overs done, tasks done in 90 days read the user's records", () => {
    const recs = [fin("a1", "asset", "personal", 500000), fin("l1", "liability", "personal", 100000),
      rec("v1", "venture", { "venture.name": v("A"), "venture.stage": v("running") }), rec("v2", "venture", { "venture.name": v("B"), "venture.stage": v("idea") }),
      rec("r1", "team_role", { "team_role.role": v("Pack") }), rec("h1", "handover", { "handover.status": v("done") }, { role: "r1" }),
      rec("t1", "task", { "task.title": v("x"), "task.done_on": v("2026-11-01") })];
    const val = (m: string) => exitActual(exitRows([exit("k", "B", { measure: m })])[0]!, recs, TODAY);
    expect(val("net_worth")).toMatchObject({ value: 400000 }); expect(val("ventures_running")).toMatchObject({ value: 1 }); expect(val("handovers_done")).toMatchObject({ value: 1 }); expect(val("tasks_done_90")).toMatchObject({ value: 1 });
  });
  it("summary: nothing written is not 'all reached'", () => {
    expect(summariseExits([]).allMet).toBe(false);
    const list = exitStatuses([exit("a", "B", { actual: 100 }), exit("b", "B", { actual: 1 }), exit("c", "B"), exit("d", "C", { actual: 100 })], TODAY, "B");
    expect(summariseExits(list)).toMatchObject({ total: 3, met: 1, open: 1, unknown: 1, allMet: false });
  });
});

describe("stage pass with exit conditions", () => {
  const ctx = (exits: Array<{ code: string; id: string; name: string; met: boolean }>) => ({ answers: {}, goalCount: 0, exits });
  it("exit conditions are automatic conditions; the evidence condition stays", () => {
    const cs = conditions(ctx([{ code: "B", id: "x1", name: "Income reaches my number", met: false }, { code: "C", id: "x2", name: "other stage", met: true }]), "B");
    expect(cs.map((c) => c.id)).toEqual(["x1", "B1"]); expect(cs[0]).toMatchObject({ auto: true, exit: true, met: false }); expect(cs[0]!.text.en).toBe("Income reaches my number");
  });
  it("cannot pass until every exit is reached; then own evidence is still required", () => {
    expect(() => passStage(ctx([{ code: "B", id: "x1", name: "n", met: false }]), ["A"], "B", "I did it")).toThrow(/not met/);
    expect(() => passStage(ctx([{ code: "B", id: "x1", name: "n", met: true }]), ["A"], "B", " ")).toThrow(/evidence/);
    expect(passStage(ctx([{ code: "B", id: "x1", name: "n", met: true }]), ["A"], "B", "I did it").code).toBe("B");
    expect(() => passStage(ctx([]), ["A"], "B", "")).toThrow(StageError);
  });
});

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector(sel) as T | null;
const go = (h: string) => { location.hash = h; render(); };
const set = (id: string, val: string) => { const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement; el.value = val; };
const submit = (sel: string) => { $<HTMLFormElement>(sel)!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true })); };
const iso = (n = 0) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const passA = () => store.demo.put(rec("stagepass-A", "stage_pass", { "stage_pass.stage_code": v("A"), "stage_pass.evidence": v("ok"), "stage_pass.progress_pct": v(100) }));
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>';
  localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, "2026-11-02T00:00:00.000Z");
});

describe("stage rules page and screens", () => {
  it("saving rules for a stage stores one record that is read back; too-long text is refused", () => {
    go("#/journey/gates");
    set("sg-entry-B", "x".repeat(301)); submit('form[data-form="gate-B"]');
    expect($('form[data-form="gate-B"] .err')!.textContent).toMatch(/under 300/); expect(store.demo.list().filter((r) => r.entity === "stage_gate").length).toBe(0);
    set("sg-entry-B", "First skills list finished");
    set("sg-review-B", "2026-12-01"); set("sg-pause-B", "Slow down if no income for two months"); submit('form[data-form="gate-B"]');
    const g = gateRows(store.demo.list()).find((x) => x.code === "B")!;
    expect(g).toMatchObject({ entry: "First skills list finished", reviewOn: "2026-12-01", pauseRule: "Slow down if no income for two months" });
    expect(store.demo.list().filter((r) => r.entity === "stage_gate").length).toBe(1);
    go("#/journey/gates"); expect((document.getElementById("sg-entry-B") as HTMLTextAreaElement).value).toBe("First skills list finished");
  });
  it("add an exit condition, then change its target and your own number", () => {
    go("#/journey/gates");
    set("sx-name-B", "Customers paid"); set("sx-measure-B", "own"); set("sx-target-B", "10"); set("sx-unit-B", "customers"); submit('form[data-form="exit-B"]'); render();
    const row = exitRows(store.demo.list())[0]!; expect(row).toMatchObject({ code: "B", name: "Customers paid", measure: "own", target: 10, unit: "customers", ownActual: null });
    expect($(`[data-exit="${row.id}"]`)!.getAttribute("data-exit-state")).toBe("unknown");
    expect($(`[data-exit="${row.id}"]`)!.textContent).toMatch(/Your number is not entered yet/);
    set(`se-a-${row.id}`, "4"); submit(`form[data-exit-edit="${row.id}"]`); render();
    expect($(`[data-exit="${row.id}"]`)!.getAttribute("data-exit-state")).toBe("not_yet"); expect($(`[data-exit="${row.id}"]`)!.textContent).toMatch(/6 more to reach it/);
    set(`se-t-${row.id}`, "4"); submit(`form[data-exit-edit="${row.id}"]`); render();
    expect($(`[data-exit="${row.id}"]`)!.getAttribute("data-exit-state")).toBe("met");
  });
  it("an empty name is refused and nothing is saved", () => {
    go("#/journey/gates"); set("sx-name-B", " "); submit('form[data-form="exit-B"]');
    expect($('form[data-form="exit-B"] .err')!.textContent).toMatch(/short name/); expect(exitRows(store.demo.list()).length).toBe(0);
  });
  it("the Journey stage panel shows the rules of the current stage; pass stays off until the exit is reached", () => {
    passA(); store.demo.put(gate("B", { entry: "Skills list done", review: iso(30), pause: "Slow down if cash is low" })); store.demo.put(exit("x1", "B", { name: "Customers paid", target: 10, actual: 3 }));
    go("#/journey");
    const p = $('[data-stage-panel="B"]')!; expect(p).not.toBeNull();
    expect(p.querySelector("[data-gate-entry]")!.textContent).toMatch(/Skills list done/); expect(p.querySelector("[data-gate-pause]")!.textContent).toMatch(/Slow down if cash is low/);
    expect(p.querySelector('[data-exit="x1"]')!.textContent).toMatch(/7 more to reach it/);
    expect(p.querySelector<HTMLButtonElement>('[data-act="pass-stage"]')!.disabled).toBe(true);
    expect(p.querySelector("#st-evidence")).not.toBeNull();
    store.demo.put(exit("x1", "B", { name: "Customers paid", target: 10, actual: 10 })); go("#/journey");
    expect($<HTMLButtonElement>('[data-stage-panel="B"] [data-act="pass-stage"]')!.disabled).toBe(false);
  });
  it("Stage B with no rules written says so and links to the rules page", () => {
    passA(); go("#/journey"); const p = $('[data-stage-panel="B"]')!; expect(p.querySelector("[data-rules-none]")).not.toBeNull(); expect(p.querySelector('a[href="#/journey/gates"]')).not.toBeNull();
  });
  it("Today shows a calm card only for a stage whose review date has come; the report lists every stage with rules", () => {
    passA(); go("#/today"); expect($("[data-gate-due-card]")).toBeNull();
    store.demo.put(gate("B", { review: iso(40) })); go("#/today"); expect($("[data-gate-due-card]")).toBeNull();
    store.demo.put(gate("B", { review: iso(-2), pause: "Slow down" })); store.demo.put(exit("x1", "B", { target: 10, actual: 10 })); store.demo.put(exit("x2", "B", { name: "Two", target: 10 }));
    go("#/today"); const c = $('[data-gate-due-card="today"]')!; expect(c.textContent).toMatch(/Stage B/); expect(c.textContent).toMatch(/Slow down/); expect(c.textContent).not.toMatch(/fail|behind|overdue|missed/i);
    go("#/journey/report"); const r = $("[data-gate-report]")!; expect(r.textContent).toMatch(/1 of 2 exit condition\(s\) reached/); expect(r.textContent).toMatch(/1 not known yet/);
  });
  it("a passed stage never raises the review card", () => {
    passA(); store.demo.put(rec("stagepass-B", "stage_pass", { "stage_pass.stage_code": v("B"), "stage_pass.evidence": v("ok"), "stage_pass.progress_pct": v(100) })); store.demo.put(gate("B", { review: iso(-2) }));
    go("#/today"); expect($("[data-gate-due-card]")).toBeNull();
  });
  it("real mode needs the consent tick before saving", () => {
    localStorage.setItem("tm:ui:dataMode", "real"); localStorage.removeItem("tm:consent:real:v1");
    go("#/journey/gates"); set("sg-entry-B", "x"); submit('form[data-form="gate-B"]');
    expect(store.real.list().filter((r) => r.entity === "stage_gate").length).toBe(0);
  });
});

describe("words", () => {
  it("every gate key exists in English, Bangla and mix; Bangla keeps the loanword rule; no punishing copy", () => {
    const keys = Object.keys(PACKS.en).filter((k) => k.startsWith("gate."));
    expect(keys.length).toBeGreaterThan(30);
    for (const k of keys) for (const l of ["en", "bn", "mix"] as const) expect((PACKS[l] as Record<string, string>)[k]!.length, `${l}:${k}`).toBeGreaterThan(1);
    for (const k of keys) { expect((PACKS.bn as Record<string, string>)[k], k).not.toMatch(/পরিকল্পনা|ঝুঁকি|প্রতিবেদন|আয়\b|পর্যালোচনা/); expect(PACKS.en[k as keyof typeof PACKS.en], k).not.toMatch(/fail|late|overdue|missed|behind|lazy|shame|penalt/i); }
  });
  it("Bangla and mix pages draw with rules and exits, digits stay Latin", () => {
    passA(); store.demo.put(gate("B", { review: iso(-1) })); store.demo.put(exit("x1", "B", { target: 10, actual: 3 }));
    for (const l of ["bn", "mix"]) for (const path of ["#/journey/gates", "#/journey", "#/today", "#/journey/report"]) { localStorage.setItem("tm:ui:lang", l); go(path); expect(document.body.textContent!.length).toBeGreaterThan(50); expect(document.body.textContent).not.toMatch(/[০-৯]/); }
  });
  it("the form fields have labels and the page has one h1", () => {
    go("#/journey/gates"); expect(document.querySelectorAll("h1").length).toBe(1);
    for (const el of document.querySelectorAll<HTMLElement>("input[id],textarea[id],select[id]")) expect(document.querySelector(`label[for="${el.id}"]`), el.id).not.toBeNull();
  });
});

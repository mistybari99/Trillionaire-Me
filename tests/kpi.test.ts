// M16 KPI targets, end to end: form -> storage -> calculation -> weekly review, 90-day review, report, Today, Journey link.
// Unknown is never 0. Wording stays neutral. EN / BN / mix, Latin digits, labelled inputs, real mode needs the consent tick.
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import { PACKS, type Key } from "../src/i18n/packs";
import { kpiActual, kpiProgress, kpiRows, kpiStatus, parseActual, parseTarget, validateKpi } from "../src/core/kpi";
import { ROUTES } from "../src/app";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" }) as FieldValue;
const rec = (id: string, entity: string, values: Record<string, FieldValue>, createdAt = "2026-11-02T08:00:00.000Z"): TMRecord => ({ id, entity, ns: "demo", ownerId: "u", schemaVersion: 1, createdAt, values });
const kpi = (id: string, o: { name?: string; measure?: string; period?: string; target?: number | null; unit?: string; actual?: number }): TMRecord => rec(id, "kpi", {
  "kpi.name": v(o.name ?? "Tasks"), "kpi.measure": v(o.measure ?? "tasks_done"), "kpi.period": v(o.period ?? "week"),
  "kpi.target": o.target === null ? { state: "unknown" } : v(o.target ?? 5), ...(o.unit ? { "kpi.unit": v(o.unit) } : {}), ...(o.actual !== undefined ? { "kpi.actual": v(o.actual), "kpi.actual_on": v("2026-11-01") } : {}) });
const done = (id: string, day: string) => rec(id, "task", { "task.title": v(id), "task.done_on": v(day) });
const TODAY = "2026-11-02";

describe("KPI core", () => {
  it("rows: stable order (week first, then name), unreadable measure or period dropped from view, target must be above 0", () => {
    const rows = kpiRows([kpi("b", { name: "B", period: "days90" }), kpi("a", { name: "Z" }), kpi("c", { name: "A" }), kpi("bad", { measure: "nope" }), kpi("zero", { name: "Zero", target: 0 })]);
    expect(rows.map((r) => r.id)).toEqual(["c", "a", "zero", "b"]);
    expect(rows.find((r) => r.id === "zero")!.target).toBeNull();
  });
  it("no records in the period is Unknown, never 0 (every built-in measure, both periods)", () => {
    for (const measure of ["tasks_done", "focus_minutes", "habit_checkins", "stage_passes"]) for (const period of ["week", "days90"]) {
      const row = kpiRows([kpi("k", { measure, period })])[0]!;
      expect(kpiActual(row, [], TODAY), `${measure}/${period}`).toEqual({ state: "unknown", why: "no_records" });
    }
  });
  it("counts from the user's own records inside the window only", () => {
    const recs = [kpi("k", {}), done("t1", "2026-11-01"), done("t2", "2026-11-02"), done("old", "2026-10-01")];
    const [s] = kpiStatus(recs, TODAY, "week");
    expect(s!.actual).toMatchObject({ state: "value", value: 2, source: "records" });
    expect(s!.progress).toEqual({ state: "value", pct: 40, reached: false });
    const [n] = kpiStatus([kpi("n", { period: "days90", target: 3 }), ...recs.slice(1)], TODAY, "days90");
    expect(n!.actual).toMatchObject({ value: 3 });
    expect(n!.progress).toEqual({ state: "value", pct: 100, reached: true });
  });
  it("focus minutes, habit check-ins and stage passes follow the same windows", () => {
    const recs = [kpi("f", { measure: "focus_minutes", target: 60 }), kpi("h", { measure: "habit_checkins", target: 4 }), kpi("p", { measure: "stage_passes", target: 1 }),
      rec("s1", "focus_session", { "focus_session.date": v("2026-11-02"), "focus_session.minutes": v(25) }), rec("s2", "focus_session", { "focus_session.date": v("2026-11-01"), "focus_session.minutes": v(20) }),
      rec("l1", "habit_log", { "habit_log.date": v("2026-11-02"), "habit_log.count": v(1) }), rec("l2", "habit_log", { "habit_log.date": v("2026-11-01"), "habit_log.count": v(0) }),
      rec("sp", "stage_pass", {}, "2026-11-02T09:00:00")];
    const by = Object.fromEntries(kpiStatus(recs, TODAY).map((s) => [s.row.id, s.actual]));
    expect(by.f).toMatchObject({ value: 45 }); expect(by.h).toMatchObject({ value: 1 }); expect(by.p).toMatchObject({ value: 1 });
  });
  it("my own number: shown as typed; blank is Unknown (not entered), not 0", () => {
    const own = kpiRows([kpi("o", { measure: "own", target: 10, actual: 4, unit: "customers" })])[0]!;
    expect(kpiActual(own, [], TODAY)).toEqual({ state: "value", value: 4, source: "own", asOf: "2026-11-01" });
    const blank = kpiRows([kpi("o2", { measure: "own", target: 10 })])[0]!;
    expect(kpiActual(blank, [], TODAY)).toEqual({ state: "unknown", why: "not_entered" });
    expect(kpiProgress(blank, kpiActual(blank, [], TODAY))).toEqual({ state: "unknown" });
  });
  it("no target: progress says so, never a percent", () => {
    const row = kpiRows([kpi("k", { target: null })])[0]!;
    expect(kpiProgress(row, { state: "value", value: 3, source: "records", asOf: null })).toEqual({ state: "no_target" });
  });
  it("input rules: blank target allowed, above 0 only, Bangla digits and commas accepted; actual may be 0", () => {
    expect(parseTarget("")).toEqual({ state: "unknown" }); expect(parseTarget("0")).toBeNull(); expect(parseTarget("-2")).toBeNull(); expect(parseTarget("abc")).toBeNull();
    expect(parseTarget("১,২৫০")).toEqual({ state: "value", value: 1250 }); expect(parseActual("0")).toEqual({ state: "value", value: 0 }); expect(parseActual("-1")).toBeNull();
    expect(validateKpi({ name: " ", target: "", unit: "" })).toBe("name_required"); expect(validateKpi({ name: "x".repeat(81), target: "", unit: "" })).toBe("name_long");
    expect(validateKpi({ name: "ok", target: "0", unit: "" })).toBe("target_invalid"); expect(validateKpi({ name: "ok", target: "5", unit: "u".repeat(41) })).toBe("unit_long"); expect(validateKpi({ name: "ok", target: "", unit: "" })).toBeNull();
  });
});

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector(sel) as T | null;
const submit = (form: string) => $<HTMLFormElement>(`form[data-form="${form}"]`)!.dispatchEvent(new Event("submit", { cancelable: true }));
const set = (id: string, value: string) => { ($<HTMLInputElement>(`#${id}`) as HTMLInputElement).value = value; };
const go = (h: string) => { location.hash = h; render(); };

describe("KPI screens (demo mode)", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, "2026-11-02T00:00:00.000Z"); });
  const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

  it("the page is in the route table, linked from Journey, and every input has a label", () => {
    expect(ROUTES.some(([re]) => re.test("/journey/kpi"))).toBe(true);
    go("#/journey"); expect($('a[href="#/journey/kpi"]')).not.toBeNull();
    go("#/journey/kpi");
    for (const id of ["kp-name", "kp-measure", "kp-period", "kp-target", "kp-unit"]) expect($(`label[for="${id}"]`), id).not.toBeNull();
    expect($("form .err")!.getAttribute("role")).toBe("alert");
  });

  it("form -> storage: saves a labelled record; empty name and bad target are refused with a message", () => {
    go("#/journey/kpi");
    submit("kpi"); expect($("form[data-form=kpi] .err")!.textContent).toMatch(/Write a name/);
    set("kp-name", "Finish tasks"); set("kp-target", "0"); submit("kpi"); expect($("form[data-form=kpi] .err")!.textContent).toMatch(/above 0/);
    expect(store.demo.list().filter((r) => r.entity === "kpi")).toHaveLength(0);
    set("kp-target", "5"); set("kp-measure", "tasks_done"); set("kp-period", "week"); submit("kpi");
    const saved = store.demo.list().filter((r) => r.entity === "kpi");
    expect(saved).toHaveLength(1);
    expect(saved[0]!.values["kpi.target"]).toEqual({ state: "value", value: 5, label: "DEMO" });
    expect(saved[0]!.values["kpi.unit"]).toBeUndefined();
  });

  it("blank target is stored as unknown and shown as 'not set yet' (no percent)", () => {
    go("#/journey/kpi"); set("kp-name", "Write more"); submit("kpi");
    expect(store.demo.list().find((r) => r.entity === "kpi")!.values["kpi.target"]).toEqual({ state: "unknown" });
    render(); expect($("[data-kpi-notarget]")).not.toBeNull(); expect($("[data-kpi-bar]")).toBeNull();
  });

  it("calculation -> screens: planned against actual shows on the KPI page, weekly review, Today and report; the 90-day target shows on the review", () => {
    store.demo.put(kpi("kw", { name: "Weekly tasks", target: 4 })); store.demo.put(kpi("kd", { name: "Quarter tasks", period: "days90", target: 10 }));
    store.demo.put(done("t1", todayIso())); store.demo.put(done("t2", todayIso()));
    go("#/journey/kpi");
    const card = $('[data-kpi-card="kw"]')!;
    expect(card.textContent).toMatch(/Target: 4/); expect(card.textContent).toMatch(/So far: 2/); expect(card.textContent).toMatch(/50% of the target/); expect(card.textContent).toMatch(/2 more to reach it/);
    expect(card.querySelector('[data-kpi-bar="50"]')!.getAttribute("aria-label")).toMatch(/50 percent/);
    go("#/journey/week"); const wk = $('[data-kpi-section="week"]')!; expect(wk.textContent).toMatch(/Weekly tasks/); expect(wk.textContent).not.toMatch(/Quarter tasks/); expect(wk.querySelector('a[href="#/journey/kpi"]')).not.toBeNull();
    go("#/journey/review"); const rv = $('[data-kpi-section="days90"]')!; expect(rv.textContent).toMatch(/Quarter tasks/); expect(rv.textContent).toMatch(/So far: 2/);
    go("#/journey/report"); expect($('[data-kpi-section="week"]')).not.toBeNull(); expect($('[data-kpi-section="days90"]')).not.toBeNull();
    go("#/today"); expect($("[data-kpi-today]")!.textContent).toMatch(/Weekly tasks/);
  });

  it("reaching the target says so calmly; nothing is red or punishing", () => {
    store.demo.put(kpi("k", { target: 1 })); store.demo.put(done("t1", todayIso()));
    go("#/journey/kpi"); expect($('[data-kpi-text="reached"]')!.textContent).toBe("Target reached");
    expect($("main")!.textContent).not.toMatch(/fail|behind|overdue|missed|lost/i);
  });

  it("no records yet: Unknown with a plain sentence, never '0 of 5'", () => {
    store.demo.put(kpi("k", { target: 5 }));
    go("#/journey/kpi"); expect($("[data-kpi-unknown]")!.textContent).toBe("Nothing recorded in this period yet");
    expect($('[data-kpi="k"]')!.textContent).not.toMatch(/\b0\b/);
    go("#/journey/week"); expect($('[data-kpi-section="week"] [data-kpi-unknown]')).not.toBeNull();
  });

  it("Today stays quiet when no target is set, and the review sections say so with a link", () => {
    go("#/today"); expect($("[data-kpi-today]")).toBeNull();
    go("#/journey/week"); expect($('[data-kpi-empty="week"]')).not.toBeNull(); expect($('[data-kpi-section="week"] a[href="#/journey/kpi"]')).not.toBeNull();
  });

  it("my own number: update the target and the current number; Unknown until entered; the date is kept", () => {
    store.demo.put(kpi("o", { name: "Customers", measure: "own", target: 20, unit: "customers" }));
    go("#/journey/kpi"); expect($('[data-kpi="o"] [data-kpi-unknown]')!.textContent).toBe("Your number is not entered yet");
    set("kp-a-o", "8"); set("kp-t-o", "25"); $<HTMLFormElement>('form[data-kpi-edit="o"]')!.dispatchEvent(new Event("submit", { cancelable: true }));
    const r = store.demo.get("o")!;
    expect(r.values["kpi.actual"]).toEqual({ state: "value", value: 8, label: "DEMO" }); expect(r.values["kpi.target"]).toEqual({ state: "value", value: 25, label: "DEMO" });
    expect(r.values["kpi.actual_on"]).toMatchObject({ state: "value", label: "DEMO" });
    render(); expect($('[data-kpi="o"]')!.textContent).toMatch(/Target: 25 customers/); expect($('[data-kpi="o"]')!.textContent).toMatch(/So far: 8 customers/);
    set("kp-a-o", ""); $<HTMLFormElement>('form[data-kpi-edit="o"]')!.dispatchEvent(new Event("submit", { cancelable: true }));
    expect(store.demo.get("o")!.values["kpi.actual"]).toEqual({ state: "unknown" });
  });

  it("remove deletes only that target", () => {
    store.demo.put(kpi("a", { name: "A" })); store.demo.put(kpi("b", { name: "B" }));
    go("#/journey/kpi"); $<HTMLButtonElement>('[data-remove="a"]')!.click();
    expect(store.demo.list().filter((r) => r.entity === "kpi").map((r) => r.id)).toEqual(["b"]);
  });

  it("a secret-looking name is refused and nothing is saved", () => {
    go("#/journey/kpi"); set("kp-name", "my password is hunter2"); submit("kpi");
    expect(store.demo.list().filter((r) => r.entity === "kpi")).toHaveLength(0);
    expect($("form[data-form=kpi] .err")!.textContent).not.toBe("");
  });
});

describe("KPI in real mode and in three languages", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "real"); });
  it("without the consent tick nothing is saved and the prompt is shown; with it the record is real (FACT)", () => {
    go("#/journey/kpi"); expect($("[data-consent-prompt]")).not.toBeNull();
    set("kp-name", "Tasks"); set("kp-target", "3"); submit("kpi");
    expect(store.real.list().length + store.demo.list().length).toBe(0);
    grantConsent(consentKv, "2026-11-02T00:00:00.000Z"); go("#/journey/kpi"); set("kp-name", "Tasks"); set("kp-target", "3"); submit("kpi");
    const r = store.real.list().filter((x) => x.entity === "kpi"); expect(r).toHaveLength(1);
    expect(r[0]!.ns).toBe("real"); expect(r[0]!.values["kpi.target"]).toMatchObject({ label: "FACT" }); expect(store.demo.list()).toHaveLength(0);
  });
  it("demo targets never appear in real mode", () => {
    grantConsent(consentKv, "2026-11-02T00:00:00.000Z"); store.demo.put(kpi("d", { name: "Demo only" }));
    go("#/journey/kpi"); expect(document.body.textContent).not.toMatch(/Demo only/); go("#/today"); expect($("[data-kpi-today]")).toBeNull();
  });
  const KEYS = Object.keys(PACKS.en).filter((k) => k.startsWith("kpi.")) as Key[];
  it("every kpi text exists in English, Bangla and Mix with the same placeholders; Bangla uses the loanword Target", () => {
    expect(KEYS.length).toBeGreaterThan(30);
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    for (const k of KEYS) { expect(PACKS.bn[k]?.trim(), k).toBeTruthy(); expect(PACKS.mix[k]?.trim(), k).toBeTruthy(); expect(ph(PACKS.bn[k]), k).toBe(ph(PACKS.en[k])); }
    expect(PACKS.bn["kpi.add"]).toContain("টার্গেট"); expect(PACKS.mix["kpi.add"]).toContain("Target"); expect(PACKS.bn["kpi.add"]).not.toContain("লক্ষ্যমাত্রা");
  });
  for (const lang of ["bn", "mix"] as const) it(`the page and the sections render in ${lang} with Latin digits and no raw keys`, () => {
    grantConsent(consentKv, "2026-11-02T00:00:00.000Z"); localStorage.setItem("tm:ui:dataMode", "demo"); localStorage.setItem("tm:ui:lang", lang);
    store.demo.put(kpi("k", { name: "Tasks", target: 4 })); store.demo.put(done("t1", (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })()));
    for (const p of ["#/journey/kpi", "#/journey/week", "#/journey/review", "#/journey/report", "#/today"]) { go(p); expect(document.body.textContent, p).not.toMatch(/[০-৯]|kpi\.[a-z]/); }
    go("#/journey/kpi"); expect($('[data-kpi="k"]')).not.toBeNull();
  });
});

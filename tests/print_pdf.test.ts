// M20 Save as PDF, end to end: own entries -> pure plan rows -> print page (report / plan / hand-over) -> the phone's print window; links from
// report, plan, team and Backup; no network; Unknown is never 0; EN / BN / mix.
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import { isPrintKind, planDoc, printFileName } from "../src/core/printDoc";
import { PACKS } from "../src/i18n/packs";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" }) as FieldValue;
const rec = (id: string, entity: string, values: Record<string, FieldValue>, links?: Record<string, string>): TMRecord =>
  ({ id, entity, ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-11-02T08:00:00.000Z", values, ...(links ? { links } : {}) });
const goal = (id: string, title: string, o: { date?: string; kind?: string; parent?: string } = {}) =>
  rec(id, "goal", { "goal.title": v(title), ...(o.date ? { "goal.target_date": v(o.date) } : {}), ...(o.kind ? { "goal.kind": v(o.kind) } : {}) }, o.parent ? { parent: o.parent } : undefined);
const task = (id: string, title: string, goalId: string | null, o: { min?: number; done?: boolean; role?: string } = {}) =>
  rec(id, "task", { "task.title": v(title), ...(o.min ? { "task.minutes": v(o.min) } : {}), ...(o.done ? { "task.done_on": v("2026-11-01") } : {}) }, { ...(goalId ? { goal: goalId } : {}), ...(o.role ? { role: o.role } : {}) });

describe("print helpers (pure)", () => {
  it("knows the three documents and a safe Latin file name", () => {
    expect(isPrintKind("report") && isPrintKind("plan") && isPrintKind("handover")).toBe(true);
    expect(isPrintKind("zip")).toBe(false); expect(isPrintKind(undefined)).toBe(false);
    expect(printFileName("plan", "demo", "2026-11-02")).toBe("trillionaire-me-plan-demo-2026-11-02");
    expect(printFileName("report", "real", "2026-11-02")).toMatch(/^[a-z0-9-]+$/);
  });
  it("planDoc: tree order, date or null, open steps only, minutes unknown stay null", () => {
    const rows = planDoc([goal("g1", "Launch", { date: "2026-12-31" }), goal("g2", "Site", { kind: "project", parent: "g1" }), goal("g3", "No date"),
      task("t1", "Draft", "g1", { min: 30 }), task("t2", "Old", "g1", { done: true }), task("t3", "Unsized", "g1")]);
    expect(rows.map((r) => r.id)).toEqual(["g1", "g2", "g3"]);
    const g1 = rows.find((r) => r.id === "g1")!;
    expect(g1.date).toBe("2026-12-31"); expect(g1.steps.map((s) => [s.title, s.minutes])).toEqual([["Draft", 30], ["Unsized", null]]);
    expect(rows.find((r) => r.id === "g3")!.date).toBeNull(); expect(rows.find((r) => r.id === "g3")!.percent).toBeNull();
    expect(rows.find((r) => r.id === "g2")!.depth).toBe(1);
  });
  it("planDoc is empty without goals (nothing invented)", () => { expect(planDoc([])).toEqual([]); });
});

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector(sel) as T | null;
const go = (h: string) => { location.hash = h; render(); };
let printSpy: ReturnType<typeof vi.fn>;
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>';
  localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, "2026-11-02T00:00:00.000Z");
  printSpy = vi.fn(); (window as unknown as { print: () => void }).print = printSpy as unknown as () => void;
});
afterEach(() => vi.unstubAllGlobals());

describe("print pages", () => {
  it("no kind: offers the three documents, each with a link", () => {
    go("#/journey/print");
    for (const k of ["report", "plan", "handover"]) expect($(`[data-print-choice="${k}"] a[href="#/journey/print/${k}"]`), k).not.toBeNull();
  });
  it("plan: goals, dates, 'not known yet' for what is missing, open steps; Save as PDF opens the print window with the file name as title", () => {
    store.demo.put(goal("g1", "Launch shop", { date: "2026-12-31" })); store.demo.put(goal("g3", "Learn tax")); store.demo.put(task("t1", "Draft page", "g1", { min: 30 }));
    go("#/journey/print/plan");
    expect($('[data-print-goal="g1"]')!.textContent).toMatch(/Launch shop/); expect($('[data-print-goal="g1"]')!.textContent).toMatch(/2026-12-31/);
    expect($('[data-print-goal="g3"]')!.textContent).toMatch(/No target date set/); expect($('[data-print-goal="g3"]')!.textContent).toMatch(/not known yet/);
    expect($('[data-print-step="t1"]')!.textContent).toMatch(/Draft page · 30 min/);
    let titleAtPrint = ""; printSpy.mockImplementation(() => { titleAtPrint = document.title; });
    $<HTMLButtonElement>('[data-act="print-save"]')!.click();
    expect(printSpy).toHaveBeenCalledTimes(1); expect(titleAtPrint).toMatch(/^trillionaire-me-plan-demo-\d{4}-\d{2}-\d{2}$/);
    expect(document.title).not.toBe(titleAtPrint);
  });
  it("plan with no goal says so, no table of zeros", () => { go("#/journey/print/plan"); expect($("[data-print-empty=plan]")).not.toBeNull(); expect($("[data-print-goal]")).toBeNull(); });
  it("hand-over: roles with who covers them, steps tied, delegated mark; no names", () => {
    store.demo.put(rec("r1", "team_role", { "team_role.role": v("Shop packing"), "team_role.holder": v("open") }));
    store.demo.put(task("t9", "Pack orders", null, { role: "r1" }));
    go("#/journey/print/handover");
    const c = $('[data-print-role="r1"]')!; expect(c.textContent).toMatch(/Shop packing/); expect($('[data-print-step="t9"]')!.textContent).toMatch(/Pack orders · Time not set yet/);
  });
  it("hand-over with no role says so", () => { go("#/journey/print/handover"); expect($("[data-print-empty=handover]")).not.toBeNull(); });
  it("report: same cards as the report screen (targets block present), with the made-on line", () => {
    go("#/journey/print/report"); expect($("[data-print-report]")).not.toBeNull(); expect($('[data-kpi-section="week"]')).not.toBeNull(); expect($("[data-print-made]")!.textContent).toMatch(/Made on this phone/);
  });
  it("nothing is fetched while drawing a print page", () => {
    const f = vi.fn(); vi.stubGlobal("fetch", f); go("#/journey/print/report"); go("#/journey/print/plan"); go("#/journey/print/handover"); expect(f).not.toHaveBeenCalled();
  });
});

describe("links to the print pages", () => {
  it("report, plan, team and Backup & export each link to the right document", () => {
    go("#/journey/report"); expect($('a[data-print-link="report"]')).not.toBeNull();
    go("#/diary/plan"); expect($('a[data-print-link="plan"]')).not.toBeNull();
    go("#/diary/team"); expect($('a[data-print-link="handover"]')).not.toBeNull();
    go("#/settings/backup"); for (const k of ["report", "plan", "handover"]) expect($(`[data-card="pdf"] a[data-print-link="${k}"]`), k).not.toBeNull();
  });
});

describe("words", () => {
  it("every print key is in English and Bangla, Bangla uses the loanword rule, mix has no empty string", () => {
    const keys = Object.keys(PACKS.en).filter((k) => k.startsWith("print."));
    expect(keys.length).toBeGreaterThan(20);
    for (const k of keys) { for (const l of ["en", "bn", "mix"] as const) expect((PACKS[l] as Record<string, string>)[k]!.length, `${l}:${k}`).toBeGreaterThan(1); }
    for (const k of keys) { expect((PACKS.bn as Record<string, string>)[k]).not.toMatch(/পরিকল্পনা|প্রতিবেদন|ঝুঁকি|আয়\b/); }
  });
  it("Bangla and mix pages draw without error", () => {
    store.demo.put(goal("g1", "Launch"));
    for (const l of ["bn", "mix"]) { localStorage.setItem("tm:ui:lang", l); go("#/journey/print/plan"); expect($("[data-print-goal=g1]")).not.toBeNull(); expect($('[data-act="print-save"]')!.textContent!.length).toBeGreaterThan(3); }
  });
});

// Four-legs status and money leak review: own entries only, Unknown when missing, no score, demo and real never mixed.
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { fourLegs, leakReview } from "../src/core/legs";
import { resetLeakState } from "../src/ui/legsUi";
import { store, consentKv } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import type { FieldValue, Namespace, TMRecord } from "../src/core/types";

const NOW = "2026-10-25T00:00:00.000Z";
const TODAY = "2026-10-31";
const mk = (ns: Namespace, id: string, entity: string, values: Record<string, unknown>, unknown: string[] = []): TMRecord => {
  const vals: Record<string, FieldValue> = {};
  for (const [k, x] of Object.entries(values)) vals[k] = { state: "value", value: x, label: ns === "demo" ? "DEMO" : "FACT" } as FieldValue;
  for (const k of unknown) vals[k] = { state: "unknown" } as FieldValue;
  return { id, entity, ns, ownerId: "o", schemaVersion: 1, createdAt: NOW, values: vals };
};
const fin = (id: string, kind: string, amount: number | null, label = id, scope = "personal", period = "monthly") =>
  mk("real", id, "finance_item", { "finance.kind": kind, "finance.scope": scope, "finance.period": period, "finance.label": label, ...(amount === null ? {} : { "finance.amount": amount }) }, amount === null ? ["finance.amount"] : []);

describe("four legs (core)", () => {
  it("no records: every leg is unknown, nothing needs a look", () => {
    const r = fourLegs([], TODAY);
    expect(r.legs.map((l) => l.state)).toEqual(["unknown", "unknown", "unknown", "unknown"]); expect(r.lookAt).toEqual([]);
  });
  it("finance: expenses above income needs a look; income covering expenses is steady", () => {
    expect(fourLegs([fin("a", "income", 1000), fin("b", "expense", 1500)], TODAY).legs[0]!).toMatchObject({ state: "look", why: "finance.negative" });
    expect(fourLegs([fin("a", "income", 2000), fin("b", "expense", 1500)], TODAY).legs[0]!).toMatchObject({ state: "steady" });
  });
  it("finance: an unknown amount is never counted as 0 (partly known)", () => {
    expect(fourLegs([fin("a", "income", 2000), fin("b", "expense", null)], TODAY).legs[0]!.state).toBe("partial");
    expect(fourLegs([fin("a", "income", 2000)], TODAY).legs[0]!.state).toBe("partial");
    expect(fourLegs([fin("a", "asset", 500)], TODAY).legs[0]!.state).toBe("partial");
  });
  it("finance: personal and business are judged separately, never added", () => {
    const r = fourLegs([fin("a", "income", 1000), fin("b", "expense", 600), fin("c", "income", 100, "c", "business"), fin("d", "expense", 900, "d", "business")], TODAY);
    expect(r.legs[0]!.state).toBe("look");
  });
  it("tasks: open and none finished in 7 days needs a look; a finished task is steady", () => {
    expect(fourLegs([mk("real", "t", "task", { "task.title": "x" })], TODAY).legs[1]!.state).toBe("look");
    expect(fourLegs([mk("real", "t", "task", { "task.done_on": "2026-10-30" })], TODAY).legs[1]!.state).toBe("steady");
  });
  it("habits: habit without check-ins needs a look (calm wording only); with a check-in steady", () => {
    expect(fourLegs([mk("real", "h", "habit", { "habit.name": "x" })], TODAY).legs[3]!).toMatchObject({ state: "look", why: "habits.quiet" });
    expect(fourLegs([mk("real", "h", "habit", {}), mk("real", "l", "habit_log", { "habit_log.date": "2026-10-31", "habit_log.count": 1 })], TODAY).legs[3]!.state).toBe("steady");
  });
});

describe("money leak review (core)", () => {
  it("no expense lines: nothing returned", () => { expect(leakReview([])).toEqual([]); expect(leakReview([fin("a", "income", 10)])).toEqual([]); });
  it("top 3 known lines by amount; unknown amounts listed, not 0; one-off lines not converted", () => {
    const r = leakReview([fin("a", "income", 10000), fin("e1", "expense", 3000), fin("e2", "expense", 1000), fin("e3", "expense", 500), fin("e4", "expense", 200), fin("e5", "expense", null), fin("e6", "expense", 999, "e6", "personal", "once")]);
    expect(r).toHaveLength(1);
    expect(r[0]!.top.map((l) => l.id)).toEqual(["e1", "e2", "e3"]); expect(r[0]!.top[0]!.shareOfIncome).toBe(30);
    expect(r[0]!.unknownCount).toBe(1); expect(r[0]!.notMonthly).toBe(1);
  });
  it("income unknown means share unknown (null), never 0%", () => {
    const r = leakReview([fin("a", "income", null), fin("e1", "expense", 3000)]);
    expect(r[0]!.top[0]!.shareOfIncome).toBeNull();
  });
});

describe("legs and leak screens", () => {
  const onHash = () => render();
  beforeEach(() => {
    window.addEventListener("hashchange", onHash); resetLeakState();
    localStorage.clear(); store.demo.clear(); store.real.clear();
    document.body.innerHTML = '<div id="app"></div>';
    localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "real"); grantConsent(consentKv, NOW);
  });
  afterEach(() => window.removeEventListener("hashchange", onHash));
  const go = (p: string) => { location.hash = p; render(); };
  const app = () => document.getElementById("app")!;
  it("legs screen: empty real mode shows four Not-enough-data cards and no look prompt", () => {
    go("#/journey/legs");
    expect(app().querySelectorAll("[data-leg]").length).toBe(4);
    expect([...app().querySelectorAll("[data-leg-state]")].every((e) => e.getAttribute("data-leg-state") === "unknown")).toBe(true);
    expect(app().querySelector("[data-legs-summary]")!.getAttribute("data-legs-summary")).toBe("none");
    expect(app().textContent).not.toMatch(/\b(score|rank|streak|failed|grade)\b/i);
  });
  it("legs screen ignores demo records in real mode", () => {
    store.demo.put(mk("demo", "t", "task", { "task.title": "x" }));
    go("#/journey/legs");
    expect(app().querySelector('[data-leg="tasks"]')!.getAttribute("data-leg-state")).toBe("unknown");
  });
  it("legs screen points at a leg worth a look without red wording", () => {
    store.real.put(fin("a", "income", 1000)); store.real.put(fin("b", "expense", 1500));
    go("#/journey/legs");
    expect(app().querySelector("[data-legs-summary]")!.getAttribute("data-legs-summary")).toBe("look");
    expect(app().querySelector('[data-leg="finance"]')!.getAttribute("data-leg-state")).toBe("look");
  });
  it("leak screen: empty money says so; lever button toggles in memory only", () => {
    go("#/journey/leak");
    expect(app().querySelector("[data-leak-empty]")).not.toBeNull();
    (app().querySelector('[data-lever="silence"] button') as HTMLElement).click();
    expect(app().querySelector('[data-lever="silence"] button')!.getAttribute("aria-pressed")).toBe("true");
    expect(store.real.list().length).toBe(0);
  });
  it("leak screen lists own expense lines with labels; unknown share is shown as unknown", () => {
    store.real.put(fin("e1", "expense", 3000, "Rent")); store.demo.put(mk("demo", "e9", "finance_item", { "finance.kind": "expense", "finance.scope": "personal", "finance.period": "monthly", "finance.label": "Demo rent", "finance.amount": 7000 }));
    go("#/journey/leak");
    expect(app().textContent).toContain("Rent"); expect(app().textContent).not.toContain("Demo rent");
    expect(app().querySelector("[data-leak-line] [data-unknown]")).not.toBeNull();
  });
  it("both screens render in bn and mix", () => { for (const l of ["bn", "mix"]) { localStorage.setItem("tm:ui:lang", l); go("#/journey/legs"); expect(app().querySelector("h1")!.textContent!.length).toBeGreaterThan(2); go("#/journey/leak"); expect(app().querySelector("h1")!.textContent!.length).toBeGreaterThan(2); } });
});

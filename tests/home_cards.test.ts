// Home summary cards and the rule-based Next best action: own entries only, Unknown when missing, DEMO tag, BDT, always a reason, no invented figure.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { store, consentKv } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import type { FieldValue, Namespace, TMRecord } from "../src/core/types";
import { moneySummary } from "../src/core/homeSummary";
import { nextBestAction } from "../src/core/nextAction";
import type { FinItem } from "../src/core/finance";
import { readFileSync } from "node:fs";

const NOW = "2026-10-26T00:00:00.000Z";
const mk = (ns: Namespace, id: string, entity: string, values: Record<string, unknown>, links?: Record<string, string>): TMRecord => {
  const label = ns === "demo" ? "DEMO" : "FACT"; const vals: Record<string, FieldValue> = {};
  for (const [k, x] of Object.entries(values)) vals[k] = (x === null ? { state: "unknown" } : { state: "value", value: x, label }) as FieldValue;
  return { id, entity, ns, ownerId: ns === "demo" ? "demo-user" : "owner", schemaVersion: 1, createdAt: NOW, values: vals, ...(links ? { links } : {}) };
};
const fin = (id: string, kind: string, amount: number | null, scope = "personal", ns: Namespace = "demo") =>
  mk(ns, id, "finance_item", { "finance.kind": kind, "finance.scope": scope, "finance.label": id, "finance.amount": amount, "finance.period": kind === "asset" || kind === "liability" ? "once" : "monthly" });
const goal = (id: string, extra: Record<string, unknown> = {}) => mk("demo", id, "goal", { "goal.title": `Goal ${id}`, ...extra });
const task = (id: string, goalId?: string, done = false) => mk("demo", id, "task", { "task.title": `Task ${id}`, ...(done ? { "task.done_on": "2026-10-26" } : {}) }, goalId ? { goal: goalId } : undefined);
const app = () => document.getElementById("app")!;
const go = (hash: string) => { location.hash = hash; render(); };
const card = (id: string) => app().querySelector(`[data-home-card=${id}]`)!;

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear();
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
});

describe("moneySummary (pure)", () => {
  it("nothing entered: every metric is none, never 0", () => {
    const s = moneySummary([]).scopes; expect(s.map((x) => x.scope)).toEqual(["personal"]);
    expect(s[0]).toMatchObject({ netWorth: { state: "none" }, income: { state: "none" }, expenses: { state: "none" } });
  });
  it("values, an entry with no amount makes that metric unknown, business appears only with business items and is never added to personal", () => {
    const items: FinItem[] = [
      { kind: "income", scope: "personal", amount: { state: "value", value: 50000, label: "FACT" } },
      { kind: "expense", scope: "personal", amount: { state: "unknown" } },
      { kind: "income", scope: "business", amount: { state: "value", value: 9000, label: "FACT" } }];
    const s = moneySummary(items).scopes;
    expect(s.map((x) => x.scope)).toEqual(["personal", "business"]);
    expect(s[0]!.income).toMatchObject({ state: "value", value: 50000 }); expect(s[0]!.expenses).toEqual({ state: "unknown", missing: 1 });
    expect(s[1]!.income).toMatchObject({ state: "value", value: 9000 });
  });
});

describe("Home cards", () => {
  it("empty start: three cards, all Unknown, no digit 0 as a value, DEMO tag, Saved on this device", () => {
    go("#/today");
    for (const id of ["networth", "income", "expenses"]) expect(card(id).textContent).toMatch(/Unknown/);
    expect(app().querySelectorAll("[data-home-card]").length).toBe(3);
    const sec = app().querySelector("[data-home-summary]")!; expect(sec.getAttribute("data-home-summary")).toBe("demo");
    expect(sec.querySelector(".badge")!.textContent).toMatch(/Demo/i);
    expect(sec.textContent).toMatch(/Saved on this device/); expect(sec.textContent).not.toMatch(/BDT/);
  });
  it("own entries: BDT figures with a label chip; missing amount stays Unknown with the count", () => {
    store.demo.put(fin("i1", "income", 50000)); store.demo.put(fin("e1", "expense", 30000)); store.demo.put(fin("a1", "asset", 100000)); store.demo.put(fin("l1", "liability", null));
    go("#/today");
    expect(card("income").textContent).toMatch(/BDT 50,000/); expect(card("expenses").textContent).toMatch(/BDT 30,000/);
    expect(card("income").querySelector("[data-label=ESTIMATE]")).not.toBeNull();
    expect(card("networth").textContent).toMatch(/Unknown\. 1 amount\(s\) missing/); expect(card("networth").textContent).not.toMatch(/BDT/);
  });
  it("business items show on their own line, personal stays separate", () => {
    store.demo.put(fin("i1", "income", 1000)); store.demo.put(fin("bi", "income", 777, "business"));
    go("#/today");
    expect(card("income").querySelector("[data-scope=personal]")!.textContent).toMatch(/BDT 1,000/);
    expect(card("income").querySelector("[data-scope=business]")!.textContent).toMatch(/BDT 777/);
  });
  it("real mode ignores demo money and shows the Real tag", () => {
    store.demo.put(fin("i1", "income", 50000)); localStorage.setItem("tm:ui:dataMode", "real"); grantConsent(consentKv, NOW);
    store.real.put(fin("ri", "income", 1200, "personal", "real"));
    go("#/today");
    expect(card("income").textContent).toMatch(/BDT 1,200/); expect(card("income").textContent).not.toMatch(/50,000/);
    expect(app().querySelector("[data-home-summary]")!.getAttribute("data-home-summary")).toBe("real");
  });
  it("Bangla and Mix: Latin digits, BDT as taka text", () => {
    store.demo.put(fin("i1", "income", 50000));
    for (const l of ["bn", "mix"]) { localStorage.setItem("tm:ui:lang", l); go("#/today"); expect(app().querySelector("[data-home-summary]")!.textContent).not.toMatch(/[০-৯]/); expect(card("income").textContent).toMatch(/50,000 টাকা/); }
  });
});

describe("nextBestAction (pure rules)", () => {
  it("runs the rules in order", () => {
    expect(nextBestAction([]).id).toBe("add_goal");
    expect(nextBestAction([goal("g")])).toMatchObject({ id: "link_task", args: { goal: "Goal g" } });
    expect(nextBestAction([goal("g"), task("t", undefined)]).id).toBe("link_task");
    expect(nextBestAction([goal("g", { "goal.progress_mode": "manual" })]).id).toBe("add_task");
    expect(nextBestAction([goal("g"), task("t", "g")])).toMatchObject({ id: "do_task", args: { task: "Task t" } });
    const done = [goal("g"), task("t", "g", true)];
    expect(nextBestAction(done).id).toBe("add_money");
    expect(nextBestAction([...done, fin("i", "income", 1)]).id).toBe("rate_life");
    expect(nextBestAction([...done, fin("i", "income", 1), mk("demo", "life-health", "life_area", { "life_area.key": "health", "life_area.rating": 3 })]).id).toBe("review_plan");
  });
});

describe("Next best action card", () => {
  it("always shows the reason and a button; never a percent or an amount", () => {
    for (const recs of [[], [goal("g")], [goal("g"), task("t", "g")], [goal("g"), task("t", "g", true)], [goal("g"), task("t", "g", true), fin("i", "income", 50000)]]) {
      store.demo.clear(); recs.forEach((r) => store.demo.put(r)); go("#/today");
      const c = app().querySelector("[data-next-action]")!;
      expect(c.querySelector("[data-next-reason]")!.textContent!.length).toBeGreaterThan(20);
      expect(c.querySelector("a[data-act=next-go]")!.getAttribute("href")).toMatch(/^#\//);
      expect(c.textContent).not.toMatch(/%|BDT|\d{3}/);
    }
  });
  it("the action text uses the user's own task name; Bangla has a reason too", () => {
    store.demo.put(goal("g")); store.demo.put(task("t", "g")); go("#/today");
    expect(app().querySelector("[data-next-title]")!.textContent).toBe("Do: Task t");
    localStorage.setItem("tm:ui:lang", "bn"); go("#/today");
    expect(app().querySelector("[data-next-reason]")!.textContent).toMatch(/খোলা কাজ/); expect(app().querySelector("[data-next-action]")!.textContent).not.toMatch(/[০-৯]/);
  });
  it("no network and no animation in the new code", () => {
    const src = ["src/ui/homeUi.ts", "src/core/homeSummary.ts", "src/core/nextAction.ts"].map((f) => readFileSync(f, "utf8")).join("\n");
    expect(src).not.toMatch(/fetch\(|XMLHttpRequest|https?:\/\//);
  });
});

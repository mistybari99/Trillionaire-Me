// D-B entry forms: consent gate on every entry form, real records on Today/Plan/Habits, DEMO and real kept apart, clear-all removes real only.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { grantConsent, readConsent, revokeConsent } from "../src/core/consent";
import { StoreError } from "../src/core/store";
import type { FieldValue, Namespace, TMRecord } from "../src/core/types";
import { render } from "../src/app";
import { consentKv, prefs, store } from "../src/ui/state";

const NOW = "2026-10-25T00:00:00.000Z";
const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" });
const demoRec = (id: string, entity: string, values: Record<string, FieldValue>): TMRecord => ({ id, entity, ns: "demo", ownerId: "demo-user", schemaVersion: 1, createdAt: NOW, values });
const go = (hash: string) => { location.hash = hash; render(); };
// Submit and re-render, the way the app does after a save (tests have no hashchange listener).
const submit = (sel: string) => { document.querySelector(sel)!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true })); render(); };
const send = (sel: string) => document.querySelector(sel)!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true })); // no re-render: keeps the error text
const tap = (sel: string) => document.querySelector<HTMLButtonElement>(sel)!.click(); // no re-render: keeps the form state
const setv = (id: string, value: string) => { (document.getElementById(id) as HTMLInputElement | HTMLSelectElement).value = value; };
const allLabels = (ns: Namespace) => (ns === "real" ? store.real : store.demo).list().flatMap((r) => Object.values(r.values).filter((x) => x.state === "value").map((x) => (x as { label: string }).label));
/** A free window and weekly hours, so the planner can place tasks today. Stored as demo answers (intake). */
const seedCapacity = () => {
  store.demo.put(demoRec("intake-constraint", "constraint", { "constraint.weekly_free_hours": v(40), "constraint.free_from": v("06:00"), "constraint.free_to": v("22:00") }));
};

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  store.demo.clear(); store.real.clear();
  document.body.innerHTML = '<div id="app"></div>';
  localStorage.setItem("tm:ui:lang", "en");
  prefs.horizonView = "stack";
  revokeConsent(consentKv);
});

describe("consent gate: no consent, no save", () => {
  it("the task form shows the consent prompt and saves nothing", () => {
    go("#/diary/plan");
    expect(document.querySelector("form[data-form=task] [data-consent-prompt]")).not.toBeNull();
    setv("pt-title", "Call supplier"); setv("pt-min", "20");
    send("form[data-form=task]");
    expect(document.querySelector("form[data-form=task] .err")!.textContent).toMatch(/Nothing saved/);
    expect(store.real.list()).toEqual([]);
    expect(store.demo.list()).toEqual([]);
  });

  it("the habit, money and journey-note forms show the prompt and save nothing", () => {
    go("#/habits");
    setv("hb-name", "Walk"); send("form[data-form=habit]");
    expect(document.querySelector("form[data-form=habit] .err")!.textContent).toMatch(/Nothing saved/);
    go("#/diary/money");
    (document.getElementById("mf-name") as HTMLInputElement).value = "Savings"; (document.getElementById("mf-amount") as HTMLInputElement).value = "500";
    send("form[data-form=money]");
    expect(document.querySelector("form[data-form=money] .err")!.textContent).toMatch(/Nothing saved/);
    go("#/capture");
    expect(document.querySelector("[data-consent-prompt]")).not.toBeNull();
    (document.getElementById("cap-note") as HTMLTextAreaElement).value = "Decided to call the supplier";
    tap("[data-act=capture-find]");
    tap("[data-act=capture-note]");
    expect(document.body.textContent).toMatch(/Nothing saved/);
    expect(store.real.list()).toEqual([]);
    expect(store.demo.list()).toEqual([]);
  });

  it("the goal form (intake step 6) shows the prompt and does not move on", () => {
    go("#/diary/intake/6");
    expect(document.querySelector("[data-consent-prompt]")).not.toBeNull();
    setv("f-goal.title", "Steady income");
    send("form");
    expect(location.hash).toBe("#/diary/intake/6");
    expect(store.real.list()).toEqual([]);
    expect(store.demo.list()).toEqual([]);
  });

  it("the store itself refuses a real write while consent is missing", () => {
    expect(() => store.real.put({ id: "x", entity: "task", ns: "real", ownerId: "owner", schemaVersion: 1, createdAt: NOW, values: { "task.title": { state: "value", value: "A", label: "FACT" } } })).toThrow(StoreError);
  });
});

describe("consent on: real records", () => {
  beforeEach(() => { grantConsent(consentKv, NOW); seedCapacity(); });

  it("a saved task is real (FACT) and appears on Plan and on Today", () => {
    go("#/diary/plan");
    expect(document.querySelector("form[data-form=task] [data-consent-prompt]")).toBeNull();
    setv("pt-title", "Call supplier"); setv("pt-min", "20");
    submit("form[data-form=task]");
    const saved = store.real.list().find((r) => r.entity === "task")!;
    expect(saved).toBeDefined();
    expect(saved.values["task.title"]).toMatchObject({ state: "value", value: "Call supplier", label: "FACT" });
    expect(store.demo.list().filter((r) => r.entity === "task")).toEqual([]);

    // Plan: the row shows the real task with its Real tag
    const row = document.querySelector(`[data-task='${saved.id}']`)!;
    expect(row.textContent).toMatch(/Call supplier/);
    expect(row.querySelector("[data-ns=real]")).not.toBeNull();

    // Today: the real task is placed today (capacity is set, so the planner places it)
    go("#/today");
    expect(document.querySelector("[data-placement]")?.getAttribute("data-placement")).toBe(saved.id);
    expect(document.querySelector("[data-today='none']")).toBeNull();
    expect(document.body.textContent).toMatch(/Call supplier/);
  });

  it("a saved habit is real and shows on Habits with a Real tag; ticking it writes a real log", () => {
    go("#/habits");
    setv("hb-name", "Walk 10 minutes");
    submit("form[data-form=habit]");
    const hb = store.real.list().find((r) => r.entity === "habit")!;
    expect(hb.values["habit.title"]).toMatchObject({ label: "FACT" });
    go("#/habits");
    const card = document.querySelector(`[data-habit-card='${hb.id}']`)!;
    expect(card.querySelector("[data-ns=real]")).not.toBeNull();
    (card.querySelector("[data-act=habit-tick]") as HTMLButtonElement).click(); render();
    const log = store.real.list().find((r) => r.entity === "habit_log")!;
    expect(log.links?.habit).toBe(hb.id);
    expect(store.demo.list().filter((r) => r.entity === "habit_log")).toEqual([]);
  });

  it("Habits and Plan show demo and real records together, each with its own tag", () => {
    store.demo.put(demoRec("task-demo-1", "task", { "task.title": v("Demo task"), "task.minutes": v(15) }));
    store.demo.put(demoRec("habit-demo-1", "habit", { "habit.title": v("Demo habit"), "habit.days": v("0,1,2,3,4,5,6") }));
    go("#/diary/plan");
    setv("pt-title", "Real task"); setv("pt-min", "10"); submit("form[data-form=task]");
    go("#/diary/plan");
    const tags = [...document.querySelectorAll("[data-task] [data-ns]")].map((x) => x.getAttribute("data-ns"));
    expect(tags.sort()).toEqual(["demo", "real"]);
    expect(document.body.textContent).toMatch(/Demo task/);
    expect(document.body.textContent).toMatch(/Real task/);

    go("#/habits");
    expect(document.querySelector("[data-habit-card='habit-demo-1'] [data-ns=demo]")).not.toBeNull();
  });

  it("demo and real stay in their own records: no record mixes DEMO and real labels", () => {
    store.demo.put(demoRec("task-demo-2", "task", { "task.title": v("Demo only") }));
    go("#/diary/plan"); setv("pt-title", "Real only"); submit("form[data-form=task]");
    go("#/diary/money");
    (document.getElementById("mf-name") as HTMLInputElement).value = "Savings"; (document.getElementById("mf-amount") as HTMLInputElement).value = "500";
    submit("form[data-form=money]");
    expect(allLabels("demo").every((l) => l === "DEMO")).toBe(true);
    expect(allLabels("real").some((l) => l === "DEMO")).toBe(false);
    expect(allLabels("real").length).toBeGreaterThan(0);
    for (const r of store.real.list()) expect(r.ns).toBe("real");
    for (const r of store.demo.list()) expect(r.ns).toBe("demo");
  });

  it("the money total says demo and real lines are added together when both exist", () => {
    store.demo.put(demoRec("fin-demo", "finance_item", { "finance.kind": v("asset"), "finance.scope": v("personal"), "finance.label": v("Demo cash"), "finance.amount": v(100), "finance.period": v("once") }));
    go("#/diary/money");
    (document.getElementById("mf-name") as HTMLInputElement).value = "Real cash"; (document.getElementById("mf-amount") as HTMLInputElement).value = "250";
    submit("form[data-form=money]");
    expect(document.querySelector("[data-mix='1']")).not.toBeNull();
    expect([...document.querySelectorAll("[data-fin] [data-ns]")].map((x) => x.getAttribute("data-ns")).sort()).toEqual(["demo", "real"]);
  });

  it("the real intake goal shows on the horizon with a Real tag, and a real answer overrides the demo one", () => {
    store.demo.put(demoRec("intake-goal", "goal", { "goal.title": v("Demo goal") }));
    go("#/diary/intake/6");
    setv("f-goal.title", "Real goal"); setv("f-goal.horizon", "one_year");
    submit("form");
    expect(store.real.get("intake-goal")!.values["goal.title"]).toMatchObject({ value: "Real goal", label: "FACT" });
    go("#/journey/horizon");
    expect(document.querySelector("[data-horizon='one_year'] [data-ns=real]")).not.toBeNull();
    expect(document.body.textContent).toMatch(/Real goal/);
  });

  it("a demo answer is not copied into a real record: the form pre-fills from real answers only", () => {
    store.demo.put(demoRec("intake-goal", "goal", { "goal.title": v("Demo goal"), "goal.why": v("Demo why") }));
    go("#/diary/intake/6");
    expect((document.getElementById("f-goal.title") as HTMLInputElement).value).toBe("");
    setv("f-goal.title", "Real goal"); submit("form");
    const real = store.real.get("intake-goal")!;
    expect(real.values["goal.title"]).toMatchObject({ value: "Real goal", label: "FACT" });
    expect(real.values["goal.why"]).toBeUndefined();
    expect(store.demo.get("intake-goal")!.values["goal.title"]).toMatchObject({ value: "Demo goal", label: "DEMO" });
  });

  it("a real journey note is saved as real, with its items", () => {
    go("#/capture");
    (document.getElementById("cap-note") as HTMLTextAreaElement).value = "Bought 3 units for 1200 BDT";
    tap("[data-act=capture-find]");
    tap("[data-act=capture-note]");
    expect(store.real.list().filter((r) => r.entity === "capture").length).toBe(1);
    expect(store.demo.list().filter((r) => r.entity === "capture" || r.entity === "capture_item")).toEqual([]);
  });

  it("clear-all removes only real records; demo stays on Plan", () => {
    store.demo.put(demoRec("task-demo-3", "task", { "task.title": v("Keep me") }));
    go("#/diary/plan"); setv("pt-title", "Remove me"); submit("form[data-form=task]");
    go("#/more/data");
    tap("[data-act=clear-real]"); render();
    tap("[data-act=clear-real-yes]"); render();
    expect(store.real.list()).toEqual([]);
    expect(store.demo.list().map((r) => r.id).sort()).toEqual(["intake-constraint", "task-demo-3"]);
    expect(readConsent(consentKv)).toBe(false);
    go("#/diary/plan");
    expect(document.body.textContent).toMatch(/Keep me/);
    expect(document.body.textContent).not.toMatch(/Remove me/);
    expect(document.querySelector("form[data-form=task] [data-consent-prompt]")).not.toBeNull();
  });
});

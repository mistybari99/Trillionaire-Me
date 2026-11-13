import { beforeEach, describe, expect, it } from "vitest";
import { buildPlanInput, capacityState, fmtClock, freeWindow, parseClock, tasksFrom } from "../src/core/planInputs";
import { schedule } from "../src/core/planner";
import { render } from "../src/app";
import { store } from "../src/ui/state";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" });
const rec = (id: string, entity: string, values: Record<string, FieldValue>): TMRecord => ({ id, entity, ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-10-24T00:00:00Z", values });
const answers = (o: Record<string, FieldValue>) => o;

describe("plan inputs: unknown stays unknown", () => {
  it("clock parsing accepts HH:MM and Bangla digits, rejects nonsense", () => {
    expect(parseClock("20:00")).toBe(1200); expect(parseClock("২০:৩০")).toBe(1230); expect(parseClock("9:05")).toBe(545);
    for (const bad of ["", "25:00", "20:60", "abc", "20", "24:30"]) expect(parseClock(bad), bad).toBeNull();
    expect(fmtClock(545)).toBe("09:05");
  });
  it("window needs both ends and to > from", () => {
    expect(freeWindow(answers({ "constraint.free_from": v("20:00"), "constraint.free_to": v("22:00") }))).toEqual({ from: 1200, to: 1320 });
    expect(freeWindow(answers({ "constraint.free_from": v("22:00"), "constraint.free_to": v("20:00") }))).toBeNull();
    expect(freeWindow(answers({ "constraint.free_from": v("20:00"), "constraint.free_to": { state: "later" } }))).toBeNull();
  });
  it("capacity is unknown unless hours AND window are known; then nothing is placed", () => {
    const t = [rec("task-1", "task", { "task.title": v("a"), "task.minutes": v(30) })];
    for (const a of [answers({}), answers({ "constraint.weekly_free_hours": { state: "unknown" }, "constraint.free_from": v("20:00"), "constraint.free_to": v("22:00") }), answers({ "constraint.weekly_free_hours": v(5) })]) {
      const p = schedule(buildPlanInput(a, t, "normal")); expect(p.placements).toEqual([]); expect(p.deferred[0]!.reason).toBe("unknown_capacity");
    }
    expect(capacityState(answers({}))).toBe("need_hours"); expect(capacityState(answers({ "constraint.weekly_free_hours": v(5) }))).toBe("need_window");
  });
  it("a real 0 free hours is respected as 0 (not unknown): nothing fits", () => {
    const a = answers({ "constraint.weekly_free_hours": v(0), "constraint.free_from": v("20:00"), "constraint.free_to": v("22:00") });
    const p = schedule(buildPlanInput(a, [rec("task-1", "task", { "task.title": v("a"), "task.minutes": v(30) })], "normal"));
    expect(p.deferred[0]!.reason).toBe("no_room");
  });
  it("tasks: unknown minutes stay null, priority maps, order is stable", () => {
    const ts = tasksFrom([rec("task-b", "task", { "task.title": v("b"), "task.minutes": { state: "later" }, "task.priority": v("high") }), rec("task-a", "task", { "task.title": v("a"), "task.minutes": v(20) })]);
    expect(ts).toEqual([{ id: "task-a", minutes: 20, priority: 2 }, { id: "task-b", minutes: null, priority: 3 }]);
  });
  it("placements stay inside the user's free window every day", () => {
    const a = answers({ "constraint.weekly_free_hours": v(10), "constraint.free_from": v("20:00"), "constraint.free_to": v("22:00") });
    const recs = Array.from({ length: 8 }, (_, i) => rec(`task-${i}`, "task", { "task.title": v("x"), "task.minutes": v(45) }));
    const p = schedule(buildPlanInput(a, recs, "normal"));
    expect(p.placements.length).toBeGreaterThan(0);
    for (const pl of p.placements) { expect(pl.start).toBeGreaterThanOrEqual(1200); expect(pl.end).toBeLessThanOrEqual(1320); }
  });
});

describe("plan screens", () => {
  beforeEach(() => { localStorage.clear(); store.demo.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); });
  const go = (h: string) => { location.hash = h; render(); };
  it("without capacity the plan screen asks for it and plans nothing", () => {
    store.demo.put(rec("task-1", "task", { "task.title": v("Call supplier"), "task.minutes": v(20) }));
    go("#/diary/plan");
    expect(document.querySelector("[data-capacity]")!.getAttribute("data-capacity")).toBe("need_hours");
    expect(document.querySelectorAll("[data-placement]").length).toBe(0);
    expect(document.querySelector("[data-deferred='unknown_capacity']")).not.toBeNull();
  });
  it("with capacity the week shows text placements; every value is labelled", () => {
    store.demo.put(rec("intake-constraint", "constraint", { "constraint.weekly_free_hours": v(6), "constraint.free_from": v("20:00"), "constraint.free_to": v("22:00") }));
    store.demo.put(rec("task-1", "task", { "task.title": v("Call supplier"), "task.minutes": v(20), "task.priority": v("high") }));
    go("#/diary/plan");
    expect(document.querySelector("[data-placement='task-1']")!.textContent).toMatch(/20:00–20:20 · Call supplier/);
    for (const el of document.querySelectorAll("[data-value]")) expect(el.getAttribute("data-label")).toBe("DEMO");
  });
  it("Home shows at most 3 of the user's own planned actions, or a calm 'nothing today'", () => {
    store.demo.put(rec("intake-constraint", "constraint", { "constraint.weekly_free_hours": v(40), "constraint.free_from": v("06:00"), "constraint.free_to": v("22:00") }));
    for (let i = 0; i < 6; i++) store.demo.put(rec(`task-${i}`, "task", { "task.title": v(`T${i}`), "task.minutes": v(30) }));
    go("#/today");
    const n = document.querySelectorAll(".task").length; expect(n).toBeGreaterThanOrEqual(1); expect(n).toBeLessThanOrEqual(3);
    expect(document.body.textContent).not.toMatch(/Fill in skills and interests/); // demo seed is replaced by the user's own plan
  });
  it("pause mode: no placements and a gentle message, never an error", () => {
    localStorage.setItem("tm:ui:mode", "pause");
    store.demo.put(rec("intake-constraint", "constraint", { "constraint.weekly_free_hours": v(6), "constraint.free_from": v("20:00"), "constraint.free_to": v("22:00") }));
    store.demo.put(rec("task-1", "task", { "task.title": v("A"), "task.minutes": v(20) }));
    go("#/diary/plan");
    expect(document.querySelectorAll("[data-placement]").length).toBe(0);
    expect(document.querySelector(".err")!.textContent).toBe(""); // no error element text
    expect(document.querySelector("[data-deferred='paused']")).not.toBeNull();
    go("#/today"); expect(document.querySelector("[data-today='none']")).not.toBeNull();
  });
  it("a secret typed as a task title is rejected and not saved", () => {
    go("#/diary/plan");
    (document.getElementById("pt-title") as HTMLInputElement).value = "password: abc12345";
    document.querySelector("form[data-form=task]")!.dispatchEvent(new Event("submit", { cancelable: true }));
    expect(store.demo.list().filter((r) => r.entity === "task")).toEqual([]);
    expect(document.querySelector(".err")).not.toBeNull();
  });
});

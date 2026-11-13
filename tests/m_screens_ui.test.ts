// UI checks for the G3 register screens (risks, ventures, team roles, plan history, North Star).
// Demo namespace only. Unknown stays unknown; Bangla screens use Latin digits; no contact details are stored.
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { store } from "../src/ui/state";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" }) as FieldValue;
const rec = (id: string, entity: string, values: Record<string, FieldValue>): TMRecord => ({ id, entity, ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-10-24T00:00:00Z", values });
const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector(sel) as T | null;
// Submit only. The app re-renders after a successful save; tests call render() themselves before reading the saved view.
const submit = (form: string) => { const f = $<HTMLFormElement>(`form[data-form="${form}"]`)!; f.dispatchEvent(new Event("submit", { cancelable: true })); };
const set = (id: string, value: string) => { ($<HTMLInputElement | HTMLSelectElement>(`#${id}`) as HTMLInputElement).value = value; };

describe("register screens (demo data)", () => {
  beforeEach(() => { localStorage.clear(); store.demo.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); });
  const go = (h: string) => { location.hash = h; render(); };

  it("M15 risk: saves a risk with a stop rule, counts the risks without one, and refuses empty text", () => {
    go("#/journey/risks");
    submit("risk");
    expect($("form[data-form=risk] .err")!.textContent).toMatch(/one line/);
    set("rk-text", "Sales stop for a month"); set("rk-likelihood", "high"); set("rk-date", "2026-12-31");
    submit("risk");
    const saved = store.demo.list().filter((r) => r.entity === "risk");
    expect(saved).toHaveLength(1);
    expect(saved[0]!.values["risk.likelihood"]).toEqual({ state: "value", value: "high", label: "DEMO" });
    expect(saved[0]!.values["risk.stop_rule"]).toBeUndefined();
    render();
    expect($("[data-risk-missing]")!.textContent).toMatch(/without a stop rule: 1/);
    expect($("[data-risk]")!.textContent).toMatch(/Stop rule not written yet/);
  });

  it("M15 risk: no likelihood chosen is stored as unknown, never as a guessed level", () => {
    go("#/journey/risks");
    set("rk-text", "Price goes up");
    submit("risk");
    const r = store.demo.list().find((x) => x.entity === "risk")!;
    expect(r.values["risk.likelihood"]).toEqual({ state: "unknown" });
    render();
    expect($("[data-risk]")!.textContent).toMatch(/Likelihood: Don't know/);
  });

  it("M15 risk: a date the browser refuses is not saved as text (no review date, risk still saved)", () => {
    go("#/journey/risks");
    set("rk-text", "Late supplier"); set("rk-date", "2026-02-30");
    submit("risk");
    const r = store.demo.list().find((x) => x.entity === "risk")!;
    expect(r.values["risk.review_on"]).toBeUndefined();
  });

  it("M15 risk: removing a risk deletes only that record", () => {
    store.demo.put(rec("risk-a", "risk", { "risk.text": v("A") }));
    store.demo.put(rec("risk-b", "risk", { "risk.text": v("B") }));
    go("#/journey/risks");
    $<HTMLButtonElement>('[data-remove="risk-a"]')!.click();
    expect(store.demo.list().map((r) => r.id)).toEqual(["risk-b"]);
  });

  it("M09 ventures: blank ownership is unknown; 0-100 only; no value is derived", () => {
    go("#/diary/ventures");
    set("vn-name", "Shop A"); set("vn-own", "");
    submit("venture");
    set("vn-name", "Shop B"); set("vn-own", "101");
    submit("venture");
    expect($("form[data-form=venture] .err")!.textContent).toMatch(/0 to 100/);
    set("vn-own", "৫১"); set("vn-stage", "running");
    submit("venture");
    const rows = store.demo.list().filter((r) => r.entity === "venture");
    expect(rows).toHaveLength(2);
    const unknownRow = rows.find((r) => r.values["venture.name"]?.state === "value" && (r.values["venture.name"] as { value: string }).value === "Shop A")!;
    expect(unknownRow.values["venture.ownership_pct"]).toEqual({ state: "unknown" });
    render();
    const shown = document.body.textContent ?? "";
    expect(shown).toMatch(/Ownership unknown/);
    expect(shown).toMatch(/51%/);
  });

  it("M10 team: roles only; a person's email or phone is refused; counts show nobody yet and not answered", () => {
    go("#/diary/team");
    set("tm-role", "ray@example.com");
    submit("team");
    expect($("form[data-form=team] .err")!.textContent).toMatch(/Do not write a name/);
    set("tm-role", "Bookkeeping"); set("tm-holder", "open");
    submit("team");
    set("tm-role", "Deliveries"); set("tm-holder", "");
    submit("team");
    expect(store.demo.list().filter((r) => r.entity === "team_role")).toHaveLength(2);
    render();
    expect($("[data-team-summary]")!.textContent).toMatch(/Roles: 2 · Nobody yet: 1 · Not answered: 1/);
  });

  it("M12 plan history lists finished and no-longer-true steps, newest first", () => {
    store.demo.put(rec("task-1", "task", { "task.title": v("Old plan"), "task.not_true_on": v("2026-10-20") }));
    store.demo.put(rec("task-2", "task", { "task.title": v("Shop list"), "task.done_on": v("2026-10-22") }));
    go("#/journey/history");
    const items = [...document.querySelectorAll("[data-hist]")].map((li) => li.textContent ?? "");
    expect(items).toHaveLength(2);
    expect(items[0]).toMatch(/Shop list · Finished · 2026-10-22/);
    expect(items[1]).toMatch(/Old plan · No longer true · 2026-10-20/);
  });

  it("M03 North Star: steps are shown only when start and target are both known", () => {
    go("#/journey/northstar");
    set("ns-metric", "Regular customers"); set("ns-unit", "people"); set("ns-base", "10"); set("ns-target", "20");
    submit("north-star");
    render();
    expect($("[data-ladder='ok']")!.textContent).toBe("10 → 12.5 → 15 → 17.5 → 20");
    set("ns-metric", "Monthly income"); set("ns-base", ""); set("ns-target", "60");
    submit("north-star");
    render();
    const unknown = $("[data-ladder='unknown']")!.textContent ?? "";
    expect(unknown).toMatch(/Not known: starting number/);
    expect(unknown).not.toMatch(/→/);
    set("ns-metric", "Same"); set("ns-base", "40"); set("ns-target", "40");
    submit("north-star");
    render();
    expect($("[data-ladder='same']")!.textContent).toMatch(/no steps are needed/);
  });

  it("North Star: a non-number is refused", () => {
    go("#/journey/northstar");
    set("ns-metric", "Bad"); set("ns-base", "ten"); set("ns-target", "20");
    submit("north-star");
    expect($("form[data-form=north-star] .err")!.textContent).toMatch(/Numbers only/);
    expect(store.demo.list().filter((r) => r.entity === "north_star")).toHaveLength(0);
  });

  it("every register screen renders in Bangla with Latin digits only and no shame words", () => {
    localStorage.setItem("tm:ui:lang", "bn");
    store.demo.put(rec("risk-x", "risk", { "risk.text": v("ঝুঁকি") }));
    store.demo.put(rec("role-x", "team_role", { "team_role.role": v("হিসাব"), "team_role.holder": { state: "unknown" } }));
    for (const route of ["#/journey/risks", "#/diary/ventures", "#/diary/team", "#/journey/history", "#/journey/northstar"]) {
      go(route);
      const text = $("main")?.textContent ?? "";
      expect(text.length, route).toBeGreaterThan(20);
      expect(text, route).not.toMatch(/[০-৯]/);
    }
  });

  it("the journey and diary hubs link to the new screens", () => {
    go("#/journey");
    for (const href of ["#/journey/risks", "#/journey/history", "#/journey/northstar"]) expect($(`a[href="${href}"]`), href).not.toBeNull();
    go("#/diary");
    for (const href of ["#/diary/ventures", "#/diary/team"]) expect($(`a[href="${href}"]`), href).not.toBeNull();
  });
});

// Q-11 goal worksheet fields (obstacle, if-then backup, first action / when, resources) and the plan table view (batch 2).
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { render } from "../src/app";
import { store } from "../src/ui/state";
import { PACKS } from "../src/i18n/packs";
import { fieldById } from "../src/catalog/fields";
import { planTable, WORKSHEET_FIELDS, RESOURCES_FIELD } from "../src/core/goalWorksheet";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" } as FieldValue);
const rec = (id: string, entity: string, vals: Record<string, unknown>, links?: Record<string, string>): TMRecord => ({ id, entity, ns: "demo", ownerId: "demo-user", schemaVersion: 2, createdAt: "2026-11-01T00:00:00.000Z", values: Object.fromEntries(Object.entries(vals).map(([k, x]) => [k, v(x)])), ...(links ? { links } : {}) } as TMRecord);
const app = () => document.getElementById("app")!;
const go = (h: string) => { location.hash = h; render(); };
const setup = (lang: string) => { localStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", lang); localStorage.setItem("tm:ui:dataMode", "demo"); };
const inp = (f: string) => document.getElementById(`q2-${f.replace(/[^a-z0-9]+/g, "-")}`) as HTMLInputElement;
const goal = rec("a", "goal", { "goal.title": "Open a shop", "goal.success": "Shop open", "goal.target_date": "2027-03-01", "goal.resources": "3 hours a week" });
const steps = [rec("t1", "task", { "task.title": "Find a place", "task.goals": ["a"] }, { goal: "a" }), rec("t2", "task", { "task.title": "Buy shelves", "task.goals": ["a"] }, { goal: "a" }),
  rec("t3", "task", { "task.title": "Done one", "task.goals": ["a"], "task.done_on": "2026-11-02" }, { goal: "a" })];

describe("Q-11 data", () => {
  it("worksheet fields exist in the catalog as optional goal text", () => {
    for (const f of [...WORKSHEET_FIELDS, RESOURCES_FIELD]) { const d = fieldById(f)!; expect(d.entity).toBe("goal"); expect(d.type).toBe("text"); expect(d.importance).toBe("optional"); expect(d.requirement).not.toBe("required"); }
  });
  it("planTable: five fixed rows from the goal's own data; open steps only; blank = null (not 0)", () => {
    const rows = planTable(goal, [goal, ...steps]);
    expect(rows.map((r) => r.key)).toEqual(["objective", "steps", "success", "time", "resources"]);
    expect(rows[0]!.value).toBe("Open a shop"); expect(rows[1]!.list).toEqual(["Find a place", "Buy shelves"]); expect(rows[1]!.value).toBe("2");
    expect(rows[3]!.value).toBe("2027-03-01"); expect(rows[4]!.value).toBe("3 hours a week");
    const bare = planTable(rec("b", "goal", { "goal.title": "X" }), []);
    expect(bare.map((r) => r.value)).toEqual(["X", null, null, null, null]);
  });
});

describe("Q-11 goal page worksheet", () => {
  it("saves obstacle, if-then backup, first action and when, then resources; blank ones are not written", () => {
    setup("en"); store.demo.put(rec("a", "goal", { "goal.title": "Shop" })); go("#/journey/goal/a");
    expect(app().querySelectorAll("form[data-form=worksheet] input").length).toBe(5);
    inp("goal.obstacle").value = "Tired in the evening"; inp("goal.backup").value = "If tired, then 5 minutes"; inp("goal.first_action").value = "Call a supplier"; inp("goal.first_when").value = "Tomorrow 9 am";
    (app().querySelector("form[data-form=worksheet]") as HTMLFormElement).dispatchEvent(new Event("submit", { cancelable: true }));
    const g = store.demo.get("a")!;
    expect(g.values["goal.obstacle"]).toMatchObject({ value: "Tired in the evening", label: "DEMO" }); expect(g.values["goal.backup"]).toMatchObject({ value: "If tired, then 5 minutes" });
    expect(g.values["goal.first_action"]).toMatchObject({ value: "Call a supplier" }); expect(g.values["goal.first_when"]).toMatchObject({ value: "Tomorrow 9 am" });
    expect(g.values["goal.resources"]).toBeUndefined();
  });
  it("the Start card's Begin button points at the worksheet card that exists", () => {
    setup("en"); store.demo.put(rec("a", "goal", { "goal.title": "Shop" })); go("#/journey/goal/a");
    expect(app().querySelector("[data-start=begin]")).not.toBeNull(); expect(document.getElementById("worksheet-card")).not.toBeNull();
  });
  it("the goal page links to the table view", () => {
    setup("en"); store.demo.put(goal); go("#/journey/goal/a");
    expect((app().querySelector("[data-act=plan-table]") as HTMLAnchorElement).getAttribute("href")).toBe("#/journey/goal/a/table");
  });
});

describe("Q-11 table view", () => {
  for (const lang of ["en", "bn", "mix"] as const) {
    it(`shows the five rows with the goal's own words and Not set for empty rows (${lang})`, () => {
      setup(lang); store.demo.put(rec("a", "goal", { "goal.title": "Open a shop", "goal.success": "Shop open" })); for (const s of steps) store.demo.put(s); go("#/journey/goal/a/table");
      const t = app().querySelector("[data-plan-table=a] table")!; expect(t).not.toBeNull();
      expect(t.querySelectorAll("tr").length).toBe(5);
      expect(t.querySelector("[data-row=objective] td")!.textContent).toBe("Open a shop"); expect(t.querySelector("[data-row=success] td")!.textContent).toBe("Shop open");
      expect(t.querySelectorAll("[data-row=steps] li").length).toBe(2);
      expect(t.querySelector("[data-row=time]")!.hasAttribute("data-unset")).toBe(true);
      expect(t.querySelector("[data-row=time] td")!.textContent).toBe(PACKS[lang]["q2.tbl.notset"]); expect(t.querySelector("[data-row=resources] td")!.textContent).toBe(PACKS[lang]["q2.tbl.notset"]);
      expect(t.querySelector("[data-row=time] th")!.textContent).toBe(PACKS[lang]["q2.tbl.time"]);
      expect(t.textContent).not.toMatch(/\b0\b/); expect(app().textContent).not.toMatch(/DEMO/);
    });
  }
  it("a filled goal has no 'fill the empty rows' hint, and a missing goal says so calmly", () => {
    setup("en"); store.demo.put(goal); go("#/journey/goal/a/table"); expect(app().querySelectorAll("[data-unset]").length).toBe(1); // steps row only
    go("#/journey/goal/nope/table"); expect(app().querySelector("[data-goal-missing]")!.textContent).toBe(PACKS.en["q2.tbl.missing"]);
    expect((app().querySelector("a.crumb") as HTMLAnchorElement).getAttribute("href")).toBe("#/journey/goals");
  });
  it("the back link returns to the same goal", () => {
    setup("en"); store.demo.put(goal); go("#/journey/goal/a/table");
    expect((app().querySelector("a.crumb") as HTMLAnchorElement).getAttribute("href")).toBe("#/journey/goal/a");
  });
});

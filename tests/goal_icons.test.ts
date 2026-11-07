// Q-09: four level icons (mission, goal, project, task) beside level names; priority chips and a Today tag on goal-page step rows.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { store } from "../src/ui/state";
import { LEVEL_ICONS, levelIcon } from "../src/ui/svg";
import { PACKS } from "../src/i18n/packs";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" } as FieldValue);
const rec = (id: string, entity: string, vals: Record<string, unknown>, links?: Record<string, string>): TMRecord => ({ id, entity, ns: "demo", ownerId: "demo-user", schemaVersion: 2, createdAt: "2026-11-01T00:00:00.000Z", values: Object.fromEntries(Object.entries(vals).map(([k, x]) => [k, v(x)])), ...(links ? { links } : {}) } as TMRecord);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const app = () => document.getElementById("app")!;
const go = (lang: string, h: string) => { localStorage.setItem("tm:ui:lang", lang); location.hash = h; render(); };
beforeEach(() => { localStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:dataMode", "demo"); });

describe("Q-09 level icons", () => {
  it("four distinct decorative SVGs", () => {
    expect(LEVEL_ICONS).toEqual(["mission", "goal", "project", "task"]);
    const seen = new Set<string>();
    for (const l of LEVEL_ICONS) { const s = levelIcon(l); expect(s.getAttribute("aria-hidden")).toBe("true"); expect(s.getAttribute("data-level-icon")).toBe(l); expect(s.querySelectorAll("path,circle,ellipse").length).toBeGreaterThan(0); seen.add(s.innerHTML); }
    expect(seen.size).toBe(4);
  });
  for (const lang of ["en", "bn", "mix"] as const) {
    it(`icons sit beside the level names on the goal page, the parts list and the goals list; the name text stays (${lang})`, () => {
      store.demo.put(rec("g", "goal", { "goal.title": "Shop" })); store.demo.put(rec("p", "goal", { "goal.title": "Site", "goal.kind": "project" }, { parent: "g" }));
      go(lang, "#/journey/goal/g");
      const header = app().querySelector("[data-goal-context] .lvl-tag")!; expect(header.getAttribute("data-level")).toBe("goal"); expect(header.textContent).toBe(PACKS[lang]["gt.kind.goal"]);
      const part = app().querySelector("[data-part=p] .lvl-tag")!; expect(part.getAttribute("data-level")).toBe("project"); expect(part.textContent).toBe(PACKS[lang]["gt.kind.project"]);
      expect(app().querySelector("[data-goal-steps] h2 [data-level-icon=task]")).not.toBeNull();
      expect(app().querySelector("details[data-card=show_why] summary [data-level-icon=mission]")).not.toBeNull();
      go(lang, "#/journey/goals"); expect(app().querySelector(".lvl-tag[data-level=goal]")).not.toBeNull();
      for (const s of app().querySelectorAll("svg[data-level-icon]")) expect(s.getAttribute("aria-hidden")).toBe("true");
    });
  }
});

describe("Q-09 priority chips on step rows", () => {
  const today = iso(new Date());
  it("shows the user's own priority as a tag; none when unknown; Today tag only when planned for today and not done", () => {
    store.demo.put(rec("g", "goal", { "goal.title": "Shop" }));
    store.demo.put(rec("t1", "task", { "task.title": "First one", "task.priority": "high", "task.plan_by": today }, { goal: "g" }));
    store.demo.put(rec("t2", "task", { "task.title": "Normal one", "task.priority": "normal", "task.plan_by": "2020-01-01" }, { goal: "g" }));
    store.demo.put(rec("t3", "task", { "task.title": "Unknown prio" }, { goal: "g" }));
    store.demo.put(rec("t4", "task", { "task.title": "Done today", "task.priority": "low", "task.plan_by": today, "task.done_on": today }, { goal: "g" }));
    store.demo.put({ ...rec("t5", "task", { "task.title": "Bad prio" }, { goal: "g" }), values: { "task.title": v("Bad prio"), "task.priority": { state: "unknown" } as FieldValue } });
    go("en", "#/journey/goal/g");
    const row = (id: string) => app().querySelector(`[data-step=${id}]`)!;
    expect(row("t1").querySelector("[data-priority=high]")!.textContent).toBe("First"); expect(row("t1").querySelector("[data-planned-today]")!.textContent).toBe("Today");
    expect(row("t2").querySelector("[data-priority=normal]")!.textContent).toBe("Normal"); expect(row("t2").querySelector("[data-planned-today]")).toBeNull();
    expect(row("t3").querySelector("[data-priority]")).toBeNull(); expect(row("t3").querySelector("[data-planned-today]")).toBeNull();
    expect(row("t4").querySelector("[data-priority=low]")!.textContent).toBe("Can wait"); expect(row("t4").querySelector("[data-planned-today]")).toBeNull();
    expect(row("t5").querySelector("[data-priority]")).toBeNull(); // unknown is not shown as a priority
    expect(row("t1").textContent).not.toMatch(/\b(urgent|overdue|late|behind|failed)\b/i);
  });
  for (const lang of ["bn", "mix"] as const) {
    it(`Bangla and Mix show the tag in Bangla (${lang})`, () => {
      store.demo.put(rec("g", "goal", { "goal.title": "Shop" })); store.demo.put(rec("t1", "task", { "task.title": "x", "task.priority": "high", "task.plan_by": today }, { goal: "g" }));
      go(lang, "#/journey/goal/g"); const r = app().querySelector("[data-step=t1]")!;
      expect(r.querySelector("[data-priority]")!.textContent).toMatch(/[ঀ-৿]/); expect(r.querySelector("[data-planned-today]")!.textContent).toBe(PACKS[lang]["qb1.tag.today"]);
    });
  }
});

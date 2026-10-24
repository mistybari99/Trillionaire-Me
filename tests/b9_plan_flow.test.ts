// R6 (ROADMAP B9): plan flow diagram. Renders from the user's own plan data; a missing value is "unknown", never 0.
import { beforeEach, describe, expect, it } from "vitest";
import { PACKS } from "../src/i18n/packs";
import { planFlowData } from "../src/core/planFlow";
import { render } from "../src/app";
import { store } from "../src/ui/state";
import type { FieldValue, TMRecord, RecordValues } from "../src/core/types";

const en = PACKS.en as Record<string, string>, bn = PACKS.bn as Record<string, string>, mix = PACKS.mix as Record<string, string>;
const FLOW_KEYS = Object.keys(en).filter((k) => k.startsWith("plan.flow."));
// Same judgement-word guard as the R5 calm copy: no shame, score, rank, streak, grade or failure words.
const BANNED_EN = /\b(fail\w*|wrong|lazy|shame\w*|should|score\w*|rank\w*|streak\w*|grade\w*|behind|missed|lost|bad|error|mistake\w*|warning|overdue|late)\b/i;
const BANNED_BN = /(ব্যর্থ|ফেল|লজ্জা|ভুল|স্কোর|স্ট্রিক|গ্রেড|র‍্যাঙ্ক|খারাপ|পিছিয়ে|সতর্ক)/u;
const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" });
const rec = (id: string, entity: string, values: Record<string, FieldValue>): TMRecord => ({ id, entity, ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-10-24T00:00:00Z", values });

describe("TM-TST-021 B9 plan flow: pure data (unknown is not 0)", () => {
  it("nothing entered: every value is null", () => {
    const d = planFlowData([], {} as RecordValues, "need_hours", new Set(), 0, 10);
    expect(d).toEqual({ hours: null, tools: null, skills: null, research: null, plan: null, goal: null });
  });
  it("a real 0 free hours stays 0; it is not turned into unknown", () => {
    const d = planFlowData([], { "constraint.weekly_free_hours": v(0) } as RecordValues, "need_window", new Set(), 1, 10);
    expect(d.hours).toBe(0);
    expect(d.research).toEqual({ answered: 1, total: 10 });
  });
  it("plan is unknown until capacity is known and there is an open task", () => {
    const tasks = [rec("task-1", "task", { "task.title": v("a"), "task.minutes": v(20) })];
    expect(planFlowData(tasks, {} as RecordValues, "ok", new Set(["task-1"]), 0, 10).plan).toEqual({ placed: 1, tasks: 1 });
    expect(planFlowData(tasks, {} as RecordValues, "need_window", new Set(), 0, 10).plan).toBeNull();
    expect(planFlowData([], {} as RecordValues, "ok", new Set(), 0, 10).plan).toBeNull();
  });
  it("done tasks are not counted; tools and skills count only real entries; goal needs a title", () => {
    const recs = [
      rec("task-1", "task", { "task.title": v("a"), "task.done_on": v("2026-10-20") }),
      rec("res-1", "resource", { "resource.kind": v("tools") }),
      rec("res-2", "resource", { "resource.kind": v("money") }),
      rec("skill-1", "skill", { "skill.name": v("Bookkeeping") }),
      rec("skill-2", "skill", { "skill.name": v("   ") }),
      rec("goal-1", "goal", { "goal.title": v("  Save 1000  ") }),
    ];
    const d = planFlowData(recs, {} as RecordValues, "ok", new Set(), 0, 10);
    expect(d.tools).toBe(1);
    expect(d.skills).toBe(1);
    expect(d.plan).toBeNull();
    expect(d.goal).toBe("Save 1000");
  });
});

describe("B9 plan flow screen", () => {
  beforeEach(() => { localStorage.clear(); store.demo.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); });
  const go = (h: string) => { location.hash = h; render(); };
  const node = (id: string) => document.querySelector(`svg[data-flow] [data-flow-node='${id}']`)!;

  it("renders with empty data: inputs, research, plan and goal show unknown; the AI step is later and disabled", () => {
    go("#/diary/plan");
    const svg = document.querySelector("svg[data-flow]");
    expect(svg).not.toBeNull();
    for (const id of ["time", "tools", "skills", "research", "plan", "goal"]) {
      expect(node(id).getAttribute("data-state"), id).toBe("unknown");
      expect(node(id).textContent, id).toContain("unknown");
    }
    expect(node("ai").getAttribute("data-state")).toBe("later");
    expect(node("ai").getAttribute("aria-disabled")).toBe("true");
    expect(node("ai").textContent).toContain("later");
    expect(svg!.querySelectorAll("text.fl-unk").length).toBe(6);
    expect(svg!.getAttribute("aria-label")).toContain("unknown");
    expect(svg!.textContent).not.toMatch(/\b0\b/); // no invented zeros
  });

  it("renders with data: values come from the user's own records", () => {
    store.demo.put(rec("intake-constraint", "constraint", { "constraint.weekly_free_hours": v(6), "constraint.free_from": v("20:00"), "constraint.free_to": v("22:00") }));
    store.demo.put(rec("res-1", "resource", { "resource.kind": v("tools") }));
    store.demo.put(rec("skill-1", "skill", { "skill.name": v("Bookkeeping") }));
    store.demo.put(rec("goal-1", "goal", { "goal.title": v("Save for a bike") }));
    store.demo.put(rec("task-1", "task", { "task.title": v("Call supplier"), "task.minutes": v(20) }));
    go("#/diary/plan");
    expect(node("time").textContent).toContain("6 hours a week");
    expect(node("time").getAttribute("data-state")).toBe("value");
    expect(node("tools").textContent).toContain("1 listed");
    expect(node("skills").textContent).toContain("1 listed");
    expect(node("research").textContent).toMatch(/\d+ of \d+ answered/);
    expect(node("plan").textContent).toContain("1 of 1 placed");
    expect(node("goal").textContent).toContain("Save for a bike");
    expect(document.querySelector("svg[data-flow]")!.querySelectorAll("text.fl-unk").length).toBe(0);
  });

  it("long goal titles are shortened so they fit the box", () => {
    store.demo.put(rec("goal-1", "goal", { "goal.title": v("A very long goal title that keeps going and going past the box width") }));
    go("#/diary/plan");
    const txt = node("goal").textContent ?? "";
    expect(txt.length).toBeLessThan(40);
    expect(txt.endsWith("…")).toBe(true);
  });

  it("Bangla: unknown and labels come from the bn pack; no red or animation in the SVG", () => {
    localStorage.setItem("tm:ui:lang", "bn");
    go("#/diary/plan");
    const svg = document.querySelector("svg[data-flow]")!;
    expect(svg.textContent).toContain("অজানা");
    expect(svg.textContent).toContain("AI ধাপ");
    expect(svg.querySelectorAll("animate, animateTransform, animateMotion, set").length).toBe(0);
    expect(svg.innerHTML).not.toMatch(/danger|#[aA]{1}1|red/i);
  });

  it("the flow card carries no judging words in what it shows", () => {
    go("#/diary/plan");
    const card = document.querySelector("[data-flow-card]")!;
    expect(card.textContent).not.toMatch(BANNED_EN);
  });
});

describe("B9 copy guard and bilingual parity", () => {
  it("there are flow keys to guard", () => { expect(FLOW_KEYS.length).toBeGreaterThanOrEqual(15); });
  it("no judging, score, streak or grade words in English or Bangla", () => {
    for (const k of FLOW_KEYS) {
      expect(en[k], k).not.toMatch(BANNED_EN);
      expect(bn[k], k).not.toMatch(BANNED_BN);
    }
  });
  it("every flow key has a non-empty English and Bangla value; Mix follows the same keys", () => {
    for (const k of FLOW_KEYS) {
      expect(en[k]!.trim(), k).not.toBe("");
      expect(bn[k]!.trim(), k).not.toBe("");
      expect(mix[k], k).toBeDefined();
    }
  });
  it("placeholders match between English and Bangla", () => {
    for (const k of FLOW_KEYS) {
      const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
      expect(ph(bn[k]!), k).toBe(ph(en[k]!));
    }
  });
});

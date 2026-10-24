import { beforeEach, describe, expect, it } from "vitest";
import { TIPS, TOPICS, labels, relatedTips, tipsOf } from "../src/library/topics";
import { MAX_STARS, MILESTONES, gardenLayers, messageIndex, milestoneAt, stars, tier } from "../src/core/reward";
import { tasksFrom } from "../src/core/planInputs";
import { render } from "../src/app";
import { store } from "../src/ui/state";
import { LOCALES } from "../src/i18n/registry";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" });
const task = (id: string, extra: Record<string, FieldValue> = {}): TMRecord => ({ id, entity: "task", ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-10-24T00:00:00Z", values: { "task.title": v(id), "task.minutes": v(20), ...extra } });

describe("topic library", () => {
  it("all 21 topics exist, every topic has ≥2 tips (nothing dropped), bilingual", () => {
    expect(TOPICS.length).toBe(21);
    for (const tp of TOPICS) { expect(tipsOf(tp.id).length, tp.id).toBeGreaterThanOrEqual(2); expect(LOCALES.bn.scripts.test(tp.name.bn)).toBe(true); }
  });
  it("each tip has a visual with 2–4 labels in both languages, and the counts match", () => {
    for (const tp of TIPS) {
      const bn = labels(tp.diagram, "bn"), en = labels(tp.diagram, "en");
      expect(bn.length, tp.id).toBe(en.length); expect(bn.length).toBeGreaterThanOrEqual(2); expect(bn.length).toBeLessThanOrEqual(4);
      if (tp.diagram.type === "matrix") expect(bn.length).toBe(4);
      expect(tp.how.bn.length).toBeLessThan(260); expect(LOCALES.bn.scripts.test(tp.how.bn)).toBe(true);
    }
    expect(new Set(TIPS.map((t) => t.id)).size).toBe(TIPS.length);
  });
  it("tags connect topics: a tip is reachable from other topics without being copied", () => {
    const rel = relatedTips("procrastination"); expect(rel.length).toBeGreaterThan(0);
    for (const r of rel) expect(r.topic).not.toBe("procrastination");
    expect(TIPS.filter((t) => t.tags.length === 0)).toEqual([]);
  });
});

describe("reward picture core", () => {
  it("stars: stable positions, only ever grows, capped", () => {
    const a = stars(5), b = stars(8); expect(b.slice(0, 5)).toEqual(a); expect(stars(0)).toEqual([]); expect(stars(10_000).length).toBe(MAX_STARS);
    for (const s of stars(60)) { expect(s.x).toBeGreaterThanOrEqual(0); expect(s.x).toBeLessThanOrEqual(300); expect(s.y).toBeLessThanOrEqual(60); expect(s.y).toBeGreaterThanOrEqual(8); }
  });
  it("garden layers follow passed stages, monotonic, max 8; tier follows milestones", () => {
    let prev = -1; for (let k = 0; k <= 10; k++) { const g = gardenLayers(k); expect(g).toBeGreaterThanOrEqual(prev); prev = g; }
    expect(gardenLayers(99)).toBe(8); expect(gardenLayers(-3)).toBe(0);
    expect(tier(0)).toBe(0); expect(tier(1)).toBe(1); expect(tier(100)).toBe(MILESTONES.length);
    expect(milestoneAt(5)).toBe(5); expect(milestoneAt(6)).toBeNull();
  });
  it("messages rotate, never out of range", () => { for (let n = 0; n < 50; n++) { const i = messageIndex(n, 6); expect(i).toBeGreaterThanOrEqual(0); expect(i).toBeLessThan(6); } });
  it("finished tasks leave the schedule input", () => { expect(tasksFrom([task("a"), task("b", { "task.done_on": v("2026-10-24") })]).map((t) => t.id)).toEqual(["a"]); });
});

describe("rewards + topics in the app", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); store.demo.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); });
  const go = (h: string) => { location.hash = h; render(); };
  const setup = () => { store.demo.put({ id: "intake-c", entity: "constraint", ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-10-24T00:00:00Z", values: { "constraint.weekly_free_hours": v(40), "constraint.free_from": v("06:00"), "constraint.free_to": v("22:00") } }); };
  it("empty start: picture shows no stars and invites the first task", () => {
    go("#/reward"); expect(document.querySelector("svg")!.getAttribute("data-stars")).toBe("0"); expect(document.querySelector("[data-reward-text]")!.textContent).toMatch(/first star/);
  });
  it("tapping Done adds a star, shows a milestone for the first one, and removes the task from the plan", () => {
    setup(); store.demo.put(task("task-1")); go("#/diary/plan");
    (document.querySelector("[data-act=task-done]") as HTMLButtonElement).click(); render();
    expect(location.hash).toBe("#/reward");
    expect(store.demo.get("task-1")!.values["task.done_on"]?.state).toBe("value");
    expect(document.querySelector("svg")!.getAttribute("data-stars")).toBe("1");
    expect(document.querySelector("[data-milestone='1']")).not.toBeNull();
    go("#/diary/plan"); expect(document.querySelectorAll("[data-placement]").length).toBe(0); // no longer scheduled
  });
  it("a second finished task adds a second star without a milestone; picture text equivalent exists", () => {
    setup(); store.demo.put(task("task-1", { "task.done_on": v("2026-10-23") })); store.demo.put(task("task-2")); go("#/diary/plan");
    (document.querySelector("[data-task-id='task-2']") as HTMLButtonElement).click(); render();
    expect(document.querySelector("svg")!.getAttribute("data-stars")).toBe("2"); expect(document.querySelector("[data-milestone]")).toBeNull();
    expect(document.querySelector("svg")!.getAttribute("aria-label")).toMatch(/2 stars/);
  });
  it("the picture never shows points, ranks or comparisons", () => {
    setup(); store.demo.put(task("task-1", { "task.done_on": v("2026-10-23") })); go("#/journey/art");
    expect(document.body.textContent!.toLowerCase()).not.toMatch(/points|rank|leaderboard|score|streak|beat|behind/);
  });
  it("drawer lists all 21 topics and a topic page shows tips with visuals; emotions shows the safety note", () => {
    go("#/today"); expect(document.querySelectorAll("#drawer a[data-topic]").length).toBe(21);
    go("#/topic/emotions"); expect(document.querySelector("[data-safety=mental_health]")).not.toBeNull();
    expect(document.querySelectorAll("[data-tip]").length).toBeGreaterThanOrEqual(2); expect(document.querySelector("[data-diagram]")).not.toBeNull();
    go("#/topic/deen"); expect(document.querySelector("[data-safety=worship]")!.textContent).toMatch(/scholar/);
  });
});

describe("TM-TST-151 sensitive topics carry a safety note", () => {
  it("sensitive topics carry a safety note; app links point to real routes", () => {
    for (const id of ["emotions", "health", "money", "deen"]) expect(TOPICS.find((t) => t.id === id)!.sensitive, id).toBeTruthy();
    for (const l of [...TOPICS.map((t) => t.appLink), ...TIPS.map((t) => t.appLink)].filter(Boolean)) expect(l).toMatch(/^#\//);
  });
});

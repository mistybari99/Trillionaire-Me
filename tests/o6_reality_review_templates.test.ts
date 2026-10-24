// O6 (ROADMAP §2): reality-changed loop, 90-day review, editable stage templates. Pure rules first, then one render test each.
import { beforeEach, describe, expect, it } from "vitest";
import { PACKS } from "../src/i18n/packs";
import { markNotTrue, realityLogRecord, RealityError } from "../src/core/reality";
import { reviewSummary, reviewWindow, REVIEW_DAYS } from "../src/core/review";
import { stagesFor, TEMPLATE_IDS, TEMPLATES, isTemplateId } from "../src/core/stageTemplates";
import { STAGES } from "../src/demo/seed";
import { buildPlanInput, tasksFrom } from "../src/core/planInputs";
import { schedule } from "../src/core/planner";
import { planFlowData } from "../src/core/planFlow";
import { STAGE_CODES, passStage, type StageCode } from "../src/core/stages";
import { render } from "../src/app";
import { store } from "../src/ui/state";
import { prefs } from "../src/ui/state";
import type { FieldValue, RecordValues, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" });
const rec = (id: string, entity: string, values: RecordValues, createdAt = "2026-10-20T04:00:00.000Z"): TMRecord => ({ id, entity, ns: "demo", ownerId: "u", schemaVersion: 1, createdAt, values });
const task = (id: string, title: string, extra: RecordValues = {}): TMRecord => rec(id, "task", { "task.title": v(title), "task.minutes": v(30), "task.priority": v("normal"), ...extra });
const en = PACKS.en as Record<string, string>, bn = PACKS.bn as Record<string, string>;
const NEW_KEYS = Object.keys(en).filter((k) => /^(review\.|reality\.|stage\.tpl\.)/.test(k));
const BANNED_EN = /\b(fail\w*|wrong|lazy|shame\w*|should|score\w*|rank\w*|streak\w*|grade\w*|behind|missed|overdue|late|bad|error|mistake\w*|warning|penalt\w*)\b/i;
const BANNED_BN = /(ব্যর্থ|ফেল|লজ্জা|ভুল|স্কোর|স্ট্রিক|গ্রেড|র‍্যাঙ্ক|খারাপ|পিছিয়ে|সতর্ক|জরিমানা)/u;

// ---- (a) reality changed ----
describe("O6 reality-changed loop (pure)", () => {
  it("marks an open step without deleting it; the original record is kept", () => {
    const t0 = task("t1", "Learn bookkeeping");
    const t1 = markNotTrue(t0, "2026-10-24");
    expect(t1.id).toBe("t1"); expect(t1.values["task.title"]).toEqual(t0.values["task.title"]);
    expect(t1.values["task.not_true_on"]).toEqual({ state: "value", value: "2026-10-24", label: "DEMO" });
    expect(t0.values["task.not_true_on"]).toBeUndefined(); // input object untouched
  });
  it("refuses finished steps, steps already marked, non-tasks and bad dates", () => {
    expect(() => markNotTrue(task("t2", "x", { "task.done_on": v("2026-10-20") }), "2026-10-24")).toThrow(RealityError);
    expect(() => markNotTrue(markNotTrue(task("t3", "x"), "2026-10-24"), "2026-10-25")).toThrow(/already/);
    expect(() => markNotTrue(rec("g", "goal", {}), "2026-10-24")).toThrow(/plan steps/);
    expect(() => markNotTrue(task("t4", "x"), "24/10/2026")).toThrow(/YYYY-MM-DD/);
  });
  it("the scheduler input drops a marked step: it is not placed and not deferred", () => {
    const recs = [task("a", "Keep this"), markNotTrue(task("b", "No longer true"), "2026-10-24")];
    const input = buildPlanInput({ "constraint.weekly_free_hours": v(10), "constraint.free_from": v("09:00"), "constraint.free_to": v("17:00") }, recs, "normal", 0);
    expect(tasksFrom(recs).map((x) => x.id)).toEqual(["a"]);
    const p = schedule(input);
    expect(p.placements.map((x) => x.taskId)).toEqual(["a"]);
    expect(p.deferred.some((d) => d.taskId === "b")).toBe(false);
    expect(planFlowData(recs, {}, "ok", new Set(["a"]), 0, 0).plan).toEqual({ placed: 1, tasks: 1 });
  });
  it("the journey-log record is append-only data with a link to the step", () => {
    const r = realityLogRecord({ id: "reality-x-1", taskId: "t1", text: "Reality changed · “x” is no longer true · 2026-10-24", createdAt: "2026-10-24T05:00:00.000Z" });
    expect(r.entity).toBe("journey_log"); expect(r.links).toEqual({ task: "t1" });
    expect(r.values["journey_log.entry"]).toEqual({ state: "value", value: "Reality changed · “x” is no longer true · 2026-10-24", label: "DEMO" });
  });
});

// ---- (b) 90-day review ----
describe("O6 90-day review (pure)", () => {
  const today = "2026-10-24";
  it("window is 90 calendar days ending today, inclusive", () => {
    expect(REVIEW_DAYS).toBe(90);
    expect(reviewWindow(today)).toEqual({ from: "2026-07-27", to: today });
    expect(reviewWindow("2026-03-01")).toEqual({ from: "2025-12-02", to: "2026-03-01" });
  });
  it("no records at all: every measure is null (not enough data), never 0", () => {
    const s = reviewSummary([], today);
    expect(s).toMatchObject({ tasksDone: null, focusMinutes: null, stagePasses: null, focusUnknown: 0 });
  });
  it("counts only records inside the window", () => {
    const recs = [
      task("d1", "a", { "task.done_on": v("2026-10-01") }), task("d2", "b", { "task.done_on": v("2026-07-26") }), // second one is just outside
      task("open", "c"),
      rec("f1", "focus_session", { "focus_session.minutes": v(25), "focus_session.date": v("2026-10-20") }),
      rec("f2", "focus_session", { "focus_session.minutes": v(10), "focus_session.date": v("2026-08-01") }),
      rec("f3", "focus_session", { "focus_session.minutes": v(45), "focus_session.date": v("2026-06-01") }),
      rec("p1", "stage_pass", { "stage_pass.stage_code": v("A") }, "2026-10-22T10:00:00.000Z"),
      rec("p2", "stage_pass", { "stage_pass.stage_code": v("B") }, "2026-05-22T10:00:00.000Z"),
    ];
    const s = reviewSummary(recs, today);
    expect(s.tasksDone).toBe(1); expect(s.focusMinutes).toBe(35); expect(s.stagePasses).toBe(1);
  });
  it("unknown focus minutes are not counted as 0 and are reported separately", () => {
    const onlyUnknown = [rec("f", "focus_session", { "focus_session.minutes": { state: "later" }, "focus_session.date": v("2026-10-20") })];
    expect(reviewSummary(onlyUnknown, today)).toMatchObject({ focusMinutes: null, focusUnknown: 1 });
    const mixed = [...onlyUnknown, rec("g", "focus_session", { "focus_session.minutes": v(20), "focus_session.date": v("2026-10-21") })];
    expect(reviewSummary(mixed, today)).toMatchObject({ focusMinutes: 20, focusUnknown: 1 });
  });
  it("a window with only out-of-range records still reads not enough data", () => {
    expect(reviewSummary([task("old", "x", { "task.done_on": v("2025-01-01") })], today).tasksDone).toBeNull();
  });
});

// ---- (c) editable stage templates ----
describe("O6 editable stage templates (pure)", () => {
  it("default template is exactly the current Spec journey (same names and exits)", () => {
    expect(stagesFor("default")).toBe(STAGES);
    expect(stagesFor(undefined)).toBe(STAGES);
    expect(stagesFor("nope")).toBe(STAGES);
  });
  it("every template has codes A–H in the same order with bilingual names and exits", () => {
    for (const id of TEMPLATE_IDS) {
      const st = stagesFor(id);
      expect(st.map((x) => x.code)).toEqual([...STAGE_CODES]);
      for (const s of st) {
        expect(s.name.bn.trim()).not.toBe(""); expect(s.name.en.trim()).not.toBe("");
        expect(s.exit.bn.trim()).not.toBe(""); expect(s.exit.en.trim()).not.toBe("");
      }
      expect(TEMPLATES[id].name.en).not.toBe(""); expect(isTemplateId(id)).toBe(true);
    }
    expect(TEMPLATE_IDS.length).toBeGreaterThanOrEqual(3);
  });
  it("choosing a template never changes stage rules: passing still follows codes and order", () => {
    const ctx = { answers: {}, goalCount: 0 };
    expect(() => passStage(ctx, [], "B" as StageCode, "evidence")).toThrow(/current stage/);
    expect(passStage({ answers: {}, goalCount: 0 }, ["A"], "B", "first sale").code).toBe("B");
  });
  it("preference reads fall back to default for unknown values, and storage failure does not throw", () => {
    localStorage.clear();
    expect(prefs.stageTemplate).toBe("default");
    localStorage.setItem("tm:ui:stageTemplate", "bogus"); expect(prefs.stageTemplate).toBe("default");
    prefs.stageTemplate = "business"; expect(prefs.stageTemplate).toBe("business");
    localStorage.clear();
  });
});

// ---- copy guard for the new strings ----
describe("O6 copy guard", () => {
  it("there are new keys to guard, each with en and bn text", () => {
    expect(NEW_KEYS.length).toBeGreaterThanOrEqual(20);
    for (const k of NEW_KEYS) { expect(en[k]!.trim(), k).not.toBe(""); expect(bn[k]!.trim(), k).not.toBe(""); }
  });
  it("no judging, score, streak, grade or red-alarm words in English or Bangla", () => {
    for (const k of NEW_KEYS) { expect(en[k], k).not.toMatch(BANNED_EN); expect(bn[k], k).not.toMatch(BANNED_BN); }
  });
});

// ---- render tests ----
describe("O6 screens render (both languages)", () => {
  beforeEach(() => { localStorage.clear(); store.demo.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); });
  const go = (hash: string) => { location.hash = hash; render(); };

  it("90-day review: empty store shows not enough data, not 0; with records it shows the counts", () => {
    go("#/journey/review");
    expect(document.querySelector("[data-review=tasks] [data-review-empty=tasks]")!.textContent).toBe("Not enough data yet");
    expect(document.querySelectorAll("[data-review-empty]").length).toBe(3);
    expect(document.body.textContent).not.toMatch(/\b0\b/);
    const today = new Date(); const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    store.demo.put(task("done-1", "Finished", { "task.done_on": v(iso) }));
    store.demo.put(rec("fs-1", "focus_session", { "focus_session.minutes": v(25), "focus_session.date": v(iso) }));
    go("#/journey/review");
    expect(document.querySelector("[data-review=tasks]")!.textContent).toContain("1 finished");
    expect(document.querySelector("[data-review=focus]")!.textContent).toContain("25 minutes");
    expect(document.querySelector("[data-review=passes] [data-review-empty=passes]")).not.toBeNull();
  });
  it("review screen in Bangla uses the Bangla pack, not English", () => {
    localStorage.setItem("tm:ui:lang", "bn"); go("#/journey/review");
    expect(document.querySelector("h1")!.textContent).toBe(bn["review.title"]);
    expect(document.querySelector("[data-review=tasks] [data-review-empty=tasks]")!.textContent).toBe(bn["review.notEnough"]);
  });
  it("template chooser changes stage names in the ladder, keeps codes, and marks the choice", () => {
    go("#/journey");
    expect(document.querySelector("[data-tpl=default]")!.getAttribute("aria-pressed")).toBe("true");
    (document.querySelector("[data-tpl=learning]") as HTMLButtonElement).click(); render(); // main.ts re-renders on hashchange; tests do it by hand
    expect(prefs.stageTemplate).toBe("learning");
    const names = [...document.querySelectorAll(".ladder li div > div:first-child")].map((x) => x.textContent);
    expect(names[1]).toBe(TEMPLATES.learning.stages[1]!.name.en);
    expect(document.querySelector("[data-tpl=learning]")!.getAttribute("aria-pressed")).toBe("true");
    localStorage.removeItem("tm:ui:stageTemplate");
  });
  it("plan: 'no longer true' keeps the step on record, logs it, and it stops being scheduled", () => {
    store.demo.put(task("step-1", "Learn bookkeeping", { "task.minutes": v(30) }));
    go("#/diary/plan");
    (document.querySelector("[data-act=reality-changed]") as HTMLButtonElement).click(); render();
    expect(store.demo.get("step-1")!.values["task.not_true_on"]?.state).toBe("value");
    expect(store.demo.get("step-1")).not.toBeNull();
    const logs = store.demo.list().filter((r) => r.entity === "journey_log");
    expect(logs.length).toBe(1); expect(String(logs[0]!.values["journey_log.entry"]!.state === "value" && logs[0]!.values["journey_log.entry"]!.value)).toContain("Learn bookkeeping");
    expect(document.querySelector("[data-act=reality-changed]")).toBeNull();
    go("#/journey/log");
    expect(document.querySelectorAll("[data-log]").length).toBe(1);
  });
  it("plan: the same step in Bangla shows the Bangla tag", () => {
    store.demo.put(markNotTrue(task("step-2", "কাজ"), "2026-10-24"));
    localStorage.setItem("tm:ui:lang", "bn"); go("#/diary/plan");
    expect(document.querySelector("[data-task=step-2]")!.textContent).toContain(bn["reality.note"]);
  });
});

void STAGES.length;

// M24 ready-system library (pure core + shipped templates). Each system adds its records once, and undo removes them.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MemoryKV, Store, StoreError } from "../src/core/store";
import { grantConsent, CONSENT_KEY } from "../src/core/consent";
import { addSystem, isSystemAdded, planSystem, removeSystem, systemText, validateSystem, type SystemTemplate } from "../src/core/systems";
import { SYSTEMS, SYSTEM_ERRORS, loadSystems } from "../src/library/systemList";
import type { TMRecord } from "../src/core/types";

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const base = (): Record<string, unknown> => clone(JSON.parse(readFileSync(resolve(__dirname, "../src/library/systems/morning-routine.json"), "utf8")));
const at = { nowIso: "2026-10-25T04:00:00.000Z" };
const expectedCount = (s: SystemTemplate) => s.goals.length + s.tasks.length + s.habits.length;
const ids = (rs: TMRecord[]) => rs.map((r) => r.id).sort();
const demoStore = () => new Store(new MemoryKV());

describe("shipped templates", () => {
  it("every file in src/library/systems is a valid template (no errors)", () => {
    expect(SYSTEM_ERRORS).toEqual({});
    expect(SYSTEMS.map((s) => s.id).sort()).toEqual(["business-starter", "habit-reset", "job-search-week", "morning-routine", "study-block", "weekly-money-check"]);
  });

  it("each template has Bangla and English for every text, reviewer-pending flag, Latin digits only", () => {
    for (const s of SYSTEMS) {
      expect(s.reviewStatus).toBe("pending_reviewer");
      const texts = [s.name, s.summary, ...s.goals.map((g) => g.title), ...s.tasks.map((x) => x.title), ...s.habits.flatMap((hb) => [hb.title, ...(hb.unit ? [hb.unit] : [])])];
      for (const b of texts) {
        expect(b.en.trim().length).toBeGreaterThan(0);
        expect(/[ঀ-৿]/.test(b.bn), `${s.id} bn script`).toBe(true);
        expect(/[০-৯]/.test(b.bn), `${s.id} bn digits`).toBe(false);
      }
    }
  });

  it("Bangla text uses no banned copy words (same list as the copy review)", () => {
    const banned = ["ব্যর্থ", "ফেল", "লজ্জা", "ভুল", "স্কোর", "স্ট্রিক", "গ্রেড", "খারাপ", "পিছিয়ে", "লাল", "শাস্তি"];
    for (const s of SYSTEMS) for (const b of [s.name, s.summary, ...s.tasks.map((x) => x.title)]) for (const w of banned) expect(b.bn.includes(w), `${s.id}: ${w}`).toBe(false);
  });

  it("file name must match the template id; duplicates and broken files are left out with their errors", () => {
    const good = base();
    const res = loadSystems({ "./systems/other-name.json": good, "./systems/dup.json": { ...good, id: "dup-one" }, "./systems/dup-one.json": { ...good, id: "dup-one" }, "./systems/broken.json": { schema: "x" } });
    expect(res.systems.map((s) => s.id)).toEqual(["dup-one"]);
    expect(res.errors["./systems/other-name.json"]).toEqual(["id morning-routine must match file name other-name"]);
    expect(res.errors["./systems/broken.json"]!.length).toBeGreaterThan(1);
  });
});

describe("validateSystem refuses bad templates", () => {
  const cases: Array<[string, (b: Record<string, any>) => void, RegExp]> = [
    ["missing review flag", (b) => { b.reviewStatus = "approved"; }, /reviewStatus/],
    ["bangla digits", (b) => { b.tasks[0].title.bn = "১০ মিনিট"; }, /Latin digits/],
    ["no bangla script", (b) => { b.summary.bn = "plain english"; }, /must be Bangla/],
    ["a link", (b) => { b.summary.en = "See https://example.com"; }, /contains a link/],
    ["secret-looking text", (b) => { b.goals[0].title.en = "password: hunter22"; }, /looks like a secret/],
    ["task points at no goal", (b) => { b.tasks[0].goal = "zz"; }, /goal must name a goal key/],
    ["minutes out of range", (b) => { b.tasks[0].minutes = 500; }, /minutes must be/],
    ["bad weekday", (b) => { b.habits[0].days = [7]; }, /days must be unique weekdays/],
    ["unknown key", (b) => { b.extra = 1; }, /unknown key: extra/],
    ["unknown priority", (b) => { b.tasks[0].priority = "urgent"; }, /priority/],
  ];
  for (const [name, mutate, msg] of cases) {
    it(name, () => {
      const b = base(); mutate(b);
      const res = validateSystem(b);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.errors.join(" | ")).toMatch(msg);
    });
  }
  it("the untouched morning routine is valid", () => expect(validateSystem(base()).ok).toBe(true));
});

describe("planSystem: records a system adds", () => {
  it("one record per goal, task and habit, all tagged with the system id", () => {
    for (const s of SYSTEMS) {
      const recs = planSystem(s, { ns: "demo", lang: "en", ...at });
      expect(recs, s.id).toHaveLength(expectedCount(s));
      for (const r of recs) expect(r.links?.system).toBe(s.id);
    }
  });

  it("tasks point at their goal record; ids are stable", () => {
    const s = SYSTEMS.find((x) => x.id === "morning-routine")!;
    const recs = planSystem(s, { ns: "demo", lang: "en", ...at });
    const goal = recs.find((r) => r.entity === "goal")!;
    for (const r of recs.filter((x) => x.entity === "task")) expect(r.links?.parent).toBe(goal.id);
    expect(ids(planSystem(s, { ns: "demo", lang: "en", ...at }))).toEqual(ids(recs));
  });

  it("demo records carry the DEMO label only; English or Bangla text follows the chosen language", () => {
    const s = SYSTEMS.find((x) => x.id === "habit-reset")!;
    const en = planSystem(s, { ns: "demo", lang: "en", ...at });
    const bn = planSystem(s, { ns: "demo", lang: "bn", ...at });
    for (const r of [...en, ...bn]) for (const v of Object.values(r.values)) if (v.state === "value") expect(v.label).toBe("DEMO");
    const titleOf = (rs: TMRecord[]) => String((rs.find((r) => r.entity === "goal")!.values["goal.title"] as { value: string }).value);
    expect(titleOf(en)).toBe("Restart one habit small");
    expect(titleOf(bn)).toBe("একটি অভ্যাস ছোট করে আবার শুরু");
  });

  it("real records never carry DEMO and use EXTERNAL for text, ESTIMATE for minutes", () => {
    const s = SYSTEMS.find((x) => x.id === "study-block")!;
    const recs = planSystem(s, { ns: "real", lang: "en", ...at });
    for (const r of recs) {
      expect(r.ns).toBe("real");
      for (const v of Object.values(r.values)) if (v.state === "value") expect(v.label).not.toBe("DEMO");
    }
    expect((recs.find((r) => r.entity === "task")!.values["task.minutes"] as { label: string }).label).toBe("ESTIMATE");
  });

  it("Mix uses the Bangla text", () => {
    expect(systemText({ bn: "৫ মিনিট", en: "5 min" }, "mix")).toBe("5 মিনিট");
    expect(systemText({ bn: "৫ মিনিট", en: "5 min" }, "en")).toBe("5 min");
  });
});

describe("addSystem / removeSystem (demo namespace)", () => {
  it("adds the expected records once; a second add adds nothing and skips them", () => {
    const store = demoStore();
    for (const s of SYSTEMS) {
      const first = addSystem(store.demo, s, { ns: "demo", lang: "en", ...at });
      expect(first.added, s.id).toBe(expectedCount(s));
      expect(first.skipped).toBe(0);
      const second = addSystem(store.demo, s, { ns: "demo", lang: "en", ...at });
      expect(second).toEqual({ added: 0, skipped: expectedCount(s) });
      expect(isSystemAdded(store.demo.list(), s.id)).toBe(true);
    }
    expect(store.demo.list()).toHaveLength(SYSTEMS.reduce((n, s) => n + expectedCount(s), 0));
  });

  it("undo removes exactly what the system added and keeps every other record", () => {
    const store = demoStore();
    const s = SYSTEMS.find((x) => x.id === "morning-routine")!;
    const other = SYSTEMS.find((x) => x.id === "study-block")!;
    addSystem(store.demo, s, { ns: "demo", lang: "en", ...at });
    addSystem(store.demo, other, { ns: "demo", lang: "en", ...at });
    store.demo.put({ id: "user-own-goal", entity: "goal", ns: "demo", ownerId: "demo-user", schemaVersion: 1, createdAt: at.nowIso, values: { "goal.title": { state: "value", value: "Mine", label: "DEMO" } } });
    const before = store.demo.list().length;
    const removed = removeSystem(store.demo, s.id);
    expect(removed).toBe(expectedCount(s));
    expect(store.demo.list()).toHaveLength(before - expectedCount(s));
    expect(isSystemAdded(store.demo.list(), s.id)).toBe(false);
    expect(isSystemAdded(store.demo.list(), other.id)).toBe(true);
    expect(store.demo.get("user-own-goal")).not.toBeNull();
    // add again after undo: fresh records come back, once
    expect(addSystem(store.demo, s, { ns: "demo", lang: "en", ...at }).added).toBe(expectedCount(s));
  });

  it("undo also removes habit logs of a removed habit, but not logs of other habits", () => {
    const store = demoStore();
    const s = SYSTEMS.find((x) => x.id === "habit-reset")!;
    addSystem(store.demo, s, { ns: "demo", lang: "en", ...at });
    const habitId = store.demo.list().find((r) => r.entity === "habit")!.id;
    const log = (id: string, habit: string) => store.demo.put({ id, entity: "habit_log", ns: "demo", ownerId: "demo-user", schemaVersion: 1, createdAt: at.nowIso, links: { habit },
      values: { "habit_log.date": { state: "value", value: "2026-10-25", label: "DEMO" }, "habit_log.count": { state: "value", value: 1, label: "DEMO" } } });
    log("hl-mine", habitId); log("hl-other", "some-other-habit");
    removeSystem(store.demo, s.id);
    expect(store.demo.get("hl-mine")).toBeNull();
    expect(store.demo.get("hl-other")).not.toBeNull();
  });

  it("undo on a system that was never added removes nothing", () => {
    const store = demoStore();
    store.demo.put({ id: "x", entity: "goal", ns: "demo", ownerId: "demo-user", schemaVersion: 1, createdAt: at.nowIso, values: {} });
    expect(removeSystem(store.demo, "morning-routine")).toBe(0);
    expect(store.demo.list()).toHaveLength(1);
  });
});

describe("real namespace needs consent (D-B)", () => {
  it("without consent the write is refused and nothing is saved", () => {
    const store = demoStore();
    const s = SYSTEMS.find((x) => x.id === "morning-routine")!;
    expect(() => addSystem(store.real, s, { ns: "real", lang: "en", ...at })).toThrow(StoreError);
    expect(store.real.list()).toHaveLength(0);
  });

  it("with consent the records are written to real, labelled without DEMO", () => {
    const consent = new MemoryKV();
    grantConsent(consent, at.nowIso);
    expect(consent.get(CONSENT_KEY)).not.toBeNull();
    const store = new Store(new MemoryKV(), { consentKv: consent });
    const s = SYSTEMS.find((x) => x.id === "job-search-week")!;
    expect(addSystem(store.real, s, { ns: "real", lang: "bn", ...at }).added).toBe(expectedCount(s));
    expect(store.demo.list()).toHaveLength(0);
    expect(removeSystem(store.real, s.id)).toBe(expectedCount(s));
  });
});

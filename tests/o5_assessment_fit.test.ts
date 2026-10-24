// O5 (ROADMAP §2): assessment scoring + path fit. Pure functions, then one render test each in en and bn.
// Unknown is never 0; ordering is stable; no personality/clinical labels, grades, ranks, streaks or red copy.
import { beforeEach, describe, expect, it } from "vitest";
import { PACKS } from "../src/i18n/packs";
import { assessmentFrom, pathFit, levelsOf, themesOf, MAX_MATCHES, type Assessment } from "../src/core/assessment";
import { PATHS } from "../src/library/paths";
import { render } from "../src/app";
import { store } from "../src/ui/state";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" });
const rec = (id: string, entity: string, values: Record<string, FieldValue>): TMRecord => ({ id, entity, ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-10-24T00:00:00Z", values });
const interest = (id: string, topic: string, energy?: FieldValue) => rec(id, "interest", { "interest.topic": v(topic), ...(energy ? { "interest.energy": energy } : {}) });
const skill = (id: string, name: string, level?: FieldValue) => rec(id, "skill", { "skill.name": v(name), ...(level ? { "skill.level": level } : {}) });
const strength = (id: string, name: string) => rec(id, "strength", { "strength.name": v(name) });
const none: Assessment = { interests: [], skills: [], strengths: [] };

describe("TM-TST-165 O5 assessment scoring: unknown is not 0", () => {
  it("no answers: every dimension is not_enough_data, no score, nothing ready", () => {
    const s = levelsOf(assessmentFrom([]));
    for (const d of ["interests", "skills", "strengths"] as const) {
      expect(s.dimensions[d].status, d).toBe("not_enough_data");
      expect(s.dimensions[d].level, d).toBeNull();
    }
    expect(s.ready).toBe(0);
  });
  it("an interest with no energy answer is scored by name only; the rating stays null", () => {
    const s = levelsOf(assessmentFrom([interest("i1", "ছবি আঁকা", { state: "unknown" })]));
    expect(s.dimensions.interests).toMatchObject({ status: "scored", count: 1, rated: 0, level: null, names: ["ছবি আঁকা"] });
    expect(s.ready).toBe(1);
  });
  it("a real rating of 1 is 20 out of 100, not missing and not 0; ratings average only over given values", () => {
    const s = levelsOf(assessmentFrom([
      interest("i1", "Drawing", v(1)), interest("i2", "Cooking", { state: "later" }), interest("i3", "Music", v(5)),
    ]));
    expect(s.dimensions.interests.rated).toBe(2);
    expect(s.dimensions.interests.level).toBe(60); // mean of 1 and 5 = 3 of 5
    expect(levelsOf(assessmentFrom([interest("i1", "Drawing", v(1))])).dimensions.interests.level).toBe(20);
  });
  it("unnamed or non-value answers are skipped; strengths carry no rating", () => {
    const a = assessmentFrom([rec("s1", "skill", { "skill.name": { state: "unknown" } }), rec("s2", "skill", { "skill.name": v("   ") }), strength("t1", "Patient with people")]);
    expect(a.skills).toEqual([]);
    const s = levelsOf(a);
    expect(s.dimensions.strengths).toMatchObject({ status: "scored", count: 1, level: null });
  });
  it("order comes from record id, not storage order", () => {
    const r1 = [skill("b", "Excel", v(4)), skill("a", "Writing", v(2))];
    const r2 = [...r1].reverse();
    expect(assessmentFrom(r1)).toEqual(assessmentFrom(r2));
    expect(assessmentFrom(r1).skills.map((x) => x.name)).toEqual(["Writing", "Excel"]);
  });
});

describe("TM-TST-165 O5 path fit: theme matching with plain reasons", () => {
  it("no answers: not_enough_data, never a guess", () => {
    expect(pathFit(none)).toEqual({ status: "not_enough_data", matches: [], unmapped: [] });
  });
  it("answers no theme can place: no_match, and the items are listed, not dropped", () => {
    const f = pathFit(assessmentFrom([interest("i1", "zzz qqq")]));
    expect(f.status).toBe("no_match");
    expect(f.matches).toEqual([]);
    expect(f.unmapped).toEqual(["zzz qqq"]);
  });
  it("themes come from Bangla and English keywords", () => {
    expect(themesOf("ছবি আঁকা")).toContain("creative");
    expect(themesOf("Excel and bookkeeping")).toEqual(expect.arrayContaining(["numbers"]));
    expect(themesOf("Bangladesh")).not.toContain("language");
    expect(themesOf("smartphone party")).toEqual([]);
  });
  it("skills count more than interests, interests more than strengths; the reason names the source", () => {
    const f = pathFit(assessmentFrom([skill("s1", "Excel"), interest("i1", "Drawing"), strength("t1", "Easy with people")]));
    expect(f.status).toBe("matched");
    const bookkeeping = f.matches.find((m) => m.path.id === "bookkeeping")!;
    expect(bookkeeping.reasons).toEqual([{ source: "skill", text: "Excel", theme: "numbers" }]);
    expect(bookkeeping.unknownThemes).toEqual(["organising"]);
    expect(bookkeeping.weight).toBe(3);
    expect(f.matches.length).toBeLessThanOrEqual(MAX_MATCHES);
  });
  it("ordering is stable: same answers in any record order give the same matches, ties keep library order", () => {
    const recs = [interest("i1", "Drawing"), interest("i2", "Teaching maths"), skill("s1", "Customer care"), strength("t1", "Planning events")];
    const a = pathFit(assessmentFrom(recs));
    const b = pathFit(assessmentFrom([...recs].reverse()));
    expect(b).toEqual(a);
    const ids = a.matches.map((m) => m.path.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (let i = 1; i < a.matches.length; i++) expect(a.matches[i - 1]!.weight).toBeGreaterThanOrEqual(a.matches[i]!.weight);
  });
  it("every library path is valid: known themes, bilingual text, no empty steps", () => {
    for (const p of PATHS) {
      expect(p.themes.length, p.id).toBeGreaterThan(0);
      for (const b of [p.name, p.summary, p.needs, p.firstTest]) { expect(b.en.trim(), p.id).not.toBe(""); expect(b.bn.trim(), p.id).not.toBe(""); }
    }
    expect(new Set(PATHS.map((p) => p.id)).size).toBe(PATHS.length);
  });
});

// Copy guard: no clinical/personality labels, grades, ranks, streaks or shame words in the new keys.
const keys = (lang: "en" | "bn") => Object.keys(PACKS.en).filter((k) => k.startsWith("assess.") || k.startsWith("fit."));
const BANNED_EN = /\b(fail\w*|wrong|lazy|shame\w*|should|score\w*|rank\w*|streak\w*|grade\w*|behind|missed|lost|bad|error|mistake\w*|warning|overdue|late|introvert\w*|extrovert\w*|personality|anxiety|depress\w*|diagnos\w*|guarantee\w*)\b/i;
const BANNED_BN = /(ব্যর্থ|ফেল|লজ্জা|ভুল|স্কোর|স্ট্রিক|গ্রেড|র‍্যাঙ্ক|খারাপ|পিছিয়ে|সতর্ক|ব্যক্তিত্ব|রোগ)/u;
describe("O5 copy", () => {
  it("new keys exist in both languages and carry no banned words", () => {
    for (const k of keys("en")) {
      expect(PACKS.bn[k as keyof typeof PACKS.bn], k).toBeTruthy();
      expect(BANNED_EN.test(PACKS.en[k as keyof typeof PACKS.en]), k).toBe(false);
      expect(BANNED_BN.test(PACKS.bn[k as keyof typeof PACKS.bn]), k).toBe(false);
    }
    expect(keys("en").length).toBeGreaterThan(20);
  });
});

describe("O5 render on the Plan screen (en and bn)", () => {
  beforeEach(() => { localStorage.clear(); store.demo.clear(); document.body.innerHTML = '<div id="app"></div>'; });
  const go = (h: string) => { location.hash = h; render(); };
  const seed = () => {
    store.demo.put(interest("i1", "Drawing", v(4)));
    store.demo.put(interest("i2", "Teaching maths"));
    store.demo.put(skill("s1", "Excel", v(3)));
    store.demo.put(rec("t-only", "strength", { "strength.name": v("Planning events") }));
  };

  it("en: cards show the user's own items, unknown ratings are said plainly, matches show reasons", () => {
    localStorage.setItem("tm:ui:lang", "en");
    seed();
    go("#/diary/plan");
    const sec = document.querySelector("[data-assessment]")!;
    expect(sec).not.toBeNull();
    expect(sec.querySelector("[data-dim='interests'] [data-rating='given']")?.textContent).toMatch(/Average self-rating 4 out of 5/);
    expect(sec.querySelector("[data-dim='interests']")?.textContent).toMatch(/Drawing, Teaching maths/);
    expect(sec.querySelector("[data-dim='interests']")?.textContent).toMatch(/1 of 2 rated/);
    expect(sec.querySelector("[data-dim='strengths']")?.getAttribute("data-status")).toBe("scored");
    const bookkeeping = sec.querySelector("[data-path='bookkeeping']")!;
    expect(bookkeeping.textContent).toMatch(/From your skill "Excel": links to Numbers & accounts/);
    expect(sec.querySelector("[data-path]")).not.toBeNull();
    expect(sec.querySelector(".err")).toBeNull();
    expect(sec.textContent).toMatch(/not reviewed yet/);
  });

  it("bn: same cards in Bangla; with no answers every card says not enough data and no path is guessed", () => {
    localStorage.setItem("tm:ui:lang", "bn");
    go("#/diary/plan");
    const sec = document.querySelector("[data-assessment]")!;
    for (const d of ["interests", "skills", "strengths"]) expect(sec.querySelector(`[data-dim='${d}']`)?.getAttribute("data-status")).toBe("not_enough_data");
    expect(sec.textContent).toMatch(/এখনো পর্যাপ্ত তথ্য নেই/);
    expect(sec.querySelectorAll("[data-path]").length).toBe(0);
    expect(sec.querySelector("[data-fit='not_enough_data']")).not.toBeNull();
    expect(sec.querySelector(".err")).toBeNull();
  });

  it("bn: with answers, the reason line is Bangla", () => {
    localStorage.setItem("tm:ui:lang", "bn");
    seed();
    go("#/diary/plan");
    expect(document.querySelector("[data-assessment] [data-path='bookkeeping']")!.textContent).toMatch(/আপনার দক্ষতা "Excel" থেকে: হিসাব ও সংখ্যা এর সঙ্গে মেলে/);
  });
});

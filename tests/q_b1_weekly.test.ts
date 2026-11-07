// Q-06 weekly additions: "what got in the way" card (kept in prefs) and the last 7 days of the habit matrix.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { weekHabitMatrix } from "../src/core/weekMatrix";
import { parseQb1, weekStart, WAY_OPTIONS } from "../src/core/qb1Prefs";
import { prefs, store, consentKv } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import { PACKS } from "../src/i18n/packs";
import type { FieldValue, TMRecord } from "../src/core/types";

const NOW = "2026-10-25T00:00:00.000Z";
const mk = (id: string, entity: string, values: Record<string, unknown>, createdAt = NOW, links?: Record<string, string>): TMRecord => {
  const vals: Record<string, FieldValue> = {}; for (const [k, x] of Object.entries(values)) vals[k] = { state: "value", value: x, label: "DEMO" } as FieldValue;
  return { id, entity, ns: "demo", ownerId: "o", schemaVersion: 1, createdAt, values: vals, ...(links ? { links } : {}) } as TMRecord;
};
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const JUDGING = /\b(shame\w*|guilt\w*|fail\w*|grade\w*|rank\w*|streak\w*|score\w*|lazy|overdue|behind|punish\w*|miss(ed)?)\b/i;

describe("Q-06 core: week matrix and prefs", () => {
  it("no habits = null (Unknown), never an empty zero grid", () => { expect(weekHabitMatrix([], "2026-10-31")).toBeNull(); });
  it("7 days; planned+logged = done; planned+not logged = open; not planned = none (never a miss); before the habit existed = none", () => {
    // 2026-10-31 is a Saturday (6). Habit planned Mon/Wed/Sat (1,3,6), created 2026-10-28 (Wednesday).
    const recs = [mk("h1", "habit", { "habit.title": "Read", "habit.days": "1,3,6" }, "2026-10-28T09:00:00.000Z"), mk("l1", "habit_log", { "habit_log.date": "2026-10-31", "habit_log.count": 1 }, NOW, { habit: "h1" })];
    const m = weekHabitMatrix(recs, "2026-10-31")!; expect(m.length).toBe(1);
    expect(m[0]!.days.map((d) => d.date)).toEqual(["2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31"]);
    expect(m[0]!.days.map((d) => d.state)).toEqual(["none", "none", "none", "open", "none", "none", "done"]); // Mon 26 is before the habit existed; Thu/Fri/Sun not planned
  });
  it("prefs parser fails closed and bounds the data", () => {
    expect(parseQb1(null)).toEqual({ way: null, kept: [] }); expect(parseQb1("x")).toEqual({ way: null, kept: [] });
    expect(parseQb1({ way: { week: "bad", pick: "time" }, kept: [1, "ok", "ok", "bad id!"] })).toEqual({ way: null, kept: ["ok"] });
    expect(parseQb1({ way: { week: "2026-10-26", pick: "skip" } }).way).toEqual({ week: "2026-10-26", pick: "skip" });
    expect(weekStart("2026-10-31")).toBe("2026-10-26"); expect(weekStart("2026-10-26")).toBe("2026-10-26"); expect(weekStart("2026-11-01")).toBe("2026-10-26");
  });
});

describe("Q-06 weekly screen", () => {
  beforeEach(() => { localStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, NOW); });
  const go = (lang: string) => { localStorage.setItem("tm:ui:lang", lang); location.hash = "#/journey/week"; render(); };
  const app = () => document.getElementById("app")!;
  for (const lang of ["en", "bn", "mix"] as const) {
    it(`no habits: Unknown note, no grid, no zero (${lang})`, () => {
      go(lang); const c = app().querySelector("[data-card=week_matrix]")!; expect(c.getAttribute("data-matrix-unknown")).toBe("1"); expect(c.querySelector("table")).toBeNull();
      expect(c.textContent).toContain(PACKS[lang]["qb1.wm.unknown"]);
    });
    it(`way card: 5 taps + Skip, a pick is kept in prefs for this week, Skip saves no reason (${lang})`, () => {
      go(lang); const card = app().querySelector("[data-card=way]")!;
      expect([...card.querySelectorAll("[data-way]")].map((b) => b.getAttribute("data-way"))).toEqual([...WAY_OPTIONS, "skip"]);
      expect(prefs.qbMemo.way).toBeNull();
      (card.querySelector("[data-way=energy]") as HTMLButtonElement).click();
      expect(prefs.qbMemo.way).toMatchObject({ pick: "energy" }); expect(card.querySelector("[data-way=energy]")!.getAttribute("aria-pressed")).toBe("true");
      expect(card.querySelector("[data-way-status]")!.textContent).toBe(PACKS[lang]["qb1.way.saved"]);
      go(lang); expect(app().querySelector("[data-way=energy]")!.getAttribute("aria-pressed")).toBe("true"); // survives a re-render
      (app().querySelector("[data-way=skip]") as HTMLButtonElement).click(); expect(prefs.qbMemo.way!.pick).toBe("skip");
      expect(app().querySelector("[data-way-status]")!.textContent).toBe(PACKS[lang]["qb1.way.skipped"]);
    });
  }
  it("an answer from an earlier week is not shown as this week's", () => {
    prefs.qbMemo = { way: { week: "2020-01-06", pick: "time" }, kept: [] }; go("en");
    expect(app().querySelector("[data-way=time]")!.getAttribute("aria-pressed")).toBe("false"); expect(app().querySelector("[data-way-status]")!.textContent).toBe("");
  });
  it("with a habit: the grid shows 7 columns, unplanned days are blank with a text label, and nothing reads as a miss", () => {
    const today = new Date(); const old = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 20).toISOString();
    store.demo.put(mk("h1", "habit", { "habit.title": "Read", "habit.days": String(today.getDay()) }, old));
    store.demo.put(mk("l1", "habit_log", { "habit_log.date": iso(today), "habit_log.count": 1 }, NOW, { habit: "h1" }));
    go("en"); const row = app().querySelector("[data-habit-row=h1]")!; const cells = [...row.querySelectorAll("td")];
    expect(cells.length).toBe(7); expect(cells.filter((c) => c.getAttribute("data-state") === "done").length).toBe(1);
    expect(cells.filter((c) => c.getAttribute("data-state") === "none").every((c) => c.textContent === "")).toBe(true);
    expect(cells.at(-1)!.getAttribute("aria-label")).toContain("done");
    expect(app().querySelector("[data-card=week_matrix]")!.textContent).not.toMatch(JUDGING);
    expect(app().querySelector("[data-card=way]")!.textContent).not.toMatch(JUDGING);
  });
  it("copy in all three languages has no judging words", () => {
    for (const l of ["en", "bn", "mix"] as const) for (const k of Object.keys(PACKS.en).filter((x) => x.startsWith("qb1.way.") || x.startsWith("qb1.wm."))) expect(PACKS[l][k as keyof typeof PACKS.en]).not.toMatch(JUDGING);
  });
});

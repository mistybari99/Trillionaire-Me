// M03, M09, M10, M12, M15 (G3 gate items). Pure rules: unknown ≠ 0, no guessed values, stable order.
import { describe, expect, it } from "vitest";
import { riskRows, validateRisk, withoutStopRule } from "../src/core/risk";
import { roleRows, roleSummary, looksLikePersonContact } from "../src/core/team";
import { parseOwnership, ventureRows } from "../src/core/ventures";
import { ladder, starRows } from "../src/core/northStar";
import { planHistory } from "../src/core/planHistory";
import type { FieldValue, TMRecord } from "../src/core/types";

const dv = (v: unknown): FieldValue => ({ state: "value", value: v, label: "DEMO" }) as FieldValue;
const rec = (id: string, entity: string, values: Record<string, FieldValue>): TMRecord =>
  ({ id, entity, ns: "demo", ownerId: "demo-user", schemaVersion: 1, createdAt: "2026-10-24T00:00:00.000Z", values });

describe("M15 risk register", () => {
  const recs = [
    rec("r2", "risk", { "risk.text": dv("বিক্রি বন্ধ"), "risk.likelihood": dv("high"), "risk.review_on": dv("2026-12-31") }),
    rec("r1", "risk", { "risk.text": dv("দাম বাড়বে"), "risk.likelihood": { state: "unknown" }, "risk.stop_rule": dv("তিন মাসে ৩টির কম গ্রাহক এলে থামব"), "risk.review_on": dv("2026-11-15") }),
    rec("r3", "risk", { "risk.text": dv("পরে দেখব") }),
  ];
  it("sorts by review date, undated last; unknown likelihood stays null (never guessed)", () => {
    const rows = riskRows(recs);
    expect(rows.map((r) => r.id)).toEqual(["r1", "r2", "r3"]);
    expect(rows[0]!.likelihood).toBeNull();
    expect(rows[1]!.likelihood).toBe("high");
  });
  it("counts risks without a stop rule (a count, not a score)", () => {
    expect(withoutStopRule(riskRows(recs))).toBe(2);
  });
  it("validation: text required, length caps, real calendar dates only", () => {
    expect(validateRisk({ text: "  ", stopRule: "", reviewOn: "" })).toBe("text_required");
    expect(validateRisk({ text: "a".repeat(81), stopRule: "", reviewOn: "" })).toBe("text_long");
    expect(validateRisk({ text: "ok", stopRule: "x".repeat(201), reviewOn: "" })).toBe("stop_rule_long");
    expect(validateRisk({ text: "ok", stopRule: "", reviewOn: "2026-1-2" })).toBe("date_format");
    expect(validateRisk({ text: "ok", stopRule: "", reviewOn: "2026-02-30" })).toBe("date_invalid");
    expect(validateRisk({ text: "ok", stopRule: "", reviewOn: "2026-12-31" })).toBeNull();
    expect(validateRisk({ text: "ok", stopRule: "", reviewOn: "" })).toBeNull();
  });
});

describe("M10 team roles", () => {
  const recs = [
    rec("t1", "team_role", { "team_role.role": dv("হিসাব দেখা"), "team_role.holder": dv("open") }),
    rec("t2", "team_role", { "team_role.role": dv("বিক্রি"), "team_role.holder": dv("me") }),
    rec("t3", "team_role", { "team_role.role": dv("ডেলিভারি"), "team_role.holder": { state: "unknown" } }),
  ];
  it("summary counts open and unknown separately; unknown is never counted as covered or open", () => {
    expect(roleSummary(roleRows(recs))).toEqual({ total: 3, open: 1, unknown: 1 });
  });
  it("rows sort by role name and keep unknown holder as null", () => {
    const rows = roleRows(recs);
    expect(rows.map((r) => r.role)).toEqual(["ডেলিভারি", "বিক্রি", "হিসাব দেখা"]);
    expect(rows[0]!.holder).toBeNull();
  });
  it("refuses contact-like text (no names, emails or phone numbers stored)", () => {
    expect(looksLikePersonContact("রহিম ভাই")).toBe(false);
    expect(looksLikePersonContact("rahim@example.com")).toBe(true);
    expect(looksLikePersonContact("01712 345678")).toBe(true);
  });
});

describe("M09 ventures", () => {
  it("unknown ownership stays null; no equity value is derived from it", () => {
    const rows = ventureRows([
      rec("v2", "venture", { "venture.name": dv("উদ্যোগ খ"), "venture.ownership_pct": { state: "unknown" } }),
      rec("v1", "venture", { "venture.name": dv("উদ্যোগ ক"), "venture.ownership_pct": dv(51), "venture.stage": dv("running") }),
    ]);
    expect(rows.map((r) => r.name)).toEqual(["উদ্যোগ ক", "উদ্যোগ খ"]);
    expect(rows[0]!.ownership).toBe(51); expect(rows[0]!.stage).toBe("running");
    expect(rows[1]!.ownership).toBeNull(); expect(rows[1]!.stage).toBeNull();
  });
  it("blank = unknown; numbers must be 0–100; Bangla digits accepted", () => {
    expect(parseOwnership("")).toEqual({ state: "unknown" });
    expect(parseOwnership("  ")).toEqual({ state: "unknown" });
    expect(parseOwnership("৫১")).toEqual({ state: "value", value: 51 });
    expect(parseOwnership("0")).toEqual({ state: "value", value: 0 });
    expect(parseOwnership("101")).toBeNull();
    expect(parseOwnership("-1")).toBeNull();
    expect(parseOwnership("abc")).toBeNull();
  });
});

describe("M03 North Star ladder", () => {
  it("evenly spaced steps from start to target, rounded to one decimal", () => {
    expect(ladder(10, 20, 3)).toEqual({ status: "ok", levels: [10, 12.5, 15, 17.5, 20] });
    expect(ladder(0, 10, 1)).toEqual({ status: "ok", levels: [0, 5, 10] });
  });
  it("works for a target below the start (a measure that should go down)", () => {
    const l = ladder(100, 80, 1);
    expect(l).toEqual({ status: "ok", levels: [100, 90, 80] });
  });
  it("unknown start or target gives no ladder, and no zero is invented", () => {
    expect(ladder(null, 50)).toEqual({ status: "unknown", missing: ["baseline"] });
    expect(ladder(10, null)).toEqual({ status: "unknown", missing: ["target"] });
    expect(ladder(null, null)).toEqual({ status: "unknown", missing: ["baseline", "target"] });
  });
  it("start equal to target is 'same', not an empty ladder", () => {
    expect(ladder(40, 40)).toEqual({ status: "same" });
  });
  it("starRows keeps unknown numbers as null and keeps several measures separate", () => {
    const rows = starRows([
      rec("s2", "north_star", { "north_star.metric": dv("গ্রাহক"), "north_star.baseline": dv(12), "north_star.target": { state: "unknown" } }),
      rec("s1", "north_star", { "north_star.metric": dv("আয়"), "north_star.unit": dv("টাকা"), "north_star.baseline": { state: "unknown" }, "north_star.target": dv(60) }),
    ]);
    expect(rows.map((r) => r.metric)).toEqual(["আয়", "গ্রাহক"]);
    expect(rows[0]!.baseline).toBeNull(); expect(rows[0]!.target).toBe(60); expect(rows[0]!.unit).toBe("টাকা");
    expect(rows[1]!.target).toBeNull(); expect(rows[1]!.unit).toBeNull();
  });
});

describe("M12 plan history", () => {
  it("lists finished and no-longer-true steps, newest first, without deleting anything", () => {
    const recs = [
      rec("task-a", "task", { "task.title": dv("ওয়েবসাইট"), "task.not_true_on": dv("2026-10-20") }),
      rec("task-b", "task", { "task.title": dv("দোকানের খাতা"), "task.done_on": dv("2026-10-22") }),
      rec("task-c", "task", { "task.title": dv("পুরোনো কাজ"), "task.done_on": dv("2026-10-01"), "task.not_true_on": dv("2026-10-24") }),
      rec("goal-x", "goal", { "goal.title": dv("লক্ষ্য") }),
    ];
    const rows = planHistory(recs);
    expect(rows.map((r) => `${r.day} ${r.kind} ${r.title}`)).toEqual([
      "2026-10-24 not_true পুরোনো কাজ", "2026-10-22 done দোকানের খাতা", "2026-10-20 not_true ওয়েবসাইট", "2026-10-01 done পুরোনো কাজ",
    ]);
    expect(recs).toHaveLength(4);
  });
  it("ignores malformed dates instead of showing them", () => {
    expect(planHistory([rec("t", "task", { "task.title": dv("x"), "task.done_on": dv("yesterday") })])).toEqual([]);
  });
});

import { cashFlow90Days, monthlyCashFlow, type FinItem } from "../src/core/finance";
describe("TM-REQ-023 90-day cash flow", () => {
  const item = (kind: FinItem["kind"], amount: FieldValue, scope: FinItem["scope"] = "personal"): FinItem => ({ kind, scope, amount });
  it("is three months of monthly flows; unknown amounts stay unknown", () => {
    const items = [item("income", dv(1000)), item("expense", dv(400))];
    expect(monthlyCashFlow(items, "personal")).toEqual({ ok: true, value: 600 });
    expect(cashFlow90Days(items, "personal")).toEqual({ ok: true, value: 1800 });
    const withUnknown = [...items, item("expense", { state: "unknown" })];
    expect(cashFlow90Days(withUnknown, "personal")).toEqual({ ok: false, reason: "unknown_inputs", missing: 1 });
  });
  it("keeps personal and business apart", () => {
    const items = [item("income", dv(500), "business"), item("expense", dv(100), "personal")];
    expect(cashFlow90Days(items, "business")).toEqual({ ok: true, value: 1500 });
    expect(cashFlow90Days(items, "personal")).toEqual({ ok: true, value: -300 });
  });
});

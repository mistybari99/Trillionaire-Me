// BUILD-01 (W3): optional manual work blocks and their suggestions. Pure core tests.
import { describe, expect, it } from "vitest";
import { suggestBlocks, GENERIC_WINDOWS, type SuggestInput } from "../src/core/blockSuggest";
import { commitRows, expandWorkBlocks, protectedPlannerBlocks, validateWorkBlock, weekBlocks, workBlockFromRecord, workBlockRecord, workBlocksFromRecords, workOverlaps, type WorkBlock } from "../src/core/timeBlocks";
import { schedule } from "../src/core/planner";
import { DEFAULT_PRAYER_SETTINGS } from "../src/core/prayerMethod";
import type { TMRecord } from "../src/core/types";

const mk = (id: string, b: Partial<Omit<WorkBlock, "id" | "ns">> = {}): TMRecord =>
  workBlockRecord({ id, ns: "demo", ownerId: "demo-user", schemaVersion: 4, createdAt: "2026-11-07T00:00:00.000Z", b: { date: "2026-11-09", start: 540, end: 600, label: null, repeat: "none", goalId: null, protectedBlock: false, ...b } });

describe("work block records (add, edit, delete)", () => {
  it("round-trips a block; a block with no label or goal stays unlabelled and not linked, never empty text", () => {
    const r = mk("a"); expect(r.values["work_block.label"]).toBeUndefined(); expect(r.values["work_block.goal"]).toBeUndefined();
    expect(workBlockFromRecord(r)).toEqual({ id: "a", ns: "demo", date: "2026-11-09", start: 540, end: 600, label: null, repeat: "none", goalId: null, protectedBlock: false });
    const g = mk("b", { label: "Write", goalId: "goal-1", protectedBlock: true, repeat: "weekly" }); expect(g.links).toEqual({ goal: "goal-1" });
    expect(workBlockFromRecord(g)).toMatchObject({ label: "Write", goalId: "goal-1", protectedBlock: true, repeat: "weekly" });
  });
  it("edit and move: a changed record replaces the old one with the same id; delete leaves no block", () => {
    const store = new Map<string, TMRecord>([["a", mk("a")]]);
    store.set("a", mk("a", { date: "2026-11-10", start: 600, end: 660, label: "Moved" }));
    expect(workBlocksFromRecords([...store.values()])).toMatchObject([{ id: "a", date: "2026-11-10", start: 600, end: 660, label: "Moved" }]);
    store.delete("a"); expect(workBlocksFromRecords([...store.values()])).toEqual([]);
  });
  it("skips broken records (bad date, end before start, wrong entity) instead of guessing", () => {
    const bad = mk("x"); bad.values["work_block.to"] = { state: "value", value: "08:00", label: "DEMO" };
    const bad2 = mk("y"); bad2.values["work_block.date"] = { state: "value", value: "2026-02-31", label: "DEMO" };
    const other = { ...mk("z"), entity: "task" };
    expect(workBlocksFromRecords([bad, bad2, other])).toEqual([]);
  });
  it("labels are cut at 60 characters and the check refuses longer", () => {
    expect(workBlockFromRecord(mk("l", { label: "x".repeat(80) }))!.label).toHaveLength(60);
    expect(validateWorkBlock({ date: "2026-11-09", from: "09:00", to: "10:00", label: "x".repeat(61), repeat: "none" })).toBe("label_long");
  });
  it("validation names the problem: date, empty or reversed window, bad clock, unknown repeat", () => {
    const ok = { date: "2026-11-09", from: "09:00", to: "10:00", label: "", repeat: "none" };
    expect(validateWorkBlock(ok)).toBeNull();
    expect(validateWorkBlock({ ...ok, date: "9 Nov" })).toBe("date_invalid"); expect(validateWorkBlock({ ...ok, date: "2026-13-01" })).toBe("date_invalid");
    expect(validateWorkBlock({ ...ok, from: "" })).toBe("window_required"); expect(validateWorkBlock({ ...ok, to: "25:00" })).toBe("window_invalid");
    expect(validateWorkBlock({ ...ok, from: "10:00", to: "09:00" })).toBe("window_order"); expect(validateWorkBlock({ ...ok, repeat: "monthly" })).toBe("repeat_invalid");
  });
});

describe("repeat expansion", () => {
  // 2026-11-09 is a Monday
  const blk = (repeat: WorkBlock["repeat"]): WorkBlock => workBlockFromRecord(mk("r", { repeat }))!;
  it("none: one day only", () => { expect(expandWorkBlocks([blk("none")], "2026-11-08", 7).map((o) => o.date)).toEqual(["2026-11-09"]); });
  it("daily: every day from the first date, never before it", () => { expect(expandWorkBlocks([blk("daily")], "2026-11-08", 4).map((o) => o.date)).toEqual(["2026-11-09", "2026-11-10", "2026-11-11"]); });
  it("weekdays: Monday to Friday only", () => {
    const d = expandWorkBlocks([blk("weekdays")], "2026-11-09", 8).map((o) => o.date);
    expect(d).toEqual(["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-16"]);
  });
  it("weekly: the weekday of the first date", () => { expect(expandWorkBlocks([blk("weekly")], "2026-11-09", 15).map((o) => o.date)).toEqual(["2026-11-09", "2026-11-16", "2026-11-23"]); });
  it("carries the weekday number the planner uses (0 = Sunday)", () => { expect(expandWorkBlocks([blk("none")], "2026-11-09", 1)[0]!.day).toBe(1); });
});

describe("overlap warning and protected blocks", () => {
  it("two work blocks that overlap on one date warn both ways; touching ends do not warn; nothing is moved", () => {
    const a = workBlockFromRecord(mk("a", { start: 540, end: 600 }))!, b = workBlockFromRecord(mk("b", { start: 590, end: 650 }))!, c = workBlockFromRecord(mk("c", { start: 600, end: 660 }))!;
    const occs = expandWorkBlocks([a, b, c], "2026-11-09", 1);
    const o = workOverlaps(occs, []);
    expect(o.filter((x) => x.blockId === "a").map((x) => x.otherId)).toEqual(["b"]);
    expect(o.filter((x) => x.blockId === "c").map((x) => x.otherId)).toEqual(["b"]);
    expect(occs.map((x) => [x.blockId, x.start])).toEqual([["a", 540], ["b", 590], ["c", 600]]);
  });
  it("a work block that overlaps committed time the user typed warns; with none typed there is nothing to compare", () => {
    const occs = expandWorkBlocks([workBlockFromRecord(mk("a"))!], "2026-11-09", 1);
    expect(workOverlaps(occs, [])).toEqual([]);
    expect(workOverlaps(occs, [{ kind: "family", day: 1, start: 570, end: 630, prayer: null, rowId: "row1", date: "2026-11-09" }])).toEqual([{ blockId: "a", date: "2026-11-09", with: "committed", otherId: "row1" }]);
  });
  it("only protected blocks are busy for the planner; an unprotected block changes nothing", () => {
    const occs = expandWorkBlocks([workBlockFromRecord(mk("a", { start: 360, end: 1320, repeat: "daily" }))!], "2026-11-09", 7);
    expect(protectedPlannerBlocks(occs)).toEqual([]);
    const input = { weeklyFreeMinutes: 600, tasks: [{ id: "t1", minutes: 60, priority: 1 }], mode: "normal" as const, startDay: 1 };
    const base = schedule({ ...input, blocked: [] });
    expect(schedule({ ...input, blocked: protectedPlannerBlocks(occs) })).toEqual(base);
    const prot = expandWorkBlocks([workBlockFromRecord(mk("a", { start: 360, end: 1320, repeat: "daily", protectedBlock: true }))!], "2026-11-09", 7);
    expect(protectedPlannerBlocks(prot)).toHaveLength(7);
    expect(schedule({ ...input, blocked: protectedPlannerBlocks(prot) }).placements).toEqual([]); // the whole window is kept
  });
});

describe("no forced prayer block", () => {
  it("with nothing typed there is no block at all, and the app makes no work block by itself", () => {
    const wk = weekBlocks(commitRows([]), { y: 2026, m: 11, d: 9 }, { lat: 23.8, lon: 90.4 }, DEFAULT_PRAYER_SETTINGS, 7);
    expect(wk.blocks).toEqual([]); expect(workBlocksFromRecords([])).toEqual([]);
  });
  it("a prayer row with no minutes typed makes no prayer block (the old option stays optional)", () => {
    const row = { id: "r", ns: "demo" as const, kind: "prayer" as const, hoursPerWeek: null, from: null, to: null, prayerMinutes: null, fromDiary: true };
    expect(weekBlocks([row], { y: 2026, m: 11, d: 9 }, { lat: 23.8, lon: 90.4 }, DEFAULT_PRAYER_SETTINGS, 7).blocks).toEqual([]);
  });
});

describe("suggestions", () => {
  const base: SuggestInput = { from: "2026-11-09", days: 3, nowMinute: null, blocked: [], existing: [], tasks: [] };
  it("empty data: only the three neutral windows per day, all marked as ideas, none from tasks", () => {
    const s = suggestBlocks(base);
    expect(s).toHaveLength(6); expect(s.every((x) => x.idea && x.source === "generic" && x.taskId === null)).toBe(true);
    expect(s.slice(0, 3).map((x) => [x.windowId, x.start, x.end])).toEqual(GENERIC_WINDOWS.map((w) => [w.id, w.start, w.end]));
  });
  it("deterministic: the same input gives the same list", () => {
    const inp: SuggestInput = { ...base, tasks: [{ id: "b", minutes: 50, priority: 2 }, { id: "a", minutes: 20, priority: 2 }, { id: "c", minutes: null, priority: 9 }] };
    expect(suggestBlocks(inp)).toEqual(suggestBlocks({ ...inp, tasks: [...inp.tasks].reverse() }));
  });
  it("sizes a task suggestion by the step's own minutes (rounded up to 15, at least 30); a step with no estimate gives none", () => {
    const s = suggestBlocks({ ...base, tasks: [{ id: "t", minutes: 50, priority: 1 }, { id: "u", minutes: null, priority: 5 }] }).filter((x) => x.source === "task");
    expect(s).toHaveLength(1); expect(s[0]).toMatchObject({ taskId: "t", date: "2026-11-09", start: 360, end: 420 });
  });
  it("uses only the user's free slots: busy time and existing work blocks are never suggested over", () => {
    const blocked = [{ day: 1, start: 360, end: 600 }]; // Monday morning busy (typed by the user)
    const existing = [{ blockId: "w", date: "2026-11-09", day: 1, start: 840, end: 960, label: null, goalId: null, protectedBlock: false }];
    const s = suggestBlocks({ ...base, blocked, existing, tasks: [{ id: "t", minutes: 60, priority: 1 }] });
    const mon = s.filter((x) => x.date === "2026-11-09");
    expect(mon.find((x) => x.source === "task")).toMatchObject({ start: 600, end: 660 });
    expect(mon.some((x) => x.windowId === "morning")).toBe(false); expect(mon.some((x) => x.windowId === "afternoon")).toBe(false); expect(mon.some((x) => x.windowId === "evening")).toBe(true);
  });
  it("today skips what is already past", () => {
    const s = suggestBlocks({ ...base, nowMinute: 15 * 60 }); expect(s.filter((x) => x.date === "2026-11-09").map((x) => x.windowId)).toEqual(["evening"]);
  });
  it("never prayer-based: the input has no prayer, and no suggestion is named or timed after one", () => {
    const keys = Object.keys(base).join(" "); expect(keys).not.toMatch(/prayer|salah|namaz/i);
    expect(JSON.stringify(suggestBlocks(base))).not.toMatch(/prayer|fajr|dhuhr|asr|maghrib|isha/i);
  });
  it("at most 6, and zero days gives none", () => { expect(suggestBlocks({ ...base, days: 14, tasks: [{ id: "t", minutes: 30, priority: 1 }] }).length).toBeLessThanOrEqual(6); expect(suggestBlocks({ ...base, days: 0 })).toEqual([]); });
});

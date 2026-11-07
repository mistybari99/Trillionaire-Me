import { describe, expect, it } from "vitest";
import {
  DEFAULT_REMINDER_PREFS, MAX_PER_DAY, applyLimits, dhakaMs, dueReminders, expandReminders, markDone, markHeld, markShown, markSkipped, missedReminders,
  parseLedger, parseReminderPrefs, reminderFromRecord, reminderNotification, reminderRecord, remindersFromRecords, snooze, withReminder,
  type BusyBlock, type Ledger, type Placed, type Reminder, type ReminderPrefs, type Slot, type TargetInfo, type TargetLookup,
} from "../src/core/reminders";
import { SCHEMA_VERSION } from "../src/schema/entities";

const P: ReminderPrefs = { ...DEFAULT_REMINDER_PREFS, master: true };
const rem = (o: Partial<Reminder> & Pick<Reminder, "id" | "target" | "targetId">): Reminder => ({ at: null, timeOfDay: null, leadDays: 0, state: "on", snoozedUntil: null, ...o });
const info = (o: Partial<TargetInfo> = {}): TargetInfo => ({ title: "Call the bank", privacy: "personal", date: null, days: [], placed: null, deferred: false, ...o });
const lookup = (m: Record<string, TargetInfo>): TargetLookup => (t, id) => m[`${t}:${id}`] ?? null;
const at = (date: string, hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return dhakaMs(date, h! * 60 + m!); };
const plan = (list: Reminder[], m: Record<string, TargetInfo>, from = "2026-11-05", to = "2026-11-12") => expandReminders(list, from, to, P, lookup(m));
const sched = (slots: Slot[], o: { ledger?: Ledger; prayers?: { date: string; minute: number }[]; blocks?: BusyBlock[]; prefs?: ReminderPrefs; mode?: "normal" | "minimum_week" | "pause" } = {}) =>
  applyLimits(slots, o.ledger ?? [], o.prayers ?? [], o.blocks ?? [], o.prefs ?? P, o.mode ?? "normal");

describe("reminder prefs", () => {
  it("default is everything off, quiet 22:00 to 07:00, default time 09:00", () => {
    expect(parseReminderPrefs(undefined)).toEqual({ master: false, planStart: false, planLead: 0, quiet: { from: "22:00", to: "07:00" }, defaultTime: "09:00" });
    expect(DEFAULT_REMINDER_PREFS.master).toBe(false);
  });
  it("fails closed: only a real true switches on; bad times fall back", () => {
    expect(parseReminderPrefs({ master: "true" }).master).toBe(false);
    expect(parseReminderPrefs({ master: 1, planStart: "yes" })).toMatchObject({ master: false, planStart: false });
    expect(parseReminderPrefs({ master: true, planStart: true, planLead: 10 })).toMatchObject({ master: true, planStart: true, planLead: 10 });
    expect(parseReminderPrefs({ planLead: 7 }).planLead).toBe(0);
    expect(parseReminderPrefs({ quiet: { from: "25:00", to: "7am" }, defaultTime: "9:5" })).toMatchObject({ quiet: { from: "22:00", to: "07:00" }, defaultTime: "09:00" });
    expect(parseReminderPrefs({ quiet: { from: "23:30", to: "06:15" }, defaultTime: "08:45" })).toMatchObject({ quiet: { from: "23:30", to: "06:15" }, defaultTime: "08:45" });
    expect(parseReminderPrefs("junk")).toEqual(DEFAULT_REMINDER_PREFS);
  });
});

describe("reminder records", () => {
  it("round-trips through a TMRecord; no title or copied time is stored; unknown stays absent", () => {
    const r = rem({ id: "r1", target: "task", targetId: "t1", at: "2026-11-05T09:30" });
    const rec = reminderRecord({ id: "r1", ns: "demo", ownerId: "demo-user", schemaVersion: SCHEMA_VERSION, createdAt: "2026-11-03T00:00:00Z", r });
    expect(rec.entity).toBe("reminder"); expect(Object.keys(rec.values).sort()).toEqual(["reminder.at", "reminder.state", "reminder.target_entity", "reminder.target_id"]);
    expect(rec.values["reminder.at"]).toMatchObject({ state: "value", label: "DEMO" });
    expect(reminderFromRecord(rec)).toEqual(r);
    const bill = reminderRecord({ id: "r2", ns: "real", ownerId: "o", schemaVersion: SCHEMA_VERSION, createdAt: "x", r: rem({ id: "r2", target: "bill", targetId: "b1", leadDays: 1, timeOfDay: "08:00" }) });
    expect(bill.values["reminder.lead_days"]).toMatchObject({ value: 1, label: "FACT" }); expect(reminderFromRecord(bill)).toMatchObject({ leadDays: 1, timeOfDay: "08:00", at: null });
  });
  it("a record with no valid target or a bad time is ignored or reads as no time", () => {
    expect(reminderFromRecord({ id: "x", entity: "task", ns: "demo", ownerId: "d", schemaVersion: 3, createdAt: "", values: {} })).toBeNull();
    expect(remindersFromRecords([{ id: "x", entity: "reminder", ns: "demo", ownerId: "d", schemaVersion: 3, createdAt: "", values: { "reminder.target_entity": { state: "value", value: "alien", label: "DEMO" }, "reminder.target_id": { state: "value", value: "1", label: "DEMO" } } }])).toEqual([]);
    const rec = reminderRecord({ id: "r", ns: "demo", ownerId: "d", schemaVersion: 3, createdAt: "", r: rem({ id: "r", target: "task", targetId: "t", at: "next week" }) });
    expect(reminderFromRecord(rec)!.at).toBeNull();
  });
  it("withReminder updates state and snooze on the same record", () => {
    const r = rem({ id: "r1", target: "task", targetId: "t1", at: "2026-11-05T09:30" });
    const rec = reminderRecord({ id: "r1", ns: "demo", ownerId: "d", schemaVersion: 3, createdAt: "c", r });
    const next = withReminder(rec, { ...r, state: "done" });
    expect(next.id).toBe("r1"); expect(next.createdAt).toBe("c"); expect(reminderFromRecord(next)!.state).toBe("done");
  });
});

describe("expandReminders", () => {
  it("task, review: one slot at the picked date and time (Dhaka); outside the range gives none", () => {
    const s = plan([rem({ id: "a", target: "task", targetId: "t", at: "2026-11-06T09:30" }), rem({ id: "b", target: "review", targetId: "weekly", at: "2026-11-20T10:00" })], { "task:t": info(), "review:weekly": info({ title: "Weekly review" }) });
    expect(s.map((x) => [x.id, x.date, x.minute])).toEqual([["a:2026-11-06@570", "2026-11-06", 570]]);
    expect(s[0]!.when).toBe(Date.UTC(2026, 10, 6, 3, 30));
  });
  it("plan step follows the planner's placement and gets none when deferred or unplaced", () => {
    const l = [rem({ id: "p", target: "plan_step", targetId: "s" })];
    expect(plan(l, { "plan_step:s": info({ placed: { date: "2026-11-07", minute: 600 } }) }).map((x) => [x.date, x.minute])).toEqual([["2026-11-07", 600]]);
    expect(plan(l, { "plan_step:s": info({ placed: { date: "2026-11-08", minute: 660 } }) }).map((x) => [x.date, x.minute])).toEqual([["2026-11-08", 660]]); // re-plan moves it
    expect(plan(l, { "plan_step:s": info({ placed: { date: "2026-11-07", minute: 600 }, deferred: true }) })).toEqual([]);
    expect(plan(l, { "plan_step:s": info() })).toEqual([]);
  });
  it("habit fires on its own scheduled days at the time of day (default 09:00); no days means none", () => {
    const l = [rem({ id: "h", target: "habit", targetId: "h1", timeOfDay: "06:30" })];
    const s = plan(l, { "habit:h1": info({ days: [1, 3] }) }, "2026-11-02", "2026-11-08"); // Mon 2 Nov 2026
    expect(s.map((x) => [x.date, x.minute])).toEqual([["2026-11-02", 390], ["2026-11-04", 390]]);
    expect(plan([rem({ id: "h", target: "habit", targetId: "h1" })], { "habit:h1": info({ days: [1] }) }, "2026-11-02", "2026-11-02")[0]!.minute).toBe(540);
    expect(plan(l, { "habit:h1": info({ days: [] }) }, "2026-11-02", "2026-11-08")).toEqual([]);
  });
  it("bill and goal fire on the date or the day before; a missing date gives no slot (unknown is not now)", () => {
    const m = { "bill:b": info({ date: "2026-11-10", privacy: "financial" }), "goal:g": info({ date: null }) };
    expect(plan([rem({ id: "b0", target: "bill", targetId: "b" })], m).map((x) => x.date)).toEqual(["2026-11-10"]);
    expect(plan([rem({ id: "b1", target: "bill", targetId: "b", leadDays: 1, timeOfDay: "08:00" })], m).map((x) => [x.date, x.minute])).toEqual([["2026-11-09", 480]]);
    expect(plan([rem({ id: "g", target: "goal", targetId: "g" })], m)).toEqual([]);
    expect(plan([rem({ id: "t", target: "task", targetId: "t" })], { "task:t": info() })).toEqual([]); // task with no time
  });
  it("a bill reminder works when the amount is unknown (the slot carries no amount at all)", () => {
    const s = plan([rem({ id: "b", target: "bill", targetId: "b" })], { "bill:b": info({ date: "2026-11-10", privacy: "financial" }) });
    expect(s).toHaveLength(1); expect(Object.keys(s[0]!)).not.toContain("amount");
  });
  it("done or skipped reminders and reminders whose item is gone give none", () => {
    const m = { "task:t": info() };
    expect(plan([rem({ id: "a", target: "task", targetId: "t", at: "2026-11-06T09:30", state: "done" })], m)).toEqual([]);
    expect(plan([rem({ id: "a", target: "task", targetId: "t", at: "2026-11-06T09:30", state: "skipped" })], m)).toEqual([]);
    expect(plan([rem({ id: "a", target: "task", targetId: "gone", at: "2026-11-06T09:30" })], m)).toEqual([]);
  });
  it("a snooze adds exactly one extra slot", () => {
    const r = rem({ id: "a", target: "task", targetId: "t", at: "2026-11-06T09:30", snoozedUntil: "2026-11-06T10:30" });
    const s = plan([r], { "task:t": info() });
    expect(s).toHaveLength(2); expect(s.filter((x) => x.snooze)).toHaveLength(1); expect(s[1]!.minute).toBe(630);
  });
});

describe("slot ids", () => {
  it("a changed time on the same day is a new slot, so it is delivered again (editing a reminder or re-planning resets it)", () => {
    const a = plan([rem({ id: "a", target: "task", targetId: "t", at: "2026-11-06T09:30" })], { "task:t": info() })[0]!;
    const b = plan([rem({ id: "a", target: "task", targetId: "t", at: "2026-11-06T11:00" })], { "task:t": info() })[0]!;
    expect(a.id).not.toBe(b.id); expect(sched([b], { ledger: [{ id: a.id, at: 1, s: "shown" }] }).schedule).toHaveLength(1);
    const p1 = plan([rem({ id: "p", target: "plan_step", targetId: "s" })], { "plan_step:s": info({ placed: { date: "2026-11-07", minute: 600 } }) })[0]!;
    const p2 = plan([rem({ id: "p", target: "plan_step", targetId: "s" })], { "plan_step:s": info({ placed: { date: "2026-11-07", minute: 660 } }) })[0]!;
    expect(p1.id).not.toBe(p2.id);
  });
});

describe("applyLimits: holds", () => {
  const one = (hhmm: string, date = "2026-11-06") => plan([rem({ id: "a", target: "task", targetId: "t", at: `${date}T${hhmm}` })], { "task:t": info() });
  it("master off schedules nothing", () => {
    expect(sched(one("09:00"), { prefs: DEFAULT_REMINDER_PREFS }).schedule).toEqual([]);
  });
  it("quiet hours hold a reminder until they end (never drop it), including across midnight", () => {
    expect(sched(one("23:00")).schedule[0]!.showAt).toBe(at("2026-11-07", "07:00"));
    expect(sched(one("03:00")).schedule[0]!.showAt).toBe(at("2026-11-06", "07:00"));
    expect(sched(one("22:00")).schedule[0]!.showAt).toBe(at("2026-11-07", "07:00"));
    expect(sched(one("21:59")).schedule[0]!.showAt).toBe(at("2026-11-06", "21:59"));
    expect(sched(one("07:00")).schedule[0]!.showAt).toBe(at("2026-11-06", "07:00"));
  });
  it("a quiet window that does not wrap midnight works too", () => {
    const p = { ...P, quiet: { from: "13:00", to: "15:00" } };
    expect(sched(one("14:00"), { prefs: p }).schedule[0]!.showAt).toBe(at("2026-11-06", "15:00"));
    expect(sched(one("12:59"), { prefs: p }).schedule[0]!.showAt).toBe(at("2026-11-06", "12:59"));
  });
  it("equal quiet from and to means no quiet hours", () => {
    expect(sched(one("23:00"), { prefs: { ...P, quiet: { from: "07:00", to: "07:00" } } }).schedule[0]!.showAt).toBe(at("2026-11-06", "23:00"));
  });
  it("a prayer, family or rest block holds a reminder to the block end", () => {
    const blocks: BusyBlock[] = [{ date: "2026-11-06", start: 12 * 60, end: 12 * 60 + 40 }];
    expect(sched(one("12:10"), { blocks }).schedule[0]!.showAt).toBe(at("2026-11-06", "12:40"));
    expect(sched(one("12:40"), { blocks }).schedule[0]!.showAt).toBe(at("2026-11-06", "12:40"));
  });
  it("prayer wins: within 3 minutes of a prayer alert a reminder moves to 3 minutes after it", () => {
    const prayers = [{ date: "2026-11-06", minute: 12 * 60 }];
    expect(sched(one("12:01"), { prayers }).schedule[0]!.showAt).toBe(at("2026-11-06", "12:03"));
    expect(sched(one("11:58"), { prayers }).schedule[0]!.showAt).toBe(at("2026-11-06", "12:03"));
    expect(sched(one("12:00"), { prayers }).schedule[0]!.showAt).toBe(at("2026-11-06", "12:03"));
    expect(sched(one("12:03"), { prayers }).schedule[0]!.showAt).toBe(at("2026-11-06", "12:03"));
    expect(sched(one("11:56"), { prayers }).schedule[0]!.showAt).toBe(at("2026-11-06", "11:56"));
  });
  it("overload (minimum_week, pause) holds everything: nothing scheduled, the slots are returned as held", () => {
    for (const mode of ["minimum_week", "pause"] as const) { const r = sched(one("09:00"), { mode }); expect(r.schedule).toEqual([]); expect(r.held).toHaveLength(1); }
    expect(sched(one("09:00")).held).toEqual([]);
  });
  it("after overload ends there is no catch-up: held slots stay out of the missed card", () => {
    const slots = one("09:00"); const now = at("2026-11-07", "09:00");
    const held = sched(slots, { mode: "pause" }).held;
    const ledger = markHeld([], held, at("2026-11-06", "09:01"));
    const back = sched(slots, { ledger });
    expect(back.schedule).toEqual([]);
    expect(missedReminders(sched(slots).schedule, ledger, now, P, { notify: {} })).toEqual([]);
  });
  it("slots already in the ledger are not scheduled again", () => {
    const slots = one("09:00");
    expect(sched(slots, { ledger: [{ id: slots[0]!.id, at: 1, s: "shown" }] }).schedule).toEqual([]);
  });
});

describe("dueReminders", () => {
  const mk = (times: string[], date = "2026-11-06") => plan(times.map((t, i) => rem({ id: `r${i}`, target: "task", targetId: `t${i}`, at: `${date}T${t}` })), Object.fromEntries(times.map((_, i) => [`task:t${i}`, info({ title: `Item ${i}` })])));
  it("shows a reminder at its time and for 5 minutes after (a late start still fires), not before and not after", () => {
    const s = sched(mk(["10:00"])).schedule;
    expect(dueReminders(s, [], at("2026-11-06", "09:59")).show).toEqual([]);
    expect(dueReminders(s, [], at("2026-11-06", "10:00")).show).toHaveLength(1);
    expect(dueReminders(s, [], at("2026-11-06", "10:04")).show).toHaveLength(1);
    expect(dueReminders(s, [], at("2026-11-06", "10:05")).show).toEqual([]);
  });
  it("shows each slot once: after it is in the ledger it is never due again", () => {
    const s = sched(mk(["10:00"])).schedule; const now = at("2026-11-06", "10:01");
    const n = dueReminders(s, [], now).show[0]!;
    expect(dueReminders(s, markShown([], n, now), now).show).toEqual([]);
  });
  it("two reminders within 15 minutes merge into one notification, including one that is not due yet", () => {
    const s = sched(mk(["10:00", "10:10"])).schedule;
    const d = dueReminders(s, [], at("2026-11-06", "10:00"));
    expect(d.show).toHaveLength(1); expect(d.show[0]!.merged).toBe(true); expect(d.show[0]!.ids).toHaveLength(2);
    const far = sched(mk(["10:00", "10:20"])).schedule;
    expect(dueReminders(far, [], at("2026-11-06", "10:00")).show[0]!.merged).toBe(false);
  });
  it("at most 6 notifications per Dhaka day; the rest are folded (returned, never lost)", () => {
    const times = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"];
    const s = sched(mk(times)).schedule; let ledger: Ledger = []; let shown = 0; const folded: Placed[] = [];
    for (const t of times) {
      const now = at("2026-11-06", t); const d = dueReminders(s, ledger, now);
      for (const n of d.show) { shown++; ledger = markShown(ledger, n, now); }
      folded.push(...d.folded);
    }
    expect(shown).toBe(MAX_PER_DAY); expect(folded.map((f) => f.title)).toEqual(["Item 6", "Item 7"]);
  });
  it("the cap counts notifications, not items: a merged pair uses one", () => {
    const s = sched(mk(["08:00", "08:05"])).schedule; const now = at("2026-11-06", "08:00");
    const n = dueReminders(s, [], now).show; expect(n).toHaveLength(1);
    const ledger = markShown([], n[0]!, now);
    expect(new Set(ledger.map((e) => e.g)).size).toBe(1);
  });
  it("the cap restarts on the next Dhaka day", () => {
    const old: Ledger = Array.from({ length: 6 }, (_, i) => ({ id: `x${i}`, at: at("2026-11-05", "10:00") + i, s: "shown" as const, g: `x${i}` }));
    const s = sched(mk(["10:00"])).schedule;
    expect(dueReminders(s, old, at("2026-11-06", "10:00")).show).toHaveLength(1);
  });
});

describe("missed reminders", () => {
  const mk = (target: "task" | "plan_step", date: string, hhmm: string, privacy: TargetInfo["privacy"] = "personal") =>
    plan([rem({ id: "a", target, targetId: "t", ...(target === "task" ? { at: `${date}T${hhmm}` } : {}) })], { [`${target}:t`]: info({ privacy, placed: { date, minute: Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3)) } }) }, "2026-11-01", "2026-11-30");
  it("lists a passed reminder that was not shown; not a future one or one still in its 5-minute window", () => {
    const s = sched(mk("task", "2026-11-06", "10:00")).schedule;
    expect(missedReminders(s, [], at("2026-11-06", "10:04"), P, { notify: {} })).toEqual([]);
    expect(missedReminders(s, [], at("2026-11-06", "10:05"), P, { notify: {} })).toHaveLength(1);
    expect(missedReminders(s, [], at("2026-11-06", "09:00"), P, { notify: {} })).toEqual([]);
  });
  it("plan-step ones expire after 24 hours, explicit ones after 7 days", () => {
    const ps = sched(mk("plan_step", "2026-11-06", "10:00")).schedule, tk = sched(mk("task", "2026-11-06", "10:00")).schedule;
    expect(missedReminders(ps, [], at("2026-11-07", "09:59"), P, { notify: {} })).toHaveLength(1);
    expect(missedReminders(ps, [], at("2026-11-07", "10:01"), P, { notify: {} })).toEqual([]);
    expect(missedReminders(tk, [], at("2026-11-13", "09:59"), P, { notify: {} })).toHaveLength(1);
    expect(missedReminders(tk, [], at("2026-11-13", "10:01"), P, { notify: {} })).toEqual([]);
  });
  it("shown, done, skipped and snoozed ones are not listed", () => {
    const s = sched(mk("task", "2026-11-06", "10:00")).schedule; const now = at("2026-11-06", "12:00");
    for (const st of ["shown", "done", "skipped", "snoozed", "held"] as const) expect(missedReminders(s, [{ id: s[0]!.id, at: now, s: st }], now, P, { notify: {} })).toEqual([]);
  });
  it("worship items lapse quietly unless the worship detail tick is on; master off lists nothing", () => {
    const s = sched(mk("task", "2026-11-06", "10:00", "worship")).schedule; const now = at("2026-11-06", "12:00");
    expect(missedReminders(s, [], now, P, { notify: {} })).toEqual([]);
    expect(missedReminders(s, [], now, P, { notify: { worship: true } })).toHaveLength(1);
    expect(missedReminders(s, [], now, { ...P, master: false }, { notify: {} })).toEqual([]);
  });
  it("a slot folded by the cap shows up here", () => {
    const times = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00"];
    const s = sched(plan(times.map((t, i) => rem({ id: `r${i}`, target: "task", targetId: `t${i}`, at: `2026-11-06T${t}` })), Object.fromEntries(times.map((_, i) => [`task:t${i}`, info({ title: `Item ${i}` })])))).schedule;
    let ledger: Ledger = [];
    for (const t of times) { const now = at("2026-11-06", t); for (const n of dueReminders(s, ledger, now).show) ledger = markShown(ledger, n, now); }
    expect(missedReminders(s, ledger, at("2026-11-06", "20:00"), P, { notify: {} }).map((m) => m.title)).toEqual(["Item 6"]);
  });
});

describe("snooze, done, skip", () => {
  const r = rem({ id: "a", target: "task", targetId: "t", at: "2026-11-06T09:30" });
  const now = at("2026-11-06", "09:31");
  it("snooze in 1 hour makes one new slot and closes the old one; the item is not done", () => {
    const res = snooze(r, "a:2026-11-06@570", "hour", [], now, P);
    expect(res.reminder.state).toBe("on"); expect(res.reminder.snoozedUntil).toBe("2026-11-06T10:31"); expect(res.ledger).toEqual([{ id: "a:2026-11-06@570", at: now, s: "snoozed" }]);
    const slots = plan([res.reminder], { "task:t": info() });
    const sc = sched(slots, { ledger: res.ledger }).schedule;
    expect(sc).toHaveLength(1); expect(sc[0]!.snooze).toBe(true); expect(sc[0]!.showAt).toBe(at("2026-11-06", "10:31"));
  });
  it("tomorrow morning is the next Dhaka day at the default time", () => {
    expect(snooze(r, "x", "tomorrow", [], now, P).reminder.snoozedUntil).toBe("2026-11-07T09:00");
    expect(snooze(r, "x", "tomorrow", [], at("2026-11-06", "23:30"), { ...P, defaultTime: "08:15" }).reminder.snoozedUntil).toBe("2026-11-07T08:15");
  });
  it("a snooze that is shown once is not shown again; snoozing again replaces the time", () => {
    const a = snooze(r, "a:2026-11-06@570", "hour", [], now, P);
    const b = snooze(a.reminder, "a:2026-11-06@631~z", "tomorrow", a.ledger, at("2026-11-06", "10:32"), P);
    expect(b.reminder.snoozedUntil).toBe("2026-11-07T09:00"); expect(b.ledger.map((e) => e.s)).toEqual(["snoozed", "snoozed"]);
  });
  it("done and skip finish a one-time reminder; a habit keeps its other days", () => {
    expect(markDone(r, "s", [], now).reminder.state).toBe("done");
    expect(markSkipped(r, "s", [], now).reminder.state).toBe("skipped");
    const h = rem({ id: "h", target: "habit", targetId: "h1", timeOfDay: "06:00" });
    expect(markDone(h, "h:2026-11-06@390", [], now).reminder.state).toBe("on");
    expect(markDone(h, "h:2026-11-06@390", [], now).ledger).toEqual([{ id: "h:2026-11-06@390", at: now, s: "done" }]);
  });
});

describe("ledger", () => {
  const now = at("2026-11-06", "12:00");
  it("keeps ids and times only (no titles), prunes after 7 days and drops junk", () => {
    const s = sched(plan([rem({ id: "a", target: "task", targetId: "t", at: "2026-11-06T09:30" })], { "task:t": info({ title: "Secret loan talk" }) })).schedule;
    const led = markShown([], dueReminders(s, [], at("2026-11-06", "09:31")).show[0]!, now);
    expect(JSON.stringify(led)).not.toContain("Secret"); expect(Object.keys(led[0]!).sort()).toEqual(["at", "g", "id", "s"]);
    expect(parseLedger([...led, { id: "old", at: now - 8 * 86400_000, s: "shown" }, { id: 5 }, null, { id: "z", at: now, s: "weird" }], now)).toEqual(led);
    expect(parseLedger("nope", now)).toEqual([]);
  });
});

describe("notification text and privacy", () => {
  const notice = (privacy: TargetInfo["privacy"], title = "Pay Rahim 5000") => {
    const s = sched(plan([rem({ id: "a", target: "task", targetId: "t", at: "2026-11-06T09:30" })], { "task:t": info({ title, privacy }) })).schedule;
    return dueReminders(s, [], at("2026-11-06", "09:30")).show[0]!;
  };
  it("a personal item shows its title under a plain Reminder heading", () => {
    const t = reminderNotification(notice("personal", "Call the bank"), {});
    expect(t.title.en).toBe("Reminder"); expect(t.body.en).toBe("Call the bank");
  });
  it("worship, health, financial and third-party items are neutral unless that tick is on", () => {
    for (const p of ["worship", "health", "financial", "third_party"] as const) {
      const hidden = reminderNotification(notice(p), {}); expect(JSON.stringify(hidden)).not.toContain("Rahim"); expect(hidden.title.en).toBe("A reminder is waiting");
      expect(reminderNotification(notice(p), { [p]: true }).body.en).toContain("Rahim");
      const other = (["worship", "health", "financial", "third_party"] as const).filter((x) => x !== p)[0]!;
      expect(reminderNotification(notice(p), { [other]: true }).title.en).toBe("A reminder is waiting"); // per-category unlock
    }
  });
  it("a merged notice shows only a count, never a title", () => {
    const s = sched(plan([rem({ id: "a", target: "task", targetId: "t", at: "2026-11-06T09:30" }), rem({ id: "b", target: "task", targetId: "u", at: "2026-11-06T09:35" })],
      { "task:t": info({ title: "Secret one", privacy: "health" }), "task:u": info({ title: "Secret two" }) })).schedule;
    const n = dueReminders(s, [], at("2026-11-06", "09:30")).show[0]!; const t = reminderNotification(n, { health: true });
    expect(t.body.en).toBe("2 things soon"); expect(JSON.stringify(t)).not.toContain("Secret");
  });
  it("the text never uses punishing words", () => {
    const all = JSON.stringify(reminderNotification(notice("personal"), {})) + JSON.stringify(reminderNotification({ ids: ["a", "b"], items: [], merged: true }, {}).body);
    expect(all).not.toMatch(/failed|overdue|ব্যর্থ|বাকি পড়েছে/i);
  });
});

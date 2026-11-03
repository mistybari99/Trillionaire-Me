// Reminder rows and cards (docs/design/reminders-final-decision.md steps 5 to 8). The row lives on the item (task, plan step, habit, bill, goal,
// review). Cards on Today show reminders that came due while the app was open, and (step 7) the calm "waiting for you" card.
// Calm wording only: never red, never a count of misses, never "overdue".
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Locale } from "../i18n/registry";
import { activeNs, allRecs, ownerOf, putMode, storeOf } from "./entry";
import { prefs } from "./state";
import { virtualPlanStep, pendingReminderCards, dismissReminderCard, currentMissed, calendarSlots, ROUTE_FOR } from "./reminders";
import { icsFileName, toIcs } from "../core/ics";
import { SCHEMA_VERSION } from "../schema/entities";
import {
  HHMM, markDone, markSkipped, reminderRecord, remindersFromRecords, snooze, withReminder,
  type Placed, type Reminder, type ReminderTarget, type Slot, type SnoozeChoice,
} from "../core/reminders";
import type { TMRecord } from "../core/types";
import { settingsHash } from "./settingsRegistry";

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
const todayIso = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`; };

/** The reminder record of one item in the active mode, if any. */
export function reminderOf(target: ReminderTarget, targetId: string): { rec: TMRecord; rem: Reminder } | null {
  for (const rec of allRecs()) {
    if (rec.entity !== "reminder") continue;
    const rem = remindersFromRecords([rec])[0];
    if (rem && rem.target === target && rem.targetId === targetId && rem.state === "on") return { rec, rem };
  }
  return null;
}

const DATED = new Set<ReminderTarget>(["task", "review"]);

function whenText(rem: Reminder, lang: Locale): string {
  if (rem.target === "plan_step") return t("rem.row.planned", lang);
  if (rem.at) return rem.at.replace("T", " ");
  const day = rem.leadDays === 1 ? `${t("rem.row.day1", lang)}, ` : "";
  return `${day}${rem.timeOfDay ?? ""}`;
}

/**
 * "Remind me" on an item. Saves one `reminder` record (the target id only, no copied title). Works with the master switch off; it then says
 * how to turn reminders on. `planned`: the item has a planned time, so the "start of its planned time" choice is offered (plan steps).
 */
export function remindRow(target: ReminderTarget, targetId: string, lang: Locale, opt: { planned?: boolean; checkin?: boolean; date?: string } = {}): HTMLElement {
  const wrap = h("div", { class: "remind-row", "data-remind-row": `${target}:${targetId}` });
  const have = reminderOf(target, targetId) ?? (target === "task" && opt.planned ? reminderOf("plan_step", targetId) : null);
  if (have) {
    wrap.append(h("p", { class: "muted", "data-remind-set": "1" }, t("rem.row.set", lang, { when: whenText(have.rem, lang) })));
    if (!prefs.reminders.master) wrap.append(h("p", { class: "muted" }, t("rem.row.off", lang), " ", h("a", { href: settingsHash("prayer", "reminders") }, t("set.row.reminders", lang))));
    wrap.append(calendarButton(lang, { reminderId: have.rem.id }));
    wrap.append(h("button", { class: "btn ghost", type: "button", "data-act": "rem-remove", onclick: () => { storeOf(have.rec).delete(have.rec.id); rerender(); } }, t("rem.row.remove", lang)));
    return wrap;
  }
  const date = h("input", { id: `rd-${targetId}`, type: "date", min: todayIso(), ...(opt.date ? { value: opt.date } : {}), "aria-label": t("rem.row.date", lang), "data-rem-date": "1" }) as HTMLInputElement;
  const time = h("input", { id: `rt-${targetId}`, type: "time", value: prefs.reminders.defaultTime, "aria-label": t("rem.row.time", lang), "data-rem-time-input": "1" }) as HTMLInputElement;
  const msg = h("p", { class: "need", role: "status", "data-rem-msg": "1" });
  let planned = false; let lead: 0 | 1 = 0;
  const kind = opt.planned && target === "task" ? h("div", { class: "seg", "data-rem-kind": "1" },
    h("button", { type: "button", "aria-pressed": "true", onclick: (e: Event) => { planned = false; pick(e.currentTarget as HTMLElement); } }, t("rem.row.picked", lang)),
    h("button", { type: "button", "aria-pressed": "false", "data-rem-planned": "1", onclick: (e: Event) => { planned = true; pick(e.currentTarget as HTMLElement); } }, t("rem.row.planned", lang))) : null;
  const pick = (b: HTMLElement) => { b.parentElement?.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); };
  const save = () => {
    const ns = activeNs(); let r: Omit<Reminder, "id">;
    if (planned) r = { target: "plan_step", targetId, at: null, timeOfDay: null, leadDays: 0, state: "on", snoozedUntil: null };
    else if (DATED.has(target)) {
      if (!date.value || !HHMM.test(time.value)) { msg.textContent = t("rem.row.need", lang); return; }
      r = { target, targetId, at: `${date.value}T${time.value}`, timeOfDay: null, leadDays: 0, state: "on", snoozedUntil: null };
    } else {
      if (!HHMM.test(time.value)) { msg.textContent = t("rem.row.needTime", lang); return; }
      r = { target, targetId, at: null, timeOfDay: time.value, leadDays: target === "bill" || target === "goal" ? lead : 0, state: "on", snoozedUntil: null };
    }
    const ok = putMode(reminderRecord({ id: `rem-${target}-${targetId}`, ns, ownerId: ownerOf(ns), schemaVersion: SCHEMA_VERSION, createdAt: new Date().toISOString(), r }));
    if (!ok) { msg.textContent = t("entry.consent.need", lang); return; }
    rerender();
  };
  const leadSeg = target === "bill" || target === "goal" ? h("div", { class: "seg", "data-rem-lead": "1" },
    h("button", { type: "button", "aria-pressed": "true", onclick: (e: Event) => { lead = 0; pick(e.currentTarget as HTMLElement); } }, t("rem.row.day0", lang)),
    h("button", { type: "button", "aria-pressed": "false", "data-rem-lead1": "1", onclick: (e: Event) => { lead = 1; pick(e.currentTarget as HTMLElement); } }, t("rem.row.day1", lang))) : null;
  const form = h("div", { class: "remind-form" },
    ...(leadSeg ? [leadSeg] : []),
    ...(kind ? [kind] : []),
    ...(DATED.has(target) ? [h("label", { for: date.id }, t("rem.row.date", lang)), date] : []),
    h("label", { for: time.id }, t("rem.row.time", lang)), time, msg,
    h("button", { class: "btn", type: "button", "data-act": "rem-save", onclick: save }, t("rem.row.save", lang)));
  wrap.append(h("details", { class: "help" }, h("summary", {}, t(opt.checkin ? "rem.row.checkin" : "rem.row.add", lang)), form));
  if (!prefs.reminders.master) wrap.append(h("p", { class: "muted", "data-rem-off": "1" }, t("rem.row.off", lang), " ", h("a", { href: settingsHash("prayer", "reminders") }, t("set.row.reminders", lang))));
  return wrap;
}

// ---- phone calendar (.ics) ----

/** Starts a file download from text. */
function download(name: string, text: string) {
  const a = h("a", { href: URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" })), download: name });
  document.body.append(a); a.click(); a.remove();
}

/**
 * "Add to phone calendar". One reminder (`reminderId`) or the next 30 days. Needs no permission and works with the master switch off.
 * Before the first export one calm line and a tap. Titles are neutral for sensitive items unless that detail tick is on (core/ics).
 */
export function calendarButton(lang: Locale, o: { reminderId?: string } = {}): HTMLElement {
  const wrap = h("div", { class: "cal-export", "data-cal-export": o.reminderId ?? "month" });
  const msg = h("p", { class: "muted", role: "status", "data-cal-msg": "1" });
  const run = () => {
    const now = Date.now(); const slots = calendarSlots(now, lang, o.reminderId ? 60 : 30, o.reminderId);
    if (!slots.length) { msg.textContent = t("rem.cal.none", lang); return; }
    const day = new Date(now).toISOString().slice(0, 10);
    try { download(icsFileName(o.reminderId ? "one" : "month", day), toIcs(slots, { details: prefs.notifyShow, nowMs: now, lang, demo: activeNs() === "demo" })); msg.textContent = t("rem.cal.once", lang); }
    catch { msg.textContent = t("rem.cal.none", lang); }
  };
  const start = h("button", { class: "btn ghost", type: "button", "data-act": o.reminderId ? "cal-one" : "cal-month", onclick: () => {
    if (prefs.icsConsent) { run(); return; }
    start.setAttribute("hidden", "");
    wrap.append(h("div", { class: "note", "data-cal-consent": "1" }, h("p", {}, t("rem.cal.consent", lang)),
      h("button", { class: "btn", type: "button", "data-act": "cal-go", onclick: (e: Event) => { prefs.icsConsent = true; (e.currentTarget as HTMLElement).parentElement?.remove(); start.removeAttribute("hidden"); run(); } }, t("rem.cal.go", lang))));
  } }, t(o.reminderId ? "rem.cal.add" : "rem.cal.month", lang));
  wrap.append(start, msg);
  return wrap;
}

// ---- actions on a due or missed reminder ----

/** Done, Later (hour / tomorrow) or Skip for one slot. Writes the reminder record and the ledger; never marks the item itself done. */
export function actOnSlot(slot: Slot, action: "done" | "skip" | SnoozeChoice, nowMs: number = Date.now()): boolean {
  let rec = allRecs().find((r) => r.id === slot.reminderId); let rem = rec ? remindersFromRecords([rec])[0] : undefined;
  if (!rec && slot.target === "plan_step" && slot.reminderId === virtualPlanStep(slot.targetId).id) { // plan-start reminder with no record yet: store one now
    const ns = activeNs(); rem = virtualPlanStep(slot.targetId);
    rec = reminderRecord({ id: rem.id, ns, ownerId: ownerOf(ns), schemaVersion: SCHEMA_VERSION, createdAt: new Date(nowMs).toISOString(), r: rem });
    if (!putMode(rec)) return false;
    rec = allRecs().find((r) => r.id === slot.reminderId);
  }
  if (!rec || !rem) return false;
  const p = prefs.reminders; const ledger = prefs.remindersFired;
  const res = action === "done" ? markDone(rem, slot.id, ledger, nowMs) : action === "skip" ? markSkipped(rem, slot.id, ledger, nowMs) : snooze(rem, slot.id, action, ledger, nowMs, p);
  storeOf(rec).put(withReminder(rec, res.reminder));
  prefs.remindersFired = res.ledger;
  return true;
}

function actions(slot: Slot, onDone: () => void, lang: Locale): HTMLElement {
  const b = (key: "rem.act.done" | "rem.act.hour" | "rem.act.tomorrow" | "rem.act.skip", act: "done" | "skip" | SnoozeChoice, ghost = true) =>
    h("button", { class: ghost ? "btn ghost" : "btn", type: "button", "data-rem-act": act, onclick: () => { actOnSlot(slot, act); onDone(); } }, t(key, lang));
  return h("div", { class: "btn-row", "data-rem-actions": "1" }, b("rem.act.done", "done", false), b("rem.act.hour", "hour"), b("rem.act.tomorrow", "tomorrow"), b("rem.act.skip", "skip"));
}

/** Text of an in-app card. The app is open and the person is looking, so the item's title is shown; worship items stay neutral unless that tick is on. */
export function cardTitle(s: Slot, lang: Locale): string {
  return s.privacy === "worship" && prefs.notifyShow.worship !== true ? t("rem.card.waiting", lang) : s.title;
}

/** One card on Today for reminders that came due while the app was open. Null when there are none. */
export function remindersTodayCard(lang: Locale): HTMLElement | null {
  const items = pendingReminderCards().flatMap((n) => n.items);
  if (!items.length) return null;
  return h("section", { class: "card", "data-reminder-cards": String(items.length), role: "status", "aria-label": t("rem.title", lang) },
    h("h2", { class: "card-h" }, t("rem.title", lang)),
    ...items.map((s) => h("article", { class: "remind-item", "data-reminder-card": s.id },
      h("p", {}, h("strong", {}, cardTitle(s, lang))),
      h("a", { href: ROUTE_FOR[s.target], class: "crumb" }, t("rules.open", lang)),
      actions(s, () => { for (const n of pendingReminderCards()) if (n.ids.includes(s.id)) dismissReminderCard(n.ids[0]!); rerender(); }, lang))));
}

/**
 * The calm "waiting for you" card: reminders that passed while the app was closed or in the background. Plan-step and habit ones expire after
 * 24 hours, the rest after 7 days (core). No count, no red, no "overdue". Deen items appear only when the worship detail tick is on.
 */
export function missedTodayCard(lang: Locale): HTMLElement | null {
  const items: Placed[] = currentMissed();
  if (!items.length) return null;
  return h("section", { class: "card", "data-missed-card": "1", role: "status", "aria-label": t("rem.missed.title", lang) },
    h("h2", { class: "card-h" }, t("rem.missed.title", lang)),
    ...items.map((s) => h("article", { class: "remind-item", "data-missed": s.id },
      h("p", {}, h("strong", {}, cardTitle(s, lang))),
      actions(s, rerender, lang))));
}

export type { Placed };

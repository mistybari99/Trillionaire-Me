# Reminders: proposal A (honest web scheduling, small commits)

Status: proposal only, nothing built. Author: expert A. Read: `CLAUDE.md`, `settings-final-decision.md`, `src/core/notify.ts` (O8 lock-screen rule), `src/core/prayerAlerts.ts`, `src/core/prayerSound.ts`, `src/ui/prayerAlerts.ts`, `public/sw.js`, `src/core/planner.ts`, `src/core/timeBlocks.ts`, `src/core/team.ts`, `src/catalog/fields.ts`, `src/ui/settingsRegistry.ts`, `docs/azan.md`, `docs/design/at-rest-encryption.md`.

## বাংলা সারাংশ

- রিমাইন্ডার = কাজ, হ্যাবিট, বিল, লক্ষ্যের তারিখ, রিভিউ-এর জন্য "কখন মনে করাব" ঠিক করা। সময় ব্যবহারকারী নিজে বেছে নেবে।
- সত্যি কথা: অ্যাপ বন্ধ থাকলে ফোন নোটিফিকেশন **নিশ্চিত নয়**। কোনো সার্ভার নেই, তাই ওয়েব পিডব্লিউএ নিজে থেকে ঘুম ভাঙাতে পারে না। আমরা এটা সরল ভাষায় বলব, লুকাব না।
- ধাপ: (১) নোটিফিকেশন ট্রিগার থাকলে (সীমিত) ফোনের নোটিফিকেশন, (২) না থাকলে অ্যাপ খুললে "মিস হওয়া রিমাইন্ডার" কার্ড (লাল নয়, শান্ত), (৩) খোলা অ্যাপে ব্যানার, (৪) সবচেয়ে নির্ভরযোগ্য: ফোনের ক্যালেন্ডারে `.ics` ফাইল যোগ করা।
- সেটিংসে নতুন সারি "রিমাইন্ডার": মাস্টার সুইচ (ডিফল্ট বন্ধ), শান্ত সময় (কোয়াইট আওয়ার), লক-স্ক্রিনে শুধু সাধারণ লাইন।
- স্নুজ ও "হয়েছে" এক ট্যাপে। মিস হলে শাস্তি, রেড, স্ট্রিক নেই। ওভারলোড মোডে নতুন রিমাইন্ডার যোগ হয় না।
- ইসলামিক/স্বাস্থ্য/টাকার রিমাইন্ডারের লেখা লক-স্ক্রিনে সবসময় নিরপেক্ষ, যতক্ষণ না ওই ক্যাটাগরির "বিস্তারিত দেখান" চালু।

---

## 1. What is possible on the web (honest table)

No server, no push service (D-B, D-C). So only things the phone itself can do locally.

| Mechanism | Android Chrome (installed PWA) | iOS Safari (installed to Home Screen) | Desktop Chrome/Edge | Closed app? |
|---|---|---|---|---|
| `registration.showNotification()` from open page or SW (what prayer alerts use now) | Works | Works only after install + permission tap (iOS 16.4+) | Works | Only fires when code runs, so not while closed |
| Notification Triggers (`TimestampTrigger`, `showTrigger`) | Was an origin trial, withdrawn; **not shipped**. Treat as "maybe". Feature-detect: `"showTrigger" in Notification.prototype` | No | No | Would fire while closed, if present |
| Periodic Background Sync (`periodicSync`) | Chrome only, installed, browser decides rhythm (about 12h+), not on time | No | Chrome, same limits | Too coarse for "at 9:00"; useful only as a catch-up |
| Page timer (`setInterval`, as `startPrayerAlerts` does every 30 s) | Works while app open or recently backgrounded | Same, killed when suspended | Works while tab alive | No |
| Web Push | Needs server | Needs server | Needs server | **Out of scope** (no server, D-C) |
| Add to phone calendar via `.ics` file | Works (calendar app owns the alarm) | Works | Works | **Yes, fully reliable** |

Plain consequence: with no server, **the only reliable closed-app alarm is the phone's own calendar/alarm app**. Everything else is best effort. The app says so in one calm line on the Reminders settings page: "When the app is closed, phones may not show this on time. For important ones, add to your phone calendar."

## 2. Fallback ladder (decided per reminder at fire time; all offline)

1. **OS notification via `showTrigger`** if feature-detected and permission granted: SW-registered `TimestampTrigger` notification (`reg.showNotification(title,{showTrigger:new TimestampTrigger(ms),tag,data})`). Written once, harmless if absent. Not relied upon.
2. **Open-app notification** (same `showPhone()` path as prayer alerts) when the app is open or foreground: check every 30 s plus on `visibilitychange`, exactly as `startPrayerAlerts` does. Optional catch-up in SW on `periodicsync` tag `tm-reminders` (Chrome only).
3. **Next-open "Missed reminders" card** (calm): on app start/visible, everything with `fireAt <= now`, not done, not snoozed, not older than 7 days is listed once on Today. Wording: "These were waiting for you" with buttons Done / Later / Skip. Never red, never counts, never "overdue by N days".
4. **In-app banner** (existing `inAppReminders()` card list in `src/app.ts`) when notification permission is not granted.
5. **Calendar export (.ics)** offered next to every reminder and in bulk ("Add next 30 days to my phone calendar"): the reliable closed-app path. Pure text file generation, saved to device, nothing leaves the phone.

Rule: a reminder is delivered **once** (delivered-ids set per Dhaka day like `prayerFired`); the same reminder reached by rung 2 and later rung 3 is not shown twice.

## 3. Data model

Decision: **one `reminder` entity that points at a target**, not new fields on every entity. Reasons: one place for permission/quiet/snooze logic, no schema change to task/habit/goal/bill/review (catalog stays stable), a task can have zero or many reminders, backup/CSV already handle any entity. Fields live in `src/catalog/fields.ts` (new family `FAM-REM`), schemaVersion bump with a no-op migration note.

```
reminder (entity)
  reminder.target_entity  choice  task|habit|goal|bill|review|card|handover|custom
  reminder.target_id      text    id of the record (null for custom)
  reminder.title          text    only for custom; otherwise read from target
  reminder.anchor         choice  at | before_due | daily_at | weekly_on | monthly_on
  reminder.at             text    ISO local datetime, Dhaka (anchor=at)
  reminder.time_of_day    text    "HH:MM" (daily_at/weekly_on/monthly_on, and for date-only targets)
  reminder.weekdays       list    0-6 (weekly_on)
  reminder.day_of_month   number  1-28 (monthly_on; 29-31 clamp to last day, stated in UI)
  reminder.lead_minutes   number  minutes before the target date/time (before_due), 0 = at the time
  reminder.repeat         choice  none|daily|weekly|monthly   (derived from anchor, kept for CSV clarity)
  reminder.until          date    optional end date for repeats
  reminder.channel        choice  notify|inapp|calendar_only   (default notify; falls down the ladder if unavailable)
  reminder.state          choice  on|paused|done
  reminder.snoozed_until  text    ISO datetime or null
  reminder.last_fired_at  text    ISO datetime or null
  reminder.created_by_rule boolean true when auto-suggested (e.g. goal date), so undo is easy
```

Per source, where the date already exists (so we reuse it, not duplicate it):

| Source | Existing field to anchor on | Default offered | Privacy class for lock screen |
|---|---|---|---|
| Task | `task.plan_by` (and M08 placement when scheduled) | `before_due`, 60 min, time-of-day 09:00 if date-only | `personal` (neutral text by default unless the task is tagged) |
| Habit | `habit.days` / `habit.days_per_week` | `daily_at` or `weekly_on` using the habit's days | `personal`; health habits `health` |
| Bill | `finance.on` (kind=bill) or `finance.period` | `before_due` 1 day, 09:00 | `financial` |
| Goal date | `goal.target_date` | `before_due` 7 days, then 1 day (two reminders) | `personal` |
| Review | `risk.review_on`, `stage_gate.review_on`, weekly/monthly review day | `at` 18:00 | `personal` |
| Card | `card.due` | not auto; opt-in only | `personal` |
| Handover (M10) | `handover.due` | opt-in, see section 9 | `third_party` |

Pure core (no UI imports), new file `src/core/reminders.ts`:

```ts
export interface ReminderSlot { id: string; reminderId: string; fireAt: number /*epoch ms*/; title: Bi; privacy: PrivacyClass; targetRoute: string }
export interface ReminderPrefs { master: boolean; quiet: { on: boolean; from: string; to: string }; defaultTime: string; defaultLeadMin: number; snoozeMin: number; calendarPrompt: boolean }
export const DEFAULT_REMINDER_PREFS: ReminderPrefs;   // master:false, quiet 22:00-07:00 on, defaultTime "09:00", lead 60, snooze 15
export function parseReminderPrefs(raw: unknown): ReminderPrefs;               // fails closed like parseAlertPrefs
export function expandReminders(records: TMRecord[], from: number, to: number, p: ReminderPrefs, ctx: { mode: CapacityMode }): ReminderSlot[];
export function applyQuietHours(slot: ReminderSlot, p: ReminderPrefs): ReminderSlot | null;   // moves fireAt to quiet.to, never drops
export function dueReminders(nowMs: number, slots: ReminderSlot[], delivered: ReadonlySet<string>, windowMin?: number): ReminderSlot[];
export function missedReminders(nowMs: number, slots: ReminderSlot[], delivered: ReadonlySet<string>, maxAgeDays?: number): ReminderSlot[];
export function snooze(r: TMRecord, nowMs: number, minutes: number): TMRecord;
export function markDone(r: TMRecord, nowMs: number): TMRecord;
export function toIcs(slots: ReminderSlot[], opts: { details: boolean }): string;   // RFC 5545, VALARM at 0, UTC offsets from Asia/Dhaka
export function reminderNotification(slot: ReminderSlot, notifyPrefs: NotifyPrefs): { title: Bi; body: Bi }; // wraps buildNotification
```

Unknown is never 0: a task with no `plan_by` yields no slot (not "due now"); a bill with no amount still reminds on its date, amount line omitted.

UI/adapters, new `src/ui/reminders.ts` (like `src/ui/prayerAlerts.ts`): `startReminders()`, `checkReminders(nowMs)`, `deliverReminder(slot)`, `reminderCapability(): {notify:'unsupported'|'denied'|'ask'|'granted'; trigger:boolean; periodicSync:boolean; installed:boolean}`. SW additions in `public/sw.js`: `notificationclick` (focus app, open `targetRoute`), `notificationclick` actions `done`/`snooze` (post a message to the page, or when no page is open, write to IndexedDB `tm-reminder-outbox`, applied on next open), `periodicsync` catch-up. Keep the existing cache logic untouched.

Prefs live in `prefs.reminders` (state.ts) with storage key `tm:ui:reminders`, delivered ids in `tm:ui:remindersFired` (same pattern as `prayerFired`).

## 4. Permission flow

- Master switch is **off by default**. Turning it on does not ask the browser yet.
- First time a person saves a reminder with channel `notify`, show one calm card: "To show reminders on your phone, allow notifications. You can skip: reminders will then wait inside the app." Buttons: Allow / Not now. The browser prompt is called only from that tap (required on iOS).
- Result states reuse `notifyState()`: `granted` normal; `denied` shows how to change it in phone settings and keeps rung 3/4/5 working; `unsupported` (iOS Safari tab, not installed) shows "Add to Home Screen first" with the two-step guide and offers `.ics`.
- No nagging: the permission card appears at most once per reminder-creation session; "Not now" is remembered.
- Capability line in Settings is computed, never a fixed claim ("Phone notifications: allowed. Works while app is open. Closed-app timing: not guaranteed.").

## 5. Quiet hours and master switch (Settings)

Settings registry (`src/ui/settingsRegistry.ts`), category **`prayer`** is "Prayer & alerts" (নামাজ ও অ্যালার্ট). Reminders are not prayer, but the owner-approved category 2 is the alert home; to avoid a 9th category (decision says 8 categories) add rows there and rename the category label to "Alerts" (নামাজ ও অ্যালার্ট stays in the Bangla name via the existing label). Rows:

```
R("reminders",     "prayer", "set.row.reminders",     "#/settings/prayer/reminders",     ["reminder","notification","remind","alarm","snooze","calendar"], ["reminders"], ["tm:ui:reminders","tm:ui:remindersFired"]),
R("remindersquiet","prayer", "set.row.remindersquiet","#/settings/prayer/remindersquiet",["quiet hours","night","sleep","silent"], [], []),   // part of the reminders pref object, same screen anchor
```

The registry test already requires every prefs field to be owned by exactly one row, so `reminders` is owned by `reminders` only. Lock-screen detail stays owned by the existing `lockscreen` row (`notifyShow`); the reminders page shows a read-out link to it ("Lock screen shows: a plain line") and does **not** duplicate the switch. Quiet hours: default 22:00 to 07:00, reminders inside are held until the end (not dropped); prayer alerts ignore quiet hours (they have their own on/off). New `Key`s in `packs.ts` for en and bn (mix derived) plus a loanword check.

## 6. Snooze and done, one tap

- Notification actions (`actions:[{action:"done"},{action:"snooze"}]`, Android Chrome only; iOS shows none): `done` sets `reminder.state=done` (or advances a repeating one), `snooze` sets `snoozed_until=now+snoozeMin`. Tapping the body opens the target route.
- In-app card and missed card: same two buttons plus "Skip this time". Skipping a repeat never creates debt.
- Snooze presets 10 min / 1 hour / this evening / tomorrow morning. No "ignored N times" counter anywhere.
- Done on a reminder does not complete the task; it only closes the reminder. A second button "Mark task done" appears if the target is a task (explicit, avoids false history).

## 7. Interaction with prayer alerts and M08 time blocks

- Prayer alerts stay a separate, unchanged engine (`alertSlots`, `prayerFired`). Reminders reuse `showPhone`, `buildNotification`, `notifyText`, and the 30 s ticker by registering a second check in the same timer, not a second timer.
- A reminder whose `fireAt` falls inside +/- 2 minutes of a prayer alert is moved after it by 3 minutes, so two buzzes never stack. Reminders never fire inside a prayer **block** (M08 `timeBlocks`, kinds prayer/family/rest): they are held to the block end (same helper as quiet hours: `applyQuietHours` takes extra blocked intervals from `blocks`). This keeps "worship/family/rest windows are never used" true for notifications too.
- A scheduled task placement from `schedule()` (M08 placements) can offer a default reminder "at start" or "10 min before start". The reminder stores the task id, not the time, so when `schedule()` re-plans the reminder follows the new placement (`expandReminders` reads the current plan).
- Overload mode (`mode` = `minimum_week` or `pause`): no new reminders are suggested or auto-created, existing ones for non-top tasks are held (state stays `on`, nothing fires); `pause` holds all except prayer and bills marked "must". Held reminders resume when the mode returns to normal, with no "missed" card for the held period.

## 8. Plan versions (M12)

- Reminders belong to the live plan. When a plan version is saved (`plan_version.snapshot`) the reminders are included in the snapshot like any entity, and restoring a version restores them.
- Switching to another plan option or restoring recomputes slots from the restored records; delivered-ids older than the switch are cleared for changed targets, to avoid silent reminders that were "already delivered" for a different plan.
- A "Before restore" snapshot already exists (settings decision); reminders ride along. `scrubRealParts` must also strip `reminder` records of real data on Clear real.

## 9. Hand-over (M10): someone else's tasks

- A handed-over task (`isDelegatedTask`, holder `someone`) gets **no** default reminder to me. Optional "check in on this" reminder is anchored on `handover.due`, wording neutral ("Check how the handed-over task is going"), privacy `third_party`, lock-screen neutral by default.
- Nothing is sent to the other person (nothing leaves the device). The `.ics` export for a handover is the person's own calendar entry; the title never contains the other person's name unless "show details" for third_party is on.
- Unknown holder is not treated as "covered". Open tasks (holder `open`) get no reminders.

## 10. Deen privacy rules

- Deen items (prayer log, fast, deen_plan.due, zakat hawl) use privacy `worship` or `health` and go through `buildNotification`: lock screen shows `NEUTRAL_TITLE` / `NEUTRAL_BODY` ("A reminder is waiting") unless `notifyShow.worship` is on.
- No piety score, no streak, no "you missed fajr" wording ever. A missed Deen reminder is simply not in the missed card unless the person opted in for that category; default is it quietly lapses.
- No scripture text in any reminder (D-D). Fast / zakat reminders are date nudges only, no rulings.
- `.ics` export of worship/health/financial/third_party items uses the neutral title by default; a visible tick "Include details in the calendar file" per category, off by default, with the note that the phone calendar may sync to a cloud the person controls (so the app warns calmly before the file is created).
- Reminder records for real data go through the existing D-B consent gate (`guardWrite`); demo reminders are labelled DEMO and never reach the `.ics` or notification path.
- At-rest encryption note (`at-rest-encryption.md`): reminder `title` for custom reminders is a real value blob like any other and would be encrypted in the same future change. Notification text is **not** encrypted on the OS side; this is a reason the neutral default matters.

## 11. Tests

Pure (vitest, fake clock via `vi.useFakeTimers()` and `vi.setSystemTime`, matching `dhakaNow(nowMs)` injection):
- `expandReminders`: anchors (at, before_due, daily, weekly, monthly clamp 31->last day), unknown date -> no slot, `until`, paused/done excluded.
- `applyQuietHours`: wraps midnight, holds not drops; prayer-block and prayer-alert collision shifting; `minimum_week`/`pause` hold.
- `dueReminders`/`missedReminders`: window, once-only with delivered set, 7-day cap, snooze, repeat advance after done.
- `reminderNotification`: worship/health/financial/third_party are neutral by default and unlocked per category; custom text never leaks.
- `toIcs`: valid VCALENDAR/VEVENT/VALARM, Asia/Dhaka (UTC+6, no DST), CRLF + 75-octet line folding, escaped commas/semicolons, Bangla UTF-8, neutral titles by default.
- Registry test: new rows own `reminders` pref exactly once; link-check test for new routes; `packs` en/bn key parity; loanword test.
- Migration: schemaVersion bump with existing data keeps all records.

jsdom UI: `checkReminders(now)` with `Notification` stubbed to `granted`/`denied`/missing and `serviceWorker.getRegistration` stubbed: ladder picks showNotification, then in-app card, then missed card; one delivery per slot; `showTrigger` path only when `"showTrigger" in Notification.prototype`. Missed card has no red class and no count text (assert absence of `danger`/`red`/"overdue" in DOM and packs).

E2E (Playwright if the repo has it; otherwise manual): permission prompt only after the Allow tap; fake time via `page.clock`; SW `notificationclick` flow; `.ics` download. Real closed-app delivery **cannot** be asserted in CI, so it is a manual phone test (section 12). Do not mark any "closed-app" requirement Verified from CI.

## 12. Phone test checklist for the owner

1. Android Chrome, app installed: master On, make a task reminder 2 minutes ahead, keep app open: notification appears, tap opens the task. (Expect pass.)
2. Same, then press Home so the app is in the background for 1 minute: note whether it still shows. (Report only; either result is fine.)
3. Same, swipe the app away (closed): note whether it shows. (Expect usually no. This is the honest result.)
4. Open the app 10 minutes later: "These were waiting for you" card is calm, no red, buttons work.
5. Tap Done and Snooze 10 min on a notification (Android); on iPhone check that tapping the notification opens the app.
6. iPhone: Add to Home Screen first, then Allow; repeat step 1. Without install, the app should say "Add to Home Screen first".
7. Quiet hours: reminder at 23:00 appears after 07:00 and not at night.
8. Bill reminder with lock screen: shows "A reminder is waiting" only. Turn on financial details: shows the line.
9. Add to calendar (.ics) for one reminder; the phone calendar alarm rings at the time with the app closed. This is the reliable path.
10. Prayer alert and reminder within 2 minutes: two notifications do not buzz together.

## 13. Risks

- Owner expects closed-app alarms. Mitigation: honest wording, `.ics` as the first-class reliable option, phone test steps 2 and 3 set expectations early.
- iOS suspends timers. Mitigation: missed-card on next open; never claim "will remind you".
- `showTrigger` may never ship. Mitigation: feature-detected, off the critical path; remove later without migration.
- Reminder fatigue / pressure. Mitigation: master off by default, quiet hours, no counters, no escalation, overload holds.
- Privacy leak through notifications or `.ics` to a cloud calendar. Mitigation: neutral defaults, explicit per-category ticks, warn before file creation.
- Clock/timezone: Dhaka fixed (`dhakaNow`); if the phone timezone differs, `.ics` uses `TZID=Asia/Dhaka` and the UI shows the Dhaka time. Note it, do not guess.
- Duplicate delivery between tabs: `crossTab.ts` exists; keep delivered-ids in prefs and re-read before firing.
- Schema creep: one entity only; no per-entity field changes.

## 14. Build order (each commit end to end, tested, linked)

1. **Core**: `src/core/reminders.ts` + catalog fields + migration note + pure tests (expand, quiet, due, missed, snooze, done). No UI.
2. **Settings**: prefs, registry rows, `#/settings/prayer/reminders` page (master, quiet hours, default time, capability line, link to lock-screen setting), en/bn keys, registry + link-check tests. Master off, nothing fires yet.
3. **Delivery**: `src/ui/reminders.ts` (check in the existing timer, ladder rungs 2/3/4, permission card), SW `notificationclick`, jsdom tests with fake clock.
4. **Task + bill + goal-date create flows**: "Remind me" row on each (reuse existing date), shown in Today; "Missed reminders" calm card on Today; Done/Snooze buttons.
5. **Habit + review reminders** (daily/weekly anchors).
6. **Calendar export**: `toIcs`, per-reminder and bulk "next 30 days", privacy tick, tests.
7. **Interactions**: prayer-alert spacing, M08 block holds, overload hold, M12 snapshot restore recompute, M10 handover check-in, `scrubRealParts` update.
8. **Polish + owner phone test** (section 12); record results in Register as evidence only if done on a real phone.
9. **Optional last**: SW `showTrigger` registration and `periodicsync` catch-up, behind feature detection.

## 15. What NOT to build

- Any server, Web Push, cloud sync, email/SMS, or third-party reminder service (D-C, D-B).
- Any claim of "guaranteed" or "always on time" closed-app delivery; no fake background loop (a silent audio tab trick, wake locks, battery-draining polling).
- Streaks, "missed N reminders", red or overdue styling, escalating repeated nagging, guilt copy, leaderboards.
- Auto-created reminders in overload mode; auto-created reminders for Deen items; reminders that name health, money or third parties on the lock screen by default.
- Per-field reminder columns on every entity, a second notification pipeline beside `src/core/notify.ts`, or a second timer.
- AI-written reminder text or "smart timing".
- Native/Capacitor background alarms now. Only revisit if G2 device tests fail and the owner wants closed-app reliability; record in `DECISIONS_LOG.md` (a native wrapper is the real fix for alarms, but it is a stack change).

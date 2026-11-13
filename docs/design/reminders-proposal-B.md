# Reminders: proposal B ("honest nudges")

Status: proposal only, nothing built. Author: expert B. Read: CLAUDE.md, settings-final-decision.md, `src/core/notify.ts` (note: there is no `src/adapters/notify.ts`; the privacy rule lives in core), `src/core/prayerAlerts.ts`, `src/ui/prayerAlerts.ts`, `public/sw.js`, `src/core/planner.ts`, `src/catalog/fields.ts`, `docs/azan.md`.

## বাংলা সারাংশ
- একটি অ্যাপ বন্ধ থাকলে ব্রাউজার নিজে থেকে নোটিফিকেশন দিতে পারে না (সার্ভার ছাড়া)। তাই "প্রতিটি কাজে রিমাইন্ডার" বানালে ফোনে অনেক সময় বাজবে না, আর মালিক ভাববেন অ্যাপ ভুল।
- আমি বানাব ৪টি সহজ জিনিস: (১) দিনে ১-২ বার "আজকের প্ল্যান" নাজ, শুধু সংখ্যা; (২) শুধু "গুরুত্বপূর্ণ" চিহ্ন দেওয়া কাজের আগে নাজ; (৩) ফোনের নিজের ক্যালেন্ডারে .ics ফাইল (এটাই একমাত্র নির্ভরযোগ্য অ্যালার্ম); (৪) অ্যাপ খুললে "যা মিস হয়েছে" কার্ড, নরম ভাষায়।
- স্নুজ, রিপিট নিয়ম, লিড-টাইম পিকার বানাব না। কঠিন, আর ব্যবহারকারী ব্যবহার করবে না।
- সব ডিফল্ট বন্ধ। দিনে সর্বোচ্চ ৪টি নোটিফিকেশন। লক স্ক্রিনে শুধু "একটি রিমাইন্ডার অপেক্ষা করছে"।

## 1. The honest premise

A static PWA with no server cannot wake a closed app. Facts, not guesses:

| Platform | App open or recently backgrounded | App closed / swiped away |
|---|---|---|
| Android Chrome (installed or tab) | `registration.showNotification()` works with permission. Timers (`setTimeout`) are throttled/frozen after a few minutes in background. | Nothing fires. The old Notification Triggers (`showTrigger`/TimestampTrigger) experiment was removed from Chrome and must not be relied on. Periodic Background Sync exists only for installed PWAs with high engagement, runs at the browser's whim (roughly once per 12+ hours), cannot hit an exact minute. Treat as bonus, never as the promise. |
| iOS 16.4+ installed PWA (Add to Home Screen) | Notifications need the app installed to the Home Screen and permission asked from a tap. Works while open. | No local scheduling, no background sync. Web Push needs a push server, which is excluded. So: nothing fires. |
| iOS Safari tab | No notifications at all. | None. |
| Desktop Chrome/Edge | Works while a tab/window exists. | Nothing unless the browser is running. |

What truly works with zero server: (a) notifications the app shows while it is open or just opened; (b) the phone's own calendar app, which is a real OS-level alarm system that already works offline and when everything is closed. The prayer alerts (M13) already follow (a): `dueSlots` has a 5-minute catch-up window and falls back to an in-app card. This proposal keeps that pattern and adds (b).

Consequence: the Settings screen must say in one plain line, "Phone alerts work while the app is open. For alarms when the app is closed, add it to your phone calendar." Never promise more. This is a Hard Rule 6 matter (no false claims).

## 2. What I would build (four things, in order of value)

1. **Calendar export (.ics)**: the reliable route. A button "Add today's plan to phone calendar" and "Add this task to calendar" (per important item). Opens the phone's calendar with VEVENTs including a VALARM (pre-set 10 minutes before, one alarm only, no picker). No network, no account. Android: downloaded `.ics` opens in Google Calendar/Samsung Calendar; iOS: opens "Add to Calendar" sheet. Limits: one-shot import, so later edits in the app do not update the calendar. Say so in the confirmation line. Export title is the neutral text unless "show details" is on for that category (see section 6).
2. **Daily plan nudge**: one or two times per day chosen by the person (default off; suggested 08:00 and 20:00 when switched on). Text lists counts only: "Today: 3 steps planned" / "আজ ৩টি কাজ"; never names, never amounts. Zero planned means no nudge (skip silently, no "you have nothing" message). Unknown capacity is not 0: if `planner` returns deferred `unknown_capacity`, say "Open the app to set up today".
3. **Important-task nudge**: a single "Remind me before" yes/no mark on a task or plan step, fixed lead time 30 minutes (one global value in Settings, 15/30/60 as a 3-option seg; no per-item lead time). Only items with a start time (a `Placement` from `planner.schedule`, or a Deen plan time) qualify. No repeat rule: the plan already regenerates daily; a repeating item is just the planner placing it again.
4. **Missed card on next open**: "While the app was closed, 2 nudges passed" with a calm line and one button "Show today". Not a list of failures, no red, no counts of "missed tasks", no streaks. Auto-clears after 24 h or one tap. Items remain in the plan untouched. Never auto-reschedules (overload mode adds no tasks).

## 3. Challenge: per-item rules, snooze, lead-times

| Feature | Verdict | Why |
|---|---|---|
| Per-item repeat rules | Cut | The planner already places recurring work each day; a second repeat engine duplicates it and can disagree (a task marked done still nags). Test surface large (DST none in Dhaka, but month ends, weekdays, edits). |
| Snooze | Cut | Needs a notification action button and a service-worker handler that works only while the SW is alive; on iOS it is unreliable. The substitute is free: the missed card plus the daily nudge. |
| Per-item lead times | Cut | A picker per item is a form field the person must understand. One global lead (15/30/60) is enough. |
| Per-item reminder on every task | Cut | Spam source; trains the person to ignore. Importance flag forces a choice. |
| Importance mark | Keep | One tap, a star in the row; max 5 marked items active per day (6th is refused with a calm line: "Five is plenty for one day"). |
| Sound/vibration | Keep default off; vibrate only | Reuses prayer sound pref style, but no new audio. |

If the owner later asks for snooze, add it as "remind me in 1 hour" for the open-app case only, behind a flag. Not now.

## 4. Anti-spam limits (all enforced in core, tested)

- Global cap: at most **4 reminder notifications per day** (daily nudge x2 + important x2), prayer alerts are counted separately and never suppressed by this cap (prayer has its own switches). When capped, extras fold into the missed card, no extra notification.
- No two reminder notifications within **20 minutes** of each other; the later merges into one line ("2 things soon").
- Quiet hours default 22:00 to 06:00; nothing shown inside them; nudges due inside are held and shown as the missed card at open. Prayer alerts ignore reminder quiet hours (they have their own switches) but never double up with a nudge in the same 20-minute window: prayer wins.
- Every reminder kind is off by default. Master switch off means zero notifications and no permission prompt.
- Ten ignored nudges in a row (no open within 24 h after each): the daily nudge suggests itself off once ("Pause these nudges?"), never switches off silently, never re-prompts for 30 days.
- No notification when the app is already focused: show the in-app card instead.

## 5. Data model (additive, schema versioned; needs a migration note)

Settings key `tm:prefs:reminders` (localStorage, like `prayerAlerts`; real-data neutral, contains no personal text):
```
RemindPrefs { master: boolean; daily: { on: boolean; times: [HHmm] | [HHmm,HHmm] };
  important: { on: boolean; leadMin: 15|30|60 }; quiet: { from: HHmm; to: HHmm };
  sound: boolean; ics: { alarmMin: 10 } }   // all default off / values above
```
Per-item: one boolean `important?: boolean` added to the task/plan-step record (optional field, absent = false; catalog version bump, no data rewrite). Nothing else per item. A small ledger table `reminderLog { id: "2026-11-03-daily-0800" | "...-imp-<itemId>"; shownAt?; state: "shown" | "held" | "capped" }` in IndexedDB, pruned after 7 days, used for dedupe (same idea as `delivered` in prayerAlerts) and for the missed card. The log stores ids and times only, never titles. Backup: prefs are included; the log is excluded (disposable).

Pure core module `src/core/reminders.ts` (no UI/network): `remindSlots(date, plan, prefs)`, `applyLimits(slots, log, prefs)`, `dueNow(nowMinute, slots, log, windowMin = 15)`, `missedSince(lastOpen, log)`. Reuses the `AlertSlot` shape and the `dueSlots` window idea. Adapter `src/ui/remindDeliver.ts` shows via `registration.showNotification` if permitted, else an in-app card. `src/core/ics.ts` builds the calendar text (pure string, CRLF, escaped, UID stable per item+date, DTSTAMP from an injected clock).

## 6. Privacy and lock screen

All text goes through the existing `buildNotification` (MR-14): neutral "A reminder is waiting / Open the app to see it" unless the category's "show details" is on. The daily nudge is a count and is classed `generic` (safe), but still never lists names. Important items inherit their record's privacy class: worship/health/financial/third_party stay neutral by default, in notifications and in the .ics (the calendar entry is then titled "Reminder" with no description; a calendar syncs to cloud accounts the person may have, so this matters: tell them in the export confirm line, and this is the one place the data could leave the device via the person's own calendar app, so the first export shows a one-time consent line "Your calendar app may sync this to your account"). Fits CLAUDE.md section 4 item 2: the first .ics export of real data needs that tick; demo data export carries "DEMO".

Deen: no piety score, no streaks, no "you missed Fajr" language, no scripture. Deen plan reminders (fields.ts `deen_*` items, privacy class worship) follow neutral text by default. Prayer alerts remain untouched and independent.

## 7. Permission flow

1. Reminders are off until the person switches the master on in Settings.
2. Master on shows a card first (no browser prompt yet): what works / does not work (section 1 line), with two buttons: "Allow phone alerts" and "Use calendar only".
3. Only "Allow phone alerts" calls `Notification.requestPermission()` from that tap (required on iOS). Reuse `notifyState()`: `unsupported` shows "Use calendar export instead" (no dead end); `denied` shows how to re-enable in phone settings; a denied state never re-prompts.
4. iOS not installed to Home Screen: show one step "Add to Home Screen first" instead of the prompt.
5. The permission request is shared with prayer alerts, so if already granted, skip step 3.

## 8. Settings placement

Per settings-final-decision.md the category list is fixed at 8. Do not add a ninth. Put it inside **Prayer & alerts** (`/settings/prayer`), renamed in the card line only: "Prayer & alerts" stays the category name; add a second section "Reminders" under it (below prayer rows). Rationale: one permission line already lives there, and the owner's mental model is "alerts". Controls in order: master switch; permission state line (reused); Daily plan nudge (switch + 1 or 2 time fields, default 08:00); Important tasks (switch + lead 15/30/60 seg); Quiet hours (two time fields); "Add to calendar" explainer link; "Test notification now" button (shows one neutral notification, proves it works while open). The earlier ruling "notification master switch deliberately not added" was about no notification system existing; this ruling is superseded for reminders only, record in DECISIONS_LOG.md.

Where actions appear outside Settings: a star on the task row (important), a calendar icon button on Today card ("Add today to calendar"), the missed card on Today. The star and calendar button are hidden while the master is off? No: calendar export works with the master off (it needs no permission), so the button always shows; the star shows only when "Important tasks" is on.

## 9. Interaction with other modules

- **Prayer alerts (M13)**: separate prefs and switches; shared permission and delivery helper; prayer wins on collisions (20-minute rule); reminder windows treat prayer slots as blocked (never schedule an "important" lead inside a prayer pre-alert minute).
- **M08 time blocks**: a task inside a blocked window (worship/family/rest) cannot be marked important with a nudge; the planner already refuses to place work there, so reuse `Placement`s only. No reminder is created for deferred tasks (`needs_estimate`, `no_room`, `paused`).
- **M12 reality loop**: when the person records a change (event, resume gently), pending nudges are recomputed from the new plan version; overload or pause mode suppresses important/daily nudges (count 0 is not shown) and shows no catch-up. Resume gently shows no missed card for the paused period.
- **M10 team/hand-over**: delegated steps leave the schedule, so their nudges vanish; no nudges to other people exist (nothing leaves the device).
- **Backup/restore**: restore clears the log and recomputes; confirm uses the existing safe restore flow.

## 10. Tests (all linked to the Register as Draft rows, Verified only with artifacts)

Unit (vitest, pure): `tests/reminders_core.test.ts` default-off; daily slots times; zero-plan skips; unknown capacity not 0; cap of 4/day and extras fold into missed; 20-minute merge; quiet hours hold; dedupe by log id; late-open catch-up window; prayer collision; important cap of 5; deferred tasks excluded; overload/pause suppression. `tests/ics.test.ts`: valid VCALENDAR/VEVENT/VALARM, CRLF, escaping commas/semicolons/newlines, stable UID, neutral title for sensitive classes, DEMO marker, no description when hidden. `tests/reminders_privacy.test.ts`: sensitive items give the neutral text in notification and .ics. UI (jsdom): permission card paths (ask/denied/unsupported), master off means no `requestPermission`, missed card has no red class and no "failed/overdue" words in en/bn/mix, link-check (every new route/button resolves), loanword swap file check, precache test passes. Language: all new strings Bangla-first, marked unreviewed.

## 11. Owner phone test checklist (physical device, CLAUDE.md section 4 item 6)

1. Android Chrome: switch master on, allow; "Test notification now" appears. Lock the phone: text is the neutral line only.
2. Set the daily nudge 3 minutes ahead, keep the app open in background (switch to another app): does it arrive? Then swipe the app away: record honestly whether it arrives (expected: no). Open the app: missed card appears, calm wording.
3. iOS: Add to Home Screen, open from the icon, allow; same two checks.
4. Tap "Add today to calendar": calendar opens with entries; phone alarm rings 10 minutes before with the app fully closed.
5. Mark 6 tasks important: the 6th is refused politely.
6. Quiet hours: set a nudge inside it; nothing buzzes; missed card shows at morning open.
7. Switch master off: no notifications, no permission prompt on next app open.
Results go to the Register as evidence; any "no" on step 2 is expected and documents the limit.

## 12. Risks

- Owner expects closed-app alarms: mitigated by the plain statement, the calendar route and the test checklist. Biggest risk; flag in the first-run card.
- Calendar sync leaks sensitive titles: neutral titles by default and one-time consent line.
- Periodic Background Sync inconsistency: not used for promises.
- iOS permission quirks: handled by install gate and tap-initiated prompt.
- Notification fatigue: caps and auto-suggest-off.
- `.ics` is one-shot: stale entries after replanning; say so, and name events with a date only, so a stale one is obviously old.
- Service worker: `sw.js` currently has no notification handlers. Delivery uses `registration.showNotification` from the page; add only a small `notificationclick` handler that focuses the app at `#/today` (no push, no sync logic in v1). Precache hash/version bump needed.

## 13. Build order (small commits, one PR each)

1. `core/reminders.ts` types, defaults, `parseRemindPrefs`, tests (default off).
2. `core/ics.ts` plus tests; no UI.
3. Today screen "Add today to calendar" button (works with master off) plus consent line.
4. Settings section "Reminders" with master, permission card, test notification (reuses `notifyState`).
5. Daily nudge slots, limits, ledger, delivery adapter; tests for caps/quiet/dedupe.
6. Missed card on Today.
7. Important mark (`important?` field, catalog bump, migration note) plus lead seg and per-task ics.
8. `sw.js` `notificationclick` handler; precache test; phone checklist run; Register and Change Log update; DECISIONS_LOG entry.

## 14. What NOT to build

Per-item repeat rules; snooze; per-item lead times; reminders on every task by default; Web Push or any server/cloud; Notification Triggers (removed); reliance on Periodic Background Sync; notification action buttons; streaks, "missed count" badges, red or guilt copy; reminders that add tasks or reschedule on their own; notifications that name items on the lock screen by default; reminders to other people; scripture text in reminders; a ninth Settings category; sound beyond the existing prayer sound.

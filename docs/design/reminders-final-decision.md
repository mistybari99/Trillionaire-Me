# Reminders: final decision (binding)

Judge ruling over proposals A and B and both critiques. Status: decided, nothing built. If this file conflicts with either proposal, this file wins. CLAUDE.md, Spec and Register still rank above it.

## বাংলা সারাংশ
- আপনি কাজ, প্ল্যান, হ্যাবিট, বিল বা গোলের তারিখে "কখন মনে করাব" নিজে বেছে নেবেন।
- অ্যাপ খোলা বা ব্যাকগ্রাউন্ডে থাকলে ফোনে নোটিফিকেশন আসবে। অ্যাপ বন্ধ থাকলে সময়মতো আসবে, এর নিশ্চয়তা নেই। সার্ভার না থাকায় এটা ওয়েব অ্যাপের সীমা।
- বন্ধ অ্যাপেও ঠিক সময়ে বাজার নির্ভরযোগ্য উপায়: ফোনের ক্যালেন্ডারে যোগ করা (.ics)। প্রতিটি রিমাইন্ডারের পাশে সেই বোতাম থাকবে।
- সব বন্ধ থেকে শুরু। দিনে সর্বোচ্চ ৬টি, রাত ১০টা থেকে সকাল ৭টা শান্ত সময়, লক-স্ক্রিনে শুধু "একটি রিমাইন্ডার অপেক্ষা করছে"। নামাজের অ্যালার্ট সবসময় আগে।
- মিস হলে অ্যাপ খুললে একটি শান্ত কার্ড। লাল রং, গণনা, শাস্তি, স্ট্রিক নেই।

## 1. Honest limits (the premise)
No server, so no Web Push. A static PWA cannot wake itself when closed. Platform facts, stated once and used in all wording:
- App open or recently in the background: phone notification works (permission granted; on iPhone only after Add to Home Screen and a tap).
- App closed or swiped away: not guaranteed on any platform. Treat "nothing arrives" as normal.
- Phone calendar alarm: works fully offline with the app closed. This is the one reliable closed-app route.
- Notification Triggers and Periodic Background Sync: not used, not promised, not built.

## 2. Data model: a combination, kept small
Decision: **one `reminder` entity pointing at an existing item** (A), **plus one global toggle for planned steps** (from B). No new field on task, habit, goal, bill, review. No `important` flag, no custom-text reminder.

```
reminder (entity, new catalog family FAM-REM, schemaVersion bump, migration note "additive, no data rewrite")
  target_entity   choice  task | plan_step | habit | bill | goal | review
  target_id       text    id of the item (required; no free-text reminders)
  at              text    local Dhaka datetime ISO, for task / plan_step / review (the person picks date and time)
  time_of_day     text    "HH:MM", for date-based targets (bill, goal) and habit
  lead_days       number  0 or 1 (bill, goal only: "on the day" or "the day before")
  state           choice  on | done | skipped
  snoozed_until   text    ISO datetime or null
```
Rules:
- Habit: fires on the habit's own scheduled days at `time_of_day`. No repeat rule is stored; the habit's days are the repeat. Task/plan/review/bill/goal reminders fire once.
- Date missing on the target means no reminder fires (unknown is not "now"). A bill with no amount still reminds; the amount line is omitted.
- The reminder stores the target id, not a copied time. If M08 re-plans a plan_step, the reminder follows the new placement.
- Global prefs (`prefs.reminders`, key `tm:ui:reminders`, parser fails closed like `parseAlertPrefs`): `master:false`, `planStart:false` (remind at the start of each planned step; lead 0 or 10 min), `quiet:{from:"22:00",to:"07:00"}`, `defaultTime:"09:00"`. Delivered ids in `tm:ui:remindersFired` per Dhaka day (same pattern as `prayerFired`). A 7-day ledger of ids and times only, never titles.
- No `until`, no weekly/monthly anchors, no `channel`, no `created_by_rule`, no auto-created reminders (the person always creates them; the app may only offer the "Remind me" row).

Core in `src/core/reminders.ts` (pure; no UI or network imports): `parseReminderPrefs`, `expandReminders(records, from, to, prefs, ctx)`, `applyLimits(slots, ledger, prayerSlots, blocks, prefs, mode)`, `dueReminders`, `missedReminders`, `snooze`, `markDone`, `reminderNotification` (wraps `buildNotification`). `src/core/ics.ts`: `toIcs(slots, {details})`. Adapter `src/ui/reminders.ts`: runs inside the existing 30 s timer and `visibilitychange` check in `src/ui/prayerAlerts.ts` (no second timer), uses `showPhone` and `notifyState`.

## 3. Rulings on the open questions
| Question | Ruling | Reason |
|---|---|---|
| Per-item time choice | **IN** (date+time for task/plan/review; time for habit/bill/goal) | It is the owner's request |
| Repeat | **OUT** as a rule. Habits use their own days only | Avoids a second repeat engine |
| Snooze | **IN**, minimal: two choices, "In 1 hour" and "Tomorrow morning" (default time). On the in-app card and missed card. No notification action buttons | Calm "not now" without marking done; works on every platform |
| Daily nudge | **OUT** | Same closed-app limit; not asked; adds a recurring buzz. The global `planStart` toggle covers "my plan is set" |
| Important flag | **OUT** | The reminder record replaces it |
| .ics export | **IN** (see section 5) | The only reliable closed-app route |
| Missed-reminders card | **IN** (section 6) | Honest fallback |
| Per-item lead time | **OUT** except bill/goal 0 or 1 day, and planStart 0 or 10 min | Keep the form to one or two choices |
| Test notification button | **IN** | Proves permission works while open |

## 4. Anti-spam limits (enforced in core, each tested)
- At most **6** reminder notifications per Dhaka day. Prayer alerts are not counted and never suppressed. Extras fold into the missed card.
- Two reminders due within **15 minutes** merge into one notification ("2 things soon" / "২টি জিনিস কাছে").
- A reminder is shown **once** per slot (delivered-ids set); snooze creates one new slot.
- Quiet hours default **22:00 to 07:00**. Reminders inside are **held until the end, not dropped**, then shown or folded into the missed card. Prayer alerts ignore reminder quiet hours.
- No notification while the app is in the foreground: show the in-app card instead.
- No ignore counter, no auto "pause these?" prompt, no escalation, no repeat nagging.
- The person is never refused a reminder. Only delivery is limited.

## 5. Calendar export (.ics): IN
- Per reminder: "Add to phone calendar". Bulk: "Add next 30 days". Works with master OFF (needs no permission).
- Pure text file (RFC 5545), CRLF, line folding, escaped commas/semicolons/newlines, UTF-8 Bangla, `TZID=Asia/Dhaka`, stable UID per reminder+date, DTSTAMP from an injected clock, one VALARM at the event time (0 minutes).
- **Neutral-title rule:** events for privacy classes worship, health, financial, third_party are titled "Reminder" / "রিমাইন্ডার" with no description, unless the person ticks "Include details in the calendar file" for that category (default off, per category, reuses the `notifyShow` ticks; one switch for lock screen and calendar).
- **Consent rule:** before the first export, one calm line and a tap: "Your phone calendar may copy this to your own account. Nothing is sent by this app." Demo data is titled with DEMO. Real-data export also requires the D-B real-data consent already given on the device.
- Say honestly: it is a one-time copy; later edits in the app do not change the calendar entry. Event titles carry the date so a stale one is obvious.

## 6. Missed-reminders card
- On app start or return to the foreground: one card on Today if reminders passed unseen. Plan-step reminders expire from the card after 24 hours; explicit reminders after 7 days.
- Wording only: "These were waiting for you" / "এগুলো আপনার জন্য অপেক্ষা করছিল". Each row: Done, Later (the two snooze choices), Skip. Never red, never a count of misses, no "overdue by N days". Deen items appear only if the worship detail tick is on; otherwise they lapse quietly.
- Overload (`minimum_week`, `pause`) or Resume gently: nothing is added to the card for the held period.

## 7. Settings placement (no 9th category)
- Inside the existing category `prayer` ("Prayer & alerts" / নামাজ ও অ্যালার্ট). Name unchanged. A second section "Reminders" below the prayer rows, route `#/settings/prayer/reminders`.
- Rows in order: master switch (default off), permission line (reuse the existing line), plan-step reminders switch + 0/10 min, quiet hours (two times), "Test notification", honest limits line, link "Lock screen shows: a plain line" to the existing `lockscreen` row (not duplicated).
- Registry rule: the `reminders` prefs object is owned by exactly one row; registry and link-check tests must pass; keys in `packs.ts` for en and bn (mix derived).
- **Reversal:** `settings-final-decision.md` listed "notification master switch" under "deliberately not added". That line is **reversed for reminders only**, because the owner asked for reminders and a per-feature master off is the safest default. Builder must add a `DECISIONS_LOG.md` entry (what, why, alternatives: no switch / one global switch for prayer too, how to undo: remove the section and prefs key) and a Change Log note in the Register in the same commit as the Settings rows. Prayer switches are unchanged.

## 8. Permission flow
1. Master on does not call the browser. It shows the honest limits card with "Allow phone alerts" and "Use calendar only".
2. Only "Allow phone alerts" calls `Notification.requestPermission()`, from that tap. If prayer alerts already got permission, skip.
3. `unsupported` (e.g. iPhone tab not installed): "Add to Home Screen first" with the two steps, plus calendar export. `denied`: how to change it in phone settings; never re-prompt. Neither is a dead end: in-app cards and .ics still work.
4. "Not now" is remembered; the card does not return in the same session.

## 9. Interactions
- **Prayer alerts (M13):** engine and prefs unchanged. A reminder within 3 minutes of a prayer alert moves 3 minutes after it. Prayer wins.
- **M08 time blocks:** no reminder fires inside a prayer, family or rest block; it is held to the block end (same helper as quiet hours). Deferred plan items (`needs_estimate`, `no_room`, `paused`) get no reminder.
- **M12 plan versions:** reminders are included in version snapshots and restore with them; after restore or plan switch, slots are recomputed and delivered ids for changed targets are cleared. Real-data clear (`scrubRealParts`) also removes `reminder` records.
- **M10 hand-over:** a handed-over task gets no reminder to me by default; an opt-in "check in" on `handover.due` uses the third_party class (neutral). Nothing is sent to anyone. Unknown holder is not "covered".
- **Deen:** worship items are never auto-reminded; if the person adds one, text is neutral by default, no piety score, no "you missed" wording, no scripture (D-D), no ruling text.
- **Overload:** `minimum_week` and `pause` add no reminders and hold existing ones except prayer (and bills the person marked must-pay, if that field exists); when the mode returns to normal they resume with no catch-up card.
- **D-B:** real reminders pass the existing `guardWrite` consent; demo reminders are labelled DEMO and never reach notification or .ics paths as real.

## 10. Honest in-app wording (plain, polite; Bangla uses গোল, ডাটা, টেস্ট, লাইভ, আপনি)
- Limits line (Settings and first-run card)
  - EN: "Phone alerts work while the app is open. When the app is closed, your phone may not show them on time. For important ones, add them to your phone calendar."
  - BN: "অ্যাপ খোলা থাকলে ফোনে অ্যালার্ট আসবে। অ্যাপ বন্ধ থাকলে ঠিক সময়ে না-ও আসতে পারে। জরুরি হলে ফোনের ক্যালেন্ডারে যোগ করুন।"
  - Mix: "অ্যাপ open থাকলে ফোনে alert আসবে। অ্যাপ বন্ধ থাকলে ঠিক সময়ে না-ও আসতে পারে। জরুরি হলে ফোনের calendar-এ যোগ করুন।"
- Calendar consent: EN "Your phone calendar may copy this to your own account. This app sends nothing." BN "আপনার ফোনের ক্যালেন্ডার এটি আপনার নিজের অ্যাকাউন্টে কপি করতে পারে। এই অ্যাপ কিছুই পাঠায় না।"
- Missed card: EN "These were waiting for you." BN "এগুলো আপনার জন্য অপেক্ষা করছিল।"
- iPhone: EN "Add the app to your Home Screen first, then allow alerts." BN "আগে অ্যাপটি Home Screen-এ যোগ করুন, তারপর অ্যালার্ট চালু করুন।"
- Calendar one-time copy: EN "This is a one-time copy. Later changes here will not update the calendar." BN "এটি একবারের কপি। পরে এখানে বদলালে ক্যালেন্ডার বদলাবে না।"
- Lock screen text (existing): "A reminder is waiting" / "একটি রিমাইন্ডার অপেক্ষা করছে".
- All new strings marked unreviewed ("যাচাই হয়নি"); loanword check against `docs/design/bangla-loanword-swaps.md`; never the words "failed", "overdue", "ব্যর্থ", "বাকি পড়েছে" in reminder copy.

## 11. Owner phone test checklist (physical device, CLAUDE.md section 4 item 6)
1. Android: Settings, Reminders, master on, Allow. Tap "Test notification": it appears. Lock the phone: only the plain line shows.
2. Make a task reminder 2 minutes ahead, app open: it appears; tapping opens the task.
3. Same, then switch to another app for 1 minute: write down if it arrives (either result is fine).
4. Same, then swipe the app away: write down if it arrives (usually no, which is the honest limit). Open the app: calm "waiting for you" card, buttons work.
5. Tap "Add to phone calendar" on one reminder: the calendar asks to add it; with the app fully closed the calendar alarm rings on time.
6. iPhone: Add to Home Screen, open from the icon, allow, repeat step 2. Before install the app says to add it first.
7. Quiet hours: a reminder at 23:00 stays silent; it shows after 07:00.
8. Bill reminder: lock screen plain line only; calendar file title "Reminder" only. Turn on the money detail tick: the line shows.
9. A reminder and a prayer alert within 3 minutes: two buzzes do not land together.
10. Master off: no notifications and no permission prompt on next open.
Results go to the Register as evidence only if done on a real phone. Closed-app delivery is never marked Verified from CI.

## 12. Tests
- Pure (vitest, injected clock `dhakaNow(nowMs)`): prefs default off and fail closed; expand for task/plan_step/review/bill/goal/habit days; unknown date gives no slot; quiet hours hold not drop and wrap midnight; cap of 6 and fold to missed; 15-minute merge; once-only via delivered set; snooze creates one slot; prayer 3-minute spacing; block hold; deferred plan items excluded; overload/pause hold with no catch-up; neutral text for worship/health/financial/third_party and per-category unlock; no title in ledger.
- `ics`: valid VCALENDAR/VEVENT/VALARM, CRLF and folding, escaping, Bangla UTF-8, Asia/Dhaka, stable UID, neutral title and no description by default, DEMO marker.
- UI (jsdom, `Notification` stubbed granted/denied/missing): `requestPermission` called only from the Allow tap and never when master is off; ladder order (phone notification, in-app card, missed card); foreground shows card not notification; missed card has no red class and none of the banned words in en/bn/mix.
- Registry: `reminders` pref owned by one row; link-check for every new route and button; en/bn key parity; loanword check; precache test; migration keeps existing records; `scrubRealParts` removes reminders.
- Manual only: section 11.

## 13. Build order (each commit end to end, linked, tested)
1. Core: `reminders.ts`, catalog family FAM-REM, schema bump and migration note, pure tests. No UI.
2. Core: `ics.ts` with neutral-title rule and tests.
3. Settings section (master, limits line, quiet hours, permission card, test notification), registry rows, packs keys, DECISIONS_LOG entry for the reversal, tests.
4. Delivery adapter inside the existing timer: ladder, limits, ledger; SW `notificationclick` handler only (focus app, open target route); precache version bump; jsdom tests.
5. "Remind me" row on task and plan step; Today shows pending ones; snooze and done buttons.
6. Bill and goal-date rows (lead 0/1 day) and habit time row; review row.
7. Missed-reminders card on Today.
8. Calendar export buttons (per reminder and next 30 days) with consent and detail ticks.
9. Interactions: prayer spacing, M08 block hold, overload hold, M12 snapshot restore, M10 check-in, `scrubRealParts`, `planStart` toggle.
10. Owner phone test; Register and Change Log update from real evidence.

## 14. Will not build
Any server, Web Push, email or SMS; Notification Triggers; Periodic Background Sync; silent-audio or wake-lock tricks; daily nudge; important flag; repeat rules (weekly, monthly, until); per-item lead pickers beyond the two choices; custom free-text reminders; auto-created reminders; notification action buttons and any SW outbox; ignore counters, streaks, miss counts, red or guilt copy, escalating nags; reminders to other people; scripture text; AI-written text; a 9th Settings category; a second timer or notification pipeline beside `src/core/notify.ts`; native/Capacitor alarms (revisit only if G2 device tests fail and the owner asks, logged in DECISIONS_LOG.md).

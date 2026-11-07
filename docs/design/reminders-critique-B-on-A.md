# Critique: expert B on proposal A (written by the judge, read-only on source)

Verdict: A is complete and honest, but over-built for a non-programmer phone user and for a platform that cannot deliver closed-app. Many parts add test surface and settings without adding reliability.

## What A gets right (keep)
- One `reminder` record pointing at a target; no new columns on task, habit, goal, bill, review.
- Time chosen by the person; date-only targets get a default time.
- Delivery ladder with a "delivered once" id set, in-app card when permission is missing.
- Unknown is never 0; a task with no date yields no reminder.
- Prayer alerts stay a separate engine; reminders reuse `showPhone`, `buildNotification` and the same 30 s timer.
- Overload holds reminders with no missed card afterwards; handover gets no default reminder; no auto-created Deen reminders.
- Neutral .ics title by default with a per-category details tick and a calm warning.
- Permission asked only from a tap; nothing at master-on.

## Over-built or risky
1. **Anchors: at, before_due, daily_at, weekly_on, monthly_on, until, day_of_month clamp.** This is a repeat engine. The planner and habits already recur; a second one can disagree (done task still nags). Month-end clamping alone needs its own tests and UI text.
2. **`showTrigger` and `periodicsync` as rungs.** Trigger API is not shipped; periodic sync is not on time. Building them gives a false sense of coverage and extra SW code. Not in v1.
3. **Notification action buttons** (done, snooze) with an IndexedDB outbox written by the SW. iOS has none, Android is flaky, and the outbox is a new sync path to test. Tapping the notification to open the item is enough.
4. **Monthly and weekly reminders on every entity type, plus "reminder.channel" and "created_by_rule".** Channel choice per reminder is a decision the owner should never face. Auto-suggested reminders (goal date makes two reminders) are surprise notifications.
5. **No daily cap.** A has quiet hours but no limit on how many can fire; ten bills due on one day would buzz ten times.
6. **Snooze presets (4) plus "Skip this time" plus "Mark task done"** on one card is many buttons for a phone.
7. **Settings rename of the category to "Alerts"** touches the approved 8-category decision text; the name should stay "Prayer & alerts".
8. **"Missed" for 7 days** with a list can become a pile of guilt. It needs a cap and soft wording.
9. **Custom reminders (target "custom", own title)** open a free-text store of personal text with its own privacy handling; not needed since the owner asked about items that already exist.

## Verdict on A's pieces
Keep: the entity, the ladder (minus trigger/periodic rungs), once-only delivery, quiet-hours hold, prayer spacing, M08 block hold, overload hold, neutral .ics, tests list. Drop: weekly/monthly/until anchors, custom target, channel field, SW outbox and action buttons, trigger and periodic sync, auto-created suggestions, category rename. Add: a daily cap, a merge window, a single calm missed card.

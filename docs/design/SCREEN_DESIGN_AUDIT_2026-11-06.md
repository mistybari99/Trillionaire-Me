# Screen design audit: less scrolling, simple on top, deep inside (6 Nov 2026)

Owner order (6 Nov 2026): audit every function for UI/UX so that the app needs less space and scrolling and looks simple, while staying full of detail (page inside page, function inside function, nothing missing). This is a **proposal set, not built**. No app code was changed.

| Part | File | Covers |
| --- | --- | --- |
| B1 notes | [B1_daily_plan.md](screen-design/B1_daily_plan.md) | Today, Capture, Journey and all sub-pages, Diary (7 routes), Habits, Focus, Stuck, Reward |
| B1 sketches | [B1_daily_plan.html](screen-design/B1_daily_plan.html) | before/after phone frames: Today, Journey home, goal page, Diary, Habits |
| B2 notes | [B2_deen_settings_profile.md](screen-design/B2_deen_settings_profile.md) | Deen, Hadith, Cards, Notes, Topics, Settings, More pages, Profile hub, global search, Help (i) |
| B2 sketches | [B2_deen_settings_profile.html](screen-design/B2_deen_settings_profile.html) | before/after phone frames: Deen, Settings home, Profile hub, command bar, Help (i) sheet |

## Biggest savings reported (measured by the agents; "after" values are budgets, not built)
- Journey home 10,310 px to about 1,100 px (the "before" shot predates the 6 Nov feature-details collapse); Today 3,488 to 1,100; goal page 4,559 to 1,000.
- Fields guide 44.4 screens to about 1.5; Status 18.8 to about 1.4; topic detail 7.4 to about 1.5; Deen 6.2 to about 1.4; prayer settings 5.5 to about 1.5.

## What would need to be built (new, not existing)
Kit components `k-tabs`, `k-sheet`, `k-cmd` (search/command bar), `k-help`, quick-action row, accordion; routes `#/journey/tools` and `#/profile`; a top-bar search icon; a one-line DEMO banner and disclaimer chip as edits of existing screens. Every other proposed route already exists. Nothing is removed: each notes file has a route-to-function map.

## Rules kept
Look D-E (Light, Colorful, Futuristic) and kit tokens; EN/BN/Mix; 360 px; text 75-150%; no scores, ranks or streaks; unknown is not 0; DEMO labels; no scripture text (D-D); nothing that needs AI (D-C). It does not contradict `docs/design/ui-reconcile-plan.md`.

## Status
Independent read-only audit: pending when this file was written; see the PLAN_TRACKER row for the result.

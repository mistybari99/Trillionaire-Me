# Screen design audit: less scrolling, simple on top, deep inside (6 Nov 2026)

Owner order (6 Nov 2026): audit every function for UI/UX so that the app needs less space and scrolling and looks simple, while staying full of detail (page inside page, function inside function, nothing missing). This is a **proposal set, not built**. No app code was changed.

| Part | File | Covers |
| --- | --- | --- |
| B1 notes | [B1_daily_plan.md](screen-design/B1_daily_plan.md) | Today, Capture, Journey and all sub-pages, Diary (7 routes), Habits, Focus, Stuck, Reward |
| B1 sketches | [B1_daily_plan.html](screen-design/B1_daily_plan.html) | before/after phone frames: Today, Journey home, goal page, Diary, Habits |
| B2 notes | [B2_deen_settings_profile.md](screen-design/B2_deen_settings_profile.md) | Deen, Hadith, Cards, Notes, Topics, Settings, More pages, owner profile (extends built /profile), global search (k-cmd), Help (i) (extends built helpTrigger) |
| B2 sketches | [B2_deen_settings_profile.html](screen-design/B2_deen_settings_profile.html) | before/after phone frames: Deen, Settings home, Owner profile (extends built page), command bar, Help (i) sheet (extends built) |

## Biggest savings reported (measured by the agents; "after" values are budgets, not built)
- Journey home 10,310 px to about 1,100 px (the "before" shot predates the 6 Nov feature-details collapse); Today 3,488 to 1,100; goal page 4,559 to 1,000.
- Fields guide 44.4 screens to about 1.5; Status 18.8 to about 1.4; topic detail 7.8 to about 1.5; Deen 6.2 to about 1.4; prayer settings 5.5 to about 1.5.

## Exists, extend (built in Codex merge 7d34280; Part B proposals build on it)
Help (i): `helpTrigger`, `helpTopics`, `screenHelp` (so `k-help` is not new; it reuses them). `/profile`: `ownerProfileUi.ts` (add tabs and status lines only; it shows no percent and infers nothing). Quick actions and bottom navigation: `tabActions.ts` (`TAB_ACTIONS`), `quickNavigationUi.ts`, prayer quick-mark (`prayerMarksUi.ts`), routes `/deen/prayers` and `/deen/fasting`. Top bar already has the owner-profile icon.

## What would still need to be built (new)
`k-tabs`, `k-cmd` (search/command bar, there is no search in quickNavigationUi.ts; the only search is settingsSearch.ts in Settings), accordion, record-form sheet wrapper; route `#/journey/tools`; a 🔍 in the top bar; a one-line DEMO banner and disclaimer chip as edits of existing screens. Nothing is removed: each notes file has a route-to-function map.

## Rules kept
Look D-E (Light, Colorful, Futuristic) and kit tokens; EN/BN/Mix; 360 px; text 50-150% (test steps 50/75/100/125/150; slider min 50 in settingsUi.ts); no scores, ranks or streaks; unknown is not 0; DEMO labels; no scripture text (D-D); nothing that needs AI (D-C). It does not contradict `docs/design/ui-reconcile-plan.md`.

## Status
Audit history: first audit FAIL (fixed), second audit FAIL after the Codex merge (re-based on the built help, profile and navigation), third audit pending. See the PLAN_TRACKER row for the result.

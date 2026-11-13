# Codex merge verification (6 Nov 2026)

What was merged: PRs #10 and #11 (branch `feat/contextual-help-navigation`, merge commit `7d34280`) into the production branch: contextual Help (i) on screens, quick navigation with a new bottom bar and per-tab actions, owner Profile (`/profile`), prayer quick-mark with undo (`/deen/prayers`, `/deen/fasting`), text size 50-150 percent, a CI-gate diagnostic change (User-Agent header) on top of the retry fix.

| Check | Result | Evidence |
| --- | --- | --- |
| Type check | clean | `tsc --noEmit` on `7d34280` |
| Unit and UI tests | 2155 passed (182 files) on `7d34280`; 2156 after the spacing fix | vitest |
| Build | OK | `npm run build` |
| Browser end-to-end | 107 PASS, no FAIL, 0 third-party requests | `tools/e2e.mjs` on the built app |
| New and changed screens x 3 languages | 18 routes x 12 combinations = 216 screens, 0 problems at 360 px (light/dark, 100/200 percent text) after one fix | `evidence/codex-merge-screens-2026-11-06.json`, `tests/codex_routes_screens.test.ts` |
| Nothing from Codex dropped | no deleted Codex file; our kit, azan, prayer-sync and gate code intact; gate has both the retry fix and Codex's User-Agent | read-only audit |
| Bangla plain rules | no banned word in Codex text; "গোনা" only in a protected string and the allowed "দিন গোনা" form; 0 Bangla digits in packs | read-only audit |
| `check_plan` | passes | `node tools/check_plan.mjs` |

Defect found and fixed: on `/capture` the field-help icon touched the "Find the details" button (gap 0). `.field-help { margin-top: 8px; }` in `src/ui/helpUi.css`, test in `tests/help_ui.test.ts`.

Read-only audit: PASS on the second pass. Notes: the stored screen report is only read by the test (it is not re-run in unit tests); `tests/looks_matrix.test.ts` still lists the older 44 routes, so the new routes have their own report; the full four-look matrix was not re-run after the merge (only the default look).
Not covered: physical phone, real reminders, Bangla reviewer sign-off.

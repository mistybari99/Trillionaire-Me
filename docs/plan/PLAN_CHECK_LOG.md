# PLAN CHECK LOG (append only; newest at the bottom)

Rule: a step is done only when end-to-end complete, linked everywhere it is used, with a link-check test (CLAUDE.md §3). Statuses are checked against code and `git log`, not against reports.

## Check #1 - 2 Nov 2026 11:43 UTC (HEAD `c9fbaac`, working tree dirty by the build agent)
Scope: first full build of `PLAN_TRACKER.md` from settings-final-decision, TODO, audit section 6, inventory, DECISIONS_LOG, owner tasks.

Findings
- Settings PR1a: committed `c9fbaac` (`src/core/restore.ts`, `backup.ts`, `snapshots.ts`, `tests/restore_safety.test.ts` with 12 tests). Covers acceptance items 1,2,3,6,7,8 and the 7-day hold. Verified by reading the code; tests not run by the keeper.
- Settings PR1b (UI wiring): in progress, uncommitted. `src/ui/restoreUi.ts` is untracked; `screens.ts`, `encBackup.ts`, `snapshotsUi.ts`, `packs.ts` modified. Old UI no longer calls `restoreBackup` directly. No UI tests yet (confirm text, cancel, PIN re-ask).
- Missing so far in PR1: "Contains:" labels not on screen, "Real data backup" status line, passphrase-written tick, DECISIONS_LOG entry, 360 px screenshot.
- PR2 to PR6: no code found (no `settingsRegistry.ts`, no `/settings` route, `nav.settings` absent, no REDIRECTS, no consentGate, no `_default` view key).
- `docs/TODO.md` has no Block 11. `DECISIONS_LOG.md` has no Settings entry.
- No link-check test exists in the repo. No `.github/` CI. No `public/_headers`. No welcome-back / then-vs-now. `tests/g1.test.ts:111` still writes `evidence/catalog-report.json` (shows modified).
- Owner-demand audit last re-checked 31 Oct; Block 7-10 not included.
- Legacy Blocks 1-10 marked Built (not re-run); Block 1 item "Check Goal Universe..." still unticked.

Counts at this check (154 rows): Not started 93, In progress 12, Built 37 (+2 split rows), Blocked 10, Built+Linked+Tested 0.

Next check should look at: PR1b commit, UI tests, DECISIONS_LOG entry, TODO Block 11, link-check test in PR2.

## Check #2 - 3 Nov 2026 00:15 UTC (HEAD `045f1d4`, tree clean except evidence churn)
Scope: Settings PR1-PR6, Block 12 steps 1-22, m-list-status, TODO. Read-only on source. Ran `tests/m_list_status`, `link_check`, `field_reach`: 19 passed. Did not run the full suite.
Findings
- Settings PR1 to PR6 all committed (1ea7c87, d5927fb, 758a36e, d85acc4, 83fb96b, 04ba4ab, 38cd450, 65d1811, 4021706, 294a784, 216fe50, 39a87f8, 06f6c18, 508dc80) with tests: restore_ui, settings_shell, look_page, privacy_page, delete_page, data_page, backup_page, connections_page, plan_settings, prayer_page, settings_redirects, settings_search, settings_a11y_i18n, link_check. Most Settings rows moved to Built+Linked+Tested. 4 looks, 200 % text and dark mode are not verified, so every such row carries "4L ?".
- Closed gaps from check #1: link-check test, TODO Block 11/12, DECISIONS_LOG Settings entries, restoreUi link, nav.more and `/more` references (only content routes remain), habit grid via prefs.
- Still open: SET-6.04 cross-tab storage event; Cancel test for restore; refusal on every real write path after Withdraw and the no score/rank/streak scan; first-run/Start-real consent wording not unified (logged deviation); 360 px "no scroll" check for Quick card; 44/48 px test.
- Block 12: 22 steps pushed. Modules complete 20 of 25; partial M09 (unit economics), M13 (Hijri/Ramadan), M18 (goal tree, resource map, readiness map, plan-diff boards), M21 (at-rest encryption, owner); M23 blocked (D-C).
- Still not built from the audit plan: CI, `_headers`, stale-while-revalidate, Bangla "Where we are" page, apply-back script, welcome-back/then-vs-now, evidence/ churn fix, audit refresh.
- Hadith pack (212 entries, default off, unreviewed): built; owner scholar review remains.
Counts: see the report to the coordinator (tracker now has Section H for Block 12).

## Check #3 - 3 Nov 2026 (HEAD `fc16415`)
Scope: commits 8b869d7..fc16415 (25 commits). Source read-only; no test run this time (checked file existence, test names, commit messages, m-list-status counts, TODO).
Findings
- Closed: SET-6.04 cross-tab refresh, Cancel/Withdraw/wording/tap-target tests (settings_gaps), one consent wording, CI workflow, `_headers`, SWR, evidence churn (now opt-in), welcome-back, then-vs-now, apply-back script, Hijri/Ramadan (M13 complete), update banner/build stamp, text size in rem, screenshot matrix (320, 0 problems), audit refresh, Register copy, full multi-goal feature (schema v2 migration, task.goals/habit.goals, picker, overview, trace, delete preview, plan snapshot v2, print/report, per-goal weighting).
- Stale rows fixed: AU-04, 05, 09, 12, 13, 17, 18, 21, 22, 03; DL-04, DL-06; B12-20.
- Modules: complete 21, partial 3 (M09 unit economics, M18 four boards, M21 at-rest encryption), blocked 1 (M23).
- Still open: backward-planning wizard (AU-22), calmer prompt colour (AU-23), Quick-card 360 px fold test, snapshot-restore UI test, undo-map test, 4-looks pixel check not personally inspected, prayer auto-update never tested live, old audit files carry stale statements, Where-we-are is a doc not an in-app page, owner tasks and branding.
- Dropped/at risk: none new dropped; AU-23 has no owner and no evidence.

## Builder update - 3 Nov 2026 (after check #3, owner "start the remaining work now")
Closed: G3-01 (M18 boards), G3-02 (backward wizard, calm colour), G3-03 (three tests), G3-04 (looks evidence, images opened), G3-06 (in-app Where we are), G3-08 (superseded audit files), branding (N3-23). Rows SET-1.05, SET-2.T3, SET-R.09, AU-21, AU-22, AU-23, B12-22, N3-06, N3-10 moved to Built+Linked+Tested. The 59 "Built" rows and every "4L ?" row now carry a looks reference or "n/a (no screen)" or "not in matrix". New rows N4-01..N4-08. Modules: 22 complete, 2 partial (M09, M21), 1 blocked (M23). Still open: M09 unit economics (no fields in the documents), M21 encryption (owner), M23 AI (D-C), owner-only tasks (G3-10).

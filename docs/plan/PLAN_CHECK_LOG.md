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

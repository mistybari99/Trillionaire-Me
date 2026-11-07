# PR and branch reconciliation (OPS-02), 6 Nov 2026

Scope: documentation only. Nothing was merged, retargeted, closed or deleted. Facts below come from `git` on the production branch `ccr-8b686ba2-vitt45` and from the work records in this repository; GitHub pull-request pages were not re-read in this pass (the GitHub tool was not available), so PR titles and states are as recorded in `docs/audit/REPOSITORY_AUDIT_2026-11-05.md` and the owner's notes.

## 1. What PR #1 really contains now
| Item | Fact |
| --- | --- |
| Base | `main` holds only the initial commit (22 Oct 2026). PR #1 goes from it to the production branch. |
| Size | 281 commits and 1090 changed files (+164,496 lines) between `origin/main` and the production branch. The audit of 5 Nov counted 249 commits / 867 files; the branch has grown since. |
| Old description | The title still reads "G1: safe shell + field catalog (demo data only)" and describes the first 39-test shell. That is no longer accurate. |
| Delivered since | Action Desk UI, usability controls, text-size slider, collapsed feature details, contextual help, Workers preview isolation, recovery and offline install fixes, UI kit with four looks, azan slots and speed, prayer-source opt-in, 25-module status, reliability fixes, deploy gate. |

## 2. Validation on the production branch (all recorded in this repository)
| Check | Result | Evidence |
| --- | --- | --- |
| Type check and unit tests | `tsc` clean; 2071 tests pass (173 files) | run on 6 Nov after the deploy-gate fix |
| Browser end-to-end | 104 checks pass | CI `check` job, run for `6b14df4` |
| Looks matrix | 1408 screens, 0 problems | `evidence/matrix-report.json`, `tests/looks_matrix.test.ts` |
| Extra screens x 3 languages | 504 screens, 0 problems | `evidence/verify02-report.json` |
| Prayer source (mock provider) | 20 of 20 | `evidence/verify03-prayer-sync.json` |
| Legacy rows recheck | 176 of 189 rows read; 3 stale names; TD-7.4 override core not built | `docs/audit/VERIFY-01_2026-11-06.md` |
| Offline download | about 1.2 MB compressed | `docs/audit/PERF-01_2026-11-06.md` |
| Live deploy | Workers build of `6b14df4` deployed after CI passed | owner's Cloudflare screen, 6 Nov |
Not covered: any physical phone check, real reminders, Bangla reviewer sign-off, the official prayer timetable (OWNER-01 to 04).

## 3. Other branches and PRs (state on 6 Nov)
| Branch | Contained in the production branch? | Note |
| --- | --- | --- |
| `audit/repository-organization-2026-11-05` | yes | audit and plan reorganization |
| `feat/action-desk-ui`, `feat/usability-controls`, `feat/text-size-slider`, `feat/collapsed-feature-details`, `feat/contextual-help-navigation`, `fix/recovery-offline-install` | yes (0 commits ahead) | merged earlier in the session; their PRs are redundant with PR #1 |
| `claude/upbeat-franklin-8zebjp` (PR #2) | no, 2 unique commits | the design doc was imported on 6 Nov as `docs/design/content-first-design.md` with corrections (DESIGN-01); its decision-log, roadmap and catalog-report changes are older and are not imported |
| Codex local work (help icons, profile, quick menu, prayer quick-mark) | not pushed yet | merge when it appears: keep our design where they overlap, drop nothing the other side has |

## 4. Reviewed integration order (for the owner to approve; none done)
1. Keep the production branch as the single source. Do not retarget or rewrite it.
2. Before merging PR #1, replace its title and body with an accurate summary (draft below). This needs the owner's GitHub account or a later approval.
3. Merge PR #1 into `main` only after CI is green for the latest commit and Cloudflare shows the deploy; use a normal merge, not a force. Decision about squash versus merge commit belongs to the owner (a squash would hide 281 commits of history).
4. Close the six feature-branch PRs as already contained (no branch deletion without the owner's word).
5. Close PR #2 after the owner agrees the imported design doc is enough. Keep its branch.
6. After the merge, `main` becomes the Cloudflare production branch only if the owner changes that setting; today it builds the production branch above.

## 5. Draft replacement text for PR #1
Title: `Trillionaire Me personal edition: Action Desk, UI kit with four looks, offline-first PWA, safety and reliability work`
Body: what is built (list in section 1), validation (section 2), what is not verified (device, reviewer, official timetable, owner decisions), how to undo (revert merge commit; data stays on the device; demo and real data are separate).

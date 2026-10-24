# Evidence refresh (G1 scope + O8/O9)

Date: 2026-10-24
Branch: ccr-8b686ba2-vitt45

## What was run
1. `node tools/evidence.mjs`: vitest run. Result: 416/416 tests passed, 0 failed. 32 TM-TST rows with linked tests, all `evidenceOk = true`. Wrote `evidence/traceability-result.json` and `evidence/vitest.json`.
2. `node tools/e2e.mjs`: browser e2e (see the run log for the final PASS/FAIL count).
3. `python3 tools/update_register.py <src> <dst>`
   - src: `docs/register/Trillionaire_Me_Requirements_Register_v2_0.xlsx` (read only, not modified; sha256 checked before and after)
   - dst: `docs/register/Trillionaire_Me_Requirements_Register_v2_1_evidence_refresh.xlsx` (regenerated copy)
   - Output: "updated 32 requirement rows".

## Counts (linked TM-TST rows)
- Pass: 11 (`TM-TST-003, 006, 017, 021, 034, 037, 092, 100, 114, 143, 144`)
- Partial: 21
- Fail: 0
- Total linked: 32 of 172 TM-TST rows. Partial rows keep their manual or human gate open (usability sessions, device tests, reviewer sign-off).

## Mapped in this pass (O9)
A test file is mapped only when its assertions test the criterion of the TM-TST row. The describe title carries the id (the convention in `tests/g1.test.ts`), so `tools/evidence.mjs` counts it. Only titles changed, plus three tests moved into their own describe so an id counts only its own assertions.

| Test file | Mapped / file | TM-TST | Outcome | What the file really covers |
|---|---|---|---|---|
| tests/horizon.test.ts (R2 describe) | 2 of 4 | TM-TST-158 | Partial | Goals placed on their horizon from stored data; unset kept apart. No Gantt/kanban/text-equivalent check |
| tests/goal_form.test.ts (blank-horizon test, moved) | 1 of 3 | TM-TST-021 | Pass (row unchanged) | Blank horizon stores nothing, goal lands in "unset" |
| tests/b9_plan_flow.test.ts (pure data describe) | 4 of 13 | TM-TST-021 | Pass (row unchanged) | Blank inputs stay null; a real 0 stays 0 |
| tests/i18n_modes.test.ts | 11 of 11 | TM-TST-161 | Partial | Every key present and non-empty in en, bn, mix. Reviewer sign-off not done |
| tests/r5_stuck_log.test.ts (copy guard) | 11 of 11 | TM-TST-116 | Partial | Calm copy: no judging, score, streak or grade words. Crisis-mode screens not covered |
| tests/topics_rewards.test.ts (sensitive topics, moved) | 1 of 13 | TM-TST-151 | Partial | Sensitive topics carry a flag. Screen-level advice note not covered |
| tests/copy_review.test.ts (banned words) | 2 of 9 | TM-TST-041 | Partial | Copy string scan for punitive words in en, bn, mix |
| tests/a11y.test.ts (focus/touch, rendered screens) | 2 describes of 5 (137 assertions in file) | TM-TST-117 | Partial | Focus rings, 44px targets, labels and headings in en and bn. No TalkBack or 200% device run |
| tests/focus_habits_cards_ui.test.ts (habits screen) | 4 of 10 | TM-TST-148 | Partial | Missed days: kind restart, never red or run-count copy |
| tests/focus_habits_cards.test.ts (habits maths) | 6 of 14 | TM-TST-148 | Partial | No run-count, best or score function; unknown planned days are not 0% |
| tests/o6_reality_review_templates.test.ts (90-day review) | 5 of 20 | TM-TST-043 | Partial | No records gives "not enough data", never 0. Weekly review not covered |
| tests/research.test.ts | 6 of 6 | TM-TST-146 | Partial | 0 calls without click; under 2 results invents nothing. Select/compare actions not covered |
| tests/g2.test.ts (backup / restore) | 5 of 8 | TM-TST-088 | Partial | Clean-device restore; tampered backup rejected; demo never restored as real |
| tests/notify.test.ts, tests/o8_notify_privacy.test.ts | 13 of 13 | TM-TST-155 | Partial | Lock-screen text hidden by default; per-category opt-in; neutral en/bn/mix. On-device check is Owner-only |

Already mapped before this pass: `tests/g1.test.ts`, `tests/g3.test.ts`, `tests/money.test.ts`, `tests/stages.test.ts`, `tests/wikipedia.test.ts`, `tests/o5_assessment_fit.test.ts`, `tests/o7_own_saved_lists.test.ts`.

## Not yet mapped (no TM-TST row fits the file's criterion)
| Test file | Passing / file | Feature | Why not mapped |
|---|---|---|---|
| tests/r4_motion.test.ts | 6/6 | Reduced-motion CSS guard, focus tip | No TM-TST row covers motion. The reduced-motion checks in `a11y.test.ts` are kept under TM-TST-117 only because they sit in the same file |
| tests/capture.test.ts | 7/7 | Quick capture: amounts, dates, durations | No TM-TST row covers the capture extraction rules. TM-TST-168 needs whole flows with network off |
| tests/persist.test.ts | 3/3 | IndexedDB storage across restarts, old localStorage import | No row for storage persistence. TM-TST-087 is about visible sync state |
| tests/sync.test.ts | 9/9 | Sync replay, ordering, conflicts | TM-TST-087 and TM-TST-090 cover visible sync state and revoked devices, not replay or ordering. Mapping would stretch them |
| tests/g3ui.test.ts | 11/11 | Plan inputs and plan screens | TM-TST-015 needs an explicit infeasible flag; this file only shows nothing fits. Mapping would overstate it |
| tests/stuck.test.ts | 7/7 | Stuck diagnosis | Uses TM-REQ-174/175 only. The "tired adds nothing" check (TM-TST-047) shares a describe with unrelated tests, so tagging it would count them |
| tests/inspiration.test.ts | 4/4 | Daily inspiration card, copy guard | No TM-TST row covers the daily card. TM-TST-041 is habit-specific |

Browser e2e checks for R2, R4, R5, G3 and the others are in `tools/e2e.mjs` and are not mapped to TM-TST rows.

## Rows not verified / caveats
- No TM-TST row failed. Every row in `tools/traceability.json` has at least one linked vitest assertion, and all pass.
- Partial rows stay Partial until their human or device gates are done. These are Owner-only: O1 real-phone airplane test, O2 Bangla reviewer, O3 usability sessions, O8 lock-screen check on a phone, and the TalkBack / 200% device run (TM-TST-117).
- The 8 appended requirement rows (from `docs/register/new-requirements.json`) have no tests and no build. They are not verified.
- The original v2.0 Register was not edited.

# Evidence refresh (G1 scope)

Date: 2026-10-24
Branch: ccr-8b686ba2-vitt45

## What was run
1. `node tools/evidence.mjs`: vitest run. Result: 259/259 tests passed, 0 failed. Wrote `evidence/traceability-result.json` (20 TM-TST rows with linked tests, all `evidenceOk = true`) and `evidence/vitest.json`.
2. `node tools/e2e.mjs`: browser e2e. Result: 43 PASS, 0 FAIL. Wrote `evidence/e2e-report.json`.
3. `python3 tools/update_register.py <src> <dst>`
   - src: `docs/register/Trillionaire_Me_Requirements_Register_v2_0.xlsx` (read only, not modified; sha256 `a65616a8...1e71`, unchanged after the run)
   - dst: `docs/register/Trillionaire_Me_Requirements_Register_v2_1_evidence_refresh.xlsx` (new copy)
   - Output: "updated 20 requirement rows".

## What changed in the copy
- Tests v2: status and artifact columns set for the 20 linked TM-TST rows, from `tools/traceability.json`.
- Requirements v2: the 20 linked requirement rows updated. Pass rows read "Verified for G1 scope (automated evidence)"; Partial rows read "Partial: automated part passes; manual/human gate pending".
- Requirements v2: 8 rows from `docs/register/new-requirements.json` appended (not already in the register), marked "Not verified, no build". Requirements v2 goes from 172 to 180 rows.

## Counts (linked TM-TST rows)
- Pass: 11
- Partial: 9
- Fail: 0
- Total linked: 20 (of 172 TM-TST rows; 152 have no mapping yet)

Pass: TM-TST-003, 006, 017, 021, 034, 037, 092, 100, 114, 143, 144
Partial: TM-TST-010, 022, 023, 066, 067, 130, 161, 166, 171

Partial rows keep the outcome from `tools/traceability.json`. Their manual or human gates are still open (e.g. 3-user usability session for TM-TST-010, 5-user session for TM-TST-066, reviewer sign-off for TM-TST-161).

## Not yet mapped (passing tests with no row in `tools/traceability.json`)
These feature tests pass (vitest) but have no TM-TST mapping, so no Tests v2 row was added. Add mappings to `tools/traceability.json` to bring them into the register.

| Test file | Passing | Feature |
|---|---|---|
| tests/horizon.test.ts | 4/4 | Horizon page (R2) |
| tests/goal_form.test.ts | 3/3 | Goal form |
| tests/i18n_modes.test.ts | 11/11 | Language modes |
| tests/r4_motion.test.ts | 6/6 | R4 |
| tests/r5_stuck_log.test.ts | 11/11 | R5 stuck log |
| tests/o5_assessment_fit.test.ts | 15/15 | O5 |
| tests/o6_reality_review_templates.test.ts | 20/20 | O6 |
| tests/o7_own_saved_lists.test.ts | 12/12 | O7 |
| tests/b9_plan_flow.test.ts | 13/13 | Plan flow (B9) |
| tests/topics_rewards.test.ts | 13/13 | Topics and rewards |
| tests/wikipedia.test.ts | 3/3 | Wikipedia search |

Browser e2e checks for R2, R4, R5, G3 and the others are in `tools/e2e.mjs` (43 PASS) and are also not mapped.

## Rows not verified / caveats
- The E2E report was regenerated in this run (43 PASS, 0 FAIL). TM-TST-021, 034 and 143 include E2E checks.
- No TM-TST row failed. Every row in `tools/traceability.json` had at least one linked vitest assertion and all of them passed.
- The 8 appended requirement rows have no tests and no build. They are not verified.
- The original v2.0 Register was not edited.
- Partial rows stay Partial until their human gates (usability sessions, reviewer sign-off, owner confirmation) are done.

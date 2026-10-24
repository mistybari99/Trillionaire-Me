# Evidence refresh (G1 scope)

Date: 2026-10-24
Branch: ccr-8b686ba2-vitt45

## What was run
1. `node tools/evidence.mjs` — vitest JSON run. Result: 165/165 tests passed, 0 failed. Wrote `evidence/traceability-result.json` (20 TM-TST rows with linked tests, all with `evidenceOk = true`).
2. `python3 tools/update_register.py <src> <dst>`
   - src: `docs/register/Trillionaire_Me_Requirements_Register_v2_0.xlsx` (read only, not modified; sha256 `a65616a8...1e71`)
   - dst: `docs/register/Trillionaire_Me_Requirements_Register_v2_1_evidence_refresh.xlsx` (new copy)
   - Output: "updated 20 requirement rows".

## What changed in the copy
- Tests v2: status column set for the 20 linked TM-TST rows, and artifact column filled from `tools/traceability.json`.
- Requirements v2: the 20 linked requirement rows updated. Pass rows read "Verified for G1 scope (automated evidence)"; Partial rows read "Partial — automated part passes; manual/human gate pending".
- Requirements v2: the script also appended 8 rows from `docs/register/new-requirements.json` that were not already in the register. They are marked "Not verified — no build". Requirements v2 goes from 172 to 180 rows.

## Counts (linked TM-TST rows)
- Pass: 11
- Partial: 9
- Fail: 0
- Total linked: 20 (of 172 TM-TST rows)

Pass: TM-TST-003, 006, 017, 021, 034, 037, 092, 100, 114, 143, 144
Partial: TM-TST-010, 022, 023, 066, 067, 130, 161, 166, 171

Partial rows keep the outcome from `tools/traceability.json`. Their manual or human gates are still open (e.g. 3-user usability session for TM-TST-010, 5-user session for TM-TST-066, reviewer sign-off for TM-TST-161).

## Rows not verified / caveats
- The E2E results (`evidence/e2e-report.json`, last written 07:10) were not regenerated in this run. `tools/evidence.mjs` only reads them. TM-TST-021, 034 and 143 include E2E checks, so their Pass depends on that earlier report. Re-run `tools/e2e.mjs` to refresh it.
- No TM-TST row failed. Every row in `tools/traceability.json` had at least one linked vitest assertion and all of them passed.
- The 8 appended requirement rows have no tests and no build. They are not verified.
- The original v2.0 Register was not edited.

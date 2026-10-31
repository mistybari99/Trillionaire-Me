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

## Run 2 (labels and Bangla library pass, 25 Oct 2026)
Source is still the original v2_0 xlsx (read only, sha256 `a65616a8…1e71` before and after).

| Item | Count / result |
|---|---|
| `node tools/evidence.mjs` | vitest 531/531 (40 files), 32 TM-TST rows with evidence, 0 failing |
| `python3 tools/update_register.py <v2_0> <v2_1_evidence_refresh>` | "updated 32 requirement rows" |
| Requirements v2 sheet | 180 rows (172 + 8 appended, not verified) |
| Evidence status of the 32 linked rows | Pass 11, Partial 21, Fail 0 |
| Requirements with no evidence | 148 (includes the 8 appended rows) |
| `node tools/e2e.mjs` | 44 PASS, 0 FAIL |
| `npx tsc --noEmit` / `npx vite build` | clean |

Changes in this run: finance outputs carry an ESTIMATE label (`tests/finance_labels.test.ts`); the Bangla library gained `public/content/pack-002.json` (14 tips, pending reviewer). Typed amounts stay DEMO until real data opens (D-B). See DECISIONS_LOG.md.


## Refresh 31 Oct 2026 (Block 6)
1. `node tools/evidence.mjs`: vitest 926/926 passed, 0 failed; 32 TM-TST rows with linked tests, all `evidenceOk = true`.
2. `python3 tools/update_register.py` regenerated `docs/register/Trillionaire_Me_Requirements_Register_v2_1_evidence_refresh.xlsx` from the v2_0 original. The original v2_0 file was not modified (sha256 checked before and after: unchanged).
3. Counts (linked TM-TST rows): Pass 11, Partial 21, Fail 0. Rows stay Partial where a manual or human gate is open (device tests, reviewer sign-off, usability sessions).
4. New this pass: Block 5 advice cards (`tests/advice.test.ts`), azan slot (`tests/prayer.test.ts`) and pack-008 add no new TM-TST mapping; their requirement rows are not marked Verified (the Register is only updated from mapped tests).
5. The `evidence/` folder is run output and is not committed.


## Run 3: mapping pass (31 Oct 2026)
Source is the original v2_0 xlsx (read only, sha256 `a65616a8...1e71` before and after). Run: `node tools/evidence.mjs` (vitest 964/964 passed, 0 failed), `node tools/e2e.mjs` (59 PASS, 0 FAIL), then `python3 tools/update_register.py` into `..._v2_1_evidence_refresh.xlsx`. The Change Log sheet of the copy has a new "Evidence" line.

Counts of linked TM-TST rows: 42 (was 32). Verified (Pass) 13 (was 11). Partial 29 (was 21). Fail 0. Requirements with no evidence: 138 (was 148).

### Newly mapped (each test file was read first)
| TM-TST | Outcome | Test | Why it counts / what is missing |
|---|---|---|---|
| 041 | Pass (was Partial) | `copy_review.test.ts`, `focus_habits_cards_ui.test.ts` | Scan of every key in en, bn, mix (the en scan moved into the same describe) plus a new check that two missed days create no task, log or reminder (no catch-up backlog) |
| 116 | Pass (was Partial) | `copy_review.test.ts`, `r5_stuck_log.test.ts`, `g3.test.ts`, `stuck.test.ts`, e2e | No shame words in any key and in the rendered stuck screen in overload (new check); overload adds 0 tasks (scheduler, stuck flow, browser) |
| 039 | Partial | `m_dependency.test.ts` | Unmet prerequisite is never placed (reason waiting_for_prerequisite); about 8 cases, no word "blocked" |
| 040 | Partial | `g3.test.ts` | 100 plans, not 200; user override with a log does not exist |
| 047 | Partial | `g3.test.ts`, `stuck.test.ts`, e2e | Adds 0 tasks; Reduce Scope and Resume Gently are not offered |
| 084 | Partial | `precache.test.ts`, e2e | Headless offline run only; real-phone airplane test is owner task O1 |
| 085 | Partial | `sync.test.ts` | Replay twice and interrupted replay, not 5x, no device |
| 086 | Partial | `sync.test.ts` | One conflict case, not 20; no resolution screen |
| 089 | Partial | `snapshots.test.ts` | Real v1 to v2 database upgrade keeps records; no failed-migration case |
| 093 | Partial | `real_entry.test.ts`, `real_data.test.ts` | No consent means nothing saved; revoke works; no full "all unrelated features" check |
| 119 | Partial | `data_mode.test.ts` | Demo and real never shown as each other; not all KPIs reconcile-tested |
| 126 | Partial | `connections.test.ts` | Everything off by default, approval and cost gate, withdraw; no live integration exists |

Test edits for the mapping were titles and moving tests into their own describe (so an id counts only its own assertions): `g3.test.ts` (003/040, 047/116, plan basics), `stuck.test.ts` (047/116 describe), `copy_review.test.ts` (041/116). Two small new assertions: no-backlog test and a rendered-text scan in overload. `tools/e2e.mjs` got two derived checks, TM-TST-047 and TM-TST-084, that pass only when the underlying checks pass.

### Rows still Partial and why (29)
| TM-TST | Reason |
|---|---|
| TM-TST-010 | Structural check passes (max 7 fields/screen). 3-user timed usability session NOT run |
| TM-TST-066 | Catalog 100% help/what-why-example/format complete. 5-user usability session NOT run |
| TM-TST-067 | Completeness indicator + next-needed with reason in 500/500 random states. User sessions NOT run |
| TM-TST-130 | Checklist done; owner confirmation line still open |
| TM-TST-161 | Bangla glossary (30 terms) + field help exist. Human reviewer sign-off NOT done; every key present and non-empty in en, bn and mix (unit parity) |
| TM-TST-022 | Money screen: net worth per scope from saved items, unknown stays unknown, nothing-entered shows 'nothing yet'. Real-user test not run |
| TM-TST-023 | Monthly cash flow on screen (one-off/yearly counted aside). 90-day review view not built |
| TM-TST-171 | Home shows 1-3 own planned actions + current stage only (DOM test + browser e2e). 5-user 10-second usability test NOT run |
| TM-TST-166 | Stage rules + journey log work: order fixed, evidence required, history append-only, calm copy (scan), before/after logged; browser e2e A->B. Stage templates beyond A are generic; usability test NOT run |
| TM-TST-053 | O7 own options + saved offline search list: save, cap 20 per field, add-own, source snapshot kept for offline reuse, secrets refused. Select/compare/customize/reject/defer and replace-history not covered |
| TM-TST-146 | Research contract via Wikipedia provider: 2-3 options with source and date, HTTP error never crashes, saved term read first. UI select/compare/reject/defer actions not covered; research contract: 0 calls without click, <2 results invents nothing (unit) |
| TM-TST-165 | O5 scoring and path fit keep unknown as unknown (not_enough_data, no guess, no 0). 'incomplete' label on early path suggestions and the full assessment flow not covered |
| TM-TST-043 | O6 90-day review: no records gives 'not enough data' (null, never 0); only in-window records counted. Weekly review itself not covered |
| TM-TST-088 | G2 backup/restore round-trip into a clean database; damaged or tampered file rejected; demo backup never restored as real; newer schema refused. Device-level checksum and attachments not covered |
| TM-TST-117 | Automated part: focus rings, 44px targets, skip link, label and heading checks on every route in en and bn. TalkBack, 200% font on device and small-viewport device runs NOT done |
| TM-TST-148 | Habits: two missed days gives a kind restart offer, never red or run-count copy; no run-count or score function. Cue/frequency/goal link not covered |
| TM-TST-151 | Sensitive topics (emotions, health, money, deen) carry a sensitive flag; app links are real routes. Advice-boundary note and expert-review flag on each finance/legal/tax/medical/religious screen NOT covered |
| TM-TST-155 | Lock-screen text hidden by default for worship, health, money and third-party; per-category 'Show details' opt-in; neutral en/bn/mix text. On-device lock-screen check, app lock and passphrase recovery NOT done (Owner) |
| TM-TST-158 | Horizon view places goals from stored data; unset goals kept apart; empty horizons are empty, not zero. Gantt, kanban, resource and readiness maps and text-equivalent check NOT covered |
| TM-TST-039 | Planner: a task with an unmet prerequisite is not placed and is deferred as waiting_for_prerequisite; it follows its prerequisite, cycles and missing ids are safe. About 8 cases, not 20 fixtures; the screen shows the link but not the word blocked |
| TM-TST-040 | 100 generated plans (not 200): 0 placements inside hard blocks, none overlap, capacity respected. User override with a log entry does not exist, so it is not tested |
| TM-TST-047 | Overload adds 0 tasks: minimum_week is a subset of the normal plan, pause places nothing (50 plans), tired/overloaded never offers a tiny step (500 answer sets), choosing Minimum week adds no task (unit and browser). Reduce Scope and Resume Gently are not offered or tested |
| TM-TST-084 | Headless Chromium with the network off: shell, status screen and cold-start screens open, every saved file readable, service worker source checks. NOT a real-device airplane run (owner task O1) |
| TM-TST-085 | Unit: replaying the same operations twice and an interrupted flush then full replay give the same state; enqueue is idempotent. No 5x run and no device |
| TM-TST-086 | Unit: two devices editing one field are detected and the loser is kept in the conflict list; same device is not a conflict. One case, not 20; no device; no resolution screen |
| TM-TST-089 | Unit: an existing version-1 IndexedDB database keeps its records after the upgrade. No failed-migration case and no device |
| TM-TST-093 | Unit: no consent means real forms save nothing and real writes are refused; demo works without consent; missing, broken or old consent is none; grant then revoke. A fuller check that every unrelated feature still works is not written |
| TM-TST-119 | Unit: demo mode shows no real data and real mode shows no demo data on any screen; totals never add demo and real. KPI reconciliation to source records is covered only for the money cards, not all KPIs |
| TM-TST-126 | Unit: every facility is off by default with a null adapter, no network call while off, enabling needs approval and states cost, withdraw switches it off, connected stubs call nothing. No real integration exists yet, so scoped revoke of a live integration is untested |

### Looked at and not mapped (no honest fit)
- 005 (baseline needed), 009 (paused goal gives no reminders), 007 (stale badge), 150 (currency), 156 (tombstone): no such code exists yet.
- 015: no explicit infeasible flag (deferred with reason only). 045: rules give suggestions but no old/new proposal. 068: tests show text equivalents for several visuals but not "every visual", and TalkBack is a device test.
- 044, 077, 078, 097, 120: `security_review.test.ts`, `g1.test.ts` and the pack guards cover parts only (no provider retention map, no log scan beyond sources, packs only). Left unmapped to avoid overstating.
- 168: offline e2e opens only some AI-free screens; the full flows are not driven offline.

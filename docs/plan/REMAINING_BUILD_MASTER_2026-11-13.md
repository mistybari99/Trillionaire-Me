# Remaining build master list (13 Nov 2026)

Read-only research. Every status below was checked against `src/` and `tests/` (grep for symbols, routes, tests, catalog fields), not copied from a doc. Docs say "built" only where code and a test file exist. Nothing here marks a requirement Verified; human and phone gates stay open. App at `0108377` (TMV2-04).

Status: Built / Partial / Missing (in code). Size: S under a day, M 1-3 days, L a week or more. Blocked-by: D-B, D-C, D-D, G5, G7, G8, phone, reviewer.

## 0. Counts

| Group | Items |
|---|---|
| A. Buildable now | 51 |
| B. Blocked by an owner decision or approval | 15 |
| C. Human gates only | 13 |
| Total after de-duplication | 79 |

Group A split: 10 charter modules (C-xx), 19 visual-queue rows (Q-xx), 14 register/planning gaps (R-xx), 8 evidence and housekeeping (V-xx). Visual queue: 34 rows, 15 Built (Q-01..13, 30, 34), 19 remain, all in A. Id prefixes: C-xx = charter modules (A1), Q-xx = visual queue, R-xx = register gaps, V-xx = evidence/housekeeping, B-xx = group B, H-xx = group C (human gates).

## A. Buildable now (no owner decision needed; defaults exist)

### A1. Charter modules (docs/charter/2026-11-08, queue TMV2-01..10, matrix rows)
TMV2-01..03 and TMV2-04 are already in code. Code proof: `src/core/ideas.ts` (`buildRecallIndex`, `filterRecall`, `similarIdeas`, `ideaHistory`), `src/ui/ideaUi.ts`, routes `/recall` and `/recall/<id>` (`src/app.ts:69-70`), `tests/ideas.test.ts`, `tests/idea_ui.test.ts`, commit `29500c3` (schema 6, `capture.state/kind/review_on`, `idea_event`); `nextActions()` in `src/core/nextAction.ts`, `tests/next_reasons.test.ts`.

| ID | Item | Source | Status in code | Size | Depends on | Blocked? |
|---|---|---|---|---|---|---|
| C-01 | Recall coverage: index notes, tasks, goals, ventures, plan history, not only capture records | Charter TMV2-01/03, matrix CAP-02, owner Recall gap | Partial: `ideas.ts:69` `source.filter(r => r.entity === "capture")`; notes/tasks/goals/ventures reach Recall only as links from an idea; no global local search (`settingsSearch.ts` is Settings only) | M | none | none |
| C-02 | Duplicate-work suggestion and merge review across capture, tasks, notes (side by side, never auto-merge) | Charter ORG-03, P0 | Partial: `similarIdeas` shown on idea page (`ideaUi.ts:118`) for ideas only | M | C-01 | none |
| C-03 | One explicit relationship graph (part_of, depends_on, shared_with, blocks) with dangling-edge preview on delete | Charter shared model, ORG-02 | Partial: `task.after` link, task/habit to up to 5 goals (`taskGoals.ts`), goal tree; no unified edge type | M | C-01 | none |
| C-04 | TMV2-05 Guided breakdown journey (one flow over worksheet, goal tree, backward plan, task links, capacity; breadcrumb Vision > Venture > Outcome > Project > Next action) | Charter TMV2-05, P1 | Missing as a flow. Pieces built: `goalWorksheet.ts`, `goalTree.ts`, `backwardPlan.ts`, `backwardUi.ts`, `qb2Ui.ts`, `planner.ts`. No guided-flow code anywhere | L | C-01 | none |
| C-05 | TMV2-06 Domain-pack contract (versioned pack: questions, templates, rules, formulas, sources, locales; adapt one neutral system + one sector family as proof) | Charter TMV2-06, GUIDE-01/02 | Partial foundation: `src/core/sectors/{types,engine,formulas,index,custom}.ts`, 28 families + custom, `src/library/systems/*.json`; no common pack schema or validator, no "Why this appears / What is missing" trace | L | C-04 | none |
| C-06 | TMV2-07 Scenario core (pure types, unit/horizon check, separate persistence, versioned migration, backup inclusion) | Charter TMV2-07, SIM-01/02 | Missing: no scenario code (grep src/ empty). Foundation: sector formula engine, ESTIMATE labels, `whatif.ts` | L | C-05 | owner default for first scenario domains; recommended default money + time (use it) |
| C-07 | TMV2-08 Simulation Lab `#/journey/simulations` + shared Quick Simulation sheet, compare, explicit Run, Save Scenario | Charter TMV2-08, SIM-03 | Partial: LIVECALC what-if exists (`src/core/whatif*.ts`, `src/ui/whatifUi.ts`, `#/whatif`, 47 calculators, save only as a note). No scenario records, no lab route, no baseline/alternative persistence | L | C-06 | none |
| C-08 | TMV2-09 Apply-to-plan review (scenario to proposed diff, approve, cancel writes nothing, rollback) | Charter TMV2-09, SIM-02 | Partial foundation: `realityLoop.ts` (`planDiff`, `planChange`, `versionRows`), `planHistory.ts`; no scenario to diff | L | C-06 | none |
| C-09 | TMV2-10 Experiments (7/14-day evidence vs estimate, stop rule), sensitivity/bottleneck summary, then full regression | Charter TMV2-10, ADAPT-02 | Missing: no experiment, sensitivity or bottleneck code in src/. KPI/review base exists (`kpi.ts`, `weeklyReview.ts`, `monthlyReview.ts`) | L | C-07, C-08 | none (phone and Bangla gates are group C) |
| C-10 | Cloud copy, client side only, OFF: real adapter behind `CloudSyncPort` with mocked provider, op queue, idempotent replay, conflict resolution screen, freshness/last-sync states | Owner 7 Nov (DECISIONS_LOG:850, build now, off by default), TM-REQ-085/086/087 | Missing: only `nullCloudSync` in `src/core/ports.ts`; the old `sync.ts` op queue was removed as dead code (no `src/core/sync.ts`) | L | none | connect step is B-05 |

### A2. Visual queue rows still to build (docs/design/visual-ref-build-queue.md section 3; 19 of 34)
Checked: no test file and no code symbol exists for any of these (tests named in the queue are absent; greps for challenge, snake, courage, change rings, mindset, setback curve, clarity grid, working-style, maturity, quick pick, focus grid, per-screen look, mantra all return nothing in `src/`). Built and present: Q-01..13 (`tests/q_b1_*.test.ts`, `concrete_bank`, `goal_icons`, `q_b2_*`, `buffer_bar`, `micro_habit`, `goal_grid`), Q-30, Q-34. All A2 rows: no owner block; keep EN/BN/Mix, 360 px, no score/streak, Unknown not 0, DEMO label.

| ID | Item (rows covered) | Status | Size | Depends on |
|---|---|---|---|---|
| Q-14 | Decision and thinking helpers: 7 prompts, 4 framework cards, Think/Tell/Act picker, 4 strategy cards (V8, V9, V15, 20) | Missing (`decide()` in `decisions.ts` only) | M | none |
| Q-15 | Horizon upgrades: one-thing line, ticks, moving marker, multi-year line (1, 30, 19, V31, V37, O16, O7) | Partial (`horizonArt.ts` static arc, `arcMarker`) | M | none |
| Q-16 | Flow diagrams: 4-step identity flow, 5-box systems flow (2, 11) | Missing (no flow in `diagram.ts`) | M | none |
| Q-17 | Path pictures: S-curve snake path, 8 stones A-H, plan/action/success captions (14, V28, V29) | Partial (text strip `journey-stage-strip`, `screens.ts:1158`) | M | none |
| Q-18 | Progress shapes: skill rings, momentum shape, 3 pillar bars, no total (V20, 26, V30) | Missing (only `progressRing`) | M | none |
| Q-19 | Reward metaphors choice, courage bridge, change rings, calm particle motion (35, 31, 32, V39, O20) | Missing (`rewardArt.ts` sky + garden only) | M | Q-17 |
| Q-20 | Setup checklist (3 phases) and "Where am I?" 3-button check (V11, 28) | Missing (`whereUi.ts` is a project-status page) | M | none |
| Q-21 | Challenge tracker `#/journey/challenge` (5) | Missing | M-L | none |
| Q-22 | Venture "everything it takes" cluster checklist (8) | Partial (`mapsUi.ts`, `ventureCard.ts`) | S | none |
| Q-23 | SOP fields: purpose, trigger, check, handoff (23) | Partial (`sop.title/steps/reviewed_on` only) | S | none |
| Q-24 | Source line under systems and glossary terms, systems search box (O8, V25) | Partial (no search in `libraryScreens.ts`, no `addedOn`) | M | none |
| Q-25 | Daily plan sheet on Today: mantra, tomorrow, make-time-for (17) | Missing | S | Q-09 (built) |
| Q-26 | Sort my tasks 2x2 plus time batching (V14, 24) | Missing (`diagram.ts` text only) | M | none |
| Q-27 | Situation picker with sample week (25) | Partial (catalog field only) | S | none |
| Q-28 | Reflection visuals: wave, setback curve, mindset stair (27, 33, 34) | Missing | M | Q-01 (built) |
| Q-29 | Photo on a note, 300 KB, excluded from export unless ticked (V19) | Missing (no photo field) | M | schema note |
| Q-31 | Small choosers: working style, maturity funnel, quick pick (7, 16, 15) | Missing | M | none |
| Q-32 | Focus 16-card grid page (13) | Missing | S | none |
| Q-33 | Per-screen look override (12) | Missing | S | Q-05 (built; `VIEW_SCREENS` now includes deen, stuck, topics, northstar, capture) |

### A3. Register and planning gaps with no code (R-xx). Source: docs/register/EVIDENCE_GAPS_2026-11-06.md plus code check
| ID | Item (TM-REQ) | Status in code | Size | Depends on |
|---|---|---|---|---|
| R-01 | Emergency reserve from own obligations (026) | Missing (no reserve code; not in `whatifCatalog.ts`) | M | none |
| R-02 | Debt plan with cost and due dates (027) | Partial (what-if EMI/payoff only; no debt register) | M | none |
| R-03 | Runway downside scenarios (029) | Partial (`runwayFor`, `b-runway` calculators; no downside) | M | C-06 (or standalone) |
| R-04 | Budget templates plus optional four-account routing (024, 025) | Missing (no template code) | M | none |
| R-05 | Adjustable 30/90/180-day and weekly roadmaps (137) | Missing (90-day review, weekly review, horizon exist separately) | M | none |
| R-06 | Planned vs actual time, spend, output (138) | Partial (`kpi.actual`, `stage_exit.actual`, focus minutes; no task estimate vs actual) | M | none |
| R-07 | Cross-goal priority conflict and resource contention (147) | Missing (TMV2-04 reasons only) | M | C-03 |
| R-08 | Local-to-national scale gate needs repeatability (060) | Missing | S | none |
| R-09 | Larger neutral opportunity library with sources (167, M04) | Partial (`src/library/paths.ts`, about 10 paths) | S per batch | text stays "unreviewed" |
| R-10 | Retention vs deletion, tombstones (156) | Missing (no tombstone code) | M | schema note |
| R-11 | Continuity and incident runbook, tested restore steps (140, G7) | Missing (no runbook file under docs/) | S | none |
| R-12 | Deen content-free completions: Zakat al-Fitr own-number figure, sadaqah/waqf/Qurbani kinds, qada count, rights list (105, 107, 109, 111) | Partial (`deenPlans.ts` kinds salah, fasting, zakat, learning, family, giving; notes areas quran, hajj, duty; no Fitr, no qada) | M | rulings are B-04 |
| R-13 | Family/care responsibilities, network, devices/connectivity/literacy profile fields (016, 018) | Missing (only `constraint.kind=family`) | S | none |
| R-14 | Vertical-space dropdown prototype (UX-03) | Docs only: `docs/audit/DROPDOWN_SPACE_AUDIT_2026-11-07.md` | M | phone usability check is a human gate |

### A4. Evidence, audit and housekeeping the builder can do (V-xx)
| ID | Item | Status | Size |
|---|---|---|---|
| V-01 | Link tests to the 86 G0-G3 requirement rows still "Not verified" (EVIDENCE_GAPS list); many are built (goal tree 037, ventures 142, stuck 174/175, topics 183, reality 045/046) | Partial: 44 of 172 TM-TST rows linked (14 Pass, 30 Partial) | L, ongoing |
| V-02 | Link or add tests for 30 "Built" legacy rows lacking a test (VERIFY-01) | Partial | M |
| V-03 | Audit PASS queue (read-only Audit agent): Q-01..09 batch 1; BUILD-01 work blocks; DECISION-01 vault; TMV2-01..03 (no tracker row at all); TMV2-04; LIVECALC-01 (also needs UI-05) | Missing | M |
| V-04 | Re-run four-look matrix after merge `7d34280`; other 3 looks in Mix (VERIFY-02, UI-04) | Partial | S |
| V-05 | OPS-01 remote failed-CI blocking trial; OPS-03 remote Preview behaviour | Partial | S |
| V-06 | PR #1 text update and normal merge at a quiet green point; close PR #2 (owner 7 Nov: builder knows procedure; no force, no branch deletion) | Missing | S |
| V-07 | Fix stale status claims (section 4) incl. `src/modules/capability.ts` M21/M23, tracker rows for TMV2-01..03, W1, W3, W5 | Missing | S |
| V-08 | Regenerate Register copy (`python3 tools/update_register.py`) after the next evidence run | Missing | S |

## B. Blocked by an owner decision or approval

| ID | Item | Source | Status in code | Size | Blocked by |
|---|---|---|---|---|---|
| B-01 | Connect AI provider, Google search key, online quotes, set spend cap | DECISION-02, V27 part, O4 | Built, OFF: `aiGuard.ts`, `aiKey.ts`, `aiUsage.ts`, `aiConnectUi.ts`, tests `ai_*.test.ts` | S (owner action) | D-C |
| B-02 | AI coaches / AI plan help screens (M23 calc and output) | V27, M23 | Missing | L | D-C, B-01 |
| B-03 | Scripture/Quran/tafsir text, hadith as verified content, Quran logs with text | DECISION-03, O9, DF-08 | Partial: hadith reader + 212-entry pack (`hadith.ts`, `hadithPack.json`); Quran note only, no text | M | D-D, reviewer |
| B-04 | Deen rulings: qada/fidya/kaffara, zakat rule versions, Hajj sources, halal filter | G5, TM-REQ-105/106 | Partial: `zakatFigure` from own numbers; no rulings | L | G5, qualified reviewer |
| B-05 | Cloud copy connect: provider, account, cost, retention | DECISION-04 | Missing (needs A1 C-10 first) | M | owner account step, cost |
| B-06 | Staff/customer data-viewing and public edition: roles, tenant isolation, templates, achievements | DECISION-04, G8, DF-02/05, TM-REQ-170 | Missing | L | G8, gate-specific plan, owner approval |
| B-07 | PC/desktop version | DF-01 | Missing | L | G8 |
| B-08 | Home-screen widget / native wrap (Capacitor) | V22, D-A, G2 | Missing | L | G2 phone result, D-A |
| B-09 | Share progress card, colour picker | V23 | Missing | M | owner OK each time (data leaves device) |
| B-10 | Ambient sounds, voice, sound sheets | V24 | Missing (`public/audio` has azan only) | M | licensed audio |
| B-11 | External integrations (calendar, email, CRM, payment), ERP bridge, franchise | DF-04/07/10 | Missing | L | G6+, D-C |
| B-12 | Account recovery, session revocation, role/data scopes, audit log | TM-REQ-090/096/097 | Missing | L | D-B/cloud, B-05/B-06 |
| B-13 | Weekly/monthly grids for "other trackers" (row 4 residual) | owner-demand row 4, Q-34 note | Partial: goals only (`goal_grid.test.ts`) | S | owner must name the trackers (do not invent) |
| B-14 | 2D/3D visual extras | DF-06 | Missing | M | G8 |
| B-15 | Vault stage 2 (passkey unlock) | at-rest-encryption.md | Missing | M | optional owner choice, phone WebAuthn test |

## C. Human gates only (no builder work)

| ID | Item | Maps to | Status |
|---|---|---|---|
| H-01 | Android install, airplane-mode cold start, interrupted update, clean-device restore, cold-download size, G2 device matrix | OWNER-01, O10, G2-8, TM-TST-084 | Blocked |
| H-02 | Reminder delivery with app closed, lock-screen privacy, Bangla keyboard delete | OWNER-02, O14, TM-TST-155 | Blocked |
| H-03 | Prayer times vs official Bangladesh timetable | OWNER-03, O2, TM-TST-101 | Blocked |
| H-04 | Named Bangla reviewer sign-off (glossary, catalog, content) | OWNER-04, O1, O11, TM-TST-161 | Blocked |
| H-05 | Usability sessions (5) and 7-day personal pilot | OWNER-05, O12, G1-14 | Blocked |
| H-06 | Local and qualified content review (Bangladesh pack, halal check) | OWNER-06 | Blocked |
| H-07 | Phone look and branding preference | OWNER-07, O6 | Blocked |
| H-08 | Azan licence confirmation, real playback, volume, speed | OWNER-08, O3 | 4 files bundled (Noor, Sakinah, Salam, Hidayah); phone check open |
| H-09 | TalkBack and contrast acceptance on a physical phone | UI-02..05 | Blocked |
| H-10 | Real-phone vault, app-lock and recovery check; 10k-record timing | DECISION-01 remainder | Blocked |
| H-11 | Lawyer review (G7) | G7, TM-REQ-094/096 | Blocked |
| H-12 | G0 owner written "ok" for the frozen Spec and Register | early-plan G0-1 | Not in repo |
| H-13 | Hosting account step | O13, O4 | Probably stale: tracker says Cloudflare already connected (conflict 6) |

(Group C = H-01..H-13.)

## 4. Conflicts between sources (higher source wins: Spec > Register > Brief > Preview; newer dated entry over older)
1. **Queue vs tracker.** Tracker BUILD-03: batch 1 "audit pending", batches 2 and 3 "audit PASS". Queue section 3b says all three "audit pending". Queue section 2 row table (counts 8/45/29/15) was never recounted after 15 rows were built; rows V3, V13, 21, 22, 10, 9 still show MISSING or PARTIAL.
2. **DECISION-04.** Tracker: Blocked. DECISIONS_LOG 7 Nov: build now, off by default. CLAUDE.md section 8 and Spec section 13: G8 needs new approval. Resolved here: client cloud copy is A (C-10), connect is B-05, staff/public edition is B-06 until a gate-specific plan exists.
3. **Capability card is stale.** `src/modules/capability.ts` M21 still says "data on the device is not encrypted" (vault stage 1 is built: `dataVault.ts`, `tests/data_vault*.test.ts`); M23 still shows calc and output missing although the AI layer is built, off. `docs/design/m-list-status.md` says "partial 2" but lists one.
4. **Charter matrix (8 Nov) is older than code.** CAP-01/02 "no inbox state" and SIM-03 "Missing" predate `29500c3` (inbox lifecycle, Recall) and LIVECALC-01 (13 Nov). Recall is built but capture-only. No tracker row exists for TMV2-01..03.
5. **BUILD-01.** Tracker: audit pending, TM-REQ-040 unverified. DECISIONS_LOG and merge `53a0e77`: "audit PASS after fixes". VERIFY-01 says the override core was removed; the owner then redefined it as optional manual work blocks.
6. **Hosting.** owner-demand-audit O13 and early-plan O4 say the account step is open; tracker says Cloudflare is already connected and needs no setup.
7. **Old status docs.** `early-plan-status.md` (24 Oct) lists M13 trackers, M14, M19, G2-4, G3-19 as missing or skipped; all changed later. `BUILD_COMPLETENESS_2026-11-02.md` (17 partial) is superseded by m-list (22 complete). `build-plan-next.md` steps 1-6 are all built. `docs/ROADMAP.md` and `docs/TODO.md` (5 Nov) still call BUILD-01/02 "need clarified inputs" (answered 7 Nov).
8. **Register vs code.** 86 rows read "Not verified - no build" while the feature exists. An evidence gap, not a build gap (V-01).
9. **Counts.** owner-demand audit 3 Nov: 132 rows, 57 partial + 40 missing = 97 open, matches the queue's 97. Tracker header says "Updated 5 Nov" with rows dated to 13 Nov.

## 5. Recommended build order (big modules)
1. **Truth first (V-07, V-03).** Fix capability.ts, add tracker rows for TMV2-01..03, run the audit queue. Cheap; stops false claims in the app.
2. **Recall completion (C-01, C-02).** Foundation every later module reuses; derived index only, no schema change.
3. **Visual queue in batches** (owner ordered Q-01..34 on 7 Nov): batch 4 = Q-22, Q-23, Q-25, Q-27, Q-32, Q-33 (all S); batch 5 = Q-14, Q-20, Q-24, Q-26; batch 6 = Q-15, Q-16, Q-17, then Q-19; batch 7 = Q-18, Q-28, Q-31, Q-21, Q-29. Independent of the charter chain, can run in parallel with step 4.
4. **Charter chain in order:** C-04 guided breakdown, C-05 domain pack, C-06 scenario core, C-07 simulation lab, C-08 apply-to-plan, C-09 experiments. Each needs a Prompt-Engineer work order and an Audit PASS before the next.
5. **Money and planning gaps (R-01 to R-08)** once C-06 exists (R-03 reuses it); R-07 after C-03.
6. **Cloud copy client (C-10)** last of the large builds, OFF, mocked provider; it unlocks B-05, B-06, B-12 only after owner approval.
7. **Evidence work (V-01, V-02, V-08)** alongside every step; run V-04 and V-05 once per release.

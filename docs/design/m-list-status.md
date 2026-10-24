# M-list status (কী কী চলছে) — evidence table

Owner request: every "আছে / আংশিক / নেই" label must match the code. Source of truth for the labels: `src/modules/capability.ts`. Evidence: `src/modules/evidence.ts`. Check: `tests/m_list_status.test.ts`.

Rules:
- **আছে** (built): a screen or function is reachable in the app, and a test covers it.
- **আংশিক** (partly): only part is reachable, or only rules or data exist (no main screen or no entry).
- **নেই** (not built): nothing user-facing yet.

Route paths are from `src/app.ts`. "Tests" are test files in `tests/`.

## Summary

| Status | Count | Modules |
|---|---|---|
| আছে | 13 | M01, M02, M04, M05, M06, M07, M08, M11, M16, M17, M21, M22, M25 |
| আংশিক | 8 | M03, M09, M12, M13, M14, M18, M20, M24 |
| নেই | 4 | M10, M15, M19, M23 |

## Full table

| ID | Module (EN) | Status | Route | Evidence file(s) | Tests |
|---|---|---|---|---|---|
| M01 | Profile & consent | আছে | `#/diary/intake` | `src/ui/screens.ts` (`intake`) | `tests/g3ui.test.ts` |
| M02 | Discover (assessment) | আছে | `#/diary/plan` | `src/ui/assessment.ts` (`assessmentSection`), `src/core/assessment.ts` (`assessmentFrom`) | `tests/o5_assessment_fit.test.ts` |
| M03 | North Star & ladder | আংশিক | `#/journey/horizon` | `src/core/horizon.ts` (`groupByHorizon`); no North Star logic | `tests/horizon.test.ts` |
| M04 | Paths & opportunity library | আছে | `#/diary/plan` | `src/core/assessment.ts` (`pathFit`), `src/library/paths.ts` | `tests/o5_assessment_fit.test.ts` |
| M05 | Stages & journey log | আছে | `#/journey`, `#/journey/log` | `src/ui/screens.ts` (`journeyLog`), `src/core/stages.ts` (`passStage`) | `tests/stages.test.ts` |
| M06 | Goals, tasks & habits | আছে | `#/today`, `#/habits` | `src/ui/screens.ts` (`habitsScreen`, `focusScreen`) | `tests/focus_habits_cards.test.ts`, `tests/goal_form.test.ts` |
| M07 | Resources & finance | আছে | `#/diary/money` | `src/ui/screens.ts` (`moneyScreen`), `src/core/finance.ts` (`netWorth`) | `tests/money.test.ts` |
| M08 | Time & capacity | আছে | `#/diary/plan` | `src/core/planner.ts` (`schedule`) | `tests/b9_plan_flow.test.ts` |
| M09 | Venture portfolio | আংশিক | — | `src/catalog/fields.ts` (`venture.*` definitions only; step 0, not in intake; no list screen) | `tests/g1.test.ts` |
| M10 | Team & delegation | নেই | — | — | — |
| M11 | Research & options | আছে | `#/diary/intake` (input help button) | `src/core/research.ts` (`research`), `src/adapters/wikipedia.ts` (`wikipedia`), `src/ui/screens.ts` (`suggestPanel`). Makes a Wikipedia request only after the user taps. | `tests/research.test.ts`, `tests/wikipedia.test.ts` |
| M12 | Reality-changed & plan history | আংশিক | `#/diary/plan` | `src/core/reality.ts` (`markNotTrue`), `src/ui/screens.ts` (`markRealityChanged`). No plan-history screen. | `tests/o6_reality_review_templates.test.ts` |
| M13 | Deen, ibadah & akhirah | আংশিক | `#/deen` | `src/schema/entities.ts` (M13 entities); deen fields are step 0, not in intake. Read-only field guide. | `tests/g1.test.ts` |
| M14 | Health & family | আংশিক | — | `src/catalog/fields.ts` (`profile.health_note`, step 0, not in intake) | `tests/g1.test.ts` |
| M15 | Risk & stop criteria | নেই | — | — | — |
| M16 | Reviews & KPI | আছে | `#/journey/review`, `#/journey/report` | `src/core/review.ts` (`reviewSummary`). No KPI targets. | `tests/o6_reality_review_templates.test.ts` |
| M17 | Knowledge & sources | আছে | `#/cards`, `#/topics` | `src/ui/screens.ts` (`cardsScreen`), `src/core/cards.ts` (`dueCards`), `src/library/topics.ts`. Sources not tracked. | `tests/focus_habits_cards.test.ts`, `tests/topics_rewards.test.ts` |
| M18 | Visual layer | আংশিক | `#/journey/art` (ladder on `#/journey`) | `src/ui/rewardArt.ts` (`journeyArt`), `src/ui/diagram.ts` (`diagram`), `src/ui/screens.ts` (`stageLadder`). Other planned charts not built. | `tests/r4_motion.test.ts` |
| M19 | Automation rules | নেই | — | — | — |
| M20 | Sync, backup & export | আংশিক | `#/more/data` | `src/core/backup.ts` (`createBackup`, `restoreBackup`) works for Demo data. `src/core/sync.ts` is rules only (no sync UI). | `tests/g2.test.ts`, `tests/sync.test.ts` |
| M21 | Security & privacy | আছে | `#/more/safety`, `#/more` (lock screen) | `src/core/safety.ts` (`checkFreeText`). Full legal review is G7. | `tests/g1.test.ts`, `tests/o8_notify_privacy.test.ts` |
| M22 | Capability status & demo | আছে | `#/more/status` | `src/ui/screens.ts` (`status`) | `tests/g1.test.ts` |
| M23 | AI layer | নেই | — | — | — |
| M24 | Template library | আংশিক | `#/journey` (template picker) | `src/core/stageTemplates.ts` (`stagesFor`): 3 stage templates only | `tests/o6_reality_review_templates.test.ts` |
| M25 | When stuck | আছে | `#/stuck` | `src/ui/screens.ts` (`stuckScreen`), `src/core/stuck.ts` (`diagnose`) | `tests/stuck.test.ts` |

## The "অন্যান্য অংশ" (More) list

Items shown in More → আরও অংশ (M22 is the status screen itself and is excluded there):

| ID | Status | Note shown in app |
|---|---|---|
| M11 | আছে | Wikipedia options when online; saved searches work offline |
| M17 | আছে | Flashcards and topic guides; sources not tracked |
| M18 | আংশিক | Stage ladder, journey art and tip diagrams; other charts later |
| M19 | নেই | Not built yet |
| M20 | আংশিক | Demo backup save and restore; sync not built |
| M21 | আছে | Secret blocking and private lock screen; full legal review G7 |
| M23 | নেই | Not built; comes in G6 with owner approval |
| M24 | আংশিক | 3 stage templates; larger library not built |

## Corrections made in this pass

- M11: the old note said "G1-এ কোনো network কল নেই" and the status said not built. The app does call Wikipedia after the user taps "Suggest options" (the consent text says so). Now shown as built with "Needs internet".
- M13, M14, M09: the old list said the fields or notes could be filled in. They are only defined in the field guide; there is no entry screen. Now partly built.
- M07, M16, M17, M18, M24, M25: the old list said not built, but screens exist. Now built or partly built as above.
- M20: the old note said only export rules existed. Demo backup save and restore exist. Sync does not.
- The "পরিকল্পনা: G…" tag is hidden on built items.

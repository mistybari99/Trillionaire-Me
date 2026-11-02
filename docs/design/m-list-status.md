# Module build status (generated, 2 Nov 2026)

Source of truth: `src/modules/capability.ts` (six build boxes per module, label computed). Evidence: `src/modules/evidence.ts`. Checks: `tests/m_list_status.test.ts`, `tests/field_reach.test.ts`, `tests/link_check.test.ts`. Regenerate: `npx vite-node tools/m_list_doc.ts`.

The card answers one question: is the software's own build complete? It does not depend on any data typed. What this phone holds (empty, demo, real) is a separate line (`src/modules/dataStatus.ts`).

Boxes (order): Input, Storage, Calculation, Output, Export, Links. B = built, M = missing, - = not needed.
Label: complete = no box missing; partial = some box missing; not-built = no box built; blocked = waits for an owner approval (D-number).

Counts: complete 13, partial 10, not-built 1, blocked 1 (of 25).

| Module | Name | Label | I S C O E L | Missing boxes | Waits for | Routes / functions | Tests |
|---|---|---|---|---|---|---|---|
| M01 | Profile & consent | partial | B B B M B B | output | - | `#/diary/intake`; `src/ui/screens.ts#intake` | `tests/g3ui.test.ts` |
| M02 | Discover (assessment) | partial | M B B M B B | input, output | - | `#/diary/plan`; `src/ui/assessment.ts#assessmentSection`; `src/core/assessment.ts#assessmentFrom` | `tests/o5_assessment_fit.test.ts` |
| M03 | North Star & ladder | complete | B B B B B B | - | - | `#/journey/horizon`; `#/journey/northstar`; `#/journey`; `#/today`; `#/journey/report`; `src/core/horizon.ts#groupByHorizon`; `src/core/northStar.ts#ladder`; `src/core/northStar.ts#nowOf`; `src/core/northStar.ts#progressOf`; `src/core/northStar.ts#overallProgress` | `tests/north_star.test.ts`, `tests/horizon.test.ts`, `tests/m_registers.test.ts` |
| M04 | Paths & opportunity library | partial | - - B M - B | output | - | `#/diary/plan`; `src/core/assessment.ts#pathFit` | `tests/o5_assessment_fit.test.ts` |
| M05 | Stages & journey log | complete | B B B B B B | - | - | `#/journey`; `#/journey/log`; `#/journey/gates`; `#/today`; `#/journey/report`; `src/ui/screens.ts#journeyLog`; `src/core/stages.ts#passStage`; `src/core/stageGates.ts#exitStatus`; `src/core/stageGates.ts#gateDue` | `tests/stages.test.ts`, `tests/stage_gates.test.ts` |
| M06 | Goals, tasks & habits | complete | B B B B B B | - | - | `#/today`; `#/habits`; `#/diary/plan`; `#/journey/goals`; `src/ui/screens.ts#habitsScreen`; `src/ui/screens.ts#focusScreen`; `src/core/planner.ts#schedule`; `src/core/goalTree.ts#buildTree`; `src/core/goalTree.ts#validatePlace` | `tests/goal_tree.test.ts`, `tests/focus_habits_cards.test.ts`, `tests/goal_form.test.ts`, `tests/m_dependency.test.ts` |
| M07 | Resources & finance | partial | B B M B B M | calc, links | - | `#/diary/money`; `src/ui/screens.ts#moneyScreen`; `src/core/finance.ts#netWorth` | `tests/money.test.ts` |
| M08 | Time & capacity | partial | B B M M B B | calc, output | - | `#/diary/plan`; `src/core/planner.ts#schedule` | `tests/b9_plan_flow.test.ts` |
| M09 | Venture portfolio | partial | B B M B B B | calc | - | `#/diary/ventures`; `#/diary/money`; `#/today`; `#/journey/report`; `src/core/ventures.ts#ventureViews`; `src/core/ventures.ts#portfolio`; `src/core/ventures.ts#ventureAccounts` | `tests/m_registers.test.ts`, `tests/venture_value.test.ts` |
| M10 | Team & delegation | complete | B B B B B B | - | - | `#/diary/team`; `#/diary/plan`; `#/today`; `#/journey/report`; `src/core/team.ts#roleSummary`; `src/core/team.ts#roleViews`; `src/core/team.ts#analyseTeam`; `src/core/team.ts#syncDelegation`; `src/core/team.ts#completeHandover` | `tests/team_handover.test.ts`, `tests/m_registers.test.ts` |
| M11 | Research & options | complete | B B B B B B | - | - | `#/diary/intake`; `src/ui/screens.ts#intake`; `src/core/research.ts#research`; `src/adapters/wikipedia.ts#wikipedia` | `tests/research.test.ts`, `tests/wikipedia.test.ts`, `tests/m11_background_cache.test.ts` |
| M12 | Reality-changed & plan history | complete | B B B B B B | - | - | `#/journey/reality`; `#/journey/history`; `#/today`; `#/journey/report`; `#/diary/plan`; `src/core/realityLoop.ts#impactOf`; `src/core/realityLoop.ts#optionsFor`; `src/core/realityLoop.ts#planChange`; `src/core/realityLoop.ts#planDiff`; `src/core/realityLoop.ts#versionRows`; `src/core/reality.ts#markNotTrue`; `src/core/planHistory.ts#planHistory` | `tests/reality_loop.test.ts`, `tests/o6_reality_review_templates.test.ts`, `tests/m_registers.test.ts` |
| M13 | Deen, ibadah & akhirah | partial | M B M M B B | input, calc, output | - | `#/deen`; `src/core/prayerLog.ts#markedOn`; `src/core/fastLog.ts#isFastMarked`; `src/core/prayer.ts#prayerTimes`; `src/core/prayerAlerts.ts#alertSlots` | `tests/prayer.test.ts`, `tests/g1.test.ts`, `tests/fast_log.test.ts` |
| M14 | Health & family | not-built | M M M M M M | input, store, calc, output, export, links | - | - | - |
| M15 | Risk & stop criteria | complete | B B B B B B | - | - | `#/journey/risks`; `#/today`; `#/journey/report`; `#/journey/reality`; `src/core/risk.ts#riskRows`; `src/core/risk.ts#riskDue`; `src/core/risk.ts#dueRisks`; `src/core/risk.ts#reviewedRisk` | `tests/risk_review.test.ts`, `tests/m_registers.test.ts` |
| M16 | Reviews & KPIs | complete | B B B B B B | - | - | `#/journey/review`; `#/journey/report`; `#/journey/week`; `#/journey/month`; `#/journey/kpi`; `src/core/review.ts#reviewSummary`; `src/core/kpi.ts#kpiStatus`; `src/core/monthlyReview.ts#monthlySummary`; `src/core/monthlyReview.ts#moneyReview` | `tests/o6_reality_review_templates.test.ts`, `tests/kpi.test.ts`, `tests/month_review.test.ts` |
| M17 | Knowledge & sources | partial | M M B B B B | input, store | - | `#/cards`; `#/topics`; `src/ui/screens.ts#cardsScreen`; `src/core/cards.ts#dueCards` | `tests/focus_habits_cards.test.ts`, `tests/topics_rewards.test.ts` |
| M18 | Visual layer | partial | - - B M - B | output | - | `#/journey/art`; `src/ui/rewardArt.ts#journeyArt`; `src/ui/diagram.ts#diagram` | `tests/r4_motion.test.ts` |
| M19 | Automation rules | complete | B B B B B B | - | - | `#/settings/plan/automation`; `#/today`; `src/core/rules.ts#evaluateRules` | `tests/rules.test.ts`, `tests/m_systems_rules_ui.test.ts` |
| M20 | Sync, backup & export | complete | B B B B B B | - | - | `#/settings/backup`; `#/settings/data`; `#/journey/print`; `src/core/backup.ts#createBackup`; `src/core/backup.ts#restoreBackup`; `src/core/restore.ts#restoreBackupAtomic`; `src/core/printDoc.ts#planDoc` | `tests/g2.test.ts`, `tests/restore_safety.test.ts`, `tests/restore_ui.test.ts`, `tests/print_pdf.test.ts` |
| M21 | Security & privacy | partial | B M B B B B | store | - | `#/more/safety`; `#/settings/privacy`; `src/core/safety.ts#checkFreeText` | `tests/g1.test.ts`, `tests/o8_notify_privacy.test.ts` |
| M22 | Capability status & demo | complete | - - B B - B | - | - | `#/more/status`; `src/ui/screens.ts#status` | `tests/g1.test.ts` |
| M23 | AI layer | blocked | - - M M - - | calc, output | D-C | - | `tests/connections.test.ts` |
| M24 | Template library | complete | B B B B B B | - | - | `#/more/library`; `#/journey`; `src/core/systems.ts#addSystem`; `src/core/systems.ts#planSystem`; `src/core/stageTemplates.ts#stagesFor` | `tests/systems.test.ts`, `tests/m_systems_rules_ui.test.ts`, `tests/o6_reality_review_templates.test.ts` |
| M25 | When stuck | complete | B B B B B B | - | - | `#/stuck`; `src/ui/screens.ts#stuckScreen`; `src/core/stuck.ts#diagnose` | `tests/stuck.test.ts` |

# M-list status (কী কী চলছে) — evidence table

Owner request: every "আছে / আংশিক / নেই" label must match the code. Source of truth for the labels: `src/modules/capability.ts`. Evidence: `src/modules/evidence.ts`. Check: `tests/m_list_status.test.ts`. The Wikipedia research line (M11) uses the owner's label, not "internet needed" (24 Oct 2026).

Rules:
- **আছে** (built): a screen or function is reachable in the app, and a test covers it.
- **আংশিক** (partly): only part is reachable, or only rules or data exist (no main screen or no entry).
- **নেই** (not built): nothing user-facing yet.

## Summary

| Status | Count | Modules |
|---|---|---|
| আছে | 14 | M01, M02, M04, M05, M06, M07, M08, M11, M15, M16, M17, M21, M22, M25 |
| আংশিক | 9 | M03, M09, M10, M12, M13, M14, M18, M20, M24 |
| নেই | 2 | M19, M23 |

## Full table

| ID | Module (EN) | Status | Route | Evidence file(s) | Tests |
|---|---|---|---|---|---|
| M01 | Profile & consent | আছে | `#/diary/intake` | `src/ui/screens.ts (`intake`)` | `tests/g3ui.test.ts` |
| M02 | Discover (assessment) | আছে | `#/diary/plan` | `src/ui/assessment.ts (`assessmentSection`)`; `src/core/assessment.ts (`assessmentFrom`)` | `tests/o5_assessment_fit.test.ts` |
| M03 | North Star & ladder | আংশিক | `#/journey/horizon`, `#/journey/northstar` | `src/core/horizon.ts (`groupByHorizon`)`; `src/core/northStar.ts (`ladder`)` | `tests/horizon.test.ts`, `tests/m_registers.test.ts` |
| M04 | Paths & opportunity library | আছে | `#/diary/plan` | `src/core/assessment.ts (`pathFit`)`; `src/library/paths.ts` | `tests/o5_assessment_fit.test.ts` |
| M05 | Stages & journey log | আছে | `#/journey`, `#/journey/log` | `src/ui/screens.ts (`journeyLog`)`; `src/core/stages.ts (`passStage`)` | `tests/stages.test.ts` |
| M06 | Goals, tasks & habits | আছে | `#/today`, `#/habits`, `#/diary/plan` | `src/ui/screens.ts (`habitsScreen`)`; `src/ui/screens.ts (`focusScreen`)`; `src/core/planner.ts (`schedule`)` | `tests/focus_habits_cards.test.ts`, `tests/goal_form.test.ts`, `tests/m_dependency.test.ts` |
| M07 | Resources & finance | আছে | `#/diary/money` | `src/ui/screens.ts (`moneyScreen`)`; `src/core/finance.ts (`netWorth`)` | `tests/money.test.ts` |
| M08 | Time & capacity | আছে | `#/diary/plan` | `src/core/planner.ts (`schedule`)` | `tests/b9_plan_flow.test.ts` |
| M09 | Venture portfolio | আংশিক | `#/diary/ventures` | `src/core/ventures.ts (`ventureRows`)`; `src/catalog/fields.ts` | `tests/m_registers.test.ts` |
| M10 | Team & delegation | আংশিক | `#/diary/team` | `src/core/team.ts (`roleSummary`)` | `tests/m_registers.test.ts` |
| M11 | Research & options | আছে | `#/diary/intake` | `src/ui/screens.ts (`intake`)`; `src/core/research.ts (`research`)`; `src/adapters/wikipedia.ts (`wikipedia`)` | `tests/research.test.ts`, `tests/wikipedia.test.ts`, `tests/m11_background_cache.test.ts` |
| M12 | Reality-changed & plan history | আংশিক | `#/diary/plan`, `#/journey/history` | `src/core/reality.ts (`markNotTrue`)`; `src/core/planHistory.ts (`planHistory`)` | `tests/o6_reality_review_templates.test.ts`, `tests/m_registers.test.ts` |
| M13 | Deen, ibadah & akhirah | আংশিক | `#/deen` | `src/core/prayerLog.ts (`markedOn`)`; `src/core/fastLog.ts (`isFastMarked`)`; `src/core/prayer.ts (`prayerTimes`)`; `src/schema/entities.ts` | `tests/prayer.test.ts`, `tests/g1.test.ts`, `tests/fast_log.test.ts` |
| M14 | Health & family | আংশিক | — | `src/catalog/fields.ts` | `tests/g1.test.ts` |
| M15 | Risk & stop criteria | আছে | `#/journey/risks` | `src/core/risk.ts (`riskRows`)` | `tests/m_registers.test.ts` |
| M16 | Reviews & KPIs | আছে | `#/journey/review`, `#/journey/report` | `src/core/review.ts (`reviewSummary`)` | `tests/o6_reality_review_templates.test.ts` |
| M17 | Knowledge & sources | আছে | `#/cards`, `#/topics` | `src/ui/screens.ts (`cardsScreen`)`; `src/core/cards.ts (`dueCards`)`; `src/library/topics.ts` | `tests/focus_habits_cards.test.ts`, `tests/topics_rewards.test.ts` |
| M18 | Visual layer | আংশিক | `#/journey/art` | `src/ui/rewardArt.ts (`journeyArt`)`; `src/ui/diagram.ts (`diagram`)` | `tests/r4_motion.test.ts` |
| M19 | Automation rules | নেই | — | — | — |
| M20 | Sync, backup & export | আংশিক | `#/more/data` | `src/core/backup.ts (`createBackup`)`; `src/core/backup.ts (`restoreBackup`)`; `src/core/sync.ts` | `tests/g2.test.ts`, `tests/sync.test.ts` |
| M21 | Security & privacy | আছে | `#/more/safety`, `#/more` | `src/core/safety.ts (`checkFreeText`)` | `tests/g1.test.ts`, `tests/o8_notify_privacy.test.ts` |
| M22 | Capability status & demo | আছে | `#/more/status` | `src/ui/screens.ts (`status`)` | `tests/g1.test.ts` |
| M23 | AI layer | নেই | — | — | — |
| M24 | Template library | আংশিক | `#/journey` | `src/core/stageTemplates.ts (`stagesFor`)` | `tests/o6_reality_review_templates.test.ts` |
| M25 | When stuck | আছে | `#/stuck` | `src/ui/screens.ts (`stuckScreen`)`; `src/core/stuck.ts (`diagnose`)` | `tests/stuck.test.ts` |

## The "অন্যান্য অংশ" (More) list

Items shown in More → আরও অংশ (M22 is the status screen itself and is excluded there):

| ID | Status | Note shown in app |
|---|---|---|
| M11 | আছে | Tap 'Suggest options' in an input to get 2-3 Wikipedia options. The first search is saved on this phone, so the same search shows here later. No search runs when the app opens. |
| M17 | আছে | Flashcards and topic guides work. Sources are not tracked separately yet. |
| M18 | আংশিক | Stage ladder, journey art and small tip diagrams exist. Other charts come later, each with a text version. |
| M19 | নেই | Not built yet. |
| M20 | আংশিক | Demo backup save and restore work ('More > Demo & real data'). Sync is not built; only its rules exist. |
| M21 | আছে | Blocks secrets (passwords, OTP and similar). Lock screen stays private. Full legal review is at G7. |
| M23 | নেই | Not built. Everything works without AI; it comes in G6 with owner approval. |
| M24 | আংশিক | Three stage templates (general, learning, business) can be chosen. A larger library is not built. |

## Changes in the 24 Oct 2026 pass

- **M11 (owner):** the label is now "Wikipedia (saved in background)" / "উইকিপিডিয়া (ব্যাকগ্রাউন্ডে সংরক্ষিত)". The first search result is saved on the phone when it arrives (not only when a card is picked), so the same term works offline. Nothing is searched at app start. The `internet-needed` key stays in the registry, but no module uses it.
- **M23:** the "internet needed" tag is removed; it stays "not built" until G6 with owner approval.
- **M15 (risk & stop criteria):** not built → built (risk register with stop rule and review date, demo data).
- **M09 (ventures):** not built list → list screen with name, stage and ownership (unknown stays unknown). Still partial: no value or income maths.
- **M10 (team & delegation):** not built → partial: roles and who covers them, no names stored. Still partial: no handover or hiring steps.
- **M12 (plan history):** partial, with a history screen for finished and no-longer-true steps.
- **M03 (North Star & ladder):** partial, with North Star measures and an even step ladder (unknown start or target gives no ladder).
- **M06 (goals, tasks & habits):** a task can be set to come after another task (one link; the planner waits for it).
- **M07 (finance):** adds the 90-day cash flow (three months of monthly flows; one-off and yearly items are counted, not converted).
- **M13 (deen):** the status was out of date (prayer marks and prayer times are built). Fasting day marks added; nothing is counted or ranked.

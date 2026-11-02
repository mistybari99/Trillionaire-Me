// Evidence behind each module status (TM-REQ-144). tests/m_list_status.test.ts checks every entry:
// - routes: must match a route in src/app.ts ROUTES
// - fns: "file#exportName" must be an export in that file
// - files / tests: must exist on disk
// "complete" needs a route, an exported function and a test; "partial" needs a route, fn or file; "not-built" needs no route or fn; "blocked" needs its ready part (files).
export interface Evidence { routes: string[]; fns: string[]; files: string[]; tests: string[] }

const ev = (routes: string[], fns: string[], files: string[], tests: string[]): Evidence => ({ routes, fns, files, tests });

export const EVIDENCE: Record<string, Evidence> = {
  M01: ev(["#/diary/intake"], ["src/ui/screens.ts#intake"], [], ["tests/g3ui.test.ts"]),
  M02: ev(["#/diary/plan"], ["src/ui/assessment.ts#assessmentSection", "src/core/assessment.ts#assessmentFrom"], [], ["tests/o5_assessment_fit.test.ts"]),
  M03: ev(["#/journey/horizon", "#/journey/northstar", "#/journey", "#/today", "#/journey/report"], ["src/core/horizon.ts#groupByHorizon", "src/core/northStar.ts#ladder", "src/core/northStar.ts#nowOf", "src/core/northStar.ts#progressOf", "src/core/northStar.ts#overallProgress"], ["src/ui/northStarCard.ts", "src/catalog/fields.ts"], ["tests/north_star.test.ts", "tests/horizon.test.ts", "tests/m_registers.test.ts"]),
  M04: ev(["#/diary/plan"], ["src/core/assessment.ts#pathFit"], ["src/library/paths.ts"], ["tests/o5_assessment_fit.test.ts"]),
  M05: ev(["#/journey", "#/journey/log"], ["src/ui/screens.ts#journeyLog", "src/core/stages.ts#passStage"], [], ["tests/stages.test.ts"]),
  M06: ev(["#/today", "#/habits", "#/diary/plan"], ["src/ui/screens.ts#habitsScreen", "src/ui/screens.ts#focusScreen", "src/core/planner.ts#schedule"], [], ["tests/focus_habits_cards.test.ts", "tests/goal_form.test.ts", "tests/m_dependency.test.ts"]),
  M07: ev(["#/diary/money"], ["src/ui/screens.ts#moneyScreen", "src/core/finance.ts#netWorth"], [], ["tests/money.test.ts"]),
  M08: ev(["#/diary/plan"], ["src/core/planner.ts#schedule"], [], ["tests/b9_plan_flow.test.ts"]),
  M09: ev(["#/diary/ventures", "#/diary/money", "#/today", "#/journey/report"], ["src/core/ventures.ts#ventureViews", "src/core/ventures.ts#portfolio", "src/core/ventures.ts#ventureAccounts"], ["src/catalog/fields.ts", "src/ui/ventureCard.ts"], ["tests/m_registers.test.ts", "tests/venture_value.test.ts"]),
  M10: ev(["#/diary/team", "#/diary/plan", "#/today", "#/journey/report"], ["src/core/team.ts#roleSummary", "src/core/team.ts#roleViews", "src/core/team.ts#analyseTeam", "src/core/team.ts#syncDelegation", "src/core/team.ts#completeHandover"], ["src/ui/teamCard.ts", "src/catalog/fields.ts"], ["tests/team_handover.test.ts", "tests/m_registers.test.ts"]),
  M11: ev(["#/diary/intake"], ["src/ui/screens.ts#intake", "src/core/research.ts#research", "src/adapters/wikipedia.ts#wikipedia"], [], ["tests/research.test.ts", "tests/wikipedia.test.ts", "tests/m11_background_cache.test.ts"]),
  M12: ev(["#/journey/reality", "#/journey/history", "#/today", "#/journey/report", "#/diary/plan"], ["src/core/realityLoop.ts#impactOf", "src/core/realityLoop.ts#optionsFor", "src/core/realityLoop.ts#planChange", "src/core/realityLoop.ts#planDiff", "src/core/realityLoop.ts#versionRows", "src/core/reality.ts#markNotTrue", "src/core/planHistory.ts#planHistory"], ["src/ui/realityUi.ts", "src/catalog/fields.ts"], ["tests/reality_loop.test.ts", "tests/o6_reality_review_templates.test.ts", "tests/m_registers.test.ts"]),
  M13: ev(["#/deen"], ["src/core/prayerLog.ts#markedOn", "src/core/fastLog.ts#isFastMarked", "src/core/prayer.ts#prayerTimes", "src/core/prayerAlerts.ts#alertSlots"], ["src/schema/entities.ts"], ["tests/prayer.test.ts", "tests/g1.test.ts", "tests/fast_log.test.ts"]),
  M14: ev([], [], ["src/catalog/fields.ts"], []),
  M15: ev(["#/journey/risks", "#/today", "#/journey/report", "#/journey/reality"], ["src/core/risk.ts#riskRows", "src/core/risk.ts#riskDue", "src/core/risk.ts#dueRisks", "src/core/risk.ts#reviewedRisk"], ["src/ui/riskCard.ts"], ["tests/risk_review.test.ts", "tests/m_registers.test.ts"]),
  M16: ev(["#/journey/review", "#/journey/report", "#/journey/week", "#/journey/kpi"], ["src/core/review.ts#reviewSummary", "src/core/kpi.ts#kpiStatus"], [], ["tests/o6_reality_review_templates.test.ts", "tests/kpi.test.ts"]),
  M17: ev(["#/cards", "#/topics"], ["src/ui/screens.ts#cardsScreen", "src/core/cards.ts#dueCards"], ["src/library/topics.ts"], ["tests/focus_habits_cards.test.ts", "tests/topics_rewards.test.ts"]),
  M18: ev(["#/journey/art"], ["src/ui/rewardArt.ts#journeyArt", "src/ui/diagram.ts#diagram"], [], ["tests/r4_motion.test.ts"]),
  M19: ev(["#/settings/plan/automation", "#/today"], ["src/core/rules.ts#evaluateRules"], [], ["tests/rules.test.ts", "tests/m_systems_rules_ui.test.ts"]),
  M20: ev(["#/settings/backup", "#/settings/data"], ["src/core/backup.ts#createBackup", "src/core/backup.ts#restoreBackup", "src/core/restore.ts#restoreBackupAtomic"], [], ["tests/g2.test.ts", "tests/restore_safety.test.ts", "tests/restore_ui.test.ts"]),
  M21: ev(["#/more/safety", "#/settings/privacy"], ["src/core/safety.ts#checkFreeText"], [], ["tests/g1.test.ts", "tests/o8_notify_privacy.test.ts"]),
  M22: ev(["#/more/status"], ["src/ui/screens.ts#status"], [], ["tests/g1.test.ts"]),
  M23: ev([], [], ["src/core/ports.ts", "src/adapters/connectedStubs.ts"], ["tests/connections.test.ts"]),
  M24: ev(["#/more/library", "#/journey"], ["src/core/systems.ts#addSystem", "src/core/systems.ts#planSystem", "src/core/stageTemplates.ts#stagesFor"], ["src/library/systemList.ts"], ["tests/systems.test.ts", "tests/m_systems_rules_ui.test.ts", "tests/o6_reality_review_templates.test.ts"]),
  M25: ev(["#/stuck"], ["src/ui/screens.ts#stuckScreen", "src/core/stuck.ts#diagnose"], [], ["tests/stuck.test.ts"]),
};

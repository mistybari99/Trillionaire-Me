// Evidence behind each module status (TM-REQ-144). tests/m_list_status.test.ts checks every entry:
// - routes: must match a route in src/app.ts ROUTES
// - fns: "file#exportName" must be an export in that file
// - files / tests: must exist on disk
// "implemented" needs at least one route or fn; "partial" needs a route, fn or file; "not-built" needs none.
export interface Evidence { routes: string[]; fns: string[]; files: string[]; tests: string[] }

const ev = (routes: string[], fns: string[], files: string[], tests: string[]): Evidence => ({ routes, fns, files, tests });
const NONE = ev([], [], [], []);

export const EVIDENCE: Record<string, Evidence> = {
  M01: ev(["#/diary/intake"], ["src/ui/screens.ts#intake"], [], ["tests/g3ui.test.ts"]),
  M02: ev(["#/diary/plan"], ["src/ui/assessment.ts#assessmentSection", "src/core/assessment.ts#assessmentFrom"], [], ["tests/o5_assessment_fit.test.ts"]),
  M03: ev(["#/journey/horizon", "#/journey/northstar"], ["src/core/horizon.ts#groupByHorizon", "src/core/northStar.ts#ladder"], [], ["tests/horizon.test.ts", "tests/m_registers.test.ts"]),
  M04: ev(["#/diary/plan"], ["src/core/assessment.ts#pathFit"], ["src/library/paths.ts"], ["tests/o5_assessment_fit.test.ts"]),
  M05: ev(["#/journey", "#/journey/log"], ["src/ui/screens.ts#journeyLog", "src/core/stages.ts#passStage"], [], ["tests/stages.test.ts"]),
  M06: ev(["#/today", "#/habits", "#/diary/plan"], ["src/ui/screens.ts#habitsScreen", "src/ui/screens.ts#focusScreen", "src/core/planner.ts#schedule"], [], ["tests/focus_habits_cards.test.ts", "tests/goal_form.test.ts", "tests/m_dependency.test.ts"]),
  M07: ev(["#/diary/money"], ["src/ui/screens.ts#moneyScreen", "src/core/finance.ts#netWorth"], [], ["tests/money.test.ts"]),
  M08: ev(["#/diary/plan"], ["src/core/planner.ts#schedule"], [], ["tests/b9_plan_flow.test.ts"]),
  M09: ev(["#/diary/ventures"], ["src/core/ventures.ts#ventureRows"], ["src/catalog/fields.ts"], ["tests/m_registers.test.ts"]),
  M10: ev(["#/diary/team"], ["src/core/team.ts#roleSummary"], [], ["tests/m_registers.test.ts"]),
  M11: ev(["#/diary/intake"], ["src/ui/screens.ts#intake", "src/core/research.ts#research", "src/adapters/wikipedia.ts#wikipedia"], [], ["tests/research.test.ts", "tests/wikipedia.test.ts", "tests/m11_background_cache.test.ts"]),
  M12: ev(["#/diary/plan", "#/journey/history"], ["src/core/reality.ts#markNotTrue", "src/core/planHistory.ts#planHistory"], [], ["tests/o6_reality_review_templates.test.ts", "tests/m_registers.test.ts"]),
  M13: ev(["#/deen"], ["src/core/prayerLog.ts#markedOn", "src/core/fastLog.ts#isFastMarked", "src/core/prayer.ts#prayerTimes", "src/core/prayerAlerts.ts#alertSlots"], ["src/schema/entities.ts"], ["tests/prayer.test.ts", "tests/g1.test.ts", "tests/fast_log.test.ts"]),
  M14: ev([], [], ["src/catalog/fields.ts"], ["tests/g1.test.ts"]),
  M15: ev(["#/journey/risks"], ["src/core/risk.ts#riskRows"], [], ["tests/m_registers.test.ts"]),
  M16: ev(["#/journey/review", "#/journey/report"], ["src/core/review.ts#reviewSummary"], [], ["tests/o6_reality_review_templates.test.ts"]),
  M17: ev(["#/cards", "#/topics"], ["src/ui/screens.ts#cardsScreen", "src/core/cards.ts#dueCards"], ["src/library/topics.ts"], ["tests/focus_habits_cards.test.ts", "tests/topics_rewards.test.ts"]),
  M18: ev(["#/journey/art"], ["src/ui/rewardArt.ts#journeyArt", "src/ui/diagram.ts#diagram"], [], ["tests/r4_motion.test.ts"]),
  M19: NONE,
  M20: ev(["#/more/data"], ["src/core/backup.ts#createBackup", "src/core/backup.ts#restoreBackup"], ["src/core/sync.ts"], ["tests/g2.test.ts", "tests/sync.test.ts"]),
  M21: ev(["#/more/safety", "#/more"], ["src/core/safety.ts#checkFreeText"], [], ["tests/g1.test.ts", "tests/o8_notify_privacy.test.ts"]),
  M22: ev(["#/more/status"], ["src/ui/screens.ts#status"], [], ["tests/g1.test.ts"]),
  M23: NONE,
  M24: ev(["#/journey"], ["src/core/stageTemplates.ts#stagesFor"], [], ["tests/o6_reality_review_templates.test.ts"]),
  M25: ev(["#/stuck"], ["src/ui/screens.ts#stuckScreen", "src/core/stuck.ts#diagnose"], [], ["tests/stuck.test.ts"]),
};

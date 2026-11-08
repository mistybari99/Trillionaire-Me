import type { Key } from "../i18n/packs";

export const TAB_DEFINITIONS = [
  ["today", "nav.today"], ["journey", "nav.journey"], ["diary", "nav.diary"], ["deen", "nav.deen"], ["settings", "nav.settings"],
] as const;
export type TabId = typeof TAB_DEFINITIONS[number][0];
export interface TabAction { id: string; href: string; label: Key; type: "route" | "prayer"; quickPrayer?: boolean }
const action = (id: string, href: string, label: Key, quickPrayer = false): TabAction => ({ id, href, label, type: quickPrayer ? "prayer" : "route", ...(quickPrayer ? { quickPrayer } : {}) });

/** Navigation inventory only: no recommendations, counts or record reads. */
export const TAB_ACTIONS: Record<TabId, readonly TabAction[]> = {
  today: [action("home", "#/today", "nav.today"), action("plan", "#/diary/plan", "plan.title"), action("goals", "#/journey/goals", "goals.link"), action("money", "#/diary/money", "money.title"), action("capture", "#/capture", "capture.link"), action("habits", "#/habits", "habits.link")],
  journey: [action("home", "#/journey", "nav.journey"), action("goals", "#/journey/goals", "goals.link"), action("boards", "#/journey/boards", "bd.link"), action("horizon", "#/journey/horizon", "horizon.link"), action("week", "#/journey/week", "week.link"), action("report", "#/journey/report", "report.link")],
  diary: [action("home", "#/diary", "nav.diary"), action("intake", "#/diary/intake", "diary.start"), action("plan", "#/diary/plan", "plan.title"), action("money", "#/diary/money", "money.title"), action("ventures", "#/diary/ventures", "ven.link"), action("health", "#/diary/health", "hl.title")],
  deen: [action("home", "#/deen", "nav.deen"), action("prayers", "#/deen/prayers", "deen.prayer.title", true), action("fasting", "#/deen/fasting", "deen.fast.title"), action("plans", "#/deen/plans", "dp.title"), action("settings", "#/settings/prayer", "set.cat.prayer")],
  settings: [action("home", "#/settings", "nav.settings"), action("look", "#/settings/look", "set.cat.look"), action("backup", "#/settings/backup", "set.cat.backup"), action("privacy", "#/settings/privacy", "set.cat.privacy"), action("prayer", "#/settings/prayer", "set.cat.prayer"), action("data", "#/settings/data", "set.cat.data")],
};

/** Floating quick-action head (W5b): Capture, prayer mark, Stuck, Today. Capture, prayer and Today are the SAME entries as above (shared, not copied). */
export const STUCK_ACTION: TabAction = action("stuck", "#/stuck", "stuck.title");
export const HEAD_ACTIONS: readonly TabAction[] = [
  TAB_ACTIONS.today.find((a) => a.id === "capture")!,
  TAB_ACTIONS.deen.find((a) => a.quickPrayer)!,
  STUCK_ACTION,
  TAB_ACTIONS.today.find((a) => a.id === "home")!,
];

export function isTabId(value: string): value is TabId { return TAB_DEFINITIONS.some(([id]) => id === value); }
export const getTabActions = (tab: TabId): readonly TabAction[] => TAB_ACTIONS[tab];

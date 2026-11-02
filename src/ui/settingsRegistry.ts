// Settings registry (settings redesign PR 2). One list: every setting the app has, with its category, its label, search words,
// the prefs fields / storage keys it owns, and the route where it can be changed today. Nothing in the UI is hand-listed twice.
// No UI imports here, so the registry test and the search can use it without a screen.
import type { Key } from "../i18n/packs";

export const CATEGORIES = ["look", "prayer", "backup", "privacy", "data", "plan", "connections", "delete"] as const;
export type CatKey = (typeof CATEGORIES)[number];
/** "home" holds the Quick card (language, theme, text size). "about" is Guides & info (no settings except the welcome replay). */
export type Cat = CatKey | "home" | "about";
export const isCat = (v: unknown): v is Cat => v === "home" || v === "about" || (CATEGORIES as readonly unknown[]).includes(v);

export interface SettingRow {
  id: string; cat: Cat; label: Key;
  /** extra search words (English; Bangla words come from the label itself) */
  words: string[];
  /** fields of `prefs` this row owns (src/ui/state.ts). Every prefs field is owned by exactly one row. */
  prefs: string[];
  /** other storage keys it owns (per-screen view keys are owned by the "density" row) */
  keys: string[];
  /** where the control lives right now (hash route). Quick-card rows live on the Settings home. */
  route: string;
  /** a setting that changes data or asks for a danger step (shown calmly, never on the home) */
  danger?: boolean;
}

const R = (id: string, cat: Cat, label: Key, route: string, words: string[], prefs: string[] = [], keys: string[] = [], danger = false): SettingRow => ({ id, cat, label, words, prefs, keys, route, ...(danger ? { danger } : {}) });

export const ROWS: SettingRow[] = [
  R("language", "home", "more.language", "#/settings/home/language", ["language", "bangla", "english", "mix", "bn", "en"], ["lang"], ["tm:ui:lang"]),
  R("theme", "home", "more.theme", "#/settings/home/theme", ["theme", "dark", "light", "night", "mode", "auto"], ["theme"], ["tm:ui:theme"]),
  R("textsize", "home", "more.textsize", "#/settings/home/textsize", ["text size", "font", "bigger", "larger", "zoom", "scale"], ["scale"], ["tm:ui:scale"]),

  R("design", "look", "more.design", "#/settings/look/design", ["design", "version", "look", "style", "colour", "color"], ["design"], ["tm:ui:design"]),
  R("density", "look", "set.row.density", "#/settings/look/density", ["detailed", "compact", "full", "screen view", "template"], [], ["tm:ui:view:*"]),
  R("horizon", "look", "set.row.horizon", "#/journey/horizon", ["horizon", "layout", "stack"], ["horizonView"], ["tm:ui:horizonView"]),
  R("universe", "look", "set.row.universe", "#/journey/universe", ["universe", "goal map", "map", "list"], ["universeView"], ["tm:ui:universeView"]),
  R("habitgrid", "look", "set.row.habitgrid", "#/habits", ["habit", "grid", "days", "weeks", "months", "range"], ["habitGrid"], ["tm:ui:habitGrid"]),
  R("motion", "look", "set.row.motion", "#/settings/look/motion", ["motion", "animation", "reduce", "calm", "movement"], ["reduceMotion"], ["tm:ui:reduceMotion"]),
  R("resetlook", "look", "set.row.resetlook", "#/settings/look/resetlook", ["reset", "default look", "layout", "restore defaults"], [], []),

  R("prayermethod", "prayer", "set.row.prayermethod", "#/settings/prayer/prayermethod", ["prayer", "method", "namaz", "salah", "asr", "offset", "fajr"], ["prayerSettings"], ["tm:ui:prayerSettings"]),
  R("prayerplace", "prayer", "set.row.prayerplace", "#/settings/prayer/prayerplace", ["place", "location", "city", "dhaka", "coordinates", "latitude"], ["prayerCoords"], ["tm:ui:prayerCoords", "tm:ui:prayerCoords:real"]),
  R("prayeralerts", "prayer", "set.row.prayeralerts", "#/settings/prayer/prayeralerts", ["alert", "azan", "adhan", "reminder", "sound", "volume", "notification"], ["prayerAlerts", "prayerFired"], ["tm:ui:prayerAlerts", "tm:ui:prayerFired"]),

  R("reminder", "backup", "set.row.reminder", "#/settings/backup/reminder", ["backup", "reminder", "weekly", "remind"], ["backupRemind", "backupRemindChoice", "remindSnoozedOn", "fileBackupAt", "realBackupAt"], ["tm:ui:backupRemind", "tm:ui:remindSnoozedOn", "tm:ui:fileBackupAt", "tm:ui:realBackupAt"]),
  R("storage", "backup", "set.row.storage", "#/settings/backup/storage", ["storage", "persist", "keep data", "safe"], [], []),
  R("savebackup", "backup", "set.row.savebackup", "#/settings/backup/savebackup", ["backup", "save", "json", "encrypted", "passphrase", "export", "file"], [], []),
  R("restore", "backup", "set.row.restore", "#/settings/backup/restore", ["restore", "import", "backup", "snapshot file", "go back"], [], []),
  R("snapshots", "backup", "set.row.snapshots", "#/settings/backup/snapshots", ["snapshot", "automatic", "keep", "copies"], ["snapAuto", "snapKeep"], ["tm:ui:snapAuto", "tm:ui:snapKeep"]),
  R("csv", "backup", "set.row.csv", "#/settings/backup/csv", ["csv", "spreadsheet", "excel", "export", "import"], [], []),

  R("lockscreen", "privacy", "more.lock", "#/settings/privacy/lockscreen", ["lock screen", "notification", "private", "show details", "hide"], ["notifyShow"], ["tm:ui:notifyShow"]),
  R("consent", "privacy", "set.row.consent", "#/settings/privacy/consent", ["consent", "permission", "real data", "tick", "private"], [], ["tm:consent:real:v1", "tm:consent:health:v1", "tm:consent:hadith:v1"]),
  R("applock", "privacy", "set.row.applock", "#/settings/privacy/applock", ["pin", "lock", "password", "app lock", "forgot"], [], ["tm:secret:applock"]),

  R("mode", "data", "set.row.mode", "#/settings/data/mode", ["demo", "real", "mode", "switch"], ["dataMode", "dataModeChoice", "demoAskedOn", "demoDays"], ["tm:ui:dataMode", "tm:ui:demoAskedOn", "tm:ui:demoDays"]),
  R("startreal", "data", "set.row.startreal", "#/settings/data/start-real", ["start real", "begin", "own data"], [], [], true),

  R("rules", "plan", "more.rules", "#/settings/plan/rules", ["automation", "rules", "smaller step", "break", "focus"], ["ruleSwitches", "lastFocusEnd", "lastRestAt"], ["tm:ui:rules", "tm:ui:focusEnd", "tm:ui:restAt"]),
  R("planmode", "plan", "set.row.planmode", "#/settings/plan/planmode", ["plan mode", "minimum week", "pause", "normal", "stuck"], ["mode"], ["tm:ui:mode"]),
  R("stages", "plan", "set.row.stages", "#/settings/plan/stages", ["stage names", "stage", "template", "journey"], ["stageTemplate"], ["tm:ui:stageTemplate"]),
  R("weighting", "plan", "set.row.weighting", "#/settings/plan/weighting", ["progress", "weight", "equal", "size", "overall"], ["progressMode"], ["tm:ui:progressMode", "tm:ui:overallMem:*"]),

  R("connections", "connections", "more.connections", "#/settings/connections", ["connection", "ai", "cloud", "sync", "web search", "licensed", "api key", "approve"], [], ["tm:ui:conn:*", "tm:secret:conn:*"]),

  R("deletedemo", "delete", "set.row.deletedemo", "#/settings/delete", ["delete", "demo", "clear", "remove"], [], [], true),
  R("deletereal", "delete", "set.row.deletereal", "#/settings/delete", ["delete", "real", "clear", "erase", "remove all"], [], [], true),

  R("welcome", "about", "set.row.welcome", "#/start", ["welcome", "intro", "first run", "onboarding", "again"], ["onboard", "onboardTimes", "movedNote"], ["tm:ui:onboard", "tm:ui:onboardT", "tm:ui:movedNote"]),
];

/** Guides & info: content pages that are not settings. They keep their URLs and are listed on #/settings/about. */
export const GUIDES: Array<{ id: string; route: string; label: Key; desc: Key }> = [
  { id: "topics", route: "#/topics", label: "topics.title", desc: "topics.intro" },
  { id: "library", route: "#/more/library", label: "more.library", desc: "more.library.desc" },
  { id: "cards", route: "#/cards", label: "cards.title", desc: "cards.intro" },
  { id: "hadith", route: "#/hadith", label: "hd.link", desc: "hd.link.desc" },
  { id: "notes", route: "#/notes", label: "kn.title", desc: "kn.intro.short" },
  { id: "status", route: "#/more/status", label: "more.status", desc: "more.status.desc" },
  { id: "fields", route: "#/more/fields", label: "more.fields", desc: "more.fields.desc" },
  { id: "glossary", route: "#/more/glossary", label: "more.glossary", desc: "more.glossary.desc" },
  { id: "dictionary", route: "#/more/dictionary", label: "dict.title", desc: "dict.intro.short" },
  { id: "halalflags", route: "#/more/halal-flags", label: "more.halal", desc: "more.halal.desc" },
  { id: "safety", route: "#/more/safety", label: "more.safety", desc: "more.safety.desc" },
];

export const CAT_LABEL: Record<Cat, Key> = {
  home: "set.quick", look: "set.cat.look", prayer: "set.cat.prayer", backup: "set.cat.backup", privacy: "set.cat.privacy",
  data: "set.cat.data", plan: "set.cat.plan", connections: "set.cat.connections", delete: "set.cat.delete", about: "set.cat.about",
};

export const rowsOf = (cat: Cat): SettingRow[] => ROWS.filter((r) => r.cat === cat);
export const rowById = (id: string): SettingRow | undefined => ROWS.find((r) => r.id === id);
/** Hash for a category page, or for one row inside it (#/settings/<cat>[/<row>]). The home category is #/settings. */
export const settingsHash = (cat: Cat, row?: string): string => (cat === "home" && !row ? "#/settings" : `#/settings/${cat}${row ? `/${row}` : ""}`);

/** Extra Bangla search words (what people really type). Labels themselves are searched in all three languages. */
export const SEARCH_BN: Record<string, string[]> = {
  language: ["ভাষা", "বাংলা", "ইংরেজি"], theme: ["থিম", "অন্ধকার", "আলো", "রাত", "ডার্ক"], textsize: ["ফন্ট", "লেখা", "বড়", "সাইজ", "আকার"],
  design: ["ডিজাইন", "রং", "লুক"], density: ["বিস্তারিত", "ছোট", "কমপ্যাক্ট"], horizon: ["হরাইজন", "লেআউট"], universe: ["ইউনিভার্স", "ম্যাপ"], habitgrid: ["হ্যাবিট", "গ্রিড"],
  motion: ["অ্যানিমেশন", "নড়াচড়া", "মোশন"], resetlook: ["রিসেট", "আগের মতো"],
  prayermethod: ["নামাজ", "আসর", "ফজর", "পদ্ধতি"], prayerplace: ["জায়গা", "শহর", "ঢাকা", "লোকেশন"], prayeralerts: ["অ্যালার্ট", "আজান", "নামাজ", "সাউন্ড"],
  reminder: ["রিমাইন্ডার", "ব্যাকআপ"], storage: ["স্টোরেজ", "নিরাপদ"], savebackup: ["ব্যাকআপ", "সেভ", "পাসফ্রেজ"], restore: ["ফেরান", "রিস্টোর", "ব্যাকআপ"], snapshots: ["স্ন্যাপশট", "কপি"], csv: ["স্প্রেডশিট", "এক্সেল"],
  lockscreen: ["লক স্ক্রিন", "নোটিফিকেশন"], consent: ["পারমিশন", "রিয়েল", "অনুমতি"], applock: ["পিন", "লক", "পাসওয়ার্ড"],
  mode: ["ডেমো", "রিয়েল", "মোড"], startreal: ["রিয়েল শুরু", "শুরু"],
  rules: ["নিয়ম", "অটোমেটিক"], planmode: ["প্ল্যান", "বিরতি", "ন্যূনতম"], stages: ["স্টেজ", "নাম"], weighting: ["প্রোগ্রেস", "ওজন"],
  connections: ["কানেকশন", "এআই", "ক্লাউড"], deletedemo: ["ডিলিট", "ডেমো", "মুছুন"], deletereal: ["ডিলিট", "রিয়েল", "মুছুন"], welcome: ["স্বাগত", "শুরুর ধাপ"],
};

import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from "../i18n/registry";
import { LocalKV, MemoryKV, REAL_DATA_ENABLED, Store } from "../core/store";
import { readConsent } from "../core/consent";
import { isTemplateId, type TemplateId } from "../core/stageTemplates";
import { MirrorKV, SaveMonitor, hydrate, mirrorToRepo } from "../core/persist";
import { LazyDexieRepo } from "../adapters/lazyDexie";
import { migrateAll } from "../core/migrate";
import { moveListsToReal } from "../core/savedLists";
import { StoreRepo } from "../adapters/storeRepo";
import { DEFAULT_KEEP, isKeep, reminderEnabled, takeSnapshot, type SnapshotRepo } from "../core/snapshots";
import { parseNotifyPrefs, type NotifyPrefs } from "../core/notify";
import { DHAKA_COORDS, validCoords, type Coords } from "../core/prayer";
import { DEFAULT_ALERT_PREFS, parseAlertPrefs, type AlertPrefs } from "../core/prayerAlerts";
import { parseSyncSettings, type SyncSettings } from "../core/prayerSource";
import { parsePrayerSettings, type PrayerSettings } from "../core/prayerMethod";
import { isDataMode, type DataMode } from "../core/dataMode";
import { applyDesign, migrateDesignId } from "./themes";
import { isProgressMode, type ProgressMemory, type ProgressMode } from "../core/overallProgress";
import { parseRuleSwitches, type FocusEnd, type RuleSwitches } from "../core/rules";

/** Failed writes are tracked here and shown as a banner (never swallowed). */
export const saveMonitor = new SaveMonitor();
const isRecordKey = (k: string) => /^tm:(demo|real):/.test(k);
const legacy = new LocalKV((k, v, ok) => { if (!isRecordKey(k)) return; if (ok) saveMonitor.ok(k); else saveMonitor.fail(k, v); });
const mem = new MemoryKV();
// Consent lives in the per-device store (localStorage). Real writes to IndexedDB need the same gate as memory.
const repo = typeof indexedDB !== "undefined" ? new LazyDexieRepo("tm-db", () => REAL_DATA_ENABLED && readConsent(legacy)) : null;
// With IndexedDB: memory is mirrored to it. Without (private mode/old browser): fall back to the old localStorage store.
const kv = repo ? new MirrorKV(mem, mirrorToRepo(repo, saveMonitor)) : legacy;
if (!repo) saveMonitor.bind(() => { for (const [k, v] of saveMonitor.entries()) if (v !== null) legacy.set(k, v); });
export const store = new Store(kv, { consentKv: legacy });
/** Local snapshot storage (same IndexedDB). null when IndexedDB is not available (private mode, old browser). */
export const snapshotRepo: SnapshotRepo | null = repo ? repo.snapshots() : null;
/** Per-device consent record (src/core/consent.ts). Same place as the other small per-device settings. */
export const consentKv = legacy;
/** Call once before the first render. */
export async function initStorage(): Promise<void> {
  if (repo) { try { await hydrate(mem, repo, legacy); } catch { /* start empty rather than crash */ } }
  // Old-version records are upgraded after a snapshot copy is saved; if the copy cannot be saved, nothing is changed.
  try {
    await migrateAll(mem, repo, async () => {
      if (!snapshotRepo) return; // no IndexedDB: nothing to copy into; the migration steps never drop values
      await takeSnapshot(new StoreRepo(store), snapshotRepo, { reason: "before_migrate", keep: 10, realOk: readConsent(legacy) });
    });
  } catch { /* records stay as they are */ }
}

const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

import { parseOnboard, parseTimes, type OnboardState, type OnboardTimes } from "../core/onboarding";
export type PlanMode = "normal" | "minimum_week" | "pause";
export type HorizonView = "stack" | "compact";
/** Template chooser for the dashboard screens. "full" is the default; unknown values fall back to it. */
export type ScreenView = "full" | "compact";
export const VIEW_SCREENS = ["journey", "money", "habits", "plan", "report", "review", "today", "log", "goals", "risks", "ventures", "team", "history", "cards", "library", "rules", "wheel", "weekly"] as const;
export type ViewScreen = typeof VIEW_SCREENS[number];
const VIEW_KEY = (s: string) => `tm:ui:view:${s}`;
const isView = (v: unknown): v is ScreenView => v === "compact" || v === "full";
/** The master Detailed/Compact choice (additive key tm:ui:view:_default). Never set = Detailed. The master never writes the per-screen keys. */
export const masterView = (): ScreenView => (get(VIEW_KEY("_default")) === "compact" ? "compact" : "full");
export const setMasterView = (v: ScreenView) => set(VIEW_KEY("_default"), v === "compact" ? "compact" : "full");
/** A screen's own choice, or null when it was never set (then it follows the master). */
export const screenViewOwn = (s: ViewScreen): ScreenView | null => { const v = get(VIEW_KEY(s)); return isView(v) ? v : null; };
export const screenView = (s: ViewScreen): ScreenView => screenViewOwn(s) ?? masterView();
/** Choosing the same layout as the master clears the screen's own key (it follows the master again). */
export const setScreenView = (s: ViewScreen, v: ScreenView) => { if (v === masterView()) clearScreenView(s); else set(VIEW_KEY(s), v); };
export const clearScreenView = (s: ViewScreen) => { try { localStorage.removeItem(VIEW_KEY(s)); } catch { /* ignore */ } };
/** Screens whose own choice differs from the master (shown in Settings > Look & screens). */
export const screensDifferingFromMaster = (): ViewScreen[] => VIEW_SCREENS.filter((s) => { const o = screenViewOwn(s); return o !== null && o !== masterView(); });
/** Reset look & layout: design, every Detailed/Compact key (master included), horizon, universe, habit grid, reduce motion. Never data, consent, lock, prayer, connections, language, theme or text size. */
export function resetLookLayout(): void {
  for (const k of ["tm:ui:design", "tm:ui:horizonView", "tm:ui:universeView", "tm:ui:habitGrid", "tm:ui:reduceMotion", VIEW_KEY("_default"), ...VIEW_SCREENS.map(VIEW_KEY)]) { try { localStorage.removeItem(k); } catch { /* ignore */ } }
}
export const MOVED_NOTE_DAYS = 14;
export type ReduceMotion = "system" | "always";
export type GridRange = "days31" | "weeks12" | "months12";
export const prefs = {
  /** Reduce motion: follow the phone (default) or always reduce. The CSS already follows the phone setting. */
  /** One-time "what moved" note: "" = not shown yet, an ISO time = first shown, "done" = dismissed. Additive key. */
  get movedNote(): string { return get("tm:ui:movedNote") ?? ""; },
  set movedNote(v: string) { set("tm:ui:movedNote", v); },
  get reduceMotion(): ReduceMotion { return get("tm:ui:reduceMotion") === "always" ? "always" : "system"; },
  set reduceMotion(v: ReduceMotion) { set("tm:ui:reduceMotion", v === "always" ? "always" : "system"); },
  /** Habit grid range on the Habits screen. Unknown or missing = 31 days. */
  get habitGrid(): GridRange { const v = get("tm:ui:habitGrid"); return v === "weeks12" || v === "months12" ? v : "days31"; },
  set habitGrid(v: GridRange) { set("tm:ui:habitGrid", v); },
  /** Unknown, missing or blocked storage falls back to the default (Bangla). */
  get lang(): Locale { const v = get("tm:ui:lang"); return isLocale(v) ? v : DEFAULT_LOCALE; },
  set lang(v: Locale) { set("tm:ui:lang", v); },
  get theme(): "auto" | "light" | "dark" { const v = get("tm:ui:theme"); return v === "light" || v === "dark" ? v : "auto"; },
  set theme(v: "auto" | "light" | "dark") { set("tm:ui:theme", v); },
  /** Design version (src/ui/themes.ts). Unknown, missing or blocked value falls back to the default (light-futuristic). The old saved value "classic" is migrated to "ink-paper". */
  get design(): string { const v = get("tm:ui:design"); const m = migrateDesignId(v); if (v === "classic") set("tm:ui:design", m); return m; },
  set design(v: string) { set("tm:ui:design", migrateDesignId(v)); },
  /** Overall progress weighting. Unknown or missing value = "equal". */
  get progressMode(): ProgressMode { const v = get("tm:ui:progressMode"); return isProgressMode(v) ? v : "equal"; },
  set progressMode(v: ProgressMode) { set("tm:ui:progressMode", isProgressMode(v) ? v : "equal"); },
  /** Goal Universe view: "map" (default) or "list". Unknown or missing value = map. */
  get universeView(): "map" | "list" { return get("tm:ui:universeView") === "list" ? "list" : "map"; },
  set universeView(v: "map" | "list") { set("tm:ui:universeView", v === "list" ? "list" : "map"); },
  /** Automatic local snapshot when the app opens (about once a day). On by default; the owner asked for it. */
  get snapAuto(): boolean { return get("tm:ui:snapAuto") !== "off"; },
  set snapAuto(v: boolean) { set("tm:ui:snapAuto", v ? "on" : "off"); },
  /** How many snapshots to keep: 3, 5 or 10. Unknown or missing value = 5. */
  get snapKeep(): number { const n = Number(get("tm:ui:snapKeep")); return isKeep(n) ? n : DEFAULT_KEEP; },
  set snapKeep(v: number) { set("tm:ui:snapKeep", String(isKeep(v) ? v : DEFAULT_KEEP)); },
  /** Backup reminder inside the app. With no choice made it is ON once real records exist (and the real-data tick is given), OFF otherwise. The user's own on/off always wins. */
  get backupRemind(): boolean { const v = get("tm:ui:backupRemind"); return reminderEnabled(v === "on" || v === "off" ? v : null, readConsent(legacy) && store.real.list().length > 0); },
  set backupRemind(v: boolean) { set("tm:ui:backupRemind", v ? "on" : "off"); },
  /** The user's own reminder choice, or null when none was made (then the default applies). */
  get backupRemindChoice(): "on" | "off" | null { const v = get("tm:ui:backupRemind"); return v === "on" || v === "off" ? v : null; },
  /** When a backup file was last saved on this device (ISO), or "" for never. */
  get fileBackupAt(): string { return get("tm:ui:fileBackupAt") ?? ""; },
  set fileBackupAt(v: string) { set("tm:ui:fileBackupAt", v); },
  /** When a backup file that holds real entries was last saved (ISO), or "" for never. Additive key. */
  get realBackupAt(): string { return get("tm:ui:realBackupAt") ?? ""; },
  set realBackupAt(v: string) { set("tm:ui:realBackupAt", v); },
  /** Day (YYYY-MM-DD) the user chose "remind me tomorrow". */
  get remindSnoozedOn(): string { return get("tm:ui:remindSnoozedOn") ?? ""; },
  set remindSnoozedOn(v: string) { set("tm:ui:remindSnoozedOn", v); },
  get scale(): number { const n = Number(get("tm:ui:scale")); return [100, 125, 150, 200].includes(n) ? n : 100; },
  set scale(v: number) { set("tm:ui:scale", String(v)); },
  get mode(): PlanMode { const v = get("tm:ui:mode"); return v === "minimum_week" || v === "pause" ? v : "normal"; },
  set mode(v: PlanMode) { set("tm:ui:mode", v); },
  /** Horizon screen template. Unknown or missing value falls back to "stack" (the original view). */
  get horizonView(): HorizonView { const v = get("tm:ui:horizonView"); return v === "compact" ? "compact" : "stack"; },
  set horizonView(v: HorizonView) { set("tm:ui:horizonView", v === "compact" ? "compact" : "stack"); },
  /** Stage-name template (O6). Unknown or missing value falls back to "default" (the Spec journey). Names only; codes and passes never change. */
  get stageTemplate(): TemplateId { const v = get("tm:ui:stageTemplate"); return isTemplateId(v) ? v : "default"; },
  set stageTemplate(v: TemplateId) { set("tm:ui:stageTemplate", isTemplateId(v) ? v : "default"); },
  /** Lock-screen "show details" per category (O8). Per-device only; missing or broken value = everything hidden. */
  get notifyShow(): NotifyPrefs { try { return parseNotifyPrefs(JSON.parse(get("tm:ui:notifyShow") ?? "null")); } catch { return {}; } },
  set notifyShow(v: NotifyPrefs) { set("tm:ui:notifyShow", JSON.stringify(parseNotifyPrefs(v))); },
  /** Prayer-time place (M13). Per device, never sent anywhere. Demo and real keep separate places (D-B), so a demo place never shows in real mode. Missing or broken value = Dhaka. */
  get prayerCoords(): Coords { try { const v = JSON.parse(get(this.dataMode === "real" ? "tm:ui:prayerCoords:real" : "tm:ui:prayerCoords") ?? "null"); return validCoords(v) ? { lat: v.lat, lon: v.lon } : { ...DHAKA_COORDS }; } catch { return { ...DHAKA_COORDS }; } },
  set prayerCoords(v: Coords) { set(this.dataMode === "real" ? "tm:ui:prayerCoords:real" : "tm:ui:prayerCoords", JSON.stringify(validCoords(v) ? { lat: v.lat, lon: v.lon } : DHAKA_COORDS)); },
  /** Forgets the real prayer place (back to Dhaka). Used by "Delete all real data". The demo place is untouched. */
  clearRealPrayerPlace(): void { try { localStorage.removeItem("tm:ui:prayerCoords:real"); } catch { /* storage unavailable */ } },
  /** Prayer-time method, Asr rule and minute offsets (M13). A calculation setting, not personal data. Missing or broken = Karachi, standard Asr, no offsets. */
  get prayerSettings(): PrayerSettings { try { return parsePrayerSettings(JSON.parse(get("tm:ui:prayerSettings") ?? "null")); } catch { return parsePrayerSettings(null); } },
  set prayerSettings(v: PrayerSettings) { set("tm:ui:prayerSettings", JSON.stringify(parsePrayerSettings(v))); },
  /** Automatic prayer-time update (owner request 3 Nov 2026). OFF until the user ticks; Withdraw turns it off. Holds the city and country that are sent. */
  get prayerSync(): SyncSettings { try { return parseSyncSettings(JSON.parse(get("tm:ui:prayerSync") ?? "null")); } catch { return parseSyncSettings(null); } },
  set prayerSync(v: SyncSettings) { set("tm:ui:prayerSync", JSON.stringify(parseSyncSettings(v))); },
  /** Pre-prayer and azan alerts (M13). Both off by default. */
  get prayerAlerts(): AlertPrefs { try { return parseAlertPrefs(JSON.parse(get("tm:ui:prayerAlerts") ?? "null")); } catch { return { ...DEFAULT_ALERT_PREFS }; } },
  set prayerAlerts(v: AlertPrefs) { set("tm:ui:prayerAlerts", JSON.stringify(parseAlertPrefs(v))); },
  /** Alert slots already delivered for one Dhaka date, so each alert fires once. */
  get prayerFired(): { date: string; ids: string[] } { try { const v = JSON.parse(get("tm:ui:prayerFired") ?? "null") as { date?: unknown; ids?: unknown }; return typeof v?.date === "string" && Array.isArray(v.ids) ? { date: v.date, ids: v.ids.filter((x): x is string => typeof x === "string") } : { date: "", ids: [] }; } catch { return { date: "", ids: [] }; } },
  set prayerFired(v: { date: string; ids: string[] }) { set("tm:ui:prayerFired", JSON.stringify(v)); },
  /** Automation rule switches (M19). Per device. A missing rule uses its default: calm rules on, the rest off. */
  get ruleSwitches(): RuleSwitches { try { return parseRuleSwitches(JSON.parse(get("tm:ui:rules") ?? "null")); } catch { return {}; } },
  set ruleSwitches(v: RuleSwitches) { set("tm:ui:rules", JSON.stringify(parseRuleSwitches(v))); },
  /** Data mode (owner rule 25 Oct 2026). null = first run, the choice screen has not been answered yet. */
  get dataModeChoice(): DataMode | null { const v = get("tm:ui:dataMode"); return isDataMode(v) ? v : null; },
  set dataModeChoice(v: DataMode | null) { set("tm:ui:dataMode", v ?? ""); },
  /** The mode screens and calculations use. Before the first choice it is demo, which is empty until used. */
  get dataMode(): DataMode { return this.dataModeChoice ?? "demo"; },
  set dataMode(v: DataMode) { set("tm:ui:dataMode", isDataMode(v) ? v : "demo"); },
  /** First-run onboarding (audit M1). "" = not offered (older devices), pending, done or skipped. */
  get onboard(): OnboardState { return parseOnboard(get("tm:ui:onboard")); },
  set onboard(v: OnboardState) { set("tm:ui:onboard", parseOnboard(v)); },
  /** Local-only start / first-step times of the onboarding. Never sent anywhere, never shown as a grade. */
  get onboardTimes(): OnboardTimes { try { return parseTimes(JSON.parse(get("tm:ui:onboardT") ?? "null")); } catch { return {}; } },
  set onboardTimes(v: OnboardTimes) { set("tm:ui:onboardT", JSON.stringify(parseTimes(v))); },
  /** Separate days the app was opened in demo mode (YYYY-MM-DD). */
  get demoDays(): string[] { try { const v = JSON.parse(get("tm:ui:demoDays") ?? "[]"); return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []; } catch { return []; } },
  set demoDays(v: string[]) { set("tm:ui:demoDays", JSON.stringify(v)); },
  /** Day (YYYY-MM-DD) the user last said "not now" to deleting demo data. */
  get demoAskedOn(): string { return get("tm:ui:demoAskedOn") ?? ""; },
  set demoAskedOn(v: string) { set("tm:ui:demoAskedOn", v); },
  /** Last focus block that ended (M19). Per device, never sent. Missing or broken = none. */
  get lastFocusEnd(): FocusEnd | null { try { const v = JSON.parse(get("tm:ui:focusEnd") ?? "null") as Partial<FocusEnd> | null; return v && typeof v.at === "number" && typeof v.minutes === "number" && v.minutes > 0 ? { at: v.at, minutes: v.minutes } : null; } catch { return null; } },
  set lastFocusEnd(v: FocusEnd | null) { set("tm:ui:focusEnd", JSON.stringify(v)); },
  /** When the last rest ended (M19). Per device. Missing or broken = none. */
  get lastRestAt(): number | null { const n = Number(get("tm:ui:restAt")); return get("tm:ui:restAt") && Number.isFinite(n) ? n : null; },
  set lastRestAt(v: number | null) { set("tm:ui:restAt", v === null ? "" : String(v)); },
};

export function applyPrefs() {
  const r = document.documentElement;
  r.lang = prefs.lang === "en" ? "en" : "bn"; r.dir = LOCALES[prefs.lang].dir; // mix is Bangla-script, so html lang is bn
  r.dataset.theme = prefs.theme;
  applyDesign(prefs.design, r);
  r.style.fontSize = `${prefs.scale}%`;
  if (prefs.reduceMotion === "always") r.dataset.motion = "reduce"; else delete r.dataset.motion;
  document.title = prefs.lang === "en" ? "Trillionaire Me" : "ট্রিলিয়নেয়ার মি";
}

/** Per-device memory of the last overall percent (per mode namespace and weighting), to explain a fall in plain words. */
export function readProgressMemory(key: string): ProgressMemory | null {
  try { const o = JSON.parse(get(`tm:ui:overallMem:${key}`) ?? "null"); const ok = (x: unknown) => x === null || (typeof x === "number" && Number.isFinite(x)); return o && ok(o.last) && ok(o.from) ? { last: o.last, from: o.from } : null; } catch { return null; }
}
export function writeProgressMemory(key: string, m: ProgressMemory): void { set(`tm:ui:overallMem:${key}`, JSON.stringify(m)); }

/** One-time repair per device: own options and saved search results written to the demo bucket while in real mode move to real (src/core/savedLists.ts). The flag is set either way, so later demo-mode lists are never moved. Returns records moved. */
export function repairListNamespaces(): number {
  if (get("tm:ui:listsNs") === "v1") return 0;
  let n = 0;
  try { if (prefs.dataMode === "real" && readConsent(legacy)) n = moveListsToReal(store.demo, store.real); } catch { return 0; /* try again next start */ }
  set("tm:ui:listsNs", "v1"); return n;
}

import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from "../i18n/registry";
import { LocalKV, MemoryKV, REAL_DATA_ENABLED, Store } from "../core/store";
import { readConsent } from "../core/consent";
import { isTemplateId, type TemplateId } from "../core/stageTemplates";
import { MirrorKV, hydrate, mirrorToRepo } from "../core/persist";
import { DexieRepo } from "../adapters/dexie";
import { parseNotifyPrefs, type NotifyPrefs } from "../core/notify";
import { DHAKA_COORDS, validCoords, type Coords } from "../core/prayer";
import { DEFAULT_ALERT_PREFS, parseAlertPrefs, type AlertPrefs } from "../core/prayerAlerts";
import { parseRuleSwitches, type FocusEnd, type RuleSwitches } from "../core/rules";

const legacy = new LocalKV();
const mem = new MemoryKV();
// Consent lives in the per-device store (localStorage). Real writes to IndexedDB need the same gate as memory.
const repo = typeof indexedDB !== "undefined" ? new DexieRepo("tm-db", () => REAL_DATA_ENABLED && readConsent(legacy)) : null;
// With IndexedDB: memory is mirrored to it. Without (private mode/old browser): fall back to the old localStorage store.
const kv = repo ? new MirrorKV(mem, mirrorToRepo(repo)) : legacy;
export const store = new Store(kv, { consentKv: legacy });
/** Per-device consent record (src/core/consent.ts). Same place as the other small per-device settings. */
export const consentKv = legacy;
/** Call once before the first render. */
export async function initStorage(): Promise<void> { if (repo) { try { await hydrate(mem, repo, legacy); } catch { /* start empty rather than crash */ } } }

const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

export type PlanMode = "normal" | "minimum_week" | "pause";
export type HorizonView = "stack" | "compact";
export const prefs = {
  /** Unknown, missing or blocked storage falls back to the default (Bangla). */
  get lang(): Locale { const v = get("tm:ui:lang"); return isLocale(v) ? v : DEFAULT_LOCALE; },
  set lang(v: Locale) { set("tm:ui:lang", v); },
  get theme(): "auto" | "light" | "dark" { const v = get("tm:ui:theme"); return v === "light" || v === "dark" ? v : "auto"; },
  set theme(v: "auto" | "light" | "dark") { set("tm:ui:theme", v); },
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
  /** Prayer-time place (M13). Per device, never sent anywhere. Missing or broken value = Dhaka. */
  get prayerCoords(): Coords { try { const v = JSON.parse(get("tm:ui:prayerCoords") ?? "null"); return validCoords(v) ? { lat: v.lat, lon: v.lon } : { ...DHAKA_COORDS }; } catch { return { ...DHAKA_COORDS }; } },
  set prayerCoords(v: Coords) { set("tm:ui:prayerCoords", JSON.stringify(validCoords(v) ? { lat: v.lat, lon: v.lon } : DHAKA_COORDS)); },
  /** Pre-prayer and azan alerts (M13). Both off by default. */
  get prayerAlerts(): AlertPrefs { try { return parseAlertPrefs(JSON.parse(get("tm:ui:prayerAlerts") ?? "null")); } catch { return { ...DEFAULT_ALERT_PREFS }; } },
  set prayerAlerts(v: AlertPrefs) { set("tm:ui:prayerAlerts", JSON.stringify(parseAlertPrefs(v))); },
  /** Alert slots already delivered for one Dhaka date, so each alert fires once. */
  get prayerFired(): { date: string; ids: string[] } { try { const v = JSON.parse(get("tm:ui:prayerFired") ?? "null") as { date?: unknown; ids?: unknown }; return typeof v?.date === "string" && Array.isArray(v.ids) ? { date: v.date, ids: v.ids.filter((x): x is string => typeof x === "string") } : { date: "", ids: [] }; } catch { return { date: "", ids: [] }; } },
  set prayerFired(v: { date: string; ids: string[] }) { set("tm:ui:prayerFired", JSON.stringify(v)); },
  /** Automation rule switches (M19). Per device. A missing rule uses its default: calm rules on, the rest off. */
  get ruleSwitches(): RuleSwitches { try { return parseRuleSwitches(JSON.parse(get("tm:ui:rules") ?? "null")); } catch { return {}; } },
  set ruleSwitches(v: RuleSwitches) { set("tm:ui:rules", JSON.stringify(parseRuleSwitches(v))); },
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
  r.style.fontSize = `${prefs.scale}%`;
  document.title = prefs.lang === "en" ? "Trillionaire Me" : "ট্রিলিয়নেয়ার মি";
}

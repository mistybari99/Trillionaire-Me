import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from "../i18n/registry";
import { LocalKV, MemoryKV, Store } from "../core/store";
import { isTemplateId, type TemplateId } from "../core/stageTemplates";
import { MirrorKV, hydrate, mirrorToRepo } from "../core/persist";
import { DexieRepo } from "../adapters/dexie";

const legacy = new LocalKV();
const mem = new MemoryKV();
const repo = typeof indexedDB !== "undefined" ? new DexieRepo() : null;
// With IndexedDB: memory is mirrored to it. Without (private mode/old browser): fall back to the old localStorage store.
const kv = repo ? new MirrorKV(mem, mirrorToRepo(repo)) : legacy;
export const store = new Store(kv);
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
};

export function applyPrefs() {
  const r = document.documentElement;
  r.lang = prefs.lang === "en" ? "en" : "bn"; r.dir = LOCALES[prefs.lang].dir; // mix is Bangla-script, so html lang is bn
  r.dataset.theme = prefs.theme;
  r.style.fontSize = `${prefs.scale}%`;
  document.title = prefs.lang === "en" ? "Trillionaire Me" : "ট্রিলিয়নেয়ার মি";
}

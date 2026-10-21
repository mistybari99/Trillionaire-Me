import { DEFAULT_LOCALE, LOCALES, type Locale } from "../i18n/registry";
import { LocalKV, Store } from "../core/store";

const kv = new LocalKV();
export const store = new Store(kv);

const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

export const prefs = {
  get lang(): Locale { const v = get("tm:ui:lang"); return v && v in LOCALES ? (v as Locale) : DEFAULT_LOCALE; },
  set lang(v: Locale) { set("tm:ui:lang", v); },
  get theme(): "auto" | "light" | "dark" { const v = get("tm:ui:theme"); return v === "light" || v === "dark" ? v : "auto"; },
  set theme(v: "auto" | "light" | "dark") { set("tm:ui:theme", v); },
  get scale(): number { const n = Number(get("tm:ui:scale")); return [100, 125, 150, 200].includes(n) ? n : 100; },
  set scale(v: number) { set("tm:ui:scale", String(v)); },
};

export function applyPrefs() {
  const r = document.documentElement;
  r.lang = prefs.lang; r.dir = LOCALES[prefs.lang].dir;
  r.dataset.theme = prefs.theme;
  r.style.fontSize = `${prefs.scale}%`;
  document.title = prefs.lang === "bn" ? "ট্রিলিয়নেয়ার মি" : "Trillionaire Me";
}

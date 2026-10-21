// Single locale registry (i18n skill §1). Everything else derives from this.
export type Locale = "bn" | "en";
export interface LocaleInfo { code: Locale; endonym: string; dir: "ltr" | "rtl"; scripts: RegExp; fallback: Locale[]; }
export const LOCALES: Record<Locale, LocaleInfo> = {
  bn: { code: "bn", endonym: "বাংলা", dir: "ltr", scripts: /[ঀ-৿]/, fallback: ["en"] },
  en: { code: "en", endonym: "English", dir: "ltr", scripts: /[A-Za-z]/, fallback: [] },
};
export const DEFAULT_LOCALE: Locale = "bn";
export type Bi = { bn: string; en: string };

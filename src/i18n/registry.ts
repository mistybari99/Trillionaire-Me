// Single locale registry (i18n skill §1). Everything else derives from this.
// "mix" = Bangla sentences with common English words kept (see packs.ts). It is a UI mode, not a separate language.
export type Locale = "bn" | "en" | "mix";
export interface LocaleInfo { code: Locale; endonym: string; dir: "ltr" | "rtl"; scripts: RegExp; fallback: Locale[]; }
export const LOCALES: Record<Locale, LocaleInfo> = {
  bn: { code: "bn", endonym: "বাংলা", dir: "ltr", scripts: /[ঀ-৿]/, fallback: ["en"] },
  en: { code: "en", endonym: "English", dir: "ltr", scripts: /[A-Za-z]/, fallback: [] },
  mix: { code: "mix", endonym: "Mix", dir: "ltr", scripts: /[ঀ-৿]/, fallback: ["en"] },
};
/** Order shown in the language switch on More. */
export const LOCALE_ORDER: readonly Locale[] = ["en", "bn", "mix"];
export const DEFAULT_LOCALE: Locale = "bn";
export const isLocale = (v: unknown): v is Locale => v === "bn" || v === "en" || v === "mix";
/** Intl formatting: English uses Latin digits; Bangla and Mix use Bangla digits. */
export const intlLocale = (l: Locale): string => (l === "en" ? "en-US" : "bn-BD");
export type Bi = { bn: string; en: string };

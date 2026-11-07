// One lookup, one fallback policy (i18n skill §2): strict in dev/test, falls back along the chain in production and reports.
import { LOCALES, type Bi, type Locale } from "./registry";
import { PACKS, type Key } from "./packs";
import { latinDigits } from "./digits";

export const missingReport: string[] = [];
let strict = typeof import.meta !== "undefined" && !!import.meta.env && import.meta.env.MODE !== "production";
export const setStrict = (v: boolean) => { strict = v; };

export function t(key: Key, locale: Locale, args: Record<string, string | number> = {}): string {
  const chain: Locale[] = [locale, ...LOCALES[locale].fallback];
  for (const l of chain) {
    const s = (PACKS[l] as Record<string, string | undefined>)[key];
    if (s !== undefined && s !== "") return latinDigits(s.replace(/\{(\w+)\}/g, (_, k: string) => String(args[k] ?? `{${k}}`)));
    missingReport.push(`${l}:${key}`);
  }
  if (strict) throw new Error(`missing i18n key ${key}`);
  return latinDigits(PACKS.en[key as Key] ?? "");
}

/** Bilingual data text (catalog, demo seed): both languages are required by the type. */
export const tb = (b: Bi, locale: Locale): string => latinDigits(locale === "en" ? b.en : b.bn);

/** Numbers always use Latin digits; the locale only matters for words (dates), not digits. */
export const fmtNumber = (n: number, _locale: Locale): string => new Intl.NumberFormat("en-US").format(n);

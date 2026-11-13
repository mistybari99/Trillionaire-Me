// Hijri date and Ramadan view (M13). Worked out on the phone from the built-in Umm al-Qura calendar of the browser (Intl), nothing is typed,
// nothing is fetched. It is a CALCULATED calendar: the moon sighting announced in Bangladesh can differ by a day or two, so every use says
// "calculated" and refers to the official announcement. If the browser has no such calendar the answer is Unknown (null), never a guess.
import type { CalDate } from "./prayer";

export interface HijriDate { y: number; m: number; d: number }
export const HIJRI_MONTHS_EN = ["Muharram", "Safar", "Rabi al-Awwal", "Rabi al-Thani", "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Shaban", "Ramadan", "Shawwal", "Dhul Qadah", "Dhul Hijjah"] as const;
export const HIJRI_MONTHS_BN = ["মুহাররম", "সফর", "রবিউল আউয়াল", "রবিউস সানি", "জমাদিউল আউয়াল", "জমাদিউস সানি", "রজব", "শাবান", "রমজান", "শাওয়াল", "জিলকদ", "জিলহজ"] as const;
export const RAMADAN = 9;

let fmt: Intl.DateTimeFormat | null | undefined;
function formatter(): Intl.DateTimeFormat | null {
  if (fmt !== undefined) return fmt;
  try {
    const f = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { timeZone: "Asia/Dhaka", year: "numeric", month: "numeric", day: "numeric" });
    fmt = f.resolvedOptions().calendar === "islamic-umalqura" ? f : null;
  } catch { fmt = null; }
  return fmt;
}

/** Hijri date for a Dhaka calendar date, or null when the browser cannot work it out. */
export function hijriOf(c: CalDate): HijriDate | null {
  const f = formatter(); if (!f) return null;
  try {
    const parts = f.formatToParts(new Date(Date.UTC(c.y, c.m - 1, c.d, 6, 0, 0))); // noon in Dhaka, far from midnight
    const n = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const y = n("year"), m = n("month"), d = n("day");
    return Number.isInteger(y) && m >= 1 && m <= 12 && d >= 1 && d <= 30 ? { y, m, d } : null;
  } catch { return null; }
}

const addDays = (c: CalDate, n: number): CalDate => { const d = new Date(Date.UTC(c.y, c.m - 1, c.d + n)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }; };
export const isoOfDate = (c: CalDate): string => `${c.y}-${String(c.m).padStart(2, "0")}-${String(c.d).padStart(2, "0")}`;

export type RamadanView =
  | { state: "unknown" }
  | { state: "during"; day: number; endsInDays: number | null; hijri: HijriDate }
  | { state: "upcoming"; inDays: number; startsAround: string; hijri: HijriDate };

/** In Ramadan: which day. Otherwise: about how many days until the first day, found by walking forward day by day (no stored table, nothing invented). */
export function ramadanView(today: CalDate): RamadanView {
  const h = hijriOf(today); if (!h) return { state: "unknown" };
  if (h.m === RAMADAN) {
    let end: number | null = null;
    for (let i = 1; i <= 31; i++) { const x = hijriOf(addDays(today, i)); if (!x) break; if (x.m !== RAMADAN) { end = i; break; } }
    return { state: "during", day: h.d, endsInDays: end, hijri: h };
  }
  for (let i = 1; i <= 400; i++) {
    const x = hijriOf(addDays(today, i)); if (!x) return { state: "unknown" };
    if (x.m === RAMADAN && x.d === 1) return { state: "upcoming", inDays: i, startsAround: isoOfDate(addDays(today, i)), hijri: h };
  }
  return { state: "unknown" };
}

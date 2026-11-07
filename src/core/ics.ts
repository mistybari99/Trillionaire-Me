// Phone calendar file (.ics, RFC 5545) for reminders. Pure text; no network, no clock of its own (`nowMs` is passed in).
// This is the one reliable way to get a sound with the app closed: the phone's own calendar rings it.
// Privacy: worship, health, financial and third-party items are titled "Reminder" with no description unless the person ticked
// "include details" for that category (the same ticks as the lock screen). A copy is one-time; later edits do not change the calendar.
import { isSensitiveCategory, type NotifyPrefs } from "./notify";
import type { Locale } from "../i18n/registry";
import { dhakaNow } from "./prayer";
import type { Slot } from "./reminders";

export interface IcsOptions {
  /** per-category "include details" ticks; missing = neutral title */
  details: NotifyPrefs;
  nowMs: number;
  lang: Locale;
  /** demo data: every title starts with DEMO so it can never be mistaken for a real reminder */
  demo: boolean;
  /** minutes the calendar event lasts (default 15) */
  minutes?: number;
}

const CRLF = "\r\n";
export const ICS_PRODID = "-//Trillionaire Me//Reminders//EN";

/** TEXT escaping: backslash, semicolon, comma, newline. */
export const icsEscape = (s: string): string => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n");

/** Folds one line at 75 octets (UTF-8), never inside a character. Continuation lines start with one space. */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = []; let cur = "", used = 0, limit = 75;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (used + n > limit) { out.push(cur); cur = " "; used = 1; limit = 75; }
    cur += ch; used += n;
  }
  out.push(cur);
  return out.join(CRLF);
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");
const stamp = (ms: number): string => { const d = new Date(ms); return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`; };
const local = (ms: number): string => { const n = dhakaNow(ms); return `${n.date.y}${pad(n.date.m)}${pad(n.date.d)}T${pad(Math.floor(n.minute / 60))}${pad(n.minute % 60)}00`; };

const NEUTRAL = { en: "Reminder", bn: "রিমাইন্ডার" };
const FROM_APP = { en: "Added from Trillionaire Me. This is a one-time copy; later changes in the app do not update it.", bn: "Trillionaire Me থেকে যোগ করা। এটি একবারের কপি; অ্যাপে পরে বদলালে এটি বদলাবে না।" };
const pick = (b: { en: string; bn: string }, lang: Locale) => (lang === "en" ? b.en : b.bn);

/** True when this item's title may appear in the calendar file. */
export const showsDetails = (privacy: Slot["privacy"], details: NotifyPrefs): boolean => !isSensitiveCategory(privacy) || details[privacy] === true;

/** Title of one calendar event. Neutral items are exactly "Reminder" / "রিমাইন্ডার"; detailed ones carry the date so a stale copy is obvious. */
export function eventTitle(s: Slot, o: Pick<IcsOptions, "details" | "lang" | "demo">): string {
  const base = showsDetails(s.privacy, o.details) ? `${s.title} · ${s.date}` : pick(NEUTRAL, o.lang);
  return o.demo ? `DEMO ${base}` : base;
}

/** The whole .ics text for the given slots (already filtered and placed by the caller). Empty list still gives a valid, empty calendar. */
export function toIcs(slots: readonly Slot[], o: IcsOptions): string {
  const mins = o.minutes ?? 15;
  const lines: string[] = [
    "BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:${ICS_PRODID}`, "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE", "TZID:Asia/Dhaka", "BEGIN:STANDARD", "DTSTART:19700101T000000", "TZOFFSETFROM:+0600", "TZOFFSETTO:+0600", "TZNAME:+06", "END:STANDARD", "END:VTIMEZONE",
  ];
  for (const s of slots) {
    const detailed = showsDetails(s.privacy, o.details);
    const title = icsEscape(eventTitle(s, o));
    lines.push(
      "BEGIN:VEVENT", `UID:${`${s.reminderId}:${s.date}${s.snooze ? "~z" : ""}`.replace(/[^A-Za-z0-9:~._-]/g, "_")}@trillionaire-me`, `DTSTAMP:${stamp(o.nowMs)}`,
      `DTSTART;TZID=Asia/Dhaka:${local(s.when)}`, `DTEND;TZID=Asia/Dhaka:${local(s.when + mins * 60_000)}`, `SUMMARY:${title}`,
      ...(detailed ? [`DESCRIPTION:${icsEscape(pick(FROM_APP, o.lang))}`] : []),
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${title}`, "TRIGGER:PT0S", "END:VALARM", "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join(CRLF) + CRLF;
}

/** File name for the download. */
export const icsFileName = (kind: "one" | "month", date: string): string => `reminders-${kind === "one" ? "one" : "next-30-days"}-${date}.ics`;

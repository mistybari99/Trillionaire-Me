import { describe, expect, it } from "vitest";
import { foldLine, icsEscape, toIcs, eventTitle, icsFileName } from "../src/core/ics";
import { dhakaMs, type Slot } from "../src/core/reminders";

const slot = (o: Partial<Slot> = {}): Slot => ({ id: "r1:2026-11-06", reminderId: "r1", target: "task", targetId: "t", title: "Call the bank", privacy: "personal", when: dhakaMs("2026-11-06", 570), date: "2026-11-06", minute: 570, snooze: false, ...o });
const NOW = Date.UTC(2026, 10, 3, 4, 5, 6);
const base = { details: {}, nowMs: NOW, lang: "en" as const, demo: false };
const unfold = (t: string) => t.replace(/\r\n /g, "");

describe("toIcs", () => {
  it("is a valid calendar: VCALENDAR, VTIMEZONE, VEVENT with one VALARM at the event time, CRLF line ends", () => {
    const t = toIcs([slot()], base);
    expect(t.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true); expect(t.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(t).toContain("VERSION:2.0"); expect(t).toContain("PRODID:"); expect(t).toContain("TZID:Asia/Dhaka");
    expect((t.match(/BEGIN:VEVENT/g) ?? []).length).toBe(1); expect((t.match(/BEGIN:VALARM/g) ?? []).length).toBe(1); expect(t).toContain("TRIGGER:PT0S"); expect(t).toContain("ACTION:DISPLAY");
    expect(t.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/); expect(/(?<!\r)\n/.test(t)).toBe(false);
    expect(t).toContain("DTSTART;TZID=Asia/Dhaka:20261106T093000"); expect(t).toContain("DTEND;TZID=Asia/Dhaka:20261106T094500"); expect(t).toContain("DTSTAMP:20261103T040506Z");
  });
  it("an empty list is still a valid empty calendar", () => {
    const t = toIcs([], base); expect(t).not.toContain("VEVENT"); expect(t).toContain("END:VCALENDAR");
  });
  it("uid is stable for the same reminder and date, and differs per date", () => {
    const a = toIcs([slot()], base), b = toIcs([slot()], { ...base, nowMs: NOW + 99999 });
    expect(a.match(/UID:.*/)![0]).toBe(b.match(/UID:.*/)![0]);
    expect(toIcs([slot({ id: "r1:2026-11-07" })], base).match(/UID:.*/)![0]).not.toBe(a.match(/UID:.*/)![0]);
    expect(a).toContain("UID:r1:2026-11-06@trillionaire-me");
  });
  it("escapes commas, semicolons, backslashes and newlines in titles", () => {
    expect(icsEscape("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
    expect(unfold(toIcs([slot({ title: "Pay rent, bills; now\nplease" })], base))).toContain("SUMMARY:Pay rent" + String.fromCharCode(92) + ", bills" + String.fromCharCode(92) + "; now" + String.fromCharCode(92) + "nplease · 2026-11-06");
  });
  it("folds long lines at 75 octets with a leading space and never splits a Bangla character", () => {
    const bn = "বাংলা".repeat(30);
    const t = toIcs([slot({ title: bn })], base);
    for (const line of t.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(unfold(t)).toContain(`SUMMARY:${bn} · 2026-11-06`);
    expect(t).not.toContain("�");
    expect(foldLine("x".repeat(200)).split("\r\n").every((l, i) => (i === 0 || l.startsWith(" ")) && l.length <= 75)).toBe(true);
    expect(foldLine("short")).toBe("short");
  });
  it("Bangla text is UTF-8 and survives the round trip", () => {
    const t = toIcs([slot({ title: "ব্যাংকে ফোন" })], base);
    expect(unfold(t)).toContain("SUMMARY:ব্যাংকে ফোন · 2026-11-06");
  });
});

describe("neutral titles", () => {
  it("worship, health, financial and third-party events are exactly Reminder with no description, even in Bangla", () => {
    for (const p of ["worship", "health", "financial", "third_party"] as const) {
      const t = toIcs([slot({ privacy: p, title: "Pay Rahim 5000" })], base);
      expect(t).toContain("SUMMARY:Reminder\r\n"); expect(t).not.toContain("Rahim"); expect(t).not.toContain("5000");
      expect(t.split("BEGIN:VEVENT")[1]!.split("BEGIN:VALARM")[0]).not.toContain("DESCRIPTION");
      const bn = toIcs([slot({ privacy: p, title: "Pay Rahim 5000" })], { ...base, lang: "bn" }); expect(unfold(bn)).toContain("SUMMARY:রিমাইন্ডার\r\n");
    }
  });
  it("a tick unlocks only its own category", () => {
    const fin = slot({ privacy: "financial", title: "Rent" });
    expect(unfold(toIcs([fin], { ...base, details: { financial: true } }))).toContain("SUMMARY:Rent · 2026-11-06");
    expect(toIcs([fin], { ...base, details: { health: true } })).toContain("SUMMARY:Reminder\r\n");
    expect(unfold(toIcs([fin], { ...base, details: { financial: true } }))).toContain("one-time copy");
  });
  it("a personal item shows its title by default and carries the date so a stale copy is obvious", () => {
    expect(eventTitle(slot(), base)).toBe("Call the bank · 2026-11-06");
  });
  it("demo data is marked DEMO in every title, neutral or not", () => {
    expect(toIcs([slot()], { ...base, demo: true })).toContain("SUMMARY:DEMO Call the bank");
    expect(toIcs([slot({ privacy: "health" })], { ...base, demo: true })).toContain("SUMMARY:DEMO Reminder\r\n");
  });
  it("file name carries the date", () => { expect(icsFileName("month", "2026-11-03")).toBe("reminders-next-30-days-2026-11-03.ics"); });
});

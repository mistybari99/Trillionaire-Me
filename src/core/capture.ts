// Quick capture (no AI): the user writes naturally; rules pull out amounts, percents, durations, dates and decisions.
// Nothing is saved until the user confirms each item. Reads Bangla and English digits and words.
export type Kind = "amount" | "percent" | "duration" | "date" | "decision";
export interface Candidate { id: string; kind: Kind; raw: string; number?: number; unit?: string; text?: string; date?: string; confidence: "high" | "low" }

const bnDigits = (s: string) => s.replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6));
const MAG: Record<string, number> = { "হাজার": 1e3, k: 1e3, "লাখ": 1e5, "লক্ষ": 1e5, lakh: 1e5, lac: 1e5, "কোটি": 1e7, crore: 1e7 };
const toNum = (s: string) => Number(s.replace(/,/g, ""));
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); return x; };

const WEEKDAYS: [RegExp, number][] = [[/রবিবার|sunday/i, 0], [/সোমবার|monday/i, 1], [/মঙ্গলবার|tuesday/i, 2], [/বুধবার|wednesday/i, 3], [/বৃহস্পতিবার|thursday/i, 4], [/শুক্রবার|friday/i, 5], [/শনিবার|saturday/i, 6]];
const DECISION = /(ঠিক করলাম|সিদ্ধান্ত|করব|করবো|নেব|নিব|নিলাম|বাদ দিলাম|বাদ দেব|কিনব|কিনবো|শুরু করব|বন্ধ করব|\bdecided\b|\bi will\b|\bi'll\b|\bgoing to\b|\bwon't\b|\bwill not\b|\bplan to\b)/i;
const DUR_UNIT: Record<string, [string, number]> = { "মিনিট": ["minutes", 1], min: ["minutes", 1], mins: ["minutes", 1], minute: ["minutes", 1], minutes: ["minutes", 1], "ঘণ্টা": ["minutes", 60], "ঘন্টা": ["minutes", 60], hour: ["minutes", 60], hours: ["minutes", 60], hr: ["minutes", 60], hrs: ["minutes", 60], "দিন": ["days", 1], day: ["days", 1], days: ["days", 1], "সপ্তাহ": ["weeks", 1], week: ["weeks", 1], weeks: ["weeks", 1], "মাস": ["months", 1], month: ["months", 1], months: ["months", 1] };

export function extract(input: string, now = new Date()): Candidate[] {
  const text = bnDigits(input); const out: Candidate[] = []; let n = 0; const id = () => `c${++n}`;
  const taken: [number, number][] = []; const free = (a: number, b: number) => !taken.some(([x, y]) => a < y && x < b); const take = (a: number, b: number) => taken.push([a, b]);

  for (const m of text.matchAll(/(\d{4})-(\d{2})-(\d{2})/g)) { const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])); if (!Number.isNaN(d.getTime()) && d.getMonth() === Number(m[2]) - 1) { out.push({ id: id(), kind: "date", raw: m[0], date: iso(d), confidence: "high" }); take(m.index!, m.index! + m[0].length); } }
  for (const m of text.matchAll(/(\d+(?:\.\d+)?)\s*(%|শতাংশ|percent|পার্সেন্ট)/gi)) { out.push({ id: id(), kind: "percent", raw: m[0], number: toNum(m[1]!), confidence: "high" }); take(m.index!, m.index! + m[0].length); }
  for (const m of text.matchAll(/(\d+(?:\.\d+)?)\s*(মিনিট|minutes?|mins?|ঘণ্টা|ঘন্টা|hours?|hrs?|দিন|days?|সপ্তাহ|weeks?|মাস|months?)(?![a-z])/gi)) {
    if (!free(m.index!, m.index! + m[0].length)) continue; const u = DUR_UNIT[m[2]!.toLowerCase()]!; out.push({ id: id(), kind: "duration", raw: m[0], number: toNum(m[1]!) * u[1], unit: u[0], confidence: "high" }); take(m.index!, m.index! + m[0].length); }
  for (const m of text.matchAll(/(?:৳|bdt|tk\.?)?\s*(\d[\d,]*(?:\.\d+)?)\s*(হাজার|লাখ|লক্ষ|কোটি|k\b|lakh|lac|crore)?\s*(টাকা|taka|tk\b|bdt|৳)?/gi)) {
    const a = m.index!, b = a + m[0].length; if (!free(a, b)) continue;
    const cur = !!m[3] || /^(৳|bdt|tk)/i.test(m[0].trim()); const mag = m[2] ? MAG[m[2].toLowerCase()] : undefined;
    if (!cur && !mag) continue; // a bare number is not guessed to be money
    out.push({ id: id(), kind: "amount", raw: m[0].trim(), number: toNum(m[1]!) * (mag ?? 1), unit: "BDT", confidence: cur ? "high" : "low" }); take(a, b); }
  const lower = text.toLowerCase();
  const rel: [RegExp, number, "high" | "low"][] = [[/পরশু/, 2, "high"], [/\bday after tomorrow\b/, 2, "high"], [/\btomorrow\b/, 1, "high"], [/কাল/, 1, "low"], [/আজ|\btoday\b/, 0, "high"]];
  for (const [re, off, conf] of rel) { const m = lower.match(re); if (m && !out.some((c) => c.kind === "date" && c.raw === m[0])) out.push({ id: id(), kind: "date", raw: m[0], date: iso(addDays(now, off)), confidence: conf }); }
  for (const [re, wd] of WEEKDAYS) { const m = text.match(re); if (m) { let diff = (wd - now.getDay() + 7) % 7; if (diff === 0) diff = 7; out.push({ id: id(), kind: "date", raw: m[0], date: iso(addDays(now, diff)), confidence: "high" }); } }
  for (const s of text.split(/[।.!?\n]+/).map((x) => x.trim()).filter(Boolean)) if (DECISION.test(s)) out.push({ id: id(), kind: "decision", raw: s, text: s.slice(0, 140), confidence: "high" });
  return out;
}

/** Report totals use only items the user confirmed. */
export interface Item { kind: Kind; number?: number; unit?: string; text?: string; date?: string }
export function summarize(items: Item[]) {
  const sum = (k: Kind) => items.filter((i) => i.kind === k && typeof i.number === "number");
  return {
    decisions: items.filter((i) => i.kind === "decision").map((i) => i.text ?? ""),
    amountTotal: sum("amount").reduce((a, i) => a + i.number!, 0), amountCount: sum("amount").length,
    durationMinutes: sum("duration").filter((i) => i.unit === "minutes").reduce((a, i) => a + i.number!, 0),
    dates: items.filter((i) => i.kind === "date" && i.date).map((i) => i.date!).sort(),
  };
}

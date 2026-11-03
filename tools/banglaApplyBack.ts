// Apply-back for the Bangla review sheet (audit M8). The reviewer writes OK or a corrected Bangla line in the last column of a copy of
// docs/owner/BANGLA_REVIEW_SHEET.md. This module reads that copy, checks every change, and edits ONLY the Bangla block of src/i18n/packs.ts.
// It never touches English text, never marks TM-TST-161 as passed (a named person signs the sheet; that is a human step), and refuses unsafe lines.
// Pure functions: the command-line wrapper is tools/bangla_apply_back.mjs.

export interface SheetRow { n: number; key: string; english: string; bangla: string; answer: string }
export interface Change { key: string; from: string; to: string }
export interface Refusal { key: string; why: string }
export interface SheetReport { rows: number; ok: number; blank: number; changes: Change[]; refused: Refusal[]; signed: boolean; reviewer: string | null }

const splitRow = (line: string): string[] => {
  const cells: string[] = []; let cur = ""; let esc = false;
  for (const ch of line.slice(1)) {
    if (esc) { cur += ch === "|" ? "|" : "\\" + ch; esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === "|") { cells.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  return cells;
};
const unCell = (s: string): string => s.replace(/\s*<br>\s*/g, "\n").replace(/\\\\/g, "\\");

/** Table rows `| n | `key` | English | বাংলা | answer |`. Anything else is ignored. */
export function parseSheet(text: string): SheetRow[] {
  const out: SheetRow[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!/^\|\s*\d+\s*\|\s*`[^`]+`\s*\|/.test(line)) continue;
    const c = splitRow(line);
    if (c.length < 5) continue;
    out.push({ n: Number(c[0]), key: c[1]!.replace(/^`|`$/g, ""), english: unCell(c[2]!), bangla: unCell(c[3]!), answer: unCell(c.slice(4).join("|").trim()) });
  }
  return out;
}

const placeholders = (s: string): string => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
const BANGLA_DIGITS = /[০-৯]/;
const BANNED = /বিপদ|স্কোর|র‍্যাংক|র‍্যাঙ্ক|র্যাঙ্ক|স্ট্রিক|\bscore\b|\brank\b|\bstreak\b|leaderboard/i;

/** Why a corrected line cannot be used, or null when it is safe. */
export function refusalFor(key: string, english: string, to: string, known: ReadonlySet<string>): string | null {
  if (!known.has(key)) return "unknown key";
  if (!to.trim()) return "empty";
  if (!/[ঀ-৿]/.test(to)) return "no Bangla script";
  if (BANGLA_DIGITS.test(to)) return "Bangla digits (use 0-9)";
  if (BANNED.test(to)) return "score, rank or streak wording";
  if (placeholders(to) !== placeholders(english)) return "placeholders {..} differ from the English line";
  if (to.length > 600) return "too long";
  return null;
}

const isOk = (a: string) => /^(ok|ঠিক আছে|ঠিক|✓|✔)$/i.test(a.trim());

export function readSheet(text: string, known: ReadonlySet<string>): SheetReport {
  const rows = parseSheet(text); const changes: Change[] = []; const refused: Refusal[] = []; let ok = 0, blank = 0;
  for (const r of rows) {
    if (!r.answer.trim()) { blank++; continue; }
    if (isOk(r.answer)) { ok++; continue; }
    if (r.answer.trim() === r.bangla.trim()) { ok++; continue; }
    const why = refusalFor(r.key, r.english, r.answer, known);
    if (why) refused.push({ key: r.key, why }); else changes.push({ key: r.key, from: r.bangla, to: r.answer.trim() });
  }
  const sign = /Reviewer name:\s*([^\s_][^\n]*?)\s{2,}Date:\s*([^\s_]\S*)/.exec(text);
  return { rows: rows.length, ok, blank, changes, refused, signed: !!sign, reviewer: sign ? sign[1]!.trim() : null };
}

const BN_START = "const bn: Record<Key, string> = {";
/** Replaces the value of each key inside the Bangla block only. A key not found there, or found twice, is refused and nothing else changes. */
export function applyToSource(src: string, changes: readonly Change[]): { src: string; applied: string[]; refused: Refusal[] } {
  const start = src.indexOf(BN_START); if (start < 0) throw new Error("Bangla block not found");
  const end = src.indexOf("\n};", start); let block = src.slice(start, end); const applied: string[] = []; const refused: Refusal[] = [];
  for (const c of changes) {
    const re = new RegExp(`("${c.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}":\\s*)"((?:[^"\\\\]|\\\\.)*)"`, "g");
    const hits = [...block.matchAll(re)];
    if (hits.length !== 1) { refused.push({ key: c.key, why: hits.length ? "key appears more than once" : "key not found in the Bangla block" }); continue; }
    block = block.replace(re, (_m, pre: string) => `${pre}${JSON.stringify(c.to)}`); applied.push(c.key);
  }
  return { src: src.slice(0, start) + block + src.slice(end), applied, refused };
}

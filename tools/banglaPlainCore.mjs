// Shared by tools/bangla_plain_apply.mjs and tests/bangla_plain.test.ts: finds every editable Bangla string value, per file and key.
// Only string VALUES are touched (never code, ids, keys or the English side). Edits are made by position.
import { readFileSync, readdirSync } from "node:fs";
import { scanStrings } from "./banglaLex.mjs";

export const BN = /[ঀ-৿]/;
export const TS_FILES = [
  "src/i18n/packs.ts", "src/i18n/vault.ts", "src/catalog/fields.ts", "src/catalog/glossary.ts", "src/modules/capability.ts", "src/schema/entities.ts",
  "src/library/topics.ts", "src/library/paths.ts", "src/library/inspiration.ts", "src/library/halalFlags.ts", "src/ui/settingsRegistry.ts",
  "src/core/stageTemplates.ts", "src/core/stuck.ts", "src/core/rules.ts", "src/core/stages.ts", "src/core/notify.ts", "src/ui/prayerAlerts.ts", "src/demo/seed.ts",
  "src/i18n/q_b1.ts",
  "src/i18n/q_brand.ts",
  "src/i18n/q_head.ts",
];
export const JSON_FILES = [
  ...Array.from({ length: 9 }, (_, i) => `public/content/pack-00${i + 1}.json`),
  "src/library/systems/business-starter.json", "src/library/systems/habit-reset.json", "src/library/systems/job-search-week.json",
  "src/library/systems/morning-routine.json", "src/library/systems/study-block.json", "src/library/systems/weekly-money-check.json",
];
// Never edited: code that matches words the user types, the hadith pack (D-D), hijri month names, app language names.
export const DENY_FILES = ["src/core/capture.ts", "src/core/safety.ts", "src/core/typedConfirm.ts", "src/library/hadithPack.json", "src/core/hijri.ts", "src/i18n/registry.ts", "src/adapters/wikipedia.ts", "src/ui/state.ts"];

export const decode = (raw, quote) => raw.replace(/\\(["'`\\n])/g, (_m, c) => (c === "n" ? "\n" : c));
export const encode = (text, quote) => text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").split(quote).join("\\" + quote);

/** Bangla value segments of a TS file. For packs.ts only the `bn` object. */
export function tsSegments(file, src) {
  let lo = 0, hi = src.length;
  if (file === "src/i18n/packs.ts") { lo = src.indexOf("const bn: Record<Key, string> = {"); hi = src.indexOf("// Mix mode: Bangla sentences"); }
  const segs = [];
  for (const s of scanStrings(src)) {
    if (s.start < lo || s.end > hi) continue;
    const raw = src.slice(s.start, s.end);
    if (!BN.test(raw)) continue;
    // key = the string literal just before ':' (object property) when this value directly follows it
    const before = src.slice(Math.max(0, s.start - 160), s.start - 1);
    const m = /["']([\w.\-]+)["']\s*:\s*$/.exec(before) || /([A-Za-z_]\w*)\s*:\s*$/.exec(before);
    segs.push({ file, kind: "ts", start: s.start, end: s.end, quote: s.quote, raw, text: decode(raw, s.quote), key: m ? m[1] : null });
  }
  return segs;
}

/** Bangla values stored under a "bn" property in a JSON file (also inside arrays directly under "bn"). */
export function jsonSegments(file, src) {
  const segs = []; const stack = []; let i = 0; const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === "{") { stack.push({ obj: true, key: null, owner: null }); i++; continue; }
    if (c === "[") { const top = stack[stack.length - 1]; stack.push({ obj: false, key: null, owner: top ? top.key : null }); i++; continue; }
    if (c === "}" || c === "]") { stack.pop(); i++; continue; }
    if (c === '"') {
      let j = i + 1; while (j < n && src[j] !== '"') { if (src[j] === "\\") j++; j++; }
      const raw = src.slice(i + 1, j); let k = j + 1; while (/\s/.test(src[k] ?? "")) k++;
      const top = stack[stack.length - 1];
      if (src[k] === ":" && top && top.obj) { top.key = JSON.parse('"' + raw + '"'); i = k + 1; continue; }
      const eff = top ? (top.obj ? top.key : top.owner) : null;
      if (eff === "bn" && BN.test(raw)) segs.push({ file, kind: "json", start: i + 1, end: j, quote: '"', raw, text: JSON.parse('"' + raw + '"'), key: eff });
      i = j + 1; continue;
    }
    i++;
  }
  return segs;
}
export const jsonEncode = (text) => JSON.stringify(text).slice(1, -1);

export function loadAll(root = ".") {
  const out = [];
  for (const f of TS_FILES) out.push(...tsSegments(f, readFileSync(`${root}/${f}`, "utf8")));
  for (const f of JSON_FILES) out.push(...jsonSegments(f, readFileSync(`${root}/${f}`, "utf8")));
  return out;
}
export const hasPlaceholders = (s) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");

// ---------- rules engine (pure; used by the apply tool and by tests) ----------
const BNL = "\\u0980-\\u09FF";
export const YA = "\u09AF\u09BC"; // য় as the repo writes it (য + nukta)
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function pat(from, mode, notAfter, notBefore) {
  const f = esc(from); const na = notAfter ? `(?!${notAfter})` : ""; const nb = notBefore ? `(?<!${notBefore})` : "";
  if (mode === "latin") return new RegExp(`${nb}(?<![A-Za-z${BNL}])${f}(?![A-Za-z])${na}`, "gu");
  if (mode === "exact") return new RegExp(`${nb}(?<![${BNL}A-Za-z])${f}(?![${BNL}])${na}`, "gu");
  return new RegExp(`${nb}(?<![${BNL}A-Za-z])${f}${na}`, "gu");
}
/** One rule -> ordered list of {re,to}. endFix handles the Bangla suffix when the last letter kind changes (া -> consonant etc.). */
export function expandRule(rule) {
  const out = []; const add = (from, to, m) => out.push({ re: pat(from, m, rule.notAfter, rule.notBefore), to });
  const { from, to } = rule; const mode = rule.mode || "start";
  if (rule.endFix === "a>c") { add(from + "র", to + "ের", "exact"); add(from + YA, to + "ে", "exact"); add(from + "য়", to + "ে", "exact"); add(from + "তে", to + "ে", "exact"); }
  if (rule.endFix === "c>a") { add(from + "ের", to + "র", "exact"); add(from + "ে", to + YA, "exact"); }
  if (rule.endFix === "c>i") { add(from + "ের", to + "র", "exact"); add(from + "ে", to + "তে", "exact"); }
  add(from, to, mode);
  return out;
}
export const toLatinDigits = (s) => s.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));

export function isProtected(cfg, file, key, text) {
  if (cfg.files.includes(file)) return true;
  if (file === "src/i18n/packs.ts" && key && cfg.keys.some((k) => new RegExp(k).test(key))) return true;
  return new RegExp(cfg.contentRegex).test(text);
}

/** Apply the word rules of one group to a string. Returns { text, ids }. */
export function applyWordRules(text, rules, group, ctx) {
  const ids = []; let cur = text;
  for (const r of rules) {
    if (r.group !== group) continue;
    if (r.files && !r.files.includes(ctx.file)) continue;
    if (r.enMatch && !(ctx.en && new RegExp(r.enMatch, "i").test(ctx.en))) continue;
    if (r.keys && !(ctx.key && new RegExp(r.keys).test(ctx.key))) continue; // optional: only for these packs.ts keys (regex)
    if (r.lines && !(ctx.line && r.lines.includes(ctx.line))) continue; // optional: only on these source lines (strings without a key)
    if (r.notText && new RegExp(r.notText, "u").test(text)) continue; // optional: skip strings that match (for example the no-fatwa line)
    if (ctx.protected && !r.allowProtected && group !== "spelling") continue;
    const before = cur;
    if (r.type === "digits") { if (r.all || /[অ-হ]/.test(cur)) cur = toLatinDigits(cur); } // digit-only values stay (the screen converts them; the catalog check needs Bangla script)
    else for (const { re, to } of expandRule(r)) cur = cur.replace(re, to);
    if (cur !== before) ids.push(r.id);
  }
  return { text: cur, ids };
}

export const DEEN_WORDS = ["নামাজ", "রোজা", "যাকাত", "সদকা", "ফিতরা", "কুরবানি", "হজ", "উমরাহ", "হালাল", "সুদ", "রিবা", "আখিরাত", "ইবাদত", "দ্বীন", "আজান", "ওয়াক্ত", "ফজর", "যোহর", "আসর", "মাগরিব", "ইশা", "নিসাব", "ফতোয়া", "আলেম", "হাদিস", "কুরআন", "মসজিদ", "রমজান", "দান"];
export const UNKNOWN_WORDS = ["অজানা", "জানা নেই", "জানি না", "ফাঁকা", "শূন্য", "জানা যাবে না"];
export const PUNISH = /ব্যর্থ|দুর্বল|পিছিয়ে|র‍্যাংক|র‍্যাঙ্ক|স্কোর|স্ট্রিক|ঘাটতি/;
const count = (s, w) => s.split(w).length - 1;
/** Why a change is unsafe, or null. */
export function guardReason(oldText, newText, allow) {
  const L = /[অ-হ]/; if (L.test(oldText) && !L.test(newText)) return "no Bangla letters left";
  if (hasPlaceholders(oldText) !== hasPlaceholders(newText)) return "placeholders differ";
  if (count(oldText, "যাচাই হয়নি") !== count(newText, "যাচাই হয়নি")) return "'যাচাই হয়নি' count changed";
  const wcount = (s, w) => (s.match(new RegExp(`(?<![\\u0980-\\u09FF])${w}`, "gu")) ?? []).length;
  for (const w of DEEN_WORDS) if (wcount(oldText, w) !== wcount(newText, w)) return `Deen word '${w}' count changed`;
  const u = (s) => UNKNOWN_WORDS.reduce((n, w) => n + count(s, w), 0);
  if (allow !== "unknown" && u(oldText) > 0 && u(newText) === 0) return "Unknown-not-0 wording lost";
  if (allow !== "punish" && !PUNISH.test(oldText) && PUNISH.test(newText)) return "punishing wording introduced";
  if (/[০-৯]/.test(newText)) return "Bangla digits";
  return null;
}

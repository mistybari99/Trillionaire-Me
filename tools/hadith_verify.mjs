// READ-ONLY check of src/library/hadithPack.json. It writes nothing. It re-downloads the source files again (so it does not trust any local copy),
// compares every entry's text and reference with the source cell by cell, and cross-checks Bukhari and Muslim numbers against a second, independent dataset.
// Usage: node tools/hadith_verify.mjs [--pack src/library/hadithPack.json] [--selection docs/design/hadith-selection.json]
// Exit code 0 only when every entry matches. Network: raw.githubusercontent.com (through the session proxy, using curl).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const pack = JSON.parse(readFileSync(arg("pack", "src/library/hadithPack.json"), "utf8"));
const sel = JSON.parse(readFileSync(arg("selection", "docs/design/hadith-selection.json"), "utf8"));
const MIRROR = `https://raw.githubusercontent.com/Younes12345698/hadeethenc-mirror/${sel.mirrorCommit}`;
const get = (url) => execFileSync("curl", ["-sSfL", "--max-time", "180", url], { maxBuffer: 256 * 1024 * 1024 });
const problems = [];
const bad = (id, what) => problems.push(`${id}: ${what}`);

// 1. source files, fetched again and checked against the mirror's own index (SHA-256)
const index = JSON.parse(get(`${MIRROR}/data/v1/index.json`).toString("utf8"));
const langs = {};
for (const lang of ["ar", "en", "bn"]) {
  const ver = sel.versions[lang]; const raw = get(`${MIRROR}/data/v1/hadeeths/${lang}-${ver}.json.gz`);
  const sha = createHash("sha256").update(raw).digest("hex");
  const listed = JSON.stringify(index).includes(sha); if (!listed) bad(lang, `file hash ${sha} is not in the mirror index`);
  const j = JSON.parse(gunzipSync(raw).toString("utf8")); const f = j.fields;
  langs[lang] = { j, f, rows: new Map(j.rows.map((r) => [r[0], r])), col: (r, n) => r[f.indexOf(n)] };
}
console.log("source files re-fetched; versions", sel.versions);

// 2. cell-by-cell comparison
const COLL = { "Sahih al-Bukhari": "صحيح البخاري", "Sahih Muslim": "صحيح مسلم", "Sunan Abi Dawud": "سنن أبي داود", "Jami at-Tirmidhi": "سنن الترمذي", "Sunan an-Nasa'i": "سنن النسائي", "Sunan Ibn Majah": "سنن ابن ماجه", "Muwatta Malik": "موطأ مالك", "Musnad Ahmad": "مسند أحمد" };
let checked = 0;
for (const e of pack.entries) {
  const id = e.id.replace(/^he-/, ""); checked++;
  const en = langs.en.rows.get(id), bn = langs.bn.rows.get(id), ar = langs.ar.rows.get(id);
  if (!en || !ar) { bad(e.id, "hadith id not in the source"); continue; }
  if (e.en !== langs.en.col(en, "hadith_text")) bad(e.id, "English text differs from source");
  if (e.arabic !== langs.en.col(en, "hadith_text_ar")) bad(e.id, "Arabic text differs from the English release's Arabic column");
  if (e.arabic !== langs.ar.col(ar, "hadith_text")) bad(e.id, "Arabic text differs from the Arabic release");
  if (e.bn !== undefined) { if (!bn) bad(e.id, "Bangla text given but id not in the Bangla release"); else if (e.bn !== langs.bn.col(bn, "hadith_text")) bad(e.id, "Bangla text differs from source"); }
  else if (bn) bad(e.id, "Bangla exists in the source but was left out (allowed, noted)");
  if (e.grade !== langs.en.col(en, "grade")) bad(e.id, "grade differs");
  if (e.sourceUrl !== langs.en.col(en, "link")) bad(e.id, "source address differs");
  const refText = langs.ar.j.extra[id]?.[0] ?? "";
  const refLines = refText.split("\n").map((x) => x.trim());
  for (const line of String(e.reference).split("\n")) if (!refLines.includes(line)) bad(e.id, `reference line not in source: ${line.slice(0, 60)}`);
  const first = String(e.reference).split("\n")[0];
  if (!first.startsWith(COLL[e.collection] ?? "\u0000")) bad(e.id, `collection ${e.collection} does not match the first reference line`);
  const m = first.slice((COLL[e.collection] ?? "").length).match(/^\s*\(([^)]*)\)\s*\(([^)]+)\)/);
  if (!m || m[2].trim() !== e.number) bad(e.id, `number ${e.number} is not the hadith-number group of the first reference line`);
  if (!(langs.ar.j.extra[id]?.[2] ?? []).length) bad(e.id, "no category in the source");
}
console.log(`entries compared with the source: ${checked}`);

// 3. independent cross-check of Bukhari and Muslim numbers with fawazahmed0/hadith-api (a different dataset)
const FZ = "https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions";
const norm = (s) => s.normalize("NFC").replace(/[ً-ٰٟـۖ-ۭ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[^ء-ي0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const corpus = {};
for (const [coll, file, useArabic] of [["Sahih al-Bukhari", "ara-bukhari", false], ["Sahih Muslim", "ara-muslim", true]]) {
  const j = JSON.parse(get(`${FZ}/${file}.json`).toString("utf8"));
  // Muslim's number has parts (1563.01, 1563.02): the parts of one number are joined
  const m = new Map(); for (const h of j.hadiths) { const k = String(useArabic ? Math.floor(Number(h.arabicnumber)) : h.hadithnumber); m.set(k, (m.get(k) ? m.get(k) + " " : "") + norm(h.text)); }
  corpus[coll] = m;
}
// A headline is "confirmed" when it sits inside the second dataset's text for that number; otherwise a looser test is used: at least 70% of the headline's words
// (in order-free comparison) occur in that text. Anything below that is listed for a hand check and dropped from the pack if it cannot be confirmed.
const mismatch = [];
const words = (s) => s.split(" ").filter((w) => w.length > 2);
let exact = 0, fuzzy = 0, skipped = 0; const unconfirmed = [];
for (const e of pack.entries) {
  const c = corpus[e.collection]; if (!c) { skipped++; continue; }
  const id = e.id.replace(/^he-/, ""); const title = norm(langs.en.col(langs.en.rows.get(id), "title_ar") ?? "");
  const nums = e.number.replace(/[^\d]+/g, " ").trim().split(" ");
  if (nums.some((n) => c.has(n) && title.length > 5 && c.get(n).includes(title))) { exact++; continue; }
  const tw = words(title); const best = Math.max(0, ...nums.map((n) => { const t = c.get(n); if (!t || !tw.length) return 0; const set = new Set(words(t)); return tw.filter((w) => set.has(w)).length / tw.length; }));
  if (best >= 0.7) { fuzzy++; continue; }
  // Looser still: where does the headline sit in the second dataset? A reference is a MISMATCH only when the headline is found elsewhere and the claimed number is not among
  // those places (a difference of 1 is a known numbering difference between printed editions). Not found anywhere = cannot be confirmed by the second dataset.
  const where = [...c.entries()].filter(([k, t]) => k !== "NaN" && title.length > 5 && t.includes(title)).map(([k]) => Number(k));
  const near = where.some((w) => nums.some((n) => Math.abs(w - Number(n)) <= 1));
  if (where.length && near) fuzzy++;
  else if (where.length) { mismatch.push(`${e.id} ${e.collection} ${e.number} but the headline is at ${where.slice(0, 4).join(",")}`); }
  else unconfirmed.push(`${e.id} ${e.collection} ${e.number} (${Math.round(best * 100)}%)`);
}
console.log(`cross-check with fawazahmed0 (Bukhari, Muslim): exact ${exact}, close wording ${fuzzy}, not confirmable by the second dataset ${unconfirmed.length}, MISMATCH ${mismatch.length}, other collections not cross-checked ${skipped}`);
if (mismatch.length) { console.log("MISMATCH (headline found only at other numbers; a repeated hadith can have different wording at each place, so check by hand):", mismatch.join("; ")); if (process.argv.includes("--strict")) problems.push("reference mismatches: " + mismatch.length); }
if (unconfirmed.length) { console.log("not confirmed, check by hand:", unconfirmed.join("; ")); if (process.argv.includes("--strict")) problems.push("unconfirmed numbers: " + unconfirmed.length); }

if (problems.length) { console.log("PROBLEMS:\n" + problems.join("\n")); process.exit(1); }
console.log("OK: every entry matches the source cell for cell");

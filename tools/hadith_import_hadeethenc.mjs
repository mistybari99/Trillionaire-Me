// Builds src/library/hadithPack.json from the HadeethEnc.com release files (ar, en, bn), copying text VERBATIM. It never writes, edits or paraphrases wording.
// The only things this script decides are WHICH hadith to take (mechanical rules below) and the topic tags (our own labels, matched on words in the source's English text).
// Usage: node tools/hadith_import_hadeethenc.mjs --dir <folder with ar-*.json.gz en-*.json.gz bn-*.json.gz> --mirror-commit <sha> [--out src/library/hadithPack.json] [--selection docs/design/hadith-selection.json]
// Source files: data/v1/hadeeths/{ar-1.8.0,en-1.25.0,bn-1.56.0}.json.gz of github.com/Younes12345698/hadeethenc-mirror (an unchanged mirror of hadeethenc.com).
// Terms of the source (HadeethEnc.com, quoted in the mirror's TERMS.md and in the IslamHouse-API publishers' README): download and republish allowed with
// no change, addition or deletion to the content; name the publisher and source; state the version number; keep the version information; no unsuitable ads.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";

const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
const dir = arg("dir"), commit = arg("mirror-commit");
if (!dir || !commit) { console.error("need --dir and --mirror-commit"); process.exit(2); }
const out = arg("out") ?? "src/library/hadithPack.json", selOut = arg("selection") ?? "docs/design/hadith-selection.json";
const load = (lang) => { const f = readdirSync(dir).find((n) => n.startsWith(lang + "-") && n.endsWith(".json.gz")); if (!f) throw new Error("missing " + lang); const j = JSON.parse(gunzipSync(readFileSync(join(dir, f))).toString("utf8")); return { j, f, ver: f.slice(lang.length + 1, -8) }; };
const AR = load("ar"), EN = load("en"), BN = load("bn");
const col = (t, name) => t.j.fields.indexOf(name);
const rowsBy = (t) => new Map(t.j.rows.map((r) => [r[0], r]));
const A = rowsBy(AR), E = rowsBy(EN), B = rowsBy(BN);

// ---- reference lines: only lines naming a primary collection with a volume/page group and a hadith-number group ----
const COLLECTIONS = [["صحيح البخاري", "Sahih al-Bukhari"], ["صحيح مسلم", "Sahih Muslim"], ["سنن أبي داود", "Sunan Abi Dawud"], ["سنن الترمذي", "Jami at-Tirmidhi"],
  ["سنن النسائي", "Sunan an-Nasa'i"], ["سنن ابن ماجه", "Sunan Ibn Majah"], ["موطأ مالك", "Muwatta Malik"], ["مسند أحمد", "Musnad Ahmad"]];
const NUMS = "[\\d\\s,،\\-–]+";
function parseRef(refText) {
  const hits = [];
  for (const line of String(refText ?? "").split("\n")) {
    const t = line.trim();
    for (const [ar, en] of COLLECTIONS) {
      if (!t.startsWith(ar)) continue;
      const m = t.slice(ar.length).match(new RegExp(`^\\s*\\(([^)]*)\\)\\s*\\((${NUMS})\\)\\s*(?:[.،,].*)?$`));
      if (m && /\d/.test(m[1])) hits.push({ line: t, collection: en, number: m[2].trim() });
    }
  }
  return hits;
}
const extraAr = AR.j.extra; // id -> [reference, intro, categories]

// ---- mechanical selection rules ----
const AUTH = /^\[?(Authentic hadith|Authentic|Sahih\/Authentic with its two versions|Good hadith|Hasan|Hasan\/Sound by virtue of corroborating evidence|Good chain of narrators)\]?$/;
const AVOID = /\b(kill|killed|killing|fight|fighting|jihad|slave|slaves|apostate|apostasy|stone|stoned|stoning|lash|lashes|whip|adulter\w*|suicide|kills himself|killed himself|fornicat\w*|wine|drunk\w*|intoxicant\w*|menstru\w*|intercourse|semen|naked|nakedness|urine|excrement|dog|dogs|pig|swine|sword)\b/i;
// Topics follow the source's OWN category tree (HadeethEnc leaf categories, plus their sub-categories). Intention, patience and time have no category of their own,
// so they are taken from the source's headline (the Prophet's words) inside the "virtues and manners" categories. Our tags are labels only; they are not scholarly.
const CATS = {
  character: [282, 283, 646, 287, 636, 322, 317, 321, 286, 204, 340, 647, 735, 652, 654, 662, 650, 649, 291, 318],
  patience: [297],
  life: [316, 319, 320],
  purpose: [277, 94, 88, 92, 73, 338, 278],
  intention: [314, 280],
  halal_earning: [140, 141, 142, 143, 145, 146, 150, 153, 154, 564, 165],
  wealth: [511, 500, 504, 505, 506, 510, 201, 648],
  family: [273, 274, 191, 678, 610, 611, 581, 392, 393],
  knowledge: [270, 284, 629],
};
const VIRTUE = new Set([277, 280, 282, 283, 314, 316, 317, 319, 320, 321, 322, 287, 636, 646, 293, 301, 94, 88, 92, 297, 492, 307, 85, 63, 83, 338]);
const KEY_IN_VIRTUE = {
  intention: /\b(intention|intentions|intended|sincer\w+|ostentation|show off|for the sake of Allah|pleasure of Allah|face of Allah)\b/i,
  patience: /\b(patien\w+|persever\w+|steadfast\w*|hardship|affliction|calamit\w+|trial|trials|tested|tribulation|endur\w+|distress|grief|sorrow)\b/i,
};
// Time has no category: the source's headline must speak about life, youth, health or free time (any category except the ritual-prayer-time ones).
const TIME_RE = /\b(free time|leisure|youth|old age|before (your |you are )?(death|busy|busyness|poverty|illness)|your life|lifetime|his life|his age|(spend|spends|spent) (his|your) (life|time|youth)|day and night|night and day|health)\b/i;
const ancestors = (c, parents) => { const out = new Set(); let x = String(c); while (x && !out.has(x)) { out.add(x); x = parents[x]; } return out; };
const PARENTS = AR.j.parents ?? {};
const TOPIC_OF = (id, title) => {
  const cs = new Set(); for (const c of extraAr[id]?.[2] ?? []) for (const a of ancestors(c, PARENTS)) cs.add(Number(a));
  const out = [];
  for (const [tp, ids] of Object.entries(CATS)) if (ids.some((c) => cs.has(c))) out.push(tp);
  if ([...cs].some((c) => VIRTUE.has(c))) for (const [tp, re] of Object.entries(KEY_IN_VIRTUE)) if (re.test(title)) out.push(tp);
  if (TIME_RE.test(title)) out.push("time");
  return out;
};
// priority: rarer topics first so they get their share; each hadith keeps at most 3 topic tags
const ORDER = ["intention", "time", "purpose", "life", "halal_earning", "patience", "knowledge", "wealth", "family", "character"];
const QUOTA = { intention: 60, time: 60, purpose: 60, life: 60, halal_earning: 60, patience: 60, knowledge: 60, wealth: 60, family: 60, character: 200 };
// ids a human skimmed as off-topic or unsuitable for a one-line card (listed here so the choice is visible and repeatable)
const EXCLUDE = new Set(["3062", "3145", "3110", "3350", "3383", "3390", "3407", "3438", "3480", "3591", "3718", "6014", "6093", "6379", "8886", "8904", "8914", "8945", "11169", "11220",
  "66204", "3330", "5379", "5347", "8315", "65105", "8918", "6761", "6762", "10647", "65086", "65087", "8902", "3063", "3220", "3030", "8888", "65009", "65011", "65013", "65022", "65031", "65037", "65058", "65059", "65061", "65062", "65075", "65114", "65426", "65468", "65783", "5020", "5331", "6615", "3574", "65049", "66219"]);
// Topic tags the separate verification session found loose (2 Nov 2026): fixed here by hand, visible and repeatable. Tags are our labels, not text from the source.
const RETAG = { "3358": ["family"], "5377": ["purpose"], "4314": ["halal_earning"], "3779": ["character"], "65063": ["purpose"], "65002": ["character"] };
const MAX = { en: 1500, bn: 2800, ar: 1900 };

const cands = [];
for (const id of E.keys()) {
  const e = E.get(id), b = B.get(id), a = A.get(id); if (!a) continue;
  const en = e[col(EN, "hadith_text")], bn = b ? b[col(BN, "hadith_text")] : "", ar = e[col(EN, "hadith_text_ar")], title = e[col(EN, "title")] ?? "", grade = e[col(EN, "grade")];
  // Arabic and English are required; Bangla is added when the Bangla release has the same hadith (otherwise that language stays empty)
  if (![en, ar].every((x) => typeof x === "string" && x.trim())) continue;
  if (en.length > MAX.en || (bn && bn.length > MAX.bn) || ar.length > MAX.ar) continue;
  if (!AUTH.test(String(grade).trim())) continue;
  if (AVOID.test(en) || AVOID.test(title)) continue;
  if (EXCLUDE.has(id)) continue;
  const refs = parseRef(extraAr[id]?.[0]); if (!refs.length) continue;
  const topics = ORDER.filter((tp) => TOPIC_OF(id, title).includes(tp));
  if (!topics.length) continue;
  cands.push({ id, topics, len: en.length + ar.length, hasBn: !!bn, refs, primary: /Bukhari|Muslim/.test(refs[0].collection) ? 0 : 1 });
}
cands.sort((x, y) => Number(y.hasBn) - Number(x.hasBn) || x.primary - y.primary || x.len - y.len || Number(x.id) - Number(y.id));
const seenRef = new Set(); const dedup = [];
for (const c of [...cands].sort((x, y) => Number(x.id) - Number(y.id))) { const k = `${c.refs[0].collection}|${c.refs[0].number}`; if (seenRef.has(k)) continue; seenRef.add(k); dedup.push(c); }
cands.length = 0; cands.push(...dedup);
cands.sort((x, y) => Number(y.hasBn) - Number(x.hasBn) || x.primary - y.primary || x.len - y.len || Number(x.id) - Number(y.id));
const chosen = new Map();
for (const tp of ORDER) {
  let n = 0;
  for (const c of cands) { if (n >= QUOTA[tp]) break; if (!c.topics.includes(tp)) continue; if (chosen.has(c.id) && chosen.get(c.id).length >= 3) continue; const cur = chosen.get(c.id) ?? []; if (cur.includes(tp)) { n++; continue; } chosen.set(c.id, [...cur, tp]); n++; }
}
const byId = new Map(cands.map((c) => [c.id, c]));
const selection = [...chosen.entries()].map(([id, topics]) => ({ id, topics: RETAG[id] ?? topics })).sort((x, y) => Number(x.id) - Number(y.id));

// ---- build entries: every text field is the source cell, untouched ----
const SOURCE = `HadeethEnc.com (Encyclopedia of Translated Prophetic Hadiths): Arabic v${AR.ver}, English v${EN.ver}, Bangla v${BN.ver}`;
const LICENCE = "HadeethEnc.com terms: free to republish unchanged, with the source and version named";
const entries = selection.map(({ id, topics }) => {
  const e = E.get(id), b = B.get(id), c = byId.get(id), r = c.refs[0];
  return { id: `he-${id}`, topics, arabic: e[col(EN, "hadith_text_ar")], en: e[col(EN, "hadith_text")], ...(b ? { bn: b[col(BN, "hadith_text")] } : {}),
    collection: r.collection, number: r.number, reference: c.refs.map((x) => x.line).join("\n"),
    grade: e[col(EN, "grade")], gradeBy: "HadeethEnc.com",
    source: SOURCE, sourceUrl: e[col(EN, "link")], licence: LICENCE, status: "unreviewed" };
});
writeFileSync(out, JSON.stringify({ version: 1, entries }, null, 1) + "\n");
writeFileSync(selOut, JSON.stringify({ about: "Hadith ids taken from HadeethEnc.com (rules in tools/hadith_import_hadeethenc.mjs). Topic tags are the builder's own labels.", mirrorCommit: commit,
  versions: { ar: AR.ver, en: EN.ver, bn: BN.ver }, entries: selection }, null, 1) + "\n");
const per = Object.fromEntries(ORDER.map((tp) => [tp, entries.filter((x) => x.topics.includes(tp)).length]));
console.log(`candidates ${cands.length}, written ${entries.length}`, JSON.stringify(per));

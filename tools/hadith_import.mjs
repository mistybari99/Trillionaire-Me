// Builds src/library/hadithPack.json from a SELECTION file and a SOURCE file. It copies text verbatim; it never writes or edits wording.
// Usage: node tools/hadith_import.mjs --source src.json --selection sel.json --licence "<licence text>" --source-name "<name>" --source-url https://... [--out src/library/hadithPack.json]
//   source.json   : { "hadiths": [ { "hadithnumber": 1, "text": "...", "grades": [ { "name": "...", "grade": "..." } ] } ], "metadata": { "name": "..." } }  (fawazahmed0 style)
//   selection.json: [ { "id": "bukhari-1", "number": 1, "topics": ["intention"], "collection": "Sahih al-Bukhari", "lang": "en" } ]
// An entry with a missing number in the source is DROPPED and reported. Run the verification step afterwards (see docs/design/hadith-pack.md).
import { readFileSync, writeFileSync } from "node:fs";
const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
const need = ["source", "selection", "licence", "source-name", "source-url"].filter((n) => !arg(n));
if (need.length) { console.error("missing --" + need.join(", --")); process.exit(2); }
if (!/^https:\/\//.test(arg("source-url"))) { console.error("--source-url must be https"); process.exit(2); }
const src = JSON.parse(readFileSync(arg("source"), "utf8")); const sel = JSON.parse(readFileSync(arg("selection"), "utf8"));
const byNo = new Map((src.hadiths ?? []).map((h) => [String(h.hadithnumber), h]));
const entries = [], dropped = [];
for (const s of sel) {
  const h = byNo.get(String(s.number));
  if (!h || typeof h.text !== "string" || !h.text.trim()) { dropped.push(s.id); continue; }
  const g = Array.isArray(h.grades) && h.grades[0]?.grade ? { grade: h.grades[0].grade, gradeBy: h.grades[0].name } : {};
  entries.push({ id: s.id, topics: s.topics, [s.lang ?? "en"]: h.text, collection: s.collection, number: String(s.number), ...g,
    source: arg("source-name"), sourceUrl: arg("source-url"), licence: arg("licence"), status: "unreviewed" });
}
writeFileSync(arg("out") ?? "src/library/hadithPack.json", JSON.stringify({ version: 1, entries }, null, 1));
console.log(`written ${entries.length}, dropped ${dropped.length}${dropped.length ? ": " + dropped.join(",") : ""}`);

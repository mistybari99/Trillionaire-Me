// Writes the two test fixtures after an intended change: node tools/bangla_plain_snapshots.mjs
//   tests/fixtures/bangla_counts.json     (string counts per file)
//   tests/fixtures/bangla_protected.json  (protected Bangla strings of the app pack, key -> text)
import { readFileSync, writeFileSync } from "node:fs";
import { loadAll, isProtected } from "./banglaPlainCore.mjs";
const { PACKS } = await import("../src/i18n/packs.ts");
const cfg = JSON.parse(readFileSync(new URL("./bangla_plain_rules.json", import.meta.url), "utf8"));
const segs = loadAll(".");
const perFile = {}; for (const s of segs) perFile[s.file] = (perFile[s.file] ?? 0) + 1;
writeFileSync("tests/fixtures/bangla_counts.json", JSON.stringify({ keys: Object.keys(PACKS.en).length, perFile }, null, 2) + "\n");
const prot = {};
for (const s of segs) if (s.file === "src/i18n/packs.ts" && s.key && isProtected(cfg.protected, s.file, s.key, s.text)) prot[s.key] = s.text;
writeFileSync("tests/fixtures/bangla_protected.json", JSON.stringify(prot, null, 2) + "\n");
console.log(`counts: ${segs.length} strings; protected: ${Object.keys(prot).length}`);

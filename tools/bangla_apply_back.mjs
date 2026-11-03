// Apply a reviewer's corrections from a copy of docs/owner/BANGLA_REVIEW_SHEET.md back into src/i18n/packs.ts (Bangla block only).
// Usage: node tools/bangla_apply_back.mjs <reviewed-sheet.md> [--write]
// Without --write it only prints what it would change (dry run). After --write, run `node tools/bangla_review_sheet.mjs`, then tsc and vitest.
// It does not change the Register: TM-TST-161 moves from Partial only when a named reviewer has signed the sheet (a human step).
import { readFileSync, writeFileSync } from "node:fs";
import { readSheet, applyToSource } from "./banglaApplyBack.ts";

const [file, flag] = process.argv.slice(2);
if (!file) { console.error("Usage: node tools/bangla_apply_back.mjs <reviewed-sheet.md> [--write]"); process.exit(2); }
const { PACKS } = await import("../src/i18n/packs.ts");
const rep = readSheet(readFileSync(file, "utf8"), new Set(Object.keys(PACKS.bn)));
console.log(`rows ${rep.rows} · OK ${rep.ok} · blank ${rep.blank} · changes ${rep.changes.length} · refused ${rep.refused.length} · signed ${rep.signed ? "yes (" + rep.reviewer + ")" : "no"}`);
for (const r of rep.refused) console.log(`  refused ${r.key}: ${r.why}`);
for (const c of rep.changes) console.log(`  ${c.key}\n    - ${c.from}\n    + ${c.to}`);
if (flag !== "--write") { console.log("dry run: nothing was written (add --write to apply)"); process.exit(0); }
const path = "src/i18n/packs.ts";
const res = applyToSource(readFileSync(path, "utf8"), rep.changes);
for (const r of res.refused) console.log(`  not applied ${r.key}: ${r.why}`);
writeFileSync(path, res.src);
console.log(`applied ${res.applied.length} change(s) to ${path}. Next: node tools/bangla_review_sheet.mjs && npx tsc --noEmit && npx vitest run`);

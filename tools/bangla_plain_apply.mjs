// Applies the binding Bangla plain-language rules (docs/design/bangla-plain-final-decision.md) to every Bangla string value.
// Dry run by default: prints what would change and writes tmp/bangla_plain_report.md. Nothing is written without --apply.
//   node tools/bangla_plain_apply.mjs [--only spelling,meaning,stiff] [--apply] [--step <label>] [--what-changed]
// --apply refuses if a target file has uncommitted changes (use --allow-dirty when only MIX_TERMS was edited by hand first, same commit), if MIX_TERMS lacks a needed English pair, or if a guard fails
// (placeholders, "যাচাই হয়নি", Deen words, Unknown-not-0 words, punishing words, Bangla digits). Undo = git revert of the step commit.
// --what-changed writes docs/owner/BANGLA_WHAT_CHANGED.md from docs/design/bangla-plain-change-log.json.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { TS_FILES, JSON_FILES, tsSegments, jsonSegments, encode, jsonEncode, isProtected, applyWordRules, guardReason } from "./banglaPlainCore.mjs";

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const val = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const rulesPath = new URL("./bangla_plain_rules.json", import.meta.url);
const cfg = JSON.parse(readFileSync(rulesPath, "utf8"));
const LOG = "docs/design/bangla-plain-change-log.json";

if (flag("--what-changed")) { await import("./banglaWhatChanged.mjs").then((m) => m.write(LOG, cfg)); process.exit(0); }

const groups = (val("--only") ? val("--only").split(",") : cfg.groups).filter((g) => cfg.groups.includes(g));
const apply = flag("--apply");
const files = Object.fromEntries([...TS_FILES, ...JSON_FILES].map((f) => [f, readFileSync(f, "utf8")]));
const { PACKS, MIX_TERMS } = await import("../src/i18n/packs.ts");
const enOf = (key) => (key ? PACKS.en[key] : undefined);

if (apply) {
  const dirty = flag("--allow-dirty") ? "" : execSync("git status --porcelain -- " + [...TS_FILES, ...JSON_FILES].join(" ")).toString().trim();
  if (dirty) { console.error("refused: target files have uncommitted changes:\n" + dirty); process.exit(1); }
  const have = new Set(MIX_TERMS.map(([b, e]) => b + "|" + e));
  const missing = (cfg.mixRequired || []).filter(([g, b, e]) => groups.includes(g) && !have.has(b + "|" + e));
  if (missing.length) { console.error("refused: add these pairs to MIX_TERMS first (same commit):\n" + missing.map(([g, b, e]) => `  ["${b}", "${e}"]`).join("\n")); process.exit(1); }
}

const lineOf = (src, pos) => src.slice(0, pos).split("\n").length;
const changes = []; const refused = []; const perRule = {};
for (const group of groups) {
  const rewrites = cfg.rewrites.filter((r) => r.group === group);
  const used = new Set();
  for (const file of Object.keys(files)) {
    const src = files[file];
    const segs = file.endsWith(".json") ? jsonSegments(file, src) : tsSegments(file, src);
    const edits = [];
    for (const s of segs) {
      const prot = isProtected(cfg.protected, file, s.key, s.text);
      const { text: afterRules, ids } = applyWordRules(s.text, cfg.rules, group, { file, key: s.key, line: lineOf(src, s.start), en: file === "src/i18n/packs.ts" ? enOf(s.key) : undefined, protected: prot });
      let next = afterRules; const why = [...ids];
      // rewrites: by packs.ts key (whole line, or `partial` = replace only the expected part), or key null = partial edit of any string of that file that contains `expect`
      const cands = rewrites.filter((r) => r.file === file && ((r.key != null && r.key === s.key) || (r.key == null && afterRules.includes(r.expect))));
      let rw = null;
      for (const c of cands) {
        used.add(c.id); rw = c;
        const partial = c.partial || c.key == null;
        if (!next.includes(c.expect)) refused.push({ id: c.id, file, key: s.key, why: `expected text '${c.expect}' not found now` });
        else if (prot && !c.allowProtected) refused.push({ id: c.id, file, key: s.key, why: "protected string" });
        else { next = partial ? next.split(c.expect).join(c.to) : c.to; why.push(c.id); }
      }
      if (next === s.text) continue;
      const g = guardReason(s.text, next, cands.map((c) => c.allowGuard).find(Boolean));
      if (g) { refused.push({ id: why.join("+"), file, key: s.key, why: g }); continue; }
      for (const id of why) perRule[id] = (perRule[id] || 0) + 1;
      changes.push({ group, file, key: s.key, line: lineOf(src, s.start), before: s.text, after: next, rules: why, protected: prot });
      edits.push({ s, next });
    }
    // splice from the end so positions stay valid
    let out = src;
    for (const { s, next } of edits.sort((a, b) => b.s.start - a.s.start)) {
      const enc = s.kind === "json" ? jsonEncode(next) : encode(next, s.quote);
      out = out.slice(0, s.start) + enc + out.slice(s.end);
    }
    files[file] = out;
  }
  for (const r of rewrites) if (!used.has(r.id)) refused.push({ id: r.id, file: r.file, key: r.key, why: "key not found" });
}

mkdirSync("tmp", { recursive: true });
const rep = [`# Bangla plain apply report (${apply ? "APPLIED" : "dry run"})`, `groups: ${groups.join(", ")}`, `changed strings: ${changes.length} in ${new Set(changes.map((c) => c.file)).size} files`, `refused: ${refused.length}`, "", "## Count per rule", ...Object.entries(perRule).sort().map(([k, n]) => `- ${k}: ${n}`), "", "## Refused", ...refused.map((r) => `- ${r.id} ${r.file}#${r.key}: ${r.why}`), "", "## Changes", ...changes.map((c) => `- ${c.file}:${c.line} \`${c.key}\` [${c.rules.join(",")}]${c.protected ? " (protected)" : ""}\n  - ${c.before.replace(/\n/g, "\\n")}\n  + ${c.after.replace(/\n/g, "\\n")}`)];
writeFileSync("tmp/bangla_plain_report.md", rep.join("\n") + "\n");
console.log(rep.slice(0, 4).join("\n"));
for (const [k, n] of Object.entries(perRule).sort()) console.log(`  ${k}: ${n}`);
for (const r of refused) console.log(`  REFUSED ${r.id} ${r.file}#${r.key}: ${r.why}`);
if (!apply) { console.log("dry run: nothing written (add --apply). Full list: tmp/bangla_plain_report.md"); process.exit(0); }
if (refused.length && !flag("--allow-refused")) { console.error("refused: fix the rules or add --allow-refused"); process.exit(1); }
for (const [f, c] of Object.entries(files)) writeFileSync(f, c);
const log = existsSync(LOG) ? JSON.parse(readFileSync(LOG, "utf8")) : [];
const step = val("--step") || groups.join("+");
for (const c of changes) log.push({ step, group: c.group, file: c.file, key: c.key, rules: c.rules, protected: c.protected || undefined, before: c.before, after: c.after });
writeFileSync(LOG, JSON.stringify(log, null, 0).replace(/\},\{/g, "},\n{") + "\n");
console.log(`applied ${changes.length} change(s); log appended to ${LOG}. Next: run tsc, vitest, build, e2e.`);

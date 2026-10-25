// Evidence gate: only passing automated results may upgrade a Register row. Writes evidence/traceability-result.json.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const trace = JSON.parse(readFileSync("tools/traceability.json", "utf8"));
execFileSync("npx", ["vitest", "run", "--reporter=json", "--outputFile=evidence/vitest.json"], { stdio: "inherit" });
const v = JSON.parse(readFileSync("evidence/vitest.json", "utf8"));
const e2e = existsSync("evidence/e2e-report.json") ? JSON.parse(readFileSync("evidence/e2e-report.json", "utf8")).results : [];
const byId = {};
for (const f of v.testResults) for (const a of f.assertionResults) {
  const m = a.ancestorTitles.join(" ").match(/TM-TST-(\d{3}(?:\/\d{3})*)/);
  if (!m) continue;
  for (const n of m[1].split("/")) (byId[`TM-TST-${n}`] ??= []).push(a.status);
}
const out = {};
for (const [id, meta] of Object.entries(trace)) {
  const st = byId[id] ?? [];
  const autoPass = st.length > 0 && st.every((s) => s === "passed");
  const e2eRel = e2e.filter((r) => r.id === id);
  const e2ePass = e2eRel.every((r) => r.pass);
  const ok = autoPass && e2ePass;
  out[id] = { ...meta, tests: st.length, e2e: e2eRel.length, evidenceOk: ok, finalOutcome: ok ? meta.outcome : "Fail" };
}
writeFileSync("evidence/traceability-result.json", JSON.stringify({ generated: new Date().toISOString(), totalTests: v.numTotalTests, failed: v.numFailedTests, results: out }, null, 2));
const bad = Object.entries(out).filter(([, r]) => !r.evidenceOk);
console.log(`vitest ${v.numPassedTests}/${v.numTotalTests} passed; ${Object.keys(out).length} TM-TST rows with evidence; ${bad.length} failing`);
process.exit(bad.length || v.numFailedTests ? 1 : 0);

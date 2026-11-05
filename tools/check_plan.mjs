// Validate the active work list, retained IDs, dependencies and maintained doc links.
// Run from the repo root. Read-only, no network or generated evidence changes.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const text = p => readFileSync(p, 'utf8');
const tracker = text('docs/plan/PLAN_TRACKER.md');
const rows = tracker.split('\n').filter(l => /^\| [A-Z]+-\d+ \|/.test(l))
  .map(l => l.split('|').slice(1, -1).map(c => c.trim()));
assert(rows.length > 0, 'No active work packages found');
const ids = new Set(rows.map(c => c[0]));
assert.equal(ids.size, rows.length, 'Duplicate active task ID');
const byId = new Map(rows.map(c => [c[0], c]));
for (const c of rows) {
  assert.equal(c.length, 8, `${c[0]}: expected eight columns`);
  assert.match(c[1], /^P[0-3]$/, `${c[0]}: invalid priority`);
  assert(['Pending', 'In progress', 'Needs verification', 'Done', 'Blocked'].includes(c[4]), `${c[0]}: invalid status`);
  assert(c[2] && c[3] && c[6] && c[7], `${c[0]}: missing responsibility, acceptance or evidence`);
  for (const dep of c[5] === '—' ? [] : c[5].split(', ')) assert(ids.has(dep) && dep !== c[0], `${c[0]}: invalid dependency ${dep}`);
  if (c[4] === 'Done') for (const dep of c[5] === '—' ? [] : c[5].split(', ')) assert.equal(byId.get(dep)[4], 'Done', `${c[0]}: dependency is not done`);
}
const visiting = new Set(), visited = new Set();
function visit(id) {
  assert(!visiting.has(id), `Cyclic dependency at ${id}`);
  if (visited.has(id)) return;
  visiting.add(id);
  const deps = byId.get(id)[5];
  for (const dep of deps === '—' ? [] : deps.split(', ')) visit(dep);
  visiting.delete(id); visited.add(id);
}
for (const id of ids) visit(id);

const ledger = JSON.parse(text('docs/plan/legacy-task-map.json'));
const archive = text(ledger.archive);
const historicalIds = [...archive.matchAll(/^\| ((?:SET-|TD-|AU-|DL-|B12-|N[34]-)[^ |]+) \|/gm)].map(m => m[1]);
const mappings = new Map();
for (const row of ledger.mappings) {
  assert(!mappings.has(row.legacy_id), `Duplicate old ID ${row.legacy_id}`);
  assert(ids.has(row.work_package), `Unknown destination for ${row.legacy_id}`);
  mappings.set(row.legacy_id, row.work_package);
}
for (const id of historicalIds) assert(mappings.has(id), `Dropped historical ID ${id}`);
for (let i = 1; i <= 10; i++) for (const prefix of ['REM', 'G3']) assert(mappings.has(`${prefix}-${String(i).padStart(2, '0')}`), `Missing ${prefix} step ${i}`);
assert.equal(mappings.size, historicalIds.length + 20, 'Unexpected/missing legacy aliases');

// Baseline hashes were checked against git show at migration. Works in shallow CI clones too.
assert.equal(ledger.archives.length, 4, 'Expected all four historical snapshots');
for (const snapshot of ledger.archives) {
  const digest = createHash('sha256').update(readFileSync(snapshot.path)).digest('hex');
  assert.equal(digest, snapshot.sha256, `Archive changed: ${snapshot.path}`);
}
const docs = ['README.md', 'docs/PLAN.md', 'docs/TODO.md', 'docs/ROADMAP.md', 'docs/plan/PLAN_TRACKER.md',
  'docs/audit/REPOSITORY_AUDIT_2026-11-05.md', 'docs/audit/RELIABILITY_FIXES_2026-11-05.md',
  'docs/audit/ACTION_DESK_UI_2026-11-05.md', 'docs/audit/USABILITY_CONTROLS_2026-11-05.md', 'docs/audit/MULTISELECT_AUDIT_2026-11-05.md', 'docs/audit/usability-controls/README.md', 'docs/audit/action-desk-ui/README.md',
  'docs/deployment/CI_GATE.md', 'docs/design/UI_REFRESH_2026-11-05_A.md',
  'docs/design/UI_REFRESH_2026-11-05_B.md', 'docs/design/USABILITY_ARCHITECTURE_2026-11-05.md', 'docs/design/UI_REFRESH_2026-11-05_DECISION.md',
  'docs/owner/AUDIT_SUMMARY_2026-11-05_BN.md', 'docs/owner/RELIABILITY_UI_2026-11-05_BN.md'];
let links = 0;
for (const file of docs) {
  const body = text(file);
  for (const match of body.matchAll(/\[[^\]\n]+\]\(([^)]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^(https?:|mailto:)/.test(target)) continue;
    assert(existsSync(resolve(dirname(file), target)), `${file}: missing link ${target}`); links++;
  }
  for (const match of body.matchAll(/`((?:src|tests|tools|public|docs|\.github)\/[^`\s#*]+)`/g)) {
    assert(existsSync(match[1]), `${file}: missing evidence path ${match[1]}`);
  }
}
for (const match of text('docs/TODO.md').matchAll(/\b([A-Z]+-\d{2})\b/g)) assert(ids.has(match[1]), `Next queue has unknown ID ${match[1]}`);
console.log(`Plan checks passed: ${rows.length} active packages, ${historicalIds.length} retained task IDs + 20 reminder/gap references, four exact archives, ${links} local links, acyclic dependencies.`);

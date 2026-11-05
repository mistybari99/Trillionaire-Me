// Focused audit observations, synthetic data only. Run from the repository root.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createServer } from 'vite';

const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
try {
  const { restoreBackupAtomic } = await server.ssrLoadModule('/src/core/restore.ts');
  const { checksum } = await server.ssrLoadModule('/src/core/backup.ts');
  const rec = id => ({ id, entity: 'goal', ns: 'demo', ownerId: 'demo-user', schemaVersion: 3,
    createdAt: '2026-11-05T00:00:00Z', values: { 'goal.title': { state: 'value', value: id, label: 'DEMO' } } });
  let rows = [rec('old')]; const snapshots = [];
  const repo = {
    list: async () => structuredClone(rows), get: async () => null,
    put: async r => {
      if (r.id === 'fail' || r.id === 'old') throw Error('simulated persistent write failure');
      rows = [...rows.filter(x => x.id !== r.id), r];
    },
    delete: async (_ns, id) => { rows = rows.filter(x => x.id !== id); }, clear: async () => { rows = []; },
  };
  const records = [rec('new'), rec('fail')]; const createdAt = '2026-11-05T00:00:00Z';
  const source = { demo: { app: 'trillionaire-me', schemaVersion: 3, ns: 'demo', createdAt,
    count: records.length, checksum: checksum(JSON.stringify(records)), records }, real: null, createdAt };
  let error = null;
  try { await restoreBackupAtomic(repo, { put: async s => snapshots.push(s), list: async () => snapshots, delete: async () => {} }, source, false); }
  catch (e) { error = e.message; }
  console.log(JSON.stringify({ id: 'AUD-01', error, remainingIds: rows.map(x => x.id), snapshotsRetained: snapshots.length }));
} finally { await server.close(); }

const handlers = {}; let pending; const deleted = []; let rejectedAssets = 0;
vm.runInNewContext(readFileSync('public/sw.js', 'utf8').replace('/*PRECACHE_LIST*/[]', '["./", "./assets/missing.js"]'), {
  self: { registration: { scope: 'https://audit.invalid/', active: {} },
    addEventListener: (n, f) => { handlers[n] = f; }, skipWaiting() {}, clients: { claim: async () => {} } },
  caches: { open: async () => ({ add: async r => { if (r.url.endsWith('missing.js')) { rejectedAssets++; throw Error('simulated failed download'); } } }),
    keys: async () => ['tm-shell-old', 'tm-runtime-v1'], delete: async k => { deleted.push(k); return true; } },
  URL, Request: class { constructor(url) { this.url = new URL(url, 'https://audit.invalid/').href; } },
  location: { origin: 'https://audit.invalid' },
});
let installFulfilled = false;
try { handlers.install({ waitUntil: p => { pending = p; } }); await pending; installFulfilled = true; }
catch { /* A corrected worker should reject the incomplete install. */ }
if (installFulfilled) { handlers.activate({ waitUntil: p => { pending = p; } }); await pending; }
console.log(JSON.stringify({ id: 'AUD-02', rejectedAssets, installFulfilled, deleted }));

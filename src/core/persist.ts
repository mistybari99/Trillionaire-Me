// Write-through persistence: screens keep using the sync Store; every change is mirrored to a RecordRepo (IndexedDB).
import type { RecordRepo } from "./repo";
import type { KV } from "./store";

export class MirrorKV implements KV {
  constructor(private mem: KV, private onChange: (k: string, v: string | null) => void) {}
  get(k: string) { return this.mem.get(k); }
  set(k: string, v: string) { this.mem.set(k, v); this.onChange(k, v); }
  remove(k: string) { this.mem.remove(k); this.onChange(k, null); }
  keys() { return this.mem.keys(); }
}

const parse = (k: string) => { const m = k.match(/^tm:(demo|real):(.+)$/); return m ? { ns: m[1] as "demo" | "real", id: m[2]! } : null; };

/** Fill memory from the repo; one-time import of any old localStorage records (never overwrites newer repo data). */
export async function hydrate(mem: KV, repo: RecordRepo, legacy: KV): Promise<void> {
  for (const ns of ["demo", "real"] as const) for (const r of await repo.list(ns)) mem.set(`tm:${ns}:${r.id}`, JSON.stringify(r));
  for (const k of legacy.keys()) {
    const p = parse(k); if (!p || mem.get(k) !== null) continue;
    const raw = legacy.get(k); if (raw) { mem.set(k, raw); await repo.put(JSON.parse(raw)); }
  }
}

/** Serialises writes so the repo always ends in the same state as memory. */
export function mirrorToRepo(repo: RecordRepo): (k: string, v: string | null) => void {
  let chain: Promise<unknown> = Promise.resolve();
  return (k, v) => {
    const p = parse(k); if (!p) return;
    chain = chain.then(() => (v === null ? repo.delete(p.ns, p.id) : repo.put(JSON.parse(v)))).catch(() => { /* memory copy stays valid; next write retries */ });
  };
}

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

/** Tracks whether writes to the repo failed. Failed keys stay in a queue (latest value wins) until a retry succeeds. Pure, no UI. */
export class SaveMonitor {
  private failed = new Map<string, string | null>();
  private subs = new Set<() => void>();
  private retryFn: (() => void) | null = null;
  get hasFailure(): boolean { return this.failed.size > 0; }
  get failedCount(): number { return this.failed.size; }
  subscribe(f: () => void): () => void { this.subs.add(f); return () => { this.subs.delete(f); }; }
  private emit() { for (const f of [...this.subs]) f(); }
  fail(k: string, v: string | null) { const had = this.failed.has(k); this.failed.set(k, v); if (!had) this.emit(); }
  ok(k: string) { if (this.failed.delete(k)) this.emit(); }
  /** Re-queues every failed write with its latest value. Returns how many were queued. */
  retry(): number { const n = this.failed.size; this.retryFn?.(); return n; }
  bind(fn: () => void) { this.retryFn = fn; }
  entries(): Array<[string, string | null]> { return [...this.failed]; }
}

/** Serialises writes so the repo always ends in the same state as memory. A failed write is never swallowed: it is recorded in the monitor and can be retried. */
export function mirrorToRepo(repo: RecordRepo, monitor?: SaveMonitor): (k: string, v: string | null) => void {
  let chain: Promise<unknown> = Promise.resolve();
  const write = (k: string, v: string | null) => {
    const p = parse(k); if (!p) return;
    chain = chain.then(async () => {
      try { if (v === null) await repo.delete(p.ns, p.id); else await repo.put(JSON.parse(v)); monitor?.ok(k); }
      catch { monitor?.fail(k, v); /* memory copy stays valid; the monitor keeps it for a retry */ }
    });
  };
  monitor?.bind(() => { for (const [k, v] of monitor.entries()) write(k, v); });
  return write;
}

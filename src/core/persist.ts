// Write-through persistence: screens keep using the sync Store; every change is mirrored to a RecordRepo (IndexedDB).
import type { RecordRepo } from "./repo";
import type { KV } from "./store";
import type { TMRecord } from "./types";
import { cantOpenStub, decryptRecord, encryptRecord, isEncRecord } from "./dataVault";

/** What the persistence layer needs to know about at-rest encryption (src/core/dataVault.ts). Absent = no encryption, as before. */
export interface VaultGate {
  /** the vault is on (read fresh each time, so a stale tab sees a change made in another tab) */
  active(): boolean;
  /** the data key while unlocked, else null */
  key(): CryptoKey | null;
  /** keys of sealed records that could not be opened: shown as "Can't open", ciphertext never overwritten or deleted */
  isOpaque(k: string): boolean;
  markOpaque(k: string): void;
  clearOpaque(): void;
}

export class MirrorKV implements KV {
  constructor(private mem: KV, private onChange: (k: string, v: string | null) => void) {}
  get(k: string) { return this.mem.get(k); }
  set(k: string, v: string) { this.mem.set(k, v); this.onChange(k, v); }
  remove(k: string) { this.mem.remove(k); this.onChange(k, null); }
  keys() { return this.mem.keys(); }
}

const parse = (k: string) => { const m = k.match(/^tm:(demo|real):(.+)$/); return m ? { ns: m[1] as "demo" | "real", id: m[2]! } : null; };

/** Puts one stored record into memory. A sealed record is opened with the key; if it cannot be opened, a stand-in is shown and the ciphertext stays in storage. */
async function intoMemory(mem: KV, r: TMRecord, gate?: VaultGate): Promise<void> {
  const k = `tm:${r.ns}:${r.id}`;
  if (!isEncRecord(r)) { mem.set(k, JSON.stringify(r)); return; }
  const key = gate?.key();
  if (key) { try { mem.set(k, JSON.stringify(await decryptRecord(key, r))); return; } catch { /* falls through to the stand-in */ } }
  mem.set(k, JSON.stringify(cantOpenStub(r))); gate?.markOpaque(k);
}

/** Fill memory from the repo; one-time import of any old localStorage records (never overwrites newer repo data).
 * With the vault on and locked, no real record is loaded at all (the screen asks for the passphrase first). Reads accept plain and sealed records. */
export async function hydrate(mem: KV, repo: RecordRepo, legacy: KV, gate?: VaultGate): Promise<void> {
  gate?.clearOpaque();
  const locked = !!gate?.active() && !gate.key();
  for (const ns of ["demo", "real"] as const) {
    if (ns === "real" && locked) continue;
    for (const r of await repo.list(ns)) await intoMemory(mem, r, gate);
  }
  for (const k of legacy.keys()) {
    const p = parse(k); if (!p || mem.get(k) !== null) continue;
    if (p.ns === "real" && locked) continue;
    const raw = legacy.get(k); if (!raw) continue;
    mem.set(k, raw); const rec = JSON.parse(raw) as TMRecord;
    await repo.put(p.ns === "real" && gate?.active() && gate.key() ? await encryptRecord(gate.key()!, rec) : rec);
  }
}

/** Drops every real record from memory only (storage is not touched). Used when the vault locks. */
export function forgetReal(mem: KV): void { for (const k of mem.keys()) if (k.startsWith("tm:real:")) mem.remove(k); }

/** After unlock: replaces every real record in memory with the opened ones. */
export async function rehydrateReal(mem: KV, repo: RecordRepo, gate: VaultGate): Promise<void> {
  forgetReal(mem);
  gate.clearOpaque();
  for (const r of await repo.list("real")) await intoMemory(mem, r, gate);
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
export function mirrorToRepo(repo: RecordRepo, monitor?: SaveMonitor, gate?: VaultGate): ((k: string, v: string | null) => void) & { flush(): Promise<void> } {
  let chain: Promise<unknown> = Promise.resolve();
  const failed = new Set<string>();
  const latest = new Map<string, { value: string | null }>();
  const write = (k: string, v: string | null) => {
    const p = parse(k); if (!p) return;
    const desired = { value: v }; latest.set(k, desired);
    chain = chain.then(async () => {
      try {
        if (p.ns === "real" && gate?.isOpaque(k)) { failed.delete(k); monitor?.ok(k); if (latest.get(k) === desired) latest.delete(k); return; } // a sealed record we cannot open: its ciphertext is kept as it is
        if (v === null) await repo.delete(p.ns, p.id);
        else if (p.ns === "real" && gate?.active()) {
          // The ONLY place that seals. No key (locked or stale tab) or a crypto failure throws: the value stays in memory and in the save monitor, never written plain.
          const key = gate.key(); if (!key) throw new Error("vault locked");
          await repo.put(await encryptRecord(key, JSON.parse(v) as TMRecord));
        } else await repo.put(JSON.parse(v));
        failed.delete(k); monitor?.ok(k);
        if (latest.get(k) === desired) latest.delete(k);
      }
      catch { failed.add(k); monitor?.fail(k, latest.get(k)!.value); /* retry the current memory value, including a pending deletion */ }
    });
  };
  monitor?.bind(() => { for (const [k, v] of monitor.entries()) write(k, latest.has(k) ? latest.get(k)!.value : v); });
  return Object.assign(write, { async flush() {
    // Include writes added while we were awaiting the previous batch.
    let pending; do { pending = chain; await pending; } while (pending !== chain);
    if (failed.size) throw new Error("Could not save on this device");
  } });
}

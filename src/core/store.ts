// Namespaced store. Demo and real data live under different key prefixes and there is no promote path (TM-REQ-143).
import type { Namespace, TMRecord } from "./types";

export interface KV { get(k: string): string | null; set(k: string, v: string): void; remove(k: string): void; keys(): string[] }

export class MemoryKV implements KV {
  private m = new Map<string, string>();
  get(k: string) { return this.m.get(k) ?? null; }
  set(k: string, v: string) { this.m.set(k, v); }
  remove(k: string) { this.m.delete(k); }
  keys() { return [...this.m.keys()]; }
}

export class LocalKV implements KV {
  get(k: string) { try { return localStorage.getItem(k); } catch { return null; } }
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } }
  remove(k: string) { try { localStorage.removeItem(k); } catch { /* ignore */ } }
  keys() { try { return Object.keys(localStorage); } catch { return []; } }
}

/** Real personal data stays locked until the owner approves D-B / G7. */
export const REAL_DATA_ENABLED = false as boolean;

export class StoreError extends Error {}

class NsStore {
  constructor(private kv: KV, readonly ns: Namespace, private writable: () => boolean) {}
  private prefix() { return `tm:${this.ns}:`; }
  list(): TMRecord[] {
    return this.kv.keys().filter((k) => k.startsWith(this.prefix())).map((k) => JSON.parse(this.kv.get(k) ?? "null") as TMRecord).filter(Boolean);
  }
  get(id: string): TMRecord | null {
    const raw = this.kv.get(this.prefix() + id);
    return raw ? (JSON.parse(raw) as TMRecord) : null;
  }
  put(rec: TMRecord): void {
    if (!this.writable()) throw new StoreError(`namespace "${this.ns}" is locked`);
    if (rec.ns !== this.ns) throw new StoreError(`record ns "${rec.ns}" cannot be written to "${this.ns}"`);
    const hasDemo = Object.values(rec.values).some((v) => v.state === "value" && v.label === "DEMO");
    if (this.ns === "real" && hasDemo) throw new StoreError("DEMO-labelled values can never enter the real namespace");
    if (this.ns === "demo" && Object.values(rec.values).some((v) => v.state === "value" && v.label !== "DEMO")) throw new StoreError("demo namespace holds only DEMO-labelled values");
    this.kv.set(this.prefix() + rec.id, JSON.stringify(rec));
  }
  delete(id: string): void { this.kv.remove(this.prefix() + id); }
  clear(): void { for (const k of this.kv.keys()) if (k.startsWith(this.prefix())) this.kv.remove(k); }
}

export class Store {
  readonly demo: NsStore;
  readonly real: NsStore;
  constructor(kv: KV, opts: { realEnabled?: boolean } = {}) {
    this.demo = new NsStore(kv, "demo", () => true);
    this.real = new NsStore(kv, "real", () => opts.realEnabled ?? REAL_DATA_ENABLED);
  }
  // Intentionally no promote()/copy-to-real method exists.
}

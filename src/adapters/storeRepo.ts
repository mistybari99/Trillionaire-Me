import type { RecordRepo } from "../core/repo";
import type { Store } from "../core/store";
import type { Namespace } from "../core/types";

/** Bridges the G1 sync store to the async RecordRepo contract until the UI moves to IndexedDB. */
export class StoreRepo implements RecordRepo {
  constructor(private s: Store) {}
  async list(ns: Namespace) { return this.s[ns].list(); }
  async get(ns: Namespace, id: string) { return this.s[ns].get(id); }
  async put(r: Parameters<RecordRepo["put"]>[0]) { this.s[r.ns].put(r); }
  async delete(ns: Namespace, id: string) { this.s[ns].delete(id); }
  async clear(ns: Namespace) { this.s[ns].clear(); }
}

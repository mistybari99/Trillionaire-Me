// Loads the Dexie adapter in its own chunk, so the first screen does not wait for the database library to be parsed.
// Same RecordRepo contract: every method was already asynchronous, so callers see no difference except one extra tick on the first use.
import type { RecordRepo } from "../core/repo";
import type { Namespace, TMRecord } from "../core/types";
import type { Snapshot, SnapshotRepo } from "../core/snapshots";
import type { DexieRepo } from "./dexie";

export class LazyDexieRepo implements RecordRepo {
  private inner: Promise<DexieRepo>;
  constructor(name: string, realEnabled: boolean | (() => boolean) = false) {
    this.inner = import("./dexie").then((m) => new m.DexieRepo(name, realEnabled));
    this.inner.catch(() => { /* every call below reports the same failure to its caller */ });
  }
  async list(ns: Namespace) { return (await this.inner).list(ns); }
  async get(ns: Namespace, id: string) { return (await this.inner).get(ns, id); }
  async put(rec: TMRecord) { await (await this.inner).put(rec); }
  async delete(ns: Namespace, id: string) { await (await this.inner).delete(ns, id); }
  async clear(ns: Namespace) { await (await this.inner).clear(ns); }
  snapshots(): SnapshotRepo {
    const r = this.inner;
    return { list: async (): Promise<Snapshot[]> => (await r).snapshots().list(), put: async (x) => { await (await r).snapshots().put(x); }, delete: async (id) => { await (await r).snapshots().delete(id); } };
  }
}

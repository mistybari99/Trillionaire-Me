import Dexie, { type Table } from "dexie";
import type { RecordRepo } from "../core/repo";
import { guardWrite } from "../core/repo";
import type { Namespace, TMRecord } from "../core/types";
import type { Snapshot, SnapshotRepo } from "../core/snapshots";

class TMDb extends Dexie {
  records!: Table<TMRecord, [string, string]>;
  snapshots!: Table<Snapshot, string>;
  constructor(name: string) {
    super(name);
    this.version(1).stores({ records: "[ns+id], ns, entity" });
    // v2: local snapshots (automatic backups kept on this device). The records table is unchanged, so old data is untouched.
    this.version(2).stores({ records: "[ns+id], ns, entity", snapshots: "id, createdAt" });
  }
}

export class DexieRepo implements RecordRepo {
  private db: TMDb;
  /** realEnabled is checked on every write: real records need the store's gate (flag + consent). */
  constructor(name = "tm-db", private realEnabled: boolean | (() => boolean) = false) { this.db = new TMDb(name); }
  list(ns: Namespace) { return this.db.records.where("ns").equals(ns).toArray(); }
  async get(ns: Namespace, id: string) { return (await this.db.records.get([ns, id])) ?? null; }
  async put(rec: TMRecord) { guardWrite(rec, typeof this.realEnabled === "function" ? this.realEnabled() : this.realEnabled); await this.db.records.put(rec); }
  async delete(ns: Namespace, id: string) { await this.db.records.delete([ns, id]); }
  async clear(ns: Namespace) { await this.db.records.where("ns").equals(ns).delete(); }
  /** Snapshot store in the same IndexedDB (one connection, so there is no upgrade clash). */
  snapshots(): SnapshotRepo {
    const db = this.db;
    return { list: () => db.snapshots.toArray(), put: async (x) => { await db.snapshots.put(x); }, delete: async (id) => { await db.snapshots.delete(id); } };
  }
  close() { this.db.close(); }
}

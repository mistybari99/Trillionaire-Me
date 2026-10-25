import Dexie, { type Table } from "dexie";
import type { RecordRepo } from "../core/repo";
import { guardWrite } from "../core/repo";
import type { Namespace, TMRecord } from "../core/types";

class TMDb extends Dexie {
  records!: Table<TMRecord, [string, string]>;
  constructor(name: string) {
    super(name);
    this.version(1).stores({ records: "[ns+id], ns, entity" });
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
  close() { this.db.close(); }
}

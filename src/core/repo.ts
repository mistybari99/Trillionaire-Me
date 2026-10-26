// Pure async repository contract (no UI/network imports). Adapters implement it (IndexedDB in G2).
import type { Namespace, TMRecord } from "./types";

export interface RecordRepo {
  list(ns: Namespace): Promise<TMRecord[]>;
  get(ns: Namespace, id: string): Promise<TMRecord | null>;
  put(rec: TMRecord): Promise<void>;
  delete(ns: Namespace, id: string): Promise<void>;
  clear(ns: Namespace): Promise<void>;
}

/** Same isolation rules as the sync store (TM-REQ-143), enforced for every adapter. */
export function guardWrite(rec: TMRecord, realEnabled: boolean): void {
  if (rec.ns === "real" && !realEnabled) throw new Error('namespace "real" is locked');
  const vals = Object.values(rec.values).filter((v) => v.state === "value");
  if (rec.ns === "real" && vals.some((v) => v.state === "value" && v.label === "DEMO")) throw new Error("DEMO-labelled values can never enter the real namespace");
  if (rec.ns === "demo" && vals.some((v) => v.state === "value" && v.label !== "DEMO")) throw new Error("demo namespace holds only DEMO-labelled values");
}

// Record-schema migration (pure; no UI, no network). Every stored record carries `schemaVersion`. When the app's SCHEMA_VERSION goes up, a step
// for the old version must be added here, the test fingerprint (tests/fixtures/schema_fingerprint.json) updated, and a fixture of the old shape kept.
// Rules: a step never drops a value (unknown stays unknown); a record from a NEWER app is left untouched; if any step fails the original record is kept.
import { SCHEMA_VERSION } from "../schema/entities";
import type { KV } from "./store";
import type { RecordRepo } from "./repo";
import type { TMRecord } from "./types";

export type Step = (r: TMRecord) => TMRecord;
/** MIGRATIONS[n] upgrades a record from version n to n + 1. Version 0 means "no version written" (the oldest saved records). */
export const MIGRATIONS: Record<number, Step> = {
  0: (r) => ({ ...r, schemaVersion: 1 }),
};

export type MigrateStatus = "current" | "migrated" | "newer" | "failed";
export interface MigrateResult { rec: TMRecord; status: MigrateStatus }

const versionOf = (r: TMRecord): number => (Number.isInteger(r.schemaVersion) && (r.schemaVersion as number) >= 0 ? r.schemaVersion : 0);

export function migrateRecord(rec: TMRecord, target = SCHEMA_VERSION, steps: Record<number, Step> = MIGRATIONS): MigrateResult {
  let v = versionOf(rec);
  if (v === target) return { rec, status: "current" };
  if (v > target) return { rec, status: "newer" };
  let cur = rec;
  try {
    while (v < target) {
      const step = steps[v]; if (!step) return { rec, status: "failed" };
      const next = step(cur);
      if (next.id !== cur.id || next.ns !== cur.ns || next.entity !== cur.entity) return { rec, status: "failed" }; // a step may never move a record or change its namespace
      cur = { ...next, schemaVersion: v + 1 }; v++;
    }
  } catch { return { rec, status: "failed" }; }
  return { rec: cur, status: "migrated" };
}

export interface MigrateReport { current: number; migrated: number; newer: number; failed: number; blocked: boolean }

/**
 * Migrates every stored record in memory and in the repo. `beforeMigrate` runs once, only if something needs migrating, and must save a copy
 * (a snapshot). If it throws, nothing is changed (`blocked`), and the old records stay readable as they are.
 */
export async function migrateAll(mem: KV, repo: RecordRepo | null, beforeMigrate: (count: number) => Promise<void>, target = SCHEMA_VERSION, steps: Record<number, Step> = MIGRATIONS): Promise<MigrateReport> {
  const rep: MigrateReport = { current: 0, migrated: 0, newer: 0, failed: 0, blocked: false };
  const todo: Array<[string, TMRecord]> = [];
  for (const k of mem.keys()) {
    if (!/^tm:(demo|real):/.test(k)) continue;
    let rec: TMRecord; try { rec = JSON.parse(mem.get(k) ?? "null") as TMRecord; } catch { continue; }
    if (!rec) continue;
    const r = migrateRecord(rec, target, steps);
    if (r.status === "migrated") todo.push([k, r.rec]); else rep[r.status]++;
  }
  if (!todo.length) return rep;
  try { await beforeMigrate(todo.length); } catch { rep.blocked = true; return rep; }
  for (const [k, rec] of todo) { mem.set(k, JSON.stringify(rec)); try { await repo?.put(rec); rep.migrated++; } catch { rep.failed++; } }
  return rep;
}

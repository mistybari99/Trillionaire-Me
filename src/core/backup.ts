// Backup / restore (TM-REQ M20, G2). Versioned JSON with a checksum; restore is all-or-nothing and namespace-safe.
import type { RecordRepo } from "./repo";
import { guardWrite } from "./repo";
import type { Namespace, TMRecord } from "./types";
import { SCHEMA_VERSION } from "../schema/entities";
import { redact } from "./safety";

export interface BackupFile { app: "trillionaire-me"; schemaVersion: number; ns: Namespace; createdAt: string; count: number; checksum: string; records: TMRecord[] }

/** FNV-1a 32-bit: detects corruption/truncation, not tampering (not a security feature). */
export function checksum(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}

export async function createBackup(repo: RecordRepo, ns: Namespace, now = new Date()): Promise<BackupFile> {
  const records = (await repo.list(ns)).sort((a, b) => a.id.localeCompare(b.id));
  return { app: "trillionaire-me", schemaVersion: SCHEMA_VERSION, ns, createdAt: now.toISOString(), count: records.length, checksum: checksum(JSON.stringify(records)), records };
}

export class BackupError extends Error {}

export function parseBackup(text: string): BackupFile {
  let b: BackupFile;
  try { b = JSON.parse(text) as BackupFile; } catch { throw new BackupError("not valid JSON"); }
  if (b.app !== "trillionaire-me" || !Array.isArray(b.records)) throw new BackupError("not a Trillionaire Me backup");
  if (b.schemaVersion > SCHEMA_VERSION) throw new BackupError("backup is from a newer app version");
  if (b.count !== b.records.length || b.checksum !== checksum(JSON.stringify(b.records))) throw new BackupError("backup is damaged (checksum mismatch)");
  for (const r of b.records) if (r.ns !== b.ns) throw new BackupError("record namespace does not match backup namespace");
  return b;
}

/** Replace the namespace contents with the backup. Validates everything first, so a bad file changes nothing. */
export async function restoreBackup(repo: RecordRepo, text: string, realEnabled = false): Promise<number> {
  const b = parseBackup(text);
  for (const r of b.records) { try { guardWrite(r, realEnabled); } catch (e) { throw new BackupError((e as Error).message); } }
  await repo.clear(b.ns);
  for (const r of b.records) await repo.put(r);
  return b.records.length;
}

/** Human-readable-safe summary for logs: never include values. */
export const describeBackup = (b: BackupFile) => redact(`${b.ns} backup, ${b.count} records, ${b.createdAt}`);

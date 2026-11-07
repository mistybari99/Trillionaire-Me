// Backup / restore (TM-REQ M20, G2). Versioned JSON with checksum, namespace checks and verified compensation on write failure.
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

/** A failed write was rolled back only when every original record could be verified. */
export class ReplacementError extends BackupError {
  constructor(readonly unchanged: boolean) {
    super(unchanged ? "the write failed; nothing was changed" : "the write failed; the original entries could not all be recovered");
  }
}

export interface NamespaceReplacement { ns: Namespace; records: TMRecord[] }

/** Replace all parts as one recovery operation, including the part whose write fails. */
export async function replaceNamespaces(repo: RecordRepo, parts: NamespaceReplacement[]): Promise<void> {
  if (new Set(parts.map((p) => p.ns)).size !== parts.length) throw new BackupError("duplicate backup namespace");
  for (const p of parts) if (p.records.some((r) => r.ns !== p.ns)) throw new BackupError("record namespace does not match backup namespace");
  const before: NamespaceReplacement[] = [];
  for (const p of parts) before.push({ ns: p.ns, records: await repo.list(p.ns) });
  const replace = async (p: NamespaceReplacement) => {
    const old = await repo.list(p.ns); const nextIds = new Set(p.records.map((r) => r.id));
    for (const r of p.records) await repo.put(r);
    for (const r of old) if (!nextIds.has(r.id)) await repo.delete(p.ns, r.id);
  };
  try { for (const p of parts) await replace(p); }
  catch {
    let recovered = true;
    // Continue after each failed compensation: one full disk must not prevent other parts recovering.
    for (const p of before) {
      for (const r of p.records) { try { await repo.put(r); } catch { recovered = false; } }
      try {
        const oldIds = new Set(p.records.map((r) => r.id));
        for (const r of await repo.list(p.ns)) if (!oldIds.has(r.id)) {
          try { await repo.delete(p.ns, r.id); } catch { recovered = false; }
        }
        const canonical = (rs: TMRecord[]) => JSON.stringify([...rs].sort((a, b) => a.id.localeCompare(b.id)));
        if (canonical(await repo.list(p.ns)) !== canonical(p.records)) recovered = false;
      } catch { recovered = false; }
    }
    throw new ReplacementError(recovered);
  }
}

export function parseBackup(text: string): BackupFile {
  let b: BackupFile;
  try { b = JSON.parse(text) as BackupFile; } catch { throw new BackupError("not valid JSON"); }
  if (b.app !== "trillionaire-me" || !Array.isArray(b.records)) throw new BackupError("not a Trillionaire Me backup");
  if (b.schemaVersion > SCHEMA_VERSION) throw new BackupError("backup is from a newer app version");
  if (b.count !== b.records.length || b.checksum !== checksum(JSON.stringify(b.records))) throw new BackupError("backup is damaged (checksum mismatch)");
  for (const r of b.records) if (r.ns !== b.ns) throw new BackupError("record namespace does not match backup namespace");
  return b;
}

/**
 * Replaces the records of one namespace without ever emptying it first: the new records are written over the old ones, then the
 * old records that are not in the new set are removed. A failed write triggers compensation and verification;
 * ReplacementError.unchanged is false if storage also prevents recovery.
 */
export async function replaceNamespace(repo: RecordRepo, ns: Namespace, next: TMRecord[]): Promise<void> {
  await replaceNamespaces(repo, [{ ns, records: next }]);
}

/** Replace the namespace contents with the backup. Validates everything first, so a bad file changes nothing; a failed write is rolled back. */
export async function restoreBackup(repo: RecordRepo, text: string, realEnabled = false): Promise<number> {
  const b = parseBackup(text);
  for (const r of b.records) { try { guardWrite(r, realEnabled); } catch (e) { throw new BackupError((e as Error).message); } }
  await replaceNamespace(repo, b.ns, b.records);
  return b.records.length;
}

/** Human-readable-safe summary for logs: never include values. */
export const describeBackup = (b: BackupFile) => redact(`${b.ns} backup, ${b.count} records, ${b.createdAt}`);

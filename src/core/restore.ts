// Safe restore (settings redesign PR 1). Pure: no UI, no network.
// Flow: planRestore (preview numbers, nothing changes) -> restoreBackupAtomic (check everything, save a "Before restore" copy,
// replace without ever emptying the store, roll back on any failure) -> goBack (put the "Before restore" copy back, 7 days).
import { BackupError, createBackup, parseBackup, replaceNamespaces, ReplacementError, type BackupFile } from "./backup";
import { guardWrite, type RecordRepo } from "./repo";
import type { Namespace } from "./types";
import { type Snapshot, type SnapshotRepo } from "./snapshots";

/** What a file (or snapshot, or encrypted backup) holds. Each part is one namespace; a part is replaced as a whole. */
export interface RestoreSource { demo: BackupFile | null; real: BackupFile | null; createdAt: string }

/** The file holds real data but the real-data tick is off: nothing is written; the caller shows the gate. */
export class RealPermissionError extends BackupError {}
export class MissingRecoveryCopyError extends BackupError {}
export class RestoreRecoveryError extends BackupError {
  constructor(readonly snapshotId: string, readonly unchanged: boolean) {
    super(unchanged ? "the write failed; nothing was changed" : "restore could not finish; use the saved recovery copy");
  }
}

export interface PlanPart { ns: Namespace; /** entries in the file */ file: number; /** entries on this phone now */ now: number }
export interface RestorePlan { parts: PlanPart[]; fileTotal: number; nowTotal: number; realBlocked: boolean; createdAt: string }

const partsOf = (src: RestoreSource): BackupFile[] => [src.demo, src.real].filter((p): p is BackupFile => !!p);

/** Re-checks every part (checksum, version, namespace, write guards) and counts. Changes nothing. Throws BackupError for a bad file. */
export async function planRestore(repo: RecordRepo, src: RestoreSource, realOk: boolean): Promise<RestorePlan> {
  const parts: PlanPart[] = [];
  for (const [expected, p] of [["demo", src.demo], ["real", src.real]] as const) {
    if (!p) continue;
    const b = parseBackup(JSON.stringify(p));
    if (b.ns !== expected) throw new BackupError("snapshot part is in the wrong place");
    for (const r of b.records) { try { guardWrite(r, b.ns === "real"); } catch (e) { throw new BackupError((e as Error).message); } }
    parts.push({ ns: b.ns, file: b.count, now: (await repo.list(b.ns)).length });
  }
  if (!parts.length) throw new BackupError("the file holds no entries");
  return { parts, fileTotal: parts.reduce((n, p) => n + p.file, 0), nowTotal: parts.reduce((n, p) => n + p.now, 0), realBlocked: !!src.real && !realOk, createdAt: src.createdAt };
}

export interface RestoreDone { demo: number; real: number; /** id of the "Before restore" copy (Go back) */ snapshotId: string }

/**
 * Replaces the namespaces named in the source. Order: validate everything, refuse real data without the tick, save a "Before restore"
 * copy of what is on the phone now (if that cannot be saved, nothing is changed), then replace part by part. If any part fails,
 * all parts are compensated, including the one that failed. Uncertain recovery keeps the snapshot reachable
 * and never claims the data is unchanged.
 */
export async function restoreBackupAtomic(repo: RecordRepo, snaps: SnapshotRepo, src: RestoreSource, realOk: boolean, now = new Date()): Promise<RestoreDone> {
  const plan = await planRestore(repo, src, realOk);
  if (plan.realBlocked) throw new RealPermissionError("the file holds real data and the real-data permission is off");
  const before = await buildBefore(repo, realOk, now);
  try { await snaps.put(before); } catch { throw new BackupError("a copy of your current data could not be saved first; nothing was changed"); }
  try {
    await replaceNamespaces(repo, partsOf(src).map((p) => ({ ns: p.ns, records: p.records })));
  } catch (e) {
    throw new RestoreRecoveryError(before.id, e instanceof ReplacementError && e.unchanged);
  }
  return { demo: src.demo?.count ?? 0, real: src.real?.count ?? 0, snapshotId: before.id };
}

// The real part is kept even when empty (while the tick is on), so Go back also empties real entries that a restore added.
async function buildBefore(repo: RecordRepo, realOk: boolean, now: Date): Promise<Snapshot> {
  const demo = await createBackup(repo, "demo", now);
  const realFull = realOk ? await createBackup(repo, "real", now) : null;
  return { id: `snap-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, createdAt: now.toISOString(), reason: "before_restore", demo, real: realFull };
}

/** Puts the "Before restore" copy back. Allowed for 7 days (the copy is removed after that). Returns counts, or throws when the copy is gone. */
export async function goBack(repo: RecordRepo, snaps: SnapshotRepo, snapshotId: string, realOk: boolean): Promise<{ demo: number; real: number }> {
  const s = (await snaps.list()).find((x) => x.id === snapshotId && x.reason === "before_restore");
  if (!s) throw new MissingRecoveryCopyError("the saved copy is no longer there");
  // Save today's state first too; a later real-part failure must undo the demo replacement.
  const r = await restoreBackupAtomic(repo, snaps, s, realOk);
  return { demo: r.demo, real: r.real };
}

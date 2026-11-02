// Safe restore (settings redesign PR 1). Pure: no UI, no network.
// Flow: planRestore (preview numbers, nothing changes) -> restoreBackupAtomic (check everything, save a "Before restore" copy,
// replace without ever emptying the store, roll back on any failure) -> goBack (put the "Before restore" copy back, 7 days).
import { BackupError, createBackup, parseBackup, replaceNamespace, type BackupFile } from "./backup";
import { guardWrite, type RecordRepo } from "./repo";
import type { Namespace } from "./types";
import { restoreSnapshot, type Snapshot, type SnapshotRepo } from "./snapshots";

/** What a file (or snapshot, or encrypted backup) holds. Each part is one namespace; a part is replaced as a whole. */
export interface RestoreSource { demo: BackupFile | null; real: BackupFile | null; createdAt: string }

/** The file holds real data but the real-data tick is off: nothing is written; the caller shows the gate. */
export class RealPermissionError extends BackupError {}

export interface PlanPart { ns: Namespace; /** entries in the file */ file: number; /** entries on this phone now */ now: number }
export interface RestorePlan { parts: PlanPart[]; fileTotal: number; nowTotal: number; realBlocked: boolean; createdAt: string }

const partsOf = (src: RestoreSource): BackupFile[] => [src.demo, src.real].filter((p): p is BackupFile => !!p);

/** Re-checks every part (checksum, version, namespace, write guards) and counts. Changes nothing. Throws BackupError for a bad file. */
export async function planRestore(repo: RecordRepo, src: RestoreSource, realOk: boolean): Promise<RestorePlan> {
  const parts: PlanPart[] = [];
  for (const p of partsOf(src)) {
    const b = parseBackup(JSON.stringify(p));
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
 * every part already replaced is put back from that copy and the error says nothing was changed.
 */
export async function restoreBackupAtomic(repo: RecordRepo, snaps: SnapshotRepo, src: RestoreSource, realOk: boolean, now = new Date()): Promise<RestoreDone> {
  const plan = await planRestore(repo, src, realOk);
  if (plan.realBlocked) throw new RealPermissionError("the file holds real data and the real-data permission is off");
  const before = await buildBefore(repo, realOk, now);
  try { await snaps.put(before); } catch { throw new BackupError("a copy of your current data could not be saved first; nothing was changed"); }
  const done: Namespace[] = [];
  try {
    for (const p of partsOf(src)) { await replaceNamespace(repo, p.ns, p.records); done.push(p.ns); }
  } catch (e) {
    for (const ns of done) { try { await replaceNamespace(repo, ns, (ns === "demo" ? before.demo : before.real)?.records ?? []); } catch { /* the Before restore copy is still saved */ } }
    throw new BackupError(`${(e as Error).message || "write failed"}; nothing was changed`);
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
  if (!s) throw new BackupError("the saved copy is no longer there");
  const r = await restoreSnapshot(repo, s, realOk);
  return { demo: r.demo, real: r.real };
}

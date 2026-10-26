// Local snapshots (pure, no UI, no network). A snapshot is a copy of the user's records kept in IndexedDB on this device.
// Same rules as the encrypted backup: only records are copied (never keys, secrets or settings), demo and real stay in their own parts,
// the real part is included only while the real-data tick is given, and a restore checks every record before it changes anything.
import { BackupError, createBackup, parseBackup, restoreBackup, type BackupFile } from "./backup";
import { guardWrite, type RecordRepo } from "./repo";

export type SnapshotReason = "auto" | "manual" | "before_restore";
export interface Snapshot { id: string; createdAt: string; reason: SnapshotReason; demo: BackupFile; real: BackupFile | null }
export interface SnapshotRepo { list(): Promise<Snapshot[]>; put(s: Snapshot): Promise<void>; delete(id: string): Promise<void> }

export const KEEP_CHOICES = [3, 5, 10] as const;
export const DEFAULT_KEEP = 5;
export const isKeep = (n: unknown): n is (typeof KEEP_CHOICES)[number] => (KEEP_CHOICES as readonly unknown[]).includes(n);
/** The automatic snapshot waits at least this many hours after the newest one. */
export const AUTO_MIN_HOURS = 20;

export class MemorySnapshotRepo implements SnapshotRepo {
  private m = new Map<string, Snapshot>();
  async list() { return [...this.m.values()]; }
  async put(s: Snapshot) { this.m.set(s.id, s); }
  async delete(id: string) { this.m.delete(id); }
}

/** Newest first. */
export const newestFirst = (l: Snapshot[]): Snapshot[] => [...l].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : b.id.localeCompare(a.id)));

/** Automatic snapshot is due when none exists or the newest is older than AUTO_MIN_HOURS. */
export function autoDue(list: Snapshot[], now: Date, minHours = AUTO_MIN_HOURS): boolean {
  const last = newestFirst(list)[0]; if (!last) return true;
  const t = Date.parse(last.createdAt); return !Number.isFinite(t) || now.getTime() - t >= minHours * 3600_000;
}

const sameContent = (a: Snapshot, demo: BackupFile, real: BackupFile | null) => a.demo.checksum === demo.checksum && (a.real?.checksum ?? null) === (real?.checksum ?? null);

/** Keeps the newest `keep` snapshots and deletes the rest. Returns how many were deleted. */
export async function pruneSnapshots(snaps: SnapshotRepo, keep: number): Promise<number> {
  const k = Number.isInteger(keep) && keep >= 1 ? keep : DEFAULT_KEEP; const old = newestFirst(await snaps.list()).slice(k);
  for (const s of old) await snaps.delete(s.id);
  return old.length;
}

export interface TakeOptions { reason: SnapshotReason; keep: number; /** the real-data tick is given now */ realOk: boolean; now?: Date }
/**
 * Copies the records into a new snapshot and prunes old ones. Returns null when there is nothing to save, or when an automatic
 * snapshot would be identical to the newest one. A manual snapshot is always kept.
 */
export async function takeSnapshot(records: RecordRepo, snaps: SnapshotRepo, o: TakeOptions): Promise<Snapshot | null> {
  const now = o.now ?? new Date();
  const demo = await createBackup(records, "demo", now);
  const realFull = o.realOk ? await createBackup(records, "real", now) : null;
  const real = realFull && realFull.count ? realFull : null;
  if (!demo.count && !real) return null;
  const latest = newestFirst(await snaps.list())[0];
  if (o.reason === "auto" && latest && sameContent(latest, demo, real)) return null;
  const snap: Snapshot = { id: `snap-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, createdAt: now.toISOString(), reason: o.reason, demo, real };
  await snaps.put(snap); await pruneSnapshots(snaps, o.keep);
  return snap;
}

export interface RestoreResult { demo: number; real: number; /** the snapshot has a real part but the tick is off now, so it was left out */ realSkipped: boolean }
/**
 * Replaces the current records of each kind with the snapshot's. Everything is checked first (checksums, namespaces, the same write
 * guards as a normal save), so a damaged snapshot changes nothing. The real part is restored only while the tick is given.
 */
export async function restoreSnapshot(records: RecordRepo, snap: Snapshot, realOk: boolean): Promise<RestoreResult> {
  const demo = parseBackup(JSON.stringify(snap.demo)); if (demo.ns !== "demo") throw new BackupError("snapshot part is in the wrong place");
  const useReal = !!snap.real && realOk;
  const real = useReal ? parseBackup(JSON.stringify(snap.real)) : null; if (real && real.ns !== "real") throw new BackupError("snapshot part is in the wrong place");
  for (const r of demo.records) guardWrite(r, false);
  if (real) for (const r of real.records) guardWrite(r, true);
  const d = await restoreBackup(records, JSON.stringify(demo), false);
  const r = real ? await restoreBackup(records, JSON.stringify(real), true) : 0;
  return { demo: d, real: r, realSkipped: !!snap.real && !realOk };
}

/** After the user deletes their real data: no snapshot may keep a copy of it. Returns how many snapshots changed. */
export async function scrubRealParts(snaps: SnapshotRepo): Promise<number> {
  let n = 0;
  for (const s of await snaps.list()) if (s.real) { await snaps.put({ ...s, real: null }); n++; }
  return n;
}

// ---- save to file / open from file ----
export interface SnapshotFile { app: "trillionaire-me"; kind: "snapshot-file"; v: 1; createdAt: string; demo: BackupFile; real: BackupFile | null }
/** A plain (not locked) file with the same two parts as a snapshot. The caller shows the "keep it private" note. */
export const snapshotToFile = (s: Snapshot): SnapshotFile => ({ app: "trillionaire-me", kind: "snapshot-file", v: 1, createdAt: s.createdAt, demo: s.demo, real: s.real });
export function parseSnapshotFile(text: string): Snapshot {
  let o: Partial<SnapshotFile>;
  try { o = JSON.parse(text) as Partial<SnapshotFile>; } catch { throw new BackupError("not valid JSON"); }
  if (!o || o.app !== "trillionaire-me" || o.kind !== "snapshot-file" || o.v !== 1 || !o.demo) throw new BackupError("not a snapshot file");
  const demo = parseBackup(JSON.stringify(o.demo)); const real = o.real ? parseBackup(JSON.stringify(o.real)) : null;
  if (demo.ns !== "demo" || (real && real.ns !== "real")) throw new BackupError("snapshot part is in the wrong place");
  return { id: "file", createdAt: typeof o.createdAt === "string" ? o.createdAt : demo.createdAt, reason: "manual", demo, real };
}

// ---- reminder (in-app only, off by default) ----
export const REMIND_DAYS = 7;
/** Due when the reminder is on, there is data, and no backup file was saved in the last REMIND_DAYS days (or ever). `snoozedOn` is a YYYY-MM-DD day. */
export function reminderDue(on: boolean, hasData: boolean, lastFileIso: string | null, now: Date, snoozedOn: string | null = null, days = REMIND_DAYS): boolean {
  if (!on || !hasData) return false;
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (snoozedOn === day) return false;
  const t = lastFileIso ? Date.parse(lastFileIso) : NaN;
  return !Number.isFinite(t) || now.getTime() - t >= days * 86400_000;
}

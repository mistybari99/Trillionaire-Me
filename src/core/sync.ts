// Offline op-queue + conflict rules (G2). Pure: no storage, no network. A future server (G6+, needs owner approval) only replays these ops.
import type { FieldValue, Namespace, TMRecord } from "./types";
import { guardWrite } from "./repo";

export interface SetFieldOp { opId: string; ns: Namespace; recordId: string; entity: string; fieldId: string; value: FieldValue; ts: number; device: string }
export interface Conflict { recordId: string; fieldId: string; kept: FieldValue; dropped: FieldValue; keptOpId: string; droppedOpId: string }

export interface SyncState {
  records: Record<string, TMRecord>;      // key: `${ns}:${recordId}`
  applied: Record<string, true>;          // opIds already applied → idempotent replay
  stamp: Record<string, { ts: number; device: string; opId: string }>; // per field winner
  conflicts: Conflict[];
}
export const emptyState = (): SyncState => ({ records: {}, applied: {}, stamp: {}, conflicts: [] });

const order = (a: { ts: number; device: string; opId: string }) => `${String(a.ts).padStart(15, "0")}|${a.device}|${a.opId}`;
const same = (a: FieldValue, b: FieldValue) => JSON.stringify(a) === JSON.stringify(b);

/** Apply one op. Duplicate opIds are ignored. Field winner = highest (ts, device, opId): deterministic, so ops commute and replay order never matters. */
export function applyOp(s: SyncState, op: SetFieldOp, realEnabled = false): SyncState {
  if (s.applied[op.opId]) return s;
  const key = `${op.ns}:${op.recordId}`;
  const prev = s.records[key] ?? { id: op.recordId, entity: op.entity, ns: op.ns, ownerId: "local", schemaVersion: 1, createdAt: new Date(op.ts).toISOString(), values: {} };
  const fk = `${key}#${op.fieldId}`;
  const cur = s.stamp[fk];
  const incoming = { ts: op.ts, device: op.device, opId: op.opId };
  const wins = !cur || order(incoming) > order(cur);
  const created = new Date(Math.min(Date.parse(prev.createdAt), op.ts)).toISOString(); // earliest op → order-independent
  const next: TMRecord = { ...prev, createdAt: created, values: wins ? { ...prev.values, [op.fieldId]: op.value } : prev.values };
  guardWrite(next, realEnabled); // demo↔real isolation holds in sync too
  const conflicts = [...s.conflicts];
  const had = prev.values[op.fieldId];
  if (cur && had && !same(had, op.value) && cur.device !== op.device) {
    // different devices disagree: nothing is lost silently — the loser is recorded
    conflicts.push(wins
      ? { recordId: op.recordId, fieldId: op.fieldId, kept: op.value, dropped: had, keptOpId: op.opId, droppedOpId: cur.opId }
      : { recordId: op.recordId, fieldId: op.fieldId, kept: had, dropped: op.value, keptOpId: cur.opId, droppedOpId: op.opId });
  }
  return { records: { ...s.records, [key]: next }, applied: { ...s.applied, [op.opId]: true }, stamp: wins ? { ...s.stamp, [fk]: incoming } : s.stamp, conflicts };
}

export const applyAll = (s: SyncState, ops: readonly SetFieldOp[], realEnabled = false) => ops.reduce((st, o) => applyOp(st, o, realEnabled), s);

/** Local outbox: ops stay queued until acknowledged; an interrupted flush loses nothing and replays safely. */
export class Outbox {
  private q: SetFieldOp[] = [];
  enqueue(op: SetFieldOp) { if (!this.q.some((x) => x.opId === op.opId)) this.q.push(op); }
  pending(): readonly SetFieldOp[] { return this.q; }
  ack(opIds: string[]) { const s = new Set(opIds); this.q = this.q.filter((o) => !s.has(o.opId)); }
  toJSON() { return JSON.stringify(this.q); }
  static from(json: string) { const o = new Outbox(); for (const x of JSON.parse(json) as SetFieldOp[]) o.enqueue(x); return o; }
}

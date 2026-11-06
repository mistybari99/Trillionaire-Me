// One durable, consent-checked command shared by every prayer mark surface.
import { dhakaNow, isoDate, PRAYER_KEYS, type PrayerKey } from '../core/prayer';
import { prayerLogId, prayerLogRecord } from '../core/prayerLog';
import type { Namespace } from '../core/types';
import { readConsent } from '../core/consent';
import { activeNs, inNs } from './entry';
import { consentKv, flushStorage, retryStorage, store } from './state';
import { isLocked } from './lockUi';

export interface PrayerMarkInput { namespace: Namespace; date: string; prayer: PrayerKey; desiredMarked: boolean }
export interface PrayerMarkState { status: 'idle' | 'pending' | 'saved' | 'blocked' | 'error'; marked: boolean; desiredMarked?: boolean; reason?: 'context' | 'consent' | 'locked' | 'storage' }
const states = new Map<string, PrayerMarkState>();
const pending = new Map<string, Promise<PrayerMarkState>>();
const listeners = new Set<() => void>();
const key = (x: Pick<PrayerMarkInput, 'namespace' | 'date' | 'prayer'>) => `${x.namespace}:${x.date}:${x.prayer}`;
export const prayerDate = () => isoDate(dhakaNow(Date.now()).date);
export function prayerMarkState(x: Pick<PrayerMarkInput, 'namespace' | 'date' | 'prayer'>): PrayerMarkState {
  const state = states.get(key(x));
  const marked = !!store[x.namespace].get(prayerLogId(x.date, x.prayer));
  return state && (state.status === 'pending' || state.status === 'error') ? state : { ...state, status: state?.status ?? 'idle', marked };
}
export function subscribePrayerMarks(fn: () => void): () => void { listeners.add(fn); return () => { listeners.delete(fn); }; }
const publish = (id: string, state: PrayerMarkState) => { states.set(id, state); for (const fn of [...listeners]) fn(); return state; };
function blocked(x: PrayerMarkInput): PrayerMarkState['reason'] | null {
  if (x.namespace !== activeNs() || x.date !== prayerDate() || !PRAYER_KEYS.includes(x.prayer)) return 'context';
  if (isLocked()) return 'locked';
  if (x.namespace === 'real' && !readConsent(consentKv)) return 'consent';
  return null;
}
export function setPrayerMarked(input: PrayerMarkInput): Promise<PrayerMarkState> {
  const id = key(input), current = prayerMarkState(input), reason = blocked(input);
  if (reason) return Promise.resolve(publish(id, { ...current, status: 'blocked', reason }));
  const existing = pending.get(id); if (existing) return current.desiredMarked === input.desiredMarked ? existing : existing.then(() => setPrayerMarked(input));
  publish(id, { ...current, status: 'pending', desiredMarked: input.desiredMarked, reason: undefined });
  const work = Promise.resolve().then(async (): Promise<PrayerMarkState> => {
    // Recheck after entering the queue, before either a PUT or DELETE.
    const reason = blocked(input);
    if (reason) return publish(id, { ...current, status: 'blocked', reason });
    try {
      const recordId = prayerLogId(input.date, input.prayer);
      if (input.desiredMarked) {
        if (!store[input.namespace].get(recordId)) store[input.namespace].put(inNs(prayerLogRecord(input.date, input.prayer, new Date().toISOString()), input.namespace));
      } else if (store[input.namespace].get(recordId)) store[input.namespace].delete(recordId);
      // A previous attempt may already have changed memory. Retry its latest durable write too.
      if (current.status === 'error') await retryStorage(); else await flushStorage();
      return publish(id, { status: 'saved', marked: input.desiredMarked });
    } catch {
      return publish(id, { status: 'error', marked: current.marked, desiredMarked: input.desiredMarked, reason: 'storage' });
    }
  }).finally(() => { pending.delete(id); });
  pending.set(id, work); return work;
}

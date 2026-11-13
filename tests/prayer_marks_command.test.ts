import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DexieRepo } from '../src/adapters/dexie';
import { grantConsent, revokeConsent } from '../src/core/consent';
import { prayerLogId, prayerLogRecord } from '../src/core/prayerLog';
import { setPin } from '../src/core/appLock';
import { inNs } from '../src/ui/entry';
import { lockNow } from '../src/ui/lockUi';
import { prayerDate, prayerMarkState, setPrayerMarked } from '../src/ui/prayerMarkCommand';
import { prayerControls } from '../src/ui/prayerMarksUi';
import { deenPlansScreen } from '../src/ui/deenPlansUi';
import { consentKv, flushStorage, prefs, retryStorage, saveMonitor, store } from '../src/ui/state';
import * as prayerSync from '../src/ui/prayerSync';
import type { TMRecord } from '../src/core/types';

const disk = new DexieRepo('tm-db');
const input = (desiredMarked: boolean) => ({ namespace: 'demo' as const, date: prayerDate(), prayer: 'fajr' as const, desiredMarked });
const button = (el: Element, prayer = 'fajr') => el.querySelector(`[data-prayer="${prayer}"]`) as HTMLButtonElement;
const saved = async (el: Element) => vi.waitFor(() => expect(button(el).getAttribute('aria-busy')).toBe('false'));
beforeEach(async () => {
  vi.restoreAllMocks(); localStorage.clear();
  await retryStorage(); store.demo.clear(); store.real.clear(); await flushStorage();
  prefs.dataMode = 'demo'; prefs.lang = 'en';
  document.body.innerHTML = '<div id="app"></div>';
});
afterEach(async () => { vi.restoreAllMocks(); await retryStorage(); document.body.replaceChildren(); });

describe('durable shared prayer marks', () => {
  it('keeps both surfaces pending until durable success, blocks rapid taps and preserves focus and drafts', async () => {
    const full = prayerControls('en', 'full'), quick = prayerControls('en');
    const draft = document.createElement('input'); draft.value = 'unfinished note';
    document.body.append(full, quick, draft);
    let release!: () => void; const gate = new Promise<void>((r) => { release = r; });
    const original = DexieRepo.prototype.put;
    const writes = vi.spyOn(DexieRepo.prototype, 'put').mockImplementation(async function (this: DexieRepo, record) { await gate; await original.call(this, record); });
    const mark = button(full); mark.focus(); mark.click(); mark.click(); button(quick).click();
    try {
      expect(mark.disabled).toBe(true); expect(button(quick).disabled).toBe(true);
      expect(mark.getAttribute('aria-pressed')).toBe('false');
      expect(await disk.get('demo', prayerLogId(prayerDate(), 'fajr'))).toBeNull();
      expect(document.activeElement).toBe(mark); expect(draft.value).toBe('unfinished note');
    } finally { release(); }
    await saved(full);
    expect(writes).toHaveBeenCalledTimes(1);
    expect(button(quick).getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(mark); expect(draft.value).toBe('unfinished note');
    expect(mark.getAttribute('aria-label')).toMatch(/Fajr.*undo/i);
  });
  it('exposes local retry after rejection and confirms mark and undo only after persistence', async () => {
    const full = prayerControls('en', 'full'); document.body.append(full);
    const original = DexieRepo.prototype.put; let broken = true;
    vi.spyOn(DexieRepo.prototype, 'put').mockImplementation(async function (this: DexieRepo, record) { if (broken) throw new Error('quota'); await original.call(this, record); });
    button(full).click(); await saved(full);
    expect(button(full).textContent).toBe('Retry'); expect(button(full).getAttribute('aria-pressed')).toBe('mixed');
    expect(full.textContent).toContain('Could not confirm saving'); expect(saveMonitor.hasFailure).toBe(true);
    broken = false; button(full).click(); await saved(full);
    expect(button(full).getAttribute('aria-pressed')).toBe('true'); expect(saveMonitor.hasFailure).toBe(false);
    expect((await disk.list('demo')).filter((r) => r.entity === 'prayer_log')).toHaveLength(1);
    button(full).click(); await saved(full);
    expect(button(full).getAttribute('aria-pressed')).toBe('false');
    expect(await disk.get('demo', prayerLogId(prayerDate(), 'fajr'))).toBeNull();
  });
  it('is idempotent for repeated desired values and serializes an explicit undo behind the pending mark', async () => {
    let release!: () => void; const gate = new Promise<void>((r) => { release = r; });
    const original = DexieRepo.prototype.put;
    vi.spyOn(DexieRepo.prototype, 'put').mockImplementation(async function (this: DexieRepo, record) { await gate; await original.call(this, record); });
    const first = setPrayerMarked(input(true)), duplicate = setPrayerMarked(input(true));
    expect(first).toBe(duplicate);
    const undo = setPrayerMarked(input(false)); release();
    expect((await first).status).toBe('saved'); expect((await undo).marked).toBe(false);
    expect(await disk.get('demo', prayerLogId(prayerDate(), 'fajr'))).toBeNull();
    await setPrayerMarked(input(false));
    expect(store.demo.get(prayerLogId(prayerDate(), 'fajr'))).toBeNull();
  });
  it('refuses both real PUT and real DELETE after consent is withdrawn', async () => {
    grantConsent(consentKv, new Date().toISOString()); prefs.dataMode = 'real';
    store.real.put(inNs(prayerLogRecord(prayerDate(), 'fajr', new Date().toISOString()), 'real')); await flushStorage();
    revokeConsent(consentKv);
    const remove = await setPrayerMarked({ ...input(false), namespace: 'real' });
    const put = await setPrayerMarked({ ...input(true), namespace: 'real', prayer: 'isha' });
    expect(remove).toMatchObject({ status: 'blocked', reason: 'consent' }); expect(put.status).toBe('blocked');
    expect(store.real.get(prayerLogId(prayerDate(), 'fajr'))).not.toBeNull();
    expect(store.real.get(prayerLogId(prayerDate(), 'isha'))).toBeNull();
    expect(store.demo.list()).toHaveLength(0);
  });
  it('refuses stale namespace commands and refreshes a mounted control before a new tap', async () => {
    const full = prayerControls('en'); document.body.append(full);
    grantConsent(consentKv, new Date().toISOString()); prefs.dataMode = 'real';
    expect((await setPrayerMarked(input(true))).reason).toBe('context');
    button(full).click();
    expect(full.textContent).toContain('Day or data mode changed'); expect(store.real.list()).toHaveLength(0); expect(store.demo.list()).toHaveLength(0);
    button(full).click(); await saved(full);
    expect(store.real.get(prayerLogId(prayerDate(), 'fajr'))?.ns).toBe('real'); expect(store.demo.list()).toHaveLength(0);
  });
  it('a stale Dhaka date refreshes all rows and requires another tap after midnight', async () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-05T17:59:00Z'));
    const full = prayerControls('en'); document.body.append(full); const oldDate = prayerDate();
    clock.mockReturnValue(Date.parse('2026-11-05T18:01:00Z'));
    button(full).click();
    expect(prayerDate()).not.toBe(oldDate); expect(store.demo.list()).toHaveLength(0);
    expect(full.querySelector('[data-prayer-day]')?.textContent).toBe(prayerDate());
    button(full).click(); await saved(full);
    expect(store.demo.get(prayerLogId(prayerDate(), 'fajr'))).not.toBeNull(); expect(store.demo.get(prayerLogId(oldDate, 'fajr'))).toBeNull();
  });
  it('allows a manual mark with Unknown times without changing any timing settings', async () => {
    const original = prayerSync.resolvedPrayerTimes;
    vi.spyOn(prayerSync, 'resolvedPrayerTimes').mockImplementation((date) => { const res = original(date); return { ...res, times: { ...res.times, fajr: null } }; });
    const before = JSON.stringify([prefs.prayerCoords, prefs.prayerSettings, prefs.prayerSync]);
    const full = prayerControls('en', 'full'); document.body.append(full);
    expect(full.querySelector('[data-prayer-time=fajr]')?.textContent).toMatch(/unknown|don't know/i);
    expect(button(full).disabled).toBe(false); button(full).click(); await saved(full);
    expect(button(full).getAttribute('aria-pressed')).toBe('true');
    expect(JSON.stringify([prefs.prayerCoords, prefs.prayerSettings, prefs.prayerSync])).toBe(before);
  });
  it('a prayer plan and the main controls share pending, durable state and undo without replacing draft fields', async () => {
    const record: TMRecord = { id: 'shared-prayer-plan', entity: 'deen_plan', ns: 'demo', ownerId: 'u', schemaVersion: 1, createdAt: new Date().toISOString(), values: Object.fromEntries(Object.entries({ kind: 'salah', title: 'Fajr plan', repeat: 'daily', prayer: 'fajr', status: 'active' }).map(([k, value]) => [`deen_plan.${k}`, { state: 'value', value, label: 'DEMO' }])) };
    store.demo.put(record); await flushStorage();
    const plans = deenPlansScreen(), full = prayerControls('en'); document.body.append(plans, full);
    const draft = plans.querySelector('#dp-title') as HTMLInputElement; draft.value = 'keep my draft';
    const planButton = plans.querySelector('[data-act=plan-mark]') as HTMLButtonElement;
    planButton.click(); expect(button(full).disabled).toBe(true); await saved(full);
    expect(button(full).getAttribute('aria-pressed')).toBe('true'); expect(draft.value).toBe('keep my draft');
    button(full).click(); await saved(full); expect(planButton.getAttribute('aria-pressed')).toBe('false'); expect(draft.value).toBe('keep my draft');
  });
  it('blocks a command while the device app lock is active', async () => {
    await setPin(consentKv, '4821', '4821', 1000); lockNow();
    expect((await setPrayerMarked(input(true))).reason).toBe('locked');
    expect(prayerMarkState(input(true)).status).toBe('blocked'); expect(store.demo.list()).toHaveLength(0);
  });
});

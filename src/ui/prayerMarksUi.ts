import { h } from './dom';
import { t } from '../i18n/t';
import type { Key } from '../i18n/packs';
import type { Locale } from '../i18n/registry';
import { PRAYER_KEYS, dhakaNow, prayerClock, type PrayerKey } from '../core/prayer';
import { activeNs, nsTag } from './entry';
import { prefs } from './state';
import { resolvedPrayerTimes } from './prayerSync';
import { sourceLine } from './prayerSyncUi';
import { prayerDate, prayerMarkState, setPrayerMarked, subscribePrayerMarks } from './prayerMarkCommand';
import './prayerMarks.css';

const copy = (lang: Locale, en: string, bn: string) => lang === 'en' ? en : bn;
/** Keep button identities stable: prayer changes never redraw a form or move keyboard focus. */
export function prayerMarkButton(prayer: PrayerKey, lang: Locale, attrs: Record<string, string> = {}): HTMLElement {
  let namespace = activeNs(), date = prayerDate();
  const name = t(`deen.prayer.name.${prayer}` as Key, lang);
  const status = h('span', { class: 'prayer-mark-status', role: 'status', 'aria-live': 'polite' });
  const button = h('button', { type: 'button', 'data-act': 'prayer-mark', 'data-prayer': prayer, ...attrs });
  const hint = h('span', { class: 'prayer-mark-status muted', 'data-prayer-pending': prayer });
  const wrap = h('div', { class: 'prayer-mark-control k-row__trail' }, button, status, hint);
  let stale = false;
  const update = () => {
    const state = prayerMarkState({ namespace, date, prayer });
    const pending = state.status === 'pending', failed = state.status === 'error';
    button.disabled = pending;
    hint.hidden = state.marked || pending || failed;
    hint.textContent = hint.hidden ? '' : t('deen.prayer.notYet', lang);
    button.className = state.marked && !failed ? 'btn btn-sm prayer-mark-btn' : 'btn ghost btn-sm prayer-mark-btn';
    button.setAttribute('aria-pressed', failed ? 'mixed' : String(state.marked));
    button.setAttribute('aria-busy', String(pending));
    const action = pending ? copy(lang, 'Saving…', 'সেভ হচ্ছে…') : failed ? copy(lang, 'Retry', 'আবার চেষ্টা') : state.marked ? t('deen.prayer.marked', lang) : t('deen.prayer.mark', lang);
    button.textContent = action;
    button.setAttribute('aria-label', `${name}: ${action}${state.marked && !failed ? copy(lang, ' (tap to undo)', ' (আবার চাপলে মুছবে)') : ''}`);
    status.className = `prayer-mark-status${failed || state.status === 'blocked' ? ' err' : ' muted'}`;
    status.textContent = stale ? copy(lang, 'Day or data mode changed. Check and tap again.', 'দিন বা ডাটা মোড বদলেছে। দেখে আবার চাপুন।')
      : failed ? copy(lang, 'Could not confirm saving. Retry or export a backup.', 'সেভ নিশ্চিত হয়নি। আবার চেষ্টা করুন বা ব্যাকআপ নিন।')
      : state.status === 'blocked' ? state.reason === 'consent' ? copy(lang, 'Enable real-data consent first.', 'আগে আসল ডাটার অনুমতি দিন।') : state.reason === 'locked' ? copy(lang, 'Unlock the app first.', 'আগে অ্যাপ আনলক করুন।') : copy(lang, 'Check today and tap again.', 'আজকের দিন দেখে আবার চাপুন।')
      : state.status === 'saved' ? copy(lang, 'Saved on this device', 'এই ডিভাইসে সেভ হয়েছে') : '';
  };
  button.addEventListener('click', () => {
    if (prayerMarkState({ namespace, date, prayer }).status === 'pending') return;
    if (namespace !== activeNs() || date !== prayerDate()) {
      namespace = activeNs(); date = prayerDate(); stale = true; update();
      wrap.dispatchEvent(new CustomEvent('prayer-context-refresh', { bubbles: true })); return;
    }
    stale = false;
    const state = prayerMarkState({ namespace, date, prayer });
    void setPrayerMarked({ namespace, date, prayer, desiredMarked: state.status === 'error' ? state.desiredMarked! : !state.marked });
  });
  wrap.addEventListener('prayer-refresh-context', () => { namespace = activeNs(); date = prayerDate(); update(); });
  const unsubscribe = subscribePrayerMarks(update);
  let connected = false;
  const observer = new MutationObserver(() => {
    if (wrap.isConnected) connected = true;
    else if (connected) { unsubscribe(); observer.disconnect(); }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  update(); return wrap;
}

export function prayerControls(lang: Locale, variant: 'compact' | 'full' = 'compact'): HTMLElement {
  const day = h('p', { class: 'muted', 'data-prayer-day': '1' }, prayerDate());
  const mode = nsTag(activeNs(), lang); mode.dataset.prayerNamespace = '1';
  const card = h('section', { class: `card prayer-marks prayer-marks-${variant}`, ...(variant === 'full' ? { id: 'deen-prayers' } : {}), 'data-prayer-times': prayerDate() },
    h('div', { class: 'row' }, h('h2', { class: 'card-h' }, t('deen.prayer.title', lang)), mode), day,
    h('p', { class: 'muted' }, copy(lang, 'Your private marks for today. Tap again to undo.', 'আজকের প্রাইভেট চিহ্ন। মুছতে আবার চাপুন।')));
  const times = new Map<PrayerKey, HTMLElement>();
  for (const prayer of PRAYER_KEYS) {
    const time = h('span', { class: 'muted k-row__sub', 'data-prayer-time': prayer }); times.set(prayer, time);
    card.append(h('div', { class: 'prayer-mark-row k-row', 'data-prayer-row': prayer }, h('div', { class: 'k-row__main' }, h('strong', { class: 'k-row__title' }, t(`deen.prayer.name.${prayer}` as Key, lang)), ' ', time), prayerMarkButton(prayer, lang)));
  }
  const details = h('div', { class: 'prayer-times-details' });
  const refresh = () => {
    const now = dhakaNow(Date.now()), res = resolvedPrayerTimes(now.date), ps = prefs.prayerSettings;
    day.textContent = prayerDate(); card.dataset.prayerTimes = prayerDate();
    mode.dataset.ns = activeNs(); mode.className = `badge ns-${activeNs()}`; mode.textContent = t(activeNs() === 'real' ? 'badge.real' : 'badge.demo', lang);
    for (const [prayer, el] of times) el.textContent = prayerClock(res.times[prayer]) ?? t('unknown.unknown', lang);
    details.replaceChildren(h('p', { class: 'muted', 'data-prayer-method': '1' }, t('deen.set.methodLine', lang, { m: t(`deen.method.${ps.method}` as Key, lang), a: t(ps.asr === 'hanafi' ? 'deen.asr.hanafi' : 'deen.asr.standard', lang) })), sourceLine(res, lang),
      h('p', { class: 'note', 'data-prayer-note': '1' }, t(res.source === 'external' ? 'deen.prayer.noteExt' : 'deen.prayer.note', lang)),
      h('p', { class: 'muted' }, copy(lang, 'You can mark a prayer even when its time is Unknown.', 'সময় অজানা থাকলেও নিজে নামাজের চিহ্ন দিতে পারবেন।')));
  };
  if (variant === 'full') card.append(details);
  card.addEventListener('prayer-context-refresh', () => {
    refresh();
    for (const control of card.querySelectorAll('.prayer-mark-control')) control.dispatchEvent(new Event('prayer-refresh-context'));
  }); refresh(); return card;
}

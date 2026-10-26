// More > Data: local snapshots (automatic copies kept in IndexedDB on this phone), restore with a confirm, save to file, and an
// in-app backup reminder (OFF by default). No cloud, no network. Keys and settings are never copied (records only).
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { consentKv, prefs, snapshotRepo, store } from "./state";
import { num } from "./components";
import { readConsent } from "../core/consent";
import { StoreRepo } from "../adapters/storeRepo";
import { KEEP_CHOICES, autoDue, newestFirst, parseSnapshotFile, pruneSnapshots, reminderDue, restoreSnapshot, snapshotToFile, takeSnapshot, type Snapshot } from "../core/snapshots";

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
const pad = (n: number) => String(n).padStart(2, "0");
/** Local date and time, Latin digits: 2026-10-26 14:05 */
export const whenText = (iso: string): string => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? iso : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const records = () => new StoreRepo(store);

/** Runs once when the app opens: an automatic snapshot if it is on and the newest one is old enough. Never throws. */
export async function runAutoSnapshot(now = new Date()): Promise<Snapshot | null> {
  try {
    if (!snapshotRepo || !prefs.snapAuto) return null;
    if (!autoDue(await snapshotRepo.list(), now)) return null;
    return await takeSnapshot(records(), snapshotRepo, { reason: "auto", keep: prefs.snapKeep, realOk: readConsent(consentKv), now });
  } catch { return null; }
}

function download(name: string, text: string) {
  const a = h("a", { href: URL.createObjectURL(new Blob([text], { type: "application/json" })), download: name });
  document.body.append(a); a.click(); a.remove();
}

// Messages survive the re-draw that follows a restore.
let note: { key: Key; args?: Record<string, string | number>; bad: boolean } | null = null;

export function snapshotsCard(lang: Locale): HTMLElement {
  if (!snapshotRepo) return h("div", { class: "card", "data-card": "snapshots" }, h("h2", { class: "card-h" }, t("snap.title", lang)), h("p", { class: "muted", "data-snap-unavailable": "1" }, t("snap.unavailable", lang)));
  const repo = snapshotRepo;
  const msg = h("p", { role: "status", "data-snap": "msg" });
  const say = (key: Key, bad: boolean, args?: Record<string, string | number>) => { msg.className = bad ? "err" : "ok-msg"; msg.textContent = t(key, lang, args); };
  if (note) { say(note.key, note.bad, note.args); note = null; }
  const list = h("div", { "data-snap": "list" });
  const confirmBox = h("div", { "data-snap": "confirm" });
  const realOk = () => readConsent(consentKv);

  const fileFor = (s: Snapshot) => {
    download(`tm-snapshot-${s.createdAt.slice(0, 10)}.json`, JSON.stringify(snapshotToFile(s)));
    prefs.fileBackupAt = new Date().toISOString();
    say("snap.fileSaved", false, { d: num(s.demo.count, lang), r: num(s.real?.count ?? 0, lang) });
  };
  const askRestore = (s: Snapshot) => {
    confirmBox.replaceChildren(h("div", { class: "note", role: "alertdialog", "aria-label": t("snap.confirm.title", lang), "data-snap": "confirm-box" },
      h("h3", {}, t("snap.confirm.title", lang)), h("p", {}, t("snap.confirm.warn", lang)),
      s.real && !realOk() ? h("p", { class: "muted" }, t("snap.realSkipped", lang)) : null,
      h("p", { class: "muted" }, t("snap.row", lang, { when: whenText(s.createdAt), why: t(`snap.why.${s.reason}` as Key, lang), d: num(s.demo.count, lang), r: num(s.real?.count ?? 0, lang) })),
      h("button", { class: "btn", type: "button", "data-act": "snap-confirm", onclick: () => doRestore(s) }, t("snap.confirm.yes", lang)),
      h("button", { class: "btn ghost", type: "button", "data-act": "snap-cancel", onclick: () => confirmBox.replaceChildren() }, t("snap.confirm.no", lang))));
  };
  const doRestore = async (s: Snapshot) => {
    try {
      // Check first (nothing changes if the snapshot is damaged), then save today's data, then replace.
      await takeSnapshot(records(), repo, { reason: "before_restore", keep: prefs.snapKeep + 1, realOk: realOk() }).catch(() => null);
      const r = await restoreSnapshot(records(), s, realOk());
      note = { key: "snap.done", args: { d: num(r.demo, lang), r: num(r.real, lang) }, bad: false }; rerender();
    } catch { confirmBox.replaceChildren(); say("snap.bad", true); }
  };
  const paint = async () => {
    const all = newestFirst(await repo.list());
    list.replaceChildren(...(all.length ? [h("ul", { class: "snap-list" }, ...all.map((s) => h("li", { "data-snapshot": s.id, "data-reason": s.reason },
      h("span", { class: "snap-when" }, t("snap.row", lang, { when: whenText(s.createdAt), why: t(`snap.why.${s.reason}` as Key, lang), d: num(s.demo.count, lang), r: num(s.real?.count ?? 0, lang) })),
      h("span", { class: "snap-btns" },
        h("button", { class: "btn ghost", type: "button", "data-act": "snap-restore", onclick: () => askRestore(s) }, t("snap.restore", lang)),
        h("button", { class: "btn ghost", type: "button", "data-act": "snap-file-one", onclick: () => fileFor(s) }, t("snap.file", lang))))))] : [h("p", { class: "muted", "data-snap": "none" }, t("snap.none", lang))]));
  };
  const take = async () => {
    confirmBox.replaceChildren();
    const s = await takeSnapshot(records(), repo, { reason: "manual", keep: prefs.snapKeep, realOk: realOk() });
    if (!s) say("snap.nothing", true); else say("snap.taken", false);
    await paint();
  };
  const saveFile = async () => {
    const s = await takeSnapshot(records(), repo, { reason: "manual", keep: prefs.snapKeep, realOk: realOk() });
    if (!s) return say("snap.nothing", true);
    await paint(); fileFor(s);
  };
  const file = h("input", { id: "snap-file", type: "file", accept: "application/json,.json", "data-snap": "file" }) as HTMLInputElement;
  const openFile = async () => {
    confirmBox.replaceChildren(); const f = file.files?.[0]; if (!f) return say("snap.fileChoose", true);
    try { askRestore(parseSnapshotFile(await f.text())); } catch { say("snap.fileBad", true); }
  };
  const auto = h("input", { type: "checkbox", id: "snap-auto", "data-snap": "auto", ...(prefs.snapAuto ? { checked: true } : {}), onchange: (e: Event) => { prefs.snapAuto = (e.target as HTMLInputElement).checked; } });
  const remind = h("input", { type: "checkbox", id: "snap-remind", "data-snap": "remind", ...(prefs.backupRemind ? { checked: true } : {}), onchange: (e: Event) => { prefs.backupRemind = (e.target as HTMLInputElement).checked; } });
  const keep = h("select", { id: "snap-keep", "data-snap": "keep", onchange: (e: Event) => { prefs.snapKeep = Number((e.target as HTMLSelectElement).value); void prune(); } },
    ...KEEP_CHOICES.map((n) => h("option", { value: String(n), ...(prefs.snapKeep === n ? { selected: true } : {}) }, num(n, lang))));
  const prune = async () => { await pruneSnapshots(repo, prefs.snapKeep); await paint(); };
  void paint();
  return h("div", { class: "card", "data-card": "snapshots" }, h("h2", { class: "card-h" }, t("snap.title", lang)), h("p", { class: "muted" }, t("snap.note", lang)),
    h("label", { class: "snap-check", for: "snap-auto" }, auto, t("snap.auto", lang)),
    h("label", { for: "snap-keep" }, t("snap.keep", lang)), keep,
    h("label", { class: "snap-check", for: "snap-remind" }, remind, t("snap.remind", lang)), h("p", { class: "muted" }, t("snap.remind.note", lang)),
    h("button", { class: "btn", type: "button", "data-act": "snap-take", onclick: () => void take() }, t("snap.take", lang)),
    h("button", { class: "btn ghost", type: "button", "data-act": "snap-file", onclick: () => void saveFile() }, t("snap.file", lang)),
    h("p", { class: "muted" }, t("snap.fileNote", lang)),
    msg, list, confirmBox,
    h("label", { for: "snap-file" }, t("snap.loadFile", lang)), file,
    h("button", { class: "btn ghost", type: "button", "data-act": "snap-open-file", onclick: () => void openFile() }, t("snap.restore", lang)));
}

/** Today: a gentle reminder to save a backup file. Only when the user turned it on; never a notification. */
export function backupReminderCard(lang: Locale): HTMLElement | null {
  const now = new Date();
  const hasData = store.demo.list().length + (readConsent(consentKv) ? store.real.list().length : 0) > 0;
  if (!reminderDue(prefs.backupRemind, hasData, prefs.fileBackupAt || null, now, prefs.remindSnoozedOn || null)) return null;
  const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return h("aside", { class: "card", role: "status", "data-backup-reminder": "1" }, h("h2", { class: "card-h" }, t("snap.reminder.title", lang)), h("p", {}, t("snap.reminder.text", lang)),
    h("a", { href: "#/more/data", class: "btn", style: "width:auto;margin:0;min-height:44px" }, t("snap.reminder.open", lang)),
    h("button", { class: "btn ghost", type: "button", "data-act": "reminder-later", style: "width:auto;margin:0 0 0 8px;min-height:44px", onclick: () => { prefs.remindSnoozedOn = day; rerender(); } }, t("snap.reminder.later", lang)));
}

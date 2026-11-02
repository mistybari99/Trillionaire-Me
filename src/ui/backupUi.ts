// Settings > Backup & export (settings redesign PR 3d) and its Restore sub-page. The cards are the existing ones, moved:
// save (JSON demo, encrypted), reminder (one switch), storage status, snapshots, spreadsheet copy. Restore has its own page.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { consentKv, prefs, store } from "./state";
import { readConsent } from "../core/consent";
import { StoreRepo } from "../adapters/storeRepo";
import { createBackup, parseBackup } from "../core/backup";
import { storageCard } from "./storageCard";
import { encBackupCard } from "./encBackup";
import { markBackupFile, snapshotsCard, whenText } from "./snapshotsUi";
import { restoreHost, startRestore } from "./restoreUi";
import { csvCard } from "./csvUi";
import { importCard } from "./importUi";
import { settingsHash } from "./settingsRegistry";

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
const crumb = (lang: Locale, to: string, label: Key) => h("a", { href: to, class: "crumb" }, `← ${t(label, lang)}`);
const flash = (main: HTMLElement, row: string | undefined) => {
  const el = row ? main.querySelector<HTMLElement>(`[data-setting-row="${row}"]`) : null;
  if (el) { el.classList.add("set-hl"); setTimeout(() => { try { el.scrollIntoView?.({ block: "center" }); } catch { /* ignore */ } }, 0); }
};

/** The two status lines at the top: last file, and whether the real data is in any file (Unknown is never shown as 0). */
export function backupStatus(lang: Locale): { file: string; real: string } {
  const hasReal = readConsent(consentKv) || store.real.list().length > 0;
  return {
    file: prefs.fileBackupAt ? t("set.status.backup.last", lang, { when: whenText(prefs.fileBackupAt) }) : t("set.status.backup.none", lang),
    real: !hasReal ? t("bak.real.na", lang) : prefs.realBackupAt ? t("bak.real.last", lang, { when: whenText(prefs.realBackupAt) }) : t("bak.real.none", lang),
  };
}

function reminderRow(lang: Locale): HTMLElement {
  const own = prefs.backupRemindChoice; const on = prefs.backupRemind;
  const why = own ? t("bak.reminder.own", lang) : t(on ? "bak.reminder.on" : "bak.reminder.off", lang);
  const box = h("input", { type: "checkbox", id: "snap-remind", "data-snap": "remind", ...(on ? { checked: true } : {}), onchange: (e: Event) => { prefs.backupRemind = (e.target as HTMLInputElement).checked; rerender(); } });
  return h("section", { class: "card", "data-setting-row": "reminder" }, h("h2", { class: "card-h" }, t("set.row.reminder", lang)),
    h("label", { class: "snap-check", for: "snap-remind", style: "min-height:44px" }, box, t("snap.remind", lang), " ", h("b", { "data-priv": "remind-state" }, t(on ? "set.on" : "set.off", lang))),
    h("p", { class: "muted" }, t("snap.remind.note", lang)), h("p", { class: "muted", "data-bak": "reminder-why" }, why));
}

function jsonSave(lang: Locale): HTMLElement {
  return h("section", { class: "card", "data-card": "json-backup" }, h("h2", { class: "card-h" }, t("backup.title", lang)), h("p", { class: "muted" }, t("backup.note", lang)),
    h("button", { class: "btn", type: "button", "data-act": "backup", style: "min-height:44px", onclick: async () => {
      const b = await createBackup(new StoreRepo(store), "demo");
      const a = h("a", { href: URL.createObjectURL(new Blob([JSON.stringify(b)], { type: "application/json" })), download: `tm-demo-backup-${b.createdAt.slice(0, 10)}.json` });
      document.body.append(a); a.click(); a.remove(); markBackupFile(0); rerender();
    } }, t("backup.save", lang)),
    h("p", { class: "muted", "data-backup": "contains" }, t("backup.contains.demo", lang)));
}

export function backupPage(row: string | undefined, lang: Locale): HTMLElement {
  if (row === "restore") return restorePage(lang);
  const st = backupStatus(lang); const realOn = readConsent(consentKv);
  const main = h("main", { class: "scr scr-settings", "data-settings": "backup" }, crumb(lang, "#/settings", "nav.settings"), h("h1", {}, t("set.cat.backup", lang)),
    h("section", { class: "card", "data-card": "backup-status", "aria-label": t("bak.status.title", lang) }, h("h2", { class: "card-h" }, t("bak.status.title", lang)),
      h("p", { "data-bak": "file" }, st.file), h("p", { "data-bak": "real" }, st.real)),
    h("section", { "data-setting-row": "savebackup" }, h("h2", {}, t("bak.save.h", lang)), jsonSave(lang), encBackupCard(lang, "save")),
    h("section", { "data-setting-row": "restore" }, h("a", { href: settingsHash("backup", "restore"), class: "card link" }, h("h2", { class: "card-h" }, t("set.row.restore", lang)), h("p", { class: "muted" }, t("bak.restore.note", lang)))),
    reminderRow(lang),
    h("section", { "data-setting-row": "storage" }, storageCard(lang)),
    h("details", { "data-setting-row": "snapshots" }, h("summary", { style: "min-height:44px" }, t("bak.fold.snap", lang)), snapshotsCard(lang, "settings")),
    h("details", { "data-setting-row": "csv" }, h("summary", { style: "min-height:44px" }, t("bak.fold.csv", lang)), csvCard(realOn, lang), importCard(lang)),
    h("p", { class: "muted", "data-bak": "settings-note" }, t("bak.settingsNote", lang)));
  // folds that hold the row being opened start open
  if (row === "snapshots" || row === "csv") main.querySelector<HTMLDetailsElement>(`details[data-setting-row=${row}]`)?.setAttribute("open", "");
  flash(main, row);
  return main;
}

function restorePage(lang: Locale): HTMLElement {
  const msg = h("p", { id: "backup-msg", role: "status" });
  const input = h("input", { type: "file", accept: "application/json,.json", "data-act": "restore", id: "backup-file", onchange: async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
    try { const b = parseBackup(await f.text()); msg.textContent = ""; await startRestore("json", { demo: b.ns === "demo" ? b : null, real: b.ns === "real" ? b : null, createdAt: b.createdAt }, lang); }
    catch (err) { msg.className = "err"; msg.textContent = t("backup.bad", lang, { why: (err as Error).message }); }
    (e.target as HTMLInputElement).value = "";
  } });
  return h("main", { class: "scr scr-settings", "data-settings": "restore" }, crumb(lang, settingsHash("backup"), "bak.backToBackup"), h("h1", {}, t("bak.restore.title", lang)),
    h("p", { class: "sub" }, t("bak.restore.note", lang)), restoreHost(lang),
    h("section", { class: "card", "data-card": "json-restore" }, h("h2", { class: "card-h" }, t("backup.restore", lang)), h("label", { for: "backup-file" }, t("bak.restore.pick", lang)), input, msg),
    encBackupCard(lang, "restore"), snapshotsCard(lang, "restore"), h("p", { class: "muted" }, t("restore.copyFirst", lang)));
}

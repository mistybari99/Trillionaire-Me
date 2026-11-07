// Visible save-failed state: a calm banner (not an error screen) with a retry and a one-tap backup file. No network.
import { h } from "./dom";
import { readVault } from "../core/dataVault";
import { t } from "../i18n/t";
import type { Locale } from "../i18n/registry";
import { consentKv, saveMonitor, store } from "./state";
import { readConsent } from "../core/consent";
import { StoreRepo } from "../adapters/storeRepo";
import { buildSnapshotFile } from "../core/snapshots";
import { markBackupFile } from "./snapshotsUi";

/** The banner, or null when every change is saved. Memory still holds the records, so the backup comes from what is on screen. */
export function saveFailedBanner(lang: Locale): HTMLElement | null {
  if (!saveMonitor.hasFailure) return null;
  const msg = h("p", { role: "status", "data-save": "msg" });
  return h("aside", { class: "card", role: "alert", "data-save-failed": "1" },
    h("h2", { class: "card-h" }, t("save.fail.title", lang)), h("p", {}, t("save.fail.text", lang)),
    h("button", { class: "btn ghost btn-sm", type: "button", "data-act": "save-retry", onclick: () => {
      saveMonitor.retry();
      setTimeout(() => { if (saveMonitor.hasFailure) { msg.textContent = t("save.fail.retryStill", lang); } }, 400);
    } }, t("save.fail.retry", lang)),
    h("button", { class: "btn btn-sm", type: "button", "data-act": "save-backup", onclick: async () => {
      const f = await buildSnapshotFile(new StoreRepo(store), readConsent(consentKv));
      const a = h("a", { href: URL.createObjectURL(new Blob([JSON.stringify(f)], { type: "application/json" })), download: `tm-backup-${f.createdAt.slice(0, 10)}.json` });
      document.body.append(a); a.click(); a.remove();
      markBackupFile(f.real?.count ?? 0);
      msg.textContent = t("save.fail.backupDone", lang) + (readVault(consentKv) ? ` ${t("vault.plain.note", lang)}` : "");
    } }, t("save.fail.backup", lang)),
    h("a", { href: "#/settings/backup", class: "btn ghost btn-sm", "data-act": "save-open-backup" }, t("set.cat.backup", lang)), msg);
}

/** Storage status changes patch their own banner, never replace an unfinished form. */
export function refreshSaveFailedBanner(lang: Locale): void {
  const app = document.getElementById("app");
  // First-run and locked screens have no bottom tabs; reveal no storage details there.
  if (!app?.querySelector("nav.bottom-tabs")) return;
  const current = app.querySelector<HTMLElement>(":scope > [data-save-failed]");
  if (!saveMonitor.hasFailure) { current?.remove(); return; }
  if (current) return;
  const main = app.querySelector("main");
  const banner = saveFailedBanner(lang);
  if (main && banner) main.before(banner);
}

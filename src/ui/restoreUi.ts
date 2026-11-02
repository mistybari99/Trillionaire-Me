// Safe restore screen part (settings redesign PR 1). One flow for the backup file, the encrypted backup and snapshots:
// preview with numbers -> PIN again (when the lock is on) -> confirm -> result with Go back. Nothing changes before the confirm.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { consentKv, snapshotRepo, store } from "./state";
import { num } from "./components";
import { readConsent } from "../core/consent";
import { StoreRepo } from "../adapters/storeRepo";
import { MemorySnapshotRepo, type SnapshotRepo } from "../core/snapshots";
import { RealPermissionError, goBack, planRestore, restoreBackupAtomic, type RestoreSource } from "../core/restore";
import { lockEnabled, verifyPin } from "../core/appLock";
import { whenText } from "./snapshotsUi";

export type RestoreKind = "json" | "enc" | "snap";
// When IndexedDB is missing, the Before restore copy lives in memory for this visit only (Go back still works until the page closes).
const fallbackSnaps = new MemorySnapshotRepo();
const snaps = (): SnapshotRepo => snapshotRepo ?? fallbackSnaps;
const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));

let hostEl: HTMLElement | null = null;
/** A result that must survive the redraw that follows a restore (and one pending preview is never kept across redraws). */
let result: { msg: Key; args: Record<string, string | number>; goBackId: string | null; bad: boolean } | null = null;

/** The one place on a screen where the restore preview and result appear. */
export function restoreHost(lang: Locale): HTMLElement {
  const el = h("div", { "data-restore": "host", "aria-live": "polite" });
  hostEl = el;
  if (result) showResult(el, lang);
  return el;
}

function showResult(el: HTMLElement, lang: Locale) {
  const r = result!;
  el.replaceChildren(h("div", { class: "card", role: "status", "data-restore": "result" },
    h("p", { class: r.bad ? "err" : "ok-msg", "data-restore": "msg" }, t(r.msg, lang, r.args)),
    r.goBackId ? h("p", { class: "muted" }, t("restore.goBack.note", lang)) : null,
    r.goBackId ? h("button", { class: "btn ghost", type: "button", "data-act": "restore-goback", style: "min-height:44px", onclick: () => void doGoBack(r.goBackId!, lang) }, t("restore.goBack", lang)) : null));
}

async function doGoBack(id: string, lang: Locale) {
  try {
    const r = await goBack(new StoreRepo(store), snaps(), id, readConsent(consentKv));
    result = { msg: "restore.goBack.done", args: { n: num(r.demo + r.real, lang) }, goBackId: null, bad: false };
  } catch { result = { msg: "restore.goneCopy", args: {}, goBackId: null, bad: true }; }
  rerender();
}

/** Shows the preview for `src`. Throws nothing: a bad file is shown as a plain message and nothing changes. */
export async function startRestore(kind: RestoreKind, src: RestoreSource, lang: Locale, onCancel?: () => void): Promise<void> {
  const el = hostEl; if (!el) return;
  result = null;
  const repo = new StoreRepo(store); const realOk = readConsent(consentKv);
  let plan;
  try { plan = await planRestore(repo, src, realOk); }
  catch (e) { result = { msg: "restore.failed", args: { why: (e as Error).message }, goBackId: null, bad: true }; showResult(el, lang); return; }
  const close = () => { el.replaceChildren(); onCancel?.(); };
  const heading = h("h3", { tabindex: "-1", "data-restore": "title" }, t("restore.title", lang));
  const cancel = h("button", { class: "btn ghost", type: "button", "data-act": `${kind}-cancel`, style: "min-height:44px", onclick: close }, t("restore.cancel", lang));
  if (plan.realBlocked) {
    el.replaceChildren(h("div", { class: "note", role: "alertdialog", "aria-label": t("restore.title", lang), "data-restore": "blocked" }, heading,
      h("p", {}, t("restore.realBlocked", lang)), h("a", { href: "#/more/data", class: "btn ghost", style: "min-height:44px", "data-act": "restore-open-consent" }, t("restore.realBlocked.open", lang)), cancel));
    cancel.focus(); return;
  }
  const lockOn = lockEnabled(consentKv);
  const pin = h("input", { id: "restore-pin", type: "password", inputmode: "numeric", autocomplete: "off", "aria-label": t("restore.pin", lang), "data-restore": "pin", style: "min-height:44px" }) as HTMLInputElement;
  const err = h("p", { class: "err", role: "alert", "data-restore": "err" });
  const confirm = h("button", { class: "btn", type: "button", "data-act": `${kind}-confirm`, style: "min-height:44px", onclick: async () => {
    err.textContent = "";
    if (lockOn) { const v = await verifyPin(consentKv, pin.value, Date.now()); if (!v.ok) { pin.value = ""; err.textContent = t("restore.pin.wrong", lang); return; } }
    confirm.disabled = true; cancel.disabled = true;
    try {
      const r = await restoreBackupAtomic(repo, snaps(), src, readConsent(consentKv));
      result = { msg: "restore.done", args: { n: num(r.demo + r.real, lang) }, goBackId: r.snapshotId, bad: false };
    } catch (e) {
      result = { msg: "restore.failed", args: { why: e instanceof RealPermissionError ? t("restore.realBlocked", lang) : (e as Error).message }, goBackId: null, bad: true };
    }
    rerender();
  } }, t("restore.confirm", lang, { now: num(plan.nowTotal, lang), file: num(plan.fileTotal, lang) }));
  el.replaceChildren(h("div", { class: "note", role: "alertdialog", "aria-label": t("restore.title", lang), "data-restore": "preview" }, heading,
    h("p", { class: "muted" }, t("restore.source", lang, { src: t(`restore.src.${kind}` as Key, lang), when: whenText(src.createdAt) })),
    ...plan.parts.map((p) => h("p", { "data-restore-part": p.ns }, t(p.ns === "demo" ? "restore.part.demo" : "restore.part.real", lang, { now: num(p.now, lang), file: num(p.file, lang) }))),
    h("p", { class: "muted" }, t("restore.copyFirst", lang)),
    lockOn ? h("div", {}, h("label", { for: "restore-pin" }, t("restore.pin", lang)), pin) : null, err,
    cancel, confirm));
  cancel.focus(); // Cancel is the default focus, so a stray Enter never replaces data
}

// Settings > Delete data (settings redesign PR 3c). The only place with delete actions, never one tap.
// Delete demo: save a copy (optional) -> ask -> confirm. Clear real: live count -> backup link -> typed word (or the "cannot type"
// fallback with a tick) -> PIN again when the lock is on -> final button. No countdown. Results come from state, never replayed.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Locale } from "../i18n/registry";
import { consentKv, prefs, snapshotRepo, store } from "./state";
import { num } from "./components";
import { StoreRepo } from "../adapters/storeRepo";
import { createBackup } from "../core/backup";
import { revokeConsent } from "../core/consent";
import { lockEnabled, verifyPin } from "../core/appLock";
import { scrubRealParts } from "../core/snapshots";
import { isDeleteWord } from "../core/typedConfirm";
import { settingsHash } from "./settingsRegistry";

const rerender = () => { if (typeof window !== "undefined") window.dispatchEvent(new HashChangeEvent("hashchange")); };
let demoAsk = false, realCantType = false, copySaved = false;
let done: "demo" | "real" | null = null;

/** Called when the page is left, so a later visit starts calm. */
export const resetDeleteUi = () => { demoAsk = false; realCantType = false; copySaved = false; done = null; };

function pinBox(lang: Locale) {
  const on = lockEnabled(consentKv);
  const input = h("input", { type: "password", inputmode: "numeric", autocomplete: "off", "aria-label": t("restore.pin", lang), "data-delete": "pin" }) as HTMLInputElement;
  const err = h("p", { class: "err", role: "alert", "data-delete": "pin-err" });
  /** Runs `fn` now when the lock is off, or after the PIN is right when it is on. */
  const run = (fn: () => void | Promise<void>) => { if (!on) { void fn(); return; } void verifyPin(consentKv, input.value, Date.now()).then((v) => { if (v.ok) void fn(); else { input.value = ""; err.textContent = t("restore.pin.wrong", lang); } }); };
  return { nodes: on ? [h("label", {}, t("restore.pin", lang), input), err] : [], run };
}

function demoCard(lang: Locale): HTMLElement {
  const n = store.demo.list().length; const pin = pinBox(lang);
  const copy = h("button", { class: "btn ghost", type: "button", "data-act": "delete-demo-copy", onclick: async () => {
    const b = await createBackup(new StoreRepo(store), "demo");
    const a = h("a", { href: URL.createObjectURL(new Blob([JSON.stringify(b)], { type: "application/json" })), download: `tm-demo-backup-${b.createdAt.slice(0, 10)}.json` });
    document.body.append(a); a.click(); a.remove(); copySaved = true; rerender();
  } }, t("del.demo.copy", lang));
  const body: Array<Node | null> = [h("h2", { class: "card-h" }, t("set.row.deletedemo", lang)), h("p", { "data-delete": "demo-count" }, t("del.demo.count", lang, { n: num(n, lang) })), h("p", { class: "muted" }, t("del.demo.goes", lang)), copy,
    copySaved ? h("p", { class: "ok-msg", role: "status" }, t("del.demo.copied", lang)) : null];
  if (!demoAsk) body.push(h("button", { class: "btn ghost", type: "button", "data-act": "clear-demo", onclick: () => { demoAsk = true; done = null; rerender(); } }, t("data.clearDemo", lang)));
  else {
    const no = h("button", { class: "btn ghost", type: "button", "data-act": "clear-demo-no", onclick: () => { demoAsk = false; rerender(); } }, t("del.cancel", lang));
    body.push(h("div", { role: "alertdialog", "aria-label": t("data.clearDemo", lang), "data-clear": "demo" }, h("p", {}, t("data.clearDemo.ask", lang)), ...pin.nodes, no,
      h("button", { class: "btn", type: "button", "data-act": "clear-demo-yes", onclick: () => pin.run(() => { store.demo.clear(); demoAsk = false; copySaved = false; done = "demo"; rerender(); }) }, t("data.clearDemo.yes", lang))));
    setTimeout(() => no.focus(), 0);
  }
  if (done === "demo" && n === 0) body.push(h("p", { class: "ok-msg", role: "status", "data-delete": "done" }, t("del.done.demo", lang)));
  return h("section", { class: "card", "data-setting-row": "deletedemo", "data-card": "delete-demo" }, ...body);
}

function realCard(lang: Locale): HTMLElement {
  const n = store.real.list().length; const pin = pinBox(lang);
  const word = h("input", { type: "text", id: "delete-word", autocomplete: "off", autocapitalize: "off", spellcheck: "false", "data-delete-word": "1", "aria-describedby": "delete-word-hint" }) as HTMLInputElement;
  const tick = h("input", { type: "checkbox", id: "delete-tick", "data-delete-tick": "1" }) as HTMLInputElement;
  const yes = h("button", { class: "btn", type: "button", "data-act": "clear-real-yes", disabled: true, onclick: () => pin.run(async () => {
    store.real.clear();            // real records only; demo is untouched
    prefs.clearRealPrayerPlace();  // the real prayer place is a personal location: forget it too
    revokeConsent(consentKv);      // the next real entry needs a new tick
    realCantType = false; done = "real";
    if (snapshotRepo) await scrubRealParts(snapshotRepo).catch(() => 0); // no snapshot (Before restore copies included) may keep real data
    rerender();
  }) }, t("del.real.yes", lang));
  const update = () => { yes.disabled = !(realCantType ? tick.checked : isDeleteWord(word.value)); };
  word.addEventListener("input", update); tick.addEventListener("change", update);
  const cant = h("button", { class: "btn ghost", type: "button", "data-act": "clear-real-cant", onclick: () => { realCantType = true; rerender(); } }, t("del.real.cant", lang));
  const cancel = h("button", { class: "btn ghost", type: "button", "data-act": "clear-real-no", onclick: () => { realCantType = false; rerender(); } }, t("del.cancel", lang));
  const confirmBox = realCantType
    ? [h("label", { for: "delete-tick", class: "k-check" }, tick, t("del.real.tick", lang, { n: num(n, lang) })), cancel, ...pin.nodes, yes]
    : [h("label", { for: "delete-word" }, t("del.real.type", lang)), word, h("p", { class: "muted", id: "delete-word-hint" }, t("del.real.hint", lang)), cant, ...pin.nodes, yes];
  if (realCantType) setTimeout(() => cancel.focus(), 0); // Cancel is the default focus on the fallback step
  return h("section", { class: "card", "data-setting-row": "deletereal", "data-card": "delete-real" },
    h("h2", { class: "card-h" }, t("set.row.deletereal", lang)), h("p", { "data-delete": "real-count" }, t("del.real.count", lang, { n: num(n, lang) })),
    h("p", { class: "muted" }, t("del.real.goes", lang)), h("p", { class: "muted" }, t("data.clearReal.note", lang)),
    h("a", { href: settingsHash("backup"), class: "btn ghost", "data-act": "delete-real-backup" }, t("del.real.backup", lang)),
    ...confirmBox,
    done === "real" && n === 0 ? h("p", { class: "ok-msg", role: "status", "data-delete": "done" }, t("data.clearReal.done", lang)) : null);
}

export function deletePage(row: string | undefined, lang: Locale): HTMLElement {
  const main = h("main", { class: "scr scr-settings", "data-settings": "delete" },
    h("a", { href: "#/settings", class: "crumb" }, `← ${t("nav.settings", lang)}`), h("h1", {}, t("set.cat.delete", lang)),
    h("p", { class: "sub" }, t("del.intro", lang)), demoCard(lang), realCard(lang));
  const el = row ? main.querySelector<HTMLElement>(`[data-setting-row="${row}"]`) : null;
  if (el) { el.classList.add("set-hl"); setTimeout(() => { try { el.scrollIntoView?.({ block: "center" }); } catch { /* ignore */ } }, 0); }
  return main;
}

// Settings > Privacy & lock (settings redesign PR 3b): a live "private by default" read-out, real-data permission (gate / Withdraw),
// lock-screen details, app lock. Every line is computed from real state. The weaker state is shown calmly, never as a warning.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { consentKv, prefs, store } from "./state";
import { num } from "./components";
import { consentSince, readConsent } from "../core/consent";
import { readLock, RESET_WAIT_MIN } from "../core/appLock";
import { NEUTRAL_TITLE, NOTIFY_CATEGORIES, notifyText } from "../core/notify";
import { readStorageStatus, type StorageLike } from "../core/storageStatus";
import { consentGate, withdrawRealConsent } from "./consentGate";
import { lockCard } from "./lockUi";
import { categorySummary } from "./settingsUi";
import { settingsHash } from "./settingsRegistry";

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
let withdrawn = false, showAsk: string | null = null;

/** Lines of the read-out as [row id, text, is the calm "turn on" state]. Pure of the DOM so tests can read it. */
export function readout(lang: Locale): Array<{ id: string; text: string; weak: boolean; href: string }> {
  const since = consentSince(consentKv); const lock = readLock(consentKv);
  const shown = NOTIFY_CATEGORIES.filter((c) => prefs.notifyShow[c] === true);
  return [
    { id: "phone", text: t("priv.line.phone", lang), weak: false, href: settingsHash("privacy") },
    { id: "consent", text: since ? t("priv.line.consent.on", lang, { d: day(since) }) : t("priv.line.consent.off", lang), weak: !since, href: settingsHash("privacy", "consent") },
    { id: "applock", text: lock ? t("priv.line.lock.on", lang, { auto: t(`lock.auto.${lock.auto}` as Key, lang) }) : t("priv.line.lock.off", lang), weak: !lock, href: settingsHash("privacy", "applock") },
    { id: "lockscreen", text: shown.length ? t("priv.line.screen.some", lang, { list: shown.map((c) => t(`privacy.${c}` as Key, lang)).join(", ") }) : t("priv.line.screen.none", lang), weak: false, href: settingsHash("privacy", "lockscreen") },
    { id: "connections", text: categorySummary("connections", lang), weak: false, href: settingsHash("connections") },
  ];
}

function consentSection(lang: Locale): HTMLElement {
  const n = store.real.list().length;
  if (!readConsent(consentKv)) return h("section", { "data-setting-row": "consent" }, h("h2", {}, t("set.row.consent", lang)), withdrawn ? h("p", { class: "ok-msg", role: "status", "data-priv": "withdrawn" }, t("priv.withdraw.done", lang, { n: num(n, lang) })) : null, consentGate(lang));
  return h("section", { class: "card", "data-setting-row": "consent" }, h("h2", { class: "card-h" }, t("set.row.consent", lang)),
    h("p", { "data-priv": "consent-on" }, t("priv.consent.on", lang, { d: day(consentSince(consentKv)) })), h("p", { class: "muted" }, t("priv.consent.n", lang, { n: num(n, lang) })),
    h("p", { class: "muted" }, t("priv.withdraw.note", lang)),
    h("button", { class: "btn ghost", type: "button", "data-act": "withdraw-consent", style: "min-height:44px", onclick: () => { withdrawRealConsent(); withdrawn = true; rerender(); } }, t("priv.withdraw", lang)));
}

function lockScreenSection(lang: Locale): HTMLElement {
  const seg = (label: string, active: boolean, on: () => void) => h("button", { type: "button", "aria-pressed": String(active), style: "min-height:44px", onclick: on }, label);
  return h("section", { class: "card", "data-lock-settings": "", "data-setting-row": "lockscreen" }, h("h2", { class: "card-h" }, t("more.lock", lang)), h("p", { class: "muted" }, t("more.lock.desc", lang)),
    ...NOTIFY_CATEGORIES.map((c) => {
      const shown = prefs.notifyShow[c] === true;
      const set = (on: boolean) => { prefs.notifyShow = { ...prefs.notifyShow, [c]: on }; showAsk = null; rerender(); };
      return h("div", { class: "row", "data-lock-cat": c }, h("span", {}, t(`privacy.${c}` as Key, lang)),
        h("div", { class: "seg" }, seg(t("more.lock.hide", lang), !shown, () => set(false)), seg(t("more.lock.show", lang), shown, () => { if (shown) return; showAsk = c; rerender(); })),
        showAsk === c ? h("div", { role: "alertdialog", "aria-label": t("priv.show.ask", lang), "data-lock-ask": c }, h("p", {}, t("priv.show.ask", lang)),
          h("button", { class: "btn ghost", type: "button", "data-act": "lock-show-no", style: "min-height:44px", onclick: () => { showAsk = null; rerender(); } }, t("del.cancel", lang)),
          h("button", { class: "btn", type: "button", "data-act": "lock-show-yes", style: "min-height:44px", onclick: () => set(true) }, t("priv.show.yes", lang))) : null);
    }),
    h("p", { class: "muted" }, t("more.lock.preview", lang, { text: notifyText(NEUTRAL_TITLE, lang) })));
}

export function privacyPage(row: string | undefined, lang: Locale): HTMLElement {
  const storage = h("li", { "data-priv-line": "storage" }, t("store.persist.unknown", lang));
  const nav = typeof navigator !== "undefined" ? (navigator.storage as StorageLike | undefined) : undefined;
  void readStorageStatus(nav).then((s) => { storage.textContent = s.persisted === null ? t("store.persist.unknown", lang) : t(s.persisted ? "store.persist.yes" : "store.persist.no", lang); }).catch(() => { /* keep Unknown */ });
  const lines = readout(lang);
  const main = h("main", { class: "scr scr-settings", "data-settings": "privacy" },
    h("a", { href: "#/settings", class: "crumb" }, `← ${t("nav.settings", lang)}`), h("h1", {}, t("set.cat.privacy", lang)),
    h("section", { class: "card", "data-card": "readout", "aria-label": t("priv.readout.title", lang) }, h("h2", { class: "card-h" }, t("priv.readout.title", lang)),
      h("ul", { style: "list-style:none;padding:0;margin:0" },
        ...lines.map((l) => h("li", { style: "margin:6px 0", "data-priv-line": l.id }, h("a", { href: l.href }, l.text), ...(l.weak ? [" · ", h("a", { href: l.href, class: "muted" }, t("priv.turnon", lang))] : []))), storage)),
    consentSection(lang), lockScreenSection(lang),
    h("section", { "data-setting-row": "applock" }, lockCard(lang), h("p", { class: "muted", "data-priv": "forgot" }, t("priv.forgot", lang, { m: num(RESET_WAIT_MIN, lang) }))));
  const el = row ? main.querySelector<HTMLElement>(`[data-setting-row="${row}"]`) : null;
  if (el) { el.classList.add("set-hl"); setTimeout(() => { try { el.scrollIntoView?.({ block: "center" }); } catch { /* ignore */ } }, 0); }
  return main;
}

/** Today: one calm card while real mode is on but the permission is withdrawn. No red, no shame. */
export function pausedCard(lang: Locale): HTMLElement | null {
  if (prefs.dataMode !== "real" || readConsent(consentKv)) return null;
  return h("aside", { class: "card", role: "status", "data-paused": "1" }, h("h2", { class: "card-h" }, t("priv.paused.title", lang)), h("p", {}, t("priv.paused.p", lang)),
    h("a", { href: settingsHash("privacy", "consent"), class: "btn ghost", style: "width:auto;margin:0;min-height:44px" }, t("priv.paused.open", lang)));
}

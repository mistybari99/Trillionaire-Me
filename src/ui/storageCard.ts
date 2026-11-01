// More > Data: whether this device will keep the data, and how much space it uses. Plain words, Unknown when the browser cannot say.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Locale } from "../i18n/registry";
import { consentKv } from "./state";
import { readConsent } from "../core/consent";
import { readStorageStatus, requestPersist, sizeText, type StorageLike } from "../core/storageStatus";

const nav = (): StorageLike | undefined => (typeof navigator !== "undefined" ? (navigator.storage as StorageLike | undefined) : undefined);
/** Fire and forget: call after the real-data tick, at the first real entry and at app start when the tick is already given. */
export function askPersistence(): void { void requestPersist(nav()); }
export function persistIfReal(): void { if (readConsent(consentKv)) askPersistence(); }

export function storageCard(lang: Locale): HTMLElement {
  const status = h("p", { "data-storage": "persisted" }, t("store.checking", lang));
  const usage = h("p", { class: "muted", "data-storage": "usage" }, "");
  const ask = h("button", { class: "btn ghost", type: "button", "data-act": "storage-persist", style: "width:auto;min-height:44px", onclick: async () => { await requestPersist(nav()); void paint(); } }, t("store.ask", lang));
  const paint = async () => {
    const s = await readStorageStatus(nav());
    status.textContent = s.persisted === null ? t("store.persist.unknown", lang) : t(s.persisted ? "store.persist.yes" : "store.persist.no", lang);
    const u = sizeText(s.usage), q = sizeText(s.quota);
    usage.textContent = u === null ? t("store.usage.unknown", lang) : q === null ? t("store.usage", lang, { u }) : t("store.usage.of", lang, { u, q });
    ask.hidden = s.persisted !== false;
  };
  void paint();
  return h("div", { class: "card", "data-card": "storage" }, h("h2", { class: "card-h" }, t("store.title", lang)), h("p", { class: "muted" }, t("store.note", lang)), status, usage, ask);
}

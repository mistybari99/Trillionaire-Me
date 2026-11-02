// The one real-data consent gate (D-B, owner approved 25 Oct 2026). One wording, one tick, one grantConsent call.
// Settings > Privacy and the Demo or real data page both show this same card. Withdraw only turns the permission off:
// new real writes are refused by the core (guardWrite / Store), nothing is deleted.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Locale } from "../i18n/registry";
import { consentKv } from "./state";
import { askPersistence } from "./storageCard";
import { grantConsent, revokeConsent } from "../core/consent";

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
let missingTick = false;

/** The only place in the UI that records the consent tick. First-run and Start-real call it after their own explicit tick. */
export function grantRealConsent(): void { grantConsent(consentKv, new Date().toISOString()); askPersistence(); }

/** Withdraw = revoke only. Real entries stay on the phone; new real writes are refused until the tick is given again. */
export function withdrawRealConsent(): void { revokeConsent(consentKv); }

export function consentGate(lang: Locale): HTMLElement {
  return h("div", { class: "card", "data-consent": "real" },
    h("h2", { class: "card-h" }, t("data.consent.title", lang)),
    h("p", {}, t("data.consent.p1", lang)), h("p", {}, t("data.consent.p2", lang)), h("p", {}, t("data.consent.p3", lang)), h("p", {}, t("data.consent.p4", lang)),
    h("label", { style: "display:flex;gap:8px;align-items:center;margin:8px 0" }, h("input", { type: "checkbox", id: "consent-tick", style: "width:24px;margin:0" }), t("data.consent.tick", lang)),
    h("button", { class: "btn", type: "button", "data-act": "consent", style: "min-height:44px", onclick: () => {
      const tick = document.getElementById("consent-tick") as HTMLInputElement | null;
      if (!tick?.checked) { missingTick = true; rerender(); return; }
      missingTick = false; grantRealConsent(); rerender();
    } }, t("data.consent.btn", lang)),
    missingTick ? h("p", { class: "err", role: "alert" }, t("data.consent.needTick", lang)) : null);
}

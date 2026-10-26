// More > Connections: one card per optional facility. All off by default. Nothing here makes a network call.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { consentKv } from "./state";
import { FACILITY_IDS, type FacilityId } from "../core/ports";
import { clearKey, grantApproval, hasKey, isApproved, isEnabled, saveKey, setEnabled, withdrawApproval } from "../core/connections";
import { createRegistry } from "../adapters/registry";

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
const registry = () => createRegistry(consentKv);
// Which card shows the confirm panel, and which card shows a key message (view state only, never the key).
let confirming: FacilityId | null = null;
let missingTick: FacilityId | null = null;
let keyMsg: { id: FacilityId; key: Key; bad: boolean } | null = null;

function confirmPanel(id: FacilityId, lang: Locale): HTMLElement {
  const tick = h("input", { type: "checkbox", id: `conn-tick-${id}`, "data-conn-tick": id, style: "width:24px;margin:0" }) as HTMLInputElement;
  return h("div", { class: "card", "data-conn-confirm": id, role: "group", "aria-label": t("conn.confirm.title", lang) },
    h("h3", {}, t("conn.confirm.title", lang)),
    h("p", {}, t("conn.confirm.cost", lang)),
    h("p", {}, t("conn.confirm.leave", lang)),
    h("p", {}, t("conn.confirm.real", lang)),
    h("label", { style: "display:flex;gap:8px;align-items:center;margin:8px 0" }, tick, t("conn.confirm.tick", lang)),
    h("button", { class: "btn", type: "button", "data-conn-confirm-btn": id, onclick: () => {
      if (!tick.checked) { missingTick = id; rerender(); return; }
      missingTick = null; confirming = null;
      grantApproval(consentKv, id, new Date().toISOString());
      rerender();
    } }, t("conn.confirm.btn", lang)),
    " ",
    h("button", { class: "btn ghost", type: "button", "data-conn-cancel": id, onclick: () => { confirming = null; missingTick = null; rerender(); } }, t("conn.confirm.cancel", lang)),
    missingTick === id ? h("p", { class: "err", role: "alert" }, t("conn.confirm.needTick", lang)) : null);
}

function keyBox(id: FacilityId, lang: Locale): HTMLElement {
  // Masked field. The saved key is never put back into the page: the field is always empty.
  const input = h("input", { type: "password", id: `conn-key-${id}`, "data-conn-key": id, autocomplete: "off", spellcheck: "false", autocapitalize: "off" }) as HTMLInputElement;
  const msg = keyMsg?.id === id ? h("p", { class: keyMsg.bad ? "err" : "ok-msg", role: "status", "data-conn-key-msg": id }, t(keyMsg.key, lang)) : null;
  return h("div", { "data-conn-keybox": id },
    h("label", { for: `conn-key-${id}` }, t("conn.key.label", lang)),
    input,
    h("p", { class: "muted" }, t("conn.key.hint", lang)),
    h("button", { class: "btn ghost", type: "button", "data-conn-key-save": id, onclick: () => {
      const r = saveKey(consentKv, id, input.value);
      input.value = "";
      keyMsg = { id, key: r.ok ? "conn.key.ok" : (`conn.key.${r.problem}` as Key), bad: !r.ok };
      rerender();
    } }, t("conn.key.save", lang)),
    hasKey(consentKv, id) ? " " : null,
    hasKey(consentKv, id) ? h("button", { class: "btn ghost", type: "button", "data-conn-key-remove": id, onclick: () => { clearKey(consentKv, id); keyMsg = null; rerender(); } }, t("conn.key.remove", lang)) : null,
    h("p", { class: "muted", "data-conn-key-state": id }, t(hasKey(consentKv, id) ? "conn.key.saved" : "conn.key.none", lang)),
    msg);
}

function card(id: FacilityId, lang: Locale): HTMLElement {
  const st = registry().status(id);
  const approved = isApproved(consentKv, id);
  const on = isEnabled(consentKv, id);
  const enable = h("button", { class: "btn", type: "button", "data-conn-enable": id, disabled: !approved, "aria-disabled": String(!approved), onclick: () => { if (setEnabled(consentKv, id, true)) rerender(); } }, t("conn.enable", lang)) as HTMLButtonElement;
  return h("section", { class: "card", "data-conn": id, "data-conn-status": st },
    h("h2", { class: "card-h" }, t(`conn.${id}.name` as Key, lang), " ", h("span", { class: `tag ${st === "connected" ? "ok" : st === "needs_approval" ? "warn" : "off"}`, "data-conn-tag": id }, t(`conn.status.${st}` as Key, lang))),
    h("p", {}, t(`conn.${id}.does` as Key, lang)),
    h("p", { class: "muted" }, t(`conn.${id}.needs` as Key, lang)),
    keyBox(id, lang),
    on ? h("button", { class: "btn ghost", type: "button", "data-conn-disable": id, onclick: () => { setEnabled(consentKv, id, false); rerender(); } }, t("conn.disable", lang)) : enable,
    " ",
    approved
      ? h("button", { class: "btn ghost", type: "button", "data-conn-withdraw": id, onclick: () => { withdrawApproval(consentKv, id); rerender(); } }, t("conn.withdraw", lang))
      : h("button", { class: "btn ghost", type: "button", "data-conn-approve": id, onclick: () => { confirming = id; missingTick = null; rerender(); } }, t("conn.approve.btn", lang)),
    approved ? null : h("p", { class: "muted" }, t("conn.enable.hint", lang)),
    on ? h("p", { class: "muted" }, t("conn.stubNote", lang)) : null,
    confirming === id && !approved ? confirmPanel(id, lang) : null);
}

export function connectionsScreen(lang: Locale): HTMLElement {
  return h("main", { class: "scr scr-connections" },
    h("a", { href: "#/more", class: "crumb" }, `← ${t("more.title", lang)}`),
    h("h1", {}, t("conn.title", lang)),
    h("p", { class: "sub" }, t("conn.intro", lang)),
    ...FACILITY_IDS.map((id) => card(id, lang)));
}

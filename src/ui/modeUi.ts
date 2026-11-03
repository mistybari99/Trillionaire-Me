// First-run choice, demo banner, "delete demo?" ask and the Only demo / Only real switch (owner rule 25 Oct 2026).
// DEMO data is not permanent. Nothing is deleted without an explicit confirm, and real data is never touched.
import { logo3d } from "./logo";
import { h } from "./dom";
import { t } from "../i18n/t";
import { LOCALES, type Locale } from "../i18n/registry";
import { grantRealConsent } from "./consentGate";
import { recordDay, shouldAskDeleteDemo, type DataMode } from "../core/dataMode";
import { todayIso } from "../core/habits";
import { prefs, store } from "./state";
import { StoreRepo } from "../adapters/storeRepo";
import { createBackup } from "../core/backup";
import { realConsent } from "./entry";
import { resetOnboard } from "./onboardUi";
import { langMenu } from "./langMenu";

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
const L = () => prefs.lang;

// Per page view only. Nothing here is stored.
let firstRealStep = false;
let needTick = false;
let switchNeedConsent = false;

/** Counts this day as one "opened in demo mode" day. Called on every render in explicit demo mode. */
export function trackDemoDay(): void {
  if (prefs.dataModeChoice !== "demo") return;
  const today = todayIso();
  const days = prefs.demoDays;
  if (days.includes(today)) return;
  prefs.demoDays = recordDay(days, today);
}

export const askDue = (): boolean => shouldAskDeleteDemo({ mode: prefs.dataModeChoice, days: prefs.demoDays, askedOn: prefs.demoAskedOn, today: todayIso() });

/** Opens the delete-demo confirm (the "Start real now" buttons call this). */
export const START_REAL_HASH = "#/settings/data/start-real";
export function openStartReal(): void { needTick = false; if (location.hash === START_REAL_HASH) rerender(); else location.hash = START_REAL_HASH; }

/** Deletes DEMO records only, turns real on, keeps language and the other settings. Call only after the explicit confirm. */
export function confirmStartReal(ticked: boolean): boolean {
  if (!realConsent() && !ticked) { needTick = true; rerender(); return false; }
  store.demo.clear(); // demo namespace only: real records are never listed here
  if (!realConsent()) { grantRealConsent(); }
  prefs.dataMode = "real";
  needTick = false;
  if (location.hash === "#/settings/data") rerender(); else location.hash = "#/settings/data";
  return true;
}

/** "Keep demo": nothing is deleted. The ask is not shown again today. */
export function declineStartReal(): void { prefs.demoAskedOn = todayIso(); needTick = false; rerender(); }
/** Cancel on the Start-real page: nothing is deleted; the daily ask waits for today. */
export function cancelStartReal(): void { prefs.demoAskedOn = todayIso(); needTick = false; location.hash = "#/settings/data"; }

/** Switch between Only demo and Only real. Real needs the consent tick first. */
export function switchMode(m: DataMode): void {
  if (m === "real" && !realConsent()) { switchNeedConsent = true; rerender(); return; }
  switchNeedConsent = false; prefs.dataMode = m; rerender();
}

const tickRow = (lang: Locale) => h("label", { style: "display:flex;gap:8px;align-items:center;margin:8px 0" },
  h("input", { type: "checkbox", id: "mode-tick", style: "width:24px;margin:0" }), t("data.consent.tick", lang));
const ticked = () => (document.getElementById("mode-tick") as HTMLInputElement | null)?.checked === true;

function langButtons(): HTMLElement {
  return h("div", { class: "seg", role: "group", "aria-label": t("more.language", L()) }, ...(["en", "bn"] as Locale[]).map((l) =>
    h("button", { type: "button", "data-lang": l, "aria-pressed": String(prefs.lang === l), onclick: () => { prefs.lang = l; rerender(); } }, LOCALES[l].endonym)));
}

/** First-run choice. Shown once per device, before anything else. */
export function firstRunScreen(): HTMLElement {
  const lang = L();
  const body = firstRealStep
    ? h("div", { class: "card", "data-first": "real-confirm" }, h("h2", { class: "card-h" }, t("mode.real.confirm.title", lang)), ...(["p1", "p2", "p3", "p4"] as const).map((k) => h("p", {}, t(`data.consent.${k}`, lang))), tickRow(lang),
        needTick ? h("p", { class: "need", role: "alert" }, t("data.consent.needTick", lang)) : null,
        h("button", { class: "btn", type: "button", "data-act": "first-real-yes", onclick: () => {
          if (!ticked()) { needTick = true; rerender(); return; }
          if (!realConsent()) { grantRealConsent(); }
          prefs.dataMode = "real"; firstRealStep = false; needTick = false; resetOnboard(); prefs.onboard = "pending"; location.hash = "#/start"; rerender();
        } }, t("mode.real.confirm.btn", lang)),
        h("button", { class: "btn ghost", type: "button", "data-act": "first-real-back", onclick: () => { firstRealStep = false; needTick = false; rerender(); } }, t("mode.real.back", lang)))
    : h("div", {},
        h("div", { class: "card", "data-first": "demo" }, h("h2", { class: "card-h" }, t("mode.first.demo", lang)), h("p", { class: "muted" }, t("mode.first.demo.note", lang)),
          h("button", { class: "btn ghost", type: "button", "data-act": "first-demo", onclick: () => { prefs.dataMode = "demo"; resetOnboard(); prefs.onboard = "pending"; location.hash = "#/start"; rerender(); } }, t("mode.first.demo", lang))),
        h("div", { class: "card", "data-first": "real" }, h("h2", { class: "card-h" }, t("mode.first.real", lang)), h("p", { class: "muted" }, t("mode.first.real.note", lang)),
          h("button", { class: "btn", type: "button", "data-act": "first-real", onclick: () => { firstRealStep = true; needTick = false; rerender(); } }, t("mode.first.real", lang))));
  return h("main", { class: "scr scr-first", id: "content" }, h("div", { class: "top" }, h("span", {}, t("app.title", lang)), h("span", { class: "right" }, langMenu(lang))), langButtons(), logo3d(112, lang, { animate: true }), h("h1", {}, t("mode.first.title", lang)), h("p", { class: "muted", "data-onb-step": "1" }, t("onb.step", lang, { n: 1 })), h("p", { class: "sub" }, t("mode.first.intro", lang)), body);
}

function confirmCard(lang: Locale): HTMLElement {
  return h("div", { class: "card", role: "alertdialog", "aria-label": t("mode.del.title", lang), "data-mode-confirm": "1" },
    h("h2", { class: "card-h" }, t("mode.del.title", lang)), h("p", {}, t("mode.del.p", lang)),
    realConsent() ? null : tickRow(lang),
    needTick ? h("p", { class: "need", role: "alert" }, t("data.consent.needTick", lang)) : null,
    h("button", { class: "btn", type: "button", "data-act": "demo-delete-confirm", onclick: () => { confirmStartReal(realConsent() || ticked()); } }, t("mode.del.btn", lang)),
    h("button", { class: "btn ghost", type: "button", "data-act": "demo-delete-cancel", onclick: cancelStartReal }, t("mode.del.cancel", lang)));
}

/** Cards shown above every screen in explicit demo mode: the ask (if due) and the Demo banner. */
export function demoPanels(): HTMLElement[] {
  if (prefs.dataModeChoice !== "demo") return [];
  const lang = L(); const out: HTMLElement[] = [];
  const inSettings = /^#\/settings(\/|$)/.test(location.hash); // Settings keeps the first screen free: one-line banner, no daily ask
  if (!inSettings && askDue()) out.push(h("div", { class: "card", role: "status", "data-mode-ask": "1" }, h("h2", { class: "card-h" }, t("mode.ask.title", lang)), h("p", {}, t("mode.ask.p", lang)),
    h("button", { class: "btn", type: "button", "data-act": "demo-ask-yes", onclick: openStartReal }, t("mode.ask.yes", lang)),
    h("button", { class: "btn ghost", type: "button", "data-act": "demo-ask-no", onclick: declineStartReal }, t("mode.ask.no", lang))));
  if (inSettings) { out.push(h("div", { class: "note", role: "status", "data-demo-banner": "1", "data-compact": "1", style: "padding:6px 12px" }, h("p", { style: "margin:0" }, h("b", {}, t("mode.banner", lang))))); return out; }
  out.push(h("div", { class: "note", role: "status", "data-demo-banner": "1" }, h("p", {}, h("b", {}, t("mode.banner", lang))),
    h("button", { class: "btn ghost", type: "button", "data-act": "start-real-banner", style: "width:auto;margin:6px 0 0;min-height:44px", onclick: openStartReal }, t("mode.banner.start", lang))));
  return out;
}

/** Mode switch card for More > Demo & real data. */
export function modeSwitchCard(): HTMLElement {
  const lang = L(); const cur = prefs.dataMode;
  const seg = (m: DataMode, key: "mode.switch.demo" | "mode.switch.real") => h("button", { type: "button", "data-mode-set": m, "aria-pressed": String(cur === m), onclick: () => switchMode(m) }, t(key, lang));
  return h("div", { class: "card", "data-mode-switch": cur },
    h("h2", { class: "card-h" }, t("mode.switch.title", lang)),
    h("div", { class: "seg", role: "group", "aria-label": t("mode.switch.title", lang) }, seg("demo", "mode.switch.demo"), seg("real", "mode.switch.real")),
    h("p", {}, t(cur === "real" ? "mode.state.real" : "mode.state.demo", lang)),
    h("p", { class: "muted" }, t("mode.switch.note", lang)),
    switchNeedConsent && !realConsent() ? h("p", { class: "need", role: "alert" }, t("mode.switch.needConsent", lang)) : null,
    cur === "demo" ? h("button", { class: "btn", type: "button", "data-act": "start-real-now", onclick: openStartReal }, t("mode.start.btn", lang)) : null);
}

/** Settings > Demo or real data > Start real now: a full page. Optional demo copy first, then the explicit tick and confirm. */
export function startRealPage(lang: Locale): HTMLElement {
  let saved = false;
  const msg = h("p", { class: "ok-msg", role: "status", "data-start": "copied" });
  return h("main", { class: "scr scr-settings", "data-settings": "start-real" },
    h("a", { href: "#/settings/data", class: "crumb" }, `← ${t("set.cat.data", lang)}`), h("h1", {}, t("set.row.startreal", lang)),
    h("p", { class: "sub" }, t("del.intro", lang)),
    h("div", { class: "card" }, h("h2", { class: "card-h" }, t("del.demo.copy", lang)),
      h("button", { class: "btn ghost", type: "button", "data-act": "start-demo-copy", style: "min-height:44px", onclick: async () => {
        const b = await createBackup(new StoreRepo(store), "demo");
        const a = h("a", { href: URL.createObjectURL(new Blob([JSON.stringify(b)], { type: "application/json" })), download: `tm-demo-backup-${b.createdAt.slice(0, 10)}.json` });
        document.body.append(a); a.click(); a.remove(); saved = true; msg.textContent = saved ? t("del.demo.copied", lang) : "";
      } }, t("del.demo.copy", lang)), msg),
    confirmCard(lang));
}

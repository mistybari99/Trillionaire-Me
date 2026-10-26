// First-run choice, demo banner, "delete demo?" ask and the Only demo / Only real switch (owner rule 25 Oct 2026).
// DEMO data is not permanent. Nothing is deleted without an explicit confirm, and real data is never touched.
import { logo3d } from "./logo";
import { h } from "./dom";
import { t } from "../i18n/t";
import { LOCALES, type Locale } from "../i18n/registry";
import { grantConsent } from "../core/consent";
import { recordDay, shouldAskDeleteDemo, type DataMode } from "../core/dataMode";
import { todayIso } from "../core/habits";
import { consentKv, prefs, store } from "./state";
import { realConsent } from "./entry";
import { langMenu } from "./langMenu";

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
const L = () => prefs.lang;

// Per page view only. Nothing here is stored.
let firstRealStep = false;
let startRealOpen = false;
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
export function openStartReal(): void { startRealOpen = true; needTick = false; rerender(); }

/** Deletes DEMO records only, turns real on, keeps language and the other settings. Call only after the explicit confirm. */
export function confirmStartReal(ticked: boolean): boolean {
  if (!realConsent() && !ticked) { needTick = true; rerender(); return false; }
  store.demo.clear(); // demo namespace only: real records are never listed here
  if (!realConsent()) grantConsent(consentKv, new Date().toISOString());
  prefs.dataMode = "real";
  startRealOpen = false; needTick = false;
  rerender();
  return true;
}

/** "Keep demo": nothing is deleted. The ask is not shown again today. */
export function declineStartReal(): void { prefs.demoAskedOn = todayIso(); startRealOpen = false; needTick = false; rerender(); }

/** Switch between Only demo and Only real. Real needs the consent tick first. */
export function switchMode(m: DataMode): void {
  if (m === "real" && !realConsent()) { switchNeedConsent = true; rerender(); return; }
  switchNeedConsent = false; prefs.dataMode = m; rerender();
}

const tickRow = (lang: Locale) => h("label", { style: "display:flex;gap:8px;align-items:center;margin:8px 0" },
  h("input", { type: "checkbox", id: "mode-tick", style: "width:24px;margin:0" }), t("mode.real.confirm.tick", lang));
const ticked = () => (document.getElementById("mode-tick") as HTMLInputElement | null)?.checked === true;

function langButtons(): HTMLElement {
  return h("div", { class: "seg", role: "group", "aria-label": "Language" }, ...(["en", "bn"] as Locale[]).map((l) =>
    h("button", { type: "button", "data-lang": l, "aria-pressed": String(prefs.lang === l), onclick: () => { prefs.lang = l; rerender(); } }, LOCALES[l].endonym)));
}

/** First-run choice. Shown once per device, before anything else. */
export function firstRunScreen(): HTMLElement {
  const lang = L();
  const body = firstRealStep
    ? h("div", { class: "card", "data-first": "real-confirm" }, h("h2", { class: "card-h" }, t("mode.real.confirm.title", lang)), h("p", {}, t("mode.real.confirm.p", lang)), tickRow(lang),
        needTick ? h("p", { class: "err", role: "alert" }, t("mode.real.needTick", lang)) : null,
        h("button", { class: "btn", type: "button", "data-act": "first-real-yes", onclick: () => {
          if (!ticked()) { needTick = true; rerender(); return; }
          if (!realConsent()) grantConsent(consentKv, new Date().toISOString());
          prefs.dataMode = "real"; firstRealStep = false; needTick = false; location.hash = "#/today"; rerender();
        } }, t("mode.real.confirm.btn", lang)),
        h("button", { class: "btn ghost", type: "button", "data-act": "first-real-back", onclick: () => { firstRealStep = false; needTick = false; rerender(); } }, t("mode.real.back", lang)))
    : h("div", {},
        h("div", { class: "card", "data-first": "demo" }, h("h2", { class: "card-h" }, t("mode.first.demo", lang)), h("p", { class: "muted" }, t("mode.first.demo.note", lang)),
          h("button", { class: "btn ghost", type: "button", "data-act": "first-demo", onclick: () => { prefs.dataMode = "demo"; location.hash = "#/today"; rerender(); } }, t("mode.first.demo", lang))),
        h("div", { class: "card", "data-first": "real" }, h("h2", { class: "card-h" }, t("mode.first.real", lang)), h("p", { class: "muted" }, t("mode.first.real.note", lang)),
          h("button", { class: "btn", type: "button", "data-act": "first-real", onclick: () => { firstRealStep = true; needTick = false; rerender(); } }, t("mode.first.real", lang))));
  return h("main", { class: "scr scr-first", id: "content" }, h("div", { class: "top" }, h("span", {}, t("app.title", lang)), h("span", { class: "right" }, langMenu(lang))), langButtons(), logo3d(112, lang, { animate: true }), h("h1", {}, t("mode.first.title", lang)), h("p", { class: "sub" }, t("mode.first.intro", lang)), body);
}

function confirmCard(lang: Locale): HTMLElement {
  return h("div", { class: "card", role: "alertdialog", "aria-label": t("mode.del.title", lang), "data-mode-confirm": "1" },
    h("h2", { class: "card-h" }, t("mode.del.title", lang)), h("p", {}, t("mode.del.p", lang)),
    realConsent() ? null : tickRow(lang),
    needTick ? h("p", { class: "err", role: "alert" }, t("mode.real.needTick", lang)) : null,
    h("button", { class: "btn", type: "button", "data-act": "demo-delete-confirm", onclick: () => { confirmStartReal(realConsent() || ticked()); } }, t("mode.del.btn", lang)),
    h("button", { class: "btn ghost", type: "button", "data-act": "demo-delete-cancel", onclick: declineStartReal }, t("mode.del.cancel", lang)));
}

/** Cards shown above every screen in explicit demo mode: the confirm (if open), the ask (if due) and the Demo banner. */
export function demoPanels(): HTMLElement[] {
  if (prefs.dataModeChoice !== "demo") return [];
  const lang = L(); const out: HTMLElement[] = [];
  if (startRealOpen) out.push(confirmCard(lang));
  else if (askDue()) out.push(h("div", { class: "card", role: "status", "data-mode-ask": "1" }, h("h2", { class: "card-h" }, t("mode.ask.title", lang)), h("p", {}, t("mode.ask.p", lang)),
    h("button", { class: "btn", type: "button", "data-act": "demo-ask-yes", onclick: openStartReal }, t("mode.ask.yes", lang)),
    h("button", { class: "btn ghost", type: "button", "data-act": "demo-ask-no", onclick: declineStartReal }, t("mode.ask.no", lang))));
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
    switchNeedConsent && !realConsent() ? h("p", { class: "err", role: "alert" }, t("mode.switch.needConsent", lang)) : null,
    cur === "demo" ? h("button", { class: "btn", type: "button", "data-act": "start-real-now", onclick: openStartReal }, t("mode.start.btn", lang)) : null);
}

// Checks for a new app version on every open (and when online / when the app comes back to the front) and shows a small calm banner.
// The new service worker waits; the banner's button tells it to take over and the page reloads once. Never automatic. See src/core/updateBanner.ts.
import { h } from "./dom";
import { t } from "../i18n/t";
import { prefs } from "./state";
import { hasTypedText, nextPhase, type UpdateEvent, type UpdatePhase } from "../core/updateBanner";

export interface Reg extends EventTarget { waiting: ServiceWorker | null; installing: ServiceWorker | null; update(): Promise<unknown> }
export interface UpdaterDeps { reg: Reg; sw: EventTarget & { controller: unknown }; doc: Document; reload: () => void; now: () => number }

export interface Updater { phase(): UpdatePhase; check(force?: boolean): void; tap(): void; banner(): HTMLElement | null }

export function createUpdater(d: UpdaterDeps): Updater {
  let phase: UpdatePhase = "idle"; let last = 0; let el: HTMLElement | null = null;
  const draw = () => {
    if (phase === "idle") { el?.remove(); el = null; return; }
    const lang = prefs.lang;
    const text = phase === "confirm" ? t("upd.confirm", lang) : phase === "updating" ? t("upd.updating", lang) : t("upd.ready", lang);
    const next = h("div", { id: "update-banner", class: "update-banner", role: "status", "data-update": phase },
      h("span", {}, text), " ",
      phase === "updating" ? null : h("button", { class: "btn", type: "button", "data-act": "update-now", onclick: () => api.tap() }, t(phase === "confirm" ? "upd.again" : "upd.now", lang)));
    el?.remove(); el = next as HTMLElement; d.doc.body.appendChild(el);
  };
  const step = (ev: UpdateEvent) => { const n = nextPhase(phase, ev, hasTypedText(d.doc)); if (n !== phase) { phase = n; draw(); } };
  const seeWaiting = () => { if (d.reg.waiting && d.sw.controller) step("waiting"); };
  d.reg.addEventListener("updatefound", () => {
    const w = d.reg.installing; if (!w) return;
    w.addEventListener("statechange", () => { if (w.state === "installed") seeWaiting(); });
  });
  d.sw.addEventListener("controllerchange", () => { if (phase === "updating") d.reload(); });
  seeWaiting();
  const api: Updater = {
    phase: () => phase,
    banner: () => el,
    check(force = false) { const n = d.now(); if (!force && n - last < 60_000) return; last = n; void d.reg.update().then(seeWaiting).catch(() => { /* offline: try again next time */ }); },
    tap() {
      const before = phase; step("tap");
      if (before !== "idle" && phase === "updating") {
        const w = d.reg.waiting;
        if (w) w.postMessage({ type: "SKIP_WAITING" }); else d.reload();
      }
    },
  };
  return api;
}

/** Browser wiring: register, check at open, when online and when the app is shown again. */
export function installUpdater(): void {
  if (!("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).then((reg) => {
    const u = createUpdater({ reg, sw: navigator.serviceWorker, doc: document, reload: () => location.reload(), now: () => Date.now() });
    u.check(true);
    window.addEventListener("online", () => u.check());
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") u.check(); });
  }).catch(() => { /* the app still works without a worker */ });
}

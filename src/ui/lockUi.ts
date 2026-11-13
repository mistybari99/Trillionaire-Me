// Optional app lock UI: lock screen (keypad + keyboard), More > Data card, lock on hide. No network. Off by default.
import { h } from "./dom";
import { showNeed } from "./components";
import { t } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { consentKv, prefs } from "./state";
import { AUTO_CHOICES, PIN_MAX, RESET_WAIT_MIN, finishForgot, forgotReadyAt, lockEnabled, pinProblem, readLock, removeWithPin, setAuto, setPin, shouldLockAfterHide, startForgot, verifyPin } from "../core/appLock";

let locked = lockEnabled(consentKv); // a phone with the lock on starts locked
let hiddenAt = 0;
let forgotOpen = false;
const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
/** The vault passphrase was just entered: the screen lock does not ask again at start. */
export function markUnlocked(): void { locked = false; }
export const isLocked = (): boolean => locked && lockEnabled(consentKv);
export function lockNow(): void { if (lockEnabled(consentKv)) { locked = true; forgotOpen = false; rerender(); } }

/** Call once: locks when the app is hidden (at once, or after N minutes away). */
export function initLock(): void {
  document.addEventListener("visibilitychange", () => {
    const c = readLock(consentKv); if (!c) return;
    if (document.visibilityState === "hidden") { hiddenAt = Date.now(); if (c.auto === 0) lockNow(); }
    else if (shouldLockAfterHide(c.auto, hiddenAt || Date.now(), Date.now())) lockNow();
  });
}

const hhmm = (ms: number) => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

export function lockScreen(): HTMLElement {
  const lang = prefs.lang;
  const input = h("input", { id: "lock-pin", type: "password", inputmode: "numeric", pattern: "[0-9]*", autocomplete: "off", maxlength: String(PIN_MAX), "data-lock": "pin", "aria-describedby": "lock-count lock-msg", style: "min-height:48px;font-size:1.25rem;text-align:center;letter-spacing:.3em" }) as HTMLInputElement;
  const count = h("p", { id: "lock-count", class: "muted", "data-lock": "count", role: "status" }, t("lock.screen.count", lang, { n: 0 }));
  const msg = h("p", { id: "lock-msg", role: "alert", "data-lock": "msg" });
  const update = () => { count.textContent = t("lock.screen.count", lang, { n: input.value.length }); };
  input.addEventListener("input", () => { input.value = input.value.replace(/\D/g, "").slice(0, PIN_MAX); update(); });
  const press = (d: string) => { if (input.value.length < PIN_MAX) { input.value += d; update(); } input.focus(); };
  const submit = async (e?: Event) => {
    e?.preventDefault();
    const r = await verifyPin(consentKv, input.value, Date.now());
    if (r.ok) { locked = false; forgotOpen = false; rerender(); return; }
    input.value = ""; update();
    msg.textContent = r.reason === "wait" ? t("lock.err.wait", lang, { s: r.waitSeconds ?? 30 }) : t("lock.err.notright", lang);
  };
  const keyBtn = (label: string, aria: string | undefined, act: string, fn: () => void, extra = "") =>
    h("button", { class: "btn ghost", type: "button", "data-act": act, ...(aria ? { "aria-label": aria } : {}), style: `width:100%;margin:0;min-height:56px;font-size:1.25rem;${extra}`, onclick: fn }, label);
  const pad = h("div", { style: "display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0" },
    ...["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => keyBtn(d, undefined, `lock-key-${d}`, () => press(d))),
    keyBtn("⌫", t("lock.screen.del", lang), "lock-del", () => { input.value = input.value.slice(0, -1); update(); input.focus(); }),
    keyBtn("0", undefined, "lock-key-0", () => press("0")),
    h("button", { class: "btn", type: "submit", "data-act": "lock-open", style: "width:100%;margin:0;min-height:56px" }, t("lock.screen.open", lang)));
  const main = h("main", { "data-lock-screen": "1" },
    h("h1", {}, t("lock.screen.title", lang)),
    h("form", { onsubmit: (e: Event) => void submit(e) }, h("label", { for: "lock-pin" }, t("lock.screen.label", lang)), input, count, pad, msg),
    h("button", { class: "btn ghost", type: "button", "data-act": "lock-forgot", onclick: () => { forgotOpen = !forgotOpen; if (forgotOpen) startForgot(consentKv, Date.now()); rerender(); } }, t("lock.forgot", lang)),
    forgotOpen ? forgotPanel(lang) : null);
  setTimeout(() => input.focus(), 0);
  return main;
}

function forgotPanel(lang: Locale): HTMLElement {
  const ready = forgotReadyAt(consentKv) ?? Date.now() + RESET_WAIT_MIN * 60_000;
  const can = Date.now() >= ready;
  const msg = h("p", { role: "alert", class: "err", "data-lock": "forgot-msg" });
  const tick = h("input", { type: "checkbox", id: "lock-forgot-tick", "data-lock": "forgot-tick" }) as HTMLInputElement;
  return h("div", { class: "card", "data-lock": "forgot" }, h("h2", { class: "card-h" }, t("lock.forgot.title", lang)),
    h("p", {}, t("lock.forgot.p1", lang, { m: RESET_WAIT_MIN })),
    can ? h("p", {}, t("lock.forgot.ready", lang)) : h("p", {}, t("lock.forgot.p2", lang, { when: hhmm(ready) })),
    can ? h("label", { for: "lock-forgot-tick" }, tick, " ", t("lock.forgot.tick", lang)) : null,
    can ? h("button", { class: "btn", type: "button", "data-act": "lock-forgot-remove", onclick: () => {
      if (!tick.checked) { showNeed(msg, t("lock.forgot.needTick", lang)); return; }
      if (finishForgot(consentKv, Date.now(), true)) { locked = false; forgotOpen = false; rerender(); }
    } }, t("lock.forgot.btn", lang)) : null, msg,
    h("button", { class: "btn ghost", type: "button", "data-act": "lock-forgot-back", onclick: () => { forgotOpen = false; rerender(); } }, t("lock.forgot.back", lang)));
}

let cardNote: { key: Key; bad: boolean } | null = null;
export function lockCard(lang: Locale): HTMLElement {
  const on = lockEnabled(consentKv);
  const msg = h("p", { role: "status", "data-lock": "card-msg" });
  const say = (key: Key, bad: boolean, args?: Record<string, string | number>) => { msg.className = bad ? "err" : "ok-msg"; msg.textContent = t(key, lang, args); };
  if (cardNote) { say(cardNote.key, cardNote.bad); cardNote = null; }
  const field = (id: string, label: Key) => h("input", { id, type: "password", inputmode: "numeric", pattern: "[0-9]*", autocomplete: "off", maxlength: String(PIN_MAX), "aria-label": t(label, lang), "data-lock": id }) as HTMLInputElement;
  if (!on) {
    const a = field("lock-new", "lock.pin"), b = field("lock-new2", "lock.pin2");
    return h("div", { class: "card", "data-card": "applock" }, h("h2", { class: "card-h" }, t("lock.title", lang)), h("p", { class: "muted" }, t("lock.note", lang)),
      h("label", { for: "lock-new" }, t("lock.pin", lang)), a, h("label", { for: "lock-new2" }, t("lock.pin2", lang)), b,
      h("button", { class: "btn", type: "button", "data-act": "lock-set", onclick: async () => {
        const p = pinProblem(a.value, b.value); if (p) return say(p === "format" ? "lock.err.format" : "lock.err.mismatch", true);
        await setPin(consentKv, a.value, b.value); locked = false; cardNote = { key: "lock.saved", bad: false }; rerender();
      } }, t("lock.set", lang)), msg);
  }
  const off = field("lock-off-pin", "lock.offPin");
  const sel = h("select", { id: "lock-auto", "data-lock": "auto", onchange: (e: Event) => setAuto(consentKv, Number((e.target as HTMLSelectElement).value)) },
    ...AUTO_CHOICES.map((n) => h("option", { value: String(n), ...(readLock(consentKv)?.auto === n ? { selected: true } : {}) }, t(`lock.auto.${n}` as Key, lang))));
  return h("div", { class: "card", "data-card": "applock" }, h("h2", { class: "card-h" }, t("lock.title", lang)), h("p", {}, t("lock.on", lang)),
    h("label", { for: "lock-auto" }, t("lock.auto", lang)), sel,
    h("button", { class: "btn ghost", type: "button", "data-act": "lock-now", onclick: () => lockNow() }, t("lock.now", lang)),
    h("label", { for: "lock-off-pin" }, t("lock.offPin", lang)), off,
    h("button", { class: "btn ghost", type: "button", "data-act": "lock-off", onclick: async () => {
      const r = await removeWithPin(consentKv, off.value, Date.now());
      if (r.ok) { cardNote = { key: "lock.removed", bad: false }; rerender(); }
      else say(r.reason === "wait" ? "lock.err.wait" : "lock.err.notright", true, { s: r.ok ? 0 : r.waitSeconds ?? 30 });
    } }, t("lock.off", lang)), msg);
}

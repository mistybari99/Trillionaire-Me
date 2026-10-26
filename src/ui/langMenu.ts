// Language icon for the top bar: opens a small menu with English / বাংলা / Mix. Same pref as More > Language.
import { h } from "./dom";
import { t } from "../i18n/t";
import { LOCALES, LOCALE_ORDER, type Locale } from "../i18n/registry";
import { applyPrefs, prefs } from "./state";

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
const GLOBE = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3z"/></svg>';

let docClose: ((e: Event) => void) | null = null;
function stopDocListener() { if (docClose) { document.removeEventListener("click", docClose, true); docClose = null; } }

export function langMenu(lang: Locale): HTMLElement {
  const label = t("lang.menu", lang);
  const wrap = h("span", { class: "lang-wrap" });
  const btn = h("button", { class: "lang-btn", type: "button", "data-act": "lang-open", "aria-label": label, "aria-haspopup": "true", "aria-expanded": "false" });
  btn.innerHTML = GLOBE;
  const menu = h("div", { class: "lang-menu", role: "group", "aria-label": label, "data-lang-menu": "1", hidden: "" },
    ...LOCALE_ORDER.map((c) => h("button", { class: "lang-item", type: "button", "data-lang": c, "aria-pressed": String(prefs.lang === c), onclick: () => {
      stopDocListener();
      prefs.lang = c; applyPrefs(); rerender(); // same as More > Language; render() keeps the screen and scroll
      (document.querySelector('[data-act="lang-open"]') as HTMLElement | null)?.focus();
    } }, h("span", { class: "lang-check", "aria-hidden": "true" }, prefs.lang === c ? "✓" : ""), LOCALES[c].endonym)));
  const close = (focus: boolean) => { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); stopDocListener(); if (focus) btn.focus(); };
  btn.addEventListener("click", () => {
    if (!menu.hidden) { close(true); return; }
    menu.hidden = false; btn.setAttribute("aria-expanded", "true");
    docClose = (e) => { if (!wrap.contains(e.target as Node)) close(false); };
    document.addEventListener("click", docClose, true);
    (menu.querySelector('[aria-pressed="true"]') as HTMLElement | null)?.focus();
  });
  wrap.addEventListener("keydown", (e) => { if ((e as KeyboardEvent).key === "Escape" && !menu.hidden) { e.stopPropagation(); close(true); } });
  wrap.append(btn, menu);
  return wrap;
}

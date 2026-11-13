// Detailed / Compact chooser shared by the list and card screens. Same records in both views; the choice is kept per screen.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { screenView, setScreenView, type ViewScreen } from "./state";

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));

export function viewBar(screen: ViewScreen, lang: Locale): HTMLElement {
  const cur = screenView(screen);
  const seg = (v: "full" | "compact") => h("button", { type: "button", "data-view-opt": v, "aria-pressed": String(cur === v), onclick: () => { setScreenView(screen, v); rerender(); } }, t(`view.${v}` as Key, lang));
  return h("div", { class: "seg", role: "group", "data-view-bar": screen, "aria-label": t("view.label", lang) }, seg("full"), seg("compact"));
}

/** Puts the chooser right after the page title (and its intro line). In compact view the page is tagged so CSS shows a denser list; no record is added or hidden. */
export function withView(screen: ViewScreen, lang: Locale, main: HTMLElement): HTMLElement {
  const h1 = main.querySelector("h1");
  let anchor: Element | null = h1;
  if (h1 && h1.nextElementSibling?.classList.contains("sub")) anchor = h1.nextElementSibling;
  const bar = viewBar(screen, lang);
  if (anchor) anchor.after(bar); else main.prepend(bar);
  if (screenView(screen) === "compact") { main.setAttribute("data-view", "compact"); main.classList.add("view-compact"); }
  return main;
}

import { h } from "./dom";
import { tb } from "../i18n/t";
import type { Locale } from "../i18n/registry";
import { getPresentationPreferences } from "./presentationPreferences";
import { getHelpTopic, renderGuide, type HelpTopicId, type HelpContext } from "./helpTopics";
import { renderOwnMap } from "./helpOwnMaps";
import { closeTransientOverlay, openTransientOverlay } from "./overlayCoordinator";

export type { HelpContext } from "./helpTopics";
let sequence = 0;
const copy = (lang: Locale, en: string, bn: string) => lang === "en" ? en : bn;
/** A separate sibling control: never place this button inside another link or label. */
export function helpTrigger(topic: HelpTopicId, lang: Locale, context?: HelpContext, sourceNotes: HTMLElement[] = []): HTMLElement {
  const id = `tm-help-${++sequence}`;
  const title = tb(getHelpTopic(topic).title, lang);
  const wrapper = h("div", { class: "help-anchor" });
  const button = h("button", { type: "button", class: "help-trigger", "data-help-topic": topic,
    "aria-label": copy(lang, `Help: ${title}`, `সহায়তা: ${title}`), "aria-expanded": "false", "aria-controls": id },
    h("span", { "aria-hidden": "true" }, "i"));
  wrapper.append(button);
  let opened = false;
  button.addEventListener("click", () => {
    if (opened) { closeTransientOverlay("dismiss"); return; }
    const prefs = getPresentationPreferences();
    const body = h("div", { class: "help-body", id: `${id}-body` });
    const close = h("button", { type: "button", class: "help-close", "aria-label": copy(lang, "Close help", "সহায়তা বন্ধ করুন"), onclick: () => closeTransientOverlay("dismiss") }, copy(lang, "Close", "বন্ধ করুন"));
    const heading = h("h2", { id: `${id}-title` }, title);
    const panel = h("section", { class: "context-help", id, "aria-labelledby": `${id}-title` }, h("div", { class: "help-heading" }, heading, close));
    const showGuide = () => {
      body.replaceChildren(renderGuide(topic, lang, prefs.helpVisuals), ...sourceNotes.map((note) => note.cloneNode(true)));
      body.dataset.helpView = "guide";
    };
    if (prefs.helpContent === "guide-and-mine") {
      const guide = h("button", { type: "button", role: "tab", id: `${id}-guide`, "aria-controls": body.id }, copy(lang, "Guide", "নির্দেশনা"));
      const mine = h("button", { type: "button", role: "tab", id: `${id}-mine`, "aria-controls": body.id }, copy(lang, "My map", "আমার মানচিত্র"));
      const tabs = [guide, mine];
      const select = (index: number) => {
        tabs.forEach((tab, i) => { tab.setAttribute("aria-selected", String(index === i)); tab.tabIndex = index === i ? 0 : -1; });
        body.setAttribute("aria-labelledby", tabs[index]!.id);
        if (index === 0) showGuide();
        else { body.replaceChildren(renderOwnMap(topic, lang, context)); body.dataset.helpView = "mine"; }
      };
      tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => select(index));
        tab.addEventListener("keydown", (event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - index;
          select(next); tabs[next]!.focus();
        });
      });
      body.setAttribute("role", "tabpanel");
      panel.append(h("div", { class: "help-tabs", role: "tablist", "aria-label": title }, ...tabs));
      select(0);
    } else showGuide();
    panel.append(body);
    const sheet = prefs.helpPlacement === "sheet";
    let portal: HTMLElement | undefined;
    let dialog: HTMLDialogElement | undefined;
    let inerted: HTMLElement | undefined;
    let wasInert = false;
    const clear = () => {
      opened = false; button.setAttribute("aria-expanded", "false");
      if (dialog?.open && typeof dialog.close === "function") dialog.close();
      if (inerted && !wasInert) inerted.removeAttribute("inert");
      body.replaceChildren(); panel.remove(); portal?.remove();
    };
    openTransientOverlay({ id, returnFocus: button, history: sheet, close: clear });
    opened = true; button.setAttribute("aria-expanded", "true");
    if (!sheet) { panel.setAttribute("role", "region"); wrapper.append(panel); return; }
    dialog = h("dialog", { class: "help-sheet", "aria-labelledby": heading.id });
    dialog.append(panel);
    portal = h("div", { class: "help-portal", "data-help-portal": "" }, dialog);
    document.body.append(portal);
    dialog.addEventListener("close", () => { if (opened) closeTransientOverlay("dismiss"); });
    dialog.addEventListener("cancel", (event) => { event.preventDefault(); closeTransientOverlay("dismiss"); });
    dialog.addEventListener("click", (event) => { if (event.target === dialog) closeTransientOverlay("dismiss"); });
    // Native dialogs supply modality and the focus trap. This fallback supports older hosts too.
    if (typeof dialog.showModal === "function") dialog.showModal();
    else {
      dialog.setAttribute("open", ""); dialog.setAttribute("role", "dialog"); dialog.setAttribute("aria-modal", "true");
      inerted = document.getElementById("app") ?? undefined; wasInert = inerted?.hasAttribute("inert") ?? false; inerted?.setAttribute("inert", "");
      dialog.addEventListener("keydown", (event) => {
        if (event.key === "Escape") { event.preventDefault(); closeTransientOverlay("dismiss"); }
        if (event.key !== "Tab") return;
        const focusable = [...dialog!.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select,textarea,[tabindex="0"]')].filter((element) => element.tabIndex >= 0 && !element.closest("[hidden]"));
        const first = focusable[0], last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      });
    }
    close.focus({ preventScroll: true });
  });
  return wrapper;
}

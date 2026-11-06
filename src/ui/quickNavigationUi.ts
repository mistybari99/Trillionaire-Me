import { h } from "./dom";
import { t, tb } from "../i18n/t";
import type { Locale } from "../i18n/registry";
import { getPresentationPreferences } from "./presentationPreferences";
import { closeTransientOverlay, navigateFromOverlay, openTransientOverlay } from "./overlayCoordinator";
import { prayerControls } from "./prayerMarksUi";
import { TAB_ACTIONS, TAB_DEFINITIONS, type TabAction, type TabId } from "./tabActions";
import "./quickNavigation.css";

let openTab: TabId | null = null;
let panel: HTMLElement | null = null;
const panelId = "tab-quick-panel";

/** These addresses render Deen itself and focus the requested existing section. */
export function focusDeenTarget(path: string): boolean {
  const id = path === "/deen/prayers" ? "deen-prayers" : path === "/deen/fasting" ? "deen-fasting" : null;
  const target = id ? document.getElementById(id) : null;
  if (!target) return false;
  target.tabIndex = -1;
  target.focus({ preventScroll: true });
  target.scrollIntoView?.({ block: "start" });
  return true;
}

function navigate(href: string) {
  if (location.hash === href) {
    if (focusDeenTarget(href.slice(1))) return;
    const heading = document.querySelector<HTMLElement>("#app main h1");
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); heading.scrollIntoView?.({ block: "start" }); }
  }
  else location.hash = href;
}

function updateExpanded() {
  document.querySelectorAll<HTMLElement>("[data-tab-menu]").forEach((button) => {
    button.setAttribute("aria-expanded", String(button.dataset.tabMenu === openTab));
  });
}

function routeLink(item: TabAction, lang: Locale, fromPanel: boolean): HTMLElement {
  const link = h("a", { class: "shortcut-link", href: item.href, "data-tab-action": item.id },
    item.id === "home" ? tb({ en: "Home", bn: "মূল পেজ" }, lang) : t(item.label, lang));
  link.addEventListener("click", (event) => {
    const click = event as MouseEvent;
    if (click.button !== 0 || click.ctrlKey || click.metaKey || click.shiftKey || click.altKey) return;
    if (fromPanel) {
      event.preventDefault();
      navigateFromOverlay(() => navigate(item.href));
    } else if (location.hash === item.href && focusDeenTarget(item.href.slice(1))) event.preventDefault();
  });
  return link;
}

/** One nonmodal panel: the bottom five controls remain available while it is open. */
export function openTabPanel(tab: TabId, lang: Locale, opener: HTMLElement): void {
  if (openTab === tab && panel?.isConnected) { closeTransientOverlay("dismiss"); return; }
  closeTransientOverlay("replace");
  const headingId = `${panelId}-title`;
  const close = h("button", { type: "button", class: "btn ghost", "data-act": "quick-panel-close", onclick: () => closeTransientOverlay("dismiss") }, t("topics.close", lang));
  const labelKey = TAB_DEFINITIONS.find(([id]) => id === tab)![1];
  const el = h("section", { id: panelId, class: "quick-panel", role: "dialog", "aria-modal": "false", "aria-labelledby": headingId, "data-quick-panel": tab },
    h("div", { class: "quick-panel-heading" }, h("h2", { id: headingId }, t(labelKey, lang)), close),
    ...(tab === "deen" ? [prayerControls(lang, "compact")] : []),
    h("div", { class: "quick-access-grid" }, ...TAB_ACTIONS[tab].map((item) => routeLink(item, lang, true))));
  const outside = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Node) || el.contains(target)) return;
    // Tabs switch this same panel; their own click handler owns that operation.
    if (target instanceof Element && target.closest(`.bottom-tabs,[aria-controls="${panelId}"]`)) return;
    closeTransientOverlay("dismiss");
  };
  const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); closeTransientOverlay("dismiss"); } };
  openTransientOverlay({ id: panelId, history: true, returnFocus: opener, close: () => {
    el.remove();
    document.removeEventListener("pointerdown", outside);
    document.removeEventListener("keydown", escape);
    if (panel === el) { panel = null; openTab = null; updateExpanded(); }
  } });
  panel = el; openTab = tab;
  document.body.append(el);
  document.addEventListener("pointerdown", outside);
  document.addEventListener("keydown", escape);
  updateExpanded();
  // Mark controls lead on Deen; other panels lead with their Home link.
  (el.querySelector<HTMLElement>(tab === "deen" ? "button[data-prayer]:not(:disabled)" : ".shortcut-link") ?? close).focus({ preventScroll: true });
}

export function rootBar(tab: TabId, lang: Locale): HTMLElement | null {
  if (getPresentationPreferences().tabNavigation === "menu") return null;
  return h("section", { class: "quick-access workspace-shortcuts", "data-shortcuts": tab, "aria-labelledby": `${tab}-shortcuts-title` },
    h("h2", { class: "card-h", id: `${tab}-shortcuts-title` }, tb({ en: "Quick tools", bn: "দরকারি টুল" }, lang)),
    h("div", { class: "quick-access-grid" }, ...TAB_ACTIONS[tab].filter((item) => item.id !== "home").map((item) => {
      if (!item.quickPrayer) return routeLink(item, lang, false);
      const button = h("button", { type: "button", class: "shortcut-link", "data-tab-action": item.id, "data-tab-menu": "deen", "aria-haspopup": "dialog", "aria-controls": panelId, "aria-expanded": String(openTab === "deen"), onclick: () => openTabPanel("deen", lang, button) }, t(item.label, lang));
      return button;
    })));
}

export function createBottomNavigation(active: TabId, lang: Locale): HTMLElement {
  const menuMode = getPresentationPreferences().tabNavigation === "menu";
  return h("nav", { class: "bottom-tabs", "aria-label": t("nav.aria", lang) }, ...TAB_DEFINITIONS.map(([tab, key]) => {
    const current = active === tab ? { "aria-current": "page" } : {};
    if (!menuMode) return h("a", { class: "tab", href: `#/${tab}`, ...current }, t(key, lang));
    const button = h("button", { type: "button", class: "tab", "data-tab-menu": tab, "aria-haspopup": "dialog", "aria-controls": panelId, "aria-expanded": String(openTab === tab), ...current, onclick: () => openTabPanel(tab, lang, button) }, t(key, lang));
    return button;
  }));
}

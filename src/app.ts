import { h } from "./ui/dom";
import { applyPrefs, prefs } from "./ui/state";
import { t, tb } from "./i18n/t";
import type { Key } from "./i18n/packs";
import { demoBadge } from "./ui/components";
import * as S from "./ui/screens";
import { LAYERS, TOPICS } from "./library/topics";
import { dismissReminder, inAppReminders } from "./ui/prayerAlerts";
import { notifyText } from "./core/notify";

const TABS: Array<[string, Key]> = [["today", "nav.today"], ["journey", "nav.journey"], ["diary", "nav.diary"], ["deen", "nav.deen"], ["more", "nav.more"]];

export const ROUTES: Array<[RegExp, (m: RegExpMatchArray) => HTMLElement, string]> = [
  [/^\/today$/, () => S.today(), "today"],
  [/^\/journey$/, () => S.journey(), "journey"],
  [/^\/journey\/log$/, () => S.journeyLog(), "journey"],
  [/^\/journey\/horizon$/, () => S.horizonScreen(), "journey"],
  [/^\/diary$/, () => S.diary(), "diary"],
  [/^\/diary\/intake(?:\/(\d+))?$/, (m) => S.intake(m[1]), "diary"],
  [/^\/diary\/plan$/, () => S.planScreen(), "diary"],
  [/^\/diary\/money$/, () => S.moneyScreen(), "diary"],
  [/^\/capture$/, () => S.captureScreen(), "today"],
  [/^\/journey\/report$/, () => S.reportScreen(), "journey"],
  [/^\/journey\/review$/, () => S.reviewScreen(), "journey"],
  [/^\/stuck$/, () => S.stuckScreen(), "today"],
  [/^\/topics$/, () => S.topicsIndex(), "more"],
  [/^\/topic\/([\w-]+)$/, (m) => S.topicScreen(m[1]), "more"],
  [/^\/reward$/, () => S.rewardScreen(), "today"],
  [/^\/journey\/art$/, () => S.artScreen(), "journey"],
  [/^\/focus\/([\w-]+)$/, (m) => S.focusScreen(m[1]), "today"],
  [/^\/habits$/, () => S.habitsScreen(), "today"],
  [/^\/cards$/, () => S.cardsScreen(), "more"],
  [/^\/deen$/, () => S.deen(), "deen"],
  [/^\/more$/, () => S.more(), "more"],
  [/^\/more\/status$/, () => S.status(), "more"],
  [/^\/more\/fields$/, () => S.fieldsGuide(), "more"],
  [/^\/more\/glossary$/, () => S.glossary(), "more"],
  [/^\/more\/safety$/, () => S.safety(), "more"],
  [/^\/more\/data$/, () => S.dataScreen(), "more"],
];

function toggleDrawer(open: boolean) { const d = document.getElementById("drawer"); if (d) { d.classList.toggle("open", open); d.setAttribute("aria-hidden", String(!open)); } }

export function render() {
  applyPrefs();
  const lang = prefs.lang;
  const path = location.hash.replace(/^#/, "") || "/today";
  let body: HTMLElement | null = null, tab = "today";
  for (const [re, fn, tb] of ROUTES) { const m = path.match(re); if (m) { body = fn(m); tab = tb; break; } }
  if (!body) { location.hash = "#/today"; return; }
  const online = navigator.onLine;
  const drawer = h("div", { class: "drawer", id: "drawer", role: "dialog", "aria-label": t("topics.menu", lang), "aria-hidden": "true" },
    h("div", { class: "scrim", onclick: () => toggleDrawer(false) }),
    h("div", { class: "panel" }, h("button", { class: "btn ghost", type: "button", "data-act": "drawer-close", onclick: () => toggleDrawer(false), style: "margin:0" }, t("topics.close", lang)),
      ...(Object.keys(LAYERS) as (keyof typeof LAYERS)[]).flatMap((ly) => [h("h2", {}, tb(LAYERS[ly], lang)), ...TOPICS.filter((x) => x.layer === ly).map((x) => h("a", { class: "item", href: `#/topic/${x.id}`, "data-topic": x.id, onclick: () => toggleDrawer(false) }, tb(x.name, lang)))])));
  const menuBtn = h("button", { class: "menu-btn", type: "button", "data-act": "drawer-open", "aria-label": t("topics.open", lang), "aria-controls": "drawer", onclick: () => toggleDrawer(true) }, "☰");
  const top = h("div", { class: "top" }, h("span", {}, menuBtn, " ", t("app.title", lang)),
    h("span", { class: "right" }, h("span", { class: "net", "data-net": online ? "online" : "offline" }, t(online ? "status.online" : "status.offline", lang)), demoBadge(lang)));
  const nav = h("nav", { "aria-label": t("nav.aria", lang) }, ...TABS.map(([r, k]) => h("a", { class: "tab", href: `#/${r}`, ...(tab === r ? { "aria-current": "page" } : {}) }, t(k, lang))));
  const app = document.getElementById("app")!;
  // Skip link (first Tab stop) jumps past the top bar to the screen content.
  // Keep the screen's own id (the focus timer looks up "focus-root"); only add one when there is none.
  if (!body.id) body.id = "content";
  body.tabIndex = -1;
  const skip = h("a", { class: "skip", href: `#${body.id}` }, t("a11y.skip", lang));
  // In-app prayer reminders (M13) show above the screen when the phone cannot show a notification.
  const reminders = inAppReminders().map((r) => h("div", { class: "card", role: "status", "data-inapp-reminder": r.id },
    h("h2", { class: "card-h" }, t("deen.alert.title", lang)), h("p", {}, notifyText(r.text, lang)),
    h("button", { class: "btn ghost", type: "button", "data-act": "reminder-dismiss", style: "width:auto;margin:0;min-height:44px", onclick: () => { dismissReminder(r.id); render(); } }, t("deen.alert.dismiss", lang))));
  app.replaceChildren(skip, top, ...reminders, body, nav, drawer);
  window.scrollTo(0, 0);
}


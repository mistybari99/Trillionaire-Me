import { h } from "./ui/dom";
import { applyPrefs, prefs } from "./ui/state";
import { t, tb } from "./i18n/t";
import type { Key } from "./i18n/packs";
import { demoBadge } from "./ui/components";
import { langMenu } from "./ui/langMenu";
import * as S from "./ui/screens";
import * as LS from "./ui/libraryScreens";
import * as LF from "./ui/lifeUi";
import * as UV from "./ui/universeUi";
import * as IM from "./ui/importUi";
import { viaLazy } from "./ui/lazy";
import { CONN, DECIDE, HALAL, LEGS, PLAN } from "./ui/lazyScreens";
import { onboardScreen } from "./ui/onboardUi";
import { settingsScreen } from "./ui/settingsUi";
import { demoPanels, firstRunScreen, trackDemoDay } from "./ui/modeUi";
import { LAYERS, TOPICS } from "./library/topics";
import { dismissReminder, inAppReminders } from "./ui/prayerAlerts";
import { isLocked, lockScreen } from "./ui/lockUi";
import { saveFailedBanner } from "./ui/saveBanner";
import { notifyText } from "./core/notify";

const TABS: Array<[string, Key]> = [["today", "nav.today"], ["journey", "nav.journey"], ["diary", "nav.diary"], ["deen", "nav.deen"], ["settings", "nav.settings"]];

export const ROUTES: Array<[RegExp, (m: RegExpMatchArray) => HTMLElement, string]> = [
  [/^\/start$/, () => onboardScreen(), "today"],
  [/^\/today$/, () => S.today(), "today"],
  [/^\/journey$/, () => S.journey(), "journey"],
  [/^\/journey\/log$/, () => S.journeyLog(), "journey"],
  [/^\/journey\/wheel$/, () => LF.wheelScreen(), "journey"],
  [/^\/journey\/universe$/, () => UV.universeScreen(), "journey"],
  [/^\/journey\/goals$/, () => LF.goalsScreen(), "journey"],
  [/^\/journey\/goal\/([\w-]+)$/, (m) => LF.goalScreen(m[1]!), "journey"],
  [/^\/journey\/horizon$/, () => S.horizonScreen(), "journey"],
  [/^\/diary$/, () => S.diary(), "diary"],
  [/^\/diary\/intake(?:\/(\d+))?$/, (m) => S.intake(m[1]), "diary"],
  [/^\/diary\/plan$/, () => S.planScreen(), "diary"],
  [/^\/diary\/money$/, () => S.moneyScreen(), "diary"],
  [/^\/capture$/, () => S.captureScreen(), "today"],
  [/^\/journey\/report$/, () => S.reportScreen(), "journey"],
  [/^\/journey\/week$/, () => S.weeklyScreen(), "journey"],
  [/^\/journey\/decide$/, () => viaLazy(DECIDE, (m) => m.decisionScreen()), "journey"],
  [/^\/journey\/mine$/, () => viaLazy(DECIDE, (m) => m.triageScreen()), "journey"],
  [/^\/journey\/legs$/, () => viaLazy(LEGS, (m) => m.legsScreen()), "journey"],
  [/^\/journey\/leak$/, () => viaLazy(LEGS, (m) => m.leakScreen()), "journey"],
  [/^\/journey\/review$/, () => S.reviewScreen(), "journey"],
  [/^\/journey\/risks$/, () => viaLazy(PLAN, (m) => m.riskScreen()), "journey"],
  [/^\/journey\/history$/, () => viaLazy(PLAN, (m) => m.planHistoryScreen()), "journey"],
  [/^\/journey\/northstar$/, () => viaLazy(PLAN, (m) => m.northStarScreen()), "journey"],
  [/^\/diary\/ventures$/, () => viaLazy(PLAN, (m) => m.ventureScreen()), "diary"],
  [/^\/diary\/team$/, () => viaLazy(PLAN, (m) => m.teamScreen()), "diary"],
  [/^\/stuck$/, () => S.stuckScreen(), "today"],
  [/^\/topics$/, () => S.topicsIndex(), "settings"],
  [/^\/topic\/([\w-]+)$/, (m) => S.topicScreen(m[1]), "settings"],
  [/^\/reward$/, () => S.rewardScreen(), "today"],
  [/^\/journey\/art$/, () => S.artScreen(), "journey"],
  [/^\/focus\/([\w-]+)$/, (m) => S.focusScreen(m[1]), "today"],
  [/^\/habits$/, () => S.habitsScreen(), "today"],
  [/^\/cards$/, () => S.cardsScreen(), "settings"],
  [/^\/deen$/, () => S.deen(), "deen"],
  [/^\/settings\/connections$/, () => viaLazy(CONN, (m) => m.connectionsScreen(prefs.lang)), "settings"],
  [/^\/settings(?:\/([a-z]+))?(?:\/([a-z-]+))?$/, (m) => settingsScreen(m[1], m[2]), "settings"],
  [/^\/more\/status$/, () => S.status(), "settings"],
  [/^\/more\/fields$/, () => S.fieldsGuide(), "settings"],
  [/^\/more\/glossary$/, () => S.glossary(), "settings"],
  [/^\/more\/safety$/, () => S.safety(), "settings"],
  [/^\/more\/dictionary$/, () => IM.dictionaryScreen(), "settings"],
  [/^\/more\/library$/, () => LS.systemsLibraryScreen(), "settings"],
  [/^\/more\/halal-flags$/, () => viaLazy(HALAL, (m) => m.halalFlagsScreen()), "settings"],
];

/** Old Settings addresses and where they live now. Resolved inside render() with history.replaceState (no second render, no Back loop). */
export const REDIRECTS: Record<string, string> = {
  "/more": "/settings",
  "/more/data": "/settings/data",
  "/more/connections": "/settings/connections",
  "/more/rules": "/settings/plan/automation",
};

function toggleDrawer(open: boolean) { const d = document.getElementById("drawer"); if (d) { d.classList.toggle("open", open); d.setAttribute("aria-hidden", String(!open)); } }

/** Entry point for the browser: the first-run choice comes before anything else, once per device. */
export function renderApp() {
  if (isLocked()) { applyPrefs(); document.getElementById("app")!.replaceChildren(lockScreen()); return; }
  if (prefs.dataModeChoice !== null) { render(); return; }
  applyPrefs();
  document.getElementById("app")!.replaceChildren(firstRunScreen());
}

export function render() {
  if (isLocked()) { renderApp(); return; }
  applyPrefs();
  trackDemoDay();
  const lang = prefs.lang;
  let path = location.hash.replace(/^#/, "") || "/today";
  const moved = REDIRECTS[path];
  if (moved) { history.replaceState(null, "", `#${moved}`); path = moved; }
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
    h("span", { class: "right" }, h("span", { class: "net", "data-net": online ? "online" : "offline" }, t(online ? "status.online" : "status.offline", lang)), demoBadge(lang), langMenu(lang)));
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
  // Keep the reader's place on taps inside the same screen; jump to top only when the screen changes.
  const savedY = window.scrollY;
  const routeChanged = path !== lastRenderedPath;
  const firstLoad = lastRenderedPath === null;
  lastRenderedPath = path;
  app.replaceChildren(skip, top, ...demoPanels(), ...(saveFailedBanner(lang) ? [saveFailedBanner(lang)!] : []), ...reminders, body, nav, drawer);
  window.scrollTo(0, routeChanged ? 0 : savedY);
  // After a real screen change (not a re-draw of the same screen, not the first load): the screen name becomes the page title and
  // keyboard / screen-reader focus moves to the new heading, so the change is announced.
  const heading = body.querySelector("h1");
  if (heading) document.title = `${heading.textContent} · ${t("app.title", lang)}`;
  if (routeChanged && !firstLoad && heading) { heading.setAttribute("tabindex", "-1"); (heading as HTMLElement).focus({ preventScroll: true }); }
}

let lastRenderedPath: string | null = null;


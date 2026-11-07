import { ownerProfileLink, ownerProfileScreen } from "./ui/ownerProfileUi";
import { h } from "./ui/dom";
import { applyPrefs, prefs } from "./ui/state";
import { t, tb } from "./i18n/t";
import { demoBadge, resetNotices } from "./ui/components";
import { langMenu } from "./ui/langMenu";
import * as S from "./ui/screens";
import * as LS from "./ui/libraryScreens";
import * as LF from "./ui/lifeUi";
import * as UV from "./ui/universeUi";
import * as IM from "./ui/importUi";
import { whereScreen } from "./ui/whereUi";
import { backwardListScreen, backwardScreen } from "./ui/backwardUi";
import * as RL from "./ui/realityUi";
import { viaLazy } from "./ui/lazy";
import { CONN, DECIDE, HALAL, LEGS, PLAN } from "./ui/lazyScreens";
import { monthScreen } from "./ui/monthUi";
import { healthScreen } from "./ui/healthUi";
import { deenPlansScreen } from "./ui/deenPlansUi";
import { boardsScreen } from "./ui/boardsUi";
import { hadithScreen } from "./ui/hadithUi";
import { notesScreen } from "./ui/notesUi";
import { printScreen } from "./ui/printUi";
import { onboardScreen } from "./ui/onboardUi";
import { settingsScreen } from "./ui/settingsUi";
import { demoPanels, firstRunScreen, trackDemoDay } from "./ui/modeUi";
import { LAYERS, TOPICS } from "./library/topics";
import { dismissReminder, inAppReminders } from "./ui/prayerAlerts";
import { isLocked, lockScreen } from "./ui/lockUi";
import { saveFailedBanner } from "./ui/saveBanner";
import { notifyText } from "./core/notify";
import { observeNavLayout } from "./ui/navLayout";
import { createBottomNavigation, focusDeenTarget } from "./ui/quickNavigationUi";
import { isTabId } from "./ui/tabActions";
import { setOverlayContext } from "./ui/overlayCoordinator";
import { consentOn } from "./ui/entry";
import { enhanceScreenHelp } from "./ui/screenHelp";
import { ROUTES_QB1, viewed } from "./ui/routes_qb1";

let stopNavLayout: (() => void) | undefined;

export const ROUTES: Array<[RegExp, (m: RegExpMatchArray) => HTMLElement, string]> = [
  ...ROUTES_QB1, // batch 1: /diary/inspiration
  [/^\/profile$/, () => ownerProfileScreen(), "settings"],
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
  [/^\/capture$/, () => viewed("capture", S.captureScreen), "today"],
  [/^\/journey\/report$/, () => S.reportScreen(), "journey"],
  [/^\/journey\/print(?:\/([a-z]+))?$/, (m) => printScreen(m[1]), "journey"],
  [/^\/journey\/week$/, () => S.weeklyScreen(), "journey"],
  [/^\/journey\/month$/, () => monthScreen(), "journey"],
  [/^\/journey\/decide$/, () => viaLazy(DECIDE, (m) => m.decisionScreen()), "journey"],
  [/^\/journey\/mine$/, () => viaLazy(DECIDE, (m) => m.triageScreen()), "journey"],
  [/^\/journey\/legs$/, () => viaLazy(LEGS, (m) => m.legsScreen()), "journey"],
  [/^\/journey\/leak$/, () => viaLazy(LEGS, (m) => m.leakScreen()), "journey"],
  [/^\/journey\/review$/, () => S.reviewScreen(), "journey"],
  [/^\/journey\/risks$/, () => viaLazy(PLAN, (m) => m.riskScreen()), "journey"],
  [/^\/journey\/history$/, () => viaLazy(PLAN, (m) => m.planHistoryScreen()), "journey"],
  [/^\/journey\/northstar$/, () => viaLazy(PLAN, (m) => viewed("northstar", m.northStarScreen)), "journey"],
  [/^\/journey\/reality$/, () => RL.realityScreen(), "journey"],
  [/^\/journey\/boards$/, () => boardsScreen(), "journey"],
  [/^\/journey\/backward$/, () => backwardListScreen(), "journey"],
  [/^\/journey\/backward\/([\w-]+)$/, (m) => backwardScreen(m[1]!), "journey"],
  [/^\/journey\/gates$/, () => viaLazy(PLAN, (m) => m.gatesScreen()), "journey"],
  [/^\/journey\/kpi$/, () => viaLazy(PLAN, (m) => m.kpiScreen()), "journey"],
  [/^\/diary\/ventures$/, () => viaLazy(PLAN, (m) => m.ventureScreen()), "diary"],
  [/^\/diary\/health$/, () => healthScreen(), "diary"],
  [/^\/diary\/team$/, () => viaLazy(PLAN, (m) => m.teamScreen()), "diary"],
  [/^\/stuck$/, () => viewed("stuck", S.stuckScreen), "today"],
  [/^\/topics$/, () => viewed("topics", S.topicsIndex), "settings"],
  [/^\/topic\/([\w-]+)$/, (m) => S.topicScreen(m[1]), "settings"],
  [/^\/reward$/, () => S.rewardScreen(), "today"],
  [/^\/journey\/art$/, () => S.artScreen(), "journey"],
  [/^\/focus\/([\w-]+)$/, (m) => S.focusScreen(m[1]), "today"],
  [/^\/habits$/, () => S.habitsScreen(), "today"],
  [/^\/hadith$/, () => hadithScreen(), "settings"],
  [/^\/cards$/, () => S.cardsScreen(), "settings"],
  [/^\/notes$/, () => notesScreen(), "settings"],
  [/^\/deen$/, () => viewed("deen", S.deen), "deen"],
  [/^\/deen\/(?:prayers|fasting)$/, () => viewed("deen", S.deen), "deen"],
  [/^\/deen\/plans$/, () => deenPlansScreen(), "deen"],
  [/^\/settings\/connections$/, () => viaLazy(CONN, (m) => m.connectionsScreen(prefs.lang)), "settings"],
  [/^\/settings(?:\/([a-z]+))?(?:\/([a-z-]+))?$/, (m) => settingsScreen(m[1], m[2]), "settings"],
  [/^\/more\/where$/, () => whereScreen(prefs.lang), "settings"],
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
  if (isLocked()) { setOverlayContext("locked"); stopNavLayout?.(); applyPrefs(); document.getElementById("app")!.replaceChildren(lockScreen()); return; }
  if (prefs.dataModeChoice !== null) { render(); return; }
  applyPrefs();
  stopNavLayout?.();
  setOverlayContext("first-run");
  document.getElementById("app")!.replaceChildren(firstRunScreen());
}

export function render() {
  if (isLocked()) { renderApp(); return; }
  applyPrefs();
  resetNotices();
  trackDemoDay();
  const lang = prefs.lang;
  let path = location.hash.replace(/^#/, "") || "/today";
  const moved = REDIRECTS[path];
  if (moved) { history.replaceState(null, "", `#${moved}`); path = moved; }
  setOverlayContext(`${path}|${prefs.dataMode}|${consentOn()}|${lang}|unlocked`);
  let body: HTMLElement | null = null, tab = "today";
  for (const [re, fn, tb] of ROUTES) { const m = path.match(re); if (m) { body = fn(m); tab = tb; break; } }
  if (!body) { location.hash = "#/today"; return; }
  enhanceScreenHelp(body, path, lang);
  const online = navigator.onLine;
  const drawer = h("div", { class: "drawer", id: "drawer", role: "dialog", "aria-label": t("topics.menu", lang), "aria-hidden": "true" },
    h("div", { class: "scrim", onclick: () => toggleDrawer(false) }),
    h("div", { class: "panel" }, h("button", { class: "btn ghost", type: "button", "data-act": "drawer-close", onclick: () => toggleDrawer(false), style: "margin:0" }, t("topics.close", lang)),
      ...(Object.keys(LAYERS) as (keyof typeof LAYERS)[]).flatMap((ly) => [h("h2", {}, tb(LAYERS[ly], lang)), ...TOPICS.filter((x) => x.layer === ly).map((x) => h("a", { class: "item", href: `#/topic/${x.id}`, "data-topic": x.id, onclick: () => toggleDrawer(false) }, tb(x.name, lang)))])));
  const menuBtn = h("button", { class: "menu-btn", type: "button", "data-act": "drawer-open", "aria-label": t("topics.open", lang), "aria-controls": "drawer", onclick: () => toggleDrawer(true) }, "☰");
  const top = h("div", { class: "top" }, h("span", {}, menuBtn, " ", t("app.title", lang)),
    h("span", { class: "right" }, h("span", { class: "net", "data-net": online ? "online" : "offline" }, t(online ? "status.online" : "status.offline", lang)), prefs.dataMode === "demo" ? demoBadge(lang) : h("span", { class: "tag", "data-mode": "real" }, t("mode.switch.real", lang)), langMenu(lang), ownerProfileLink(lang)));
  const nav = createBottomNavigation(isTabId(tab) ? tab : "today", lang);
  const app = document.getElementById("app")!;
  // Skip link (first Tab stop) jumps past the top bar to the screen content.
  // Keep the screen's own id (the focus timer looks up "focus-root"); only add one when there is none.
  if (!body.id) body.id = "content";
  body.tabIndex = -1;
  const skip = h("a", { class: "skip", href: `#${body.id}`, onclick: (event: Event) => {
    // A native fragment would be interpreted as a route by the hash router.
    event.preventDefault();
    body.focus({ preventScroll: true });
    body.scrollIntoView?.({ block: "start" });
  } }, t("a11y.skip", lang));
  // In-app prayer reminders (M13) show above the screen when the phone cannot show a notification.
  const reminders = inAppReminders().map((r) => h("div", { class: "card", role: "status", "data-inapp-reminder": r.id },
    h("h2", { class: "card-h" }, t("deen.alert.title", lang)), h("p", {}, notifyText(r.text, lang)),
    h("button", { class: "btn ghost btn-sm", type: "button", "data-act": "reminder-dismiss", onclick: () => { dismissReminder(r.id); render(); } }, t("deen.alert.dismiss", lang))));
  // Keep the reader's place on taps inside the same screen; jump to top only when the screen changes.
  const savedY = window.scrollY;
  const routeChanged = path !== lastRenderedPath;
  const firstLoad = lastRenderedPath === null;
  lastRenderedPath = path;
  stopNavLayout?.();
  app.replaceChildren(skip, top, ...demoPanels(), ...(saveFailedBanner(lang) ? [saveFailedBanner(lang)!] : []), ...reminders, body, nav, drawer);
  stopNavLayout = observeNavLayout(nav);
  window.scrollTo(0, routeChanged ? 0 : savedY);
  // After a real screen change (not a re-draw of the same screen, not the first load): the screen name becomes the page title and
  // keyboard / screen-reader focus moves to the new heading, so the change is announced.
  const heading = body.querySelector("h1");
  if (heading) document.title = `${heading.textContent} · ${t("app.title", lang)}`;
  if (routeChanged && !firstLoad && heading) { heading.setAttribute("tabindex", "-1"); (heading as HTMLElement).focus({ preventScroll: true }); }
  if (routeChanged) focusDeenTarget(path);
}

let lastRenderedPath: string | null = null;

window.addEventListener("tm:presentation-changed", (event) => {
  const detail = (event as CustomEvent).detail;
  if ((detail?.key === "tabNavigation" || detail?.reset) && document.querySelector("#app .bottom-tabs")) setTimeout(render, 0);
});


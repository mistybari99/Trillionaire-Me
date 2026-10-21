import { h } from "./ui/dom";
import { applyPrefs, prefs } from "./ui/state";
import { t } from "./i18n/t";
import type { Key } from "./i18n/packs";
import { demoBadge } from "./ui/components";
import * as S from "./ui/screens";

const TABS: Array<[string, Key]> = [["today", "nav.today"], ["journey", "nav.journey"], ["diary", "nav.diary"], ["deen", "nav.deen"], ["more", "nav.more"]];

export const ROUTES: Array<[RegExp, (m: RegExpMatchArray) => HTMLElement, string]> = [
  [/^\/today$/, () => S.today(), "today"],
  [/^\/journey$/, () => S.journey(), "journey"],
  [/^\/diary$/, () => S.diary(), "diary"],
  [/^\/diary\/intake(?:\/(\d+))?$/, (m) => S.intake(m[1]), "diary"],
  [/^\/deen$/, () => S.deen(), "deen"],
  [/^\/more$/, () => S.more(), "more"],
  [/^\/more\/status$/, () => S.status(), "more"],
  [/^\/more\/fields$/, () => S.fieldsGuide(), "more"],
  [/^\/more\/glossary$/, () => S.glossary(), "more"],
  [/^\/more\/safety$/, () => S.safety(), "more"],
  [/^\/more\/data$/, () => S.dataScreen(), "more"],
];

export function render() {
  applyPrefs();
  const lang = prefs.lang;
  const path = location.hash.replace(/^#/, "") || "/today";
  let body: HTMLElement | null = null, tab = "today";
  for (const [re, fn, tb] of ROUTES) { const m = path.match(re); if (m) { body = fn(m); tab = tb; break; } }
  if (!body) { location.hash = "#/today"; return; }
  const online = navigator.onLine;
  const top = h("div", { class: "top" }, h("span", {}, t("app.title", lang)),
    h("span", { class: "right" }, h("span", { class: "net", "data-net": online ? "online" : "offline" }, t(online ? "status.online" : "status.offline", lang)), demoBadge(lang)));
  const nav = h("nav", { "aria-label": t("nav.aria", lang) }, ...TABS.map(([r, k]) => h("a", { class: "tab", href: `#/${r}`, ...(tab === r ? { "aria-current": "page" } : {}) }, t(k, lang))));
  const app = document.getElementById("app")!;
  app.replaceChildren(top, body, nav);
  window.scrollTo(0, 0);
}


// Settings area (settings redesign PR 2): home (quick card, status strip, category cards, guides) and one page per category.
// Everything listed comes from settingsRegistry.ts. A row opens the place where the setting is changed; the three quick rows
// (language, theme, text size) are changed right here and nowhere else except the top-bar globe.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Key } from "../i18n/packs";
import { LOCALES, LOCALE_ORDER, type Locale } from "../i18n/registry";
import { applyPrefs, prefs, consentKv } from "./state";
import { num } from "./components";
import { whenText } from "./snapshotsUi";
import { readConsent } from "../core/consent";
import { lockEnabled } from "../core/appLock";
import { isEnabled } from "../core/connections";
import { FACILITY_IDS } from "../core/ports";
import { RULE_IDS } from "../core/rules";
import { designOf } from "./themes";
import { resetOnboard } from "./onboardUi";
import { deletePage } from "./deleteUi";
import { privacyPage } from "./privacyUi";
import { backupPage } from "./backupUi";
import { dataPage } from "./dataUi";
import { CATEGORIES, CAT_LABEL, GUIDES, isCat, rowsOf, settingsHash, type Cat, type CatKey, type SettingRow } from "./settingsRegistry";

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
const link = (href: string, cls: string, ...kids: Array<Node | string | null>) => h("a", { href, class: cls }, ...kids);
const onOff = (b: boolean, lang: Locale) => t(b ? "set.on" : "set.off", lang);
const connectionsOn = () => FACILITY_IDS.filter((id) => isEnabled(consentKv, id)).length;

/** Current value of a row as plain text, or null when the row has no short value. Computed from real state, never fixed text. */
export function rowValue(r: SettingRow, lang: Locale): string | null {
  switch (r.id) {
    case "language": return LOCALES[prefs.lang].endonym;
    case "theme": return t(`more.theme.${prefs.theme}` as Key, lang);
    case "textsize": return `${num(prefs.scale, lang)}%`;
    case "design": return t(designOf(prefs.design).label, lang);
    case "horizon": return prefs.horizonView;
    case "universe": return prefs.universeView;
    case "prayeralerts": { const a = prefs.prayerAlerts; return onOff(a.preAlert || a.azan, lang); }
    case "reminder": return onOff(prefs.backupRemind, lang);
    case "snapshots": return onOff(prefs.snapAuto, lang);
    case "applock": return onOff(lockEnabled(consentKv), lang);
    case "consent": return t(readConsent(consentKv) ? "set.allowed" : "set.notAllowed", lang);
    case "mode": return t(prefs.dataMode === "real" ? "set.real" : "set.demo", lang);
    case "planmode": return t(`plan.mode.${prefs.mode}` as Key, lang);
    case "rules": return `${num(RULE_IDS.filter((id) => prefs.ruleSwitches[id] ?? id !== "focus_again").length, lang)}/${num(RULE_IDS.length, lang)}`;
    case "connections": return `${num(connectionsOn(), lang)}/${num(FACILITY_IDS.length, lang)}`;
    case "lockscreen": return num(Object.values(prefs.notifyShow).filter(Boolean).length, lang);
    default: return null;
  }
}

/** One calm line of current values for a category card. */
export function categorySummary(cat: CatKey | "about", lang: Locale): string {
  switch (cat) {
    case "look": return t("set.sum.look", lang, { d: t(designOf(prefs.design).label, lang) });
    case "prayer": { const a = prefs.prayerAlerts; return t("set.sum.prayer", lang, { a: onOff(a.preAlert || a.azan, lang) }); }
    case "backup": return t("set.sum.backup", lang, { s: onOff(prefs.snapAuto, lang), r: onOff(prefs.backupRemind, lang) });
    case "privacy": return t("set.sum.privacy", lang, { l: onOff(lockEnabled(consentKv), lang), c: t(readConsent(consentKv) ? "set.allowed" : "set.notAllowed", lang) });
    case "data": return t("set.sum.data", lang, { m: t(prefs.dataMode === "real" ? "set.real" : "set.demo", lang) });
    case "plan": return t("set.sum.plan", lang, { m: t(`plan.mode.${prefs.mode}` as Key, lang) });
    case "connections": { const n = connectionsOn(); return t(n === 0 ? "set.sum.connections" : "set.sum.connections.on", lang, { n: num(n, lang) }); }
    case "delete": return t("set.sum.delete", lang);
    case "about": return t("set.sum.about", lang);
  }
}

const seg = (label: string, active: boolean, on: () => void, extra: Record<string, string> = {}) => h("button", { type: "button", "aria-pressed": String(active), onclick: on, ...extra }, label);

/** After a route with a row id, scroll to the row and mark it once. No animation: a plain outline, so reduced motion is never an issue. */
function highlight(root: HTMLElement, row: string | undefined) {
  if (!row) return;
  const el = root.querySelector<HTMLElement>(`[data-setting="${row}"], [data-setting-row="${row}"]`);
  if (!el) return; // an unknown row id still shows the page
  el.classList.add("set-hl");
  setTimeout(() => { try { el.scrollIntoView?.({ block: "center" }); } catch { /* ignore */ } }, 0);
}

function quickCard(lang: Locale): HTMLElement {
  const card = (id: string, label: Key, ...kids: Node[]) => h("div", { class: "card", "data-setting": id }, h("h3", { class: "card-h" }, t(label, lang)), ...kids);
  return h("section", { class: "card-group", "data-card": "quick", "aria-label": t("set.quick", lang) },
    h("h2", {}, t("set.quick", lang)),
    card("language", "more.language", h("div", { class: "seg", role: "group", "aria-label": t("more.language", lang) },
      ...LOCALE_ORDER.map((c) => seg(LOCALES[c].endonym, prefs.lang === c, () => { prefs.lang = c; applyPrefs(); rerender(); }, { "data-lang": c })))),
    card("theme", "more.theme", h("div", { class: "seg", role: "group", "aria-label": t("more.theme", lang) },
      ...(["auto", "light", "dark"] as const).map((c) => seg(t(`more.theme.${c}` as Key, lang), prefs.theme === c, () => { prefs.theme = c; applyPrefs(); rerender(); }, { "data-theme-set": c })))),
    card("textsize", "more.textsize", h("div", { class: "seg", role: "group", "aria-label": t("more.textsize", lang) },
      ...[100, 125, 150, 200].map((c) => seg(`${num(c, lang)}%`, prefs.scale === c, () => { prefs.scale = c; applyPrefs(); rerender(); }, { "data-scale": String(c) })))));
}

function statusStrip(lang: Locale): HTMLElement {
  const last = prefs.fileBackupAt;
  const lines: Array<[string, string, string]> = [
    ["backup", settingsHash("backup"), last ? t("set.status.backup.last", lang, { when: whenText(last) }) : t("set.status.backup.none", lang)],
    ["data", settingsHash("data"), readConsent(consentKv) && prefs.dataMode === "real" ? t("set.status.real.on", lang) : t("set.status.real.demo", lang)],
    ["privacy", settingsHash("privacy"), t(lockEnabled(consentKv) ? "set.status.lock.on" : "set.status.lock.off", lang)],
  ];
  return h("section", { class: "card", "data-card": "status", "aria-label": t("set.status.title", lang) }, h("h2", { class: "card-h" }, t("set.status.title", lang)),
    ...lines.map(([id, href, text]) => h("p", { style: "margin:4px 0" }, link(href, "", h("span", { "data-status": id }, text)))));
}

function categoryCard(cat: CatKey, lang: Locale): HTMLElement {
  return link(settingsHash(cat), cat === "delete" ? "card link set-delete" : "card link", h("h3", { class: "card-h" }, t(CAT_LABEL[cat], lang)), h("p", { class: "muted", "data-summary": cat }, categorySummary(cat, lang))); // data-summary lets tests read the line
}

function home(row: string | undefined, lang: Locale): HTMLElement {
  const main = h("main", { class: "scr scr-settings", "data-settings": "home" },
    h("h1", {}, t("set.title", lang)), h("p", { class: "sub" }, t("set.intro", lang)),
    quickCard(lang), statusStrip(lang),
    ...CATEGORIES.map((c) => categoryCard(c, lang)),
    link(settingsHash("about"), "card link", h("h3", { class: "card-h" }, t(CAT_LABEL.about, lang)), h("p", { class: "muted", "data-summary": "about" }, categorySummary("about", lang))));
  highlight(main, row);
  return main;
}

function rowItem(r: SettingRow, lang: Locale): HTMLElement {
  const v = rowValue(r, lang);
  return link(r.route, "card link set-row", h("h3", { class: "card-h" }, t(r.label, lang)), v ? h("p", { class: "muted", "data-row-value": r.id }, v) : null);
}

function categoryPage(cat: Cat, row: string | undefined, lang: Locale): HTMLElement {
  const rows = rowsOf(cat).map((r) => { const el = rowItem(r, lang); el.setAttribute("data-setting-row", r.id); return el; });
  const main = h("main", { class: "scr scr-settings", "data-settings": cat },
    link("#/settings", "crumb", `← ${t("nav.settings", lang)}`), h("h1", {}, t(CAT_LABEL[cat], lang)),
    h("p", { class: "sub", "data-summary": cat }, categorySummary(cat as CatKey | "about", lang)), h("p", { class: "muted" }, t("set.cat.note", lang)), ...rows);
  highlight(main, row);
  return main;
}

function aboutPage(row: string | undefined, lang: Locale): HTMLElement {
  const welcome = h("div", { class: "card", "data-setting-row": "welcome" }, h("h3", { class: "card-h" }, t("set.row.welcome", lang)), h("p", { class: "muted" }, t("set.about.welcome", lang)),
    h("button", { class: "btn ghost", type: "button", "data-act": "welcome-again", style: "min-height:44px", onclick: () => { resetOnboard(); prefs.onboard = "pending"; location.hash = "#/start"; rerender(); } }, t("set.open", lang)));
  const main = h("main", { class: "scr scr-settings", "data-settings": "about" },
    link("#/settings", "crumb", `← ${t("nav.settings", lang)}`), h("h1", {}, t(CAT_LABEL.about, lang)), h("p", { class: "muted" }, t("set.about.note", lang)),
    ...GUIDES.map((g) => link(g.route, "card link", h("h3", { class: "card-h" }, t(g.label, lang)), h("p", { class: "muted" }, t(g.desc, lang)))), welcome);
  highlight(main, row);
  return main;
}

/** #/settings, #/settings/<category>, #/settings/<category>/<row>. Unknown category goes to the home; an unknown row id is ignored. */
export function settingsScreen(catArg: string | undefined, rowArg: string | undefined): HTMLElement {
  const lang = prefs.lang;
  if (!catArg || !isCat(catArg) || catArg === "home") return home(rowArg, lang);
  if (catArg === "about") return aboutPage(rowArg, lang);
  if (catArg === "delete") return deletePage(rowArg, lang);
  if (catArg === "privacy") return privacyPage(rowArg, lang);
  if (catArg === "backup") return backupPage(rowArg, lang);
  if (catArg === "data") return dataPage(rowArg, lang);
  return categoryPage(catArg, rowArg, lang);
}


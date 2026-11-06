import { presentationSettings } from "./presentationSettingsUi";
// Settings > Look & screens (settings redesign PR 3a): design version, the master Detailed/Compact choice with the list of screens
// that differ, links to the three layouts that live on their screens, reduce motion, and Reset look & layout.
import { h } from "./dom";
import { t, tb } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { applyPrefs, clearScreenView, masterView, prefs, resetLookLayout, screensDifferingFromMaster, setMasterView, screenViewOwn, VIEW_SCREENS } from "./state";
import { num } from "./components";
import { DESIGNS } from "./themes";

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
let resetAsk = false, resetDone = false, resetFailed = false;
const seg = (label: string, active: boolean, on: () => void, attrs: Record<string, string> = {}) => h("button", { type: "button", "aria-pressed": String(active), style: "min-height:44px", onclick: on, ...attrs }, label);

/** Design version chooser: radio cards with a small swatch. Adding a version in themes.ts adds a card here. */
export function designCard(lang: Locale): HTMLElement {
  return h("fieldset", { class: "card design-pick", "data-design-pick": "", "data-setting-row": "design" },
    h("legend", { class: "card-h" }, t("more.design", lang)), h("p", { class: "muted" }, t("more.design.desc", lang)),
    ...DESIGNS.map((d) => h("label", { class: "design-opt", "data-design-opt": d.id },
      h("input", { type: "radio", name: "design", value: d.id, checked: prefs.design === d.id, onchange: () => { prefs.design = d.id; applyPrefs(); rerender(); } }),
      h("span", { class: "design-sw", "aria-hidden": "true" }, ...d.swatch.map((c) => h("i", { style: `background:${c}` }))),
      h("span", { class: "design-txt" }, h("strong", {}, t(d.label, lang)), h("span", { class: "muted" }, t(d.desc, lang))))),
    h("p", { class: "muted" }, t("more.design.note", lang)));
}

const gridLabel = (lang: Locale) => t(`look.grid.${prefs.habitGrid}` as Key, lang);

export function lookPage(row: string | undefined, lang: Locale): HTMLElement {
  const m = masterView(); const diff = screensDifferingFromMaster();
  const master = h("section", { class: "card", "data-setting-row": "density" }, h("h2", { class: "card-h" }, t("set.row.density", lang)),
    h("div", { class: "seg", role: "group", "aria-label": t("set.row.density", lang) }, seg(t("view.full", lang), m === "full", () => { setMasterView("full"); rerender(); }, { "data-master-view": "full" }), seg(t("view.compact", lang), m === "compact", () => { setMasterView("compact"); rerender(); }, { "data-master-view": "compact" })),
    h("p", { class: "muted" }, t("look.master.note", lang)),
    h("details", { "data-look": "diff" }, h("summary", { style: "min-height:44px", "data-look": "diff-n" }, diff.length ? t("look.diff.h", lang, { n: num(diff.length, lang) }) : t("look.diff.none", lang)),
      h("ul", { style: "list-style:none;padding:0" }, ...VIEW_SCREENS.map((s) => {
        const own = screenViewOwn(s); const differs = own !== null && own !== m;
        return h("li", { "data-look-screen": s, "data-differs": String(differs), style: "display:flex;gap:8px;align-items:center;justify-content:space-between;min-height:44px" },
          h("span", {}, t(`look.screen.${s}` as Key, lang), " · ", t(`view.${own ?? m}` as Key, lang)),
          differs ? h("button", { class: "btn ghost", type: "button", "data-act": "follow-master", "data-screen": s, style: "width:auto;margin:0;min-height:44px", onclick: () => { clearScreenView(s); rerender(); } }, t("look.follow", lang)) : null);
      }))));
  const links = h("section", { class: "card", "data-card": "layout-links" }, h("h2", { class: "card-h" }, t("look.layouts", lang)),
    ...([["horizon", "#/journey/horizon", t(`horizon.view.${prefs.horizonView}` as Key, lang)], ["universe", "#/journey/universe", t(`univ.view.${prefs.universeView}` as Key, lang)], ["habitgrid", "#/habits", gridLabel(lang)]] as const).map(([id, href, val]) =>
      h("a", { href, class: "card link", "data-setting-row": id, style: "margin:8px 0" }, h("h3", { class: "card-h" }, t(`set.row.${id}` as Key, lang)), h("p", { class: "muted", "data-row-value": id }, val))));
  const motion = h("section", { class: "card", "data-setting-row": "motion" }, h("h2", { class: "card-h" }, t("set.row.motion", lang)),
    h("div", { class: "seg", role: "group", "aria-label": t("set.row.motion", lang) }, seg(t("look.motion.system", lang), prefs.reduceMotion === "system", () => { prefs.reduceMotion = "system"; applyPrefs(); rerender(); }, { "data-motion-set": "system" }), seg(t("look.motion.always", lang), prefs.reduceMotion === "always", () => { prefs.reduceMotion = "always"; applyPrefs(); rerender(); }, { "data-motion-set": "always" })),
    h("p", { class: "muted" }, t("look.motion.note", lang)));
  const reset = h("section", { class: "card", "data-setting-row": "resetlook" }, h("h2", { class: "card-h" }, t("set.row.resetlook", lang)), h("p", { class: "muted" }, t("look.reset.note", lang)),
    !resetAsk ? h("button", { class: "btn ghost", type: "button", "data-act": "reset-look", style: "min-height:44px", onclick: () => { resetAsk = true; resetDone = false; resetFailed = false; rerender(); } }, t("set.row.resetlook", lang))
      : h("div", { role: "alertdialog", "aria-label": t("look.reset.ask", lang) }, h("p", {}, t("look.reset.ask", lang)),
        h("button", { class: "btn ghost", type: "button", "data-act": "reset-look-no", style: "min-height:44px", onclick: () => { resetAsk = false; rerender(); } }, t("del.cancel", lang)),
        h("button", { class: "btn", type: "button", "data-act": "reset-look-yes", style: "min-height:44px", onclick: () => { const { saved } = resetLookLayout(); applyPrefs(); resetAsk = false; resetDone = saved; resetFailed = !saved; rerender(); } }, t("look.reset.yes", lang))),
    resetFailed && !resetAsk ? h("p", { role: "alert", "data-look": "reset-failed" }, tb({ en: "Some look settings could not be reset on this device. Help and navigation defaults apply for this session; saved choices may return after reopening. Try Reset look & layout again.", bn: "এই ডিভাইসে লুকের কিছু সেটিংস রিসেট হয়নি। হেল্প ও নেভিগেশনের ডিফল্ট এখন ব্যবহার হবে; আবার খুললে সেভ করা পছন্দ ফিরে আসতে পারে। লুক ও লেআউট আবার রিসেট করে চেষ্টা করুন।" }, lang)) : null,
    resetDone && !resetAsk ? h("p", { class: "ok-msg", role: "status", "data-look": "reset-done" }, t("look.reset.done", lang)) : null);
  const main = h("main", { class: "scr scr-settings", "data-settings": "look" }, h("a", { href: "#/settings", class: "crumb" }, `← ${t("nav.settings", lang)}`), h("h1", {}, t("set.cat.look", lang)),
    designCard(lang), presentationSettings(lang), master, links, motion, reset);
  const el = row ? main.querySelector<HTMLElement>(`[data-setting-row="${row}"]`) : null;
  if (el) { el.classList.add("set-hl"); setTimeout(() => { try { el.scrollIntoView?.({ block: "center" }); } catch { /* ignore */ } }, 0); }
  return main;
}

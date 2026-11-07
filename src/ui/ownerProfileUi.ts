import { h } from "./dom";
import { tb, t } from "../i18n/t";
import type { Locale } from "../i18n/registry";
import { prefs } from "./state";
import { profileCard } from "./profileCard";
import { activeNs, nsTag } from "./entry";
import "./ownerProfile.css";
const title = (lang: Locale) => tb({ en: "Owner profile", bn: "ওনার প্রোফাইল" }, lang);
/** Device-local owner workspace; editing uses the existing consent-gated profile form. */
export function ownerProfileLink(lang: Locale): HTMLElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("width", "22"); svg.setAttribute("height", "22"); svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = '<circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M5 21v-3a7 7 0 0 1 14 0v3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>';
  return h("a", { href: "#/profile", class: "owner-profile-link", "aria-label": title(lang), "data-owner-profile": "" }, svg);
}
export function ownerProfileScreen(): HTMLElement {
  const lang = prefs.lang;
  const link = (href: string, label: string) => h("a", { href, class: "card link" }, h("h3", { class: "card-h" }, label));
  return h("main", { class: "scr owner-profile", "data-owner-profile-screen": "" },
    h("h1", {}, title(lang)), nsTag(activeNs(), lang),
    h("p", { class: "muted" }, tb({ en: "Your profile and device settings. Profile entries stay on this device; this is not an online account.", bn: "আপনার প্রোফাইল ও ডিভাইসের সেটিংস। প্রোফাইলের এন্ট্রি এই ডিভাইসে থাকে; এটি অনলাইন অ্যাকাউন্ট নয়।" }, lang)),
    profileCard(lang),
    h("section", { "aria-label": t("nav.settings", lang) }, h("h2", {}, t("nav.settings", lang)),
      link("#/settings/home/language", t("more.language", lang)),
      link("#/settings/look", t("set.cat.look", lang)),
      link("#/settings/home/textsize", t("more.textsize", lang)),
      link("#/settings/privacy", t("set.cat.privacy", lang)),
      link("#/settings/backup", t("set.cat.backup", lang)),
      link("#/settings/data", t("set.cat.data", lang)),
      link("#/settings/prayer", t("set.cat.prayer", lang)),
      link("#/settings/about", t("set.cat.about", lang)),
      link("#/settings", t("nav.settings", lang))));
}

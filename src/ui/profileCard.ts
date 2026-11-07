// Profile read-back on the Diary and a greeting on Today (M01 output).
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Locale } from "../i18n/registry";
import { profileView } from "../core/profileView";
import { num, valueEl } from "./components";
import { loadAnswers } from "./screens";

const view = () => profileView(loadAnswers(), new Date().getFullYear());
/** Today: a short greeting with the name the person typed. Nothing without a name. */
export function greeting(lang: Locale): HTMLElement | null {
  const p = view(); return p.name ? h("p", { class: "muted", "data-greeting": "1" }, t("prof.hello", lang, { n: p.name })) : null;
}
/** Diary: name, birth year, age and time zone as typed. Unknown parts say so. */
export function profileCard(lang: Locale): HTMLElement {
  const p = view(); const unk = () => h("span", { class: "muted", "data-unknown": "1" }, t("unknown.unknown", lang));
  const row = (id: string, label: Parameters<typeof t>[0], v: Node | string) => h("p", { "data-prof": id }, h("span", { class: "muted" }, `${t(label, lang)}: `), v);
  return h("section", { class: "card", "data-profile-card": "1", "aria-label": t("prof.title", lang) }, h("h2", { class: "card-h" }, t("prof.title", lang)),
    row("name", "prof.name", p.name ?? unk()), row("birth", "prof.birth", p.birthYear === null ? unk() : String(p.birthYear)),
    row("age", "prof.age", p.age === null ? unk() : valueEl(t("prof.age.n", lang, { n: num(p.age, lang) }), "ESTIMATE", lang)),
    row("tz", "prof.tz", p.timeZone ?? unk()), p.timeZone ? h("p", { class: "muted", "data-tz-note": "1" }, t("prof.tz.note", lang)) : null,
    h("a", { href: "#/diary/intake/1", class: "crumb" }, t("prof.edit", lang)));
}

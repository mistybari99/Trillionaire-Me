// D-D hadith reader page (`#/hadith`). Off until the person turns it on. Local pack only. Every card shows its source, reference, licence and review status.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { prefs, consentKv } from "./state";
import { disclaimers } from "./components";
import { HADITH_TOPICS, disableHadith, enableHadith, loadPack, readHadithOn, searchHadith, type HadithEntry, type HadithTopic } from "../core/hadith";

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
let missing = false;
let q = ""; let topic: HadithTopic | null = null;

function card(e: HadithEntry, lang: Locale): HTMLElement {
  const text = lang === "en" ? (e.en ?? e.bn ?? null) : (e.bn ?? e.en ?? null);
  return h("article", { class: "card", "data-hadith": e.id },
    e.arabic ? h("p", { lang: "ar", dir: "rtl", style: "font-size:1.2em", "data-hadith-ar": "1" }, e.arabic) : null,
    text ? h("p", { "data-hadith-text": "1" }, text) : null,
    h("p", { class: "muted", "data-hadith-ref": "1" }, t("hd.ref", lang, { c: e.collection, n: e.number }), e.book ? ` · ${e.book}` : ""),
    e.reference ? h("details", { class: "help" }, h("summary", {}, t("hd.reflines", lang)), h("p", { lang: "ar", dir: "rtl", class: "muted", style: "white-space:pre-line", "data-hadith-refline": "1" }, e.reference)) : null,
    e.grade ? h("p", { class: "muted", "data-hadith-grade": "1" }, t("hd.grade", lang, { g: e.grade, by: e.gradeBy ?? "" })) : null,
    h("p", { class: "muted", "data-hadith-source": "1" }, t("hd.source", lang, { s: e.source, l: e.licence }), " ", h("span", { class: "muted" }, e.sourceUrl)),
    h("span", { class: "tag off", "data-hadith-status": e.status }, e.status === "reviewed" ? t("hd.reviewed", lang, { r: e.reviewer ?? "" }) : t("hd.unreviewed", lang)));
}

export function hadithScreen(): HTMLElement {
  const lang = prefs.lang; const on = readHadithOn(consentKv);
  const body = h("div", { "data-hadith-body": "1" });
  const head = [h("a", { href: "#/settings/about", class: "crumb" }, `← ${t("set.cat.about", lang)}`), h("h1", {}, t("hd.title", lang)), h("p", { class: "sub" }, t("hd.intro", lang)),
    h("div", { class: "note", role: "note", "data-hadith-banner": "1" }, h("p", {}, t("hd.banner", lang))),
    h("p", { class: "muted", "data-hadith-sourcenote": "1" }, t("hd.sourceNote", lang))];
  if (!on) {
    return h("main", { class: "scr scr-hadith" }, ...head, h("div", { class: "card", "data-hadith-off": "1" }, h("h2", { class: "card-h" }, t("hd.off.title", lang)), h("p", {}, t("hd.off.p", lang)),
      h("label", { style: "display:flex;gap:8px;align-items:center;margin:8px 0" }, h("input", { type: "checkbox", id: "hadith-tick", style: "width:24px;margin:0" }), t("hd.tick", lang)),
      h("button", { class: "btn", type: "button", "data-act": "hadith-on", style: "min-height:44px", onclick: () => { if (!(document.getElementById("hadith-tick") as HTMLInputElement | null)?.checked) { missing = true; rerender(); return; } missing = false; enableHadith(consentKv, new Date().toISOString()); rerender(); } }, t("hd.on", lang)),
      missing ? h("p", { class: "need", role: "alert" }, t("data.consent.needTick", lang)) : null), disclaimers(lang, ["noFatwa"]));
  }
  const input = h("input", { id: "hd-q", type: "search", autocomplete: "off", value: q }) as HTMLInputElement;
  const chips = h("div", { class: "seg", role: "group", "aria-label": t("hd.topic", lang) }, ...HADITH_TOPICS.map((tp) => h("button", { type: "button", "data-topic": tp, "aria-pressed": String(topic === tp), onclick: () => { topic = topic === tp ? null : tp; rerender(); } }, t(`hd.t.${tp}` as Key, lang))));
  input.addEventListener("input", () => { q = input.value; draw(); });
  let pack = { entries: [] as HadithEntry[], rejected: [] as Array<{ id: string; why: string }> };
  const draw = () => {
    const list = searchHadith(pack.entries, q, topic);
    body.replaceChildren(...[pack.entries.length === 0 ? h("p", { class: "muted", "data-hadith-empty": "pack" }, t("hd.empty.pack", lang)) : list.length === 0 ? h("p", { class: "muted", "data-hadith-empty": "search" }, t("hd.empty.search", lang)) : h("div", {}, ...list.map((e) => card(e, lang))),
      pack.rejected.length ? h("p", { class: "muted", "data-hadith-rejected": String(pack.rejected.length) }, t("hd.rejected", lang, { n: String(pack.rejected.length) })) : null].filter((x): x is NonNullable<typeof x> => x !== null));
  };
  import("../library/hadithPack.json").then((m) => { pack = loadPack(m.default); draw(); }).catch(() => { body.replaceChildren(h("p", { class: "muted" }, t("lazy.failed", lang))); });
  draw();
  return h("main", { class: "scr scr-hadith" }, ...head, h("label", { for: "hd-q" }, t("hd.search", lang)), input, chips, body,
    h("button", { class: "btn ghost", type: "button", "data-act": "hadith-off", style: "width:auto;min-height:44px", onclick: () => { disableHadith(consentKv); rerender(); } }, t("hd.off.btn", lang)), disclaimers(lang, ["noFatwa", "noGuarantee"]));
}

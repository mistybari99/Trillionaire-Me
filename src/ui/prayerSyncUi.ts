// Settings > Prayer: the automatic-update card, and the plain "where do these times come from" line shown wherever times are shown.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Locale } from "../i18n/registry";
import { prefs } from "./state";
import { num } from "./components";
import { dhakaNow } from "../core/prayer";
import type { ResolvedTimes } from "../core/prayerSource";
import { lastSyncOutcome, maybeSyncPrayerTimes, syncStatus, turnOffPrayerSync, turnOnPrayerSync } from "./prayerSync";
const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
const day = (iso: string) => iso.slice(0, 10);

/** "Times from <source>, updated <date>" with an External label, or "Calculated on this phone." Offsets are named when any is set. */
export function sourceLine(r: ResolvedTimes, lang: Locale): HTMLElement {
  const offs = Object.values(prefs.prayerSettings.offsets).some((v) => v !== 0);
  if (r.source === "external") return h("p", { class: "muted", "data-prayer-source": "external" }, h("span", { class: "badge", "data-source-badge": "external" }, t("prayer.src.badge", lang)), " ",
    t("prayer.src.external", lang, { s: r.name ?? "", d: day(r.fetchedAt ?? "") }), offs ? " " + t("prayer.src.offsets", lang) : "");
  return h("p", { class: "muted", "data-prayer-source": "local" }, t("prayer.src.local", lang), offs ? " " + t("prayer.src.offsets", lang) : "");
}

let needTick = false, badPlace = false;
export function prayerSyncCard(lang: Locale): HTMLElement {
  const st = syncStatus(dhakaNow(Date.now()).date); const s = st.sync;
  const head = h("h2", { class: "card-h" }, t("prayer.sync.title", lang));
  if (s.on) {
    const last = lastSyncOutcome();
    return h("div", { class: "card", "data-setting-row": "prayersync", "data-prayer-sync": "on" }, head,
      h("p", { "data-sync-on": "1" }, t("prayer.sync.on", lang, { d: day(s.since ?? ""), city: s.place.city, country: s.place.country })),
      sourceLine(st.resolved, lang), h("p", { class: "muted" }, t("prayer.sync.days", lang, { n: num(st.daysSaved, lang) })),
      last === "off" ? null : h("p", { class: "muted", role: "status", "data-sync-last": last }, t(`prayer.sync.last.${last === "updated" ? "updated" : last === "offline" ? "offline" : last === "failed" ? "failed" : "skipped"}` as never, lang)),
      h("button", { class: "btn ghost", type: "button", "data-act": "prayer-sync-now", style: "min-height:44px", onclick: () => { void maybeSyncPrayerTimes(true).finally(rerender); } }, t("prayer.sync.now", lang)),
      h("button", { class: "btn ghost", type: "button", "data-act": "prayer-sync-off", style: "min-height:44px", onclick: () => { void turnOffPrayerSync(); } }, t("prayer.sync.withdraw", lang)));
  }
  const city = h("input", { id: "ps-city", type: "text", autocomplete: "off", value: s.place.city }) as HTMLInputElement;
  const country = h("input", { id: "ps-country", type: "text", autocomplete: "off", value: s.place.country }) as HTMLInputElement;
  return h("div", { class: "card", "data-setting-row": "prayersync", "data-prayer-sync": "off" }, head,
    h("div", { "data-sync-what": "1" }, ...(["what1", "what2", "what3"] as const).map((k) => h("p", {}, t(`prayer.sync.${k}`, lang)))), h("p", { class: "muted" }, t("prayer.sync.offnote1", lang), " ", t("prayer.sync.offnote2", lang)),
    h("label", { for: "ps-city" }, t("prayer.sync.city", lang)), city, h("label", { for: "ps-country" }, t("prayer.sync.country", lang)), country,
    h("label", { style: "display:flex;gap:8px;align-items:center;margin:8px 0" }, h("input", { type: "checkbox", id: "ps-tick", style: "width:24px;margin:0" }), t("prayer.sync.tick", lang)),
    badPlace ? h("p", { class: "err", role: "alert" }, t("prayer.sync.badPlace", lang)) : null,
    needTick ? h("p", { class: "err", role: "alert" }, t("data.consent.needTick", lang)) : null,
    h("button", { class: "btn", type: "button", "data-act": "prayer-sync-on", style: "min-height:44px", onclick: () => {
      const tick = (document.getElementById("ps-tick") as HTMLInputElement | null)?.checked === true;
      needTick = !tick; badPlace = false;
      if (tick && !turnOnPrayerSync(city.value, country.value)) badPlace = true;
      if (tick && !badPlace) needTick = false;
      rerender();
    } }, t("prayer.sync.btn", lang)));
}

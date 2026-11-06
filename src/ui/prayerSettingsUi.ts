// Prayer method, place and alerts cards (moved out of the Deen screen into Settings > Prayer & alerts, settings redesign PR 3e).
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { prefs } from "./state";
import { num } from "./components";
import { activeNs, consentOn, consentPrompt, nsTag, saveBlockedText } from "./entry";
import { DHAKA_COORDS, PRAYER_KEYS, parseCoord } from "../core/prayer";
import { METHOD_IDS, MAX_OFFSET_MIN, parsePrayerSettings, type PrayerSettings } from "../core/prayerMethod";
import { DEFAULT_ALERT_PREFS, parseAlertPrefs } from "../core/prayerAlerts";
import { azanAvailability, notifyState, previewAzan, refreshAzanAvailability } from "./prayerAlerts";
import { settingsHash } from "./settingsRegistry";
import { prayerSyncCard } from "./prayerSyncUi";
import { remindersCard } from "./remindersSettingsUi";
const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));

/** Method, Asr rule and per-prayer minute offsets. Saved on change. A calculation setting only; no consent needed. */
export function prayerMethodCard(lang: Locale): HTMLElement {
  const cur = parsePrayerSettings(prefs.prayerSettings);
  const save = (next: PrayerSettings) => { prefs.prayerSettings = next; rerender(); };
  const opt = (v: string, label: string, on: boolean) => h("option", { value: v, ...(on ? { selected: true } : {}) }, label);
  const method = h("select", { id: "pm-method", "data-prayer-method-select": "1" },
    ...METHOD_IDS.map((m) => opt(m, t(`deen.method.${m}` as Key, lang), cur.method === m))) as HTMLSelectElement;
  method.addEventListener("change", () => save({ ...cur, method: parsePrayerSettings({ method: method.value }).method }));
  const asr = h("select", { id: "pm-asr", "data-prayer-asr-select": "1" },
    opt("standard", t("deen.asr.standard", lang), cur.asr === "standard"), opt("hanafi", t("deen.asr.hanafi", lang), cur.asr === "hanafi")) as HTMLSelectElement;
  asr.addEventListener("change", () => save({ ...cur, asr: asr.value === "hanafi" ? "hanafi" : "standard" }));
  const offs = PRAYER_KEYS.map((k) => {
    const inp = h("input", { id: `pm-off-${k}`, type: "number", min: String(-MAX_OFFSET_MIN), max: String(MAX_OFFSET_MIN), step: "1", inputmode: "numeric", value: String(cur.offsets[k]), "data-prayer-offset": k, style: "width:5em;min-height:44px" }) as HTMLInputElement;
    inp.addEventListener("change", () => { const n = Number(inp.value); save({ ...cur, offsets: { ...cur.offsets, [k]: Number.isInteger(n) && Math.abs(n) <= MAX_OFFSET_MIN ? n : 0 } }); });
    return h("div", { class: "row" }, h("label", { for: `pm-off-${k}` }, t(`deen.prayer.name.${k}` as Key, lang)), inp);
  });
  const reset = h("button", { class: "btn ghost btn-sm", type: "button", "data-act": "prayer-method-reset", onclick: () => save(parsePrayerSettings(null)) }, t("deen.set.methodReset", lang));
  return h("div", { class: "card", "data-prayer-method-card": "1" },
    h("h2", { class: "card-h" }, t("deen.set.methodTitle", lang)),
    h("p", { class: "note", "data-prayer-verify": "1" }, t("deen.set.verify", lang)),
    h("label", { for: "pm-method" }, t("deen.set.method", lang)), method,
    h("label", { for: "pm-asr" }, t("deen.set.asr", lang)), asr,
    h("h3", {}, t("deen.set.offsets", lang)), h("p", { class: "muted" }, t("deen.set.offsetsHint", lang, { n: num(MAX_OFFSET_MIN, lang) })), ...offs, reset);
}

export function prayerSettingsCard(lang: Locale): HTMLElement {
  const coords = prefs.prayerCoords; const alerts = parseAlertPrefs(prefs.prayerAlerts);
  const err = h("p", { class: "err", role: "alert" });
  const lat = h("input", { id: "pr-lat", type: "text", inputmode: "decimal", autocomplete: "off", value: String(coords.lat) }) as HTMLInputElement;
  const lon = h("input", { id: "pr-lon", type: "text", inputmode: "decimal", autocomplete: "off", value: String(coords.lon) }) as HTMLInputElement;
  const save = (c: { lat: number; lon: number }) => { prefs.prayerCoords = c; rerender(); };
  const form = h("form", { novalidate: true, "data-form": "prayer-place" }, consentOn() ? null : consentPrompt(lang),
    h("label", { for: "pr-lat" }, t("deen.set.lat", lang)), lat,
    h("label", { for: "pr-lon" }, t("deen.set.lon", lang)), lon, err,
    h("button", { class: "btn", type: "submit" }, t("deen.set.save", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const la = parseCoord(lat.value, 90), lo = parseCoord(lon.value, 180);
    if (la === null || lo === null) { err.textContent = t("deen.set.locErr", lang); return; }
    if (!consentOn()) { err.textContent = saveBlockedText(lang); return; } // a typed place is personal data: real mode needs the tick
    save({ lat: la, lon: lo });
  });
  const dhaka = h("button", { class: "btn ghost btn-sm", type: "button", "data-act": "prayer-dhaka", onclick: () => save({ ...DHAKA_COORDS }) }, t("deen.set.dhaka", lang));
  const onOff = (label: Key, active: boolean, on: () => void) => h("button", { type: "button", "aria-pressed": String(active), onclick: on }, t(label, lang));
  const setAlerts = (next: typeof alerts) => { prefs.prayerAlerts = next; rerender(); };
  const toggle = (key: "preAlert" | "azan") => (on: boolean) => {
    const next = { ...alerts, [key]: on };
    // Asking for permission needs a tap, so it happens right here when the user switches an alert on.
    if (on && typeof Notification !== "undefined" && Notification.permission === "default") { try { void Notification.requestPermission().finally(() => setAlerts(next)); return; } catch { /* fall through */ } }
    setAlerts(next);
  };
  const mins = h("input", { id: "pr-min", type: "number", min: "1", max: "60", step: "1", inputmode: "numeric", value: String(alerts.preMinutes), "aria-label": t("deen.set.preMin", lang), style: "width:6em" }) as HTMLInputElement;
  mins.addEventListener("change", () => { const n = Number(mins.value); setAlerts({ ...alerts, preMinutes: Number.isInteger(n) && n >= 1 && n <= 60 ? n : DEFAULT_ALERT_PREFS.preMinutes }); });
  const hasAzan = azanAvailability().main || azanAvailability().fajr;
  void refreshAzanAvailability().then((a) => { if ((a.main || a.fajr) !== hasAzan) rerender(); });
  const vol = h("input", { id: "azan-vol", type: "range", min: "0", max: "100", step: "5", value: String(alerts.volume), "aria-label": t("deen.set.volume", lang), style: "width:100%;min-height:44px" }) as HTMLInputElement;
  vol.addEventListener("change", () => setAlerts({ ...alerts, volume: Number(vol.value) }));
  const note = h("p", { class: "muted", "data-preview-note": "1", role: "status" });
  const ns = notifyState();
  const perm = ns === "unsupported" ? t("deen.set.permUnsupported", lang) : ns === "granted" ? t("deen.set.permOk", lang) : ns === "denied" ? t("deen.set.permDenied", lang) : t("deen.set.permAsk", lang);
  const prayerBtns = PRAYER_KEYS.map((k) => h("button", { type: "button", "data-alert-prayer": k, "aria-pressed": String(alerts.prayers[k]), style: "min-height:44px;min-width:44px", onclick: () => setAlerts({ ...alerts, prayers: { ...alerts.prayers, [k]: !alerts.prayers[k] } }) }, t(`deen.prayer.name.${k}` as Key, lang)));
  return h("div", { class: "card", "data-prayer-settings": "1" },
    h("h2", { class: "card-h" }, t("deen.set.title", lang)),
    h("div", { class: "row" }, h("h3", {}, t("deen.set.place", lang)), nsTag(activeNs(), lang)),
    activeNs() === "real" ? h("p", { class: "muted", "data-place-note": "1" }, t("entry.real.note", lang)) : null,
    form, dhaka,
    h("h3", {}, t("deen.set.pre", lang)),
    h("div", { class: "row" }, h("div", { class: "seg", "data-pre-alert": String(alerts.preAlert) }, onOff("deen.set.off", !alerts.preAlert, () => setAlerts({ ...alerts, preAlert: false })), onOff("deen.set.on", alerts.preAlert, () => toggle("preAlert")(true)))),
    h("label", { for: "pr-min" }, t("deen.set.preMin", lang)), mins,
    h("h3", {}, t("deen.set.azan", lang)),
    h("div", { class: "row" }, h("div", { class: "seg", "data-azan-alert": String(alerts.azan) }, onOff("deen.set.off", !alerts.azan, () => setAlerts({ ...alerts, azan: false })), onOff("deen.set.on", alerts.azan, () => toggle("azan")(true)))),
    h("h3", {}, t("deen.set.which", lang)), h("p", { class: "muted" }, t("deen.set.whichHint", lang)),
    h("div", { class: "seg", role: "group", "aria-label": t("deen.set.which", lang), "data-alert-prayers": "1" }, ...prayerBtns),
    h("h3", {}, t("deen.set.sound", lang)),
    h("div", { class: "row" }, h("div", { class: "seg", "data-sound": String(alerts.sound) }, onOff("deen.set.off", !alerts.sound, () => setAlerts({ ...alerts, sound: false })), onOff("deen.set.on", alerts.sound, () => setAlerts({ ...alerts, sound: true })))),
    h("p", { class: "muted", "data-sound-note": "1", "data-azan-file": hasAzan ? "yes" : "no" }, t(hasAzan ? "deen.set.soundNote" : "deen.set.soundNoFile", lang)),
    h("label", { for: "azan-vol" }, t("deen.set.volume", lang), ": ", String(alerts.volume)),
    vol,
    h("button", { class: "btn ghost btn-sm", type: "button", "data-act": "azan-preview", onclick: () => { if (!previewAzan("dhuhr")) note.textContent = t(hasAzan ? "deen.set.previewSilent" : "deen.set.previewNone", lang); } }, t("deen.set.preview", lang)),
    note,
    h("p", { class: "muted", "data-azan-doc": "1" }, t("deen.set.azanDoc", lang)),
    h("p", { class: "muted" }, t("deen.set.defaultNote", lang)),
    h("p", { class: "muted", "data-perm": ns }, perm),
    h("p", { class: "muted" }, t("deen.set.lock", lang)));
}


/** Deen tab: one link row to Prayer settings, with the current alert state. Prayer times and the fast card stay on Deen. */
export function prayerLinkRow(lang: Locale): HTMLElement {
  const a = parseAlertPrefs(prefs.prayerAlerts);
  return h("a", { href: settingsHash("prayer"), class: "card link", "data-prayer-link": "1" }, h("h2", { class: "card-h" }, t("set.cat.prayer", lang)),
    h("p", { class: "muted" }, t("set.sum.prayer", lang, { a: t(a.preAlert || a.azan ? "set.on" : "set.off", lang) })));
}

/** Settings > Prayer & alerts: method (with Asr and offsets), place, alerts. The phone's notification permission state is shown on the alerts card. */
export function prayerPage(row: string | undefined, lang: Locale): HTMLElement {
  const method = prayerMethodCard(lang); method.setAttribute("data-setting-row", "prayermethod");
  const place = prayerSettingsCard(lang); place.setAttribute("data-setting-row", "prayeralerts");
  const main = h("main", { class: "scr scr-settings", "data-settings": "prayer" }, h("a", { href: "#/settings", class: "crumb" }, `← ${t("nav.settings", lang)}`), h("h1", {}, t("set.cat.prayer", lang)),
    h("a", { href: "#/deen", class: "crumb", "data-prayer-times-link": "1" }, t("deen.title", lang)), prayerSyncCard(lang), method, place, remindersCard(lang));
  const target = row === "prayerplace" ? place.querySelector<HTMLElement>("[data-form=prayer-place]") : row ? main.querySelector<HTMLElement>(`[data-setting-row="${row}"]`) : null;
  if (target) { target.classList.add("set-hl"); setTimeout(() => { try { target.scrollIntoView?.({ block: "center" }); } catch { /* ignore */ } }, 0); }
  return main;
}

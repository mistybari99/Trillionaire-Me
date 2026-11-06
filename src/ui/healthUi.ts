// M14 Health and family page (`#/diary/health`), Today and report links. The person's own entries only. Private by default; a separate consent tick
// (on top of the real-data tick) is needed to save in real mode. No normal range, no alert, no advice.
import { h } from "./dom";
import { t, tb, fmtNumber } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { prefs, consentKv, store } from "./state";
import { activeNs, allRecs, consentOn, consentPrompt, nsTag, saveBlockedText, saveTyped } from "./entry";
import { disclaimers } from "./components";
import { fieldById } from "../catalog/fields";
import { checkFreeText } from "../core/safety";
import { HEALTH_KINDS, grantHealthConsent, healthRows, readHealthConsent, revokeHealthConsent, summarise, validateHealth, type HealthRow } from "../core/health";
import { todayIsoKpi } from "./kpiUi";
import type { FieldValue } from "../core/types";

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
const link = (href: string, cls: string, ...kids: Array<Node | string>) => h("a", { href, class: cls }, ...kids);
const kindLabel = (k: string, lang: Locale) => tb(fieldById("health_entry.kind")!.options!.find((o) => o.code === k)!.label, lang);
/** Demo needs no tick. Real needs the real-data tick (consentOn) AND the health tick. */
export const healthAllowed = (): boolean => consentOn() && (activeNs() === "demo" || readHealthConsent(consentKv));
let missing = false;

function gate(lang: Locale): HTMLElement | null {
  if (activeNs() === "demo") return null;
  if (readHealthConsent(consentKv)) return h("p", { class: "muted", "data-health-consent": "on" }, t("hl.consent.on", lang), " ",
    h("button", { class: "btn ghost btn-sm", type: "button", "data-act": "health-withdraw", onclick: () => { revokeHealthConsent(consentKv); rerender(); } }, t("hl.consent.withdraw", lang)));
  return h("div", { class: "card", "data-health-consent": "off" }, h("h2", { class: "card-h" }, t("hl.consent.title", lang)), h("p", {}, t("hl.consent.p1", lang)), h("p", {}, t("hl.consent.p2", lang)),
    h("label", { class: "k-check" }, h("input", { type: "checkbox", id: "health-tick" }), t("hl.consent.tick", lang)),
    h("button", { class: "btn", type: "button", "data-act": "health-consent", onclick: () => {
      if (!(document.getElementById("health-tick") as HTMLInputElement | null)?.checked) { missing = true; rerender(); return; }
      missing = false; grantHealthConsent(consentKv, new Date().toISOString()); rerender(); } }, t("hl.consent.btn", lang)),
    missing ? h("p", { class: "need", role: "alert" }, t("data.consent.needTick", lang)) : null);
}

const valueText = (r: HealthRow, lang: Locale) => (r.value === null ? t("unknown.unknown", lang) : `${fmtNumber(r.value, lang)}${r.unit ? ` ${r.unit}` : ""}`);

/** Today and the report: a quiet line with counts only, never values. Nothing without an entry (or while real health data is not allowed). */
export function healthCard(lang: Locale, where: "today" | "report"): HTMLElement | null {
  if (!healthAllowed()) return null;
  const sum = summarise(healthRows(allRecs()), todayIsoKpi());
  if (!sum.length) return null;
  return h("section", { class: "card", "data-health-card": where, "aria-label": t("hl.title", lang) },
    h("div", { class: "row" }, h("h2", { class: "card-h" }, t("hl.title", lang)), nsTag(activeNs(), lang)),
    h("ul", { class: "plain" }, ...sum.map((s) => h("li", { "data-health-kind": s.kind }, `${kindLabel(s.kind, lang)}: `, t("hl.days", lang, { n: fmtNumber(s.daysWithEntry, lang) })))),
    link("#/diary/health", "crumb", t("hl.open", lang)));
}

export function healthScreen(): HTMLElement {
  const lang = prefs.lang; const allowed = healthAllowed(); const today = todayIsoKpi();
  const rows = allowed ? healthRows(allRecs()) : [];
  const date = h("input", { id: "hl-date", type: "date", value: today }) as HTMLInputElement;
  const kind = h("select", { id: "hl-kind" }, ...HEALTH_KINDS.map((k) => h("option", { value: k }, kindLabel(k, lang))));
  const value = h("input", { id: "hl-value", type: "text", inputmode: "decimal", autocomplete: "off" });
  const unit = h("input", { id: "hl-unit", type: "text", maxlength: "20", autocomplete: "off" });
  const note = h("input", { id: "hl-note", type: "text", maxlength: "200", autocomplete: "off" });
  const err = h("p", { class: "err", role: "alert" });
  const form = h("form", { novalidate: true, "data-form": "health" }, consentOn() ? null : consentPrompt(lang),
    h("label", { for: "hl-date" }, tb(fieldById("health_entry.date")!.label, lang)), date, h("label", { for: "hl-kind" }, tb(fieldById("health_entry.kind")!.label, lang)), kind,
    h("label", { for: "hl-value" }, tb(fieldById("health_entry.value")!.label, lang)), value, h("label", { for: "hl-unit" }, t("hl.unit.label", lang)), unit,
    h("label", { for: "hl-note" }, tb(fieldById("health_entry.note")!.label, lang)), note, err, h("button", { class: "btn", type: "submit" }, t("hl.add", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault(); err.textContent = "";
    if (!healthAllowed()) { err.textContent = saveBlockedText(lang); return; }
    const bad = validateHealth({ kind: kind.value, date: date.value, value: value.value, unit: unit.value, note: note.value });
    if (bad) { err.textContent = t(`hl.err.${bad}` as Key, lang); return; }
    if (![unit.value, note.value].every((x) => checkFreeText(x).ok)) { err.textContent = t("intake.secretRejected", lang); return; }
    const typed = (x: unknown): FieldValue => ({ state: "value", value: x, label: "FACT" });
    const raw = value.value.trim().replace(/,/g, "").replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6));
    const values: Record<string, FieldValue> = { "health_entry.date": typed(date.value), "health_entry.kind": typed(kind.value) };
    if (raw !== "") values["health_entry.value"] = typed(Number(raw)); if (unit.value.trim()) values["health_entry.unit"] = typed(unit.value.trim()); if (note.value.trim()) values["health_entry.note"] = typed(note.value.trim());
    if (!saveTyped({ id: `hl-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, entity: "health_entry", createdAt: new Date().toISOString(), values })) { err.textContent = saveBlockedText(lang); return; }
    rerender();
  });
  const sum = summarise(rows, today);
  return h("main", { class: "scr scr-health" }, link("#/diary", "crumb", `← ${t("diary.title", lang)}`), h("h1", {}, t("hl.title", lang)), h("p", { class: "sub" }, t("hl.intro", lang)),
    h("div", { class: "note", role: "note", "data-health-banner": "1" }, h("p", {}, t("hl.banner", lang))), gate(lang),
    allowed ? h("div", {}, ((n) => (n ? h("p", { class: "card", "data-health-note": "1" }, h("span", { class: "muted" }, `${t("hl.diaryNote", lang)}: `), n) : null))(String((((allRecs().find((r) => r.id === "intake-profile")?.values ?? {})["profile.health_note"] as { value?: unknown } | undefined)?.value) ?? "")),
      h("h2", {}, t("hl.add", lang)), form,
      sum.length ? h("section", { class: "card", "data-health-summary": "1" }, h("h2", { class: "card-h" }, t("hl.recent", lang)), h("ul", { class: "plain" }, ...sum.map((s) => h("li", { "data-health-kind": s.kind }, h("strong", {}, kindLabel(s.kind, lang)), ` · ${t("hl.days", lang, { n: fmtNumber(s.daysWithEntry, lang) })} · ${t("hl.latest", lang, { d: s.latest!.date, v: valueText(s.latest!, lang) })}`))))
        : h("p", { class: "muted", "data-health-empty": "1" }, t("hl.none", lang)),
      rows.length ? h("section", { class: "card" }, h("h2", { class: "card-h" }, t("hl.all", lang)), h("ul", { class: "plain" }, ...rows.slice(0, 60).map((r) => h("li", { "data-health-row": r.id }, nsTag(r.ns, lang), ` ${r.date} · ${kindLabel(r.kind, lang)} · ${valueText(r, lang)}`, r.note ? ` · ${r.note}` : "", " ",
        h("button", { class: "btn ghost btn-sm", type: "button", "data-remove": r.id, onclick: () => { store[activeNs()].delete(r.id); rerender(); } }, t("risk.remove", lang)))))) : null)
      : h("p", { class: "muted", "data-health-locked": "1" }, t("hl.locked", lang)),
    h("p", { class: "muted" }, t("hl.note", lang)), disclaimers(lang, ["advice"]));
}

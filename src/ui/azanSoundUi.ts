// Azan recording choice, speed and preview (Settings > Prayer & alerts). Slots without a file say "Not added" and cannot be chosen.
// The speed slider updates the length line live; "Save speed" keeps it. Unknown length says "unknown", never 0.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Locale } from "../i18n/registry";
import { kBtn, kChip, kList, kRow } from "./kit";
import { azanAvailability, azanDuration, chosenAzanFile, previewAzan } from "./prayerAlerts";
import { chooseSlot, hasAnyAzan, type AzanSlotState } from "../core/azanSlots";
import { SPEED_MAX, SPEED_MIN, SPEED_STEP, clampSpeed, speedReadout } from "../core/azanSpeed";
import type { AlertPrefs } from "../core/prayerAlerts";

const speedText = (x: number): string => x.toFixed(2).replace(/0$/, "");
export const slotLabel = (s: AzanSlotState, lang: Locale): string => (s.label ? (lang === "en" ? s.label.en : s.label.bn) : t("deen.azan.slotName", lang, { n: s.id }));

/** Text of the length line for a known or unknown length and a speed. */
export function readoutText(duration: number | null, speed: number, lang: Locale): string {
  const r = speedReadout(duration, speed);
  if (!r.known) return t("deen.azan.lenUnknown", lang, { x: speedText(r.rate) });
  const d = String(r.diffSec);
  return r.direction === "same" ? t("deen.azan.lenSame", lang, { from: r.original, x: speedText(r.rate) })
    : t(r.direction === "shorter" ? "deen.azan.lenShorter" : "deen.azan.lenLonger", lang, { from: r.original, to: r.adjusted, d, x: speedText(r.rate) });
}

export function azanSoundBlock(alerts: AlertPrefs, setAlerts: (next: AlertPrefs) => void, lang: Locale): Array<HTMLElement> {
  const av = azanAvailability();
  const any = hasAnyAzan(av);
  const active = chooseSlot(av, alerts.azanSlot);
  let pending = alerts.azanSpeed;
  let duration: number | null = null;

  const note = h("p", { class: "muted", "data-preview-note": "1", role: "status" });
  const play = (slot?: string) => { if (!previewAzan("dhuhr", { speed: pending, ...(slot ? { slot } : {}) })) note.textContent = t(any ? "deen.set.previewSilent" : "deen.set.previewNone", lang); else note.textContent = ""; };

  const rows = av.slots.map((s) => {
    const added = s.main !== null, chosen = active?.id === s.id;
    const sub = [s.fajr ? t("deen.azan.slotFajr", lang) : "", s.source ?? ""].filter(Boolean).join(" · ");
    return kRow({
      title: slotLabel(s, lang), sub: sub || null,
      trail: [
        kChip(t(added ? "deen.azan.slotAdded" : "deen.azan.slotMissing", lang), added ? "ok" : "unk"),
        kBtn(t(chosen ? "deen.azan.chosen" : "deen.azan.choose", lang), { variant: chosen ? "primary" : "secondary", size: "sm", attrs: { "data-act": "azan-choose", "aria-pressed": String(chosen), ...(added ? {} : { disabled: true }), onclick: () => { if (added && !chosen) setAlerts({ ...alerts, azanSlot: s.id }); } } }),
        added ? kBtn(t("deen.azan.play", lang), { variant: "ghost", size: "sm", attrs: { "data-act": "azan-play", "data-azan-play": s.id, onclick: () => play(s.id) } }) : null,
      ],
      attrs: { "data-azan-slot": s.id, "data-azan-state": added ? (chosen ? "chosen" : "added") : "missing" },
    });
  });

  const readout = h("p", { class: "muted", "data-azan-readout": "1", role: "status", "aria-live": "polite" }, readoutText(duration, pending, lang));
  const valueLabel = h("span", { "data-azan-speed-value": "1" }, t("deen.azan.speedNow", lang, { x: speedText(pending) }));
  const saved = h("p", { class: "muted", "data-azan-speed-saved": "1" }, t("deen.azan.speedSaved", lang, { x: speedText(alerts.azanSpeed) }));
  const update = () => { readout.textContent = readoutText(duration, pending, lang); valueLabel.textContent = t("deen.azan.speedNow", lang, { x: speedText(pending) }); };
  const slider = h("input", { id: "azan-speed", type: "range", min: String(SPEED_MIN), max: String(SPEED_MAX), step: String(SPEED_STEP), value: String(pending), "aria-label": t("deen.azan.speed", lang) }) as HTMLInputElement;
  slider.addEventListener("input", () => { pending = clampSpeed(Number(slider.value)); update(); });
  void azanDuration(chosenAzanFile(alerts.azanSlot)).then((d) => { duration = d; update(); });

  return [
    h("h3", {}, t("deen.azan.slots", lang)),
    h("p", { class: "muted", "data-azan-slots-note": "1" }, t(any ? "deen.azan.slotsHint" : "deen.azan.noneAdded", lang)),
    kList(...rows),
    h("h3", {}, t("deen.azan.speed", lang)),
    h("label", { for: "azan-speed" }, valueLabel),
    slider,
    h("div", { class: "row" }, h("span", { class: "muted" }, `${t("deen.azan.speedMin", lang, { x: speedText(SPEED_MIN) })} · ${t("deen.azan.speedMax", lang, { x: speedText(SPEED_MAX) })}`)),
    readout,
    h("div", { class: "row" },
      kBtn(t("deen.azan.speedSave", lang), { variant: "secondary", size: "sm", attrs: { "data-act": "azan-speed-save", onclick: () => setAlerts({ ...alerts, azanSpeed: pending }) } }),
      kBtn(t("deen.azan.speedReset", lang), { variant: "ghost", size: "sm", attrs: { "data-act": "azan-speed-reset", onclick: () => { pending = 1; slider.value = "1"; update(); } } })),
    saved,
    kBtn(t("deen.set.preview", lang), { variant: "ghost", size: "sm", attrs: { "data-act": "azan-preview", onclick: () => play() } }),
    note,
  ];
}

import { h } from "./dom";
import { t, fmtNumber } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Label } from "../core/types";
import type { Locale } from "../i18n/registry";
import type { FieldDef } from "../catalog/types";
import { tb } from "../i18n/t";

/** Every user-data or computed value is rendered through here so it always carries a label (TM-REQ-006). */
export function valueEl(text: string, label: Label, lang: Locale): HTMLElement {
  return h("span", { class: "val", "data-value": "1", "data-label": label }, text, h("small", { class: `chip k-chip chip-${label}` }, t(`label.${label}` as Key, lang)));
}

export const num = (n: number, lang: Locale) => fmtNumber(n, lang);
/** A calm "please do this first" prompt (tick the box, write a name). Not an error: uses the --calm token, never the danger colour. Real failures keep class "err". */
export function showNeed(el: HTMLElement, text: string): void { el.className = "need k-notice k-notice--calm"; el.setAttribute("role", "status"); el.textContent = text; }

export function demoBadge(lang: Locale) { return h("span", { class: "badge k-chip k-chip--demo" }, t("badge.demo", lang)); }

/** Disclaimer keys already shown on this screen. Reset at the start of every route render, so the same disclaimer text can never appear twice on one screen. */
const shownDisclaimers = new Set<string>();
export function resetNotices(): void { shownDisclaimers.clear(); }
/** ONE calm legal notice with a short list. Keys already shown on this screen are left out; nothing is returned when all were shown. */
export function disclaimers(lang: Locale, which: Array<"noGuarantee" | "advice" | "noFatwa"> = ["noGuarantee", "advice"]): HTMLElement | null {
  const fresh = which.filter((w) => !shownDisclaimers.has(w));
  if (!fresh.length) return null;
  for (const w of fresh) shownDisclaimers.add(w);
  return h("aside", { class: "note k-notice k-notice--legal", role: "note", "data-legal": "1" }, h("ul", {}, ...fresh.map((w) => h("li", { "data-disclaimer": w }, t(`disclaimer.${w}` as Key, lang)))));
}

export function fieldHelp(f: FieldDef, lang: Locale): HTMLElement {
  const row = (k: Key, v: string | undefined) => (v ? h("div", { class: "hrow" }, h("dt", {}, t(k, lang)), h("dd", {}, v)) : null);
  return h("details", { class: "help" },
    h("summary", {}, t("help.show", lang)),
    h("dl", {},
      row("help.what", tb(f.help.what, lang)),
      row("help.why", tb(f.help.why, lang)),
      row("help.example", tb(f.help.example, lang)),
      row("help.format", f.help.format ? tb(f.help.format, lang) : undefined),
      row("help.importance", `${t(`importance.${f.importance}` as Key, lang)} · ${t(`requirement.${f.requirement}` as Key, lang)}`),
      row("help.privacy", t(`privacy.${f.privacy}` as Key, lang)),
      row("help.purpose", t(`purpose.${f.purpose}` as Key, lang)),
      row("help.access", t(`access.${f.access}` as Key, lang)),
    ));
}

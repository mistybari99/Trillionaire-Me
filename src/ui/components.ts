import { h } from "./dom";
import { t, fmtNumber } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Label } from "../core/types";
import type { Locale } from "../i18n/registry";
import type { FieldDef } from "../catalog/types";
import { tb } from "../i18n/t";

/** Every user-data or computed value is rendered through here so it always carries a label (TM-REQ-006). */
export function valueEl(text: string, label: Label, lang: Locale): HTMLElement {
  return h("span", { class: "val", "data-value": "1", "data-label": label }, text, h("small", { class: `chip chip-${label}` }, t(`label.${label}` as Key, lang)));
}

export const num = (n: number, lang: Locale) => fmtNumber(n, lang);

export function demoBadge(lang: Locale) { return h("span", { class: "badge" }, t("badge.demo", lang)); }

export function disclaimers(lang: Locale, which: Array<"noGuarantee" | "advice" | "noFatwa"> = ["noGuarantee", "advice"]) {
  return h("div", { class: "note", role: "note" }, ...which.map((w) => h("p", {}, t(`disclaimer.${w}` as Key, lang))));
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

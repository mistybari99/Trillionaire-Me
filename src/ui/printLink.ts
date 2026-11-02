// The one link to a print page (Save as PDF). Used from the report, the plan, the team page and Backup & export.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import type { PrintKind } from "../core/printDoc";

export const printLink = (kind: PrintKind, lang: Locale, cls = "btn ghost"): HTMLElement =>
  h("a", { href: `#/journey/print/${kind}`, class: cls, "data-print-link": kind }, t(`print.link.${kind}` as Key, lang));

// Catalog-driven input: preserve scalar fields, and keep list/multichoice values as lists.
import type { FieldDef } from "../catalog/types";
import type { FieldValue, UnknownState } from "../core/types";
import type { Locale } from "../i18n/registry";
import type { Key } from "../i18n/packs";
import { checkFreeText } from "../core/safety";
import { h } from "./dom";
import { t, tb } from "../i18n/t";

type ReadResult = FieldValue | null | "invalid" | "secret";
export function inputFor(f: FieldDef, lang: Locale, cur: FieldValue | undefined): { el: HTMLElement; read: () => ReadResult } {
  const unkSel = h("select", { "aria-label": t("intake.valueFor", lang), "data-role": "state" },
    h("option", { value: "value" }, t("intake.valueFor", lang)),
    ...f.unknownStates.map((u) => h("option", { value: u }, t(`unknown.${u}` as Key, lang))));
  if (cur && cur.state !== "value") unkSel.value = cur.state;
  const unknown = (): { state: UnknownState } | null => {
    const st = f.unknownStates.length ? unkSel.value as UnknownState | "value" : "value";
    return st === "value" ? null : { state: st };
  };
  const wrap = (input: HTMLElement) => h("div", {}, input, f.unknownStates.length ? h("div", { class: "unk" }, unkSel) : null);
  // Clearing an existing list must overwrite it as unknown; a never-answered blank stays unanswered.
  const listValue = (items: string[]): FieldValue | null => items.length ? { state: "value", value: items, label: "DEMO" } : cur?.state === "value" ? { state: "unknown" } : null;
  if (f.type === "multichoice") {
    const raw = cur?.state === "value" ? cur.value : [];
    const selected = new Set(Array.isArray(raw) ? raw.map(String) : typeof raw === "string" ? raw.split(",").map(x => x.trim()).filter(Boolean) : []);
    const options = [...(f.options ?? [])];
    // Keep a previously saved code even when its catalog option has since been removed.
    for (const code of selected) if (!options.some(o => o.code === code)) options.push({ code, label: { en: code, bn: code } });
    const checks = options.map((o, i) => {
      const input = h("input", { id: `f-${f.id}-${i}`, type: "checkbox", value: o.code, "data-multi-option": o.code, ...(selected.has(o.code) ? { checked: true } : {}) });
      return { input, row: h("label", { for: input.id, class: "choice-row" }, input, h("span", {}, tb(o.label, lang))) };
    });
    const group = h("fieldset", { id: `f-${f.id}`, class: "field-choices", "data-multichoice": f.id }, h("legend", {}, tb(f.label, lang)), ...checks.map(c => c.row));
    return { el: wrap(group), read: () => unknown() ?? listValue(checks.filter(c => c.input.checked).map(c => c.input.value)) };
  }
  if (f.type === "list") {
    const raw = cur?.state === "value" ? cur.value : [];
    const input = h("textarea", { id: `f-${f.id}`, rows: "4", "aria-label": tb(f.label, lang), "data-list-input": f.id, "aria-describedby": `f-${f.id}-hint` });
    input.value = Array.isArray(raw) ? raw.map(String).join("\n") : typeof raw === "string" ? raw : "";
    return { el: wrap(h("div", {}, input, h("p", { id: `f-${f.id}-hint`, class: "muted" }, t("input.list.help", lang)))), read: () => {
      const st = unknown(); if (st) return st;
      const items = [...new Set(input.value.split(/\r?\n/).map(x => x.trim()).filter(Boolean))];
      if (items.some(item => !checkFreeText(item).ok)) return "secret";
      return listValue(items);
    } };
  }
  let input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  const curVal = cur && cur.state === "value" ? String(cur.value) : "";
  if (f.options) {
    input = h("select", { id: `f-${f.id}` }, h("option", { value: "" }, t("intake.choose", lang)), ...f.options.map((o) => h("option", { value: o.code }, tb(o.label, lang))));
  } else if (f.type === "number" || f.type === "money") {
    input = h("input", { id: `f-${f.id}`, type: "text", inputmode: "decimal" });
  } else if (f.type === "date") {
    input = h("input", { id: `f-${f.id}`, type: "date" });
  } else {
    input = h("input", { id: `f-${f.id}`, type: "text", maxlength: /\.(note|entry|evidence)$/.test(f.id) ? "200" : "80", autocomplete: "off" });
  }
  input.value = curVal;
  return { el: wrap(input), read: () => {
    const st = unknown(); if (st) return st;
    const raw = input.value.trim();
    if (raw === "") return null;
    if (f.type === "number" || f.type === "money") {
      const n = Number(raw.replace(/,/g, "").replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6)));
      return Number.isFinite(n) ? { state: "value", value: n, label: "DEMO" } : "invalid";
    }
    if (f.type === "text" && !checkFreeText(raw).ok) return "secret";
    return { state: "value", value: raw, label: "DEMO" };
  } };
}

import { h } from "./dom";
import { t } from "../i18n/t";
import type { Locale } from "../i18n/registry";
import { store } from "./state";
import { exportCsv } from "../core/csv";

// TM-REQ-153: spreadsheet copy of the person's own entries. One file per kind, never mixed. Real needs the consent tick. Nothing is uploaded.
export function csvCard(realOn: boolean, lang: Locale): HTMLElement {
  const save = (ns: "demo" | "real") => {
    const stamp = new Date().toISOString().slice(0, 10);
    const a = h("a", { href: URL.createObjectURL(new Blob([exportCsv(store, ns)], { type: "text/csv;charset=utf-8" })), download: `tm-${ns}-data-${stamp}.csv` });
    document.body.append(a); a.click(); a.remove();
  };
  return h("section", { class: "card", "data-card": "csv" }, h("h2", { class: "card-h" }, t("csv.title", lang)), h("p", { class: "muted" }, t("csv.note", lang)),
    h("div", { class: "actions" },
      h("button", { class: "btn ghost", type: "button", "data-act": "csv-demo", onclick: () => save("demo") }, t("csv.demo", lang)),
      h("button", { class: "btn ghost", type: "button", "data-act": "csv-real", ...(realOn ? {} : { disabled: true }), onclick: () => save("real") }, t("csv.real", lang))),
    realOn ? null : h("p", { class: "muted", "data-csv-locked": "1" }, t("csv.locked", lang)));
}


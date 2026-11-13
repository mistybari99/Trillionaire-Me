// CSV import card (More > Data) and the data dictionary page. Import checks the whole file first, then asks; the last import can be undone.
import { h } from "./dom";
import { t, tb } from "../i18n/t";
import type { Key } from "../i18n/packs";
import { consentKv, prefs, store } from "./state";
import { disclaimers, num } from "./components";
import { REAL_OWNER } from "./entry";
import { CSV_HEADER } from "../core/csv";
import { applyImport, lastImport, planImport, undoImport, type ImportPlan } from "../core/csvImport";
import { readConsent } from "../core/consent";
import { CATALOG_VERSION, FIELDS } from "../catalog/fields";
import { ENTITIES } from "../schema/entities";

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
let pending: ImportPlan | null = null;
let notice: { key: Key; vars?: Record<string, string> } | null = null;

export function resetImportState() { pending = null; notice = null; }

export function importCard(lang: typeof prefs.lang): HTMLElement {
  const file = h("input", { id: "csv-file", type: "file", accept: ".csv,text/csv", "data-act": "csv-file" }) as HTMLInputElement;
  const check = h("button", { class: "btn ghost btn-sm", type: "button", "data-act": "csv-check", onclick: async () => {
    const f = file.files?.[0]; if (!f) { notice = { key: "imp.nofile" }; pending = null; rerender(); return; }
    let text = ""; try { text = await f.text(); } catch { notice = { key: "imp.unreadable" }; pending = null; rerender(); return; }
    pending = planImport(text, store); notice = null; rerender();
  } }, t("imp.check", lang));
  const p = pending;
  const errs = p && p.errors.length ? h("div", { class: "note", role: "alert", "data-imp-errors": String(p.errors.length) },
    h("p", {}, t("imp.errors", lang, { n: num(p.errors.length, lang) })),
    h("ul", {}, ...p.errors.slice(0, 8).map((e) => h("li", { "data-imp-error": e.code }, `${e.row > 0 ? t("imp.row", lang, { n: num(e.row, lang) }) + ": " : ""}${t(`imp.err.${e.code}` as Key, lang)}${e.field ? ` (${e.field})` : ""}`)))) : null;
  const realBlocked = !!p && p.ns === "real" && !readConsent(consentKv);
  const ready = p && !p.errors.length && p.ns
    ? h("div", { "data-imp-ready": p.ns },
      h("p", {}, t("imp.ready", lang, { n: num(p.records.length, lang), s: num(p.skipped.length, lang), ns: t(p.ns === "real" ? "badge.real" : "badge.demo", lang) })),
      realBlocked ? h("p", { class: "muted", "data-imp-locked": "1" }, t("imp.locked", lang)) : null,
      h("button", { class: "btn", type: "button", "data-act": "csv-import", ...(realBlocked || !p.records.length ? { disabled: true } : {}), onclick: () => {
        const r = applyImport(store, p, consentKv, consentKv, p.ns === "real" ? REAL_OWNER : "demo-user");
        pending = null; notice = r.ok ? { key: "imp.done", vars: { n: String(r.added) } } : { key: r.reason === "needs_consent" ? "imp.locked" : "imp.nothing" }; rerender();
      } }, t("imp.go", lang))) : null;
  const last = lastImport(consentKv);
  const undo = last ? h("div", { "data-imp-undo": last.ns }, h("p", { class: "muted" }, t("imp.last", lang, { n: num(last.ids.length, lang), ns: t(last.ns === "real" ? "badge.real" : "badge.demo", lang) })),
    h("button", { class: "btn ghost btn-sm", type: "button", "data-act": "csv-undo", onclick: () => { const n = undoImport(store, consentKv); notice = { key: "imp.undone", vars: { n: String(n) } }; rerender(); } }, t("imp.undo", lang))) : null;
  return h("section", { class: "card", "data-card": "csv-import" }, h("h2", { class: "card-h" }, t("imp.title", lang)), h("p", { class: "muted" }, t("imp.note", lang)),
    h("label", { for: "csv-file" }, t("imp.file", lang)), file, check, errs, ready,
    notice ? h("p", { role: "status", "data-imp-notice": notice.key }, t(notice.key, lang, notice.vars ?? {})) : null, undo,
    h("a", { href: "#/more/dictionary", class: "btn ghost btn-sm" }, t("dict.link", lang)));
}

export function dictionaryScreen(): HTMLElement {
  const lang = prefs.lang;
  const cols = CSV_HEADER.map((c) => h("li", {}, h("code", {}, c), ` · ${t(`dict.col.${c}` as Key, lang)}`));
  const groups = ENTITIES.filter((e) => FIELDS.some((f) => f.entity === e.id)).map((e) => h("details", { class: "help", "data-dict-entity": e.id },
    h("summary", {}, `${tb(e.name, lang)} · ${num(FIELDS.filter((f) => f.entity === e.id).length, lang)}`),
    h("table", { class: "table-compact" }, h("tbody", {}, ...FIELDS.filter((f) => f.entity === e.id).map((f) => {
      const restricted = f.privacy === "worship" || f.privacy === "health";
      const allowed = f.options?.length ? f.options.map((o) => o.code).join(", ") : "";
      return h("tr", { "data-dict-field": f.id },
        h("th", { scope: "row" }, h("code", {}, f.id), h("br"), tb(f.label, lang)),
        h("td", {}, t(`dict.type.${f.type}` as Key, lang), f.unit ? ` · ${f.unit}` : "", allowed ? h("div", { class: "muted" }, `${t("dict.values", lang)}: ${allowed}`) : null,
          h("div", { class: "muted" }, t(`privacy.${f.privacy}` as Key, lang), " · ", t(restricted ? "dict.noimport" : "dict.import", lang))));
    })))));
  return h("main", { "data-screen": "dictionary" }, h("a", { href: "#/settings/about", class: "crumb" }, `← ${t("set.cat.about", lang)}`), h("h1", {}, t("dict.title", lang)),
    h("p", { class: "sub" }, t("dict.intro", lang, { n: num(FIELDS.length, lang), v: num(CATALOG_VERSION, lang) })),
    h("section", { class: "card" }, h("h2", { class: "card-h" }, t("dict.csv", lang)), h("p", {}, t("dict.csv.note", lang)), h("ul", {}, ...cols)),
    ...groups, disclaimers(lang, ["advice"]));
}

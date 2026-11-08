// Business type on a venture card (M09, BUILD-02 phase C). Collapsible and closed by default. The person picks a type (or searches, or defines their own),
// answers one question at a time (Skip and Back allowed; blank = Unknown, typed 0 = 0), sees the calculations, and keeps a private checklist of questions and risks.
// Nothing is rated, counted or compared. Every number is the person's own. Saving: entryNs() guard, free text checked, written back with storeOf(rec).put.
import "./styles_sector.css";
import { h } from "./dom";
import { t, tb, fmtNumber } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import type { FieldValue, TMRecord } from "../core/types";
import { CUSTOM_ID, LIB_FORMULAS, UNIT_KINDS, getFamily, getLibFormula, listFamilies, searchFamilies, type CustomDef, type SectorFamily, type UnitKind } from "../core/sectors";
import { MONTH_IDS, breakEvenLink, clearAnswers, customProblems, readSectorData, sectorValues, ventureSectorView, withAnswer, withCheck, withCustom, withSector, type ResultRow, type SectorData, type SectorView } from "../core/ventureSector";
import { parseAmount, ventureViews } from "../core/ventures";
import { starRows } from "../core/northStar";
import { checkFreeText } from "../core/safety";
import { allRecs, entryNs, labelFor, saveBlockedText, storeOf } from "./entry";
import { bdt, estimateLabel } from "./ventureCard";
import { disclaimers, valueEl } from "./components";
import { todayIsoKpi } from "./kpiUi";

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));

/** Where each venture's panel is (kept while the screen is redrawn after a save). Not saved anywhere. */
interface Ui { open: boolean; step: number | null; picking: boolean; confirm: boolean }
const ui = new Map<string, Ui>();
/** Forgets every panel position (tests, and a fresh start after a restore). */
export const resetVentureSectorUi = (): void => ui.clear();
const uiOf = (id: string): Ui => { let u = ui.get(id); if (!u) { u = { open: false, step: null, picking: false, confirm: false }; ui.set(id, u); } return u; };

const HALAL_ROUTE = "#/more/halal-flags";
const MEASURES_ROUTE = "#/journey/northstar";

const round2 = (n: number) => Math.round(n * 100) / 100;
/** One result as text: taka for money, a percent sign, days; everything else a plain number. */
export function formatResult(kind: string, value: number, lang: Locale): string {
  if (kind === "money") return bdt(value, lang);
  if (kind === "percent") return t("vs.fmt.pct", lang, { n: fmtNumber(round2(value), lang) });
  if (kind === "days") return t("vs.fmt.days", lang, { n: fmtNumber(round2(value), lang) });
  return fmtNumber(round2(value), lang);
}

const unitKey = (u: UnitKind): Key => `vs.unit.${u}` as Key;
const monthKey = (m: string): Key => `vs.m.${m}` as Key;

function resultName(r: ResultRow, lang: Locale): string {
  if (r.id === "season-seasonalitySpread") return t("vs.season.spread", lang);
  if (r.id === "season-seasonalitySpreadPct") return t("vs.season.pct", lang);
  return tb(r.name, lang);
}

/** "Unknown, needs X, Y" for a calculation with missing answers. */
function needsText(r: ResultRow, view: SectorView, lang: Locale): string {
  const label = (id: string) => view.family?.inputs.find((i) => i.id === id)?.label;
  const parts: string[] = [];
  let months = false;
  for (const id of r.missing) { if ((MONTH_IDS as readonly string[]).includes(id)) { months = true; continue; } const l = label(id); parts.push(l ? tb(l, lang) : id); }
  if (months) parts.push(t("vs.months", lang));
  return t("vs.res.needs", lang, { what: parts.join(", ") });
}

/** The live record for a venture (the one in the store, never a stale copy). */
const live = (rec: TMRecord): TMRecord | null => storeOf(rec).get(rec.id);

/** Saves new sector data on the venture. False (and nothing saved) while real mode has no consent tick. */
function save(rec: TMRecord, data: SectorData): boolean {
  if (!entryNs()) return false;
  const cur = live(rec); if (!cur) return false;
  storeOf(cur).put({ ...cur, values: { ...cur.values, ...sectorValues(data, labelFor(cur.ns)) } });
  return true;
}

/** Runs a change against the live record and redraws. On a blocked save the message goes into `msg`. */
function change(rec: TMRecord, msg: HTMLElement, lang: Locale, fn: (d: SectorData) => SectorData, then?: () => void): boolean {
  const cur = live(rec); if (!cur) return false;
  if (!entryNs()) { msg.textContent = saveBlockedText(lang); return false; }
  if (!save(rec, fn(readSectorData(cur)))) { msg.textContent = saveBlockedText(lang); return false; }
  then?.(); rerender(); return true;
}

// ---- pick a type ----
const withCustomLast = (list: SectorFamily[]): SectorFamily[] => [...list.filter((f) => f.id !== CUSTOM_ID), ...list.filter((f) => f.id === CUSTOM_ID)];

function picker(rec: TMRecord, lang: Locale, msg: HTMLElement): HTMLElement {
  const id = rec.id;
  const q = h("input", { id: `vs-q-${id}`, type: "text", maxlength: "40", autocomplete: "off", "data-sector-search": id });
  const list = h("ul", { class: "plain vs-list", "data-sector-matches": id });
  const choose = (fid: string) => change(rec, msg, lang, (d) => withSector(d, fid), () => {
    const u = uiOf(id); u.picking = false; u.confirm = false;
    const fam = getFamily(fid); const d = readSectorData(live(rec) ?? rec);
    u.step = fam && fam.id !== CUSTOM_ID && fam.inputs.length && Object.keys(d.inputs).length === 0 ? 0 : null;
  });
  const draw = () => {
    // The first matches by name or alias (English or Bangla); "My own type" is always last, whatever the search says.
    const real = q.value.trim() ? searchFamilies(q.value).filter((f) => f.id !== CUSTOM_ID).slice(0, 8) : [];
    const shown = withCustomLast([...real, ...listFamilies().filter((f) => f.id === CUSTOM_ID)]);
    list.replaceChildren(...(q.value.trim() && !real.length ? [h("li", { class: "muted", "data-sector-nomatch": "1" }, t("vs.search.none", lang))] : []),
      ...shown.map((f) => h("li", {}, h("button", { class: "btn ghost", type: "button", "data-sector-pick": f.id, onclick: () => { choose(f.id); } }, tb(f.name, lang)))));
  };
  q.addEventListener("input", draw); draw();
  const sel = h("select", { id: `vs-s-${id}`, "data-sector-select": id }, ...withCustomLast(listFamilies()).map((f) => h("option", { value: f.id }, tb(f.name, lang))));
  return h("div", { class: "vs-pick" },
    h("label", { for: `vs-q-${id}` }, t("vs.search", lang)), q, list,
    h("label", { for: `vs-s-${id}` }, t("vs.pick", lang)), sel,
    h("button", { class: "btn ghost btn-sm", type: "button", "data-sector-use": id, onclick: () => { choose(sel.value); } }, t("vs.use", lang)));
}

// ---- one question at a time ----
function askForm(rec: TMRecord, view: SectorView, step: number, lang: Locale): HTMLElement {
  const id = rec.id; const item = view.inputs[step]!; const inp = item.input;
  const field = h("input", { id: `vs-a-${id}`, type: "text", inputmode: "decimal", autocomplete: "off", "data-sector-input": inp.id, value: item.value === null ? "" : String(item.value) });
  const msg = h("p", { class: "err", role: "alert" });
  const last = step >= view.inputs.length - 1;
  const go = (to: number | null) => { uiOf(id).step = to; rerender(); };
  const f = h("form", { novalidate: true, class: "vs-ask", "data-sector-ask": id, "data-step": String(step) },
    h("p", { class: "muted" }, t("vs.q.of", lang, { i: step + 1, n: view.inputs.length })),
    h("label", { for: `vs-a-${id}` }, tb(inp.label, lang)),
    inp.hint ? h("p", { class: "muted" }, tb(inp.hint, lang)) : null,
    h("p", { class: "muted" }, `${t(unitKey(inp.unit), lang)}. ${t(inp.perPeriod ? "vs.per.yes" : "vs.per.no", lang)}`),
    field, msg,
    h("div", { class: "row vs-btns" },
      step > 0 ? h("button", { class: "btn ghost btn-sm", type: "button", "data-sector-back": "1", onclick: () => go(step - 1) }, t("vs.back", lang)) : null,
      h("button", { class: "btn ghost btn-sm", type: "button", "data-sector-skip": "1", onclick: () => go(last ? null : step + 1) }, t("vs.skip", lang)),
      h("button", { class: "btn btn-sm", type: "submit", "data-sector-save": "1" }, t(last ? "vs.finish" : "vs.next", lang))));
  f.addEventListener("submit", (ev) => {
    ev.preventDefault(); msg.textContent = "";
    const p = parseAmount(field.value);
    if (p === null) { msg.textContent = t("vs.err.number", lang); return; }
    change(rec, msg, lang, (d) => withAnswer(d, inp.id, p.state === "value" ? p.value : null), () => { uiOf(id).step = last ? null : step + 1; });
  });
  return f;
}

// ---- answers, months, results ----
function answersList(rec: TMRecord, view: SectorView, lang: Locale): HTMLElement {
  return h("ul", { class: "plain vs-answers", "data-sector-answers": rec.id }, ...view.inputs.map((s, i) => h("li", { "data-sector-answer": s.input.id, "data-state": s.value === null ? "unknown" : "value" },
    h("span", { class: "muted" }, `${tb(s.input.label, lang)}: `),
    s.value === null ? h("span", { class: "muted", "data-unknown": "1" }, t("vs.noanswer", lang)) : valueEl(formatResult(s.input.unit, s.value, lang), estimateLabel(), lang), " ",
    h("button", { class: "btn ghost btn-sm", type: "button", "data-sector-edit": s.input.id, onclick: () => { uiOf(rec.id).step = i; rerender(); } }, t("vs.edit", lang)))));
}

function monthsForm(rec: TMRecord, view: SectorView, lang: Locale): HTMLElement {
  const id = rec.id; const msg = h("p", { class: "err", role: "alert" });
  const fields = view.months.map((m) => ({ m, el: h("input", { id: `vs-m-${id}-${m.id}`, type: "text", inputmode: "decimal", autocomplete: "off", "data-sector-month": m.id, value: m.value === null ? "" : String(m.value) }) }));
  const f = h("form", { novalidate: true, class: "vs-months", "data-sector-months": id },
    h("p", { class: "muted" }, t("vs.months.note", lang)),
    ...fields.flatMap(({ m, el }) => [h("label", { for: `vs-m-${id}-${m.id}` }, t(monthKey(m.id), lang)), el]), msg,
    h("button", { class: "btn ghost btn-sm", type: "submit" }, t("vs.months.save", lang)));
  f.addEventListener("submit", (ev) => {
    ev.preventDefault(); msg.textContent = "";
    const parsed = fields.map(({ m, el }) => ({ id: m.id, p: parseAmount(el.value) }));
    if (parsed.some((x) => x.p === null)) { msg.textContent = t("vs.err.number", lang); return; }
    change(rec, msg, lang, (d) => parsed.reduce((acc, x) => withAnswer(acc, x.id, x.p!.state === "value" ? x.p!.value : null), d));
  });
  return h("details", { class: "help", "data-sector-months-box": id }, h("summary", {}, t("vs.months", lang)), f);
}

function resultsBlock(view: SectorView, lang: Locale): HTMLElement {
  const label = estimateLabel();
  return h("div", { class: "vs-results", "data-sector-results": "1" }, h("h3", { class: "card-h" }, t("vs.results", lang)),
    view.results.length ? h("ul", { class: "plain" }, ...view.results.map((r) => h("li", { "data-sector-result": r.id, "data-state": r.value === null ? "unknown" : "value" },
      h("span", { class: "muted" }, `${resultName(r, lang)}: `),
      r.value === null ? h("span", { class: "muted", "data-unknown": "1" }, needsText(r, view, lang)) : valueEl(formatResult(r.kind, r.value, lang), label, lang))))
      : h("p", { class: "muted" }, t("vs.res.none", lang)));
}

// ---- checklists the person owns ----
function checklist(rec: TMRecord, view: SectorView, which: "q" | "r", lang: Locale): HTMLElement | null {
  const rows = which === "q" ? view.questions : view.risks;
  if (!rows.length) return null;
  const msg = h("p", { class: "err", role: "alert" });
  return h("div", { class: "vs-checks", "data-sector-list": which },
    h("h3", { class: "card-h" }, t(which === "q" ? "vs.questions" : "vs.risks", lang)),
    h("ul", { class: "plain" }, ...rows.map((c) => {
      const box = h("input", { type: "checkbox", id: `vs-c-${rec.id}-${which}${c.index}`, "data-sector-check": `${which}${c.index}`, checked: c.checked });
      box.checked = c.checked;
      box.addEventListener("change", () => { if (!change(rec, msg, lang, (d) => withCheck(d, which, c.index, box.checked))) box.checked = !box.checked; });
      return h("li", {}, h("label", { class: "vs-check", for: `vs-c-${rec.id}-${which}${c.index}` }, box, h("span", {}, tb(c.text, lang))));
    })), msg);
}

// ---- link to a goal measure: the number is copied once into the measure's own "now" number; the measure stays editable ----
function goalLink(view: SectorView, lang: Locale): HTMLElement {
  const nums = view.results.filter((r) => r.value !== null);
  const measures = starRows(allRecs()).filter((s) => s.source === "own");
  const msg = h("p", { class: "muted", role: "status" });
  const body: Array<Node | null> = [];
  if (!measures.length) body.push(h("p", { class: "muted", "data-unknown": "1" }, t("vs.goal.none", lang)));
  else if (!nums.length) body.push(h("p", { class: "muted", "data-unknown": "1" }, t("unknown.unknown", lang)));
  else {
    const which = h("select", { "aria-label": t("vs.results", lang), "data-sector-goal-result": "1" }, ...nums.map((r) => h("option", { value: r.id }, `${resultName(r, lang)}: ${formatResult(r.kind, r.value as number, lang)}`)));
    const meas = h("select", { "aria-label": t("vs.goal.pick", lang), "data-sector-goal-measure": "1" }, ...measures.map((m) => h("option", { value: m.id }, m.metric)));
    body.push(which, h("label", {}, t("vs.goal.pick", lang)), meas, h("button", { class: "btn ghost btn-sm", type: "button", "data-sector-goal-use": "1", onclick: () => {
      const row = nums.find((r) => r.id === which.value); const star = allRecs().find((r) => r.id === meas.value);
      if (!row || row.value === null || !star) return;
      if (!entryNs()) { msg.textContent = saveBlockedText(lang); return; }
      const lb = labelFor(star.ns);
      storeOf(star).put({ ...star, values: { ...star.values, "north_star.current": { state: "value", value: row.value, label: lb } as FieldValue, "north_star.current_on": { state: "value", value: todayIsoKpi(), label: lb } as FieldValue } });
      msg.textContent = t("vs.goal.done", lang);
    } }, t("vs.goal.use", lang)), msg);
  }
  return h("details", { class: "help", "data-sector-goal": "1" }, h("summary", {}, t("vs.goal.h", lang)), ...body, h("a", { class: "crumb", href: MEASURES_ROUTE }, t("vs.goal.open", lang)));
}

// ---- custom type editor ----
const customDef = (d: SectorData): CustomDef => d.custom ?? { inputs: [], formulas: [] };
function customEditor(rec: TMRecord, data: SectorData, lang: Locale): HTMLElement {
  const id = rec.id; const def = customDef(data); const msg = h("p", { class: "err", role: "alert" });
  const nextCode = (prefix: string, used: string[]) => { let n = used.length + 1; while (used.includes(`${prefix}${n}`)) n++; return `${prefix}${n}`; };
  const put = (next: CustomDef) => change(rec, msg, lang, (d) => withCustom(d, next));

  const inLabel = h("input", { id: `vs-cil-${id}`, type: "text", maxlength: "60", autocomplete: "off", "data-custom-in-label": "1" });
  const inUnit = h("select", { id: `vs-ciu-${id}` }, ...UNIT_KINDS.map((u) => h("option", { value: u }, t(unitKey(u), lang))));
  const inPer = h("input", { id: `vs-cip-${id}`, type: "checkbox" });
  const addIn = h("form", { novalidate: true, "data-custom-add-input": id },
    h("label", { for: `vs-cil-${id}` }, t("vs.cu.in.label", lang)), inLabel, h("label", { for: `vs-ciu-${id}` }, t("vs.cu.in.unit", lang)), inUnit,
    h("label", { class: "vs-check", for: `vs-cip-${id}` }, inPer, h("span", {}, t("vs.cu.in.per", lang))),
    h("button", { class: "btn ghost btn-sm", type: "submit" }, t("vs.cu.in.add", lang)));
  addIn.addEventListener("submit", (ev) => {
    ev.preventDefault(); msg.textContent = "";
    const label = inLabel.value.trim(); if (!label) { msg.textContent = t("vs.cu.err.label", lang); return; }
    if (!checkFreeText(label).ok) { msg.textContent = t("intake.secretRejected", lang); return; }
    const next: CustomDef = { ...def, inputs: [...def.inputs, { id: nextCode("a", def.inputs.map((i) => i.id)), label, unit: inUnit.value as UnitKind, perPeriod: inPer.checked }] };
    put(next);
  });

  const fName = h("input", { id: `vs-cfn-${id}`, type: "text", maxlength: "60", autocomplete: "off", "data-custom-f-name": "1" });
  const fFrom = h("select", { id: `vs-cff-${id}`, "data-custom-f-from": "1" }, h("option", { value: "typed" }, t("vs.cu.f.typed", lang)), h("option", { value: "lib" }, t("vs.cu.f.lib", lang)));
  const fExpr = h("input", { id: `vs-cfe-${id}`, type: "text", maxlength: "120", autocomplete: "off", "data-custom-f-expr": "1" });
  const fLib = h("select", { id: `vs-cfl-${id}`, "data-custom-f-lib": "1" }, ...LIB_FORMULAS.map((l) => h("option", { value: l.id }, tb(l.name, lang))));
  const params = h("div", { class: "vs-params" });
  const exprBox = h("div", {}, h("label", { for: `vs-cfe-${id}` }, t("vs.cu.f.expr", lang)), fExpr);
  const libBox = h("div", { hidden: true }, h("label", { for: `vs-cfl-${id}` }, t("vs.cu.f.libpick", lang)), fLib, params);
  const drawParams = () => {
    const lib = getLibFormula(fLib.value);
    params.replaceChildren(...(lib ? lib.params.flatMap((p) => [h("label", { for: `vs-cfp-${id}-${p.id}` }, t("vs.cu.f.param", lang, { p: tb(p.label, lang) })),
      h("select", { id: `vs-cfp-${id}-${p.id}`, "data-custom-f-param": p.id }, ...def.inputs.map((i) => h("option", { value: i.id }, `${i.label} (${i.id})`)))]) : []));
  };
  const swap = () => { const lib = fFrom.value === "lib"; exprBox.hidden = lib; libBox.hidden = !lib; if (lib) drawParams(); };
  fFrom.addEventListener("change", swap); fLib.addEventListener("change", drawParams);
  const addF = h("form", { novalidate: true, "data-custom-add-formula": id },
    h("label", { for: `vs-cfn-${id}` }, t("vs.cu.f.name", lang)), fName, h("label", { for: `vs-cff-${id}` }, t("vs.cu.f.from", lang)), fFrom, exprBox, libBox,
    h("button", { class: "btn ghost btn-sm", type: "submit" }, t("vs.cu.f.add", lang)));
  addF.addEventListener("submit", (ev) => {
    ev.preventDefault(); msg.textContent = "";
    const name = fName.value.trim(); if (!name) { msg.textContent = t("vs.cu.err.label", lang); return; }
    let formula: CustomDef["formulas"][number];
    const fid = nextCode("f", def.formulas.map((f) => f.id));
    if (fFrom.value === "lib") {
      const lib = getLibFormula(fLib.value); const map: Record<string, string> = {};
      for (const s of params.querySelectorAll<HTMLSelectElement>("select[data-custom-f-param]")) if (s.value) map[s.dataset.customFParam ?? ""] = s.value;
      if (!lib || lib.params.some((p) => !map[p.id])) { msg.textContent = t("vs.cu.err.lib", lang); return; }
      formula = { id: fid, name, expr: `lib:${lib.id}`, map };
    } else {
      const expr = fExpr.value.trim(); if (!expr) { msg.textContent = t("vs.cu.err.expr", lang); return; }
      if (!checkFreeText(`${name} ${expr}`).ok) { msg.textContent = t("intake.secretRejected", lang); return; }
      formula = { id: fid, name, expr };
    }
    if (!checkFreeText(name).ok) { msg.textContent = t("intake.secretRejected", lang); return; }
    const next: CustomDef = { ...def, formulas: [...def.formulas, formula] };
    const bad = customProblems(next);
    if (bad.length) { msg.textContent = t("vs.cu.err.def", lang, { m: bad[0]! }); return; }
    put(next);
  });

  const inRows = def.inputs.length ? h("ul", { class: "plain", "data-custom-inputs": id }, ...def.inputs.map((i) => h("li", {}, `${i.label} · ${t("vs.cu.code", lang, { c: i.id })} `,
    h("button", { class: "btn ghost btn-sm", type: "button", "data-custom-remove-input": i.id, onclick: () => {
      // A formula that used this input would stop fitting, so those formulas go with it. The saved answer is kept.
      const keep = def.formulas.filter((f) => !new RegExp(`(?<![A-Za-z0-9])${i.id}(?![A-Za-z0-9])`).test(f.map ? Object.values(f.map).join(" ") : f.expr));
      put({ inputs: def.inputs.filter((x) => x.id !== i.id), formulas: keep });
    } }, t("vs.cu.remove", lang))))) : h("p", { class: "muted" }, t("vs.cu.none.in", lang));
  const fRows = def.formulas.length ? h("ul", { class: "plain", "data-custom-formulas": id }, ...def.formulas.map((f) => h("li", {}, `${f.name} · ${f.expr.startsWith("lib:") ? tb(getLibFormula(f.expr.slice(4))?.name ?? { en: f.expr, bn: f.expr }, lang) : f.expr} `,
    h("button", { class: "btn ghost btn-sm", type: "button", "data-custom-remove-formula": f.id, onclick: () => { put({ ...def, formulas: def.formulas.filter((x) => x.id !== f.id) }); } }, t("vs.cu.remove", lang))))) : h("p", { class: "muted" }, t("vs.cu.none.f", lang));
  return h("details", { class: "help", open: !def.inputs.length, "data-sector-custom": id }, h("summary", {}, t("vs.cu.h", lang)), h("p", { class: "muted" }, t("vs.cu.intro", lang)), inRows, addIn, fRows, addF, msg);
}

// ---- the panel ----
/** The collapsible "Business type" panel for one venture record. */
export function ventureSectorBlock(rec: TMRecord, lang: Locale): HTMLElement {
  const id = rec.id; const u = uiOf(id); const view = ventureSectorView(rec); const msg = h("p", { class: "err", role: "alert" });
  const body: Array<Node | null> = [];
  const choosing = u.picking || !view.sectorId;
  if (choosing) {
    body.push(h("p", { class: "muted" }, t("vs.intro", lang)), view.sectorId ? h("p", { class: "muted" }, t("vs.change.note", lang)) : h("p", { class: "muted", "data-unknown": "1", "data-sector-none": "1" }, t("vs.none", lang)),
      picker(rec, lang, msg));
    if (view.sectorId) body.push(h("button", { class: "btn ghost btn-sm", type: "button", onclick: () => { u.picking = false; rerender(); } }, t("vs.reset.no", lang)));
  } else if (view.removed || !view.family) {
    body.push(h("p", { class: "muted", "data-sector-removed": "1" }, t("vs.removed", lang)), h("button", { class: "btn ghost btn-sm", type: "button", "data-sector-change": "1", onclick: () => { u.picking = true; rerender(); } }, t("vs.change", lang)));
  } else if (u.step !== null && view.inputs[u.step]) {
    body.push(askForm(rec, view, u.step, lang));
  } else {
    const fam = view.family;
    body.push(h("p", {}, h("strong", {}, tb(fam.name, lang))), h("p", { class: "muted" }, tb(fam.summary, lang)),
      h("div", { class: "row vs-btns" },
        h("button", { class: "btn ghost btn-sm", type: "button", "data-sector-change": "1", onclick: () => { u.picking = true; rerender(); } }, t("vs.change", lang)),
        view.inputs.length ? h("button", { class: "btn btn-sm", type: "button", "data-sector-start": "1", onclick: () => { u.step = 0; rerender(); } }, t("vs.ask", lang)) : null));
    if (fam.custom) body.push(customEditor(rec, view.data, lang));
    if (view.inputs.length) body.push(h("h3", { class: "card-h" }, t("vs.answers", lang)), answersList(rec, view, lang));
    if (view.months.length) body.push(monthsForm(rec, view, lang));
    body.push(resultsBlock(view, lang), goalLink(view, lang), checklist(rec, view, "q", lang), checklist(rec, view, "r", lang),
      h("p", { class: "muted" }, t("vs.check.note", lang)),
      fam.related?.halalCheck ? h("a", { class: "crumb", href: HALAL_ROUTE, "data-sector-halal": "1" }, t("vs.halal", lang)) : null);
    if (Object.keys(view.spare).length) body.push(h("p", { class: "muted", "data-sector-spare": "1" }, t("vs.spare", lang)));
  }
  if (view.sectorId && Object.keys(view.data.inputs).length) {
    body.push(u.confirm
      ? h("div", { class: "note", role: "alertdialog", "data-sector-confirm": "1" }, h("p", {}, t("vs.reset.ask", lang)), h("div", { class: "row vs-btns" },
        h("button", { class: "btn ghost btn-sm", type: "button", "data-sector-reset-yes": "1", onclick: () => { change(rec, msg, lang, clearAnswers, () => { u.confirm = false; u.step = null; }); } }, t("vs.reset.yes", lang)),
        h("button", { class: "btn ghost btn-sm", type: "button", "data-sector-reset-no": "1", onclick: () => { u.confirm = false; rerender(); } }, t("vs.reset.no", lang))))
      : h("button", { class: "btn ghost btn-sm", type: "button", "data-sector-reset": "1", onclick: () => { u.confirm = true; rerender(); } }, t("vs.reset", lang)));
  }
  body.push(msg, disclaimers(lang, ["advice"]));
  const title = view.family ? t("vs.title.set", lang, { n: tb(view.family.name, lang) }) : t("vs.title", lang);
  const d = h("details", { class: "help vs-block", "data-sector-block": id, open: u.open }, h("summary", {}, title), ...body);
  d.addEventListener("toggle", () => { u.open = d.open; });
  return d;
}

/** Money screen: break-even sales next to the venture's monthly income line, only when both numbers exist; otherwise Unknown with what is missing. No verdict. */
export function ventureBreakEvenCard(lang: Locale): HTMLElement | null {
  const recs = allRecs(); const rows: HTMLElement[] = [];
  for (const v of ventureViews(recs)) {
    const rec = recs.find((r) => r.id === v.row.id); if (!rec) continue;
    const view = ventureSectorView(rec); if (!view.family) continue;
    const income = v.accounts.income.state === "value" ? v.accounts.income.value : null;
    const link = breakEvenLink(view, income); if (link.state === "none") continue;
    const name = v.row.name;
    if (link.state === "unknown") {
      const what = link.needs.map((n) => t(n === "income" ? "vs.need.income" : "vs.need.breakEven", lang)).join(t("vs.need.and", lang));
      rows.push(h("p", { "data-venture-breakeven": v.row.id, "data-state": "unknown" }, h("span", { class: "muted", "data-unknown": "1" }, t("vs.money.needs", lang, { v: name, what }))));
    } else {
      const lb = estimateLabel();
      rows.push(h("p", { "data-venture-breakeven": v.row.id, "data-state": "value" }, `${name}: `, valueEl(bdt(link.breakEven, lang), lb, lang), " · ", valueEl(bdt(link.income, lang), lb, lang),
        h("small", { class: "muted" }, ` ${t("vs.money.diff", lang, { d: bdt(link.income - link.breakEven, lang) })}`)));
    }
  }
  if (!rows.length) return null;
  return h("section", { class: "card", "data-venture-breakeven-card": "1", "aria-label": t("vs.money.h", lang) }, h("h2", { class: "card-h" }, t("vs.money.h", lang)), ...rows);
}

/** One summary line for a portfolio card: the type name and the first calculation that has a number. Null when no venture has a type. */
export function sectorPortfolioRows(lang: Locale): HTMLElement[] {
  const recs = allRecs(); const out: HTMLElement[] = [];
  for (const v of ventureViews(recs)) {
    const rec = recs.find((r) => r.id === v.row.id); if (!rec) continue;
    const view = ventureSectorView(rec); if (!view.family) continue;
    const first = view.results.find((r) => r.value !== null);
    const x = first ? `${resultName(first, lang)}: ${formatResult(first.kind, first.value as number, lang)}` : t("vs.pf.none", lang);
    out.push(h("p", { class: "muted", "data-pf-sector": v.row.id }, t("vs.pf.row", lang, { v: v.row.name, t: `${tb(view.family.name, lang)} · ${x}` })));
  }
  return out;
}

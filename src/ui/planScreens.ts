// Register screens for G3 items: risks & stop rules (M15), ventures (M09), team roles (M10), plan history (M12),
// North Star measures (M03). Demo data only; same pattern as the money screen. Pure rules live in src/core.
import { h } from "./dom";
import { t, tb, fmtNumber } from "../i18n/t";
import type { Key } from "../i18n/packs";
import { prefs, store } from "./state";
import { withView } from "./viewBar";
import { activeNs, allRecs, consentOn, consentPrompt, nsTag, saveBlockedText, saveTyped } from "./entry";
import { disclaimers, num, valueEl } from "./components";
import { checkFreeText } from "../core/safety";
import { fieldById } from "../catalog/fields";
import type { FieldValue } from "../core/types";
import { riskRows, validateRisk, withoutStopRule, type Likelihood } from "../core/risk";
import { looksLikePersonContact, roleRows, roleSummary, type Holder } from "../core/team";
import { parseAmount, parseOwnership, ventureViews } from "../core/ventures";
import { bdt, estimateLabel, moneyEl, portfolioCard } from "./ventureCard";
import { ladder, starRows } from "../core/northStar";
import { planHistory } from "../core/planHistory";
import { KPI_MEASURES, KPI_PERIODS, kpiStatus, parseActual, parseTarget, validateKpi, type KpiError } from "../core/kpi";
import { kpiRowView, todayIsoKpi } from "./kpiUi";
import { entryNs, labelFor, storeOf } from "./entry";
import { historySections } from "./realityUi";
import type { Locale } from "../i18n/registry";

const L = () => prefs.lang;
const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
const link = (href: string, cls: string, ...kids: Array<Node | string>) => h("a", { href, class: cls }, ...kids);
const txt = (v: string): FieldValue => ({ state: "value", value: v, label: "DEMO" });
const num_ = (n: number): FieldValue => ({ state: "value", value: n, label: "DEMO" });
const UNKNOWN: FieldValue = { state: "unknown" };

/** Saves one entry in the active mode (DEMO in demo, FACT in real). False, and nothing saved, while real mode has no consent tick. */
function putRecord(entity: string, prefix: string, values: Record<string, FieldValue>): boolean {
  const id = `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  return saveTyped({ id, entity, createdAt: new Date().toISOString(), values });
}

/** Consent prompt above a form while real mode has no tick. */
const gateFor = (lang: Locale) => (consentOn() ? null : consentPrompt(lang));
/** Page mark: DEMO badge in demo mode, Real tag in real mode (never both). */
const modeMark = (lang: Locale) => nsTag(activeNs(), lang);

/** Blank input = unknown; a number = value; anything else = invalid (null). Bangla digits accepted. */
function numberInput(raw: string): FieldValue | null {
  const s = raw.trim().replace(/,/g, "").replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6));
  if (s === "") return UNKNOWN;
  const n = Number(s);
  return Number.isFinite(n) ? num_(n) : null;
}

/** Option label from the catalog (bilingual), for one choice code. */
function choiceLabel(fieldId: string, code: string, lang: Locale): string {
  const o = fieldById(fieldId)?.options?.find((x) => x.code === code);
  return o ? tb(o.label, lang) : code;
}

function choiceSelect(id: string, fieldId: string, lang: Locale) {
  const opts = fieldById(fieldId)?.options ?? [];
  return h("select", { id }, h("option", { value: "" }, t("unknown.unknown", lang)), ...opts.map((o) => h("option", { value: o.code }, tb(o.label, lang))));
}

function removeBtn(id: string, lang: Locale) {
  return h("button", { class: "btn ghost", type: "button", style: "width:auto;margin:0;min-height:44px", "data-remove": id, onclick: () => { store[activeNs()].delete(id); rerender(); } }, t("risk.remove", lang));
}

// ---- M15 risks & stop rules ----
export function riskScreen(): HTMLElement { return withView("risks", L(), riskScreenInner()); }
function riskScreenInner(): HTMLElement {
  const lang = L();
  const text = h("input", { id: "rk-text", type: "text", maxlength: "80", autocomplete: "off" });
  const lk = h("select", { id: "rk-likelihood" }, h("option", { value: "" }, t("unknown.unknown", lang)),
    ...(["low", "medium", "high"] as const).map((c) => h("option", { value: c }, choiceLabel("risk.likelihood", c, lang))));
  const stop = h("input", { id: "rk-stop", type: "text", maxlength: "200", autocomplete: "off" });
  const date = h("input", { id: "rk-date", type: "date" });
  const err = h("p", { class: "err", role: "alert" });
  const form = h("form", { novalidate: true, "data-form": "risk" }, gateFor(lang),
    h("label", { for: "rk-text" }, t("risk.textLabel", lang)), text,
    h("label", { for: "rk-likelihood" }, t("risk.likelihood", lang)), lk,
    h("label", { for: "rk-stop" }, t("risk.stopLabel", lang)), stop,
    h("label", { for: "rk-date" }, t("risk.dateLabel", lang)), date, err,
    h("button", { class: "btn", type: "submit" }, t("risk.save", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault(); err.textContent = "";
    const p = { text: text.value, stopRule: stop.value, reviewOn: date.value };
    if (!checkFreeText(p.text).ok || !checkFreeText(p.stopRule).ok) { err.textContent = t("intake.secretRejected", lang); return; }
    const bad = validateRisk(p);
    if (bad) { err.textContent = t(`risk.err.${bad}` as Key, lang); return; }
    const values: Record<string, FieldValue> = { "risk.text": txt(p.text.trim()), "risk.likelihood": lk.value ? txt(lk.value) : UNKNOWN };
    if (p.stopRule.trim()) values["risk.stop_rule"] = txt(p.stopRule.trim());
    if (p.reviewOn) values["risk.review_on"] = txt(p.reviewOn);
    if (!putRecord("risk", "risk", values)) { err.textContent = saveBlockedText(lang); return; }
    rerender();
  });
  const rows = riskRows(allRecs());
  const list = rows.map((r) => h("div", { class: "card", "data-risk": r.id }, h("div", { class: "row" }, h("div", {},
    modeMark(lang), h("h2", { class: "card-h" }, r.text),
    h("p", { class: "muted" }, t("risk.likelihood", lang), ": ", r.likelihood ? choiceLabel("risk.likelihood", r.likelihood as Likelihood, lang) : t("unknown.unknown", lang)),
    h("p", { class: "muted" }, r.stopRule ? `${t("risk.stopLabel", lang)}: ${r.stopRule}` : t("risk.noStop", lang)),
    h("p", { class: "muted" }, r.reviewOn ? `${t("risk.dateLabel", lang)}: ${r.reviewOn}` : t("risk.noDate", lang))),
    removeBtn(r.id, lang))));
  return h("main", { class: "scr scr-risk" },
    link("#/journey", "crumb", `← ${t("journey.title", lang)}`),
    h("h1", {}, t("risk.title", lang)), h("p", { class: "sub" }, t("risk.intro", lang)),
    h("p", { class: "muted", "data-risk-missing": "1" }, t("risk.missingCount", lang, { n: num(withoutStopRule(rows), lang) })),
    h("h2", {}, t("risk.add", lang)), form,
    rows.length ? h("div", {}, ...list) : h("p", { class: "muted" }, t("risk.empty", lang)),
    h("p", { class: "muted" }, t("risk.note", lang)), modeMark(lang), disclaimers(lang, ["advice"]));
}

// ---- M09 ventures and assets: details, estimated value, your share, and the venture's own monthly income and expenses ----
export function ventureScreen(): HTMLElement { return withView("ventures", L(), ventureScreenInner()); }
function ventureScreenInner(): HTMLElement {
  const lang = L();
  const name = h("input", { id: "vn-name", type: "text", maxlength: "80", autocomplete: "off" });
  const stage = choiceSelect("vn-stage", "venture.stage", lang);
  const own = h("input", { id: "vn-own", type: "text", inputmode: "decimal", autocomplete: "off" });
  const value = h("input", { id: "vn-value", type: "text", inputmode: "decimal", autocomplete: "off" });
  const err = h("p", { class: "err", role: "alert" });
  const form = h("form", { novalidate: true, "data-form": "venture" }, gateFor(lang),
    h("label", { for: "vn-name" }, t("ven.name", lang)), name,
    h("label", { for: "vn-stage" }, t("ven.stage", lang)), stage,
    h("label", { for: "vn-own" }, t("ven.ownership", lang)), own,
    h("label", { for: "vn-value" }, t("ven.value", lang)), value, err,
    h("button", { class: "btn", type: "submit" }, t("ven.add", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault(); err.textContent = "";
    const nm = name.value.trim();
    if (!nm) { err.textContent = t("ven.err.name", lang); return; }
    if (!checkFreeText(nm).ok) { err.textContent = t("intake.secretRejected", lang); return; }
    const o = parseOwnership(own.value);
    if (o === null) { err.textContent = t("ven.err.ownership", lang); return; }
    const vl = parseAmount(value.value);
    if (vl === null) { err.textContent = t("ven.err.value", lang); return; }
    const values: Record<string, FieldValue> = {
      "venture.name": txt(nm),
      "venture.stage": stage.value ? txt(stage.value) : UNKNOWN,
      "venture.ownership_pct": o.state === "value" ? num_(o.value) : UNKNOWN,
      "venture.valuation": vl.state === "value" ? num_(vl.value) : UNKNOWN,
    };
    if (!putRecord("venture", "ven", values)) { err.textContent = saveBlockedText(lang); return; }
    rerender();
  });

  const recs = allRecs();
  const findOne = (id: string) => recs.find((r) => r.id === id) ?? null;
  const typedVal = (v: number | string, ns: "demo" | "real"): FieldValue => ({ state: "value", value: v, label: labelFor(ns) });

  // Change details of a saved venture. The record keeps its id and mode.
  const editForm = (v: ReturnType<typeof ventureViews>[number]) => {
    const id = v.row.id;
    const n = h("input", { id: `ve-n-${id}`, type: "text", maxlength: "80", autocomplete: "off", value: v.row.name });
    const st = choiceSelect(`ve-s-${id}`, "venture.stage", lang); st.value = v.row.stage ?? "";
    const ow = h("input", { id: `ve-o-${id}`, type: "text", inputmode: "decimal", autocomplete: "off", value: v.row.ownership === null ? "" : String(v.row.ownership) });
    const va = h("input", { id: `ve-v-${id}`, type: "text", inputmode: "decimal", autocomplete: "off", value: v.row.valuation === null ? "" : String(v.row.valuation) });
    const msg = h("p", { class: "err", role: "alert" });
    const f = h("form", { novalidate: true, "data-venture-edit": id },
      h("label", { for: `ve-n-${id}` }, t("ven.name", lang)), n, h("label", { for: `ve-s-${id}` }, t("ven.stage", lang)), st,
      h("label", { for: `ve-o-${id}` }, t("ven.ownership", lang)), ow, h("label", { for: `ve-v-${id}` }, t("ven.value", lang)), va, msg,
      h("button", { class: "btn ghost", type: "submit", style: "width:auto;margin:0;min-height:44px" }, t("ven.edit.save", lang)));
    f.addEventListener("submit", (ev) => {
      ev.preventDefault(); msg.textContent = "";
      const nm = n.value.trim(); if (!nm) { msg.textContent = t("ven.err.name", lang); return; }
      if (!checkFreeText(nm).ok) { msg.textContent = t("intake.secretRejected", lang); return; }
      const o = parseOwnership(ow.value); if (o === null) { msg.textContent = t("ven.err.ownership", lang); return; }
      const vl = parseAmount(va.value); if (vl === null) { msg.textContent = t("ven.err.value", lang); return; }
      if (!entryNs()) { msg.textContent = saveBlockedText(lang); return; }
      const rec = findOne(id); if (!rec) return;
      storeOf(rec).put({ ...rec, values: { ...rec.values, "venture.name": typedVal(nm, rec.ns), "venture.stage": st.value ? typedVal(st.value, rec.ns) : UNKNOWN,
        "venture.ownership_pct": o.state === "value" ? typedVal(o.value, rec.ns) : UNKNOWN, "venture.valuation": vl.state === "value" ? typedVal(vl.value, rec.ns) : UNKNOWN } });
      rerender();
    });
    return h("details", { class: "help" }, h("summary", {}, t("ven.edit.title", lang)), f);
  };

  // Add one monthly income or expense line to this venture. It is an ordinary business money line with a link to the venture.
  const lineForm = (vid: string) => {
    const kind = h("select", { id: `vl-k-${vid}` }, ...(["income", "expense"] as const).map((k) => h("option", { value: k }, choiceLabel("finance.kind", k, lang))));
    const label = h("input", { id: `vl-l-${vid}`, type: "text", maxlength: "80", autocomplete: "off" });
    const amt = h("input", { id: `vl-a-${vid}`, type: "text", inputmode: "decimal", autocomplete: "off" });
    const msg = h("p", { class: "err", role: "alert" });
    const f = h("form", { novalidate: true, "data-venture-line": vid },
      h("label", { for: `vl-k-${vid}` }, t("ven.line.kind", lang)), kind, h("label", { for: `vl-l-${vid}` }, t("ven.line.label", lang)), label,
      h("p", { class: "muted" }, t("money.nameHint", lang)), h("label", { for: `vl-a-${vid}` }, t("ven.line.amount", lang)), amt, msg,
      h("button", { class: "btn ghost", type: "submit", style: "width:auto;margin:0;min-height:44px" }, t("ven.line.save", lang)));
    f.addEventListener("submit", (ev) => {
      ev.preventDefault(); msg.textContent = "";
      const lb = label.value.trim(); if (!lb) { msg.textContent = t("ven.line.err.name", lang); return; }
      if (!checkFreeText(lb).ok) { msg.textContent = t("intake.secretRejected", lang); return; }
      const am = parseAmount(amt.value); if (am === null) { msg.textContent = t("intake.invalidNumber", lang); return; }
      const id = `fin-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
      const ok = saveTyped({ id, entity: "finance_item", createdAt: new Date().toISOString(), links: { venture: vid },
        values: { "finance.kind": txt(kind.value), "finance.scope": txt("business"), "finance.label": txt(lb), "finance.amount": am.state === "value" ? num_(am.value) : UNKNOWN, "finance.period": txt("monthly") } });
      if (!ok) { msg.textContent = saveBlockedText(lang); return; }
      rerender();
    });
    return h("details", { class: "help" }, h("summary", {}, t("ven.line.add", lang)), f);
  };

  // Removing a venture keeps its money lines: they lose the link and stay on the Money screen.
  const removeVenture = (id: string) => h("button", { class: "btn ghost", type: "button", style: "width:auto;margin:0;min-height:44px", "data-remove": id, onclick: () => {
    // Unlinking is a write: in real mode it needs the consent tick. Without it the lines keep a link to a venture that no longer exists, which every screen ignores.
    if (entryNs()) for (const r of allRecs()) if (r.entity === "finance_item" && r.links?.venture === id) { const { venture: _v, ...rest } = r.links; storeOf(r).put({ ...r, links: Object.keys(rest).length ? rest : undefined }); }
    store[activeNs()].delete(id); rerender();
  } }, t("risk.remove", lang));

  const views = ventureViews(recs);
  const lineRows = (v: (typeof views)[number]) => v.accounts.lineIds.map((lid) => {
    const r = findOne(lid)!; const a = r.values["finance.amount"]; const kind = String((r.values["finance.kind"] as { value?: unknown })?.value ?? "");
    return h("li", { "data-venture-line-row": lid }, `${choiceLabel("finance.kind", kind, lang)}: ${String((r.values["finance.label"] as { value?: unknown })?.value ?? "")} · `,
      a && a.state === "value" ? valueEl(bdt(Number(a.value), lang), a.label, lang) : t("unknown.unknown", lang), " ",
      h("button", { class: "btn ghost", type: "button", "data-remove": lid, style: "width:auto;margin:0;min-height:44px", onclick: () => { storeOf(r).delete(lid); rerender(); } }, t("money.remove", lang)));
  });
  const est = estimateLabel();
  const card = (v: (typeof views)[number]) => {
    const { row, share, accounts: ac } = v;
    return h("div", { class: "card", "data-venture": row.id }, h("div", { class: "row" }, h("div", {},
      modeMark(lang), h("h2", { class: "card-h" }, row.name),
      h("p", { class: "muted" }, row.stage ? choiceLabel("venture.stage", row.stage, lang) : t("unknown.unknown", lang)),
      h("p", { class: "muted" }, row.ownership === null ? t("ven.ownUnknown", lang) : `${fmtNumber(row.ownership, lang)}%`),
      h("p", { "data-venture-value": row.valuation === null ? "unknown" : "value" }, h("span", { class: "muted" }, `${t("ven.value.row", lang)}: `), row.valuation === null ? h("span", { class: "muted", "data-unknown": "1" }, t("ven.valueUnknown", lang)) : valueEl(bdt(row.valuation, lang), est, lang)),
      h("p", { "data-venture-share": share.state }, h("span", { class: "muted" }, `${t("ven.share.row", lang)}: `),
        share.state === "value" ? valueEl(bdt(share.value, lang), est, lang)
          : h("span", { class: "muted", "data-unknown": "1" }, t("ven.share.needs", lang, { what: share.missing.map((m) => t(`ven.need.${m}` as Key, lang)).join(t("ven.need.and", lang)) }))),
      h("h3", { class: "card-h" }, t("ven.acc.title", lang)),
      h("p", { "data-acc": "income" }, h("span", { class: "muted" }, `${t("ven.acc.income", lang)}: `), moneyEl(ac.income, lang, est)),
      h("p", { "data-acc": "expenses" }, h("span", { class: "muted" }, `${t("ven.acc.expenses", lang)}: `), moneyEl(ac.expenses, lang, est)),
      h("p", { "data-acc": "net" }, h("span", { class: "muted" }, `${t("ven.acc.net", lang)}: `), ac.net.state === "none" ? h("span", { class: "muted", "data-unknown": "1" }, t("ven.acc.netNeeds", lang)) : moneyEl(ac.net, lang, est)),
      ac.notMonthly ? h("p", { class: "muted", "data-acc-notmonthly": String(ac.notMonthly) }, t("money.notMonthly", lang, { n: num(ac.notMonthly, lang) })) : null,
      ac.lineIds.length ? h("ul", { class: "plain" }, ...lineRows(v)) : h("p", { class: "muted" }, t("ven.line.empty", lang)),
      lineForm(row.id), editForm(v)), removeVenture(row.id)));
  };
  return h("main", { class: "scr scr-venture" },
    link("#/diary", "crumb", `← ${t("diary.title", lang)}`),
    h("h1", {}, t("ven.title", lang)), h("p", { class: "sub" }, t("ven.intro", lang)),
    form,
    portfolioCard(lang, "page"),
    views.length ? h("div", {}, ...views.map(card)) : h("p", { class: "muted" }, t("ven.empty", lang)),
    link("#/diary/money", "crumb", t("ven.money.link", lang)),
    h("p", { class: "muted" }, t("ven.note", lang)), h("p", { class: "muted" }, t("ven.remove.note", lang)), modeMark(lang), disclaimers(lang, ["advice"]));
}

// ---- M10 team roles (roles only) ----
export function teamScreen(): HTMLElement { return withView("team", L(), teamScreenInner()); }
function teamScreenInner(): HTMLElement {
  const lang = L();
  const role = h("input", { id: "tm-role", type: "text", maxlength: "80", autocomplete: "off" });
  const holder = choiceSelect("tm-holder", "team_role.holder", lang);
  const err = h("p", { class: "err", role: "alert" });
  const form = h("form", { novalidate: true, "data-form": "team" }, gateFor(lang),
    h("label", { for: "tm-role" }, t("team.role", lang)), role,
    h("label", { for: "tm-holder" }, t("team.holder", lang)), holder, err,
    h("button", { class: "btn", type: "submit" }, t("team.add", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault(); err.textContent = "";
    const v = role.value.trim();
    if (!v) { err.textContent = t("team.err.role", lang); return; }
    if (looksLikePersonContact(v)) { err.textContent = t("team.err.contact", lang); return; }
    if (!checkFreeText(v).ok) { err.textContent = t("intake.secretRejected", lang); return; }
    if (!putRecord("team_role", "role", { "team_role.role": txt(v), "team_role.holder": holder.value ? txt(holder.value) : UNKNOWN })) { err.textContent = saveBlockedText(lang); return; }
    rerender();
  });
  const all = allRecs();
  const rows = roleRows(all);
  const s = roleSummary(rows);
  return h("main", { class: "scr scr-team" },
    link("#/diary", "crumb", `← ${t("diary.title", lang)}`),
    h("h1", {}, t("team.title", lang)), h("p", { class: "sub" }, t("team.intro", lang)),
    h("p", { class: "muted", "data-team-summary": "1" }, t("team.summary", lang, { total: num(s.total, lang), open: num(s.open, lang), unknown: num(s.unknown, lang) })),
    form,
    rows.length ? h("div", {}, ...rows.map((r) => h("div", { class: "card", "data-role": r.id }, h("div", { class: "row" }, h("div", {},
      modeMark(lang), h("h2", { class: "card-h" }, r.role),
      h("p", { class: "muted" }, r.holder ? choiceLabel("team_role.holder", r.holder as Holder, lang) : t("unknown.unknown", lang))),
      removeBtn(r.id, lang))))) : h("p", { class: "muted" }, t("team.empty", lang)),
    h("p", { class: "muted" }, t("team.note", lang)), modeMark(lang), disclaimers(lang, ["advice"]));
}

// ---- M12 plan history (read-only) ----
export function planHistoryScreen(): HTMLElement { return withView("history", L(), planHistoryScreenInner()); }
function planHistoryScreenInner(): HTMLElement {
  const lang = L();
  const rows = planHistory(allRecs());
  return h("main", { class: "scr scr-history" },
    link("#/journey", "crumb", `← ${t("journey.title", lang)}`),
    h("h1", {}, t("hist.title", lang)), h("p", { class: "sub" }, t("hist.intro", lang)),
    historySections(lang),
    h("h2", {}, t("rl.hist.steps", lang)),
    rows.length ? h("ul", { class: "plain", "data-history": "1" }, ...rows.map((r) => h("li", { "data-hist": r.kind },
      h("strong", {}, r.title || "—"), " · ", t(`hist.${r.kind}` as Key, lang), " · ", r.day)))
      : h("p", { class: "muted" }, t("hist.empty", lang)),
    modeMark(lang), disclaimers(lang, ["advice"]));
}

// ---- M03 North Star measures and ladder ----
const numText = (v: number, lang: Locale) => fmtNumber(v, lang);
export function northStarScreen(): HTMLElement {
  const lang = L();
  const metric = h("input", { id: "ns-metric", type: "text", maxlength: "80", autocomplete: "off" });
  const unit = h("input", { id: "ns-unit", type: "text", maxlength: "40", autocomplete: "off" });
  const base = h("input", { id: "ns-base", type: "text", inputmode: "decimal", autocomplete: "off" });
  const target = h("input", { id: "ns-target", type: "text", inputmode: "decimal", autocomplete: "off" });
  const err = h("p", { class: "err", role: "alert" });
  const form = h("form", { novalidate: true, "data-form": "north-star" }, gateFor(lang),
    h("label", { for: "ns-metric" }, t("ns.metric", lang)), metric,
    h("label", { for: "ns-unit" }, t("ns.unit", lang)), unit,
    h("label", { for: "ns-base" }, t("ns.baseline", lang)), base,
    h("label", { for: "ns-target" }, t("ns.target", lang)), target, err,
    h("button", { class: "btn", type: "submit" }, t("ns.add", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault(); err.textContent = "";
    const m = metric.value.trim();
    if (!m) { err.textContent = t("ns.err.metric", lang); return; }
    if (!checkFreeText(m).ok || !checkFreeText(unit.value).ok) { err.textContent = t("intake.secretRejected", lang); return; }
    const b = numberInput(base.value), g = numberInput(target.value);
    if (b === null || g === null) { err.textContent = t("ns.err.number", lang); return; }
    const values: Record<string, FieldValue> = { "north_star.metric": txt(m), "north_star.baseline": b, "north_star.target": g };
    if (unit.value.trim()) values["north_star.unit"] = txt(unit.value.trim());
    if (!putRecord("north_star", "ns", values)) { err.textContent = saveBlockedText(lang); return; }
    rerender();
  });
  const rows = starRows(allRecs());
  const cards = rows.map((r) => {
    const l = ladder(r.baseline, r.target);
    const steps = l.status === "ok"
      ? h("p", {}, `${t("ns.steps", lang)}: `, h("span", { "data-ladder": "ok" }, l.levels.map((p) => numText(p, lang)).join(" → ")))
      : l.status === "same"
        ? h("p", { class: "muted", "data-ladder": "same" }, t("ns.same", lang))
        : h("p", { class: "muted", "data-ladder": "unknown" }, t("ns.unknown", lang, { what: l.missing.map((k) => t(`ns.missing.${k}` as Key, lang)).join(", ") }));
    return h("div", { class: "card", "data-north-star": r.id }, h("div", { class: "row" }, h("div", {},
      modeMark(lang), h("h2", { class: "card-h" }, r.metric, r.unit ? ` (${r.unit})` : ""),
      h("p", { class: "muted" }, `${t("ns.baseline", lang)}: ${r.baseline === null ? t("unknown.unknown", lang) : numText(r.baseline, lang)} · ${t("ns.target", lang)}: ${r.target === null ? t("unknown.unknown", lang) : numText(r.target, lang)}`),
      steps), removeBtn(r.id, lang)));
  });
  return h("main", { class: "scr scr-northstar" },
    link("#/journey", "crumb", `← ${t("journey.title", lang)}`),
    h("h1", {}, t("ns.title", lang)), h("p", { class: "sub" }, t("ns.intro", lang)),
    h("h2", {}, t("ns.add", lang)), form,
    rows.length ? h("div", {}, ...cards) : h("p", { class: "muted" }, t("ns.empty", lang)),
    h("p", { class: "muted" }, t("ns.note", lang)), modeMark(lang), disclaimers(lang, ["advice"]));
}

// ---- M16 KPI targets: planned (the target) against actual (your own records, or the number you type) ----
const labelOf = (id: string, lang: Locale) => tb(fieldById(id)!.label, lang);
export function kpiScreen(): HTMLElement {
  const lang = L();
  const name = h("input", { id: "kp-name", type: "text", maxlength: "80", autocomplete: "off" });
  const measure = h("select", { id: "kp-measure" }, ...KPI_MEASURES.map((m) => h("option", { value: m }, choiceLabel("kpi.measure", m, lang))));
  const period = h("select", { id: "kp-period" }, ...KPI_PERIODS.map((p) => h("option", { value: p }, choiceLabel("kpi.period", p, lang))));
  const target = h("input", { id: "kp-target", type: "text", inputmode: "decimal", autocomplete: "off" });
  const unit = h("input", { id: "kp-unit", type: "text", maxlength: "40", autocomplete: "off" });
  const err = h("p", { class: "err", role: "alert" });
  const form = h("form", { novalidate: true, "data-form": "kpi" }, gateFor(lang),
    h("label", { for: "kp-name" }, labelOf("kpi.name", lang)), name,
    h("label", { for: "kp-measure" }, labelOf("kpi.measure", lang)), measure,
    h("label", { for: "kp-period" }, labelOf("kpi.period", lang)), period,
    h("label", { for: "kp-target" }, labelOf("kpi.target", lang)), target,
    h("label", { for: "kp-unit" }, labelOf("kpi.unit", lang)), unit, err,
    h("button", { class: "btn", type: "submit" }, t("kpi.save", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault(); err.textContent = "";
    const bad: KpiError | null = validateKpi({ name: name.value, target: target.value, unit: unit.value });
    if (bad) { err.textContent = t(`kpi.err.${bad}` as Key, lang); return; }
    if (!checkFreeText(name.value).ok || !checkFreeText(unit.value).ok) { err.textContent = t("intake.secretRejected", lang); return; }
    const tg = parseTarget(target.value)!;
    const values: Record<string, FieldValue> = { "kpi.name": txt(name.value.trim()), "kpi.measure": txt(measure.value), "kpi.period": txt(period.value), "kpi.target": tg.state === "value" ? num_(tg.value) : UNKNOWN };
    if (unit.value.trim()) values["kpi.unit"] = txt(unit.value.trim());
    if (!putRecord("kpi", "kpi", values)) { err.textContent = saveBlockedText(lang); return; }
    rerender();
  });

  // Change the target, or (for "my own number") the current number, on a saved card. The record keeps its id and namespace.
  const editForm = (id: string, own: boolean, curTarget: number | null, curActual: number | null) => {
    const tIn = h("input", { id: `kp-t-${id}`, type: "text", inputmode: "decimal", autocomplete: "off", value: curTarget === null ? "" : String(curTarget) });
    const aIn = own ? h("input", { id: `kp-a-${id}`, type: "text", inputmode: "decimal", autocomplete: "off", value: curActual === null ? "" : String(curActual) }) : null;
    const msg = h("p", { class: "err", role: "alert" });
    const f = h("form", { novalidate: true, class: "kpi-edit", "data-kpi-edit": id },
      h("label", { for: `kp-t-${id}` }, t("kpi.edit.target", lang)), tIn,
      ...(aIn ? [h("label", { for: `kp-a-${id}` }, t("kpi.edit.actual", lang)), aIn] : []), msg,
      h("button", { class: "btn ghost", type: "submit", style: "width:auto;margin:0;min-height:44px" }, t("kpi.update", lang)));
    f.addEventListener("submit", (ev) => {
      ev.preventDefault(); msg.textContent = "";
      const tg = parseTarget(tIn.value); if (tg === null) { msg.textContent = t("kpi.err.target_invalid", lang); return; }
      const ac = aIn ? parseActual(aIn.value) : null; if (aIn && ac === null) { msg.textContent = t("kpi.err.actual_invalid", lang); return; }
      const ns = entryNs(); if (!ns) { msg.textContent = saveBlockedText(lang); return; }
      const rec = findRecOf(id); if (!rec) return;
      const lb = labelFor(rec.ns);
      const lv = (v: number | string, l: typeof lb): FieldValue => ({ state: "value", value: v, label: l });
      const values: Record<string, FieldValue> = { ...rec.values, "kpi.target": tg.state === "value" ? lv(tg.value, lb) : UNKNOWN };
      if (aIn && ac) {
        values["kpi.actual"] = ac.state === "value" ? lv(ac.value, lb) : UNKNOWN;
        values["kpi.actual_on"] = ac.state === "value" ? lv(todayIsoKpi(), lb) : UNKNOWN;
      }
      storeOf(rec).put({ ...rec, values }); rerender();
    });
    return f;
  };
  const findRecOf = (id: string) => allRecs().find((r) => r.id === id) ?? null;

  const rows = kpiStatus(allRecs(), todayIsoKpi());
  const cards = rows.map((st) => h("div", { class: "card", "data-kpi-card": st.row.id }, h("div", { class: "row" }, h("div", {},
    modeMark(lang), kpiRowView(st, lang),
    h("p", { class: "muted" }, choiceLabel("kpi.measure", st.row.measure, lang)),
    editForm(st.row.id, st.row.measure === "own", st.row.target, st.row.ownActual)), removeBtn(st.row.id, lang))));
  return h("main", { class: "scr scr-kpi" },
    link("#/journey", "crumb", `← ${t("journey.title", lang)}`),
    h("h1", {}, t("kpi.title", lang)), h("p", { class: "sub" }, t("kpi.intro", lang)),
    h("h2", {}, t("kpi.add", lang)), form,
    rows.length ? h("div", {}, ...cards) : h("p", { class: "muted", "data-kpi-empty": "page" }, t("kpi.empty", lang)),
    link("#/journey/week", "crumb", t("week.link", lang)), " ", link("#/journey/review", "crumb", t("review.link", lang)),
    h("p", { class: "muted" }, t("kpi.note", lang)), modeMark(lang), disclaimers(lang, ["advice"]));
}

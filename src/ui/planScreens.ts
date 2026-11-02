// Register screens for G3 items: risks & stop rules (M15), ventures (M09), team roles (M10), plan history (M12),
// North Star measures (M03). Demo data only; same pattern as the money screen. Pure rules live in src/core.
import { h } from "./dom";
import { t, tb, fmtNumber } from "../i18n/t";
import type { Key } from "../i18n/packs";
import { prefs, store } from "./state";
import { withView } from "./viewBar";
import { activeNs, allRecs, consentOn, consentPrompt, inNs, nsTag, putMode, saveBlockedText, saveTyped } from "./entry";
import { disclaimers, num, valueEl } from "./components";
import { checkFreeText } from "../core/safety";
import { fieldById } from "../catalog/fields";
import type { FieldValue, TMRecord } from "../core/types";
import { riskDue, riskRows, validateRisk, withoutStopRule, type Likelihood } from "../core/risk";
import { riskDueTag, riskReviewBox, todayIsoRisk } from "./riskCard";
import { assignTask, completeHandover, looksLikePersonContact, roleSummary, roleViews, validateHandover, withHolder, type Holder } from "../core/team";
import { analysisLines, syncDelegationNow, teamAnalysis } from "./teamCard";
import { loopLogRecord } from "../core/realityLoop";
import { parseAmount, parseOwnership, ventureViews } from "../core/ventures";
import { bdt, estimateLabel, moneyEl, portfolioCard } from "./ventureCard";
import { overallProgress, parseWeight, starRows, starViews } from "../core/northStar";
import { overallEl, starRowView } from "./northStarCard";
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
    h("p", { class: "muted" }, r.reviewOn ? `${t("risk.dateLabel", lang)}: ${r.reviewOn}` : t("risk.noDate", lang), " ", riskDueTag(r, lang)),
    riskReviewBox(r, lang, riskDue(r, todayIsoRisk()) === "due")),
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

// ---- M10 team roles: who covers each role, the steps tied to it, hand-over, a hiring step, and the gap analysis (roles only, no names) ----
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
  const views = roleViews(all);
  const s = roleSummary(views.map((v) => v.row));
  const stepsFree = all.filter((r) => r.entity === "task" && r.values["task.done_on"]?.state !== "value" && r.values["task.not_true_on"]?.state !== "value" && !(r.links?.role && views.some((v) => v.row.id === r.links!.role)));
  const titleOf = (r: TMRecord) => String((r.values["task.title"] as { value?: unknown } | undefined)?.value ?? "");
  const today = todayIsoKpi();

  // Every change of holder, link or hand-over goes through here, then the delegation marks are brought in step with the roles.
  const commit = (puts: TMRecord[]) => { if (!entryNs()) return false; for (const r of puts) storeOf(r).put(inNs(r, r.ns)); syncDelegationNow(); return true; };

  const card = (v: ReturnType<typeof roleViews>[number]) => {
    const r = v.row; const rec = store[activeNs()].get(r.id)!;
    const msg = h("p", { class: "err", role: "alert" });
    // holder
    const hsel = h("select", { id: `tm-h-${r.id}` }, h("option", { value: "" }, t("unknown.unknown", lang)),
      ...(["me", "someone", "open"] as const).map((c) => h("option", { value: c, ...(r.holder === c ? { selected: true } : {}) }, choiceLabel("team_role.holder", c, lang))));
    const hform = h("form", { novalidate: true, "data-team-holder": r.id }, h("label", { for: `tm-h-${r.id}` }, t("team.holder", lang)), hsel,
      h("button", { class: "btn ghost", type: "submit", style: "width:auto;margin:0;min-height:44px" }, t("team.holder.save", lang)));
    hform.addEventListener("submit", (e) => { e.preventDefault(); msg.textContent = ""; if (!commit([withHolder(rec, (hsel.value || null) as Holder | null)])) { msg.textContent = saveBlockedText(lang); return; } rerender(); });
    // steps tied to the role
    const stepLis = v.tasks.map((x) => h("li", { "data-role-step": x.id },
      h("strong", {}, x.title || "—"), " · ", x.minutes === null ? t("plan.task.minutes.later", lang) : t("task.minutes", lang, { n: num(x.minutes, lang) }),
      x.delegated ? h("span", { class: "tag off", "data-delegated": x.id }, ` ${t("team.step.delegated", lang)}`) : null, x.parked ? h("span", { class: "tag off" }, ` ${t("rl.state.parked", lang)}`) : null, " ",
      h("button", { class: "btn ghost", type: "button", "data-untie": x.id, style: "width:auto;margin:0;min-height:44px", onclick: () => { const tr = store[activeNs()].get(x.id); if (tr && commit([assignTask(tr, null)])) rerender(); } }, t("team.step.untie", lang))));
    const assignSel = stepsFree.length ? h("select", { id: `tm-as-${r.id}` }, ...stepsFree.map((x) => h("option", { value: x.id }, titleOf(x) || x.id))) : null;
    const assignBtn = assignSel ? h("button", { class: "btn ghost", type: "button", "data-assign": r.id, style: "width:auto;margin:6px 0 0;min-height:44px", onclick: () => {
      const tr = store[activeNs()].get((assignSel as HTMLSelectElement).value); if (tr && commit([assignTask(tr, r.id)])) rerender(); else if (!entryNs()) { msg.textContent = saveBlockedText(lang); } } }, t("team.step.assign", lang)) : null;
    // hand-over
    const note = h("input", { id: `ho-n-${r.id}`, type: "text", maxlength: "200", autocomplete: "off" });
    const due = h("input", { id: `ho-d-${r.id}`, type: "date" });
    const hoForm = h("form", { novalidate: true, "data-handover": r.id },
      h("label", { for: `ho-n-${r.id}` }, labelOf("handover.note", lang)), note, h("label", { for: `ho-d-${r.id}` }, labelOf("handover.due", lang)), due,
      h("button", { class: "btn ghost", type: "submit", style: "width:auto;margin:6px 0 0;min-height:44px" }, t("team.ho.save", lang)));
    hoForm.addEventListener("submit", (e) => {
      e.preventDefault(); msg.textContent = "";
      if (!checkFreeText(note.value).ok || looksLikePersonContact(note.value)) { msg.textContent = t("team.err.contact", lang); return; }
      const bad = validateHandover({ note: note.value, due: due.value }, v); if (bad) { msg.textContent = t(`team.ho.err.${bad}` as Key, lang); return; }
      const values: Record<string, FieldValue> = { "handover.status": txt("planned") };
      if (note.value.trim()) values["handover.note"] = txt(note.value.trim()); if (due.value) values["handover.due"] = txt(due.value);
      const id = `ho-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
      if (!saveTyped({ id, entity: "handover", createdAt: new Date().toISOString(), values, links: { role: r.id } })) { msg.textContent = saveBlockedText(lang); return; }
      rerender();
    });
    const plannedBox = v.planned ? h("div", { "data-handover-planned": v.planned.id },
      h("p", {}, h("strong", {}, t("team.ho.planned", lang))),
      v.planned.note ? h("p", { class: "muted" }, v.planned.note) : null, v.planned.due ? h("p", { class: "muted" }, t("team.ho.due", lang, { d: v.planned.due })) : null,
      h("p", { class: "muted" }, t("team.ho.effect", lang, { n: num(v.tasks.length, lang) })),
      h("button", { class: "btn", type: "button", "data-act": "handover-done", style: "width:auto;margin:6px 0 0;min-height:44px", onclick: () => {
        const res = completeHandover(allRecs(), v.planned!.id, today); if (!res) return;
        if (!commit(res.puts)) { msg.textContent = saveBlockedText(lang); return; }
        putMode(loopLogRecord({ id: `hlog-${Date.now().toString(36)}`, eventId: null, createdAt: new Date().toISOString(), text: t("team.ho.logged", lang, { role: r.role, date: today }) }));
        rerender(); } }, t("team.ho.done", lang)), " ",
      h("button", { class: "btn ghost", type: "button", "data-act": "handover-cancel", style: "width:auto;margin:6px 0 0;min-height:44px", onclick: () => { store[activeNs()].delete(v.planned!.id); rerender(); } }, t("team.ho.cancel", lang)))
      : r.holder !== "someone" ? h("details", { class: "help" }, h("summary", {}, t("team.ho.plan", lang)), hoForm) : null;
    // hiring step
    const hireTitle = t("team.hire.title", lang, { role: r.role });
    const hasHire = v.tasks.some((x) => x.title === hireTitle);
    const hireBtn = (r.holder === "open" || r.holder === null) && !hasHire ? h("button", { class: "btn ghost", type: "button", "data-act": "hire", style: "width:auto;margin:6px 0 0;min-height:44px", onclick: () => {
      const id = `task-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
      if (!saveTyped({ id, entity: "task", createdAt: new Date().toISOString(), values: { "task.title": txt(hireTitle), "task.minutes": { state: "later" }, "task.priority": txt("normal") }, links: { role: r.id } })) { msg.textContent = saveBlockedText(lang); return; }
      rerender(); } }, t("team.hire.btn", lang)) : null;
    const gapText = t(`team.gap.${v.gap}` as Key, lang, { n: num(v.tasks.length, lang) });
    return h("div", { class: "card", "data-role": r.id, "data-gap": v.gap }, h("div", { class: "row" }, h("div", {},
      modeMark(lang), h("h2", { class: "card-h" }, r.role),
      h("p", { class: "muted" }, r.holder ? choiceLabel("team_role.holder", r.holder as Holder, lang) : t("unknown.unknown", lang)),
      h("p", { "data-gap-text": v.gap }, gapText),
      v.tasks.length ? h("p", { class: "muted", "data-role-load": "1" }, t("team.load", lang, { s: num(v.tasks.length, lang), m: num(v.knownMinutes, lang) }), v.unknownEstimates ? ` ${t("team.an.noest", lang, { n: num(v.unknownEstimates, lang) })}` : "") : null,
      v.tasks.length ? h("ul", { class: "plain" }, ...stepLis) : h("p", { class: "muted" }, t("team.nosteps", lang)),
      hform,
      assignSel ? h("div", {}, h("label", { for: `tm-as-${r.id}` }, t("team.step.assignLabel", lang)), assignSel, assignBtn) : null,
      plannedBox, hireBtn,
      v.done.length ? h("ul", { class: "plain", "data-handed-over": String(v.done.length) }, ...v.done.map((d) => h("li", {}, t("team.ho.was", lang, { d: d.doneOn ?? "—" })))) : null, msg),
      h("button", { class: "btn ghost", type: "button", style: "width:auto;margin:0;min-height:44px", "data-remove": r.id, onclick: () => {
        if (entryNs()) for (const x of allRecs()) if (x.entity === "task" && x.links?.role === r.id) storeOf(x).put(inNs(assignTask(x, null), x.ns));
        store[activeNs()].delete(r.id); syncDelegationNow(); rerender(); } }, t("risk.remove", lang))));
  };
  return h("main", { class: "scr scr-team" },
    link("#/diary", "crumb", `← ${t("diary.title", lang)}`),
    h("h1", {}, t("team.title", lang)), h("p", { class: "sub" }, t("team.intro", lang)),
    h("p", { class: "muted", "data-team-summary": "1" }, t("team.summary", lang, { total: num(s.total, lang), open: num(s.open, lang), unknown: num(s.unknown, lang) })),
    views.length ? h("section", { "data-team-analysis": "1" }, ...analysisLines(teamAnalysis(), lang)) : null,
    form,
    views.length ? h("div", {}, ...views.map(card)) : h("p", { class: "muted" }, t("team.empty", lang)),
    link("#/diary/plan", "crumb", t("team.plan.link", lang)),
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

// ---- M03 North Star measures and ladder: start, where you are now (typed or taken from Money / Ventures), target, weights, overall ----
const numText = (v: number, lang: Locale) => fmtNumber(v, lang);
export function northStarScreen(): HTMLElement {
  const lang = L();
  const metric = h("input", { id: "ns-metric", type: "text", maxlength: "80", autocomplete: "off" });
  const unit = h("input", { id: "ns-unit", type: "text", maxlength: "40", autocomplete: "off" });
  const base = h("input", { id: "ns-base", type: "text", inputmode: "decimal", autocomplete: "off" });
  const target = h("input", { id: "ns-target", type: "text", inputmode: "decimal", autocomplete: "off" });
  const sourceSel = (id: string, cur: string) => h("select", { id }, ...(fieldById("north_star.source")?.options ?? []).map((o) => h("option", { value: o.code, ...(o.code === cur ? { selected: true } : {}) }, tb(o.label, lang))));
  const source = sourceSel("ns-source", "own");
  const current = h("input", { id: "ns-current", type: "text", inputmode: "decimal", autocomplete: "off" });
  const weight = h("input", { id: "ns-weight", type: "text", inputmode: "numeric", autocomplete: "off" });
  const err = h("p", { class: "err", role: "alert" });
  const form = h("form", { novalidate: true, "data-form": "north-star" }, gateFor(lang),
    h("label", { for: "ns-metric" }, t("ns.metric", lang)), metric,
    h("label", { for: "ns-unit" }, t("ns.unit", lang)), unit,
    h("label", { for: "ns-base" }, t("ns.baseline", lang)), base,
    h("label", { for: "ns-target" }, t("ns.target", lang)), target,
    h("label", { for: "ns-source" }, labelOf("north_star.source", lang)), source,
    h("label", { for: "ns-current" }, t("ns.current", lang)), current, h("p", { class: "muted" }, t("ns.current.hint", lang)),
    h("label", { for: "ns-weight" }, t("ns.weight", lang)), weight, h("p", { class: "muted" }, t("ns.weight.hint", lang)), err,
    h("button", { class: "btn", type: "submit" }, t("ns.add", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault(); err.textContent = "";
    const m = metric.value.trim();
    if (!m) { err.textContent = t("ns.err.metric", lang); return; }
    if (!checkFreeText(m).ok || !checkFreeText(unit.value).ok) { err.textContent = t("intake.secretRejected", lang); return; }
    const b = numberInput(base.value), g = numberInput(target.value), c = numberInput(current.value), w = parseWeight(weight.value);
    if (b === null || g === null || c === null) { err.textContent = t("ns.err.number", lang); return; }
    if (w === null) { err.textContent = t("ns.err.weight", lang); return; }
    const values: Record<string, FieldValue> = { "north_star.metric": txt(m), "north_star.baseline": b, "north_star.target": g, "north_star.source": txt(source.value) };
    if (unit.value.trim()) values["north_star.unit"] = txt(unit.value.trim());
    if (source.value === "own" && c.state === "value") { values["north_star.current"] = c; values["north_star.current_on"] = txt(todayIsoKpi()); }
    if (w.state === "value") values["north_star.weight"] = num_(w.value);
    if (!putRecord("north_star", "ns", values)) { err.textContent = saveBlockedText(lang); return; }
    rerender();
  });
  // Change the numbers later: starting number, target, where you are now, the source and the weight. A blank number is Unknown, never 0.
  const editForm = (id: string) => {
    const r = store[activeNs()].get(id); if (!r) return null;
    const row = starRows([r])[0]!;
    const inp = (suffix: string, val: number | null, mode = "decimal") => h("input", { id: `ns-${suffix}-${id}`, type: "text", inputmode: mode, autocomplete: "off", value: val === null ? "" : String(val) });
    const eb = inp("eb", row.baseline), et = inp("et", row.target), ec = inp("ec", row.current), ew = inp("ew", row.weight, "numeric"); const es = sourceSel(`ns-es-${id}`, row.source);
    const msg = h("p", { class: "err", role: "alert" });
    const f = h("form", { novalidate: true, "data-star-edit": id },
      h("label", { for: `ns-eb-${id}` }, t("ns.baseline", lang)), eb, h("label", { for: `ns-et-${id}` }, t("ns.target", lang)), et,
      h("label", { for: `ns-es-${id}` }, labelOf("north_star.source", lang)), es, h("label", { for: `ns-ec-${id}` }, t("ns.current", lang)), ec,
      h("label", { for: `ns-ew-${id}` }, t("ns.weight", lang)), ew, msg,
      h("button", { class: "btn ghost", type: "submit", style: "width:auto;margin:0;min-height:44px" }, t("ns.update", lang)));
    f.addEventListener("submit", (e) => {
      e.preventDefault(); msg.textContent = "";
      const b = numberInput(eb.value), g = numberInput(et.value), c = numberInput(ec.value), w = parseWeight(ew.value);
      if (b === null || g === null || c === null) { msg.textContent = t("ns.err.number", lang); return; }
      if (w === null) { msg.textContent = t("ns.err.weight", lang); return; }
      const ns = entryNs(); if (!ns) { msg.textContent = saveBlockedText(lang); return; }
      const lb = labelFor(r.ns); const lvv = (n: number): FieldValue => ({ state: "value", value: n, label: lb });
      const values: Record<string, FieldValue> = { ...r.values, "north_star.baseline": b.state === "value" ? lvv(Number(b.value)) : UNKNOWN, "north_star.target": g.state === "value" ? lvv(Number(g.value)) : UNKNOWN,
        "north_star.source": { state: "value", value: es.value, label: lb }, "north_star.weight": w.state === "value" ? lvv(w.value) : UNKNOWN };
      if (es.value === "own") {
        values["north_star.current"] = c.state === "value" ? lvv(Number(c.value)) : UNKNOWN;
        if (c.state === "value" && Number(c.value) !== row.current) values["north_star.current_on"] = { state: "value", value: todayIsoKpi(), label: lb };
      }
      storeOf(r).put({ ...r, values }); rerender();
    });
    return h("details", { class: "help" }, h("summary", {}, t("ns.edit", lang)), f);
  };
  const recs = allRecs();
  const views = starViews(recs);
  const cards = views.map((v) => {
    const r = v.row; const l = v.ladder;
    const steps = l.status === "ok"
      ? h("p", {}, `${t("ns.steps", lang)}: `, h("span", { "data-ladder": "ok" }, l.levels.map((p) => numText(p, lang)).join(" → ")))
      : l.status === "same"
        ? h("p", { class: "muted", "data-ladder": "same" }, t("ns.same", lang))
        : h("p", { class: "muted", "data-ladder": "unknown" }, t("ns.unknown", lang, { what: l.missing.map((k) => t(`ns.missing.${k}` as Key, lang)).join(", ") }));
    return h("div", { class: "card", "data-north-star": r.id }, h("div", { class: "row" }, h("div", {},
      modeMark(lang), h("h2", { class: "card-h" }, r.metric, r.unit ? ` (${r.unit})` : ""),
      starRowView(v, lang), steps,
      h("p", { class: "muted", "data-weight": r.weight === null ? "none" : String(r.weight) }, r.weight === null ? t("ns.weight.none", lang) : t("ns.weight.is", lang, { w: numText(r.weight, lang) })),
      editForm(r.id)), removeBtn(r.id, lang)));
  });
  return h("main", { class: "scr scr-northstar" },
    link("#/journey", "crumb", `← ${t("journey.title", lang)}`),
    h("h1", {}, t("ns.title", lang)), h("p", { class: "sub" }, t("ns.intro", lang)),
    overallEl(overallProgress(views), lang),
    h("h2", {}, t("ns.add", lang)), form,
    views.length ? h("div", {}, ...cards) : h("p", { class: "muted" }, t("ns.empty", lang)),
    link("#/diary/money", "crumb", t("ns.money.link", lang)), " ", link("#/diary/ventures", "crumb", t("ns.ventures.link", lang)),
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

// Register screens for G3 items: risks & stop rules (M15), ventures (M09), team roles (M10), plan history (M12),
// North Star measures (M03). Demo data only; same pattern as the money screen. Pure rules live in src/core.
import { h } from "./dom";
import { t, tb, fmtNumber } from "../i18n/t";
import type { Key } from "../i18n/packs";
import { prefs, store } from "./state";
import { activeNs, allRecs, consentOn, consentPrompt, nsTag, saveBlockedText, saveTyped } from "./entry";
import { disclaimers, num } from "./components";
import { checkFreeText } from "../core/safety";
import { fieldById } from "../catalog/fields";
import type { FieldValue } from "../core/types";
import { riskRows, validateRisk, withoutStopRule, type Likelihood } from "../core/risk";
import { looksLikePersonContact, roleRows, roleSummary, type Holder } from "../core/team";
import { parseOwnership, ventureRows } from "../core/ventures";
import { ladder, starRows } from "../core/northStar";
import { planHistory } from "../core/planHistory";
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
export function riskScreen(): HTMLElement {
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

// ---- M09 ventures and assets ----
export function ventureScreen(): HTMLElement {
  const lang = L();
  const name = h("input", { id: "vn-name", type: "text", maxlength: "80", autocomplete: "off" });
  const stage = choiceSelect("vn-stage", "venture.stage", lang);
  const own = h("input", { id: "vn-own", type: "text", inputmode: "decimal", autocomplete: "off" });
  const err = h("p", { class: "err", role: "alert" });
  const form = h("form", { novalidate: true, "data-form": "venture" },
    h("label", { for: "vn-name" }, t("ven.name", lang)), name,
    h("label", { for: "vn-stage" }, t("ven.stage", lang)), stage,
    h("label", { for: "vn-own" }, t("ven.ownership", lang)), own, err,
    h("button", { class: "btn", type: "submit" }, t("ven.add", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault(); err.textContent = "";
    const nm = name.value.trim();
    if (!nm) { err.textContent = t("ven.err.name", lang); return; }
    if (!checkFreeText(nm).ok) { err.textContent = t("intake.secretRejected", lang); return; }
    const o = parseOwnership(own.value);
    if (o === null) { err.textContent = t("ven.err.ownership", lang); return; }
    const values: Record<string, FieldValue> = {
      "venture.name": txt(nm),
      "venture.stage": stage.value ? txt(stage.value) : UNKNOWN,
      "venture.ownership_pct": o.state === "value" ? num_(o.value) : UNKNOWN,
    };
    putRecord("venture", "ven", values);
    rerender();
  });
  const rows = ventureRows(allRecs());
  return h("main", { class: "scr scr-venture" },
    link("#/diary", "crumb", `← ${t("diary.title", lang)}`),
    h("h1", {}, t("ven.title", lang)), h("p", { class: "sub" }, t("ven.intro", lang)),
    form,
    rows.length ? h("div", {}, ...rows.map((r) => h("div", { class: "card", "data-venture": r.id }, h("div", { class: "row" }, h("div", {},
      h("h2", { class: "card-h" }, r.name),
      h("p", { class: "muted" }, r.stage ? choiceLabel("venture.stage", r.stage, lang) : t("unknown.unknown", lang)),
      h("p", { class: "muted" }, r.ownership === null ? t("ven.ownUnknown", lang) : `${fmtNumber(r.ownership, lang)}%`)),
      removeBtn(r.id, lang))))) : h("p", { class: "muted" }, t("ven.empty", lang)),
    h("p", { class: "muted" }, t("ven.note", lang)), modeMark(lang), disclaimers(lang, ["advice"]));
}

// ---- M10 team roles (roles only) ----
export function teamScreen(): HTMLElement {
  const lang = L();
  const role = h("input", { id: "tm-role", type: "text", maxlength: "80", autocomplete: "off" });
  const holder = choiceSelect("tm-holder", "team_role.holder", lang);
  const err = h("p", { class: "err", role: "alert" });
  const form = h("form", { novalidate: true, "data-form": "team" },
    h("label", { for: "tm-role" }, t("team.role", lang)), role,
    h("label", { for: "tm-holder" }, t("team.holder", lang)), holder, err,
    h("button", { class: "btn", type: "submit" }, t("team.add", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault(); err.textContent = "";
    const v = role.value.trim();
    if (!v) { err.textContent = t("team.err.role", lang); return; }
    if (looksLikePersonContact(v)) { err.textContent = t("team.err.contact", lang); return; }
    if (!checkFreeText(v).ok) { err.textContent = t("intake.secretRejected", lang); return; }
    putRecord("team_role", "role", { "team_role.role": txt(v), "team_role.holder": holder.value ? txt(holder.value) : UNKNOWN });
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
      h("h2", { class: "card-h" }, r.role),
      h("p", { class: "muted" }, r.holder ? choiceLabel("team_role.holder", r.holder as Holder, lang) : t("unknown.unknown", lang))),
      removeBtn(r.id, lang))))) : h("p", { class: "muted" }, t("team.empty", lang)),
    h("p", { class: "muted" }, t("team.note", lang)), modeMark(lang), disclaimers(lang, ["advice"]));
}

// ---- M12 plan history (read-only) ----
export function planHistoryScreen(): HTMLElement {
  const lang = L();
  const rows = planHistory(allRecs());
  return h("main", { class: "scr scr-history" },
    link("#/journey", "crumb", `← ${t("journey.title", lang)}`),
    h("h1", {}, t("hist.title", lang)), h("p", { class: "sub" }, t("hist.intro", lang)),
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
  const form = h("form", { novalidate: true, "data-form": "north-star" },
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
    putRecord("north_star", "ns", values);
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
      h("h2", { class: "card-h" }, r.metric, r.unit ? ` (${r.unit})` : ""),
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

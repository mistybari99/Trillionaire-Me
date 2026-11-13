// Live Calculator / What-if (LIVECALC-01): the calculator panel, the full-page screens and the sheet that opens from the top bar on every screen.
// Everything runs on the phone. A blank box is Unknown. Nothing is saved unless the person taps "Save as note".
import "./styles_whatif.css";
import { h } from "./dom";
import { t, tb } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { CATEGORIES, getVariant, notesFor, variantsOf, type Noun, type Per, type Variant, type WiCategory } from "../core/whatifCatalog";
import { compareWhatIf, getTemplate, libName, parseInput, runWhatIf, type Raw, type WhatIfResult, type WTemplate } from "../core/whatif";
import { defaultVariantFor, prefillFor, type Suggestion } from "../core/whatifPrefill";
import { activeNs, allRecs, consentOn, saveBlockedText, saveTyped, typed } from "./entry";
import { consentKv } from "./state";
import { readHealthConsent } from "../core/health";
import { closeTransientOverlay, openTransientOverlay } from "./overlayCoordinator";

const k = (s: string) => s as Key;
const newId = () => `note-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const fmt = (n: number): string => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
const today = (): string => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

/** Words used in a variant's labels. */
function nounArgs(v: Variant, lang: Locale): Record<string, string> {
  const n = (x: Noun | undefined, one: boolean) => (x ? t(k(`wi.${one ? "n1" : "n"}.${x}`), lang) : "");
  const p = (x: Per | undefined) => (x ? t(k(`wi.p.${x}`), lang) : "");
  return { unit: n(v.unit, false), unit1: n(v.unit, true), per: p(v.per), cost: n(v.cost, false) };
}
export function fieldLabel(v: Variant, id: string, lang: Locale): string {
  if (v.tpl.startsWith("lib:")) {
    const f = libName(v.tpl); if (!f) return id;
    return id === "result" ? tb(f.name, lang) : tb(f.params.find((x) => x.id === id)?.label ?? { en: id, bn: id }, lang);
  }
  return t(k(`wi.f.${v.tpl}.${id}`), lang, nounArgs(v, lang));
}
export const variantTitle = (id: string, lang: Locale): string => t(k(`wi.v.${id}`), lang);

const niceStep = (x: number): number => { const a = Math.abs(x); if (a < 10) return a < 1 ? 0.1 : 1; return Math.max(1, 10 ** (Math.floor(Math.log10(a)) - 1)); };
const sliderMax = (x: number): number => Math.max(10, 10 ** Math.ceil(Math.log10(Math.abs(x) * 3 + 1)));
const clean = (n: number): number => Math.round(n * 1e6) / 1e6;

interface PanelState { solve: string | null; compare: boolean; now: Raw; what: Raw }
export interface Panel { el: HTMLElement; apply: (values: Record<string, number>) => void }

/** The calculator for one variant. `afterChange` is called after every edit (the sheet does not need it; tests may). */
export function calcPanel(lang: Locale, variantId: string): Panel {
  const found = getVariant(variantId); if (!found) throw new Error(`unknown what-if variant ${variantId}`);
  const v: Variant = found;
  const tpl = getTemplate(v.tpl) as WTemplate;
  const st: PanelState = { solve: null, compare: false, now: {}, what: {} };
  const target = () => (st.solve && tpl.solvable.includes(st.solve) ? st.solve : tpl.defaultOut);
  const label = (id: string) => fieldLabel(v, id, lang);
  const root = h("section", { class: "card wi-panel", "data-whatif-panel": "1", "data-variant": v.id, "data-template": v.tpl });
  const results = h("div", { class: "wi-results", "aria-live": "polite", "aria-atomic": "false", "data-wi-results": "1" });
  const status = h("p", { class: "muted", role: "status", "data-wi-status": "1" });
  const sets = h("div", { class: "wi-sets" });

  const compute = (): void => {
    results.replaceChildren(...drawResults());
  };

  function row(set: "now" | "what", f: { id: string; neg?: boolean; choices?: readonly number[] }): HTMLElement {
    const store = st[set]; const id = `wi-${set}-${f.id}`; const lab = label(f.id);
    if (f.choices) {
      const name = `wi-${set}-${f.id}-r`;
      const radios = f.choices.map((c) => {
        const r = h("input", { type: "radio", name, id: `${name}-${c}`, value: String(c), "data-wi-in": f.id, "data-set": set }) as HTMLInputElement;
        r.checked = String(store[f.id] ?? "") === String(c);
        r.addEventListener("change", () => { store[f.id] = String(c); compute(); });
        return h("label", { class: "wi-radio", for: r.id }, r, `${c}%`);
      });
      return h("fieldset", { class: "wi-row wi-choice", "data-field": f.id }, h("legend", {}, lab), h("div", { class: "wi-radios" }, ...radios), h("p", { class: "muted" }, t("wi.tax.unset", lang)));
    }
    const input = h("input", { type: "text", inputmode: "decimal", id, autocomplete: "off", "data-wi-in": f.id, "data-set": set, "aria-label": lab }) as HTMLInputElement;
    const slider = h("input", { type: "range", id: `${id}-s`, min: "0", max: "10", step: "1", value: "0", disabled: true, "aria-label": t("wi.slider", lang, { label: lab }), "data-wi-slider": f.id }) as HTMLInputElement;
    const sync = () => {
      const p = parseInput(store[f.id] as string | number | undefined, !!f.neg);
      if (p.state === "value") { const m = sliderMax(p.value); slider.min = f.neg ? String(-m) : "0"; slider.max = String(m); slider.step = String(niceStep(p.value)); slider.value = String(p.value); slider.disabled = false; }
      else { slider.disabled = true; slider.value = "0"; }
      input.setAttribute("aria-invalid", p.state === "invalid" ? "true" : "false");
    };
    const put = (n: number | null) => { store[f.id] = n === null ? "" : String(clean(n)); input.value = String(store[f.id]); sync(); compute(); };
    const cur = (): number | null => { const p = parseInput(store[f.id] as string | undefined, !!f.neg); return p.state === "value" ? p.value : null; };
    input.addEventListener("input", () => { store[f.id] = input.value; sync(); compute(); });
    slider.addEventListener("input", () => put(Number(slider.value)));
    const stepBtn = (sign: 1 | -1) => h("button", { class: "btn ghost wi-step", type: "button", "data-wi-step": sign > 0 ? "up" : "down", "aria-label": t(sign > 0 ? "wi.step.up" : "wi.step.down", lang, { label: lab }), onclick: () => {
      const c = cur(); if (c === null && sign < 0) return;
      const base = c ?? 0; const n = base + sign * niceStep(base);
      put(!f.neg && n < 0 ? 0 : n);
    } }, sign > 0 ? "+" : "−");
    const chip = (key: "wi.chip.dn" | "wi.chip.up" | "wi.chip.x2", text: string, factor: number) => h("button", { class: "btn ghost wi-chip", type: "button", "data-wi-chip": text, "aria-label": t(key, lang, { label: lab }), onclick: () => { const c = cur(); if (c !== null) put(c * factor); } }, text);
    input.value = String(store[f.id] ?? "");
    sync();
    return h("div", { class: "wi-row", "data-field": f.id },
      h("label", { for: id }, lab), h("div", { class: "wi-ctl" }, stepBtn(-1), input, stepBtn(1)), slider,
      h("div", { class: "wi-chips" }, chip("wi.chip.dn", "-10%", 0.9), chip("wi.chip.up", "+10%", 1.1), chip("wi.chip.x2", "×2", 2)));
  }

  function drawSets(): void {
    const tg = target();
    const fields = tpl.fields.filter((f) => f.id !== tg);
    const mk = (set: "now" | "what", title: string) => h("fieldset", { class: "wi-set", "data-wi-set": set }, h("legend", {}, title), ...fields.map((f) => row(set, f)));
    sets.replaceChildren(...(st.compare ? [mk("now", t("wi.now", lang)), mk("what", t("wi.what", lang))] : [mk("what", t("wi.what", lang))]));
    if (v.tpl === "fdr") sets.append(h("p", { class: "muted", "data-wi-fdr-note": "1" }, t((typeof st.what.excise === "string" || typeof st.what.excise === "number") && parseInput(st.what.excise).state === "value" ? "wi.fdr.excise" : "wi.fdr.simple", lang)));
  }

  const valueText = (c: WhatIfResult["outputs"][number]["calc"]): string => (c.ok ? fmt(c.value) : "?");
  const missingText = (ids: string[]) => ids.map(label).join(", ");

  function card(o: WhatIfResult["outputs"][number], other?: { calc: WhatIfResult["outputs"][number]["calc"]; delta: number | null; deltaPct: number | null; nowCalc: WhatIfResult["outputs"][number]["calc"] }): HTMLElement {
    const body: HTMLElement[] = [];
    if (other) {
      body.push(h("p", { class: "wi-line", "data-wi-now": "1" }, `${t("wi.now", lang)}: `, h("strong", {}, other.nowCalc.ok ? fmt(other.nowCalc.value) : "?")));
      body.push(h("p", { class: "wi-line", "data-wi-what": "1" }, `${t("wi.what", lang)}: `, h("strong", {}, valueText(o.calc))));
      if (other.delta !== null) body.push(h("p", { class: "wi-line", "data-wi-delta": "1" }, `${t("wi.diff", lang)}: `, h("strong", {}, `${other.delta > 0 ? "+" : ""}${fmt(other.delta)}`), other.deltaPct !== null ? ` (${other.deltaPct > 0 ? "+" : ""}${fmt(other.deltaPct)}%)` : ""));
    } else body.push(h("p", { class: "wi-value" }, h("strong", { "data-wi-value": "1" }, valueText(o.calc))));
    if (o.calc.ok) body.push(h("span", { class: "tag", "data-label": "ESTIMATE" }, t("wi.est", lang)));
    if (!o.calc.ok) body.push(h("p", { class: "muted", "data-wi-unknown": "1" }, o.missing.length ? t("wi.unknown", lang, { list: missingText(o.missing) }) : t("wi.unknown.calc", lang)));
    return h("div", { class: "wi-out", "data-out": o.id }, h("h3", { class: "wi-out-h" }, label(o.id)), ...body);
  }

  function bars(label0: string, now: number, what: number): SVGElement {
    const NS = "http://www.w3.org/2000/svg";
    const max = Math.max(Math.abs(now), Math.abs(what), 1e-9);
    const alt = t("wi.bars.alt", lang, { label: label0, now: fmt(now), what: fmt(what) });
    const svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "0 0 300 56"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", alt); svg.setAttribute("class", "wi-bars"); svg.setAttribute("data-wi-bars", "1"); svg.setAttribute("focusable", "false");
    const ttl = document.createElementNS(NS, "title"); ttl.textContent = alt; svg.append(ttl);
    [[now, "wi-bar-now", 4], [what, "wi-bar-what", 32]].forEach(([val, cls, y]) => {
      const r = document.createElementNS(NS, "rect"); r.setAttribute("x", "0"); r.setAttribute("y", String(y)); r.setAttribute("height", "20"); r.setAttribute("rx", "4");
      r.setAttribute("width", String(Math.max(2, Math.round(Math.abs(val as number) / max * 296)))); r.setAttribute("class", String(cls)); svg.append(r);
    });
    return svg;
  }

  function drawResults(): HTMLElement[] {
    const out: HTMLElement[] = [];
    const tg = target();
    let anyOk = false; let flags: string[] = []; let invalid: string[] = [];
    if (st.compare) {
      const c = compareWhatIf(v.tpl, st.now, st.what, tg);
      invalid = [...new Set([...c.now.invalid, ...c.what.invalid])]; flags = c.what.flags;
      c.rows.forEach((r, i) => { const o = c.what.outputs[i]!; if (o.calc.ok) anyOk = true; out.push(card(o, { calc: r.what, delta: r.delta, deltaPct: r.deltaPct, nowCalc: r.now })); });
      const first = c.rows[0];
      if (first && first.now.ok && first.what.ok) out.unshift(h("div", { class: "wi-bars-box" }, bars(label(first.id), first.now.value, first.what.value), h("p", { class: "muted", "data-wi-bars-text": "1" }, t("wi.bars.alt", lang, { label: label(first.id), now: fmt(first.now.value), what: fmt(first.what.value) }))));
    } else {
      const r = runWhatIf(v.tpl, st.what, tg);
      invalid = r.invalid; flags = r.flags;
      for (const o of r.outputs) { if (o.calc.ok) anyOk = true; out.push(card(o)); }
    }
    if (invalid.length) out.push(h("p", { class: "wi-invalid", role: "status", "data-wi-invalid": "1" }, t("wi.invalid", lang, { list: missingText(invalid) })));
    if (!anyOk && Object.values(st.what).every((x) => x === undefined || x === "") && Object.values(st.now).every((x) => x === undefined || x === "")) out.unshift(h("p", { class: "muted", "data-wi-empty": "1" }, t("wi.empty", lang)));
    for (const f of flags) { if (f === "excise_not_counted" || f === "excise_typed") continue; out.push(h("p", { class: "wi-flag", "data-wi-flag": f }, t(k(`wi.flag.${f}`), lang))); }
    const notes = anyOk ? notesFor(v.id) : [];
    out.push(...(anyOk ? notes : []).map((n) => h("p", { class: "wi-note", "data-wi-note": n }, t(k(`wi.note.${n}`), lang))));
    if (!anyOk) out.push(h("p", { class: "wi-note", "data-wi-note": "unknown" }, t("wi.note.unknown", lang)));
    return out;
  }

  const find = tpl.solvable.length ? (() => {
    const sel = h("select", { id: "wi-find", "data-wi-find": "1" }, ...[tpl.defaultOut, ...tpl.solvable.filter((x) => x !== tpl.defaultOut)].map((id) => h("option", { value: id }, label(id)))) as HTMLSelectElement;
    sel.addEventListener("change", () => { st.solve = sel.value; drawSets(); compute(); });
    return h("div", { class: "wi-find" }, h("label", { for: "wi-find" }, t("wi.find", lang)), sel);
  })() : null;
  const cmp = h("input", { type: "checkbox", id: "wi-compare", "data-wi-compare": "1" }) as HTMLInputElement;
  cmp.addEventListener("change", () => {
    st.compare = cmp.checked;
    if (st.compare) st.now = { ...st.what };
    drawSets(); compute();
  });
  const setValues = (values: Record<string, number>) => {
    for (const [key, val] of Object.entries(values)) { st.now[key] = String(val); st.what[key] = String(val); }
    st.compare = true; cmp.checked = true; drawSets(); compute();
  };

  const noteText = (): string => {
    const lines: string[] = [];
    const tg = target();
    const pick = (src: Raw) => tpl.fields.filter((f) => f.id !== tg && src[f.id] !== undefined && src[f.id] !== "").map((f) => `${label(f.id)}: ${String(src[f.id])}`);
    if (st.compare) { lines.push(`${t("wi.now", lang)}`, ...pick(st.now), `${t("wi.what", lang)}`); }
    lines.push(...pick(st.what));
    const r = runWhatIf(v.tpl, st.what, tg);
    for (const o of r.outputs) lines.push(`${label(o.id)}: ${o.calc.ok ? `${fmt(o.calc.value)} (${t("wi.est", lang)})` : "?"}`);
    lines.push(t("wi.note.estimate", lang));
    return lines.join("\n").slice(0, 1900);
  };
  const save = h("button", { class: "btn", type: "button", "data-act": "wi-save", onclick: () => {
    const ok = saveTyped({ id: newId(), entity: "note", createdAt: new Date().toISOString(), values: { "note.title": typed(t("wi.noteTitle", lang, { title: variantTitle(v.id, lang) }).slice(0, 120)), "note.text": typed(noteText()) } });
    status.textContent = ok ? t("wi.saved", lang) : saveBlockedText(lang);
  } }, t("wi.save", lang));
  const reset = h("button", { class: "btn ghost", type: "button", "data-act": "wi-reset", onclick: () => { st.now = {}; st.what = {}; status.textContent = ""; drawSets(); compute(); } }, t("wi.reset", lang));

  drawSets(); compute();
  root.append(h("h2", { class: "card-h" }, variantTitle(v.id, lang)), ...(find ? [find] : []),
    h("div", { class: "wi-cmp" }, h("label", { class: "k-check", for: "wi-compare" }, cmp, t("wi.compare", lang))),
    sets, h("h3", { class: "wi-res-h" }, t("wi.result", lang)), results, h("div", { class: "wi-actions" }, reset, save), status);
  return { el: root, apply: setValues };
}

const catSection = (lang: Locale, cat: WiCategory) => h("section", { class: "card", "data-wi-cat": cat }, h("h2", { class: "card-h" }, t(k(`wi.cat.${cat}`), lang)),
  h("ul", { class: "plain wi-list" }, ...variantsOf(cat).map((x) => h("li", {}, h("a", { class: "item", href: `#/whatif/${x.id}`, "data-wi-link": x.id }, variantTitle(x.id, lang))))));

/** /whatif (all calculators) and /whatif/<variant> (one calculator on a full page). */
export function whatifScreen(lang: Locale, variantId?: string): HTMLElement {
  const v = variantId ? getVariant(variantId) : undefined;
  if (v) {
    const panel = calcPanel(lang, v.id);
    return h("main", { class: "scr scr-whatif" }, h("a", { class: "crumb", href: "#/whatif" }, `← ${t("wi.back", lang)}`), h("h1", {}, t("wi.title", lang)), panel.el, h("p", { class: "muted" }, t("wi.local", lang)));
  }
  return h("main", { class: "scr scr-whatif" }, h("h1", {}, t("wi.title", lang)), h("p", { class: "sub" }, t("wi.intro", lang)), ...CATEGORIES.map((c) => catSection(lang, c)), h("p", { class: "muted" }, t("wi.local", lang)));
}

const ICON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 7.5h7M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01"/></svg>';
/** The top-bar button, on every screen. */
export function whatifButton(lang: Locale): HTMLButtonElement {
  const btn = h("button", { class: "wi-btn", type: "button", "data-act": "whatif-open", "aria-haspopup": "dialog", "aria-label": t("wi.btn.aria", lang), title: t("wi.btn", lang), onclick: () => openWhatIfSheet(lang, location.hash.replace(/^#/, "") || "/today", btn) });
  btn.innerHTML = ICON;
  return btn;
}

/** Suggestions for the current screen: only the active mode's records, and only when entering data is allowed. */
export function suggestionsFor(path: string): Suggestion[] {
  if (!consentOn()) return [];
  const ns = activeNs();
  return prefillFor(path, allRecs(), { ns, today: today(), healthConsent: ns === "demo" || readHealthConsent(consentKv) });
}

/** The sheet (same pattern as the AI check sheet): one transient overlay, Esc or Close dismisses, Back closes it. */
export function openWhatIfSheet(lang: Locale, path: string, opener?: HTMLElement): void {
  const sugg = suggestionsFor(path);
  let current = sugg[0]?.variant ?? defaultVariantFor(path);
  const body = h("div", { class: "wi-sheet-body", "data-wi-sheet-body": "1" });
  const heading = h("h2", { id: "wi-sheet-h", tabindex: "-1" }, t("wi.sheet.h", lang));
  const select = h("select", { id: "wi-pick", "data-wi-pick": "1", "aria-label": t("wi.pick", lang) }, ...CATEGORIES.map((c) => h("optgroup", { label: t(k(`wi.cat.${c}`), lang) }, ...variantsOf(c).map((x) => h("option", { value: x.id }, variantTitle(x.id, lang)))))) as HTMLSelectElement;
  const chips = h("div", { class: "wi-use", "data-wi-use": "1" });
  const full = h("a", { class: "item", href: "#/whatif", "data-wi-full": "1" }, t("wi.openfull", lang));
  const show = (id: string, values?: Record<string, number>) => {
    current = id; select.value = id; full.setAttribute("href", `#/whatif/${id}`);
    const panel = calcPanel(lang, id); body.replaceChildren(panel.el);
    const own = sugg.find((s) => s.variant === id); const vals = values ?? own?.values; if (vals) panel.apply(vals);
  };
  chips.replaceChildren(...(sugg.length ? [h("p", { class: "muted" }, t("wi.use", lang)), ...sugg.map((s) => h("button", { class: "btn ghost wi-chip", type: "button", "data-wi-use-variant": s.variant, onclick: () => show(s.variant, s.values) }, variantTitle(s.variant, lang)))] : [h("p", { class: "muted", "data-wi-use-none": "1" }, t("wi.use.none", lang))]));
  select.addEventListener("change", () => show(select.value));
  const wrap = h("div", { class: "wi-sheet-wrap", "data-wi-sheet-wrap": "1" });
  const sheet = h("div", { class: "wi-sheet", role: "dialog", "aria-modal": "true", "aria-labelledby": "wi-sheet-h", "data-wi-sheet": "1" },
    h("div", { class: "wi-sheet-head" }, heading, h("button", { class: "btn ghost", type: "button", "data-wi-close": "1", onclick: () => closeTransientOverlay("dismiss") }, t("wi.close", lang))),
    h("label", { for: "wi-pick" }, t("wi.pick", lang)), select, chips, body, full, h("p", { class: "muted" }, t("wi.local", lang)));
  wrap.append(sheet);
  wrap.addEventListener("click", (e) => { if (e.target === wrap) closeTransientOverlay("dismiss"); });
  document.body.append(wrap);
  show(current);
  openTransientOverlay({ id: "whatif-sheet", returnFocus: opener, history: true, close: () => wrap.remove() });
  heading.focus();
}

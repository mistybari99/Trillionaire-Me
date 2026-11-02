// O5 (C): assessment and path-fit cards on the Plan screen. Simple cards; no ordering by merit, no red copy, no external calls.
import { h } from "./dom";
import { t, tb } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { num } from "./components";
import type { TMRecord } from "../core/types";
import { APPROACH_FIELDS, approachFrom, DIMENSIONS, SOURCE_WEIGHT, WEIGHT_MAX, WEIGHT_MIN, assessmentFrom, levelsOf, parseWeight, pathFit, resourceRows, skillEvidence, weightsFrom, type Dimension, type PathFit, type Source, type Weights } from "../core/assessment";
import { freshnessOf } from "../core/freshness";
import { ventureRows } from "../core/ventures";
import { activeNs, consentOn, consentPrompt, nsTag, saveBlockedText, saveTyped, storeOf, allRecs } from "./entry";
import type { FieldValue } from "../core/types";
import { fieldById } from "../catalog/fields";
import { valueEl } from "./components";
import { PATH_STALE_DAYS, THEME_LABEL } from "../library/paths";

const list = (xs: string[]) => xs.join(", ");

function dimensionCard(d: Dimension, s: ReturnType<typeof levelsOf>["dimensions"][Dimension], lang: Locale): HTMLElement {
  const head = h("h3", {}, t(`assess.dim.${d}` as Key, lang));
  if (s.status === "not_enough_data") return h("div", { class: "card", "data-dim": d, "data-status": s.status }, head, h("p", { class: "muted" }, t("assess.notEnough", lang)));
  const rating = s.level === null
    ? h("p", { class: "muted", "data-rating": "none" }, t("assess.noRating", lang))
    : h("p", { class: "muted", "data-rating": "given" }, t("assess.avg", lang, { avg: num(Math.round((s.level / 20) * 10) / 10, lang) }), " · ", t("assess.rated", lang, { n: num(s.rated, lang), total: num(s.count, lang) }));
  return h("div", { class: "card", "data-dim": d, "data-status": s.status }, head, h("p", {}, list(s.names)), d === "strengths" ? null : rating);
}

function fitCard(f: PathFit, lang: Locale, weights: Weights, custom: boolean, recs: readonly TMRecord[]): HTMLElement {
  const srcLabel = (s: Source) => t(`fit.src.${s}` as Key, lang);
  const unmapped = f.unmapped.length ? h("p", { class: "muted", "data-unmapped": "1" }, t("fit.unmapped", lang, { list: list(f.unmapped) })) : null;
  const body = f.status === "not_enough_data"
    ? [h("p", { class: "muted", "data-fit": "not_enough_data" }, t("fit.notEnough", lang)), h("a", { class: "crumb", href: "#/diary/intake/2" }, t("fit.add", lang))]
    : f.status === "no_match" ? [h("p", { class: "muted", "data-fit": "no_match" }, t("fit.none", lang)), unmapped]
    : f.matches.map((m) => h("div", { class: "card", "data-path": m.path.id },
      h("h3", {}, tb(m.path.name, lang)),
      h("p", {}, tb(m.path.summary, lang)),
      h("p", { class: "muted", "data-match-weight": String(m.weight) }, t("fit.matchWeight", lang, { w: num(m.weight, lang) })),
      ...m.reasons.map((r) => h("p", { class: "muted", "data-reason": r.theme }, t("fit.reason", lang, { src: srcLabel(r.source), text: r.text, theme: tb(THEME_LABEL[r.theme], lang) }), ` · ${t("fit.weightOf", lang, { w: num(weights[r.source], lang) })}`)),
      m.unknownThemes.length ? h("p", { class: "muted", "data-unknown": "1" }, t("fit.unknown", lang, { list: list(m.unknownThemes.map((th) => tb(THEME_LABEL[th], lang))) })) : null,
      h("p", {}, t("fit.needs", lang, { text: tb(m.path.needs, lang) })),
      h("p", {}, t("fit.test", lang, { text: tb(m.path.firstTest, lang) })),
      m.path.caution ? h("p", { class: "muted", "data-caution": "1" }, t("fit.caution", lang, { text: tb(m.path.caution, lang) })) : null,
      sourceLine(m.path, lang),
      h("p", { class: "muted" }, h("a", { class: "crumb", href: "#/more/halal-flags", "data-halal-link": m.path.id }, t("fit.halal", lang)), ` ${t("fit.halal.note", lang)}`)));
  return h("div", { class: "card", "data-fit-card": "1" },
    h("h3", {}, t("fit.title", lang)), h("p", { class: "muted" }, t("fit.intro", lang)),
    weightsCard(weights, custom, recs, lang),
    approachLine(recs, lang),
    ...body,
    ownOptionsCard(recs, lang),
    f.status === "matched" ? unmapped : null,
    h("p", { class: "muted" }, t("fit.draft", lang)));
}

/** Skills with an example the user wrote. Shown back in their own words; nothing is counted from it. */
function evidenceCard(recs: readonly TMRecord[], lang: Locale): HTMLElement {
  const rows = skillEvidence(recs);
  return h("div", { class: "card", "data-evidence": String(rows.length) }, h("h3", {}, t("assess.evidence.title", lang)),
    rows.length ? h("ul", { class: "plain" }, ...rows.map((r) => h("li", { "data-evidence-row": r.id }, h("strong", {}, r.name), ": ", valueEl(r.evidence, r.ns === "real" ? "FACT" : "DEMO", lang))))
      : h("p", { class: "muted" }, t("assess.evidence.none", lang), " ", h("a", { class: "crumb", href: "#/diary/intake/3" }, t("assess.evidence.add", lang))));
}
/** Resources the user listed: kind and short description.  */
function resourcesCard(recs: readonly TMRecord[], lang: Locale): HTMLElement {
  const rows = resourceRows(recs);
  const kindName = (code: string | null) => (code === null ? t("unknown.unknown", lang) : tb(fieldById("resource.kind")!.options!.find((o) => o.code === code)?.label ?? { bn: code, en: code }, lang));
  return h("div", { class: "card", "data-resources": String(rows.length) }, h("h3", {}, t("assess.resources.title", lang)),
    rows.length ? h("ul", { class: "plain" }, ...rows.map((r) => h("li", { "data-resource-row": r.id }, h("strong", {}, kindName(r.kind)), r.description ? ": " : null, r.description ? valueEl(r.description, r.ns === "real" ? "FACT" : "DEMO", lang) : null)))
      : h("p", { class: "muted" }, t("assess.resources.none", lang), " ", h("a", { class: "crumb", href: "#/diary/intake/5" }, t("assess.resources.add", lang))));
}

/** Plan screen section: assessment cards, then path-fit cards. Reads only the user's own records. */
export function assessmentSection(recs: readonly TMRecord[], lang: Locale): HTMLElement {
  const a = assessmentFrom(recs); const wt = weightsFrom(recs);
  const s = levelsOf(a);
  return h("section", { "data-assessment": "1" },
    h("h2", {}, t("assess.title", lang)),
    h("p", { class: "sub" }, t("assess.intro", lang)),
    ...DIMENSIONS.map((d) => dimensionCard(d, s.dimensions[d], lang)),
    evidenceCard(recs, lang), resourcesCard(recs, lang), approachCard(recs, lang),
    fitCard(pathFit(a, undefined, wt.weights), lang, wt.weights, wt.custom, recs));
}

/** Where a path entry comes from and how old it is. An old entry is flagged; an unreadable date is "unknown", never "recent". */
function sourceLine(p: { source: { bn: string; en: string }; writtenOn: string }, lang: Locale): HTMLElement {
  const f = freshnessOf(p.writtenOn, new Date(), PATH_STALE_DAYS);
  return h("p", { class: "muted", "data-path-source": f }, t("fit.source", lang, { s: tb(p.source, lang), d: p.writtenOn }),
    f === "recent" ? null : h("span", { class: "tag off", "data-path-stale": f }, ` ${t(f === "stale" ? "fit.stale" : "fit.dateUnknown", lang, { n: num(PATH_STALE_DAYS, lang) })}`));
}

/** The weights behind the order of paths: shown as numbers, changeable, and reset to the built-in ones. No weight is a promise of any result. */
function weightsCard(weights: Weights, custom: boolean, recs: readonly TMRecord[], lang: Locale): HTMLElement {
  const srcs: Source[] = ["skill", "interest", "strength"];
  const inputs = srcs.map((s) => h("input", { id: `pw-${s}`, type: "text", inputmode: "numeric", autocomplete: "off", value: String(weights[s]) })) as HTMLInputElement[];
  const err = h("p", { class: "muted", role: "alert", "data-err": "weights" }); // calm text: this section shows no red
  const form = h("form", { novalidate: true, "data-form": "path-weights" }, consentOn() ? null : consentPrompt(lang),
    ...srcs.flatMap((s, i) => [h("label", { for: `pw-${s}` }, tb(fieldById(`path_weights.${s}`)!.label, lang)), inputs[i]!]), err,
    h("button", { class: "btn ghost", type: "submit", style: "width:auto;min-height:44px" }, t("fit.w.save", lang)), " ",
    h("button", { class: "btn ghost", type: "button", "data-act": "pw-reset", style: "width:auto;min-height:44px" }, t("fit.w.reset", lang)));
  const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault(); err.textContent = "";
    const vals = inputs.map((i) => parseWeight(i.value));
    if (vals.some((x) => x === undefined)) { err.textContent = t("fit.w.err", lang, { min: num(WEIGHT_MIN, lang), max: num(WEIGHT_MAX, lang) }); return; }
    const values: Record<string, FieldValue> = {};
    srcs.forEach((s, i) => { const n = vals[i] as number | null; if (n !== null && n !== SOURCE_WEIGHT[s]) values[`path_weights.${s}`] = { state: "value", value: n, label: "FACT" }; });
    const old = recs.filter((r) => r.entity === "path_weights");
    if (!consentOn()) { err.textContent = saveBlockedText(lang); return; }
    for (const r of old) storeOf(r).delete(r.id);
    if (Object.keys(values).length && !saveTyped({ id: `pathw-${activeNs()}`, entity: "path_weights", createdAt: new Date().toISOString(), values })) { err.textContent = saveBlockedText(lang); return; }
    rerender();
  });
  form.querySelector<HTMLButtonElement>('[data-act="pw-reset"]')!.addEventListener("click", () => {
    if (!consentOn()) { err.textContent = saveBlockedText(lang); return; }
    for (const r of allRecs().filter((x) => x.entity === "path_weights")) storeOf(r).delete(r.id);
    rerender();
  });
  return h("details", { class: "help", "data-path-weights": custom ? "custom" : "default" },
    h("summary", {}, t("fit.w.title", lang), " ", nsTag(activeNs(), lang)),
    h("p", { "data-weights-now": srcs.map((s) => weights[s]).join(",") }, t("fit.w.now", lang, { s: num(weights.skill, lang), i: num(weights.interest, lang), g: num(weights.strength, lang) }), " ", t(custom ? "fit.w.custom" : "fit.w.default", lang)),
    h("p", { class: "muted" }, t("fit.w.note", lang)), form);
}

/** Spec 3.3: the person's own business is one more possible option, never the default and never scored. Nothing is drawn without a venture. */
function ownOptionsCard(recs: readonly TMRecord[], lang: Locale): HTMLElement | null {
  const rows = ventureRows([...recs]).filter((v) => v.name);
  if (!rows.length) return null;
  return h("div", { class: "card", "data-own-options": String(rows.length) }, h("h3", {}, t("fit.own.title", lang)), h("p", { class: "muted" }, t("fit.own.note", lang)),
    h("ul", { class: "plain" }, ...rows.map((v) => h("li", { "data-own-option": v.id }, h("strong", {}, v.name), v.stage ? h("span", { class: "muted" }, ` · ${tb(fieldById("venture.stage")!.options!.find((o) => o.code === v.stage)?.label ?? { bn: v.stage, en: v.stage }, lang)}`) : null))),
    h("a", { class: "crumb", href: "#/diary/ventures" }, t("fit.own.open", lang)));
}

const choiceText = (field: string, code: string | null, lang: Locale): string | null => (code === null ? null : tb(fieldById(field)!.options!.find((o) => o.code === code)?.label ?? { bn: code, en: code }, lang));

/** Three optional questions. Each can be skipped (left on "skip"); a skipped one is Unknown and nothing is guessed. Saved only when you press Save. */
function approachCard(recs: readonly TMRecord[], lang: Locale): HTMLElement {
  const cur = approachFrom(recs);
  const sels = APPROACH_FIELDS.map((f, i) => h("select", { id: `ap-${i}` }, h("option", { value: "" }, t("ap.skip", lang)),
    ...fieldById(f)!.options!.map((o) => h("option", { value: o.code, ...(cur[f] === o.code ? { selected: true } : {}) }, tb(o.label, lang))))) as HTMLSelectElement[];
  const err = h("p", { class: "muted", role: "alert", "data-err": "approach" });
  const form = h("form", { novalidate: true, "data-form": "approach" }, consentOn() ? null : consentPrompt(lang),
    ...APPROACH_FIELDS.flatMap((f, i) => [h("label", { for: `ap-${i}` }, tb(fieldById(f)!.label, lang)), sels[i]!]), err,
    h("button", { class: "btn ghost", type: "submit", style: "width:auto;min-height:44px" }, t("ap.save", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault(); err.textContent = "";
    if (!consentOn()) { err.textContent = saveBlockedText(lang); return; }
    for (const r of recs.filter((x) => x.entity === "approach")) storeOf(r).delete(r.id);
    const values: Record<string, FieldValue> = {};
    APPROACH_FIELDS.forEach((f, i) => { if (sels[i]!.value) values[f] = { state: "value", value: sels[i]!.value, label: "FACT" }; });
    if (Object.keys(values).length && !saveTyped({ id: `approach-${activeNs()}`, entity: "approach", createdAt: new Date().toISOString(), values })) { err.textContent = saveBlockedText(lang); return; }
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
  return h("div", { class: "card", "data-approach-card": "1" }, h("h3", {}, t("ap.title", lang)), h("p", { class: "muted" }, t("ap.intro", lang)),
    ...APPROACH_FIELDS.map((f) => h("p", { "data-approach": f }, h("span", { class: "muted" }, `${tb(fieldById(f)!.label, lang)}: `), choiceText(f, cur[f], lang) ?? h("span", { class: "muted", "data-unknown": "1" }, t("unknown.unknown", lang)))), form);
}
/** On the path cards: the person's own answers, shown back. Nothing when all three were skipped. */
function approachLine(recs: readonly TMRecord[], lang: Locale): HTMLElement | null {
  const cur = approachFrom(recs); const parts = APPROACH_FIELDS.flatMap((f) => { const x = choiceText(f, cur[f], lang); return x ? [`${tb(fieldById(f)!.label, lang)}: ${x}`] : []; });
  return parts.length ? h("p", { class: "muted", "data-approach-line": "1" }, t("ap.line", lang, { list: parts.join(" · ") })) : null;
}

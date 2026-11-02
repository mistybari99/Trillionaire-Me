// M17 Notes, sources and SOPs (`#/notes`): what the person writes down to remember where something came from, what they learned,
// and the standard steps of a job they may hand over. Nothing is fetched; a reference is only text. Old sources and SOPs are flagged to check again.
import { h } from "./dom";
import { t, tb } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { prefs, store } from "./state";
import { activeNs, allRecs, consentOn, consentPrompt, entryNs, labelFor, nsTag, saveBlockedText, saveTyped, storeOf } from "./entry";
import { disclaimers, num } from "./components";
import { fieldById } from "../catalog/fields";
import { checkFreeText } from "../core/safety";
import { KNOWLEDGE_STALE_DAYS, SOURCE_KINDS, noteRows, sopRows, sourceRows, validateNote, validateSop, validateSource, type SopRow, type SourceRow } from "../core/knowledge";
import { todayIsoKpi } from "./kpiUi";
import type { FieldValue } from "../core/types";

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
const link = (href: string, cls: string, ...kids: Array<Node | string>) => h("a", { href, class: cls }, ...kids);
const typed = (value: unknown): FieldValue => ({ state: "value", value, label: "FACT" });
const kindLabel = (k: string | null, lang: Locale) => (k === null ? t("unknown.unknown", lang) : tb(fieldById("source.kind")!.options!.find((o) => o.code === k)?.label ?? { bn: k, en: k }, lang));
const remove = (id: string, lang: Locale) => h("button", { class: "btn ghost", type: "button", "data-remove": id, style: "width:auto;margin:0;min-height:44px", onclick: () => { store[activeNs()].delete(id); rerender(); } }, t("risk.remove", lang));
const newId = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

function freshTag(f: "recent" | "stale" | "unknown", on0: string | null, lang: Locale): HTMLElement {
  const on = on0 === null ? "" : on0;
  if (f === "recent") return h("span", { class: "muted", "data-fresh": "recent" }, t("kn.checked", lang, { d: on }));
  return h("span", { class: "tag off", "data-fresh": f }, f === "stale" ? t("kn.stale", lang, { d: on, n: num(KNOWLEDGE_STALE_DAYS, lang) }) : t("kn.dateUnknown", lang));
}

/** Set the "last checked" day of a source or SOP to today. The record keeps its id and mode. */
const touch = (id: string, field: string) => {
  const rec = allRecs().find((r) => r.id === id); if (!rec || !entryNs()) return;
  storeOf(rec).put({ ...rec, values: { ...rec.values, [field]: { state: "value", value: todayIsoKpi(), label: labelFor(rec.ns) } } }); rerender();
};

function sourcesSection(lang: Locale, rows: SourceRow[]): HTMLElement {
  const title = h("input", { id: "kn-s-title", type: "text", maxlength: "120", autocomplete: "off" });
  const kind = h("select", { id: "kn-s-kind" }, h("option", { value: "" }, t("unknown.unknown", lang)), ...SOURCE_KINDS.map((k) => h("option", { value: k }, kindLabel(k, lang))));
  const ref = h("input", { id: "kn-s-ref", type: "text", maxlength: "200", autocomplete: "off" });
  const on = h("input", { id: "kn-s-on", type: "date" });
  const note = h("textarea", { id: "kn-s-note", rows: "2", maxlength: "300" });
  const err = h("p", { class: "err", role: "alert" });
  const form = h("form", { novalidate: true, "data-form": "source" }, consentOn() ? null : consentPrompt(lang),
    h("label", { for: "kn-s-title" }, tb(fieldById("source.title")!.label, lang)), title, h("label", { for: "kn-s-kind" }, tb(fieldById("source.kind")!.label, lang)), kind,
    h("label", { for: "kn-s-ref" }, tb(fieldById("source.reference")!.label, lang)), ref, h("p", { class: "muted" }, t("kn.ref.hint", lang)),
    h("label", { for: "kn-s-on" }, tb(fieldById("source.checked_on")!.label, lang)), on, h("label", { for: "kn-s-note" }, tb(fieldById("source.note")!.label, lang)), note, err,
    h("button", { class: "btn", type: "submit" }, t("kn.s.add", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault(); err.textContent = "";
    const bad = validateSource({ title: title.value, reference: ref.value, note: note.value, checkedOn: on.value });
    if (bad) { err.textContent = t(`kn.err.s.${bad}` as Key, lang); return; }
    if (![title.value, ref.value, note.value].every((x) => checkFreeText(x).ok)) { err.textContent = t("intake.secretRejected", lang); return; }
    const values: Record<string, FieldValue> = { "source.title": typed(title.value.trim()) };
    if (kind.value) values["source.kind"] = typed(kind.value);
    if (ref.value.trim()) values["source.reference"] = typed(ref.value.trim());
    if (on.value) values["source.checked_on"] = typed(on.value);
    if (note.value.trim()) values["source.note"] = typed(note.value.trim());
    if (!saveTyped({ id: newId("src"), entity: "source", createdAt: new Date().toISOString(), values })) { err.textContent = saveBlockedText(lang); return; }
    rerender();
  });
  return h("section", { class: "card", "data-kn-section": "sources" }, h("h2", { class: "card-h" }, t("kn.s.title", lang)), h("p", { class: "muted" }, t("kn.s.intro", lang)),
    rows.length ? h("ul", { class: "plain" }, ...rows.map((s) => h("li", { "data-source": s.id }, nsTag(s.ns, lang), " ", h("strong", {}, s.title), h("span", { class: "muted" }, ` · ${kindLabel(s.kind, lang)}`),
      s.reference ? h("p", { class: "muted", "data-source-ref": "1" }, s.reference) : null, s.note ? h("p", {}, s.note) : null, freshTag(s.fresh, s.checkedOn, lang), " ",
      h("button", { class: "btn ghost", type: "button", "data-act": "source-checked", "data-source-id": s.id, style: "width:auto;margin:0;min-height:44px", onclick: () => touch(s.id, "source.checked_on") }, t("kn.checkedToday", lang)), " ", remove(s.id, lang))))
      : h("p", { class: "muted", "data-kn-empty": "sources" }, t("kn.s.none", lang)),
    h("h3", { class: "card-h" }, t("kn.s.add", lang)), form);
}

function notesSection(lang: Locale, recs: ReturnType<typeof allRecs>, sources: SourceRow[]): HTMLElement {
  const rows = noteRows(recs);
  const title = h("input", { id: "kn-n-title", type: "text", maxlength: "120", autocomplete: "off" });
  const text = h("textarea", { id: "kn-n-text", rows: "3", maxlength: "2000" });
  const src = h("select", { id: "kn-n-src" }, h("option", { value: "" }, t("kn.n.nosource", lang)), ...sources.map((s) => h("option", { value: s.id }, s.title)));
  const goals = recs.filter((r) => r.entity === "goal" && r.values["goal.title"]?.state === "value").sort((a, b) => (a.id < b.id ? -1 : 1));
  const goal = h("select", { id: "kn-n-goal" }, h("option", { value: "" }, t("kn.n.nogoal", lang)), ...goals.map((g) => h("option", { value: g.id }, String((g.values["goal.title"] as { value?: unknown }).value))));
  const err = h("p", { class: "err", role: "alert" });
  const form = h("form", { novalidate: true, "data-form": "note" }, consentOn() ? null : consentPrompt(lang),
    h("label", { for: "kn-n-title" }, tb(fieldById("note.title")!.label, lang)), title, h("label", { for: "kn-n-text" }, tb(fieldById("note.text")!.label, lang)), text,
    ...(sources.length ? [h("label", { for: "kn-n-src" }, t("kn.n.source", lang)), src] : []), ...(goals.length ? [h("label", { for: "kn-n-goal" }, t("kn.n.goal", lang)), goal] : []), err,
    h("button", { class: "btn", type: "submit" }, t("kn.n.add", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault(); err.textContent = "";
    const bad = validateNote({ title: title.value, text: text.value });
    if (bad) { err.textContent = t(`kn.err.n.${bad}` as Key, lang); return; }
    if (![title.value, text.value].every((x) => checkFreeText(x).ok)) { err.textContent = t("intake.secretRejected", lang); return; }
    const values: Record<string, FieldValue> = { "note.title": typed(title.value.trim()) };
    if (text.value.trim()) values["note.text"] = typed(text.value.trim());
    const links = { ...(src.value ? { source: src.value } : {}), ...(goal.value ? { goal: goal.value } : {}) };
    if (!saveTyped({ id: newId("note"), entity: "note", createdAt: new Date().toISOString(), values, ...(Object.keys(links).length ? { links } : {}) })) { err.textContent = saveBlockedText(lang); return; }
    rerender();
  });
  const srcTitle = (id: string | null) => sources.find((s) => s.id === id)?.title ?? "";
  const goalTitle = (id: string | null) => { const g = goals.find((x) => x.id === id); return g ? String((g.values["goal.title"] as { value?: unknown }).value) : ""; };
  return h("section", { class: "card", "data-kn-section": "notes" }, h("h2", { class: "card-h" }, t("kn.n.title", lang)), h("p", { class: "muted" }, t("kn.n.intro", lang)),
    rows.length ? h("ul", { class: "plain" }, ...rows.map((n) => h("li", { "data-note": n.id }, nsTag(n.ns, lang), " ", h("strong", {}, n.title), n.text ? h("p", {}, n.text) : null,
      n.sourceId ? h("p", { class: "muted", "data-note-source": n.sourceId }, t("kn.n.from", lang, { s: srcTitle(n.sourceId) })) : null,
      n.goalId ? h("p", { class: "muted", "data-note-goal": n.goalId }, t("kn.n.about", lang, { g: goalTitle(n.goalId) }), " ", link(`#/journey/goal/${n.goalId}`, "crumb", t("remind.goal.open", lang))) : null, remove(n.id, lang))))
      : h("p", { class: "muted", "data-kn-empty": "notes" }, t("kn.n.none", lang)),
    h("h3", { class: "card-h" }, t("kn.n.add", lang)), form);
}

function sopSection(lang: Locale, recs: ReturnType<typeof allRecs>, rows: SopRow[]): HTMLElement {
  const title = h("input", { id: "kn-p-title", type: "text", maxlength: "120", autocomplete: "off" });
  const steps = h("textarea", { id: "kn-p-steps", rows: "5", maxlength: "6000" });
  const roles = recs.filter((r) => r.entity === "team_role" && r.values["team_role.role"]?.state === "value").sort((a, b) => (a.id < b.id ? -1 : 1));
  const roleName = (id: string | null) => { const r = roles.find((x) => x.id === id); return r ? String((r.values["team_role.role"] as { value?: unknown }).value) : ""; };
  const role = h("select", { id: "kn-p-role" }, h("option", { value: "" }, t("kn.p.norole", lang)), ...roles.map((r) => h("option", { value: r.id }, roleName(r.id))));
  const err = h("p", { class: "err", role: "alert" });
  const form = h("form", { novalidate: true, "data-form": "sop" }, consentOn() ? null : consentPrompt(lang),
    h("label", { for: "kn-p-title" }, tb(fieldById("sop.title")!.label, lang)), title, h("label", { for: "kn-p-steps" }, tb(fieldById("sop.steps")!.label, lang)), steps,
    ...(roles.length ? [h("label", { for: "kn-p-role" }, t("kn.p.role", lang)), role] : []), err, h("button", { class: "btn", type: "submit" }, t("kn.p.add", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault(); err.textContent = "";
    const bad = validateSop({ title: title.value, steps: steps.value });
    if (bad) { err.textContent = t(`kn.err.p.${bad}` as Key, lang, { n: num(30, lang) }); return; }
    if (![title.value, steps.value].every((x) => checkFreeText(x).ok)) { err.textContent = t("intake.secretRejected", lang); return; }
    const values: Record<string, FieldValue> = { "sop.title": typed(title.value.trim()), "sop.steps": typed(steps.value.trim()), "sop.reviewed_on": typed(todayIsoKpi()) };
    if (!saveTyped({ id: newId("sop"), entity: "sop", createdAt: new Date().toISOString(), values, ...(role.value ? { links: { role: role.value } } : {}) })) { err.textContent = saveBlockedText(lang); return; }
    rerender();
  });
  return h("section", { class: "card", "data-kn-section": "sops" }, h("h2", { class: "card-h" }, t("kn.p.title", lang)), h("p", { class: "muted" }, t("kn.p.intro", lang)),
    rows.length ? h("div", {}, ...rows.map((p) => h("article", { class: "card", "data-sop": p.id }, nsTag(p.ns, lang), h("h3", { class: "card-h" }, p.title),
      p.roleId ? h("p", { class: "muted", "data-sop-role": p.roleId }, t("kn.p.forRole", lang, { r: roleName(p.roleId) })) : null,
      h("ol", {}, ...p.steps.map((s) => h("li", {}, s))), freshTag(p.fresh, p.reviewedOn, lang), " ",
      h("button", { class: "btn ghost", type: "button", "data-act": "sop-reviewed", "data-sop-id": p.id, style: "width:auto;margin:0;min-height:44px", onclick: () => touch(p.id, "sop.reviewed_on") }, t("kn.reviewedToday", lang)), " ", remove(p.id, lang))))
      : h("p", { class: "muted", "data-kn-empty": "sops" }, t("kn.p.none", lang)),
    h("h3", { class: "card-h" }, t("kn.p.add", lang)), form);
}

export function notesScreen(): HTMLElement {
  const lang = prefs.lang; const recs = allRecs(); const now = new Date(); const sources = sourceRows(recs, now);
  return h("main", { class: "scr scr-notes" }, link("#/settings/about", "crumb", `← ${t("set.cat.about", lang)}`), h("h1", {}, t("kn.title", lang)), h("p", { class: "sub" }, t("kn.intro", lang)),
    sourcesSection(lang, sources), notesSection(lang, recs, sources), sopSection(lang, recs, sopRows(recs, now)),
    link("#/topics", "crumb", t("topics.title", lang)), " ", link("#/cards", "crumb", t("cards.title", lang)), " ", link("#/diary/team", "crumb", t("team.title", lang)),
    h("p", { class: "muted" }, t("kn.note", lang)), disclaimers(lang, ["advice"]));
}

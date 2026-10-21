import { h } from "./dom";
import { t, tb } from "../i18n/t";
import type { Key } from "../i18n/packs";
import { LOCALES, type Locale } from "../i18n/registry";
import { applyPrefs, prefs, store } from "./state";
import { demoBadge, disclaimers, fieldHelp, num, valueEl } from "./components";
import { STAGES, DEMO_CURRENT_STAGE, DEMO_DATE, DEMO_TASKS } from "../demo/seed";
import { MODULES, CAP_STATUSES, type ModuleDef } from "../modules/capability";
import { ENTITIES } from "../schema/entities";
import { FIELDS, CATALOG_VERSION, intakeSteps, fieldById } from "../catalog/fields";
import { semanticLabel } from "../catalog/labels";
import { completeness, nextStep, stepFields, type Answers } from "../core/intake";
import { checkFreeText } from "../core/safety";
import { type FieldValue, type TMRecord, type UnknownState } from "../core/types";
import type { FieldDef } from "../catalog/types";
import { StoreRepo } from "../adapters/storeRepo";
import { createBackup, restoreBackup } from "../core/backup";
import { GLOSSARY } from "../catalog/glossary";

const L = () => prefs.lang;
const link = (href: string, cls: string, ...kids: Array<Node | string>) => h("a", { href, class: cls }, ...kids);
const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));

// ---- demo answers persisted per entity in the demo namespace ----
export function loadAnswers(): Answers {
  const a: Answers = {};
  for (const r of store.demo.list()) if (r.id.startsWith("intake-")) Object.assign(a, r.values);
  return a;
}
function saveAnswers(step: number, vals: Answers) {
  const byEntity = new Map<string, Answers>();
  for (const [fid, v] of Object.entries(vals)) {
    const f = fieldById(fid); if (!f) continue;
    byEntity.set(f.entity, { ...(byEntity.get(f.entity) ?? {}), [fid]: v });
  }
  for (const [entity, values] of byEntity) {
    const id = `intake-${entity}`;
    const prev = store.demo.get(id);
    const rec: TMRecord = { id, entity, ns: "demo", ownerId: "demo-user", schemaVersion: 1, createdAt: prev?.createdAt ?? new Date().toISOString(), values: { ...(prev?.values ?? {}), ...values } };
    store.demo.put(rec);
  }
  void step;
}

// ---- shared bits ----
function stageLadder(lang: Locale): HTMLElement {
  const ol = h("ol", { class: "ladder", "aria-label": t("stage.ladder", lang) });
  STAGES.forEach((g, i) => {
    const st = i < DEMO_CURRENT_STAGE ? "done" : i === DEMO_CURRENT_STAGE ? "now" : "locked";
    ol.append(h("li", { class: st }, h("b", {}, g.code), h("div", {}, h("div", {}, tb(g.name, lang)), h("div", { class: "muted" }, tb(g.exit, lang))), h("span", { class: `tag ${st === "done" ? "ok" : st === "now" ? "warn" : "off"}` }, t(`stage.${st === "now" ? "current" : st}` as Key, lang))));
  });
  return ol;
}

function capTag(s: ModuleDef["statuses"][number], lang: Locale) {
  const cls = s === "implemented" || s === "offline-ok" ? "ok" : s === "demo" || s === "internet-needed" ? "warn" : "off";
  return h("span", { class: `tag ${cls}`, "data-cap": s }, t(`cap.${s}` as Key, lang));
}

function moduleCard(m: ModuleDef, lang: Locale) {
  return h("div", { class: "card", "data-module": m.id },
    h("div", { class: "row" }, h("h3", {}, `${m.id} · ${tb(m.name, lang)}`)),
    h("p", { class: "muted" }, tb(m.note, lang)),
    h("div", { class: "tags" }, ...m.statuses.map((s) => capTag(s, lang)), h("span", { class: "tag off" }, t("cap.gate", lang, { g: m.gate }))));
}

// ---- screens ----
export function today(): HTMLElement {
  const lang = L();
  const stage = STAGES[DEMO_CURRENT_STAGE]!;
  const nxt = nextStep(loadAnswers());
  const rungs = h("ul", { class: "rungs", role: "img", "aria-label": t("home.rungs", lang, { done: num(DEMO_CURRENT_STAGE, lang), total: num(STAGES.length, lang), now: num(DEMO_CURRENT_STAGE + 1, lang) }) },
    ...STAGES.map((_, i) => h("li", { class: i < DEMO_CURRENT_STAGE ? "done" : i === DEMO_CURRENT_STAGE ? "now" : "" })));
  return h("main", {},
    h("p", { class: "muted" }, valueEl(tb(DEMO_DATE, lang), "DEMO", lang)),
    h("h1", {}, t("home.title", lang)),
    h("p", { class: "sub" }, t("home.step", lang), " — ", valueEl(t("stage.progress", lang, { now: num(DEMO_CURRENT_STAGE + 1, lang), total: num(STAGES.length, lang) }), "DEMO", lang)),
    h("section", { class: "stage", "aria-label": t("home.stage", lang) },
      h("small", {}, `${t("home.stage", lang)} · ${tb(stage.name, lang)}`),
      h("div", { class: "n" }, num(DEMO_CURRENT_STAGE + 1, lang), h("span", { style: "font-size:22px;color:var(--muted)" }, ` / ${num(STAGES.length, lang)}`)),
      rungs),
    h("h2", {}, t("home.tasks", lang)),
    ...DEMO_TASKS.slice(0, 3).map((k, i) => h("div", { class: "task" }, h("b", {}, num(i + 1, lang)),
      h("div", {}, tb(k.title, lang), h("p", {}, valueEl(t("task.minutes", lang, { n: num(k.minutes, lang) }), "DEMO", lang), " · ", tb(k.hint, lang))))),
    link("#/diary/intake", "cta", t("home.start", lang)),
    nxt.field ? h("p", { class: "muted", style: "margin-top:12px" }, t("home.next", lang, { field: tb(nxt.field.label, lang) })) : null,
    disclaimers(lang));
}

export function journey(): HTMLElement {
  const lang = L();
  return h("main", {},
    h("h1", {}, t("journey.title", lang)),
    h("p", { class: "sub" }, t("empty.stageNote", lang)),
    stageLadder(lang),
    h("h2", {}, t("journey.slots", lang)),
    ...MODULES.filter((m) => m.tab === "journey").map((m) => moduleCard(m, lang)),
    disclaimers(lang));
}

export function diary(): HTMLElement {
  const lang = L();
  const a = loadAnswers();
  const c = completeness(a);
  const nxt = nextStep(a);
  const nextText = nxt.field
    ? t(`diary.next.${nxt.reasonKey}` as Key, lang, { field: tb(nxt.field.label, lang), why: tb(nxt.field.help.why, lang) })
    : t("diary.next.all_done", lang);
  return h("main", {},
    h("h1", {}, t("diary.title", lang)),
    h("p", { class: "sub" }, t("diary.intro", lang)),
    h("section", { class: "card", "aria-label": t("diary.completeness", lang) },
      h("h3", {}, t("diary.completeness", lang), " ", valueEl(`${num(c.pct, lang)}%`, "INFERENCE", lang)),
      h("div", { class: "bar", role: "img", "aria-label": `${c.pct}%` }, h("i", { style: `width:${c.pct}%` })),
      h("p", { class: "muted" }, t("diary.completeness.detail", lang, { filled: num(c.filled, lang), total: num(c.total, lang), addressed: num(c.addressed, lang) }))),
    h("section", { class: "card", "data-next": "1" }, h("h3", {}, t("diary.next", lang)), h("p", {}, nextText)),
    link("#/diary/intake", "cta", t("diary.start", lang)),
    h("h2", {}, t("diary.modules", lang)),
    ...MODULES.filter((m) => m.tab === "diary").map((m) => moduleCard(m, lang)),
    disclaimers(lang));
}

function inputFor(f: FieldDef, lang: Locale, cur: FieldValue | undefined): { el: HTMLElement; read: () => FieldValue | null | "invalid" | "secret" } {
  const unkSel = h("select", { "aria-label": t("intake.valueFor", lang), "data-role": "state" },
    h("option", { value: "value" }, t("intake.valueFor", lang)),
    ...f.unknownStates.map((u) => h("option", { value: u }, t(`unknown.${u}` as Key, lang))));
  if (cur && cur.state !== "value") unkSel.value = cur.state;
  let input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  const curVal = cur && cur.state === "value" ? String(cur.value) : "";
  if (f.options) {
    input = h("select", { id: `f-${f.id}` }, h("option", { value: "" }, t("intake.choose", lang)), ...f.options.map((o) => h("option", { value: o.code }, tb(o.label, lang))));
  } else if (f.type === "number" || f.type === "money") {
    input = h("input", { id: `f-${f.id}`, type: "text", inputmode: "decimal" });
  } else if (f.type === "date") {
    input = h("input", { id: `f-${f.id}`, type: "date" });
  } else {
    input = h("input", { id: `f-${f.id}`, type: "text", maxlength: "200", autocomplete: "off" });
  }
  input.value = curVal;
  const el = h("div", {}, input, f.unknownStates.length ? h("div", { class: "unk" }, unkSel) : null);
  const read = (): FieldValue | null | "invalid" | "secret" => {
    const st = f.unknownStates.length ? (unkSel.value as UnknownState | "value") : "value";
    if (st !== "value") return { state: st };
    const raw = input.value.trim();
    if (raw === "") return null; // left blank → stays unanswered (never 0)
    if (f.type === "number" || f.type === "money") {
      const n = Number(raw.replace(/,/g, "").replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6)));
      return Number.isFinite(n) ? { state: "value", value: n, label: "DEMO" } : "invalid";
    }
    if (f.type === "text") { if (!checkFreeText(raw).ok) return "secret"; }
    return { state: "value", value: raw, label: "DEMO" };
  };
  return { el, read };
}

export function intake(stepParam: string | undefined): HTMLElement {
  const lang = L();
  const steps = intakeSteps();
  const a = loadAnswers();
  const nxt = nextStep(a);
  const step = Number(stepParam) || nxt.step || steps[0]!;
  const idx = steps.indexOf(step);
  const fields = stepFields(step);
  const readers: Array<{ f: FieldDef; read: ReturnType<typeof inputFor>["read"]; err: HTMLElement }> = [];
  const form = h("form", { novalidate: true });
  const msg = h("p", { class: "ok-msg", role: "status" });
  for (const f of fields) {
    const ip = inputFor(f, lang, a[f.id]);
    const err = h("p", { class: "err", role: "alert" });
    readers.push({ f, read: ip.read, err });
    form.append(h("div", { class: "field", "data-field": f.id },
      h("label", { for: `f-${f.id}` }, tb(f.label, lang), " ", h("span", { class: "tag" }, t(`requirement.${f.requirement}` as Key, lang))),
      ip.el, err, fieldHelp(f, lang)));
  }
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const out: Answers = {}; let bad = false;
    for (const r of readers) {
      r.err.textContent = "";
      const v = r.read();
      if (v === "secret") { r.err.textContent = t("intake.secretRejected", lang); bad = true; }
      else if (v === "invalid") { r.err.textContent = t("intake.invalidNumber", lang); bad = true; }
      else if (v) out[r.f.id] = v;
    }
    if (bad) return; // nothing is saved when any field is rejected
    saveAnswers(step, out);
    const nextIdx = idx + 1;
    location.hash = nextIdx < steps.length ? `#/diary/intake/${steps[nextIdx]}` : "#/diary";
  });
  form.append(h("button", { class: "btn", type: "submit" }, idx === steps.length - 1 ? t("intake.finish", lang) : t("intake.next", lang)));
  return h("main", {},
    link("#/diary", "crumb", `← ${t("intake.back", lang)}`),
    h("div", { class: "top", style: "margin-top:8px" }, h("span", {}, t("intake.step", lang, { n: num(idx + 1, lang), total: num(steps.length, lang) })), demoBadge(lang)),
    h("p", { class: "muted" }, t("intake.demoNote", lang)),
    form, msg,
    h("p", { class: "muted" }, t("intake.skipHint", lang)),
    disclaimers(lang, ["noGuarantee"]));
}

export function deen(): HTMLElement {
  const lang = L();
  const ents = ENTITIES.filter((e) => e.module === "M13");
  return h("main", {},
    h("h1", {}, t("deen.title", lang)),
    h("p", { class: "sub" }, t("deen.intro", lang)),
    h("p", { class: "muted" }, t("deen.control", lang)),
    ...ents.map((e) => {
      const fs = FIELDS.filter((f) => f.entity === e.id);
      return h("div", { class: "card", "data-entity": e.id },
        h("div", { class: "row" }, h("h3", {}, tb(e.name, lang)), h("span", { class: "tag ok" }, t("deen.private", lang))),
        h("p", { class: "muted" }, t("deen.fields", lang, { n: num(fs.length, lang) }), " · ", t("access.device_only_per_item_authorisation", lang)),
        ...fs.map((f) => fieldHelp(f, lang)));
    }),
    ...MODULES.filter((m) => m.tab === "deen").map((m) => moduleCard(m, lang)),
    disclaimers(lang, ["noFatwa", "noGuarantee"]));
}

export function more(): HTMLElement {
  const lang = L();
  const seg = (label: string, active: boolean, on: () => void) => h("button", { type: "button", "aria-pressed": String(active), onclick: on }, label);
  const items: Array<[string, Key, Key]> = [["#/more/status", "more.status", "more.status.desc"], ["#/more/fields", "more.fields", "more.fields.desc"], ["#/more/glossary", "more.glossary", "more.glossary.desc"], ["#/more/safety", "more.safety", "more.safety.desc"], ["#/more/data", "more.data", "more.data.desc"]];
  return h("main", {},
    h("h1", {}, t("more.title", lang)),
    ...items.map(([href, k, d]) => link(href, "card link", h("h3", {}, t(k, lang)), h("p", { class: "muted" }, t(d, lang)))),
    h("h2", {}, t("more.display", lang)),
    h("div", { class: "card" }, h("h3", {}, t("more.language", lang)),
      h("div", { class: "seg" }, ...(Object.keys(LOCALES) as Locale[]).map((c) => seg(LOCALES[c].endonym, prefs.lang === c, () => { prefs.lang = c; applyPrefs(); rerender(); })))),
    h("div", { class: "card" }, h("h3", {}, t("more.theme", lang)),
      h("div", { class: "seg" }, ...(["auto", "light", "dark"] as const).map((c) => seg(t(`more.theme.${c}` as Key, lang), prefs.theme === c, () => { prefs.theme = c; applyPrefs(); rerender(); })))),
    h("div", { class: "card" }, h("h3", {}, t("more.textsize", lang)),
      h("div", { class: "seg" }, ...[100, 125, 150, 200].map((c) => seg(`${num(c, lang)}%`, prefs.scale === c, () => { prefs.scale = c; applyPrefs(); rerender(); })))),
    h("h2", {}, t("more.modules", lang)),
    ...MODULES.filter((m) => m.tab === "more" && m.id !== "M22").map((m) => moduleCard(m, lang)),
    disclaimers(lang, ["noGuarantee", "advice"]));
}

export function status(): HTMLElement {
  const lang = L();
  return h("main", {},
    link("#/more", "crumb", `← ${t("more.title", lang)}`),
    h("h1", {}, t("cap.title", lang)),
    h("p", { class: "sub" }, t("cap.intro", lang)),
    h("div", { class: "tags" }, ...CAP_STATUSES.map((s) => capTag(s, lang))),
    ...MODULES.map((m) => moduleCard(m, lang)),
    disclaimers(lang));
}

export function fieldsGuide(): HTMLElement {
  const lang = L();
  return h("main", {},
    link("#/more", "crumb", `← ${t("more.title", lang)}`),
    h("h1", {}, t("fields.title", lang)),
    h("p", { class: "sub" }, t("fields.count", lang, { n: num(FIELDS.length, lang), v: num(CATALOG_VERSION, lang) })),
    ...ENTITIES.filter((e) => FIELDS.some((f) => f.entity === e.id)).flatMap((e) => [
      h("h2", {}, tb(e.name, lang)),
      ...FIELDS.filter((f) => f.entity === e.id).map((f) => h("div", { class: "card", "data-field-card": f.id },
        h("h3", {}, tb(f.label, lang)),
        h("div", { class: "tags" }, h("span", { class: "tag" }, t(`privacy.${f.privacy}` as Key, lang)), h("span", { class: "tag" }, valueEl(t(`label.${semanticLabel(f)}` as Key, lang), semanticLabel(f), lang))),
        fieldHelp(f, lang))),
    ]),
    disclaimers(lang));
}

export function safety(): HTMLElement {
  const lang = L();
  return h("main", {},
    link("#/more", "crumb", `← ${t("more.title", lang)}`),
    h("h1", {}, t("safety.title", lang)),
    h("div", { class: "card" }, h("p", {}, t("safety.never", lang))),
    h("div", { class: "card" }, h("p", {}, t("safety.demo", lang))),
    h("div", { class: "card" }, h("p", {}, t("safety.deen", lang))),
    disclaimers(lang, ["noGuarantee", "advice", "noFatwa"]));
}

export function dataScreen(): HTMLElement {
  const lang = L();
  return h("main", {},
    link("#/more", "crumb", `← ${t("more.title", lang)}`),
    h("h1", {}, t("data.title", lang)),
    h("div", { class: "card", "data-ns": "real" }, h("h3", {}, t("data.real", lang)), h("p", {}, t("data.real.count", lang, { n: num(store.real.list().length, lang) })), h("p", { class: "muted" }, t("data.real.locked", lang))),
    h("div", { class: "card", "data-ns": "demo" }, h("h3", {}, t("data.demo", lang), " ", demoBadge(lang)), h("p", {}, t("data.demo.count", lang, { n: num(store.demo.list().length, lang) }))),
    h("p", { class: "muted" }, t("data.nopromote", lang)),
    h("button", { class: "btn ghost", type: "button", onclick: () => { store.demo.clear(); rerender(); } }, t("data.clearDemo", lang)),
    h("h2", {}, t("backup.title", lang)),
    h("p", { class: "muted" }, t("backup.note", lang)),
    h("button", { class: "btn", type: "button", "data-act": "backup", onclick: async () => {
      const b = await createBackup(new StoreRepo(store), "demo");
      const a = h("a", { href: URL.createObjectURL(new Blob([JSON.stringify(b)], { type: "application/json" })), download: `tm-demo-backup-${b.createdAt.slice(0, 10)}.json` });
      document.body.append(a); a.click(); a.remove();
    } }, t("backup.save", lang)),
    h("label", { class: "btn ghost", style: "cursor:pointer" }, t("backup.restore", lang),
      h("input", { type: "file", accept: "application/json,.json", "data-act": "restore", style: "display:none", onchange: async (e: Event) => {
        const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
        const out = document.getElementById("backup-msg")!;
        try { const n = await restoreBackup(new StoreRepo(store), await f.text()); out.className = "ok-msg"; out.textContent = t("backup.ok", lang, { n: num(n, lang) }); }
        catch (err) { out.className = "err"; out.textContent = t("backup.bad", lang, { why: (err as Error).message }); }
      } })),
    h("p", { id: "backup-msg", role: "status" }),
    disclaimers(lang));
}

export function glossary(): HTMLElement {
  const lang = L();
  return h("main", {},
    link("#/more", "crumb", `← ${t("more.title", lang)}`),
    h("h1", {}, t("glossary.title", lang)),
    h("p", { class: "sub" }, t("glossary.unreviewed", lang)),
    ...GLOSSARY.map((g) => h("div", { class: "card", "data-term": g.id },
      h("div", { class: "row" }, h("h3", {}, tb(g.term, lang)), h("span", { class: "tag warn" }, t("glossary.tag", lang))),
      h("p", {}, tb(g.meaning, lang)))),
    disclaimers(lang, ["noFatwa"]));
}

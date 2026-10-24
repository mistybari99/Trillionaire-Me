import { h } from "./dom";
import { t, tb } from "../i18n/t";
import type { Key } from "../i18n/packs";
import { LOCALES, type Locale } from "../i18n/registry";
import { applyPrefs, prefs, store, type PlanMode } from "./state";
import { demoBadge, disclaimers, fieldHelp, num, valueEl } from "./components";
import { STAGES, DEMO_DATE, DEMO_TASKS } from "../demo/seed";
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
import { schedule, todaysActions } from "../core/planner";
import { buildPlanInput, capacityState, fmtClock, freeWindow } from "../core/planInputs";
import { STAGE_CODES, StageError, conditions, currentIndex, passStage, stageStates, type StageCode } from "../core/stages";
import { netWorth, monthlyCashFlow, type Calc } from "../core/finance";
import { financeFrom } from "../core/financeInputs";
import { research, safeQuery } from "../core/research";
import { wikipedia } from "../adapters/wikipedia";
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
  const states = stageStates(stageData().passed);
  STAGES.forEach((g, i) => {
    const st = states[i]!;
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


// ---- plan (G3 core wired to the UI) ----
function currentPlan() {
  const a = loadAnswers(); const recs = store.demo.list();
  const input = buildPlanInput(a, recs, prefs.mode, new Date().getDay());
  const titles = new Map(recs.filter((r) => r.entity === "task").map((r) => [r.id, String((r.values["task.title"] as { value?: unknown })?.value ?? "")]));
  return { a, recs, input, plan: schedule(input), state: capacityState(a), titles, hasTasks: titles.size > 0 };
}
const weekday = (d: number, lang: Locale) => new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-US", { weekday: "long" }).format(new Date(2023, 0, 1 + d));

export function planScreen(): HTMLElement {
  const lang = L(); const cp = currentPlan();
  const w = freeWindow(cp.a);
  const free = cp.state === "ok"
    ? valueEl(t("plan.hours", lang, { h: num(Number((cp.a["constraint.weekly_free_hours"] as { value: number }).value), lang), from: fmtClock(w!.from), to: fmtClock(w!.to) }), "DEMO", lang)
    : h("span", {}, t(cp.state === "need_hours" ? "plan.need_hours" : "plan.need_window", lang), " ", link("#/diary/intake/4", "crumb", t("plan.setup", lang)));
  const seg = (m: PlanMode) => h("button", { type: "button", "data-mode": m, "aria-pressed": String(prefs.mode === m), onclick: () => { prefs.mode = m; rerender(); } }, t(`plan.mode.${m}` as Key, lang));
  const title = h("input", { id: "pt-title", type: "text", maxlength: "120", autocomplete: "off" });
  const mins = h("input", { id: "pt-min", type: "text", inputmode: "numeric" });
  const prio = h("select", { id: "pt-prio" }, ...fieldById("task.priority")!.options!.map((o) => h("option", { value: o.code, ...(o.code === "normal" ? { selected: true } : {}) }, tb(o.label, lang))));
  const err = h("p", { class: "err", role: "alert" });
  const form = h("form", { novalidate: true, "data-form": "task" },
    h("label", { for: "pt-title" }, t("plan.task.title", lang)), title,
    h("label", { for: "pt-min" }, t("plan.task.minutes", lang)), mins,
    h("label", { for: "pt-prio" }, t("plan.task.priority", lang)), prio, err,
    h("button", { class: "btn", type: "submit" }, t("plan.task.save", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault(); err.textContent = "";
    const name = title.value.trim(); if (!name) return;
    if (!checkFreeText(name).ok) { err.textContent = t("intake.secretRejected", lang); return; }
    const raw = mins.value.trim().replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6)); let m: FieldValue;
    if (raw === "") m = { state: "later" };
    else { const n = Number(raw); if (!Number.isFinite(n) || n <= 0 || n > 1440) { err.textContent = t("intake.invalidNumber", lang); return; } m = { state: "value", value: Math.round(n), label: "DEMO" }; }
    const id = `task-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    store.demo.put({ id, entity: "task", ns: "demo", ownerId: "demo-user", schemaVersion: 1, createdAt: new Date().toISOString(),
      values: { "task.title": { state: "value", value: name, label: "DEMO" }, "task.minutes": m, "task.priority": { state: "value", value: prio.value, label: "DEMO" } } });
    rerender();
  });
  const taskRows = cp.recs.filter((r) => r.entity === "task").sort((a, b) => a.id.localeCompare(b.id)).map((r) => {
    const mv = r.values["task.minutes"];
    return h("div", { class: "card", "data-task": r.id }, h("div", { class: "row" },
      h("div", {}, h("h3", {}, cp.titles.get(r.id) ?? ""), h("p", { class: "muted" }, mv && mv.state === "value" ? valueEl(t("task.minutes", lang, { n: num(Number(mv.value), lang) }), "DEMO", lang) : t("plan.task.minutes.later", lang))),
      h("button", { class: "btn ghost", type: "button", style: "width:auto;margin:0;min-height:44px", onclick: () => { store.demo.delete(r.id); rerender(); } }, t("plan.task.remove", lang))));
  });
  const byDay = (d: number) => cp.plan.placements.filter((p) => p.day === d).sort((a, b) => a.start - b.start);
  const week = [0, 1, 2, 3, 4, 5, 6].map((i) => (new Date().getDay() + i) % 7).filter((d) => byDay(d).length).map((d) => h("div", { class: "card", "data-day": String(d) }, h("h3", {}, weekday(d, lang)),
    ...byDay(d).map((p) => h("p", { "data-placement": p.taskId }, `${fmtClock(p.start)}–${fmtClock(p.end)} · ${cp.titles.get(p.taskId) ?? ""}`))));
  return h("main", {},
    link("#/diary", "crumb", `← ${t("diary.title", lang)}`),
    h("h1", {}, t("plan.title", lang)), h("p", { class: "sub" }, t("plan.intro", lang)),
    h("div", { class: "card", "data-capacity": cp.state }, h("h3", {}, t("plan.free", lang)), h("p", {}, free)),
    h("h2", {}, t("plan.mode", lang)), h("div", { class: "seg", role: "group" }, seg("normal"), seg("minimum_week"), seg("pause")),
    prefs.mode !== "normal" ? h("p", { class: "muted" }, t(`plan.mode.${prefs.mode}.desc` as Key, lang)) : null,
    h("h2", {}, t("plan.add", lang)), form,
    cp.hasTasks ? h("div", {}, ...taskRows) : h("p", { class: "muted" }, t("plan.task.empty", lang)),
    h("h2", {}, t("plan.week", lang)),
    week.length ? h("div", {}, ...week, h("p", { class: "muted" }, t("plan.used", lang, { m: num(cp.plan.usedMinutes, lang), c: num(cp.input.weeklyFreeMinutes ?? 0, lang) }))) : h("p", { class: "muted" }, t("plan.nothing", lang)),
    cp.plan.deferred.length ? h("div", {}, h("h3", {}, t("plan.later", lang)), ...cp.plan.deferred.map((d) => h("p", { class: "muted", "data-deferred": d.reason }, `${cp.titles.get(d.taskId) ?? ""} — ${t(`plan.why.${d.reason}` as Key, lang)}`))) : null,
    disclaimers(lang));
}


// ---- money (finance maths wired to the UI) ----
export function moneyScreen(): HTMLElement {
  const lang = L(); const recs = store.demo.list(); const fv = financeFrom(recs);
  const sel = (id: string, f: string) => h("select", { id }, ...fieldById(f)!.options!.map((o) => h("option", { value: o.code }, tb(o.label, lang))));
  const kind = sel("mf-kind", "finance.kind"), scope = sel("mf-scope", "finance.scope"), period = sel("mf-period", "finance.period");
  const name = h("input", { id: "mf-name", type: "text", maxlength: "80", autocomplete: "off" });
  const amount = h("input", { id: "mf-amount", type: "text", inputmode: "decimal" });
  const unk = h("select", { id: "mf-state", "aria-label": t("intake.valueFor", lang) }, h("option", { value: "value" }, t("intake.valueFor", lang)), ...(["unknown", "later", "prefer_not"] as const).map((u) => h("option", { value: u }, t(`unknown.${u}` as Key, lang))));
  const err = h("p", { class: "err", role: "alert" });
  const form = h("form", { novalidate: true, "data-form": "money" },
    h("label", { for: "mf-kind" }, t("money.kind", lang)), kind, h("label", { for: "mf-scope" }, t("money.scope", lang)), scope,
    h("label", { for: "mf-name" }, t("money.name", lang)), name, h("p", { class: "muted" }, t("money.nameHint", lang)),
    h("label", { for: "mf-amount" }, t("money.amount", lang)), amount, unk,
    h("label", { for: "mf-period" }, t("money.period", lang)), period, err,
    h("button", { class: "btn", type: "submit" }, t("money.save", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault(); err.textContent = "";
    const nm = name.value.trim(); if (!nm) return;
    if (!checkFreeText(nm).ok) { err.textContent = t("intake.secretRejected", lang); return; }
    let amt: FieldValue;
    if (unk.value !== "value") amt = { state: unk.value as UnknownState };
    else {
      const raw = amount.value.trim().replace(/,/g, "").replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6));
      if (raw === "") amt = { state: "unknown" };
      else { const n = Number(raw); if (!Number.isFinite(n) || n < 0) { err.textContent = t("intake.invalidNumber", lang); return; } amt = { state: "value", value: n, label: "DEMO" }; }
    }
    const d = (x: string): FieldValue => ({ state: "value", value: x, label: "DEMO" });
    const id = `fin-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    store.demo.put({ id, entity: "finance_item", ns: "demo", ownerId: "demo-user", schemaVersion: 1, createdAt: new Date().toISOString(),
      values: { "finance.kind": d(kind.value), "finance.scope": d(scope.value), "finance.label": d(nm), "finance.amount": amt, "finance.period": d(period.value) } });
    rerender();
  });
  const show = (c: Calc) => c.ok ? valueEl(t("money.bdt", lang, { v: new Intl.NumberFormat(lang === "bn" ? "bn-BD" : "en-US").format(c.value) }), "INFERENCE", lang) : h("span", { class: "muted", "data-unknown": "1" }, t("money.unknown", lang, { n: num(c.missing, lang) }));
  // nothing entered is "nothing yet", not a computed 0
  const has = (sc: "personal" | "business", kinds: string[]) => fv.items.some((i) => i.scope === sc && kinds.includes(i.kind));
  const sum = (sc: "personal" | "business") => h("div", { class: "card", "data-scope": sc }, h("h3", {}, t(`money.${sc}` as Key, lang)),
    h("p", {}, t("money.networth", lang), ": ", has(sc, ["asset", "liability"]) ? show(netWorth(fv.items, sc)) : h("span", { class: "muted", "data-none": "1" }, t("money.none", lang))),
    h("p", {}, t("money.cashflow", lang), ": ", has(sc, ["income", "expense"]) ? show(monthlyCashFlow(fv.items, sc)) : h("span", { class: "muted", "data-none": "1" }, t("money.none", lang))));
  const rows = recs.filter((r) => r.entity === "finance_item").sort((a, b) => a.id.localeCompare(b.id)).map((r) => {
    const a = r.values["finance.amount"]!;
    return h("div", { class: "card", "data-fin": r.id }, h("div", { class: "row" }, h("div", {},
      h("h3", {}, fv.labels.get(r.id) ?? String((r.values["finance.label"] as { value?: unknown })?.value ?? "")),
      h("p", { class: "muted" }, a.state === "value" ? valueEl(t("money.bdt", lang, { v: new Intl.NumberFormat(lang === "bn" ? "bn-BD" : "en-US").format(Number(a.value)) }), "DEMO", lang) : t(`unknown.${a.state}` as Key, lang))),
      h("button", { class: "btn ghost", type: "button", style: "width:auto;margin:0;min-height:44px", onclick: () => { store.demo.delete(r.id); rerender(); } }, t("money.remove", lang))));
  });
  return h("main", {},
    link("#/diary", "crumb", `← ${t("diary.title", lang)}`), h("h1", {}, t("money.title", lang)), h("p", { class: "sub" }, t("money.intro", lang)),
    h("h2", {}, t("money.summary", lang)), sum("personal"), sum("business"),
    fv.notMonthly ? h("p", { class: "muted" }, t("money.notMonthly", lang, { n: num(fv.notMonthly, lang) })) : null,
    h("h2", {}, t("money.add", lang)), form,
    rows.length ? h("div", {}, ...rows) : h("p", { class: "muted" }, t("money.empty", lang)),
    h("p", { class: "muted" }, t("money.note", lang)), disclaimers(lang));
}


// ---- stages + journey log ----
function stageData() {
  const recs = store.demo.list();
  const passed = recs.filter((r) => r.entity === "stage_pass").map((r) => String((r.values["stage_pass.stage_code"] as { value?: unknown })?.value ?? ""));
  const goalCount = recs.filter((r) => r.entity === "goal" && r.values["goal.title"]?.state === "value").length;
  return { recs, passed, ctx: { answers: loadAnswers(), goalCount } };
}
const lastProgress = (recs: TMRecord[]) => recs.filter((r) => r.entity === "journey_log").map((r) => Number((r.values["stage_pass.progress_pct"] as { value?: unknown })?.value ?? 0)).pop() ?? 0;

function stagePanel(lang: Locale): HTMLElement {
  const sd = stageData(); const cur = currentIndex(sd.passed);
  if (cur >= STAGE_CODES.length) return h("div", { class: "card" }, h("p", {}, t("stage.alldone", lang)));
  const code = STAGE_CODES[cur] as StageCode; const cs = conditions(sd.ctx, code);
  const manual = !cs.some((c) => c.auto);
  const ev = h("textarea", { id: "st-evidence", rows: "3", maxlength: "300" }) as HTMLTextAreaElement;
  const err = h("p", { class: "err", role: "alert" });
  const autoMet = cs.filter((c) => c.auto).every((c) => c.met);
  const btn = h("button", { class: "btn", type: "button", "data-act": "pass-stage", ...(autoMet ? {} : { disabled: true }) }, t("stage.pass", lang));
  btn.addEventListener("click", () => {
    err.textContent = "";
    if (!checkFreeText(ev.value).ok) { err.textContent = t("intake.secretRejected", lang); return; }
    try {
      const sd2 = stageData(); const rec = passStage(sd2.ctx, sd2.passed, code, ev.value);
      const before = lastProgress(sd2.recs); const d = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" });
      const base = { entity: "", ns: "demo" as const, ownerId: "demo-user", schemaVersion: 1, createdAt: rec.at };
      store.demo.put({ ...base, id: `stagepass-${code}`, entity: "stage_pass", values: { "stage_pass.stage_code": d(code), "stage_pass.evidence": d(rec.evidence || "—"), "stage_pass.progress_pct": d(rec.progressPct) } });
      store.demo.put({ ...base, id: `log-${Date.now().toString(36)}`, entity: "journey_log", values: { "journey_log.entry": d(t("log.entry", lang, { code, before: num(before, lang), after: num(rec.progressPct, lang) })), "stage_pass.progress_pct": d(rec.progressPct) } });
      sessionStorage.setItem("tm:passed", code); rerender();
    } catch (e) { err.textContent = e instanceof StageError ? "" : t("intake.invalidNumber", lang); }
  });
  const left = cs.filter((c) => !c.met && c.auto).length > 0;
  return h("div", { class: "card", "data-stage-panel": code },
    h("h3", {}, `${t("stage.currentLabel", lang)}: ${code} · ${tb(STAGES[cur]!.name, lang)}`),
    h("p", { class: "muted" }, t("stage.conditions", lang)),
    h("ul", { style: "padding-inline-start:20px" }, ...cs.map((c) => h("li", { "data-cond": c.id, "data-met": String(c.met) }, `${tb(c.text, lang)} — `, h("b", {}, c.auto ? t(c.met ? "stage.met" : "stage.open", lang) : ""))).map((li) => li)),
    left ? h("p", { class: "muted" }, t("stage.leftNote", lang)) : null,
    manual ? h("div", {}, h("label", { for: "st-evidence" }, t("stage.evidence", lang)), ev) : null, err, btn);
}

function passedBanner(lang: Locale): HTMLElement | null {
  let code: string | null = null;
  try { code = sessionStorage.getItem("tm:passed"); sessionStorage.removeItem("tm:passed"); } catch { /* ignore */ }
  return code ? h("div", { class: "card", role: "status", "data-passed": code }, h("p", { class: "ok-msg" }, t("stage.passedMsg", lang, { code }))) : null;
}

export function journeyLog(): HTMLElement {
  const lang = L(); const logs = store.demo.list().filter((r) => r.entity === "journey_log").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return h("main", {}, link("#/journey", "crumb", `← ${t("journey.title", lang)}`), h("h1", {}, t("log.title", lang)),
    logs.length ? h("div", {}, ...logs.map((r) => h("div", { class: "card", "data-log": r.id }, h("p", { class: "muted" }, valueEl(r.createdAt.slice(0, 10), "DEMO", lang)), h("p", {}, String((r.values["journey_log.entry"] as { value?: unknown })?.value ?? ""))))) : h("p", { class: "muted" }, t("log.empty", lang)),
    disclaimers(lang));
}

// ---- screens ----
function todayFromPlan(cp: ReturnType<typeof currentPlan>, lang: Locale): HTMLElement[] {
  const acts = todaysActions(cp.plan, new Date().getDay());
  if (!acts.length) return [h("p", { class: "muted", "data-today": "none" }, t("home.today.none", lang), " ", link("#/diary/plan", "crumb", t("home.today.open", lang)))];
  return acts.map((p, i) => h("div", { class: "task", "data-placement": p.taskId }, h("b", {}, num(i + 1, lang)),
    h("div", {}, cp.titles.get(p.taskId) ?? "", h("p", {}, valueEl(`${fmtClock(p.start)}–${fmtClock(p.end)}`, "DEMO", lang)))));
}

export function today(): HTMLElement {
  const lang = L(); const cp = currentPlan();
  const curStage = Math.min(currentIndex(stageData().passed), STAGES.length - 1);
  const stage = STAGES[curStage]!;
  const nxt = nextStep(loadAnswers());
  const rungs = h("ul", { class: "rungs", role: "img", "aria-label": t("home.rungs", lang, { done: num(curStage, lang), total: num(STAGES.length, lang), now: num(curStage + 1, lang) }) },
    ...STAGES.map((_, i) => h("li", { class: i < curStage ? "done" : i === curStage ? "now" : "" })));
  return h("main", {},
    h("p", { class: "muted" }, valueEl(tb(DEMO_DATE, lang), "DEMO", lang)),
    h("h1", {}, t("home.title", lang)),
    h("p", { class: "sub" }, t("home.step", lang), " — ", valueEl(t("stage.progress", lang, { now: num(curStage + 1, lang), total: num(STAGES.length, lang) }), "DEMO", lang)),
    h("section", { class: "stage", "aria-label": t("home.stage", lang) },
      h("small", {}, `${t("home.stage", lang)} · ${tb(stage.name, lang)}`),
      h("div", { class: "n" }, num(curStage + 1, lang), h("span", { style: "font-size:22px;color:var(--muted)" }, ` / ${num(STAGES.length, lang)}`)),
      rungs),
    h("h2", {}, t("home.tasks", lang)),
    ...(cp.hasTasks ? todayFromPlan(cp, lang) : DEMO_TASKS.slice(0, 3).map((k, i) => h("div", { class: "task" }, h("b", {}, num(i + 1, lang)),
      h("div", {}, tb(k.title, lang), h("p", {}, valueEl(t("task.minutes", lang, { n: num(k.minutes, lang) }), "DEMO", lang), " · ", tb(k.hint, lang)))))),
    link("#/diary/intake", "cta", t("home.start", lang)),
    nxt.field ? h("p", { class: "muted", style: "margin-top:12px" }, t("home.next", lang, { field: tb(nxt.field.label, lang) })) : null,
    disclaimers(lang));
}

export function journey(): HTMLElement {
  const lang = L();
  return h("main", {},
    h("h1", {}, t("journey.title", lang)),
    passedBanner(lang),
    stagePanel(lang),
    link("#/journey/log", "btn ghost", t("log.link", lang)),
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
    link("#/diary/plan", "btn ghost", t("plan.title", lang)),
    link("#/diary/money", "btn ghost", t("money.title", lang)),
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

const SUGGESTABLE = new Set(["interest.topic", "skill.name", "strength.name", "value.name", "goal.title"]);

/** Inline option cards: nothing is sent until the user taps the search button (consent). */
function suggestPanel(f: FieldDef, lang: Locale, getInput: () => HTMLInputElement): HTMLElement {
  const box = h("div", { class: "suggest", "data-suggest": f.id });
  const out = h("div", { role: "status" });
  const go = h("button", { class: "btn ghost", type: "button", "data-act": "suggest-go" }, t("suggest.go", lang));
  go.addEventListener("click", async () => {
    const input = getInput(); const q = input.value.trim();
    if (!q) { out.replaceChildren(h("p", { class: "err" }, t("suggest.empty", lang))); return; }
    const safe = safeQuery(q);
    if (!safe) { out.replaceChildren(h("p", { class: "err" }, t("suggest.secret", lang))); return; }
    out.replaceChildren(h("p", { class: "muted" }, t("suggest.loading", lang)));
    const r = await research(safe, true, { provider: wikipedia(lang), online: () => navigator.onLine });
    const cards = r.options.map((o) => h("div", { class: "card", "data-option": o.id },
      h("h3", {}, o.title), h("p", { class: "muted" }, o.snippet),
      h("p", { class: "muted" }, t("suggest.source", lang, { s: o.sourceName, d: o.fetchedAt.slice(0, 10) })),
      h("button", { class: "btn", type: "button", onclick: () => { input.value = o.title; out.replaceChildren(); input.focus(); } }, t("suggest.use", lang))));
    const note = r.status === "too_few" ? "suggest.none" : r.status === "offline" ? "suggest.offline" : r.status === "error" ? "suggest.error" : null;
    out.replaceChildren(...cards, ...(note ? [h("p", { class: "muted" }, t(note, lang))] : []),
      h("button", { class: "btn ghost", type: "button", onclick: () => { out.replaceChildren(); getInput().focus(); } }, t("suggest.own", lang)));
  });
  box.append(h("p", { class: "muted" }, t("suggest.consent", lang)), go, out);
  return h("details", { class: "help" }, h("summary", {}, t("suggest.btn", lang)), box);
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
      ip.el, err, SUGGESTABLE.has(f.id) ? suggestPanel(f, lang, () => document.getElementById(`f-${f.id}`) as HTMLInputElement) : null, fieldHelp(f, lang)));
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

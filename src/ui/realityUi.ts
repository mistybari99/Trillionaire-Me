// M12 reality-changed loop screens: write the event, see what it may touch, choose from up to 3 options, see old against new, approve.
// Also the plan-history sections (events, saved plan versions) and the report line. Rules only; nothing changes before the user approves.
import { h } from "./dom";
import { t, tb } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import type { Label, TMRecord } from "../core/types";
import { prefs } from "./state";
import { fieldById } from "../catalog/fields";
import { checkFreeText } from "../core/safety";
import { activeNs, allRecs, entryNs, findRec, inNs, nsTag, putMode, saveBlockedText, saveTyped, storeOf, consentOn, consentPrompt } from "./entry";
import { disclaimers, num, valueEl } from "./components";
import {
  EVENT_KINDS, MOVE_DAYS, RESUME_STEPS, applyToRecords, decidedEvent, eventRecord, eventRows, impactOf, loopLogRecord, nextVersionNumber, noImpact, optionsFor, parkedRows, planChange,
  planDiff, resumeChange, snapshotOf, unparkTask, validateEvent, versionRecord, versionRows, type DiffRow, type EventRow, type Impact, type LoopOption, type MoveDays, type PlanChange, type VersionOption,
} from "../core/realityLoop";

const L = () => prefs.lang;
const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
const link = (href: string, cls: string, ...kids: Array<Node | string>) => h("a", { href, class: cls }, ...kids);
const iso = (): string => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const ownLabel = (): Label => (activeNs() === "real" ? "FACT" : "DEMO");
const opt = (fieldId: string, code: string, lang: Locale): string => { const o = fieldById(fieldId)?.options?.find((x) => x.code === code); return o ? tb(o.label, lang) : code; };
const listText = (names: string[], lang: Locale, max = 4): string => (names.length <= max ? names.join(", ") : `${names.slice(0, max).join(", ")} ${t("rl.impact.more", lang, { n: num(names.length - max, lang) })}`);

// ---------------------------------------------------------------- diff and impact views

function diffText(r: DiffRow, lang: Locale): string {
  const state = (x: string | null) => (x === null ? t("rl.state.none", lang) : t(`rl.state.${x}` as Key, lang));
  if (r.kind === "mode") return t("rl.diff.mode", lang, { a: t(`plan.mode.${r.from}` as Key, lang), b: t(`plan.mode.${r.to}` as Key, lang) });
  if (r.kind === "goal") {
    if (r.field === "date") return t("rl.diff.goal.date", lang, { t: r.title, a: r.from ?? t("rl.date.none", lang), b: r.to ?? t("rl.date.none", lang) });
    if (r.field === "status") return t("rl.diff.goal.status", lang, { t: r.title, a: opt("goal.status", r.from ?? "", lang), b: opt("goal.status", r.to ?? "", lang) });
    return t("rl.diff.goal.listed", lang, { t: r.title, a: r.from ? t("rl.state.listed", lang) : t("rl.state.none", lang), b: r.to ? t("rl.state.listed", lang) : t("rl.state.none", lang) });
  }
  return t("rl.diff.task", lang, { t: r.title || "—", a: state(r.from), b: state(r.to) });
}
export function diffList(rows: DiffRow[], lang: Locale): HTMLElement {
  return rows.length
    ? h("ul", { class: "plain", "data-diff": String(rows.length) }, ...rows.map((r) => h("li", { "data-diff-row": `${r.kind}:${r.field}` }, diffText(r, lang))))
    : h("p", { class: "muted", "data-diff": "0" }, t("rl.diff.none", lang));
}

function impactView(imp: Impact, lang: Locale): HTMLElement {
  const line = (id: string, text: string) => h("li", { "data-impact": id }, valueEl(text, "INFERENCE", lang));
  const items: HTMLElement[] = [];
  if (imp.goals.length) items.push(line("goals", t("rl.impact.goals", lang, { list: listText(imp.goals.map((g) => g.title), lang) })));
  if (imp.tasks.length) items.push(line("tasks", t("rl.impact.tasks", lang, { n: num(imp.tasks.length, lang), d: num(imp.tasks.filter((x) => x.viaDependency).length, lang) })));
  if (imp.dates.length) items.push(line("dates", t("rl.impact.dates", lang, { list: listText(imp.dates.map((d) => `${d.title} (${d.date})`), lang) })));
  const undated = imp.goals.length - imp.dates.length;
  if (undated > 0) items.push(h("li", { class: "muted", "data-impact": "undated" }, t("rl.impact.undated", lang, { n: num(undated, lang) })));
  if (imp.money && imp.money.lines) items.push(line("money", t("rl.impact.money", lang, { n: num(imp.money.lines, lang), v: imp.money.ventures.length ? t("rl.impact.ventures", lang, { list: listText(imp.money.ventures.map((v) => v.name), lang) }) : "" })));
  if (imp.risks.length) items.push(line("risks", t("rl.impact.risks", lang, { list: listText(imp.risks.map((r) => r.text), lang) })));
  return h("div", { "data-impact-box": imp.kind },
    h("h3", { class: "card-h" }, t("rl.impact.title", lang)),
    items.length ? h("ul", { class: "plain" }, ...items) : h("p", { class: "muted", "data-impact": "none" }, t("rl.impact.none", lang)),
    h("p", { class: "muted" }, t("rl.assume.title", lang), ": ", imp.assumptions.map((a) => t(`rl.assume.${a}` as Key, lang)).join("; "), "."),
    imp.markedNotTrue ? h("p", { class: "muted", "data-impact": "marked" }, t("rl.assume.marked", lang, { n: num(imp.markedNotTrue, lang) })) : null,
    h("p", { class: "muted" }, t("rl.impact.rule", lang)));
}

// ---------------------------------------------------------------- saving (one path for every approved change)

/** Saves a change: the records, the plan mode, a plan version (old and new copy), the decision-log line and the event state. Returns the version number, or null when real mode has no consent tick. */
export function commitChange(p: { ch: PlanChange; option: VersionOption; event: TMRecord | null; recs: TMRecord[]; lang: Locale }): number | null {
  const ns = entryNs(); if (!ns) return null;
  const { ch, option, event, recs, lang } = p;
  const mode = prefs.mode;
  const before = snapshotOf(recs, mode);
  const after = snapshotOf(applyToRecords(recs, ch), ch.mode ?? mode);
  const number = nextVersionNumber(recs);
  const now = new Date(); const day = iso(); const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  for (const r of ch.puts) storeOf(r).put(inNs(r, r.ns));
  if (ch.mode) prefs.mode = ch.mode;
  putMode(versionRecord({ id: `pv-${suffix}`, number, option, on: day, eventId: event?.id ?? null, before, after, createdAt: now.toISOString() }));
  const optName = t(`rl.opt.${option}` as Key, lang);
  putMode(loopLogRecord({ id: `rlog-${suffix}`, eventId: event?.id ?? null, createdAt: now.toISOString(), text: t("rl.logged", lang, { n: num(number, lang), opt: optName, date: day }) }));
  if (event) storeOf(event).put(inNs(decidedEvent(event, option === "resume" ? null : option), event.ns));
  return number;
}

function noteOnly(event: TMRecord, lang: Locale): boolean {
  const ns = entryNs(); if (!ns) return false;
  storeOf(event).put(inNs(decidedEvent(event, null), event.ns));
  putMode(loopLogRecord({ id: `rlog-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, eventId: event.id, createdAt: new Date().toISOString(), text: t("rl.loggedNote", lang, { date: iso() }) }));
  return true;
}

// ---------------------------------------------------------------- one waiting event: impact, options, preview, approval

function optionBlock(ev: EventRow, evRec: TMRecord, imp: Impact, option: LoopOption, lang: Locale): HTMLElement {
  const box = h("section", { class: "card", "data-option": option, "aria-label": t(`rl.opt.${option}` as Key, lang) });
  let days: MoveDays = 14;
  const msg = h("p", { class: "err", role: "alert" });
  const draw = () => {
    const recs = allRecs();
    const ch = planChange(recs, imp, option, { today: iso(), days, mode: prefs.mode });
    const diff = planDiff(snapshotOf(recs, prefs.mode), snapshotOf(applyToRecords(recs, ch), ch.mode ?? prefs.mode));
    const tick = h("input", { type: "checkbox", id: `rl-tick-${ev.id}-${option}` });
    const approve = h("button", { class: "btn", type: "button", "data-act": "approve", "data-option": option, style: "width:auto;margin:6px 0 0;min-height:44px" }, t("rl.approve", lang));
    approve.addEventListener("click", () => {
      msg.textContent = "";
      if (!consentOn()) { msg.textContent = saveBlockedText(lang); return; }
      if (ch.big && !(tick as HTMLInputElement).checked) { msg.textContent = t("rl.big.need", lang); return; }
      const fresh = allRecs(); const freshEv = findRec(ev.id);
      if (!freshEv) return;
      const real = planChange(fresh, impactOf(fresh, ev), option, { today: iso(), days, mode: prefs.mode });
      const n = commitChange({ ch: real, option, event: freshEv, recs: fresh, lang });
      if (n === null) { msg.textContent = saveBlockedText(lang); return; }
      sessionStorage.setItem("tm:rl:done", String(n)); rerender();
    });
    const daySel = option === "move_dates" ? h("div", {}, h("label", { for: `rl-days-${ev.id}` }, t("rl.days", lang)),
      h("select", { id: `rl-days-${ev.id}` }, ...MOVE_DAYS.map((d) => h("option", { value: String(d), ...(d === days ? { selected: true } : {}) }, t(`rl.days.${d}` as Key, lang))))) : null;
    daySel?.querySelector("select")?.addEventListener("change", (e) => { days = Number((e.target as HTMLSelectElement).value) as MoveDays; draw(); });
    box.replaceChildren(...[
      h("h3", { class: "card-h" }, t(`rl.opt.${option}` as Key, lang)),
      h("p", { class: "muted" }, t(`rl.opt.${option}.why` as Key, lang)),
      daySel,
      h("p", {}, h("strong", {}, t("rl.diff.title", lang))), diffList(diff, lang),
      ch.big ? h("div", {}, tick, " ", h("label", { for: `rl-tick-${ev.id}-${option}` }, t("rl.big.tick", lang))) : null,
      msg, approve].filter((x): x is HTMLElement => !!x));
  };
  draw();
  return box;
}
function waitingCard(ev: EventRow, lang: Locale): HTMLElement {
  const recs = allRecs(); const evRec = recs.find((r) => r.id === ev.id)!;
  const imp = impactOf(recs, ev);
  const opts = optionsFor(imp, prefs.mode);
  const goalTitle = ev.goalId ? imp.goals.find((g) => g.id === ev.goalId)?.title ?? null : null;
  const noteBtn = h("button", { class: "btn ghost", type: "button", "data-act": "note-only", style: "width:auto;margin:6px 0 0;min-height:44px" }, t("rl.noteOnly", lang));
  const msg = h("p", { class: "err", role: "alert" });
  noteBtn.addEventListener("click", () => { if (!noteOnly(evRec, lang)) { msg.textContent = saveBlockedText(lang); return; } rerender(); });
  return h("div", { class: "card", "data-event": ev.id, "data-event-state": "open" },
    nsTag(ev.ns, lang),
    h("h2", { class: "card-h" }, opt("reality_event.kind", ev.kind, lang)),
    h("p", { class: "muted" }, ev.on ? valueEl(t("rl.event.on", lang, { d: ev.on }), ownLabel(), lang) : t("rl.date.none", lang), goalTitle ? ` · ${t("rl.event.goal", lang, { t: goalTitle })}` : ""),
    ev.note ? h("p", { "data-event-note": "1" }, ev.note) : null,
    impactView(imp, lang),
    opts.length
      ? h("div", { "data-options": String(opts.length) }, h("h3", { class: "card-h" }, t("rl.options.title", lang)), h("p", { class: "muted" }, t("rl.options.p", lang)), ...opts.map((o) => optionBlock(ev, evRec, imp, o, lang)))
      : h("p", { class: "muted", "data-options": "0" }, noImpact(imp) ? t("rl.options.none", lang) : t("rl.options.nochange", lang)),
    msg, noteBtn);
}

// ---------------------------------------------------------------- the page

function eventForm(lang: Locale): HTMLElement {
  const kind = h("select", { id: "rl-kind" }, h("option", { value: "" }, t("rl.kind.choose", lang)), ...EVENT_KINDS.map((k) => h("option", { value: k }, opt("reality_event.kind", k, lang))));
  const goals = allRecs().filter((r) => r.entity === "goal" && r.values["goal.title"]?.state === "value").sort((a, b) => a.id.localeCompare(b.id));
  const goal = goals.length ? h("select", { id: "rl-goal" }, h("option", { value: "" }, t("rl.goal.none", lang)), ...goals.map((g) => h("option", { value: g.id }, String((g.values["goal.title"] as { value?: unknown }).value ?? "")))) : null;
  const date = h("input", { id: "rl-date", type: "date" });
  const note = h("input", { id: "rl-note", type: "text", maxlength: "200", autocomplete: "off" });
  const err = h("p", { class: "err", role: "alert" });
  const form = h("form", { novalidate: true, "data-form": "reality-event" }, consentOn() ? null : consentPrompt(lang),
    h("label", { for: "rl-kind" }, t("rl.kind", lang)), kind,
    ...(goal ? [h("label", { for: "rl-goal" }, t("rl.goal", lang)), goal] : []),
    h("label", { for: "rl-date" }, t("rl.date", lang)), date,
    h("label", { for: "rl-note" }, t("rl.note.label", lang)), note, err,
    h("button", { class: "btn", type: "submit" }, t("rl.check", lang)));
  form.addEventListener("submit", (e) => {
    e.preventDefault(); err.textContent = "";
    if (!checkFreeText(note.value).ok) { err.textContent = t("intake.secretRejected", lang); return; }
    const bad = validateEvent({ kind: kind.value, note: note.value, on: date.value });
    if (bad) { err.textContent = t(`rl.err.${bad}` as Key, lang); return; }
    const id = `ev-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const base = eventRecord({ id, kind: kind.value as never, note: note.value, on: date.value || iso(), goalId: (goal as HTMLSelectElement | null)?.value || null, createdAt: new Date().toISOString() });
    if (!saveTyped({ id, entity: base.entity, createdAt: base.createdAt, values: base.values, ...(base.links ? { links: base.links } : {}) })) { err.textContent = saveBlockedText(lang); return; }
    rerender();
  });
  return form;
}

function resumeCard(lang: Locale): HTMLElement | null {
  const recs = allRecs();
  const parked = parkedRows(recs);
  if (!parked.length && prefs.mode === "normal") return null;
  const ch = resumeChange(recs, { today: iso(), mode: prefs.mode });
  const diff = planDiff(snapshotOf(recs, prefs.mode), snapshotOf(applyToRecords(recs, ch), ch.mode ?? prefs.mode));
  const msg = h("p", { class: "err", role: "alert" });
  const btn = h("button", { class: "btn", type: "button", "data-act": "resume", style: "width:auto;margin:6px 0 0;min-height:44px" }, t("rl.resume.btn", lang));
  btn.addEventListener("click", () => {
    const fresh = allRecs(); const real = resumeChange(fresh, { today: iso(), mode: prefs.mode });
    const n = commitChange({ ch: real, option: "resume", event: null, recs: fresh, lang });
    if (n === null) { msg.textContent = saveBlockedText(lang); return; }
    sessionStorage.setItem("tm:rl:done", String(n)); rerender();
  });
  return h("section", { class: "card", "data-resume": "1", "aria-label": t("rl.resume.title", lang) },
    h("h2", { class: "card-h" }, t("rl.resume.title", lang)),
    h("p", { class: "muted" }, t("rl.resume.p", lang, { n: num(RESUME_STEPS, lang) })),
    diffList(diff, lang), msg, diff.length ? btn : null);
}

function parkedList(lang: Locale): HTMLElement {
  const rows = parkedRows(allRecs());
  return h("section", { "data-parked-list": String(rows.length) },
    h("h2", {}, t("rl.parked.title", lang)),
    rows.length ? h("ul", { class: "plain" }, ...rows.map((r) => h("li", { "data-parked": r.id }, h("strong", {}, r.title || "—"), " · ", r.since ? t("rl.parked.tag", lang, { date: r.since }) : "", " ",
      h("button", { class: "btn ghost", type: "button", "data-act": "bring-back", style: "width:auto;margin:0;min-height:44px", onclick: () => {
        const fresh = allRecs(); const rec = fresh.find((x) => x.id === r.id); if (!rec) return;
        const ch: PlanChange = { puts: [unparkTask(rec)], mode: null, itemCount: 1, big: false };
        if (commitChange({ ch, option: "resume", event: null, recs: fresh, lang }) === null) return;
        rerender();
      } }, t("rl.parked.bring", lang))))) : h("p", { class: "muted" }, t("rl.parked.none", lang)));
}

export function realityScreen(): HTMLElement {
  const lang = L(); const recs = allRecs();
  const waiting = eventRows(recs).filter((e) => e.status === "open");
  const done = sessionStorage.getItem("tm:rl:done"); if (done) sessionStorage.removeItem("tm:rl:done");
  return h("main", { class: "scr scr-reality" },
    link("#/journey", "crumb", `← ${t("journey.title", lang)}`),
    h("h1", {}, t("rl.title", lang)), h("p", { class: "sub" }, t("rl.intro", lang)),
    done ? h("p", { class: "ok-msg", role: "status", "data-saved-version": done }, t("rl.approved", lang, { n: done })) : null,
    h("h2", {}, t("rl.form.title", lang)), eventForm(lang),
    h("h2", {}, t("rl.waiting.title", lang)),
    waiting.length ? h("div", {}, ...waiting.map((e) => waitingCard(e, lang))) : h("p", { class: "muted", "data-waiting": "0" }, t("rl.waiting.none", lang)),
    resumeCard(lang),
    parkedList(lang),
    link("#/journey/history", "btn ghost", t("rl.hist.link", lang)),
    h("p", { class: "muted" }, t("rl.note", lang)), nsTag(activeNs(), lang), disclaimers(lang, ["advice"]));
}

// ---------------------------------------------------------------- plan history: events and saved versions

export function historySections(lang: Locale): HTMLElement {
  const recs = allRecs();
  const events = eventRows(recs); const versions = versionRows(recs);
  const evName = new Map(events.map((e) => [e.id, opt("reality_event.kind", e.kind, lang)] as const));
  return h("section", { "data-reality-history": "1" },
    h("h2", {}, t("rl.hist.events", lang)),
    events.length
      ? h("ul", { class: "plain", "data-events": String(events.length) }, ...events.map((e) => h("li", { "data-event-row": e.id, "data-event-state": e.status },
        h("strong", {}, opt("reality_event.kind", e.kind, lang)), " · ", e.on ?? t("rl.date.none", lang), " · ", opt("reality_event.status", e.status, lang), e.option ? ` · ${opt("reality_event.option", e.option, lang)}` : "")))
      : h("p", { class: "muted" }, t("rl.hist.noEvents", lang)),
    h("h2", {}, t("rl.hist.versions", lang)),
    versions.length
      ? h("div", { "data-versions": String(versions.length) }, ...versions.map((v) => h("details", { class: "card", "data-version": String(v.number) },
        h("summary", {}, t("rl.version", lang, { n: num(v.number, lang) }), " · ", t(`rl.opt.${v.option}` as Key, lang), " · ", v.on ?? t("rl.date.none", lang)),
        v.eventId && evName.get(v.eventId) ? h("p", { class: "muted" }, t("rl.version.for", lang, { e: evName.get(v.eventId)! })) : null,
        v.diff ? h("div", {}, h("p", {}, h("strong", {}, t("rl.diff.title", lang))), diffList(v.diff, lang)) : h("p", { class: "muted" }, t("rl.version.unreadable", lang)))))
      : h("p", { class: "muted" }, t("rl.hist.noVersions", lang)),
    link("#/journey/reality", "crumb", t("rl.link", lang)));
}

// ---------------------------------------------------------------- small cards for Today and the report

/** Today: a calm card when an event waits for a decision, or steps are parked. Nothing when there is neither. */
export function realityTodayCard(lang: Locale): HTMLElement | null {
  const recs = allRecs();
  const waiting = eventRows(recs).filter((e) => e.status === "open").length; const parked = parkedRows(recs).length;
  if (!waiting && !parked) return null;
  return h("section", { class: "card", "data-reality-today": `${waiting}:${parked}`, "aria-label": t("rl.today.title", lang) },
    h("div", { class: "row" }, h("h2", { class: "card-h" }, t("rl.today.title", lang)), nsTag(activeNs(), lang)),
    waiting ? h("p", { "data-rl-waiting": String(waiting) }, t("rl.today.waiting", lang, { n: num(waiting, lang) })) : null,
    parked ? h("p", { class: "muted", "data-rl-parked": String(parked) }, t("rl.today.parked", lang, { n: num(parked, lang) })) : null,
    link("#/journey/reality", "crumb", t("rl.today.open", lang)));
}

/** Report: how many plan versions are saved. */
export function realityReportCard(lang: Locale): HTMLElement {
  const vs = versionRows(allRecs());
  return h("section", { class: "card", "data-reality-report": String(vs.length), "aria-label": t("rl.report.title", lang) },
    h("div", { class: "row" }, h("h2", { class: "card-h" }, t("rl.report.title", lang)), nsTag(activeNs(), lang)),
    vs.length ? h("p", {}, valueEl(t("rl.report.line", lang, { n: num(vs.length, lang), d: vs[0]!.on ?? t("rl.date.none", lang) }), "INFERENCE", lang)) : h("p", { class: "muted" }, t("rl.report.none", lang)),
    link("#/journey/history", "crumb", t("rl.hist.link", lang)));
}

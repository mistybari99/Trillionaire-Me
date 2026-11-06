// M13 Deen plans and reminders page (`#/deen/plans`), the Today reminder card and the report link. The person's own entries only.
// Private by default; real mode saves only after the real-data tick. One-tap daily mark with undo (same marks as the Deen page for prayers and fasting).
// Nothing is rated or ordered, and missed days are never counted. The zakat figure uses only numbers the person types.
import { h } from "./dom";
import { t, tb, fmtNumber } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { prefs, store } from "./state";
import { activeNs, allRecs, asReal, consentOn, consentPrompt, nsTag, putMode, saveBlockedText, saveTyped } from "./entry";
import { disclaimers } from "./components";
import { fieldById } from "../catalog/fields";
import { checkFreeText } from "../core/safety";
import { dhakaNow, isoDate } from "../core/prayer";
import { prayerMarkButton } from "./prayerMarksUi";
import { setPrayerMarked, prayerMarkState } from "./prayerMarkCommand";
import { fastLogId, fastLogRecord } from "../core/fastLog";
import { NOTE_AREAS, PLAN_KINDS, PRAYER_LINKS, REPEATS, daysUntil, dueToday, isMarked, markKind, noteRows, parseNumber, planMarkId, planMarkRecord, planRows, validateNote, validatePlan, validateZakat,
  zakatFigure, zakatRow, ZAKAT_ID, type PlanRow } from "../core/deenPlans";
import type { FieldValue } from "../core/types";

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
const link = (href: string, cls: string, ...kids: Array<Node | string>) => h("a", { href, class: cls }, ...kids);
const today = (): string => isoDate(dhakaNow(Date.now()).date);
const opts = (id: string, lang: Locale, code: string) => tb(fieldById(id)!.options!.find((o) => o.code === code)!.label, lang);
const typed = (x: unknown): FieldValue => ({ state: "value", value: x, label: "FACT" });
const newId = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const secretFree = (...xs: string[]) => xs.every((x) => checkFreeText(x).ok);

/** One tap marks today; a second tap removes the mark. Prayer and fasting plans use the very same marks as the Deen page. */
export function togglePlanMark(p: PlanRow, day: string): void {
  const k = markKind(p); const ns = store[activeNs()];
  if (k.via === "prayer") {
    const namespace = p.ns;
    void setPrayerMarked({ namespace, date: day, prayer: k.prayer, desiredMarked: !prayerMarkState({ namespace, date: day, prayer: k.prayer }).marked });
    return;
  }
  const id = k.via === "fast" ? fastLogId(day) : planMarkId(p.id, day);
  if (ns.get(id)) { ns.delete(id); return; }
  const now = new Date().toISOString();
  putMode(k.via === "fast" ? fastLogRecord(day, now) : planMarkRecord(p.id, day, now));
}

const markButton = (p: PlanRow, day: string, lang: Locale, marked: boolean): HTMLElement => {
  const kind = markKind(p);
  if (kind.via === "prayer") return prayerMarkButton(kind.prayer, lang, { "data-act": "plan-mark", "data-plan": p.id });
  return h("button", { class: marked ? "btn" : "btn ghost", type: "button", "data-act": "plan-mark", "data-plan": p.id, "aria-pressed": String(marked), style: "width:auto;margin:0;min-height:44px",
    onclick: () => { togglePlanMark(p, day); rerender(); } }, marked ? t("dp.marked", lang) : t("dp.mark", lang));
};

/** Today: plans due today with a one-tap mark. Quiet; nothing when no plan is due. No count of what was missed. */
export function deenTodayCard(lang: Locale): HTMLElement | null {
  if (!consentOn()) return null;
  const day = today(); const recs = allRecs(); const due = dueToday(recs, day);
  if (!due.length) return null;
  return h("section", { class: "card", "data-deen-card": "today", "aria-label": t("dp.today.title", lang) },
    h("div", { class: "row" }, h("h2", { class: "card-h" }, t("dp.today.title", lang)), nsTag(activeNs(), lang)),
    ...due.map(({ plan, marked }) => h("div", { class: "row", "data-deen-due": plan.id },
      h("span", {}, h("strong", {}, plan.title), " ", h("span", { class: "muted" }, opts("deen_plan.kind", lang, plan.kind))), markButton(plan, day, lang, marked))),
    link("#/deen/plans", "crumb", t("dp.open", lang)));
}
/** Report: a link only, no plan, count or note. Hidden from print so a printed report never carries worship details. */
export function deenReportCard(lang: Locale): HTMLElement {
  return h("section", { class: "card no-print", "data-deen-card": "report" }, h("h2", { class: "card-h" }, t("dp.title", lang)), h("p", { class: "muted" }, t("dp.report.p", lang)), link("#/deen/plans", "crumb", t("dp.open", lang)));
}

function zakatCard(lang: Locale, allowed: boolean): HTMLElement {
  const z = zakatRow(allRecs()); const day = today();
  const fig = zakatFigure(z?.wealth ?? null, z?.nisab ?? null, z?.rate ?? null);
  const left = daysUntil(z?.hawl ?? null, day);
  const miss = (k: string) => t(`dp.z.missing.${k}` as Key, lang);
  const result = fig.state === "figure" ? h("p", { "data-zakat-figure": "figure", class: "ok" }, t("dp.z.figure", lang, { a: fmtNumber(fig.amount, lang) }))
    : fig.state === "below" ? h("p", { "data-zakat-figure": "below" }, t("dp.z.below", lang))
      : h("p", { class: "muted", "data-zakat-figure": "unknown" }, t("dp.z.unknown", lang), ": ", fig.missing.map(miss).join(" · "));
  const iw = h("input", { id: "z-wealth", type: "text", inputmode: "decimal", autocomplete: "off", value: z?.wealth != null ? String(z.wealth) : "" }) as HTMLInputElement;
  const inn = h("input", { id: "z-nisab", type: "text", inputmode: "decimal", autocomplete: "off", value: z?.nisab != null ? String(z.nisab) : "" }) as HTMLInputElement;
  const ir = h("input", { id: "z-rate", type: "text", inputmode: "decimal", autocomplete: "off", value: z?.rate != null ? String(z.rate) : "" }) as HTMLInputElement;
  const ih = h("input", { id: "z-hawl", type: "date", value: z?.hawl ?? "" }) as HTMLInputElement;
  const inote = h("input", { id: "z-note", type: "text", maxlength: "300", autocomplete: "off", value: z?.note ?? "" }) as HTMLInputElement;
  const err = h("p", { class: "err", role: "alert" });
  const form = h("form", { novalidate: true, "data-form": "zakat" },
    h("label", { for: "z-wealth" }, tb(fieldById("zakat_snapshot.wealth")!.label, lang)), iw,
    h("label", { for: "z-nisab" }, tb(fieldById("zakat_snapshot.nisab")!.label, lang)), inn,
    h("label", { for: "z-rate" }, tb(fieldById("zakat_snapshot.rate")!.label, lang)), ir,
    h("label", { for: "z-hawl" }, tb(fieldById("zakat_snapshot.hawl_on")!.label, lang)), ih,
    h("label", { for: "z-note" }, tb(fieldById("zakat_snapshot.note")!.label, lang)), inote, err, h("button", { class: "btn", type: "submit" }, t("dp.save", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault(); err.textContent = "";
    if (!consentOn()) { err.textContent = saveBlockedText(lang); return; }
    const bad = validateZakat({ wealth: iw.value, nisab: inn.value, rate: ir.value, hawl: ih.value, note: inote.value });
    if (bad) { err.textContent = t(`dp.err.z.${bad}` as Key, lang); return; }
    if (!secretFree(inote.value)) { err.textContent = t("intake.secretRejected", lang); return; }
    const values: Record<string, FieldValue> = {};
    const w = parseNumber(iw.value), n = parseNumber(inn.value), r = parseNumber(ir.value);
    if (w !== null) values["zakat_snapshot.wealth"] = typed(w); if (n !== null) values["zakat_snapshot.nisab"] = typed(n); if (r !== null) values["zakat_snapshot.rate"] = typed(r);
    if (ih.value.trim()) values["zakat_snapshot.hawl_on"] = typed(ih.value.trim()); if (inote.value.trim()) values["zakat_snapshot.note"] = typed(inote.value.trim());
    if (z) store[z.ns].delete(ZAKAT_ID);
    if (!saveTyped({ id: ZAKAT_ID, entity: "zakat_snapshot", createdAt: new Date().toISOString(), values })) { err.textContent = saveBlockedText(lang); return; }
    rerender();
  });
  return h("section", { class: "card", "data-zakat": "1" }, h("h2", { class: "card-h" }, t("dp.z.title", lang)), h("p", { class: "muted" }, t("dp.z.hint", lang)),
    allowed ? h("div", {}, form, result,
      left !== null ? h("p", { class: "muted", "data-zakat-days": String(left) }, left >= 0 ? t("dp.z.daysLeft", lang, { n: fmtNumber(left, lang) }) : t("dp.z.datePassed", lang)) : null,
      z ? h("button", { class: "btn ghost", type: "button", "data-act": "zakat-clear", style: "width:auto;min-height:44px", onclick: () => { store[z.ns].delete(ZAKAT_ID); rerender(); } }, t("risk.remove", lang)) : null) : null,
    h("p", { class: "note" }, t("dp.z.note", lang)));
}

export function deenPlansScreen(): HTMLElement {
  const lang = prefs.lang; const allowed = consentOn(); const day = today(); const recs = allowed ? allRecs() : [];
  const plans = planRows(recs);
  // ---- add a plan ----
  const kind = h("select", { id: "dp-kind" }, ...PLAN_KINDS.map((k) => h("option", { value: k }, opts("deen_plan.kind", lang, k)))) as HTMLSelectElement;
  const title = h("input", { id: "dp-title", type: "text", maxlength: "80", autocomplete: "off" }) as HTMLInputElement;
  const repeat = h("select", { id: "dp-repeat" }, ...REPEATS.map((r) => h("option", { value: r }, opts("deen_plan.repeat", lang, r)))) as HTMLSelectElement;
  const due = h("input", { id: "dp-due", type: "date" }) as HTMLInputElement;
  const prayer = h("select", { id: "dp-prayer" }, h("option", { value: "" }, "—"), ...PRAYER_LINKS.map((p) => h("option", { value: p }, opts("deen_plan.prayer", lang, p)))) as HTMLSelectElement;
  const note = h("input", { id: "dp-note", type: "text", maxlength: "300", autocomplete: "off" }) as HTMLInputElement;
  const err = h("p", { class: "err", role: "alert" });
  const form = h("form", { novalidate: true, "data-form": "deen-plan" }, consentOn() ? null : consentPrompt(lang),
    h("label", { for: "dp-kind" }, tb(fieldById("deen_plan.kind")!.label, lang)), kind, h("label", { for: "dp-title" }, tb(fieldById("deen_plan.title")!.label, lang)), title,
    h("label", { for: "dp-repeat" }, tb(fieldById("deen_plan.repeat")!.label, lang)), repeat, h("label", { for: "dp-due" }, tb(fieldById("deen_plan.due")!.label, lang)), due,
    h("label", { for: "dp-prayer" }, tb(fieldById("deen_plan.prayer")!.label, lang)), prayer, h("label", { for: "dp-note" }, tb(fieldById("deen_plan.note")!.label, lang)), note,
    err, h("button", { class: "btn", type: "submit" }, t("dp.add", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault(); err.textContent = "";
    if (!consentOn()) { err.textContent = saveBlockedText(lang); return; }
    const bad = validatePlan({ kind: kind.value, title: title.value, repeat: repeat.value, due: due.value, note: note.value });
    if (bad) { err.textContent = t(`dp.err.${bad}` as Key, lang); return; }
    if (!secretFree(title.value, note.value)) { err.textContent = t("intake.secretRejected", lang); return; }
    const values: Record<string, FieldValue> = { "deen_plan.kind": typed(kind.value), "deen_plan.title": typed(title.value.trim()), "deen_plan.repeat": typed(repeat.value), "deen_plan.status": typed("active") };
    if (due.value.trim()) values["deen_plan.due"] = typed(due.value.trim()); if (kind.value === "salah" && prayer.value) values["deen_plan.prayer"] = typed(prayer.value); if (note.value.trim()) values["deen_plan.note"] = typed(note.value.trim());
    if (!saveTyped({ id: newId("dplan"), entity: "deen_plan", createdAt: new Date().toISOString(), values })) { err.textContent = saveBlockedText(lang); return; }
    rerender();
  });
  const setStatus = (p: PlanRow, status: "active" | "paused") => {
    const r = store[p.ns].get(p.id); if (!r) return;
    store[p.ns].put({ ...r, values: { ...r.values, "deen_plan.status": asReal(typed(status)) } }); rerender();
  };
  const planCard = (p: PlanRow) => {
    const marked = isMarked(recs, p, day);
    return h("li", { class: "card", "data-deen-plan": p.id },
      h("div", { class: "row" }, h("strong", {}, p.title), nsTag(p.ns, lang)),
      h("p", { class: "muted" }, `${opts("deen_plan.kind", lang, p.kind)} · ${opts("deen_plan.repeat", lang, p.repeat)}${p.due ? ` · ${p.due}` : ""}${p.prayer ? ` · ${opts("deen_plan.prayer", lang, p.prayer)}` : ""}`),
      p.repeat !== "daily" && !p.due ? h("p", { class: "muted", "data-plan-nodate": "1" }, t("dp.nodate", lang)) : null,
      p.note ? h("p", { "data-plan-note": "1" }, p.note) : null,
      p.active ? h("div", { class: "row" }, markButton(p, day, lang, marked), h("span", { class: "muted" }, t("dp.mark.hint", lang))) : h("p", { class: "muted", "data-plan-paused": "1" }, t("dp.paused", lang)),
      h("div", { class: "row" },
        h("button", { class: "btn ghost", type: "button", "data-act": p.active ? "plan-pause" : "plan-resume", "data-plan": p.id, style: "width:auto;margin:0;min-height:44px", onclick: () => setStatus(p, p.active ? "paused" : "active") }, p.active ? t("dp.pause", lang) : t("dp.resume", lang)),
        h("button", { class: "btn ghost", type: "button", "data-remove": p.id, style: "width:auto;margin:0;min-height:44px", onclick: () => { store[p.ns].delete(p.id); rerender(); } }, t("risk.remove", lang))));
  };
  // ---- private notes and figures ----
  const area = h("select", { id: "dn-area" }, ...NOTE_AREAS.map((a) => h("option", { value: a.code }, t(`dp.area.${a.code}` as Key, lang)))) as HTMLSelectElement;
  const ntext = h("input", { id: "dn-text", type: "text", maxlength: "300", autocomplete: "off" }) as HTMLInputElement;
  const namt = h("input", { id: "dn-amount", type: "text", inputmode: "decimal", autocomplete: "off" }) as HTMLInputElement;
  const nerr = h("p", { class: "err", role: "alert" });
  const nform = h("form", { novalidate: true, "data-form": "deen-note" }, h("label", { for: "dn-area" }, t("dp.area.label", lang)), area,
    h("label", { for: "dn-text" }, t("dp.note.text", lang)), ntext, h("label", { for: "dn-amount" }, tb(fieldById("giving.amount")!.label, lang)), namt, nerr, h("button", { class: "btn", type: "submit" }, t("dp.note.add", lang)));
  nform.addEventListener("submit", (ev) => {
    ev.preventDefault(); nerr.textContent = "";
    if (!consentOn()) { nerr.textContent = saveBlockedText(lang); return; }
    const bad = validateNote({ area: area.value, text: ntext.value, amount: namt.value }); if (bad) { nerr.textContent = t(`dp.err.n.${bad}` as Key, lang); return; }
    if (!secretFree(ntext.value)) { nerr.textContent = t("intake.secretRejected", lang); return; }
    const a = NOTE_AREAS.find((x) => x.code === area.value)!;
    const v = a.kind === "amount" ? typed(parseNumber(namt.value)) : typed(ntext.value.trim());
    if (!saveTyped({ id: newId("dnote"), entity: a.entity, createdAt: new Date().toISOString(), values: { [a.field]: v } })) { nerr.textContent = saveBlockedText(lang); return; }
    rerender();
  });
  const notes = noteRows(recs);
  return h("main", { class: "scr scr-deen-plans" }, link("#/deen", "crumb", `← ${t("deen.title", lang)}`), h("h1", {}, t("dp.title", lang)), h("p", { class: "sub" }, t("dp.intro", lang)),
    h("div", { class: "note", role: "note", "data-deen-banner": "1" }, h("p", {}, t("dp.banner", lang))),
    allowed ? h("div", {},
      h("h2", {}, t("dp.list", lang)),
      plans.length ? h("ul", { class: "plain" }, ...plans.map(planCard)) : h("p", { class: "muted", "data-deen-empty": "1" }, t("dp.none", lang)),
      h("h2", {}, t("dp.add", lang)), form) : h("div", {}, consentPrompt(lang), h("p", { class: "muted", "data-deen-locked": "1" }, t("dp.locked", lang))),
    zakatCard(lang, allowed),
    h("section", { class: "card", "data-deen-notes": "1" }, h("h2", { class: "card-h" }, t("dp.notes.title", lang)), h("p", { class: "muted" }, t("dp.notes.hint", lang)),
      allowed ? h("div", {}, nform, notes.length ? h("ul", { class: "plain" }, ...notes.slice(0, 60).map((n) => h("li", { "data-deen-note": n.id }, nsTag(n.ns, lang), ` ${n.day} · ${t(`dp.area.${n.area}` as Key, lang)} · `,
        n.amount !== null ? `${fmtNumber(n.amount, lang)} ${fieldById("giving.amount")!.unit ?? "BDT"}` : n.text ?? "", " ",
        h("button", { class: "btn ghost", type: "button", "data-remove": n.id, style: "width:auto;margin:0;min-height:44px", onclick: () => { store[n.ns].delete(n.id); rerender(); } }, t("risk.remove", lang))))) : h("p", { class: "muted" }, t("dp.notes.none", lang))) : null),
    h("p", { class: "muted" }, t("dp.privacy", lang)), disclaimers(lang, ["noFatwa", "noGuarantee"]));
}

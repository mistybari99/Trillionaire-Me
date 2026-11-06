// Print / Save as PDF (M20, TM-REQ-153): a clean page made on this phone from the user's own entries, then the phone's print window
// ("Save as PDF"). No generator library, no network. The same cards and calculations as the screens; only the layout is for paper.
import { h } from "./dom";
import { overallProgress } from "../core/overallProgress";
import { t, tb, fmtNumber } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { prefs } from "./state";
import { activeNs, allRecs, nsTag } from "./entry";
import { fieldById } from "../catalog/fields";
import { disclaimers } from "./components";
import { todayIsoKpi } from "./kpiUi";
import { reportContent } from "./screens";
import { printLink } from "./printLink";
import { teamAnalysis, analysisLines } from "./teamCard";
import { PRINT_KINDS, isPrintKind, planDoc, printFileName } from "../core/printDoc";
import { roleViews } from "../core/team";
import { sopRows, sopsForRole } from "../core/knowledge";

const link = (href: string, cls: string, ...kids: Array<Node | string>) => h("a", { href, class: cls }, ...kids);
const holderLabel = (code: string | null, lang: Locale): string => {
  if (!code) return t("unknown.unknown", lang);
  const o = fieldById("team_role.holder")?.options?.find((x) => x.code === code);
  return o ? tb(o.label, lang) : code;
};

/** The one overall figure, printed once on top of the plan (a shared step is counted once in it). */
function overallLine(lang: Locale): HTMLElement {
  const o = overallProgress(allRecs(), prefs.progressMode);
  return h("p", { "data-print-overall": o.percent === null ? "unknown" : String(o.percent) }, o.percent === null ? t("overall.unknown", lang) : t("overall.text", lang, { p: fmtNumber(o.percent, lang), d: fmtNumber(o.done, lang), n: fmtNumber(o.total, lang), how: t(prefs.progressMode === "size" ? "overall.how.size" : "overall.how.equal", lang) }));
}

let withGoalNames = false; // the hand-over goes to another person: goal names stay off unless the person ticks the box
function planBody(lang: Locale): HTMLElement {
  const rows = planDoc(allRecs());
  if (!rows.length) return h("p", { class: "muted", "data-print-empty": "plan" }, t("print.plan.none", lang));
  return h("section", { class: "card", "data-print-plan": String(rows.length) },
    h("h2", { class: "card-h" }, t("print.plan.title", lang)), overallLine(lang),
    h("ul", { class: "plain" }, ...rows.map((g) => h("li", { "data-print-goal": g.id, "data-depth": String(g.depth), style: `margin-inline-start:${g.depth * 16}px` },
      h("strong", {}, g.title), " ", h("span", { class: "tag off" }, t(`gt.kind.${g.kind}` as Key, lang)),
      h("p", { class: "muted" }, g.date ? t("print.plan.date", lang, { d: g.date }) : t("print.plan.nodate", lang), " · ",
        g.percent === null ? t("print.plan.pctUnknown", lang) : t("print.plan.pct", lang, { p: fmtNumber(g.percent, lang) })),
      g.steps.length ? h("ul", {}, ...g.steps.map((s) => h("li", { "data-print-step": s.id }, s.title || "—", " · ", s.minutes === null ? t("plan.task.minutes.later", lang) : t("task.minutes", lang, { n: fmtNumber(s.minutes, lang) }), s.also.length ? ` (${t("print.plan.also", lang, { list: s.also.join(", ") })})` : ""))) : h("p", { class: "muted" }, t("print.plan.nosteps", lang))))),
    h("p", { class: "muted", "data-print-once": "1" }, t("print.plan.once", lang)));
}

function handoverBody(lang: Locale): HTMLElement {
  const views = roleViews(allRecs());
  if (!views.length) return h("p", { class: "muted", "data-print-empty": "handover" }, t("print.ho.none", lang));
  const a = teamAnalysis(); const sops = sopRows(allRecs(), new Date());
  return h("div", { "data-print-handover": String(views.length) },
    h("section", { class: "card" }, h("h2", { class: "card-h" }, t("print.ho.title", lang)), ...analysisLines(a, lang),
      h("label", { class: "no-print k-inline" }, h("input", { type: "checkbox", "data-act": "ho-goal-names", ...(withGoalNames ? { checked: true } : {}),
        onchange: (e: Event) => { withGoalNames = (e.target as HTMLInputElement).checked; window.dispatchEvent(new HashChangeEvent("hashchange")); } }), t("print.ho.names", lang))),
    ...views.map((v) => h("section", { class: "card", "data-print-role": v.row.id },
      h("h2", { class: "card-h" }, v.row.role),
      h("p", {}, h("span", { class: "muted" }, `${t("team.holder", lang)}: `), holderLabel(v.row.holder, lang)),
      v.planned ? h("p", { "data-print-planned": "1" }, t("team.ho.planned", lang), v.planned.due ? ` · ${t("team.ho.due", lang, { d: v.planned.due })}` : "", v.planned.note ? ` · ${v.planned.note}` : "") : null,
      ...v.done.map((d) => h("p", { class: "muted" }, t("team.ho.was", lang, { d: d.doneOn ?? "—" }))),
      v.tasks.length ? h("ul", {}, ...v.tasks.map((x) => h("li", { "data-print-step": x.id }, x.title || "—", " · ", x.minutes === null ? t("plan.task.minutes.later", lang) : t("task.minutes", lang, { n: fmtNumber(x.minutes, lang) }),
        x.delegated ? ` · ${t("team.step.delegated", lang)}` : "",
        x.goals.length ? ` · ${withGoalNames ? t("print.ho.serves.names", lang, { list: x.goals.join(", ") }) : t("print.ho.serves", lang, { n: fmtNumber(x.goals.length, lang) })}` : ""))) : h("p", { class: "muted" }, t("print.ho.nosteps", lang)),
      ...sopsForRole(sops, v.row.id).map((s) => h("div", { "data-print-sop": s.id }, h("p", {}, h("strong", {}, `${t("print.ho.sops", lang)}: ${s.title}`)), h("ol", {}, ...s.steps.map((x) => h("li", {}, x))))))));
}

const reportBody = (lang: Locale): HTMLElement => h("div", { "data-print-report": "1" }, ...reportContent(lang));

/** `#/journey/print[/report|plan|handover]`. Without a kind it offers the three documents. */
export function printScreen(kindRaw?: string): HTMLElement {
  const lang = prefs.lang; const ns = activeNs(); const day = todayIsoKpi();
  const back = link("#/journey", "crumb no-print", `← ${t("journey.title", lang)}`);
  if (!isPrintKind(kindRaw)) {
    return h("main", { class: "scr scr-print" }, back, h("h1", {}, t("print.title", lang)), h("p", { class: "sub" }, t("print.intro", lang)),
      ...PRINT_KINDS.map((k) => h("section", { class: "card", "data-print-choice": k }, h("h2", { class: "card-h" }, t(`print.kind.${k}` as Key, lang)), h("p", { class: "muted" }, t(`print.desc.${k}` as Key, lang)), printLink(k, lang, "btn"))),
      disclaimers(lang));
  }
  const kind = kindRaw;
  const save = h("button", { class: "btn no-print", type: "button", "data-act": "print-save", onclick: () => {
    const prev = document.title; document.title = printFileName(kind, ns, day);
    try { window.print(); } finally { document.title = prev; }
  } }, t("print.save", lang));
  const body = kind === "plan" ? planBody(lang) : kind === "handover" ? handoverBody(lang) : reportBody(lang);
  return h("main", { class: "scr scr-print", "data-print-kind": kind }, back, h("h1", {}, t(`print.kind.${kind}` as Key, lang)),
    h("p", { class: "sub no-print" }, t("print.intro", lang)),
    h("p", { class: "muted", "data-print-made": "1" }, nsTag(ns, lang), " ", t("print.made", lang, { d: day })),
    save, h("p", { class: "muted no-print" }, t("print.saveNote", lang)),
    body, disclaimers(lang),
    h("p", { class: "muted no-print" }, ...PRINT_KINDS.filter((k) => k !== kind).flatMap((k) => [printLink(k, lang, "crumb"), " "]), link("#/journey/print", "crumb", t("print.all", lang))));
}

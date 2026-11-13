// Stage gate display (M05): the same rows on the Journey stage panel, the stage-rules page, Today (review date) and the report.
// Wording is neutral: an exit not yet reached is "N more to reach it", never a failure; unknown is never 0.
import { h } from "./dom";
import { t, tb, fmtNumber } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import type { Label } from "../core/types";
import { exitStatuses, gateDue, gateIsEmpty, gateRows, dueGates, summariseExits, type ExitStatus, type GateRow } from "../core/stageGates";
import { stagesFor } from "../core/stageTemplates";
import { STAGE_CODES, type ExitCond, type StageCode } from "../core/stages";
import { prefs } from "./state";
import { activeNs, allRecs, nsTag } from "./entry";
import { valueEl } from "./components";
import { todayIsoKpi } from "./kpiUi";

const fmt = (n: number, lang: Locale) => fmtNumber(Math.round(n * 10) / 10, lang);
export const stageName = (code: string, lang: Locale): string => { const i = STAGE_CODES.indexOf(code as StageCode); return i < 0 ? code : tb(stagesFor(prefs.stageTemplate)[i]!.name, lang); };

/** The user's measurable exit conditions as stage-engine inputs (met = reached by a real number). */
export const exitConds = (): ExitCond[] => exitStatuses(allRecs(), todayIsoKpi()).map((x) => ({ code: x.row.code, id: x.row.id, name: x.row.name, met: x.state === "met" }));

export function exitRowView(st: ExitStatus, lang: Locale): HTMLElement {
  const { row, actual } = st; const unit = row.unit ? ` ${row.unit}` : "";
  const ownLabel: Label = row.ns === "real" ? "FACT" : "DEMO";
  const tg = row.target === null ? h("span", { class: "muted", "data-exit-notarget": "1" }, t("gate.exit.notarget", lang)) : valueEl(`${fmt(row.target, lang)}${unit}`, ownLabel, lang);
  const ac = actual.state === "value" ? valueEl(`${fmt(actual.value, lang)}${unit}`, row.measure === "own" ? ownLabel : "INFERENCE", lang) : h("span", { class: "muted", "data-exit-unknown": actual.why }, t(`gate.why.${actual.why}` as Key, lang));
  return h("div", { class: "kpi-row", "data-exit": row.id, "data-exit-state": st.state },
    h("p", {}, h("strong", {}, row.name)),
    h("p", {}, h("span", { class: "muted" }, `${t("gate.exit.target", lang)}: `), tg, h("span", { class: "muted" }, ` · ${t("gate.exit.sofar", lang)}: `), ac),
    st.state === "met" ? h("p", { class: "muted", "data-exit-text": "met" }, t("gate.exit.met", lang)) : st.state === "not_yet" ? h("p", { class: "muted", "data-exit-text": "not_yet" }, t("gate.exit.togo", lang, { n: fmt(st.toGo!, lang) })) : null);
}

/** Inside the Journey stage panel: your entry condition, exit conditions (planned against actual), review date and pause rule for the current stage. */
export function stageRulesBlock(code: StageCode, lang: Locale): HTMLElement {
  if (code === "A") return h("a", { href: "#/journey/gates", class: "crumb", "data-stage-rules": "A" }, t("gate.card.edit", lang));
  const g = gateRows(allRecs()).find((x) => x.code === code)!; const list = exitStatuses(allRecs(), todayIsoKpi(), code);
  const due = gateDue(g, todayIsoKpi());
  return h("div", { "data-stage-rules": code },
    gateIsEmpty(g) && !list.length ? h("p", { class: "muted", "data-rules-none": "1" }, t("gate.card.none", lang)) : null,
    g.entry ? h("p", { "data-gate-entry": "1" }, h("span", { class: "muted" }, `${t("gate.card.entry", lang)}: `), g.entry) : null,
    ...list.map((s) => exitRowView(s, lang)),
    g.reviewOn ? h("p", { "data-gate-review": due }, h("span", { class: "muted" }, `${t("gate.card.review", lang)}: `), g.reviewOn, due === "due" ? h("span", { class: "tag warn" }, ` ${t("gate.due.now", lang)}`) : null) : null,
    g.pauseRule ? h("p", { "data-gate-pause": "1" }, h("span", { class: "muted" }, `${t("gate.card.pause", lang)}: `), g.pauseRule) : null,
    h("a", { href: "#/journey/gates", class: "crumb" }, t("gate.card.edit", lang)));
}

/** Today: a calm card for stages whose review date has come. Nothing when none is due. */
export function gateDueCard(lang: Locale, passed: readonly string[], where: "today" | "report"): HTMLElement | null {
  const due = dueGates(gateRows(allRecs()), passed, todayIsoKpi());
  if (!due.length) return null;
  return h("section", { class: "card", "data-gate-due-card": where, "aria-label": t("gate.due.title", lang) },
    h("div", { class: "row" }, h("h2", { class: "card-h" }, t("gate.due.title", lang)), nsTag(activeNs(), lang)),
    h("ul", { class: "plain" }, ...due.map((g: GateRow) => h("li", { "data-due-gate": g.code }, h("strong", {}, t("gate.stage", lang, { c: g.code, n: stageName(g.code, lang) })), h("span", { class: "muted" }, ` · ${g.reviewOn}`),
      g.pauseRule ? h("p", { class: "muted" }, `${t("gate.card.pause", lang)}: ${g.pauseRule}`) : null))),
    h("a", { href: "#/journey/gates", class: "crumb" }, t("gate.due.open", lang)));
}

/** Report: every stage that has a rule or an exit condition, with how many exits are reached. Nothing when none is written. */
export function gateReportCard(lang: Locale): HTMLElement | null {
  const recs = allRecs(); const today = todayIsoKpi();
  const rows = gateRows(recs).map((g) => ({ g, sum: summariseExits(exitStatuses(recs, today, g.code)) })).filter(({ g, sum }) => !gateIsEmpty(g) || sum.total > 0);
  if (!rows.length) return null;
  return h("section", { class: "card", "data-gate-report": String(rows.length), "aria-label": t("gate.report.title", lang) },
    h("div", { class: "row" }, h("h2", { class: "card-h" }, t("gate.report.title", lang)), nsTag(activeNs(), lang)),
    h("ul", { class: "plain" }, ...rows.map(({ g, sum }) => h("li", { "data-gate-line": g.code },
      h("strong", {}, t("gate.stage", lang, { c: g.code, n: stageName(g.code, lang) })), " · ",
      sum.total ? t("gate.report.exits", lang, { m: fmtNumber(sum.met, lang), n: fmtNumber(sum.total, lang) }) : t("gate.report.noexit", lang),
      sum.unknown ? h("span", { class: "muted" }, ` ${t("gate.report.unknown", lang, { n: fmtNumber(sum.unknown, lang) })}`) : null,
      g.reviewOn ? h("span", { class: "muted" }, ` · ${t("gate.card.review", lang)}: ${g.reviewOn}`) : null))),
    h("a", { href: "#/journey/gates", class: "crumb" }, t("gate.card.edit", lang)));
}

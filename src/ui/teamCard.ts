// Team roles summary (M10): the same gap analysis on the Team page, Today and the report, and the one function that keeps delegated steps in step with the roles.
// Roles only, no names. Unknown is never 0: a step with no estimate is counted apart, free time that is not known gives no comparison.
import { h } from "./dom";
import { t, fmtNumber } from "../i18n/t";
import type { Locale } from "../i18n/registry";
import { analyseTeam, syncDelegation, type TeamAnalysis } from "../core/team";
import { buildPlanInput } from "../core/planInputs";
import { prefs } from "./state";
import { activeNs, allRecs, entryNs, inNs, nsTag, storeOf } from "./entry";
import { loadAnswers } from "./screens";
import { valueEl } from "./components";

const iso = (): string => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

/** Saves the delegation marks the roles imply (needs the consent tick in real mode). Safe to call after any role or step change. */
export function syncDelegationNow(): void {
  if (!entryNs()) return;
  for (const r of syncDelegation(allRecs(), iso())) storeOf(r).put(inNs(r, r.ns));
}

export function teamAnalysis(): TeamAnalysis {
  const recs = allRecs();
  return analyseTeam(recs, buildPlanInput(loadAnswers(), recs, prefs.mode).weeklyFreeMinutes);
}

/** The analysis lines. Plain sentences first; nothing is red. */
export function analysisLines(a: TeamAnalysis, lang: Locale): HTMLElement[] {
  const n = (x: number) => fmtNumber(x, lang);
  const out: HTMLElement[] = [];
  out.push(h("p", { "data-gaps": String(a.gaps) }, a.gaps ? t("team.an.gaps", lang, { n: n(a.gaps) }) : t("team.an.nogaps", lang)));
  if (a.openNoSteps) out.push(h("p", { class: "muted", "data-open-nosteps": String(a.openNoSteps) }, t("team.an.opennosteps", lang, { n: n(a.openNoSteps) })));
  if (a.unanswered) out.push(h("p", { class: "muted" }, t("team.an.unanswered", lang, { n: n(a.unanswered) })));
  if (a.mine.steps) {
    const m = a.mine;
    out.push(h("p", { "data-mine": String(m.steps) }, valueEl(t("team.an.mine", lang, { s: n(m.steps), m: n(m.knownMinutes) }), "INFERENCE", lang),
      m.unknownEstimates ? h("span", { class: "muted" }, ` ${t("team.an.noest", lang, { n: n(m.unknownEstimates) })}`) : null));
    out.push(h("p", { class: "muted", "data-free": m.freeMinutes === null ? "unknown" : String(m.freeMinutes) },
      m.freeMinutes === null ? t("team.an.freeUnknown", lang) : t("team.an.free", lang, { m: n(m.freeMinutes) }),
      m.over ? ` ${t("team.an.over", lang)}` : ""));
  }
  if (a.unassigned) out.push(h("p", { class: "muted", "data-unassigned": String(a.unassigned) }, t("team.an.unassigned", lang, { n: n(a.unassigned) })));
  if (a.planned) out.push(h("p", { class: "muted", "data-planned": String(a.planned) }, t("team.an.planned", lang, { n: n(a.planned) })));
  return out;
}

/** Today and the report. Nothing is drawn when the user has no role, so an empty start stays quiet. On Today it appears only when something needs a look. */
export function teamCard(lang: Locale, where: "today" | "report"): HTMLElement | null {
  const a = teamAnalysis();
  if (!a.roles) return null;
  if (where === "today" && !a.gaps && !a.planned) return null;
  return h("section", { class: "card", "data-team-card": where, "aria-label": t("team.card.title", lang) },
    h("div", { class: "row" }, h("h2", { class: "card-h" }, t("team.card.title", lang)), nsTag(activeNs(), lang)),
    h("p", { class: "muted" }, t("team.card.roles", lang, { n: fmtNumber(a.roles, lang), h: fmtNumber(a.handedOver, lang) })),
    ...analysisLines(a, lang),
    h("a", { href: "#/diary/team", class: "crumb" }, t("team.card.open", lang)));
}

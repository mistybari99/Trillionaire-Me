// Risk review trigger (M15): a risk whose review date has come is shown on Today, the report and the risk page with a calm question.
// "Not yet" sets the next review date; "It has happened" writes a reality event (M12) so the plan can be adjusted by the user's own approval.
// The stop rule is the user's own words and is only shown back. Unknown date means no trigger.
import { h } from "./dom";
import { t, fmtNumber } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { REVIEW_DAYS, dueRisks, reviewedRisk, riskDue, riskRows, type ReviewDays, type RiskRow } from "../core/risk";
import { eventRecord, loopLogRecord } from "../core/realityLoop";
import { activeNs, allRecs, entryNs, inNs, nsTag, putMode, saveBlockedText, saveTyped, storeOf } from "./entry";

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
export const todayIsoRisk = (): string => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

/** The question block for one risk. `open` unfolds it (used when the review is due). */
export function riskReviewBox(r: RiskRow, lang: Locale, open: boolean): HTMLElement {
  const sel = h("select", { id: `rv-days-${r.id}` }, ...REVIEW_DAYS.map((d) => h("option", { value: String(d) }, t(`risk.review.in.${d}` as Key, lang))));
  const msg = h("p", { class: "err", role: "alert" });
  const notYet = h("button", { class: "btn ghost btn-sm", type: "button", "data-act": "risk-notyet", "data-risk-id": r.id }, t("risk.review.notyet", lang));
  notYet.addEventListener("click", () => {
    const rec = allRecs().find((x) => x.id === r.id); if (!rec) return;
    if (!entryNs()) { msg.textContent = saveBlockedText(lang); return; }
    const days = Number(sel.value) as ReviewDays; const next = reviewedRisk(rec, todayIsoRisk(), days);
    storeOf(rec).put(inNs(next, rec.ns));
    putMode(loopLogRecord({ id: `rvlog-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, eventId: null, createdAt: new Date().toISOString(), text: t("risk.review.logged", lang, { text: r.text, date: todayIsoRisk() }) }));
    rerender();
  });
  const happened = h("button", { class: "btn ghost btn-sm", type: "button", "data-act": "risk-happened", "data-risk-id": r.id }, t("risk.review.happened", lang));
  happened.addEventListener("click", () => {
    const rec = allRecs().find((x) => x.id === r.id); if (!rec) return;
    const id = `ev-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const base = eventRecord({ id, kind: "setback", note: t("risk.review.eventNote", lang, { text: r.text }).slice(0, 200), on: todayIsoRisk(), goalId: null, createdAt: new Date().toISOString() });
    if (!saveTyped({ id, entity: base.entity, createdAt: base.createdAt, values: base.values })) { msg.textContent = saveBlockedText(lang); return; }
    storeOf(rec).put(inNs(reviewedRisk(rec, todayIsoRisk(), 30), rec.ns));          // the prompt does not repeat today
    putMode(loopLogRecord({ id: `rvlog-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, eventId: id, createdAt: new Date().toISOString(), text: t("risk.review.loggedHappened", lang, { text: r.text, date: todayIsoRisk() }) }));
    location.hash = "#/journey/reality"; rerender();
  });
  return h("details", { class: "help", "data-risk-review": r.id, ...(open ? { open: true } : {}) },
    h("summary", {}, t("risk.review.title", lang)),
    r.stopRule ? h("p", { "data-risk-stoprule": "1" }, t("risk.review.stoprule", lang, { rule: r.stopRule })) : h("p", { class: "muted" }, t("risk.review.nostop", lang)),
    h("p", {}, t("risk.review.ask", lang)),
    h("label", { for: `rv-days-${r.id}` }, t("risk.review.again", lang)), sel, notYet, " ", happened, msg);
}

/** Tag line under a risk: when it is due, soon, or has no date. */
export function riskDueTag(r: RiskRow, lang: Locale): HTMLElement | null {
  const d = riskDue(r, todayIsoRisk());
  if (d === "none" || d === "later") return null;
  return h("span", { class: "tag warn", "data-risk-due": d }, t(d === "due" ? "risk.due.now" : "risk.due.soon", lang));
}

/** Today and the report: risks whose review date has come (up to 3 on Today). Nothing when none is due, so an empty start stays quiet. */
export function riskDueCard(lang: Locale, where: "today" | "report"): HTMLElement | null {
  const due = dueRisks(riskRows(allRecs()), todayIsoRisk());
  if (!due.length) return null;
  const shown = where === "today" ? due.slice(0, 3) : due;
  return h("section", { class: "card", "data-risk-due-card": where, "aria-label": t("risk.due.title", lang) },
    h("div", { class: "row" }, h("h2", { class: "card-h" }, t("risk.due.title", lang)), nsTag(activeNs(), lang)),
    h("p", { class: "muted", "data-due-count": String(due.length) }, t("risk.due.count", lang, { n: fmtNumber(due.length, lang) })),
    h("ul", { class: "plain" }, ...shown.map((r) => h("li", { "data-due-risk": r.id }, h("strong", {}, r.text), r.reviewOn ? h("span", { class: "muted" }, ` · ${r.reviewOn}`) : null))),
    where === "today" && due.length > shown.length ? h("p", { class: "muted" }, t("risk.due.more", lang, { n: fmtNumber(due.length - shown.length, lang) })) : null,
    h("a", { href: "#/journey/risks", class: "crumb" }, t("risk.due.open", lang)));
}

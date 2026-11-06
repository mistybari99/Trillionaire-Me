// Delete a goal safely (multi-goal ruling): preview in numbers first, one confirm, then ONLY the goal goes. The goal id is taken out of every
// step and habit list in one batch; no step or habit is deleted; a plan version (old and new copy) and a journey-log line are written.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Locale } from "../i18n/registry";
import { prefs } from "./state";
import { allRecs, entryNs, findRec, putMode, saveBlockedText, storeOf } from "./entry";
import { applyGoalRemoval, previewGoalRemoval } from "../core/taskGoals";
import { loopLogRecord, nextVersionNumber, snapshotOf, versionRecord } from "../core/realityLoop";
import { num } from "./components";
import type { TMRecord } from "../core/types";

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
const iso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

/** The records after the goal is gone: the goal removed, its id taken out of every list. Pure; the same rule the preview counts. */
export function recordsAfterGoalDelete(recs: readonly TMRecord[], goalId: string): TMRecord[] {
  const changed = new Map(applyGoalRemoval(recs, goalId).map((r) => [r.id, r] as const));
  return recs.filter((r) => r.id !== goalId).map((r) => changed.get(r.id) ?? r);
}

export function goalDeleteCard(goal: TMRecord, lang: Locale): HTMLElement {
  const recs = allRecs(); const pv = previewGoalRemoval(recs, goal.id);
  const msg = h("p", { class: "err", role: "alert" });
  const panel = h("div", { hidden: true, "data-del-panel": goal.id },
    h("p", { "data-del-preview": "1" }, t("gl.del.preview", lang, { s: num(pv.steps, lang), k: num(pv.keepOther, lang), u: num(pv.unlinked, lang), p: num(pv.partsMoveUp, lang) })),
    pv.habits ? h("p", { class: "muted" }, t("gl.del.habits", lang, { h: num(pv.habits, lang) })) : null,
    h("p", { class: "muted" }, t("gl.del.safe", lang)), msg,
    h("button", { class: "btn", type: "button", "data-act": "goal-delete-confirm", onclick: () => {
      if (!entryNs()) { msg.textContent = saveBlockedText(lang); return; }
      const cur = findRec(goal.id); if (!cur) return;
      const now = allRecs(); const before = snapshotOf(now, prefs.mode); const after = recordsAfterGoalDelete(now, goal.id); const number = nextVersionNumber(now);
      for (const r of applyGoalRemoval(now, goal.id)) storeOf(r).put(r);
      storeOf(cur).delete(cur.id);
      const at = new Date(); const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
      putMode(versionRecord({ id: `pv-${suffix}`, number, option: "goal_delete", on: iso(), eventId: null, before, after: snapshotOf(after, prefs.mode), createdAt: at.toISOString() }));
      putMode(loopLogRecord({ id: `rlog-${suffix}`, eventId: null, createdAt: at.toISOString(), text: t("gl.del.logged", lang, { title: String((goal.values["goal.title"] as { value?: unknown } | undefined)?.value ?? "") }) }));
      location.hash = "#/journey/goals"; rerender();
    } }, t("gl.del.confirm", lang)),
    h("button", { class: "btn ghost", type: "button", "data-act": "goal-delete-cancel", onclick: () => { panel.hidden = true; open.hidden = false; } }, t("gl.del.cancel", lang)));
  const open = h("button", { class: "btn ghost", type: "button", "data-act": "goal-delete-open", onclick: () => { panel.hidden = false; open.hidden = true; } }, t("gl.del.btn", lang));
  return h("section", { class: "card", "data-goal-delete": goal.id }, h("h2", { class: "card-h" }, t("gl.del.title", lang)), open, panel);
}

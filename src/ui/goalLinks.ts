// Goal links on steps (multi-goal ruling): a row of toggle chips to pick every goal a step helps, and small read-only chips on every step row.
// A flat set: no "main" goal. Order of chips is by title. Chips are information in every mode. Nothing here is red or scored.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { allRecs, findRec, storeOf } from "./entry";
import { buildTree, flatten, type TreeNode } from "../core/goalTree";
import { goalStatusOf } from "../core/goalStatus";
import { taskTrace } from "../core/taskTrace";
import { MAX_GOALS, danglingGoalIdsOf, goalIdsOf, withGoals } from "../core/taskGoals";
import type { TMRecord } from "../core/types";

const short = (s: string, n = 14): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
export const goalHash = (id: string) => `#/journey/goal/${id}`;

/** Every node of the tree under a root (the root itself first). */
const branchIds = (n: TreeNode): string[] => flatten([n]).map((x) => x.id);

export interface Picker { el: HTMLElement; ids(): string[] }
/**
 * Toggle chips, one per top-level goal that is not retired (a retired goal appears only when already linked). Tap = linked, tap again = unlinked.
 * Under a linked goal that has sub-goals or projects, an optional "Which part?" select (default: the whole goal). Ids that are not in any shown
 * branch (a goal that was removed, another namespace) are kept untouched. More than 5 is refused with a calm line.
 */
export function goalPicker(recs: readonly TMRecord[], initial: readonly string[], lang: Locale, uid: string): Picker {
  const roots = buildTree(recs).filter((r) => !r.orphan); const byId = new Map(recs.filter((r) => r.entity === "goal").map((g) => [g.id, g] as const));
  let ids = [...new Set(initial)];
  const shown = roots.filter((r) => goalStatusOf(byId.get(r.id)!) !== "retired" || branchIds(r).some((x) => ids.includes(x)));
  const inBranch = (r: TreeNode) => new Set(branchIds(r));
  const note = h("p", { class: "muted", role: "status", "data-goals-note": "1" });
  const host = h("div", { class: "goal-picker", "data-goal-picker": uid });
  const draw = () => {
    note.textContent = "";
    host.replaceChildren(
      h("p", { class: "muted" }, t("gl.pick.help", lang)),
      shown.length ? h("div", { class: "chips", role: "group", "aria-label": t("gl.pick.label", lang) }, ...shown.map((r) => {
        const set = inBranch(r); const on = ids.some((x) => set.has(x));
        const status = goalStatusOf(byId.get(r.id)!);
        return h("button", { type: "button", class: "chip-btn", "aria-pressed": String(on), "data-goal-chip": r.id, style: "min-height:44px", title: r.title, onclick: () => {
          if (on) ids = ids.filter((x) => !set.has(x));
          else { if (ids.length >= MAX_GOALS) { draw(); note.textContent = t("gl.pick.max", lang, { n: String(MAX_GOALS) }); return; } ids = [...ids, r.id]; }
          draw();
        } }, short(r.title, 24), status === "retired" ? ` ${t("gl.chip.retired", lang)}` : status === "paused" ? ` ${t("gl.chip.paused", lang)}` : "");
      })) : h("a", { href: "#/journey/goals", class: "crumb", "data-act": "add-goal-first" }, t("gl.pick.addFirst", lang)),
      ...shown.filter((r) => r.children.length).flatMap((r) => {
        const set = inBranch(r); const mine = ids.filter((x) => set.has(x)); if (!mine.length) return [];
        const parts = flatten([r]).slice(1);
        const sel = h("select", { id: `gp-${uid}-${r.id}`, "data-goal-part": r.id, "aria-label": `${t("gl.pick.part", lang)}: ${r.title}` },
          h("option", { value: r.id, ...(mine.includes(r.id) ? { selected: true } : {}) }, t("gl.pick.whole", lang)),
          ...parts.map((p) => h("option", { value: p.id, ...(mine[0] === p.id ? { selected: true } : {}) }, `${"· ".repeat(p.depth)}${p.title}`))) as HTMLSelectElement;
        sel.addEventListener("change", () => { ids = [...ids.filter((x) => !set.has(x)), sel.value]; });
        return [h("label", { for: `gp-${uid}-${r.id}` }, `${t("gl.pick.part", lang)}: ${r.title}`), sel];
      }),
      note);
  };
  draw();
  return { el: host, ids: () => [...ids] };
}

/**
 * Small chips for the goals a step serves: up to 2, then "+N"; each opens that goal's page. Titles shortened to 14 characters (full title in title/aria-label).
 * Paused or retired goals say so in words. A step with no goal gets a quiet "Link to a goal" link. `recs` defaults to the active mode's records.
 */
export function goalChips(step: TMRecord, lang: Locale, recs: readonly TMRecord[] = allRecs(), opts: { exclude?: string; prefix?: Key } = {}): HTMLElement | null {
  const goals = new Map(recs.filter((r) => r.entity === "goal").map((g) => [g.id, g] as const));
  const title = (g: TMRecord) => String((g.values["goal.title"] as { value?: unknown } | undefined)?.value ?? "");
  const live = goalIdsOf(step).filter((id) => goals.has(id) && id !== opts.exclude).map((id) => goals.get(id)!).sort((a, b) => title(a).localeCompare(title(b)) || a.id.localeCompare(b.id));
  const gone = opts.exclude ? [] : danglingGoalIdsOf(step, new Set(goals.keys()));
  const goneEl = gone.length ? h("span", { class: "muted", "data-dangling": step.id }, t("gl.dangling", lang), " ", h("button", { type: "button", class: "btn ghost", "data-act": "remove-dangling", style: "width:auto;margin:0;min-height:44px", onclick: () => {
    const cur = findRec(step.id); if (!cur) return; storeOf(cur).put(withGoals(cur, goalIdsOf(cur).filter((x) => !gone.includes(x)))); window.dispatchEvent(new HashChangeEvent("hashchange"));
  } }, t("gl.dangling.fix", lang))) : null;
  if (!live.length) return opts.exclude ? null : h("span", { class: "goal-chips" }, gone.length ? goneEl : h("a", { href: "#/diary/plan", class: "chip-link muted", "data-link-goal": step.id }, t("gl.chip.link", lang)));
  const word = (g: TMRecord) => { const s = goalStatusOf(g); return s === "retired" ? ` ${t("gl.chip.retired", lang)}` : s === "paused" ? ` ${t("gl.chip.paused", lang)}` : ""; };
  const shownGoals = live.slice(0, 2);
  return h("span", { class: "goal-chips", "data-goal-chips": step.id },
    ...shownGoals.map((g) => h("a", { href: goalHash(g.id), class: "tag", "data-goal-chip-link": g.id, title: title(g), "aria-label": title(g) + word(g) }, (opts.prefix ? t(opts.prefix, lang, { title: short(title(g)) }) : short(title(g))) + word(g))),
    goneEl,
    live.length > 2 ? h("span", { class: "tag", "data-goal-more": String(live.length - 2), title: live.slice(2).map(title).join(", ") }, t("gl.chip.more", lang, { n: String(live.length - 2) })) : null);
}

/** The "Where does this go?" section of the step edit sheet: for each goal the path and what Done changes, plus the overall (counted once). */
export function whereThisGoes(step: TMRecord, lang: Locale, recs: readonly TMRecord[] = allRecs()): HTMLElement {
  const tr = taskTrace(recs, step.id); const n = (x: number) => String(x);
  const lines: HTMLElement[] = [];
  if (!tr) return h("section", { "data-where-goes": step.id });
  if (!tr.counted) lines.push(h("p", { class: "muted" }, t("gl.where.off", lang)));
  else if (!tr.goals.length) lines.push(h("p", { class: "muted", "data-where-none": "1" }, t("gl.where.none", lang)));
  else for (const g of tr.goals) {
    const path = g.path.join(" > ");
    lines.push(h("p", { "data-where-goal": g.id }, g.manual ? t("gl.where.manual", lang, { path }) : tr.alreadyDone ? t("gl.where.done", lang, { path, d: n(g.done), n: n(g.total) }) : t("gl.where.line", lang, { path, d: n(g.done), n: n(g.total), d2: n(g.doneAfter) })));
  }
  if (tr.overall) lines.push(h("p", { class: "muted", "data-where-overall": "1" }, tr.alreadyDone ? t("gl.where.overallDone", lang, { d: n(tr.overall.done), n: n(tr.overall.total) }) : t("gl.where.overall", lang, { d: n(tr.overall.done), n: n(tr.overall.total), d2: n(tr.overall.doneAfter) })));
  return h("section", { "data-where-goes": step.id }, h("h3", {}, t("gl.where.title", lang)), ...lines);
}

import { checkFreeText } from "../core/safety";
import { IDEA_KINDS, IDEA_STATES, buildRecallIndex, filterRecall, ideaEventRecord, ideaHistory, ideaKind, ideaState, ideaTitle, similarIdeas, validateIdeaInput, validateIdeaLink, withIdeaPatch, type IdeaKind, type IdeaState, type IdeaValidationError } from "../core/ideas";
import type { FieldValue, TMRecord } from "../core/types";
import { t } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { h } from "./dom";
import { prefs } from "./state";
import { activeNs, allRecs, consentOn, consentPrompt, findRec, nsTag, saveTyped, storeOf, typed } from "./entry";
import { disclaimers, num } from "./components";

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
const v = (r: TMRecord, key: string): unknown => r.values[key]?.state === "value" ? (r.values[key] as { value: unknown }).value : undefined;
const txt = (r: TMRecord, key: string): string => typeof v(r, key) === "string" ? String(v(r, key)) : "";
const titleOf = (r: TMRecord): string => txt(r, r.entity === "venture" ? "venture.name" : r.entity === "task" ? "task.title" : "goal.title") || r.id;
const option = (value: string, label: string, selected = false) => h("option", { value, ...(selected ? { selected: true } : {}) }, label);
const stateLabel = (state: IdeaState, lang: Locale) => t(`idea.state.${state}` as Key, lang);
const kindLabel = (kind: IdeaKind, lang: Locale) => t(`idea.kind.${kind}` as Key, lang);
const errorText = (e: IdeaValidationError, lang: Locale) => t(`idea.error.${e}` as Key, lang);
const nowIso = () => new Date().toISOString();

function saveEvent(idea: TMRecord, action: Parameters<typeof ideaEventRecord>[1], detail = "", from?: IdeaState): boolean {
  try { return saveTyped(ideaEventRecord(idea, action, nowIso(), detail, from)); } catch { return false; }
}

export function createNextTaskForIdea(id: string): { ok: boolean; taskId?: string; existing?: boolean } {
  const idea = findRec(id); if (!idea || idea.entity !== "capture" || idea.links?.task) return idea?.links?.task ? { ok: true, taskId: idea.links.task, existing: true } : { ok: false };
  const recs = allRecs(); const target = idea.links?.project ?? idea.links?.goal;
  const ids = target && recs.some((r) => r.id === target && r.entity === "goal" && r.ns === idea.ns) ? [target] : [];
  const taskId = `task-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const values: Record<string, FieldValue> = { "task.title": typed(ideaTitle(idea)), "task.minutes": { state: "later" }, "task.priority": typed("normal"), ...(ids.length ? { "task.goals": typed(ids) } : {}) };
  try {
    if (!saveTyped({ id: taskId, entity: "task", createdAt: nowIso(), values, ...(ids.length ? { links: { goal: ids[0]! } } : {}) })) return { ok: false };
    const changed = withIdeaPatch(idea, { title: ideaTitle(idea), note: txt(idea, "capture.note"), state: "active", kind: ideaKind(idea), tags: Array.isArray(v(idea, "capture.tags")) ? v(idea, "capture.tags") as string[] : [], reviewOn: txt(idea, "capture.review_on") || null, links: { task: taskId } }, nowIso());
    try { storeOf(idea).put(changed); } catch (e) { storeOf(idea).delete(taskId); throw e; }
    saveEvent(changed, "task_created", ideaTitle(idea), ideaState(idea));
    return { ok: true, taskId };
  } catch { return { ok: false }; }
}

function filterSelect(id: string, label: string, options: Array<[string, string]>): HTMLElement {
  return h("div", { class: "idea-filter" }, h("label", { for: id }, label), h("select", { id }, ...options.map(([value, name]) => option(value, name))));
}

export function recallScreen(): HTMLElement {
  const lang = prefs.lang; const recs = allRecs(); const docs = buildRecallIndex(recs, activeNs());
  const ventures = recs.filter((r) => r.entity === "venture").sort((a, b) => titleOf(a).localeCompare(titleOf(b)));
  const goals = recs.filter((r) => r.entity === "goal").sort((a, b) => titleOf(a).localeCompare(titleOf(b)));
  const search = h("input", { id: "idea-search", type: "search", autocomplete: "off", placeholder: t("idea.recall.search", lang) }) as HTMLInputElement;
  const state = filterSelect("idea-filter-state", t("idea.recall.state", lang), [["", t("idea.recall.all", lang)], ...IDEA_STATES.map((x) => [x, stateLabel(x, lang)] as [string, string])]);
  const kind = filterSelect("idea-filter-kind", t("idea.recall.kind", lang), [["", t("idea.recall.all", lang)], ...IDEA_KINDS.map((x) => [x, kindLabel(x, lang)] as [string, string])]);
  const venture = filterSelect("idea-filter-venture", t("idea.recall.venture", lang), [["", t("idea.recall.all", lang)], ...ventures.map((r) => [r.id, titleOf(r)] as [string, string])]);
  const goal = filterSelect("idea-filter-goal", t("idea.recall.goal", lang), [["", t("idea.recall.all", lang)], ...goals.map((r) => [r.id, titleOf(r)] as [string, string])]);
  const from = h("input", { id: "idea-filter-from", type: "date" }) as HTMLInputElement;
  const to = h("input", { id: "idea-filter-to", type: "date" }) as HTMLInputElement;
  const list = h("div", { class: "idea-list", "aria-live": "polite" }); const count = h("p", { class: "muted", "data-idea-count": "1" });
  const controls = [state.querySelector("select")!, kind.querySelector("select")!, venture.querySelector("select")!, goal.querySelector("select")!] as HTMLSelectElement[];
  const draw = () => {
    const found = filterRecall(docs, { query: search.value, states: controls[0]!.value ? [controls[0]!.value as IdeaState] : [], kinds: controls[1]!.value ? [controls[1]!.value as IdeaKind] : [], ventureId: controls[2]!.value, goalId: controls[3]!.value, changedFrom: from.value, changedTo: to.value });
    count.textContent = t("idea.recall.count", lang, { n: num(found.length, lang) });
    list.replaceChildren(...(found.length ? found.map((d) => {
      const linked = [d.ventureTitle, d.goalTitle, d.projectTitle, d.taskTitle].filter(Boolean).join(" · ");
      return h("article", { class: "card idea-card", "data-idea": d.id }, h("div", { class: "idea-card-head" }, h("div", {}, nsTag(d.ns, lang), " ", h("span", { class: `tag idea-state-${d.state}` }, stateLabel(d.state, lang)), h("h2", { class: "card-h" }, d.title)), h("span", { class: "muted" }, kindLabel(d.kind, lang))),
        d.note && d.note !== d.title ? h("p", { class: "idea-excerpt" }, d.note.slice(0, 220)) : null,
        d.tags.length ? h("p", { class: "idea-tags" }, ...d.tags.map((x) => h("span", { class: "tag" }, x))) : null,
        linked ? h("p", { class: "muted", "data-idea-links": "1" }, t("idea.links", lang, { x: linked })) : null,
        h("p", { class: "muted" }, t("idea.changed", lang, { d: d.changedAt.slice(0, 10) }), d.reviewOn ? ` · ${t("idea.review.on", lang, { d: d.reviewOn })}` : "", d.taskId ? ` · ${t(d.taskDone ? "idea.task.done" : "idea.task.pending", lang)}` : ""),
        h("a", { class: "btn ghost btn-sm", href: `#/recall/${d.id}` }, t("idea.open", lang)));
    }) : [h("div", { class: "card idea-empty", "data-idea-empty": "1" }, h("p", {}, t("idea.recall.none", lang)), h("a", { class: "btn", href: "#/capture" }, t("idea.recall.capture", lang)))]));
  };
  search.addEventListener("input", draw); for (const x of [...controls, from, to]) x.addEventListener("change", draw);
  const clear = h("button", { class: "btn ghost btn-sm", type: "button", onclick: () => { search.value = ""; controls.forEach((x) => { x.value = ""; }); from.value = ""; to.value = ""; draw(); } }, t("idea.recall.clear", lang));
  draw();
  return h("main", { class: "scr scr-recall" }, h("div", { class: "idea-page-head" }, h("div", {}, h("h1", {}, t("idea.recall.title", lang)), h("p", { class: "sub" }, t("idea.recall.intro", lang))), h("a", { class: "btn", href: "#/capture" }, t("idea.recall.capture", lang))),
    h("label", { for: "idea-search" }, t("idea.recall.search", lang)), search,
    h("details", { class: "card idea-filters" }, h("summary", {}, t("idea.recall.filters", lang)), h("div", { class: "idea-filter-grid" }, state, kind, venture, goal, h("div", { class: "idea-filter" }, h("label", { for: "idea-filter-from" }, t("idea.recall.from", lang)), from), h("div", { class: "idea-filter" }, h("label", { for: "idea-filter-to" }, t("idea.recall.to", lang)), to)), clear), count, list, disclaimers(lang));
}

function relationSelect(id: string, label: string, rows: TMRecord[], selected: string | undefined, lang: Locale): HTMLElement[] {
  return [h("label", { for: id }, label), h("select", { id }, option("", t("idea.link.none", lang), !selected), ...rows.map((r) => option(r.id, titleOf(r), r.id === selected)))];
}

export function ideaDetailScreen(id: string): HTMLElement {
  const lang = prefs.lang; const idea = findRec(id);
  if (!idea || idea.entity !== "capture") return h("main", { class: "scr scr-recall" }, h("a", { class: "crumb", href: "#/recall" }, `← ${t("idea.back", lang)}`), h("h1", {}, t("idea.recall.title", lang)), h("div", { class: "note", role: "alert" }, t("idea.missing", lang)));
  const recs = allRecs(); const goals = recs.filter((r) => r.entity === "goal" && txt(r, "goal.kind") !== "project"); const projects = recs.filter((r) => r.entity === "goal" && txt(r, "goal.kind") === "project"); const ventures = recs.filter((r) => r.entity === "venture"); const tasks = recs.filter((r) => r.entity === "task");
  const title = h("input", { id: "idea-title", type: "text", maxlength: "120", value: ideaTitle(idea), autocomplete: "off" }) as HTMLInputElement;
  const note = h("textarea", { id: "idea-note", rows: "5", maxlength: "2000" }, txt(idea, "capture.note")) as HTMLTextAreaElement;
  const kind = h("select", { id: "idea-kind" }, ...IDEA_KINDS.map((x) => option(x, kindLabel(x, lang), x === ideaKind(idea)))) as HTMLSelectElement;
  const state = h("select", { id: "idea-state" }, ...IDEA_STATES.map((x) => option(x, stateLabel(x, lang), x === ideaState(idea)))) as HTMLSelectElement;
  const review = h("input", { id: "idea-review", type: "date", value: txt(idea, "capture.review_on") }) as HTMLInputElement;
  const oldTags = Array.isArray(v(idea, "capture.tags")) ? (v(idea, "capture.tags") as string[]).join(", ") : "";
  const tags = h("input", { id: "idea-tags", type: "text", maxlength: "247", value: oldTags, autocomplete: "off" }) as HTMLInputElement;
  const ventureId = "idea-venture", goalId = "idea-goal", projectId = "idea-project", taskId = "idea-task";
  const err = h("p", { class: "err", role: "alert" }); const ok = h("p", { class: "ok-msg", "aria-live": "polite" });
  const form = h("form", { class: "card idea-editor", novalidate: true, "data-form": "idea" }, consentOn() ? null : consentPrompt(lang),
    h("label", { for: "idea-title" }, t("idea.title", lang)), title, h("label", { for: "idea-note" }, t("idea.note", lang)), note,
    h("div", { class: "idea-two" }, h("div", {}, h("label", { for: "idea-kind" }, t("idea.kind", lang)), kind), h("div", {}, h("label", { for: "idea-state" }, t("idea.state", lang)), state)),
    h("label", { for: "idea-tags" }, t("idea.tags", lang)), tags, h("label", { for: "idea-review" }, t("idea.review", lang)), review,
    h("fieldset", { class: "idea-links" }, h("legend", {}, t("idea.links", lang, { x: "" })), ...relationSelect(ventureId, t("idea.link.venture", lang), ventures, idea.links?.venture, lang), ...relationSelect(goalId, t("idea.link.goal", lang), goals, idea.links?.goal, lang), ...relationSelect(projectId, t("idea.link.project", lang), projects, idea.links?.project, lang), ...relationSelect(taskId, t("idea.link.task", lang), tasks, idea.links?.task, lang)), err, ok, h("button", { class: "btn", type: "submit" }, t("idea.save", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault(); err.textContent = ""; ok.textContent = "";
    const tagList = [...new Set(tags.value.split(",").map((x) => x.trim()).filter(Boolean))];
    const bad = validateIdeaInput({ title: title.value, note: note.value, state: state.value, kind: kind.value, tags: tagList, reviewOn: review.value });
    if (bad) { err.textContent = errorText(bad, lang); return; }
    if (![title.value, note.value, ...tagList].every((x) => checkFreeText(x).ok)) { err.textContent = t("intake.secretRejected", lang); return; }
    const links = { venture: (form.querySelector(`#${ventureId}`) as HTMLSelectElement).value || null, goal: (form.querySelector(`#${goalId}`) as HTMLSelectElement).value || null, project: (form.querySelector(`#${projectId}`) as HTMLSelectElement).value || null, task: (form.querySelector(`#${taskId}`) as HTMLSelectElement).value || null };
    for (const k of ["venture", "goal", "project", "task"] as const) { const e = validateIdeaLink(recs, idea, k, links[k]); if (e) { err.textContent = errorText(e, lang); return; } }
    const before = ideaState(idea); const linkChanged = (["venture", "goal", "project", "task"] as const).some((k) => (idea.links?.[k] ?? null) !== links[k]); const at = nowIso();
    const changed = withIdeaPatch(idea, { title: title.value, note: note.value, state: state.value as IdeaState, kind: kind.value as IdeaKind, tags: tagList, reviewOn: review.value || null, links }, at);
    try { storeOf(idea).put(changed); if (!saveEvent(changed, before !== state.value ? "state" : linkChanged ? "linked" : "edited", linkChanged ? "relations" : "", before)) throw new Error("event"); ok.textContent = t("idea.saved", lang); setTimeout(rerender, 80); } catch { err.textContent = t("idea.error.write", lang); }
  });
  const task = idea.links?.task ? recs.find((r) => r.id === idea.links!.task && r.entity === "task") : undefined;
  const taskMsg = h("p", { class: "ok-msg", "aria-live": "polite" });
  const taskCard = h("section", { class: "card", "data-idea-execution": "1" }, h("h2", { class: "card-h" }, t("idea.task.title", lang)), task ? h("div", {}, h("p", {}, h("strong", {}, titleOf(task)), " ", h("span", { class: `tag ${task.values["task.done_on"]?.state === "value" ? "ok" : ""}` }, t(task.values["task.done_on"]?.state === "value" ? "idea.task.done" : "idea.task.pending", lang))), h("a", { class: "btn ghost btn-sm", href: "#/diary/plan" }, t("idea.task.open", lang)), task.values["task.done_on"]?.state !== "value" ? h("a", { class: "btn ghost btn-sm", href: `#/focus/${task.id}` }, t("idea.task.focus", lang)) : null) : h("div", {}, h("p", { class: "muted" }, t("idea.task.none", lang)), h("button", { class: "btn", type: "button", "data-act": "idea-next-task", onclick: () => { const r = createNextTaskForIdea(idea.id); taskMsg.textContent = t(!r.ok ? "idea.error.write" : r.existing ? "idea.task.exists" : "idea.task.created", lang); if (r.ok && !r.existing) setTimeout(rerender, 100); } }, t("idea.task.create", lang))), taskMsg);
  const history = ideaHistory(recs, idea.id, idea.ns);
  const historyCard = h("section", { class: "card", "data-idea-history": "1" }, h("h2", { class: "card-h" }, t("idea.history.title", lang)), history.length ? h("ol", { class: "idea-history" }, ...history.map((e) => h("li", {}, h("strong", {}, t(`idea.history.${e.action}` as Key, lang)), h("span", { class: "muted" }, ` · ${e.changedAt.slice(0, 16).replace("T", " ")}`), e.fromState && e.toState && e.fromState !== e.toState ? h("span", {}, ` · ${stateLabel(e.fromState, lang)} → ${stateLabel(e.toState, lang)}`) : null))) : h("p", { class: "muted" }, t("idea.history.none", lang)));
  const similar = similarIdeas(buildRecallIndex(recs, idea.ns), idea.id);
  const similarCard = similar.length ? h("section", { class: "card", "data-idea-similar": "1" }, h("h2", { class: "card-h" }, t("idea.similar.title", lang)), h("p", { class: "muted" }, t("idea.similar.note", lang)), h("div", { class: "idea-similar-grid" }, ...similar.map((x) => h("article", { class: "card" }, h("strong", {}, x.title), h("p", { class: "muted" }, `${kindLabel(x.kind, lang)} · ${stateLabel(x.state, lang)}`), h("a", { class: "btn ghost btn-sm", href: `#/recall/${x.id}` }, t("idea.open", lang)))))) : null;
  return h("main", { class: "scr scr-recall" }, h("a", { class: "crumb", href: "#/recall" }, `← ${t("idea.back", lang)}`), h("h1", {}, ideaTitle(idea)), h("p", { class: "sub" }, t("idea.detail.intro", lang)), form, taskCard, similarCard, historyCard, disclaimers(lang));
}

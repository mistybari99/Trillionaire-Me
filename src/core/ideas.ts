import type { FieldValue, Namespace, TMRecord } from "./types";

export const IDEA_STATES = ["inbox", "active", "waiting", "paused", "done", "archived"] as const;
export const IDEA_KINDS = ["idea", "plan", "decision", "note"] as const;
export type IdeaState = typeof IDEA_STATES[number];
export type IdeaKind = typeof IDEA_KINDS[number];

export interface RecallDocument {
  id: string;
  ns: Namespace;
  title: string;
  note: string;
  kind: IdeaKind;
  state: IdeaState;
  changedAt: string;
  reviewOn: string | null;
  tags: string[];
  ventureId: string | null;
  ventureTitle: string | null;
  goalId: string | null;
  goalTitle: string | null;
  projectId: string | null;
  projectTitle: string | null;
  taskId: string | null;
  taskTitle: string | null;
  taskDone: boolean;
  searchText: string;
}

export interface RecallFilters {
  query?: string;
  states?: readonly IdeaState[];
  kinds?: readonly IdeaKind[];
  ventureId?: string;
  goalId?: string;
  changedFrom?: string;
  changedTo?: string;
}

export type IdeaLinkKind = "venture" | "goal" | "project" | "task";
export type IdeaValidationError = "title_required" | "title_long" | "note_long" | "tags_too_many" | "tag_long" | "bad_state" | "bad_kind" | "bad_date" | "missing_link" | "wrong_link_type" | "other_namespace";

const value = (r: TMRecord, key: string): unknown => {
  const v = r.values[key]; return v?.state === "value" ? v.value : undefined;
};
const text = (r: TMRecord, key: string): string => typeof value(r, key) === "string" ? String(value(r, key)) : "";
const list = (r: TMRecord, key: string): string[] => {
  const v = value(r, key); return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
};
const oneLine = (s: string): string => s.replace(/\s+/g, " ").trim();
export const ideaTitle = (r: TMRecord): string => oneLine(text(r, "capture.title") || text(r, "capture.note")).slice(0, 120);
export const ideaState = (r: TMRecord): IdeaState => {
  const s = text(r, "capture.state"); return (IDEA_STATES as readonly string[]).includes(s) ? s as IdeaState : "inbox";
};
export const ideaKind = (r: TMRecord): IdeaKind => {
  const s = text(r, "capture.kind"); return (IDEA_KINDS as readonly string[]).includes(s) ? s as IdeaKind : "note";
};
export const ideaChangedAt = (r: TMRecord): string => text(r, "capture.changed_at") || r.createdAt;

const titleOf = (r: TMRecord | undefined): string | null => {
  if (!r) return null;
  const keys = r.entity === "venture" ? ["venture.name"] : r.entity === "goal" ? ["goal.title"] : r.entity === "task" ? ["task.title"] : [];
  for (const k of keys) { const s = oneLine(text(r, k)); if (s) return s; }
  return null;
};

/** Disposable local-only recall index. It never changes source records and never crosses namespaces. */
export function buildRecallIndex(records: readonly TMRecord[], ns?: Namespace): RecallDocument[] {
  const source = ns ? records.filter((r) => r.ns === ns) : records;
  const byId = new Map(source.map((r) => [r.id, r] as const));
  return source.filter((r) => r.entity === "capture" && !r.cantOpen).map((r) => {
    const venture = r.links?.venture ? byId.get(r.links.venture) : undefined;
    const goal = r.links?.goal ? byId.get(r.links.goal) : undefined;
    const project = r.links?.project ? byId.get(r.links.project) : undefined;
    const task = r.links?.task ? byId.get(r.links.task) : undefined;
    const note = text(r, "capture.note"); const tags = [...new Set(list(r, "capture.tags").map(oneLine).filter(Boolean))];
    const doc: Omit<RecallDocument, "searchText"> = {
      id: r.id, ns: r.ns, title: ideaTitle(r), note, kind: ideaKind(r), state: ideaState(r), changedAt: ideaChangedAt(r),
      reviewOn: text(r, "capture.review_on") || null, tags,
      ventureId: venture?.entity === "venture" ? venture.id : null, ventureTitle: venture?.entity === "venture" ? titleOf(venture) : null,
      goalId: goal?.entity === "goal" ? goal.id : null, goalTitle: goal?.entity === "goal" ? titleOf(goal) : null,
      projectId: project?.entity === "goal" ? project.id : null, projectTitle: project?.entity === "goal" ? titleOf(project) : null,
      taskId: task?.entity === "task" ? task.id : null, taskTitle: task?.entity === "task" ? titleOf(task) : null,
      taskDone: task?.entity === "task" && task.values["task.done_on"]?.state === "value",
    };
    return { ...doc, searchText: oneLine([doc.title, note, ...tags, doc.ventureTitle, doc.goalTitle, doc.projectTitle, doc.taskTitle].filter(Boolean).join(" ")).toLocaleLowerCase() };
  }).sort((a, b) => b.changedAt.localeCompare(a.changedAt) || a.id.localeCompare(b.id));
}

export function filterRecall(docs: readonly RecallDocument[], f: RecallFilters): RecallDocument[] {
  const q = oneLine(f.query ?? "").toLocaleLowerCase();
  return docs.filter((d) => (!q || d.searchText.includes(q))
    && (!f.states?.length || f.states.includes(d.state))
    && (!f.kinds?.length || f.kinds.includes(d.kind))
    && (!f.ventureId || d.ventureId === f.ventureId)
    && (!f.goalId || d.goalId === f.goalId || d.projectId === f.goalId)
    && (!f.changedFrom || d.changedAt.slice(0, 10) >= f.changedFrom)
    && (!f.changedTo || d.changedAt.slice(0, 10) <= f.changedTo));
}

const words = (s: string): Set<string> => new Set(s.toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter((x) => x.length >= 3));
/** Non-destructive duplicate hints. They are only links for side-by-side review; nothing is merged or changed. */
export function similarIdeas(docs: readonly RecallDocument[], id: string, limit = 3): RecallDocument[] {
  const source = docs.find((d) => d.id === id); if (!source) return [];
  const a = words(`${source.title} ${source.note}`); if (!a.size) return [];
  return docs.filter((d) => d.id !== id).map((d) => {
    const b = words(`${d.title} ${d.note}`); const both = [...a].filter((x) => b.has(x)).length; const overlap = both / Math.max(1, new Set([...a, ...b]).size);
    return { d, overlap };
  }).filter((x) => x.overlap >= .34).sort((a, b) => b.overlap - a.overlap || a.d.title.localeCompare(b.d.title)).slice(0, limit).map((x) => x.d);
}

export function validateIdeaInput(x: { title: string; note: string; state: string; kind: string; tags: readonly string[]; reviewOn?: string }): IdeaValidationError | null {
  if (!x.title.trim()) return "title_required";
  if (x.title.trim().length > 120) return "title_long";
  if (x.note.length > 2000) return "note_long";
  if (!(IDEA_STATES as readonly string[]).includes(x.state)) return "bad_state";
  if (!(IDEA_KINDS as readonly string[]).includes(x.kind)) return "bad_kind";
  if (x.tags.length > 8) return "tags_too_many";
  if (x.tags.some((t) => !t.trim() || t.trim().length > 30)) return "tag_long";
  if (x.reviewOn && !/^\d{4}-\d{2}-\d{2}$/.test(x.reviewOn)) return "bad_date";
  return null;
}

export function validateIdeaLink(records: readonly TMRecord[], idea: TMRecord, kind: IdeaLinkKind, id: string | null): IdeaValidationError | null {
  if (!id) return null;
  const target = records.find((r) => r.id === id); if (!target) return "missing_link";
  if (target.ns !== idea.ns) return "other_namespace";
  if (kind === "venture" && target.entity !== "venture") return "wrong_link_type";
  if ((kind === "goal" || kind === "project") && target.entity !== "goal") return "wrong_link_type";
  if (kind === "project" && text(target, "goal.kind") !== "project") return "wrong_link_type";
  if (kind === "goal" && text(target, "goal.kind") === "project") return "wrong_link_type";
  if (kind === "task" && target.entity !== "task") return "wrong_link_type";
  return null;
}

const labelled = (ns: Namespace, value0: unknown): FieldValue => ({ state: "value", value: value0, label: ns === "real" ? "FACT" : "DEMO" });
export interface IdeaPatch { title: string; note: string; state: IdeaState; kind: IdeaKind; tags: string[]; reviewOn: string | null; links: Partial<Record<IdeaLinkKind, string | null>> }

export function withIdeaPatch(rec: TMRecord, patch: IdeaPatch, changedAt: string): TMRecord {
  const values = { ...rec.values, "capture.title": labelled(rec.ns, patch.title.trim()), "capture.note": labelled(rec.ns, patch.note.trim()), "capture.state": labelled(rec.ns, patch.state), "capture.kind": labelled(rec.ns, patch.kind), "capture.changed_at": labelled(rec.ns, changedAt), "capture.tags": patch.tags.length ? labelled(rec.ns, [...new Set(patch.tags.map(oneLine).filter(Boolean))]) : { state: "unknown" } as FieldValue, "capture.review_on": patch.reviewOn ? labelled(rec.ns, patch.reviewOn) : { state: "unknown" } as FieldValue };
  const links = { ...(rec.links ?? {}) };
  for (const k of ["venture", "goal", "project", "task"] as const) { const id = patch.links[k]; if (id) links[k] = id; else if (id === null) delete links[k]; }
  const { links: _old, ...rest } = rec;
  return Object.keys(links).length ? { ...rest, values, links } : { ...rest, values };
}

export type IdeaEventAction = "created" | "edited" | "state" | "linked" | "task_created";
export function ideaEventRecord(idea: TMRecord, action: IdeaEventAction, changedAt: string, detail = "", fromState?: IdeaState): Omit<TMRecord, "ns" | "ownerId" | "schemaVersion"> {
  const values: TMRecord["values"] = { "idea_event.action": labelled(idea.ns, action), "idea_event.changed_at": labelled(idea.ns, changedAt), "idea_event.to_state": labelled(idea.ns, ideaState(idea)) };
  if (fromState) values["idea_event.from_state"] = labelled(idea.ns, fromState);
  if (detail) values["idea_event.detail"] = labelled(idea.ns, detail.slice(0, 240));
  return { id: `ie-${Date.parse(changedAt).toString(36)}-${Math.random().toString(36).slice(2, 7)}`, entity: "idea_event", createdAt: changedAt, links: { idea: idea.id }, values };
}

export interface IdeaHistoryRow { id: string; action: IdeaEventAction; changedAt: string; fromState: IdeaState | null; toState: IdeaState | null; detail: string }
export function ideaHistory(records: readonly TMRecord[], ideaId: string, ns: Namespace): IdeaHistoryRow[] {
  return records.filter((r) => r.ns === ns && r.entity === "idea_event" && r.links?.idea === ideaId).map((r) => ({ id: r.id, action: text(r, "idea_event.action") as IdeaEventAction, changedAt: text(r, "idea_event.changed_at") || r.createdAt, fromState: (text(r, "idea_event.from_state") || null) as IdeaState | null, toState: (text(r, "idea_event.to_state") || null) as IdeaState | null, detail: text(r, "idea_event.detail") })).sort((a, b) => b.changedAt.localeCompare(a.changedAt) || b.id.localeCompare(a.id));
}

// "Next best action" (pure, rule-based). One suggestion from the user's own entries, always with the rule that chose it.
// No amounts, no percents, no prediction: only what the user entered. Rules run in this fixed order; the first that applies wins.
import type { Namespace, TMRecord } from "./types";
import { goalProgress } from "./goalPlan";
import { isDelegatedTask, isOpenTask } from "./planInputs";
import { ideaState, ideaTitle } from "./ideas";
import { ventureRows } from "./ventures";

export type ActionId = "add_goal" | "link_task" | "add_task" | "do_task" | "add_money" | "rate_life" | "review_plan";
export interface NextAction { id: ActionId; href: string; /** values for the title and reason text (user's own words only) */ args: Record<string, string> }

const textOf = (r: TMRecord, f: string): string => { const v = r.values[f]; return v && v.state === "value" && typeof v.value === "string" ? v.value : ""; };

export function nextBestAction(recs: readonly TMRecord[]): NextAction {
  const goals = goalProgress(recs);
  if (!goals.length) return { id: "add_goal", href: "#/diary/intake/6", args: {} };
  const unlinked = goals.find((g) => g.mode !== "manual" && g.total === 0);
  if (unlinked) return { id: "link_task", href: "#/diary/plan", args: { goal: unlinked.title } };
  const tasks = recs.filter((r) => r.entity === "task");
  if (!tasks.length) return { id: "add_task", href: "#/diary/plan", args: {} };
  const open = tasks.filter(isOpenTask).sort((a, b) => a.id.localeCompare(b.id));
  if (open.length) return { id: "do_task", href: "#/diary/plan", args: { task: textOf(open[0]!, "task.title") } };
  if (!recs.some((r) => r.entity === "finance_item")) return { id: "add_money", href: "#/diary/money", args: {} };
  if (!recs.some((r) => r.entity === "life_area")) return { id: "rate_life", href: "#/journey/wheel", args: {} };
  return { id: "review_plan", href: "#/diary/plan", args: {} };
}

// ---- TMV2-04: calm "also worth a look" reasons across ventures, ideas and tasks. Pure, read-only, no new tasks. ----

export const MAX_NEXT_MORE = 3;
export type NextReason = "blocker" | "review_due" | "waiting";
export interface NextSuggestion { reason: NextReason; target: "task" | "idea" | "venture"; id: string; href: string; /** user's own words only */ args: { title: string; other?: string } }

const oneLine = (s: string): string => s.replace(/\s+/g, " ").trim();
const isLive = (r: TMRecord): boolean => r.values["task.done_on"]?.state !== "value" && r.values["task.not_true_on"]?.state !== "value";

/**
 * Up to three suggestions with a reason: a step that is waiting on another open step (blocker), an idea whose review date
 * has come (review_due), or something the user marked waiting/paused (waiting). Unknown dates never count as due.
 * Order: blocker, review_due (oldest date first), waiting; ties by id. One entry per record. Nothing is written.
 */
export function nextActions(recs: readonly TMRecord[], today: string, ns?: Namespace, skipIds: readonly string[] = []): NextSuggestion[] {
  const src = ns ? recs.filter((r) => r.ns === ns) : recs;
  const byId = new Map(src.map((r) => [r.id, r] as const));
  const skip = new Set(skipIds);
  const out: Array<NextSuggestion & { sort: string }> = [];
  const seen = new Set<string>();
  const add = (s: NextSuggestion, sort = ""): void => { if (seen.has(s.id) || skip.has(s.id)) return; seen.add(s.id); out.push({ ...s, sort }); };

  for (const r of src.filter(isOpenTask).sort((x, y) => x.id.localeCompare(y.id))) {
    const blockerId = r.links?.after; const b = blockerId ? byId.get(blockerId) : undefined;
    if (!b || b.entity !== "task" || !isLive(b) || b.id === r.id) continue;
    if (b.links?.after === r.id && b.id.localeCompare(r.id) > 0) continue; // two steps waiting on each other: show once
    add({ reason: "blocker", target: "task", id: b.id, href: "#/diary/plan", args: { title: oneLine(textOf(b, "task.title")), other: oneLine(textOf(r, "task.title")) } }, b.id);
  }
  const ideas = src.filter((r) => r.entity === "capture" && !r.cantOpen);
  for (const r of ideas) {
    const state = ideaState(r); const review = textOf(r, "capture.review_on");
    if (state === "done" || state === "archived" || !/^\d{4}-\d{2}-\d{2}$/.test(review) || review > today) continue;
    add({ reason: "review_due", target: "idea", id: r.id, href: `#/recall/${r.id}`, args: { title: ideaTitle(r) } }, `${review}|${r.id}`);
  }
  for (const r of ideas) if (ideaState(r) === "waiting") add({ reason: "waiting", target: "idea", id: r.id, href: `#/recall/${r.id}`, args: { title: ideaTitle(r) } }, r.id);
  for (const r of src.filter(isDelegatedTask)) add({ reason: "waiting", target: "task", id: r.id, href: "#/diary/plan", args: { title: oneLine(textOf(r, "task.title")) } }, r.id);
  for (const v of ventureRows(src.filter((r) => r.entity === "venture"))) if (v.stage === "paused") add({ reason: "waiting", target: "venture", id: v.id, href: "#/diary/ventures", args: { title: oneLine(v.name) } }, v.id);

  const order: Record<NextReason, number> = { blocker: 0, review_due: 1, waiting: 2 };
  return out.sort((a, b) => order[a.reason] - order[b.reason] || a.sort.localeCompare(b.sort) || a.id.localeCompare(b.id)).slice(0, MAX_NEXT_MORE).map(({ sort: _s, ...x }) => x);
}

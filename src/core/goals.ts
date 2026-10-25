// Goal → Subgoal → Project → Task hierarchy (TM-REQ-037). Pure tree ops that keep every link valid.
export type Kind = "goal" | "subgoal" | "project" | "task";
export interface Node { id: string; kind: Kind; parent: string | null; title: string }
export type Tree = Record<string, Node>;

const ALLOWED: Record<Kind, Kind[] | null> = { goal: null, subgoal: ["goal"], project: ["goal", "subgoal"], task: ["project", "subgoal", "goal"] };

export class TreeError extends Error {}

export function add(t: Tree, n: Node): Tree {
  if (t[n.id]) throw new TreeError("duplicate id");
  const allowed = ALLOWED[n.kind];
  if (allowed === null) { if (n.parent !== null) throw new TreeError("a goal has no parent"); }
  else { const p = n.parent ? t[n.parent] : undefined; if (!p || !allowed.includes(p.kind)) throw new TreeError(`${n.kind} cannot sit under ${p?.kind ?? "nothing"}`); }
  return { ...t, [n.id]: n };
}

export const rootGoal = (t: Tree, id: string): string | null => {
  let cur = t[id]; const seen = new Set<string>();
  while (cur) { if (cur.kind === "goal") return cur.id; if (seen.has(cur.id)) return null; seen.add(cur.id); cur = cur.parent ? t[cur.parent] : undefined; }
  return null;
};

/** Delete a node: its children move up to the deleted node's parent when that is legal, otherwise deletion is refused. Nothing is orphaned. */
export function remove(t: Tree, id: string): Tree {
  const n = t[id]; if (!n) throw new TreeError("unknown node");
  const kids = Object.values(t).filter((k) => k.parent === id);
  const next: Tree = { ...t }; delete next[id];
  for (const k of kids) {
    const allowed = ALLOWED[k.kind]; const np = n.parent ? next[n.parent] : undefined;
    if (!np || !allowed || !allowed.includes(np.kind)) throw new TreeError("children cannot be re-attached; delete or move them first");
    next[k.id] = { ...k, parent: n.parent };
  }
  return next;
}

/** Split one task into several under the same parent. */
export function splitTask(t: Tree, id: string, newIds: string[]): Tree {
  const n = t[id]; if (!n || n.kind !== "task") throw new TreeError("only tasks can be split");
  let next = remove(t, id);
  for (const nid of newIds) next = add(next, { id: nid, kind: "task", parent: n.parent, title: `${n.title} (${nid})` });
  return next;
}

/** Merge tasks that share a parent into one. */
export function mergeTasks(t: Tree, ids: string[], mergedId: string): Tree {
  const ns = ids.map((i) => t[i]); if (ns.some((n) => !n || n.kind !== "task")) throw new TreeError("only tasks can be merged");
  const parent = ns[0]!.parent; if (ns.some((n) => n!.parent !== parent)) throw new TreeError("tasks must share a parent");
  let next = { ...t }; for (const i of ids) delete next[i];
  return add(next, { id: mergedId, kind: "task", parent, title: ns.map((n) => n!.title).join(" + ") });
}

export const orphans = (t: Tree) => Object.values(t).filter((n) => rootGoal(t, n.id) === null).map((n) => n.id);

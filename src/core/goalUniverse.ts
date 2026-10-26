// Goal Universe (pure): life areas around one centre goal. Only the user's own entries are used.
// An area with no entry is Unknown (never 0). The Deen area is private: it carries no count and no progress figure.
import type { FieldValue, TMRecord } from "./types";
import { goalProgress } from "./goalPlan";

export const UNIVERSE_AREAS = ["business", "career", "health", "family", "travel", "personal", "deen"] as const;
export type UniverseArea = (typeof UNIVERSE_AREAS)[number];
export const isUniverseArea = (x: unknown): x is UniverseArea => typeof x === "string" && (UNIVERSE_AREAS as readonly string[]).includes(x);
/** Areas whose details are never drawn or counted here. */
export const PRIVATE_AREAS: readonly UniverseArea[] = ["deen"];

export interface UniverseNode {
  area: UniverseArea;
  /** Private area: only the name is shown, with a "private" note. */
  isPrivate: boolean;
  /** Goals the user put in this area. null when private or when there is none (Unknown). */
  goals: number | null;
  /** Tasks linked to those goals, and how many are done. null when private or when no task is linked (Unknown). */
  tasks: number | null;
  done: number | null;
  /** Whole percent done of linked tasks, or null (Unknown). */
  percent: number | null;
}
export interface Universe {
  centre: { id: string; title: string } | null;
  nodes: UniverseNode[];
  /** Goals with no life area chosen yet (counted, so nothing is hidden). */
  unassigned: number;
}

const str = (v: FieldValue | undefined): string | null => (v && v.state === "value" && typeof v.value === "string" ? v.value : null);
export const goalAreaOf = (g: TMRecord): UniverseArea | null => { const a = str(g.values["goal.area"]); return isUniverseArea(a) ? a : null; };
const HORIZON_ORDER = ["five_year", "one_year", "month", "week", "today"];

/** The centre goal: the user's goal with the longest horizon (ties and missing horizon: first by id). Private-area goals are never used. null when there is no goal. */
export function centreGoal(recs: readonly TMRecord[]): { id: string; title: string } | null {
  const goals = recs.filter((r) => r.entity === "goal" && str(r.values["goal.title"]) !== null && !PRIVATE_AREAS.includes(goalAreaOf(r) as UniverseArea)).sort((a, b) => {
    const ra = HORIZON_ORDER.indexOf(str(a.values["goal.horizon"]) ?? ""), rb = HORIZON_ORDER.indexOf(str(b.values["goal.horizon"]) ?? "");
    return (ra < 0 ? 99 : ra) - (rb < 0 ? 99 : rb) || a.id.localeCompare(b.id);
  });
  const g = goals[0]; return g ? { id: g.id, title: str(g.values["goal.title"])! } : null;
}

export function universeData(recs: readonly TMRecord[]): Universe {
  const goals = recs.filter((r) => r.entity === "goal" && str(r.values["goal.title"]) !== null);
  const prog = new Map(goalProgress(recs).map((p) => [p.id, p] as const));
  const nodes: UniverseNode[] = UNIVERSE_AREAS.map((area) => {
    if (PRIVATE_AREAS.includes(area)) return { area, isPrivate: true, goals: null, tasks: null, done: null, percent: null };
    const mine = goals.filter((g) => goalAreaOf(g) === area);
    if (!mine.length) return { area, isPrivate: false, goals: null, tasks: null, done: null, percent: null };
    // Counted from linked tasks only, even for manual-percent goals (a typed percent has no task count behind it).
    let tasks = 0, done = 0;
    for (const g of mine) { const p = prog.get(g.id); if (p) { tasks += p.total; done += p.done; } }
    return { area, isPrivate: false, goals: mine.length, tasks: tasks || null, done: tasks ? done : null, percent: tasks ? Math.round((done / tasks) * 100) : null };
  });
  const unassigned = goals.filter((g) => goalAreaOf(g) === null).length;
  return { centre: centreGoal(recs), nodes, unassigned };
}

/** Where a node sits on the ring: angle in radians, first node at the top, clockwise. */
export const nodeAngle = (i: number, n: number): number => (i / n) * 2 * Math.PI - Math.PI / 2;

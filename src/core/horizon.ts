// Horizon view: one goal can sit on one horizon. Goals with no horizon are shown as "not set" (unknown ≠ 0).
export const HORIZONS = ["five_year", "one_year", "month", "week", "today"] as const;
export type Horizon = (typeof HORIZONS)[number];

export interface HorizonGoal { readonly id: string; readonly title: string; readonly why?: string; readonly horizon?: string }

export interface HorizonGroups {
  readonly byHorizon: Record<Horizon, HorizonGoal[]>;
  readonly unset: HorizonGoal[];
}

export function isHorizon(v: string | undefined): v is Horizon {
  return v !== undefined && (HORIZONS as readonly string[]).includes(v);
}

export function groupByHorizon(goals: readonly HorizonGoal[]): HorizonGroups {
  const byHorizon = Object.fromEntries(HORIZONS.map((h) => [h, [] as HorizonGoal[]])) as Record<Horizon, HorizonGoal[]>;
  const unset: HorizonGoal[] = [];
  for (const g of goals) {
    if (isHorizon(g.horizon)) byHorizon[g.horizon].push(g);
    else unset.push(g);
  }
  return { byHorizon, unset };
}

// ---- Goal funnel (Journey hero) and horizon arc (Horizon screen) ----
export const FUNNEL_LEVELS = ["dream", "five_year", "one_year", "month", "week", "today", "now"] as const;
export type FunnelLevel = (typeof FUNNEL_LEVELS)[number];
export interface FunnelBand { level: FunnelLevel; /** Own count, or null when there is nothing to count yet (Unknown, never 0). */ count: number | null }

/** Counts only from the user's own goals and open tasks. No goal at all means every goal band is unknown (null). `openTasks` null = no task records. */
export function funnelBands(goals: readonly HorizonGoal[], openTasks: number | null): FunnelBand[] {
  const g = groupByHorizon(goals);
  const has = goals.length > 0;
  return FUNNEL_LEVELS.map((level): FunnelBand => {
    if (level === "dream") return { level, count: has ? goals.length : null };
    if (level === "now") return { level, count: openTasks };
    return { level, count: has ? g.byHorizon[level].length : null };
  });
}

/** Arc order runs from now outward: today, week, month, 1 year, 5 years. */
export const ARC_ORDER: readonly Horizon[] = ["today", "week", "month", "one_year", "five_year"];

/** The nearest horizon that has at least one goal. null when no goal is placed (marker stays off, nothing is guessed). */
export function arcMarker(goals: readonly HorizonGoal[]): Horizon | null {
  const g = groupByHorizon(goals);
  return ARC_ORDER.find((k) => g.byHorizon[k].length > 0) ?? null;
}

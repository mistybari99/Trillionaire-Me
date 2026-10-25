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

// Life wheel (pure). Seven areas, each rated 1-5 by the user or left unknown. Unknown is never 0 and there is no total.
import type { FieldValue, TMRecord } from "./types";

export const AREAS = ["health", "money", "family", "work", "learning", "faith", "rest"] as const;
export type Area = (typeof AREAS)[number];
export const isArea = (x: unknown): x is Area => typeof x === "string" && (AREAS as readonly string[]).includes(x);
export const MAX_RATING = 5;

export const areaRecordId = (a: Area): string => `life-${a}`;

/** Record for one area. `rating` null = the user chose "not sure": the value is stored as unknown, never as 0. */
export function lifeAreaRecord(a: Area, rating: number | null, createdAt: string): Omit<TMRecord, "ns" | "ownerId" | "schemaVersion"> {
  const ok = rating !== null && Number.isInteger(rating) && rating >= 1 && rating <= MAX_RATING;
  const r: FieldValue = ok ? { state: "value", value: rating, label: "FACT" } : { state: "unknown" };
  return { id: areaRecordId(a), entity: "life_area", createdAt, values: { "life_area.key": { state: "value", value: a, label: "FACT" }, "life_area.rating": r } };
}

export interface WheelArea { area: Area; /** 1..5, or null when unknown or not yet answered */ rating: number | null; /** true when the user answered (a rating or "not sure") */ answered: boolean }
export interface WheelData { areas: WheelArea[]; rated: number; unknown: number }

export function wheelData(recs: readonly TMRecord[]): WheelData {
  const areas: WheelArea[] = AREAS.map((area) => {
    const rec = recs.find((r) => r.entity === "life_area" && r.id === areaRecordId(area));
    const v = rec?.values["life_area.rating"];
    const rating = v && v.state === "value" && typeof v.value === "number" && Number.isInteger(v.value) && v.value >= 1 && v.value <= MAX_RATING ? v.value : null;
    return { area, rating, answered: !!rec };
  });
  const rated = areas.filter((a) => a.rating !== null).length;
  return { areas, rated, unknown: areas.length - rated };
}

/** Wedge path for spoke i of n, radius r (0 = no wedge). Angles start at the top and run clockwise. */
export function wedgePath(cx: number, cy: number, r: number, i: number, n: number): string {
  const a0 = (i / n) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
  const p = (a: number) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  return `M${cx} ${cy} L${p(a0)} A${r} ${r} 0 0 1 ${p(a1)} Z`;
}

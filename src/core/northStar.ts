// M03 North Star measure and milestone ladder (demo namespace). Pure.
// One measure per record; several measures stay separate (TM-REQ-002). Unknown start or target gives no ladder, never zeros.
import type { FieldValue, TMRecord } from "./types";
import { numberOrNull } from "./types";
import { netWorth } from "./finance";
import { financeFrom } from "./financeInputs";
import { portfolio, ventureViews } from "./ventures";

export const SOURCES = ["own", "net_worth", "business_net_worth", "venture_value", "venture_share"] as const;
export type StarSource = (typeof SOURCES)[number];
export interface StarRow {
  id: string; ns: TMRecord["ns"]; metric: string; unit: string | null; baseline: number | null; target: number | null;
  /** the number the user typed for "where I am now", and the day (only used when source is "own") */
  current: number | null; currentOn: string | null; source: StarSource;
  /** relative weight 1..100 for the overall progress; null = not set, counts equally */
  weight: number | null;
}
export type Ladder =
  | { status: "ok"; levels: number[] }            // start, evenly spaced steps, target (linear, rounded to 1 decimal)
  | { status: "same" }                            // start equals target: nothing to climb
  | { status: "unknown"; missing: Array<"baseline" | "target"> };

const str = (v: FieldValue | undefined): string | null => (v?.state === "value" && typeof v.value === "string" && v.value.trim() ? v.value.trim() : null);

export function starRows(recs: TMRecord[]): StarRow[] {
  return recs.filter((r) => r.entity === "north_star").map((r): StarRow => ({
    id: r.id, ns: r.ns, metric: str(r.values["north_star.metric"]) ?? "", unit: str(r.values["north_star.unit"]),
    baseline: numberOrNull(r.values["north_star.baseline"]), target: numberOrNull(r.values["north_star.target"]),
    current: numberOrNull(r.values["north_star.current"]), currentOn: str(r.values["north_star.current_on"]),
    source: ((src) => ((SOURCES as readonly string[]).includes(src ?? "") ? (src as StarSource) : "own"))(str(r.values["north_star.source"])),
    weight: ((w) => (w !== null && w >= 1 && w <= 100 ? w : null))(numberOrNull(r.values["north_star.weight"])),
  })).sort((a, b) => (a.metric < b.metric ? -1 : a.metric > b.metric ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Evenly spaced steps from the starting number to the target. Steps must be 1 or more. */
export function ladder(baseline: number | null, target: number | null, steps = 3): Ladder {
  const missing: Array<"baseline" | "target"> = [];
  if (baseline === null) missing.push("baseline");
  if (target === null) missing.push("target");
  if (missing.length) return { status: "unknown", missing };
  const b = baseline as number, g = target as number;
  if (b === g) return { status: "same" };
  const n = Math.max(1, Math.floor(steps));
  const pts = [b];
  for (let i = 1; i <= n; i++) pts.push(Math.round((b + ((g - b) * i) / (n + 1)) * 10) / 10);
  pts.push(g);
  return { status: "ok", levels: pts };
}


// ---------------------------------------------------------------- where I am now, progress, overall (M03)

export type NowWhy = "not_entered" | "no_money_lines" | "no_ventures" | "incomplete";
/** The "now" number: the user's own, or taken from the Money / Ventures screens. Unknown is never 0. */
export type Now =
  | { state: "value"; value: number; source: StarSource; asOf: string | null }
  | { state: "unknown"; why: NowWhy; source: StarSource; known?: number; of?: number };

export function nowOf(row: StarRow, recs: readonly TMRecord[]): Now {
  const source = row.source;
  if (source === "own") return row.current === null ? { state: "unknown", why: "not_entered", source } : { state: "value", value: row.current, source, asOf: row.currentOn };
  if (source === "net_worth" || source === "business_net_worth") {
    const scope = source === "net_worth" ? "personal" : "business";
    const fv = financeFrom(recs as TMRecord[]);
    if (!fv.items.some((i) => i.scope === scope && (i.kind === "asset" || i.kind === "liability"))) return { state: "unknown", why: "no_money_lines", source };
    const nw = netWorth(fv.items, scope);
    return nw.ok ? { state: "value", value: nw.value, source, asOf: null } : { state: "unknown", why: "incomplete", source };
  }
  const pf = portfolio(ventureViews(recs));
  const tot = source === "venture_value" ? pf.value : pf.share;
  if (tot.state === "none") return { state: "unknown", why: "no_ventures", source };
  return tot.state === "value" ? { state: "value", value: tot.value, source, asOf: null } : { state: "unknown", why: "incomplete", source, known: tot.known, of: tot.of };
}

export type StarProgress =
  | { state: "value"; pct: number; reached: boolean; below: boolean; passed: number; of: number }
  | { state: "same" }
  | { state: "unknown"; missing: Array<"baseline" | "target" | "current"> };

/** How far the way from the starting number to the target you are. Works for targets below the start too (a debt to bring down). */
export function progressOf(baseline: number | null, target: number | null, now: Now): StarProgress {
  const missing: Array<"baseline" | "target" | "current"> = [];
  if (baseline === null) missing.push("baseline");
  if (target === null) missing.push("target");
  if (now.state !== "value") missing.push("current");
  if (missing.length) return { state: "unknown", missing };
  const b = baseline as number, g = target as number, c = (now as { value: number }).value;
  if (b === g) return { state: "same" };
  const raw = ((c - b) / (g - b)) * 100;
  const l = ladder(b, g);
  const levels = l.status === "ok" ? l.levels.slice(1) : [g];
  const dir = g > b ? 1 : -1;
  const passed = levels.filter((lv) => (c - lv) * dir >= 0).length;
  return { state: "value", pct: Math.max(0, Math.min(100, Math.round(raw))), reached: raw >= 100, below: raw < 0, passed, of: levels.length };
}

export interface StarView { row: StarRow; now: Now; progress: StarProgress; ladder: Ladder }
export const starViews = (recs: readonly TMRecord[]): StarView[] =>
  starRows(recs as TMRecord[]).map((row) => { const now = nowOf(row, recs); return { row, now, progress: progressOf(row.baseline, row.target, now), ladder: ladder(row.baseline, row.target) }; });

/** One overall figure from several measures, weighted by the user's own weights (blank = 1). Only when EVERY measure has a progress figure;
 *  otherwise it says how many do. Nothing unknown is counted as 0. With fewer than two measures there is nothing to combine. */
export type Overall =
  | { state: "none" }
  | { state: "value"; pct: number; weights: Array<{ id: string; share: number }> }
  | { state: "incomplete"; known: number; of: number };
export function overallProgress(views: readonly StarView[]): Overall {
  if (views.length < 2) return { state: "none" };
  const known = views.filter((v) => v.progress.state === "value");
  if (known.length !== views.length) return { state: "incomplete", known: known.length, of: views.length };
  const w = views.map((v) => v.row.weight ?? 1); const sum = w.reduce((a, b) => a + b, 0);
  const pct = views.reduce((a, v, i) => a + (v.progress as { pct: number }).pct * w[i]!, 0) / sum;
  return { state: "value", pct: Math.round(pct), weights: views.map((v, i) => ({ id: v.row.id, share: Math.round((w[i]! / sum) * 100) })) };
}

/** Blank = unknown. A weight is a number from 1 to 100. Bangla digits and commas are accepted. Anything else is invalid (null). */
export function parseWeight(raw: string): { state: "unknown" } | { state: "value"; value: number } | null {
  const s = raw.trim().replace(/,/g, "").replace(/[০-৯]/g, (c) => String(c.charCodeAt(0) - 0x09e6));
  if (s === "") return { state: "unknown" };
  const n = Number(s);
  return Number.isFinite(n) && n >= 1 && n <= 100 ? { state: "value", value: n } : null;
}

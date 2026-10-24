// Capacity + scheduler (G3, no AI). Hard rule: worship/family/rest windows are never used; unknown is never 0.
export interface Block { day: number; start: number; end: number }          // minutes from midnight, day 0–6
export interface PlanTask { id: string; minutes: number | null; priority: number }
export type CapacityMode = "normal" | "minimum_week" | "pause";
export interface PlanInput {
  weeklyFreeMinutes: number | null;       // null = unknown
  blocked: Block[];                       // hard constraints (prayer, family, rest, job)
  tasks: PlanTask[];
  mode?: CapacityMode;
  /** weekday (0=Sunday) the plan starts on; the week is filled from here so today comes first */
  startDay?: number;
  dayWindow?: { start: number; end: number };
}
export interface Placement { taskId: string; day: number; start: number; end: number }
export type Deferral = "needs_estimate" | "no_room" | "paused" | "unknown_capacity";
export interface Plan { placements: Placement[]; deferred: { taskId: string; reason: Deferral }[]; usedMinutes: number }

const MIN_WEEK_MAX_TASKS = 3;

function freeWindows(day: number, blocked: Block[], w: { start: number; end: number }): [number, number][] {
  const bs = blocked.filter((b) => b.day === day).map((b) => [Math.max(b.start, w.start), Math.min(b.end, w.end)] as [number, number]).filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
  const out: [number, number][] = []; let cur = w.start;
  for (const [a, b] of bs) { if (a > cur) out.push([cur, a]); cur = Math.max(cur, b); }
  if (cur < w.end) out.push([cur, w.end]);
  return out;
}

/** Deterministic: same input → same plan. Never adds work: modes only shrink what normal would place. */
export function schedule(inp: PlanInput): Plan {
  const mode = inp.mode ?? "normal";
  const w = inp.dayWindow ?? { start: 6 * 60, end: 22 * 60 };
  const order = [...inp.tasks].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
  const deferred: Plan["deferred"] = [];
  if (mode === "pause") return { placements: [], deferred: order.map((t) => ({ taskId: t.id, reason: "paused" as const })), usedMinutes: 0 };
  if (inp.weeklyFreeMinutes === null) return { placements: [], deferred: order.map((t) => ({ taskId: t.id, reason: "unknown_capacity" as const })), usedMinutes: 0 };
  const cap = inp.weeklyFreeMinutes;
  const free = Array.from({ length: 7 }, (_, d) => freeWindows(d, inp.blocked, w));
  const start = ((inp.startDay ?? 0) % 7 + 7) % 7;
  const placements: Placement[] = []; let used = 0; const perDay = new Array<number>(7).fill(0);
  for (const t of order) {
    if (t.minutes === null) { deferred.push({ taskId: t.id, reason: "needs_estimate" }); continue; }
    if (mode === "minimum_week" && placements.length >= MIN_WEEK_MAX_TASKS) { deferred.push({ taskId: t.id, reason: "no_room" }); continue; }
    if (used + t.minutes > cap || t.minutes <= 0) { deferred.push({ taskId: t.id, reason: "no_room" }); continue; }
    let done = false;
    for (let i = 0; i < 7 && !done; i++) {
      const d = (start + i) % 7;
      if (mode === "minimum_week" && perDay[d]! >= 1) continue;
      for (const win of free[d]!) {
        if (win[1] - win[0] >= t.minutes) {
          placements.push({ taskId: t.id, day: d, start: win[0], end: win[0] + t.minutes });
          win[0] += t.minutes; used += t.minutes; perDay[d]!++; done = true; break;
        }
      }
    }
    if (!done) deferred.push({ taskId: t.id, reason: "no_room" });
  }
  return { placements, deferred, usedMinutes: used };
}

/** Home shows at most 3 actions (TM-REQ-171). */
export const todaysActions = (p: Plan, day: number, max = 3) => p.placements.filter((x) => x.day === day).sort((a, b) => a.start - b.start).slice(0, max);

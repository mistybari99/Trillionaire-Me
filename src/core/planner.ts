// Capacity + scheduler (G3, no AI). Hard rule: worship/family/rest windows are never used; unknown is never 0.
export interface Block { day: number; start: number; end: number }          // minutes from midnight, day 0–6
/** `after`: id of a task that must be placed first (dependency). Null/absent = no dependency. */
export interface PlanTask { id: string; minutes: number | null; priority: number; after?: string | null }
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
export type Deferral = "needs_estimate" | "no_room" | "paused" | "unknown_capacity" | "waiting_for_prerequisite";
export interface Plan { placements: Placement[]; deferred: { taskId: string; reason: Deferral }[]; usedMinutes: number }

const MIN_WEEK_MAX_TASKS = 3;

function freeWindows(day: number, blocked: Block[], w: { start: number; end: number }): [number, number][] {
  const bs = blocked.filter((b) => b.day === day).map((b) => [Math.max(b.start, w.start), Math.min(b.end, w.end)] as [number, number]).filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
  const out: [number, number][] = []; let cur = w.start;
  for (const [a, b] of bs) { if (a > cur) out.push([cur, a]); cur = Math.max(cur, b); }
  if (cur < w.end) out.push([cur, w.end]);
  return out;
}

/** Deterministic: same input → same plan. Never adds work: modes only shrink what normal would place.
 *  A task with `after` is placed later in the week than its prerequisite. If the prerequisite is not placed
 *  (no room, no estimate, or a cycle), the task waits with reason "waiting_for_prerequisite". */
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
  const byId = new Map(order.map((t) => [t.id, t] as const));
  const state = new Map<string, "busy" | "done">();
  const endAt = new Map<string, number>();           // absolute minute (from the start of the week) when a task ends
  const dropped = new Set<string>();
  const defer = (id: string, reason: Deferral) => { if (!dropped.has(id)) { dropped.add(id); deferred.push({ taskId: id, reason }); } };

  const place = (t: PlanTask): void => {
    if (state.has(t.id)) return;          // done, or busy in a dependency cycle: the outer call decides
    state.set(t.id, "busy");
    let earliest: number | null = null;
    if (t.after && byId.has(t.after)) {
      place(byId.get(t.after)!);
      const e = endAt.get(t.after);
      if (e === undefined) { defer(t.id, "waiting_for_prerequisite"); state.set(t.id, "done"); return; }
      earliest = e;
    }
    state.set(t.id, "done");
    if (t.minutes === null) { defer(t.id, "needs_estimate"); return; }
    if (mode === "minimum_week" && placements.length >= MIN_WEEK_MAX_TASKS) { defer(t.id, "no_room"); return; }
    if (used + t.minutes > cap || t.minutes <= 0) { defer(t.id, "no_room"); return; }
    let slot: Placement | null = null; let slotEnd = 0;
    for (let i = 0; i < 7 && !slot; i++) {
      const d = (start + i) % 7;
      if (mode === "minimum_week" && perDay[d]! >= 1) continue;
      const dayAbs = i * 1440;               // absolute minute of this day's midnight in the week
      for (let k = 0; k < free[d]!.length && !slot; k++) {
        const win = free[d]![k]!;
        const s0 = earliest === null ? win[0] : Math.max(win[0], earliest - dayAbs);
        if (win[1] - s0 >= t.minutes) {
          slot = { taskId: t.id, day: d, start: s0, end: s0 + t.minutes };
          slotEnd = dayAbs + s0 + t.minutes;
          // split the free window around the placed task (keeps any gap before it)
          free[d]!.splice(k, 1, ...([[win[0], s0], [s0 + t.minutes, win[1]]] as [number, number][]).filter(([a, b]) => b > a));
        }
      }
    }
    if (!slot) { defer(t.id, "no_room"); return; }
    placements.push(slot); used += t.minutes; perDay[slot.day]!++;
    endAt.set(t.id, slotEnd);
  };
  for (const t of order) place(t);
  return { placements, deferred, usedMinutes: used };
}

/** Home shows at most 3 actions (TM-REQ-171). */
export const todaysActions = (p: Plan, day: number, max = 3) => p.placements.filter((x) => x.day === day).sort((a, b) => a.start - b.start).slice(0, max);

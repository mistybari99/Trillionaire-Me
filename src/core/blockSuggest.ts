// Suggested times for the optional work blocks (BUILD-01). Pure and deterministic. A suggestion is only a line on the screen: it becomes a block
// when the user taps it. Two sources: (1) the user's own free slots, sized by their open steps that have a minutes estimate; (2) three neutral
// generic windows (morning, afternoon, evening), labelled "idea, not advice". Never prayer-based: prayer times are not an input here.
import type { Block } from "./planner";
import { isoOf, parseIsoDate, type WorkOcc } from "./timeBlocks";

export const GENERIC_WINDOWS = [{ id: "morning", start: 8 * 60, end: 10 * 60 }, { id: "afternoon", start: 14 * 60, end: 16 * 60 }, { id: "evening", start: 19 * 60, end: 21 * 60 }] as const;
export const DAY_WINDOW = { start: 6 * 60, end: 22 * 60 } as const;
export const MAX_SUGGESTIONS = 6, MAX_TASK_SUGGESTIONS = 3, MIN_BLOCK = 30, MAX_BLOCK = 180, STEP = 15;

export interface SuggestTask { id: string; minutes: number | null; priority: number }
export interface Suggestion {
  id: string; source: "task" | "generic"; windowId: "morning" | "afternoon" | "evening" | "free";
  date: string; start: number; end: number;
  /** set for a task-sized suggestion */
  taskId: string | null;
  /** always true: shown with "idea, not advice" */
  idea: true;
}
export interface SuggestInput {
  /** first day, YYYY-MM-DD */
  from: string; days: number;
  /** minute of day now, for the first day only; null = do not skip anything */
  nowMinute: number | null;
  /** time the user already keeps busy, by weekday (0 = Sunday): the committed time they typed */
  blocked: readonly Block[];
  /** work blocks already set (every occurrence, protected or not): a suggestion never overlaps one */
  existing: readonly WorkOcc[];
  /** open steps; a step with no minutes estimate is skipped (unknown is not 0) */
  tasks: readonly SuggestTask[];
}

type Win = [number, number];
const freeOn = (date: string, day: number, inp: SuggestInput, floor: number): Win[] => {
  const bs = [...inp.blocked.filter((b) => b.day === day).map((b) => [b.start, b.end] as Win), ...inp.existing.filter((o) => o.date === date).map((o) => [o.start, o.end] as Win)]
    .map(([a, b]) => [Math.max(a, DAY_WINDOW.start, floor), Math.min(b, DAY_WINDOW.end)] as Win).filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
  const out: Win[] = []; let cur = Math.max(DAY_WINDOW.start, floor);
  for (const [a, b] of bs) { if (a > cur) out.push([cur, a]); cur = Math.max(cur, b); }
  if (cur < DAY_WINDOW.end) out.push([cur, DAY_WINDOW.end]);
  return out;
};
const roundUp = (n: number) => Math.ceil(n / STEP) * STEP;

export function suggestBlocks(inp: SuggestInput): Suggestion[] {
  const from = parseIsoDate(inp.from); if (!from || inp.days < 1) return [];
  const out: Suggestion[] = []; const taken: Array<{ date: string; start: number; end: number }> = [];
  const days: Array<{ date: string; day: number; free: Win[] }> = [];
  for (let i = 0; i < Math.min(inp.days, 14); i++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    const floor = i === 0 && inp.nowMinute !== null ? roundUp(inp.nowMinute) : 0;
    days.push({ date: isoOf(d), day: d.getDay(), free: freeOn(isoOf(d), d.getDay(), inp, floor) });
  }
  const fits = (date: string, a: number, b: number) => !taken.some((t) => t.date === date && a < t.end && t.start < b);
  // 1. the user's own open steps, highest priority first: the earliest free slot that holds the estimate
  const tasks = [...inp.tasks].filter((t) => t.minutes !== null && t.minutes > 0).sort((a, b) => b.priority - a.priority || (a.id < b.id ? -1 : 1)).slice(0, MAX_TASK_SUGGESTIONS);
  for (const t of tasks) {
    const len = Math.min(MAX_BLOCK, Math.max(MIN_BLOCK, roundUp(t.minutes!)));
    outer: for (const d of days) for (const [a, b] of d.free) {
      const s = roundUp(a);
      if (s + len <= b && fits(d.date, s, s + len)) { out.push({ id: `task-${t.id}-${d.date}-${s}`, source: "task", windowId: "free", date: d.date, start: s, end: s + len, taskId: t.id, idea: true }); taken.push({ date: d.date, start: s, end: s + len }); break outer; }
    }
  }
  // 2. neutral generic windows, only where the whole window is free
  for (const d of days.slice(0, 3)) for (const w of GENERIC_WINDOWS) {
    if (out.length >= MAX_SUGGESTIONS) return out;
    if (d.free.some(([a, b]) => a <= w.start && w.end <= b) && fits(d.date, w.start, w.end)) { out.push({ id: `gen-${w.id}-${d.date}`, source: "generic", windowId: w.id, date: d.date, start: w.start, end: w.end, taskId: null, idea: true }); }
  }
  return out.slice(0, MAX_SUGGESTIONS);
}

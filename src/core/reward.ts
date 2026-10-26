// Reward picture: every finished task adds a star to a constellation; every passed stage adds a layer to the garden below it.
// Nothing is compared or counted against anyone — only a picture that grows (CLAUDE.md §2/§6).
export interface Star { x: number; y: number; r: number }
export const MAX_STARS = 120;
export const MILESTONES = [1, 5, 10, 25, 50, 100] as const;
export const GARDEN_LAYERS = 8; // one per stage A–H

// mulberry32: well-spread numbers from a small integer seed
const rand = (seed: number) => { let a = (seed * 0x9e3779b9) >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32; }; };

/** The i-th star always sits in the same place, so the picture is stable across reloads and only ever grows. */
export function stars(completed: number): Star[] {
  const n = Math.min(Math.max(0, Math.floor(completed)), MAX_STARS);
  return Array.from({ length: n }, (_, i) => { const r = rand(i + 1); return { x: 10 + r() * 280, y: 8 + r() * 50, r: 1.6 + r() * 1.6 }; });
}
export const milestoneAt = (completed: number): number | null => ((MILESTONES as readonly number[]).includes(completed) ? completed : null);
/** 0 = no milestone yet … 6 = all reached. Higher tier → richer colours/glow. */
export const tier = (completed: number): number => MILESTONES.filter((m) => completed >= m).length;
export const gardenLayers = (stagesPassed: number): number => Math.min(Math.max(0, Math.floor(stagesPassed)), GARDEN_LAYERS);
export const messageIndex = (completed: number, count: number): number => (completed > 0 ? (completed - 1) % count : 0);

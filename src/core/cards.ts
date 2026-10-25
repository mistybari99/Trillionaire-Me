// Flashcards on a simple 5-box schedule. A miss goes back to box 1 for tomorrow — calmly, no penalties.
export const INTERVALS = [1, 2, 4, 8, 16] as const; // days per box 1..5
export interface Card { id: string; front: string; back: string; box: number; due: string }
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const plus = (s: string, n: number) => { const [y, m, d] = s.split("-").map(Number); const x = new Date(y!, m! - 1, d! + n); return iso(x); };

export const newCard = (id: string, front: string, back: string, today: string): Card => ({ id, front, back, box: 1, due: today });
export const isDue = (c: Card, today: string) => c.due <= today;
export const dueCards = (cs: Card[], today: string) => cs.filter((c) => isDue(c, today)).sort((a, b) => a.due.localeCompare(b.due) || a.id.localeCompare(b.id));
export function review(c: Card, knew: boolean, today: string): Card {
  const box = knew ? Math.min(5, c.box + 1) : 1;
  return { ...c, box, due: plus(today, knew ? INTERVALS[box - 1]! : 1) };
}
export const byBox = (cs: Card[]) => [1, 2, 3, 4, 5].map((b) => cs.filter((c) => c.box === b).length);

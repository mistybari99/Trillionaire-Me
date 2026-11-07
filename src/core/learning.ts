// Journey log "what I learned" word chain (ROADMAP B10). Pure, no AI: the chain is the first meaningful word
// of each recent evidence note, or the stage code when the note has no usable word. Neutral output only.
export interface LearnEntry { code: string; note: string }

const STOP = new Set(["the", "and", "for", "with", "was", "this", "that", "from", "have", "had", "are", "but", "not", "did", "its"]);
const MAX_WORD = 24;

/** One word for one entry. Words of 3+ characters (any script, Bangla vowel signs included), skipping stop words. */
export function learnWord(entry: LearnEntry): string {
  const w = entry.note.split(/[^\p{L}\p{M}\p{N}]+/u).find((x) => x.length >= 3 && !STOP.has(x.toLowerCase()));
  return (w ?? entry.code).slice(0, MAX_WORD);
}

/** Chain of the last `max` entries, oldest first. Input must already be in time order. */
export function wordChain(entries: readonly LearnEntry[], max = 5): string[] {
  return entries.slice(-max).map(learnWord);
}
